import { useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FileUp, CheckCircle2, AlertTriangle, Copy, ArrowDownLeft, ArrowUpRight } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useBudget } from '../context/BudgetContext'
import { useToast } from '../components/ui/Toast'
import PageHeader from '../components/ui/PageHeader'
import Button from '../components/ui/Button'
import { formatMoney } from '../lib/format'
import { parseCapitecCsv, guessAccountKind } from '../lib/import/capitec'
import { hashLines } from '../lib/import/fingerprint'
import { buildCategoriser, payeeKey, escapeRegex } from '../lib/import/categorise'

// Import a bank statement (Capitec CSV: main account or credit card).
// pick file → match it to an account → review categories → import.

const PAGE = 150
const INSERT_CHUNK = 300

const KIND_LABEL = {
  bank: 'Bank account', savings: 'Savings', credit_card: 'Credit card',
  loan: 'Loan', home_loan: 'Home loan', cash: 'Cash',
}

// Category groups for the picker; legacy types sit with their new equivalents.
const TYPE_GROUPS = [
  ['Income',    ['income']],
  ['Fixed',     ['fixed']],
  ['Predicted', ['predicted', 'variable']],
  ['Unplanned', ['unplanned', 'unbudgeted']],
  ['Once-off',  ['once_off']],
  ['Debt',      ['debt']],
  ['Transfer',  ['transfer']],
]

const card = { background: '#1B1B1B', border: '0.5px solid #2A2A2A', borderRadius: 16 }
const label = { fontFamily: 'Inter, sans-serif', fontSize: 12, color: '#717179' }
const inputStyle = {
  width: '100%', padding: '12px 14px', background: '#2E2E2E', border: '0.5px solid #3A3A3A',
  borderRadius: 12, color: '#FFFFFF', fontFamily: 'Inter, sans-serif', fontSize: 14,
}

function chunk(arr, n) {
  const out = []
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n))
  return out
}

