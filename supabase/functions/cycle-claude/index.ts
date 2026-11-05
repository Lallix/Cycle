// Cycle's Claude assistant. Each person uses their own Claude API key, kept
// encrypted in Supabase Vault (see supabase/cycle_v7_claude_assistant.sql).
//
// The app calls this with the signed-in person's token. Budget data is read
// as that person (so the normal "own rows only" rules apply); the service-role
// client is used only for their key and usage log.
//
// Actions:
//   save_key   { key }                    check the key with Anthropic, then store it
//   remove_key {}
//   settings   { model?, monthly_limit_zar? }
//   ask        { messages: [{ role, content }] }   chat about the budget (tools below)
//   statement  { text, file_name }        read any bank's statement text into lines

import Anthropic from 'npm:@anthropic-ai/sdk@1.4.0'
import { createClient, SupabaseClient } from 'npm:@supabase/supabase-js@2.45.4'

const MODELS: Record<string, { label: string; input: number; output: number; cacheRead: number; fallbacks: boolean }> = {
  // US$ per million tokens
  'claude-opus-5-5':   { label: 'Claude Opus 5.5',   input: 4,    output: 20,   cacheRead: 0.20, fallbacks: true },
  'claude-sonnet-5-5': { label: 'Claude Sonnet 5.5', input: 2,    output: 10,   cacheRead: 0.20, fallbacks: true },
  'claude-haiku-5-5':  { label: 'Claude Haiku 5.5',  input: 0.10, output: 0.50, cacheRead: 0.01, fallbacks: false },
}
const ZAR_PER_USD = Number(Deno.env.get('ZAR_PER_USD') ?? 18.5)
const MAX_TOOL_ROUNDS = 8

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

class UserError extends Error {
  constructor(message: string, public status = 400) { super(message) }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  try {
    const url = Deno.env.get('SUPABASE_URL')!
    const asUser = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
      auth: { persistSession: false },
    })
    const { data: { user } } = await asUser.auth.getUser()
    if (!user) return json({ error: 'Please sign in again' }, 401)
    const { data: hasCycle } = await asUser.rpc('has_app', { p_app: 'cycle' })
    if (hasCycle !== true) return json({ error: "This account doesn't have access to Cycle" }, 403)

    const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } })
    const body = await req.json()

    switch (body.action) {
      case 'save_key':   return json(await saveKey(admin, user.id, body.key))
      case 'remove_key': return json(await removeKey(admin, user.id))
      case 'settings':   return json(await saveSettings(admin, user.id, body))
      case 'ask':        return json(await ask(admin, asUser, user.id, body.messages))
      case 'statement':  return json(await readStatement(admin, user.id, body.text, body.file_name))
      default:           throw new UserError('Unknown action')
    }
  } catch (e) {
    if (e instanceof UserError) return json({ error: e.message }, e.status)
    if (e instanceof Anthropic.AuthenticationError) return json({ error: 'Claude did not accept your API key. Check it in Settings.' }, 400)
    if (e instanceof Anthropic.PermissionDeniedError) return json({ error: "Your Claude API key isn't allowed to use this model." }, 400)
    if (e instanceof Anthropic.RateLimitError) return json({ error: 'Claude is busy or your account hit its rate limit. Try again in a minute.' }, 429)
    if (e instanceof Anthropic.BadRequestError && /credit balance/i.test(e.message)) {
      return json({ error: 'Your Claude account is out of credit. Top it up at console.anthropic.com.' }, 402)
    }
    if (e instanceof Anthropic.APIError) return json({ error: `Claude returned an error (${e.status}). Try again.` }, 502)
    console.error(e)
    return json({ error: 'Something went wrong. Try again.' }, 500)
  }
})

// ── Key and settings ───────────────────────────────────────────────────────
async function saveKey(admin: SupabaseClient, userId: string, key: unknown) {
  const k = String(key ?? '').trim()
  if (!/^sk-ant-[A-Za-z0-9_-]{20,}$/.test(k)) throw new UserError("That doesn't look like a Claude API key (it starts with sk-ant-).")
  // Listing models is free and fails straight away on a bad key
  await new Anthropic({ apiKey: k }).models.list({ limit: 1 })
  const { error } = await admin.rpc('cycle_ai_store_key', { p_user: userId, p_key: k })
  if (error) throw error
  return { ok: true, hint: k.slice(-4) }
}