export default function ImportPage() {
  const navigate = useNavigate()
  const toast = useToast()
  const { user } = useAuth()
  const { categories, accounts, addAccount, updateAccount, refresh } = useBudget()
  const fileRef = useRef(null)

  const [step, setStep] = useState('pick')        // pick · account · review · done
  const [busy, setBusy] = useState(false)
  const [fileName, setFileName] = useState('')
  const [parsed, setParsed] = useState(null)      // { lines, pending, accountNumber, kind }
  const [account, setAccount] = useState(null)
  const [accountChoice, setAccountChoice] = useState('new')
  const [newAccount, setNewAccount] = useState({ name: '', kind: 'bank' })
  const [rows, setRows] = useState([])            // lines + hash, duplicate, categoryId, via, key
  const [learned, setLearned] = useState({})      // payee key → category id (becomes a rule)
  const [filter, setFilter] = useState('new')
  const [shown, setShown] = useState(PAGE)
  const [result, setResult] = useState(null)

  // ── Step 1: read the file ─────────────────────────────────────
  async function onFile(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setBusy(true)
    try {
      const { lines, pending } = parseCapitecCsv(await file.text())
      if (lines.length === 0) throw new Error('No transactions found in this file.')
      const numbers = [...new Set(lines.map(l => l.accountNumber))]
      if (numbers.length > 1) throw new Error('This file has more than one account in it — export each account separately.')
      const accountNumber = numbers[0]
      const kind = guessAccountKind(lines)
      setFileName(file.name)
      setParsed({ lines, pending, accountNumber, kind })

      const match = accounts.find(a => a.account_number === accountNumber)
      if (match) {
        await prepareReview(lines, match)
      } else {
        setNewAccount({ name: kind === 'credit_card' ? 'Capitec credit card' : 'Capitec', kind })
        setAccountChoice(accounts.find(a => !a.account_number)?.id || 'new')
        setStep('account')
      }
    } catch (err) {
      toast(err.message, 'error', 5000)
    } finally {
      setBusy(false)
    }
  }

  // ── Step 2: link the file to an account ──────────────────────
  async function confirmAccount() {
    setBusy(true)
    try {
      let acc
      if (accountChoice === 'new') {
        if (!newAccount.name.trim()) throw new Error('Give the account a name')
        acc = await addAccount({
          name: newAccount.name.trim(), bank: 'Capitec', kind: newAccount.kind,
          account_number: parsed.accountNumber,
        })
      } else {
        acc = await updateAccount(accountChoice, { account_number: parsed.accountNumber })
      }
      await prepareReview(parsed.lines, acc)
    } catch (err) {
      toast(err.message, 'error', 5000)
    } finally {
      setBusy(false)
    }
  }

  // ── Step 3: fingerprint, find duplicates, auto-categorise ─────
  async function prepareReview(lines, acc) {
    setAccount(acc)
    const hashes = await hashLines(lines)

    const existing = new Set()
    for (const part of chunk(hashes, 200)) {
      const { data, error } = await supabase
        .from('cycle_transactions')
        .select('import_hash')
        .eq('user_id', user.id)
        .in('import_hash', part)
      if (error) throw error
      data.forEach(d => existing.add(d.import_hash))
    }

    const { data: rules, error } = await supabase
      .from('cycle_payee_rules')
      .select('*')
      .eq('user_id', user.id)
    if (error) throw error
    const categorise = buildCategoriser(categories, rules || [])

    setRows(lines.map((l, i) => {
      const { categoryId, via } = categorise(l, acc.id)
      return { ...l, hash: hashes[i], duplicate: existing.has(hashes[i]), categoryId, via, key: payeeKey(l.description) }
    }))
    setLearned({})
    setFilter('new')
    setShown(PAGE)
    setStep('review')
  }

  // Picking a category for one line applies it to every new line from the
  // same payee that you have not set by hand, and is remembered as a rule.
  function setCategory(hash, categoryId) {
    const target = rows.find(r => r.hash === hash)
    setRows(prev => prev.map(r => {
      if (r.hash === hash) return { ...r, categoryId, via: 'manual' }
      if (r.key === target.key && r.via !== 'manual' && !r.duplicate) return { ...r, categoryId, via: 'manual-payee' }
      return r
    }))
    if (target.key) setLearned(prev => ({ ...prev, [target.key]: categoryId }))
  }

  const stats = useMemo(() => {
    const fresh = rows.filter(r => !r.duplicate)
    return {
      total: rows.length,
      fresh: fresh.length,
      duplicates: rows.length - fresh.length,
      uncategorised: fresh.filter(r => !r.categoryId).length,
      moneyIn: fresh.filter(r => r.direction === 'in').reduce((s, r) => s + r.amount, 0),
      moneyOut: fresh.filter(r => r.direction === 'out').reduce((s, r) => s + r.amount, 0),
      from: rows[0]?.date, to: rows[rows.length - 1]?.date,
    }
  }, [rows])

  const visible = useMemo(() => {
    const list = filter === 'new' ? rows.filter(r => !r.duplicate)
      : filter === 'uncategorised' ? rows.filter(r => !r.duplicate && !r.categoryId)
      : filter === 'duplicates' ? rows.filter(r => r.duplicate)
      : rows
    return [...list].reverse()          // newest first
  }, [rows, filter])

  const grouped = useMemo(() => TYPE_GROUPS
    .map(([name, types]) => [name, categories.filter(c => types.includes(c.type))])
    .filter(([, cats]) => cats.length), [categories])

  // ── Step 4: write it all ─────────────────────────────────────
  async function runImport() {
    const fresh = rows.filter(r => !r.duplicate)
    if (fresh.length === 0) { toast('Nothing new to import', 'info'); return }
    setBusy(true)
    try {
      const { data: batch, error: bErr } = await supabase
        .from('cycle_import_batches')
        .insert({
          user_id: user.id, account_id: account.id, file_name: fileName, file_format: 'capitec_csv',
          statement_from: stats.from, statement_to: stats.to, row_count: rows.length,
          duplicate_count: stats.duplicates,
        })
        .select().single()
      if (bErr) throw bErr

      let inserted = 0
      for (const part of chunk(fresh, INSERT_CHUNK)) {
        const { error } = await supabase.from('cycle_transactions').insert(part.map(r => ({
          user_id: user.id,
          amount: r.amount,
          direction: r.direction,
          category_id: r.categoryId || null,
          account: account.bank || account.name,
          account_id: account.id,
          description: r.description,
          bank_category: r.bankCategory || null,
          balance: r.balance,
          transaction_date: r.date,
          source: 'import',
          import_hash: r.hash,
          import_batch_id: batch.id,
          // cycle_key is filled by the database from your paydays
        })))
        if (error) throw error
        inserted += part.length
      }

      // Remember the payees you categorised by hand
      const newRules = Object.entries(learned)
        .filter(([key, cat]) => key && cat)
        .map(([key, cat]) => ({
          user_id: user.id, pattern: escapeRegex(key), category_id: cat,
          priority: 50, notes: `Learned from ${fileName}`,
        }))
      if (newRules.length) {
        const { error } = await supabase.from('cycle_payee_rules').insert(newRules)
        if (error) toast(`Imported, but rules were not saved: ${error.message}`, 'warning', 5000)
      }

      // Closing balance of the statement → balance history
      const last = [...rows].reverse().find(r => r.balance != null)
      if (last) {
        await supabase.from('cycle_account_balances').upsert({
          user_id: user.id, account_id: account.id, as_at: last.date,
          balance: last.balance, source: 'statement',
        }, { onConflict: 'account_id,as_at' })
      }

      await supabase.from('cycle_import_batches')
        .update({ inserted_count: inserted }).eq('id', batch.id)

      setResult({ inserted, duplicates: stats.duplicates, rules: newRules.length, pending: parsed.pending.length })
      setStep('done')
      refresh()
    } catch (err) {
      toast(`Import stopped: ${err.message}`, 'error', 6000)
    } finally {
      setBusy(false)
    }
  }

  function reset() {
    setStep('pick'); setParsed(null); setRows([]); setAccount(null); setResult(null)
  }

  // ── Render ───────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100%', background: '#0D0D0D', paddingBottom: step === 'review' ? 180 : 120 }}>
      <PageHeader title="Import statement" subtitle="Capitec CSV — main account or credit card" back />

      <div className="px-4 space-y-4">
        {step === 'pick' && (
          <>
            <input ref={fileRef} type="file" accept=".csv,text/csv" onChange={onFile} hidden />
            <button
              onClick={() => fileRef.current?.click()}
              disabled={busy}
              className="w-full flex flex-col items-center gap-3 py-10 tappable"
              style={{ ...card, border: '1px dashed rgba(255,209,102,0.4)' }}
            >
              <FileUp size={32} color="#FFD166" />
              <span style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 600, color: '#FFFFFF' }}>
                {busy ? 'Reading…' : 'Choose a CSV file'}
              </span>
              <span style={label}>Capitec app → Account → Statements → Download → CSV</span>
            </button>
            <div style={{ ...card, padding: 16 }} className="space-y-2">
              <p style={{ ...label, color: '#A1A1AA' }}>How it works</p>
              <p style={label}>• Lines already imported are recognised and skipped, so overlapping statements are safe.</p>
              <p style={label}>• Categories come from your payee rules first, then from Capitec's own category.</p>
              <p style={label}>• Choosing a category for a payee applies it to that payee's other lines and is remembered next time.</p>
              <p style={label}>• Pending card lines are skipped until they clear.</p>
            </div>
          </>
        )}

        {step === 'account' && parsed && (
          <div style={{ ...card, padding: 16 }} className="space-y-4">
            <div>
              <p style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 600, color: '#FFFFFF' }}>
                Which account is {parsed.accountNumber}?
              </p>
              <p style={label}>{parsed.lines.length} lines · looks like a {KIND_LABEL[parsed.kind].toLowerCase()}</p>
            </div>
            <div className="space-y-2">
              {accounts.filter(a => !a.account_number).map(a => (
                <label key={a.id} className="flex items-center gap-3" style={{ ...label, color: '#FFFFFF', fontSize: 14 }}>
                  <input type="radio" checked={accountChoice === a.id} onChange={() => setAccountChoice(a.id)} />
                  Link to {a.name}{a.bank && a.bank !== a.name ? ` (${a.bank})` : ''}
                </label>
              ))}
              <label className="flex items-center gap-3" style={{ ...label, color: '#FFFFFF', fontSize: 14 }}>
                <input type="radio" checked={accountChoice === 'new'} onChange={() => setAccountChoice('new')} />
                Create a new account
              </label>
            </div>
            {accountChoice === 'new' && (
              <div className="space-y-2">
                <input style={inputStyle} value={newAccount.name} placeholder="Account name"
                  onChange={e => setNewAccount(p => ({ ...p, name: e.target.value }))} />
                <select style={inputStyle} value={newAccount.kind}
                  onChange={e => setNewAccount(p => ({ ...p, kind: e.target.value }))}>
                  {Object.entries(KIND_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
            )}
            <div className="flex gap-2">
              <Button variant="secondary" onClick={reset}>Cancel</Button>
              <Button fullWidth loading={busy} onClick={confirmAccount}>Continue</Button>
            </div>
          </div>
        )}

        {step === 'review' && (
          <>
            <div style={{ ...card, padding: 16 }} className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 600, color: '#FFFFFF' }}>{account?.name}</p>
                  <p style={label}>{fileName} · {stats.from} → {stats.to}</p>
                </div>
                <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 6, background: 'rgba(255,209,102,0.1)', color: '#FFD166' }}>
                  {KIND_LABEL[account?.kind] || 'Account'}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <Stat label="New lines" value={stats.fresh} />
                <Stat label="Already in" value={stats.duplicates} />
                <Stat label="No category" value={stats.uncategorised} warn={stats.uncategorised > 0} />
              </div>
              <div className="flex justify-between" style={label}>
                <span>In <b style={{ color: '#22C55E' }}>{formatMoney(stats.moneyIn)}</b></span>
                <span>Out <b style={{ color: '#EF4444' }}>{formatMoney(stats.moneyOut)}</b></span>
              </div>
              {parsed?.pending.length > 0 && (
                <p style={label}>{parsed.pending.length} pending line{parsed.pending.length > 1 ? 's' : ''} skipped — they will come in with the next statement.</p>
              )}
            </div>

            <div className="flex gap-2 overflow-x-auto no-scrollbar">
              {[['new', `New (${stats.fresh})`], ['uncategorised', `No category (${stats.uncategorised})`],
                ['duplicates', `Already in (${stats.duplicates})`], ['all', 'All']].map(([k, t]) => (
                <button key={k} onClick={() => { setFilter(k); setShown(PAGE) }}
                  style={{
                    flexShrink: 0, padding: '6px 12px', borderRadius: 999, fontSize: 12, fontFamily: 'Inter, sans-serif',
                    background: filter === k ? 'rgba(255,209,102,0.15)' : '#1B1B1B',
                    color: filter === k ? '#FFD166' : '#A1A1AA',
                    border: `0.5px solid ${filter === k ? 'rgba(255,209,102,0.4)' : '#2A2A2A'}`,
                  }}>
                  {t}
                </button>
              ))}
            </div>

            <div style={card} className="overflow-hidden">
              {visible.length === 0 && <p className="px-4 py-6 text-center" style={label}>Nothing here</p>}
              {visible.slice(0, shown).map(r => (
                <ReviewRow key={r.hash} row={r} groups={grouped} onChange={setCategory} />
              ))}
            </div>
            {visible.length > shown && (
              <Button variant="secondary" fullWidth onClick={() => setShown(s => s + PAGE)}>
                Show {Math.min(PAGE, visible.length - shown)} more of {visible.length - shown}
              </Button>
            )}
          </>
        )}

        {step === 'done' && result && (
          <div style={{ ...card, padding: 24 }} className="flex flex-col items-center gap-3 text-center">
            <CheckCircle2 size={40} color="#22C55E" />
            <p style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 600, fontSize: 18, color: '#FFFFFF' }}>
              {result.inserted} transactions imported
            </p>
            <p style={label}>
              {result.duplicates > 0 && `${result.duplicates} already in and skipped. `}
              {result.rules > 0 && `${result.rules} payee rule${result.rules > 1 ? 's' : ''} saved. `}
              {result.pending > 0 && `${result.pending} pending skipped.`}
            </p>
            <div className="flex gap-2 w-full pt-2">
              <Button variant="secondary" fullWidth onClick={reset}>Import another</Button>
              <Button fullWidth onClick={() => navigate('/expenses')}>View transactions</Button>
            </div>
          </div>
        )}
      </div>

      {step === 'review' && (
        <div className="fixed left-0 right-0 px-4" style={{ bottom: 'calc(72px + env(safe-area-inset-bottom))' }}>
          <Button fullWidth size="lg" loading={busy} disabled={stats.fresh === 0} onClick={runImport}>
            Import {stats.fresh} transaction{stats.fresh !== 1 ? 's' : ''}
          </Button>
        </div>
      )}
    </div>
  )
}