async function removeKey(admin: SupabaseClient, userId: string) {
  const { error } = await admin.rpc('cycle_ai_remove_key', { p_user: userId })
  if (error) throw error
  return { ok: true }
}

async function saveSettings(admin: SupabaseClient, userId: string, { model, monthly_limit_zar }: Record<string, unknown>) {
  const changes: Record<string, unknown> = {}
  if (model !== undefined) {
    if (!MODELS[String(model)]) throw new UserError('Unknown model')
    changes.model = model
  }
  if (monthly_limit_zar !== undefined) {
    const n = monthly_limit_zar === null || monthly_limit_zar === '' ? null : Number(monthly_limit_zar)
    if (n !== null && !(n > 0)) throw new UserError('The limit must be more than R0, or empty for no limit')
    changes.monthly_limit_zar = n
  }
  const { error } = await admin.from('cycle_ai_settings').upsert({ user_id: userId, ...changes }, { onConflict: 'user_id' })
  if (error) throw error
  return { ok: true }
}

// The person's key, model and how much of their monthly limit is left
async function prepare(admin: SupabaseClient, userId: string) {
  const { data: s } = await admin.from('cycle_ai_settings').select('model, monthly_limit_zar, key_secret_id').eq('user_id', userId).maybeSingle()
  if (!s?.key_secret_id) throw new UserError('Add your Claude API key in Settings first.', 412)
  const { data: key, error } = await admin.rpc('cycle_ai_read_key', { p_user: userId })
  if (error || !key) throw new UserError('Your Claude API key could not be read. Add it again in Settings.', 412)

  if (s.monthly_limit_zar) {
    const monthStart = new Date(); monthStart.setUTCDate(1); monthStart.setUTCHours(0, 0, 0, 0)
    const { data: rows } = await admin.from('cycle_ai_usage').select('cost_usd').eq('user_id', userId).gte('created_at', monthStart.toISOString())
    const usedZar = (rows ?? []).reduce((t, r) => t + Number(r.cost_usd), 0) * ZAR_PER_USD
    if (usedZar >= Number(s.monthly_limit_zar)) {
      throw new UserError(`You've reached your monthly Claude limit of R${Number(s.monthly_limit_zar).toFixed(0)}. Raise it in Settings or wait for next month.`, 402)
    }
  }
  return { client: new Anthropic({ apiKey: key as string }), model: s.model as string }
}

async function logUsage(admin: SupabaseClient, userId: string, kind: string, model: string, usage: Anthropic.Beta.BetaUsage | Anthropic.Usage) {
  const p = MODELS[model]
  const input = usage.input_tokens ?? 0
  const output = usage.output_tokens ?? 0
  const cacheRead = usage.cache_read_input_tokens ?? 0
  const cacheWrite = usage.cache_creation_input_tokens ?? 0
  const cost = (input * p.input + output * p.output + cacheRead * p.cacheRead + cacheWrite * p.input * 1.25) / 1e6
  await admin.from('cycle_ai_usage').insert({
    user_id: userId, kind, model, input_tokens: input, output_tokens: output,
    cache_read_tokens: cacheRead, cache_write_tokens: cacheWrite, cost_usd: cost,
  })
  return cost
}

// Opus and Sonnet: if a safety check declines, Anthropic retries on another model
const fallbackParams = (model: string) =>
  MODELS[model].fallbacks ? { betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default' } : {}

// ── Ask: chat about the budget ─────────────────────────────────────────────
const ASK_SYSTEM = `You are the budgeting assistant inside Cycle, a personal budget app used in South Africa.
Amounts are in Rand (R). Write amounts like R1,234.56.

How Cycle works:
- Money is tracked per pay cycle (payday to the day before the next payday), not per calendar month. A cycle is identified by its cycle_key, the date it starts.
- Category types: income; fixed (regular bills); predicted (variable everyday spending such as groceries); unplanned (irregular spending); once_off (big one-time items, kept outside the monthly budget); debt (loans received and repaid); transfer (moving money between the person's own accounts - never count transfers as spending or income).
- Spending is net of refunds: money back into a spending category reduces what was spent.
- "Left this cycle" = income - spent - fixed bills still due - loan repayments.
- Transactions mostly come from imported bank statements; "direction" is in or out and amounts are always positive.

Use the tools to look at the person's real figures before answering questions about their money. Do the arithmetic carefully and show the key numbers. Keep answers short and practical, in plain language, using a small table when it helps. If something can't be answered from the data, say so. You can only read data; if the person wants a change (a budget amount, a category), tell them where to do it in Cycle: budgets on the Budget tab, categories of a transaction in Activity > Transactions, categories themselves in Settings.`

const TOOLS: Anthropic.Tool[] = [
  {
    name: 'get_cycles',
    description: "List the person's pay cycles (newest first) and which one is current. Call this first when the question is about 'this cycle', 'last month' and similar.",
    input_schema: { type: 'object', properties: {}, additionalProperties: false },
  },
  {
    name: 'get_budget_sheet',
    description: "The budget sheet for one pay cycle: every category with its type, budget in force for that cycle, and actual amount (spent, or received for income). Fixed bills also show due day and whether they're marked paid.",
    input_schema: {
      type: 'object',
      properties: { cycle_key: { type: 'string', description: 'Cycle start date YYYY-MM-DD, from get_cycles' } },
      required: ['cycle_key'], additionalProperties: false,
    },
  },
  {
    name: 'totals_by_category',
    description: 'Net totals per category between two dates (inclusive), with transaction counts. Use for "how much did I spend on X over the last 3 months".',
    input_schema: {
      type: 'object',
      properties: {
        from_date: { type: 'string', description: 'YYYY-MM-DD' },
        to_date: { type: 'string', description: 'YYYY-MM-DD' },
      },
      required: ['from_date', 'to_date'], additionalProperties: false,
    },
  },
  {
    name: 'search_transactions',
    description: 'Find individual transactions. All filters are optional. Returns at most `limit` rows, newest first.',
    input_schema: {
      type: 'object',
      properties: {
        from_date: { type: 'string', description: 'YYYY-MM-DD' },
        to_date: { type: 'string', description: 'YYYY-MM-DD' },
        text: { type: 'string', description: 'Words in the description, e.g. a shop name' },
        category: { type: 'string', description: 'Category name (exact or partial)' },
        direction: { type: 'string', enum: ['in', 'out'] },
        min_amount: { type: 'number' },
        max_amount: { type: 'number' },
        limit: { type: 'integer', description: 'Up to 200, default 50' },
      },
      additionalProperties: false,
    },
  },
  {
    name: 'get_accounts',
    description: "The person's accounts (bank, savings, credit card, loan) with the latest known balance from their statements.",
    input_schema: { type: 'object', properties: {}, additionalProperties: false },
  },
]

async function ask(admin: SupabaseClient, db: SupabaseClient, userId: string, history: unknown) {
  if (!Array.isArray(history) || history.length === 0) throw new UserError('Ask a question first')
  const messages: Anthropic.Beta.BetaMessageParam[] = history.slice(-20).map((m: { role: string; content: unknown }) => ({
    role: m.role === 'assistant' ? 'assistant' : 'user',
    content: String(m.content ?? '').slice(0, 8000),
  }))
  if (messages[0].role !== 'user') messages.shift()

  const { client, model } = await prepare(admin, userId)
  const today = new Date().toISOString().slice(0, 10)
  const system = [
    { type: 'text' as const, text: ASK_SYSTEM, cache_control: { type: 'ephemeral' as const } },
    { type: 'text' as const, text: `Today is ${today}.` },
  ]

  let costUsd = 0
  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    const response = await client.beta.messages.create({
      model, max_tokens: 16000, system, tools: TOOLS, messages,
      ...fallbackParams(model),
    } as Anthropic.Beta.MessageCreateParamsNonStreaming)
    costUsd += await logUsage(admin, userId, 'ask', model, response.usage)

    if (response.stop_reason === 'refusal') {
      return { answer: "Claude couldn't help with that question. Try asking it differently.", cost_zar: costUsd * ZAR_PER_USD }
    }
    const toolUses = response.content.filter((b): b is Anthropic.Beta.BetaToolUseBlock => b.type === 'tool_use')
    if (response.stop_reason !== 'tool_use' || toolUses.length === 0) {
      const answer = response.content.filter(b => b.type === 'text').map(b => (b as Anthropic.Beta.BetaTextBlock).text).join('\n').trim()
      return { answer: answer || "Claude didn't give an answer. Try again.", cost_zar: costUsd * ZAR_PER_USD }
    }

    messages.push({ role: 'assistant', content: response.content })
    const results = await Promise.all(toolUses.map(async (t) => {
      try {
        return { type: 'tool_result' as const, tool_use_id: t.id, content: JSON.stringify(await runTool(db, userId, t.name, t.input as Record<string, unknown>)) }
      } catch (e) {
        return { type: 'tool_result' as const, tool_use_id: t.id, is_error: true, content: e instanceof Error ? e.message : String(e) }
      }
    }))
    messages.push({ role: 'user', content: results })
  }
  return { answer: 'That took too many steps. Try a narrower question.', cost_zar: costUsd * ZAR_PER_USD }
}