function Stat({ label: text, value, warn }) {
  return (
    <div className="flex flex-col items-center py-2" style={{ background: '#0D0D0D', borderRadius: 12 }}>
      <span style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 600, fontSize: 18, color: warn ? '#FFB347' : '#FFFFFF' }}>{value}</span>
      <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, color: '#717179' }}>{text}</span>
    </div>
  )
}

function ReviewRow({ row, groups, onChange }) {
  const isIn = row.direction === 'in'
  const Arrow = isIn ? ArrowDownLeft : ArrowUpRight
  return (
    <div className="px-4 py-3 border-b border-border last:border-0 space-y-2" style={{ opacity: row.duplicate ? 0.45 : 1 }}>
      <div className="flex items-start gap-3">
        <Arrow size={16} color={isIn ? '#22C55E' : '#A1A1AA'} style={{ marginTop: 2, flexShrink: 0 }} />
        <div className="flex-1 min-w-0">
          <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, color: '#FFFFFF', lineHeight: 1.35 }}>{row.description}</p>
          <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, color: '#717179' }}>
            {row.date}{row.bankCategory ? ` · ${row.bankCategory}` : ''}
          </p>
        </div>
        <span style={{ fontFamily: 'Poppins, sans-serif', fontSize: 13, fontWeight: 600, color: isIn ? '#22C55E' : '#FFFFFF', flexShrink: 0 }}>
          {isIn ? '+' : '−'}{formatMoney(row.amount)}
        </span>
      </div>
      {row.duplicate ? (
        <p className="flex items-center gap-1" style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, color: '#717179' }}>
          <Copy size={12} /> Already imported
        </p>
      ) : (
        <div className="flex items-center gap-2">
          {!row.categoryId && <AlertTriangle size={14} color="#FFB347" style={{ flexShrink: 0 }} />}
          <select
            value={row.categoryId || ''}
            onChange={e => onChange(row.hash, e.target.value || null)}
            style={{
              flex: 1, padding: '8px 10px', background: '#2E2E2E', borderRadius: 10, fontSize: 12,
              border: `0.5px solid ${row.categoryId ? '#3A3A3A' : 'rgba(255,179,71,0.5)'}`,
              color: row.categoryId ? '#FFFFFF' : '#FFB347', fontFamily: 'Inter, sans-serif',
            }}
          >
            <option value="">Choose a category…</option>
            {groups.map(([name, cats]) => (
              <optgroup key={name} label={name}>
                {cats.map(c => <option key={c.id} value={c.id}>{c.icon ? `${c.icon} ` : ''}{c.name}</option>)}
              </optgroup>
            ))}
          </select>
          {row.via === 'rule' && <span style={{ fontSize: 10, color: '#FFD166', flexShrink: 0 }}>rule</span>}
        </div>
      )}
    </div>
  )
}