// ── Tools: read the person's own data (RLS applies) ────────────────────────
const isDate = (s: unknown) => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s)
const num = (v: unknown) => Number(v ?? 0)

async function runTool(db: SupabaseClient, userId: string, name: string, input: Record<string, unknown>) {
  switch (name) {
    case 'get_cycles':          return getCycles(db, userId)
    case 'get_budget_sheet':    return getBudgetSheet(db, input.cycle_key)
    case 'totals_by_category':  return totalsByCategory(db, input.from_date, input.to_date)
    case 'search_transactions': return searchTransactions(db, input)
    case 'get_accounts':        return getAccounts(db)
    default: throw new Error(`Unknown tool ${name}`)
  }
}

// All rows of a query, a page at a time (the API returns at most 1 000 per request)
async function allRows<T>(build: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>) {
  const out: T[] = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await build(from, from + 999)
    if (error) throw error
    out.push(...(data ?? []))
    if (!data || data.length < 1000) return out
  }
}

async function getCycles(db: SupabaseClient, userId: string) {
  const today = new Date().toISOString().slice(0, 10)
  const [{ data: current }, { data: paydays }] = await Promise.all([
    db.rpc('cycle_key_for', { p_user_id: userId, p_date: today }),
    db.from('cycle_paydays').select('pay_date, is_expected').order('pay_date', { ascending: false }).limit(24),
  ])
  const list = paydays ?? []
  return {
    current_cycle_key: current,
    cycles: list.map((p, i) => ({
      cycle_key: p.pay_date, ends: i === 0 ? null : dayBefore(list[i - 1].pay_date as string),
      ...(p.is_expected ? { expected_payday: true } : {}),
    })),
  }
}
const dayBefore = (d: string) => { const t = new Date(d + 'T00:00:00Z'); t.setUTCDate(t.getUTCDate() - 1); return t.toISOString().slice(0, 10) }

async function getBudgetSheet(db: SupabaseClient, cycleKey: unknown) {
  if (!isDate(cycleKey)) throw new Error('cycle_key must be YYYY-MM-DD')
  const [cats, budgets, txs, ticks] = await Promise.all([
    allRows<Record<string, unknown>>((a, b) => db.from('cycle_categories').select('id, name, type, is_active, due_day, budget_amount').order('id').range(a, b)),
    allRows<Record<string, unknown>>((a, b) => db.from('cycle_category_budgets').select('category_id, effective_from, amount').lte('effective_from', cycleKey).order('id').range(a, b)),
    allRows<Record<string, unknown>>((a, b) => db.from('cycle_transactions').select('category_id, direction, amount').eq('cycle_key', cycleKey).order('id').range(a, b)),
    db.from('cycle_fixed_paid').select('category_id').eq('cycle_key', cycleKey),
  ])
  // Budget in force: the latest change on or before this cycle
  const budgetOf = new Map<string, { from: string; amount: number }>()
  budgets.forEach(b => {
    const cur = budgetOf.get(b.category_id as string)
    if (!cur || (b.effective_from as string) > cur.from) budgetOf.set(b.category_id as string, { from: b.effective_from as string, amount: num(b.amount) })
  })
  const actual = new Map<string, number>()
  const typeOf = new Map(cats.map(c => [c.id as string, c.type as string]))
  txs.forEach(t => {
    const id = (t.category_id as string) ?? 'none'
    const isIncome = typeOf.get(id) === 'income'
    const signed = (t.direction === 'in') === isIncome ? num(t.amount) : -num(t.amount)
    actual.set(id, (actual.get(id) ?? 0) + signed)
  })
  const paid = new Set((ticks.data ?? []).map(t => t.category_id))
  const rows = cats
    .filter(c => c.is_active || actual.has(c.id as string))
    .map(c => ({
      category: c.name, type: c.type,
      budget: budgetOf.get(c.id as string)?.amount ?? null,
      actual: Math.round((actual.get(c.id as string) ?? 0) * 100) / 100,
      ...(c.type === 'fixed' ? { due_day: c.due_day, marked_paid: paid.has(c.id) } : {}),
    }))
  if (actual.has('none')) rows.push({ category: 'Uncategorised', type: 'unplanned', budget: null, actual: Math.round(actual.get('none')! * 100) / 100 })
  return { cycle_key: cycleKey, note: 'actual = spent (net of refunds); for income = received. budget null = no budget set for that cycle.', rows }
}

async function totalsByCategory(db: SupabaseClient, from: unknown, to: unknown) {
  if (!isDate(from) || !isDate(to)) throw new Error('Dates must be YYYY-MM-DD')
  const [cats, txs] = await Promise.all([
    allRows<Record<string, unknown>>((a, b) => db.from('cycle_categories').select('id, name, type').order('id').range(a, b)),
    allRows<Record<string, unknown>>((a, b) => db.from('cycle_transactions').select('category_id, direction, amount')
      .gte('transaction_date', from).lte('transaction_date', to).order('id').range(a, b)),
  ])
  const byId = new Map(cats.map(c => [c.id as string, c]))
  const totals = new Map<string, { category: string; type: string; money_out: number; money_in: number; count: number }>()
  txs.forEach(t => {
    const c = byId.get(t.category_id as string)
    const key = (c?.name as string) ?? 'Uncategorised'
    const row = totals.get(key) ?? { category: key, type: (c?.type as string) ?? 'unplanned', money_out: 0, money_in: 0, count: 0 }
    if (t.direction === 'in') row.money_in += num(t.amount); else row.money_out += num(t.amount)
    row.count++
    totals.set(key, row)
  })
  const r2 = (n: number) => Math.round(n * 100) / 100
  return {
    from, to,
    rows: [...totals.values()].map(r => ({ ...r, money_out: r2(r.money_out), money_in: r2(r.money_in) }))
      .sort((a, b) => b.money_out - a.money_out),
  }
}

async function searchTransactions(db: SupabaseClient, f: Record<string, unknown>) {
  const limit = Math.min(Math.max(Number(f.limit ?? 50), 1), 200)
  let q = db.from('cycle_transactions')
    .select('transaction_date, description, amount, direction, account, notes, category:cycle_categories(name, type)')
    .order('transaction_date', { ascending: false }).order('id', { ascending: false }).limit(limit)
  if (isDate(f.from_date)) q = q.gte('transaction_date', f.from_date)
  if (isDate(f.to_date)) q = q.lte('transaction_date', f.to_date)
  if (f.text) q = q.ilike('description', `%${String(f.text).replace(/[%_]/g, '')}%`)
  if (f.direction === 'in' || f.direction === 'out') q = q.eq('direction', f.direction)
  if (f.min_amount != null) q = q.gte('amount', Number(f.min_amount))
  if (f.max_amount != null) q = q.lte('amount', Number(f.max_amount))
  if (f.category) {
    const { data: cats } = await db.from('cycle_categories').select('id').ilike('name', `%${String(f.category).replace(/[%_]/g, '')}%`)
    const ids = (cats ?? []).map(c => c.id)
    if (!ids.length) return { rows: [], note: `No category matches "${f.category}"` }
    q = q.in('category_id', ids)
  }
  const { data, error } = await q
  if (error) throw error
  return {
    rows: (data ?? []).map((t: Record<string, unknown>) => ({
      date: t.transaction_date, description: t.description, amount: num(t.amount), direction: t.direction,
      account: t.account, category: (t.category as { name?: string } | null)?.name ?? 'Uncategorised', notes: t.notes || undefined,
    })),
    note: (data ?? []).length === limit ? `Showing the newest ${limit}; narrow the search for more.` : undefined,
  }
}

async function getAccounts(db: SupabaseClient) {
  const { data: accounts, error } = await db.from('cycle_accounts').select('id, name, bank, kind')
  if (error) throw error
  const rows = await Promise.all((accounts ?? []).map(async a => {
    const { data } = await db.from('cycle_transactions').select('transaction_date, balance')
      .eq('account_id', a.id).not('balance', 'is', null)
      .order('transaction_date', { ascending: false }).order('id', { ascending: false }).limit(1)
    return { name: a.name, bank: a.bank, kind: a.kind, latest_balance: data?.[0] ? num(data[0].balance) : null, as_of: data?.[0]?.transaction_date ?? null }
  }))
  return { accounts: rows, note: 'Credit card and loan balances are negative when money is owed.' }
}

// ── Statement: any bank, from the PDF's text ───────────────────────────────
const STATEMENT_SYSTEM = `You read South African bank statements. You get the text of a statement PDF, one printed row per line, with " | " between pieces of text that sit apart on the page.
Return every transaction row in the order printed, plus the statement details.
Rules:
- Copy descriptions as printed (join wrapped description lines with a space). Don't invent or merge transactions.
- money_in and money_out are positive numbers (0 when empty). A fee charged on the same row as a transaction goes in fee, not money_out.
- balance is the running balance printed on that row, signed as printed (a trailing "Cr"/"Dr" or "-" means the sign: Dr or minus = negative); null when the row has no balance.
- Dates as YYYY-MM-DD. If the year isn't on the row, take it from the statement period.
- opening_balance / closing_balance as printed on the statement (signed the same way), null if not shown.
- Skip headings, totals, page footers, interest-rate notices and rows that move no money.
- account_number: digits only. kind: bank, credit_card or savings.`

const STATEMENT_SCHEMA = {
  type: 'object',
  properties: {
    bank: { type: 'string' },
    account_number: { type: 'string' },
    kind: { type: 'string', enum: ['bank', 'credit_card', 'savings'] },
    opening_balance: { type: ['number', 'null'] },
    closing_balance: { type: ['number', 'null'] },
    lines: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          date: { type: 'string' },
          description: { type: 'string' },
          money_in: { type: 'number' },
          money_out: { type: 'number' },
          fee: { type: 'number' },
          balance: { type: ['number', 'null'] },
        },
        required: ['date', 'description', 'money_in', 'money_out', 'fee', 'balance'],
        additionalProperties: false,
      },
    },
  },
  required: ['bank', 'account_number', 'kind', 'opening_balance', 'closing_balance', 'lines'],
  additionalProperties: false,
}

async function readStatement(admin: SupabaseClient, userId: string, text: unknown, fileName: unknown) {
  const t = String(text ?? '')
  if (t.trim().length < 50) throw new UserError("This PDF has no readable text (it may be a scanned image).")
  if (t.length > 400_000) throw new UserError('This statement is too long. Import a shorter period.')
  const { client, model } = await prepare(admin, userId)

  const stream = client.beta.messages.stream({
    model, max_tokens: 64000,
    system: STATEMENT_SYSTEM,
    output_config: { effort: 'low', format: { type: 'json_schema', schema: STATEMENT_SCHEMA } },
    messages: [{ role: 'user', content: `File: ${String(fileName ?? 'statement.pdf')}\n\n${t}` }],
    ...fallbackParams(model),
  } as unknown as Parameters<typeof client.beta.messages.stream>[0])
  const message = await stream.finalMessage()
  const costUsd = await logUsage(admin, userId, 'statement', model, message.usage)

  if (message.stop_reason === 'refusal') throw new UserError("Claude couldn't read this statement.")
  if (message.stop_reason === 'max_tokens') throw new UserError('This statement has too many lines to read at once. Import a shorter period.')
  const out = message.content.filter(b => b.type === 'text').map(b => (b as Anthropic.Beta.BetaTextBlock).text).join('')
  try {
    return { statement: JSON.parse(out), cost_zar: costUsd * ZAR_PER_USD }
  } catch {
    throw new UserError("Claude's reading of this statement was incomplete. Try again.")
  }
}
