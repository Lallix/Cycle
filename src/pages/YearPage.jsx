import { useEffect, useMemo, useState } from 'react'
import { format, parseISO } from 'date-fns'
import { ChevronLeft, ChevronRight, ChevronDown, Plus } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useBudget } from '../context/BudgetContext'
import { useToast } from '../components/ui/Toast'
import PageHeader from '../components/ui/PageHeader'
import BottomSheet from '../components/ui/BottomSheet'
import Button from '../components/ui/Button'
import { formatMoney } from '../lib/format'
import { summariseYear, monthEndBalances, averageOf, SPEND_TYPES } from '../lib/yearData'
import { effectiveBudgets, isBudgeted } from '../lib/budgets'
import { normaliseType } from '../lib/totals'

// A calendar year at a glance: money in, where it went by type and by
// category, and where each account stood at the end of every month.

const PAGE_SIZE = 1000          // Supabase returns at most 1000 rows per request
// Bright orange so income stands apart from the green spending bars
const INCOME = '#FF8A00'

const TYPE_META = {
  fixed:     { label: 'Fixed',     colour: 'rgb(var(--c-fixed))' },
  predicted: { label: 'Predicted', colour: 'rgb(var(--c-accent))' },
  unplanned: { label: 'Unplanned', colour: 'rgb(var(--c-unplanned))' },
  income:    { label: 'Income',    colour: INCOME },
  once_off:  { label: 'Once-off',  colour: '#9B6FB5' },
  debt:      { label: 'Debt',      colour: '#8A8A8A' },
}
const KIND_LABEL = {
  bank: 'Bank account', savings: 'Savings', credit_card: 'Credit card',
  loan: 'Loan', home_loan: 'Home loan', cash: 'Cash',
}

const label = { fontFamily: 'Inter, sans-serif', fontSize: 11, color: 'rgb(var(--c-text-3))' }
const money = (v, compact = true) => `${v < 0 ? '−' : ''}${formatMoney(Math.abs(v), compact)}`
const inputStyle = {
  width: '100%', padding: '12px 14px', background: 'rgb(var(--c-surface-2))', border: '0.5px solid rgb(var(--c-border-strong))',
  borderRadius: 12, color: 'rgb(var(--c-text))', fontFamily: 'Inter, sans-serif', fontSize: 14,
}

async function fetchAll(build) {
  const out = []
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await build().range(from, from + PAGE_SIZE - 1)
    if (error) throw error
    out.push(...data)
    if (data.length < PAGE_SIZE) return out
  }
}

export default function YearPage({ embedded = false }) {
  const { user } = useAuth()
  const { accounts, addAccount, categories: allCats, budgetHistory } = useBudget()
  const toast = useToast()
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [rows, setRows] = useState(null)
  const [snapshots, setSnapshots] = useState([])
  const [openType, setOpenType] = useState('predicted')
  const [openCat, setOpenCat] = useState(null)
  const [balanceOpen, setBalanceOpen] = useState(false)

  // Months of the chosen year, up to this month for the current year
  const months = useMemo(() => {
    const last = year === now.getFullYear() ? now.getMonth() + 1 : 12
    return Array.from({ length: last }, (_, i) => `${year}-${String(i + 1).padStart(2, '0')}`)
  }, [year])
  const thisMonth = format(now, 'yyyy-MM')
  const fullMonths = months.filter(m => m < thisMonth)   // averages skip the month in progress

  useEffect(() => { load() }, [year])

  async function load() {
    setRows(null)
    try {
      const [tx, snaps] = await Promise.all([
        fetchAll(() => supabase
          .from('cycle_transactions')
          .select('id, transaction_date, amount, direction, balance, account_id, category_id, cycle_categories(id, name, type, icon)')
          .eq('user_id', user.id)
          .gte('transaction_date', `${year - 1}-12-01`)   // December's closing balances carry into January
          .lte('transaction_date', `${year}-12-31`)
          .order('transaction_date')
          .order('id')),
        supabase.from('cycle_account_balances').select('*').eq('user_id', user.id).lte('as_at', `${year}-12-31`)
          .then(({ data, error }) => { if (error) throw error; return data }),
      ])
      setRows(tx)
      setSnapshots(snaps)
    } catch (e) {
      toast(e.message, 'error')
      setRows([])
    }
  }

  const { summary, categories } = useMemo(
    () => (rows ? summariseYear(rows, months) : { summary: {}, categories: [] }),
    [rows, months])

  const balanceMonths = useMemo(() => [`${year - 1}-12`, ...months], [year, months])
  const balances = useMemo(
    () => (rows ? monthEndBalances(rows, snapshots, balanceMonths) : {}),
    [rows, snapshots, balanceMonths])

  // Planned spending per month: the limits in force on the 1st of that month.
  // Months before the first budget have no plan.
  const plan = useMemo(() => Object.fromEntries(months.map(m => {
    if (!isBudgeted(budgetHistory, `${m}-01`)) return [m, null]
    const b = effectiveBudgets(allCats, budgetHistory, `${m}-01`)
    const spend = allCats
      .filter(c => SPEND_TYPES.includes(normaliseType(c.type)))
      .reduce((s, c) => s + (b[c.id] || 0), 0)
    return [m, { spend, byCat: b }]
  })), [months, allCats, budgetHistory])
  months.forEach(m => {
    if (summary[m]) {
      summary[m].planned = plan[m] ? plan[m].spend : null
      summary[m].vsPlan = plan[m] ? plan[m].spend - summary[m].spent : null
    }
  })

  const ytd = useMemo(() => {
    const keys = ['income', 'fixed', 'predicted', 'unplanned', 'spent', 'planned', 'vsPlan', 'leftOver', 'onceOff', 'debt', 'afterAll']
    const sum = Object.fromEntries(keys.map(k => [k, months.reduce((s, m) => s + (summary[m]?.[k] || 0), 0)]))
    // Plan figures average over the planned months only
    const avg = Object.fromEntries(keys.map(k => [k, averageOf(fullMonths
      .filter(m => !['planned', 'vsPlan'].includes(k) || summary[m]?.[k] != null)
      .map(m => summary[m]?.[k] || 0))]))
    // No planned month yet: nothing to total
    const hasPlan = (list, k) => list.some(m => summary[m]?.[k] != null)
    ;['planned', 'vsPlan'].forEach(k => {
      if (!hasPlan(months, k)) sum[k] = null
      if (!hasPlan(fullMonths, k)) avg[k] = null
    })
    return { sum, avg }
  }, [summary, months, fullMonths, plan])

  const maxBar = Math.max(1, ...months.map(m => Math.max(summary[m]?.income || 0, summary[m]?.spent || 0)))

  return (
    <div style={{ minHeight: '100%', background: 'rgb(var(--c-bg))', paddingBottom: 120 }}>
      {embedded
        ? <p style={{ padding: '0 16px 10px', fontSize: 12, color: 'rgb(var(--c-text-3))' }}>Calendar months · all accounts</p>
        : <PageHeader title="Year view" subtitle="Calendar months · all accounts" back />}

      {/* Year switcher */}
      <div className="flex items-center justify-between mx-4 mb-3 px-3 py-2"
        style={{ background: 'rgb(var(--c-surface))', borderRadius: 14, border: '0.5px solid rgb(var(--c-border))' }}>
        <button onClick={() => setYear(y => y - 1)} className="p-1.5 rounded-lg tappable" aria-label="Previous year">
          <ChevronLeft size={16} color="rgb(var(--c-text-2))" />
        </button>
        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, color: 'rgb(var(--c-text))' }}>{year}</span>
        <button onClick={() => setYear(y => y + 1)} disabled={year >= now.getFullYear()}
          className="p-1.5 rounded-lg tappable" style={{ opacity: year >= now.getFullYear() ? 0.3 : 1 }} aria-label="Next year">
          <ChevronRight size={16} color="rgb(var(--c-text-2))" />
        </button>
      </div>

      {rows === null ? (
        <p className="text-center py-10" style={label}>Loading {year}…</p>
      ) : rows.length === 0 ? (
        <p className="text-center py-10" style={label}>No transactions for {year} yet — import a statement to fill it in.</p>
      ) : (
        <div className="px-4 space-y-4">

          {/* Year to date */}
          <div style={{ background: 'rgb(var(--c-surface))', borderRadius: 16, border: '0.5px solid rgb(var(--c-border))', padding: 16 }}>
            <p style={{ ...label, color: 'rgb(var(--c-text-3))', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600, marginBottom: 10 }}>
              {year} to date · {months.length} month{months.length > 1 ? 's' : ''}
            </p>
            <div className="grid grid-cols-3 gap-2 text-center">
              {[['Income', ytd.sum.income, INCOME], ['Spent', ytd.sum.spent, 'rgb(var(--c-negative))'], ['Left over', ytd.sum.leftOver, ytd.sum.leftOver < 0 ? 'rgb(var(--c-negative))' : 'rgb(var(--c-accent))']].map(([t, v, c]) => (
                <div key={t}>
                  <p style={{ ...label, color: 'rgb(var(--c-text-3))', fontSize: 10, textTransform: 'uppercase' }}>{t}</p>
                  <p style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 15, color: c }}>{money(v)}</p>
                </div>
              ))}
            </div>
            {fullMonths.length > 0 && (
              <p style={{ ...label, color: 'rgb(var(--c-text-2))', marginTop: 10, textAlign: 'center' }}>
                A typical month: in {money(ytd.avg.income)}, out {money(ytd.avg.spent)},
                {' '}<b style={{ color: ytd.avg.leftOver < 0 ? 'rgb(var(--c-negative))' : 'rgb(var(--c-positive))' }}>{ytd.avg.leftOver < 0 ? 'short' : 'over'} {money(Math.abs(ytd.avg.leftOver))}</b>
              </p>
            )}
            {(ytd.sum.onceOff !== 0 || ytd.sum.debt !== 0) && (
              <p style={{ ...label, color: 'rgb(var(--c-text-3))', marginTop: 4, textAlign: 'center' }}>
                Plus once-offs {money(ytd.sum.onceOff)} and loans {money(ytd.sum.debt)} → {money(ytd.sum.afterAll)} after everything
              </p>
            )}
          </div>

          {/* Month bars */}
          <Section title="Month by month">
            <div className="space-y-3">
              {months.map(m => {
                const r = summary[m]
                return (
                  <div key={m}>
                    <div className="flex justify-between mb-1">
                      <span style={{ ...label, color: 'rgb(var(--c-text-2))' }}>{format(parseISO(`${m}-01`), 'MMM')}{m === thisMonth ? ' (so far)' : ''}</span>
                      <span style={{ ...label, color: r.leftOver < 0 ? 'rgb(var(--c-negative))' : 'rgb(var(--c-positive))', fontWeight: 600 }}>{money(r.leftOver)}</span>
                    </div>
                    <div style={{ position: 'relative', height: 10, background: 'rgb(var(--c-border))', borderRadius: 5, overflow: 'hidden', display: 'flex' }}>
                      {SPEND_TYPES.map(t => (
                        <div key={t} style={{ width: `${(Math.max(0, r[t]) / maxBar) * 100}%`, background: TYPE_META[t].colour }} />
                      ))}
                      <div title="Income" style={{ position: 'absolute', top: 0, bottom: 0, width: 3, marginLeft: -1, borderRadius: 2, background: INCOME, boxShadow: '0 0 6px rgb(255 138 0 / 0.7)', left: `${Math.min(100, (r.income / maxBar) * 100)}%` }} />
                    </div>
                  </div>
                )
              })}
              <div className="flex flex-wrap gap-3 pt-1">
                {SPEND_TYPES.map(t => <Legend key={t} colour={TYPE_META[t].colour} text={TYPE_META[t].label} />)}
                <Legend colour={INCOME} text="Income" line />
              </div>
            </div>
          </Section>

          {/* Table */}
          <Section title="Totals by type">
            <div className="overflow-x-auto -mx-4 px-4">
              <table style={{ borderCollapse: 'collapse', fontFamily: 'Inter, sans-serif', fontSize: 12, minWidth: '100%' }}>
                <thead>
                  <tr>
                    <th style={th(true)} />
                    {months.map(m => <th key={m} style={th()}>{format(parseISO(`${m}-01`), 'MMM')}</th>)}
                    <th style={th()}>Total</th>
                    <th style={th()}>Avg</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ['Income', 'income'], ['Fixed', 'fixed'], ['Predicted', 'predicted'], ['Unplanned', 'unplanned'],
                    ['Spent', 'spent', true], ['Plan', 'planned'], ['Under (+) / over (−) plan', 'vsPlan', true],
                    ['Left over', 'leftOver', true], ['Once-off', 'onceOff'], ['Loans', 'debt'], ['After all', 'afterAll', true],
                  ].map(([name, key, strong]) => (
                    <tr key={key} style={{ borderTop: '0.5px solid rgb(var(--c-border))' }}>
                      <td style={{ ...td(true), fontWeight: strong ? 600 : 400 }}>{name}</td>
                      {months.map(m => <td key={m} style={td(false, strong, summary[m][key])}>{summary[m][key] == null ? '—' : money(summary[m][key])}</td>)}
                      <td style={td(false, true, ytd.sum[key])}>{ytd.sum[key] == null ? '—' : money(ytd.sum[key])}</td>
                      <td style={td(false, false, ytd.avg[key])}>{ytd.avg[key] == null ? '—' : money(ytd.avg[key])}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>

          {/* Categories */}
          <Section title="By category">
            <div className="space-y-2">
              {['fixed', 'predicted', 'unplanned', 'income', 'once_off', 'debt'].map(type => {
                const list = categories.filter(c => c.type === type && Math.abs(c.total) >= 0.01).sort((a, b) => Math.abs(b.total) - Math.abs(a.total))
                if (!list.length) return null
                const total = list.reduce((s, c) => s + c.total, 0)
                const open = openType === type
                return (
                  <div key={type} style={{ border: '0.5px solid rgb(var(--c-border))', borderRadius: 12, overflow: 'hidden' }}>
                    <button onClick={() => setOpenType(open ? null : type)} className="w-full flex items-center justify-between px-3 py-2.5"
                      style={{ background: '#161616' }}>
                      <span className="flex items-center gap-2" style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, color: 'rgb(var(--c-text))', fontWeight: 500 }}>
                        <span style={{ width: 8, height: 8, borderRadius: 4, background: TYPE_META[type].colour }} />
                        {TYPE_META[type].label}
                      </span>
                      <span className="flex items-center gap-2" style={{ ...label, color: 'rgb(var(--c-text-2))' }}>
                        {money(total)}
                        <ChevronDown size={14} style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                      </span>
                    </button>
                    {open && list.map(c => {
                      const avg = averageOf(fullMonths.map(m => c.byMonth[m] || 0))
                      const limit = plan[months[months.length - 1]]?.byCat[c.id]
                      const expanded = openCat === c.id
                      return (
                        <div key={c.id} style={{ borderTop: '0.5px solid rgb(var(--c-border))' }}>
                          <button onClick={() => setOpenCat(expanded ? null : c.id)} className="w-full flex items-center gap-2 px-3 py-2 text-left">
                            <span style={{ width: 22, textAlign: 'center' }}>{c.icon}</span>
                            <span className="flex-1 min-w-0 truncate" style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, color: 'rgb(var(--c-text))' }}>{c.name}</span>
                            <span style={{ ...label, width: 92, textAlign: 'right', color: limit && avg > limit ? 'rgb(var(--c-negative))' : 'rgb(var(--c-text-3))' }}>
                              {money(avg)}{limit ? ` / ${money(limit)}` : '/mo'}
                            </span>
                            <span style={{ fontFamily: 'var(--font-display)', fontSize: 12, fontWeight: 600, color: 'rgb(var(--c-text))', width: 72, textAlign: 'right' }}>{money(c.total)}</span>
                          </button>
                          {expanded && (
                            <div className="grid grid-cols-4 gap-1 px-3 pb-3">
                              {months.map(m => (
                                <div key={m} className="text-center py-1" style={{ background: 'rgb(var(--c-surface))', borderRadius: 8 }}>
                                  <p style={{ ...label, fontSize: 10 }}>{format(parseISO(`${m}-01`), 'MMM')}</p>
                                  <p style={{ fontFamily: 'var(--font-display)', fontSize: 11, color: 'rgb(var(--c-text))' }}>{money(c.byMonth[m] || 0)}</p>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )
              })}
            </div>
          </Section>

          {/* Balances */}
          <Section
            title="Balances at month end"
            action={<button onClick={() => setBalanceOpen(true)} className="flex items-center gap-1" style={{ ...label, color: 'rgb(var(--c-accent))' }}><Plus size={13} /> Add balance</button>}
          >
            <BalancesTable accounts={accounts} balances={balances} months={balanceMonths} />
            <p style={{ ...label, marginTop: 8 }}>
              Imported accounts come from the statement balance. For the bond and loans, add the balance from the bank app now and then — negative means owed.
            </p>
          </Section>
        </div>
      )}

      <AddBalanceSheet
        open={balanceOpen}
        onClose={() => setBalanceOpen(false)}
        accounts={accounts}
        addAccount={addAccount}
        userId={user?.id}
        onSaved={() => { setBalanceOpen(false); load() }}
      />
    </div>
  )
}

function Section({ title, action, children }) {
  return (
    <div style={{ background: 'rgb(var(--c-surface))', borderRadius: 16, border: '0.5px solid rgb(var(--c-border))', padding: 16 }}>
      <div className="flex items-center justify-between" style={{ marginBottom: 12 }}>
        <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, fontWeight: 600, color: 'rgb(var(--c-text-3))', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{title}</p>
        {action}
      </div>
      {children}
    </div>
  )
}

function Legend({ colour, text, line }) {
  return (
    <span className="flex items-center gap-1.5" style={{ fontFamily: 'Inter, sans-serif', fontSize: 10, color: 'rgb(var(--c-text-3))' }}>
      <span style={{ width: line ? 3 : 8, height: 8, borderRadius: line ? 0 : 2, background: colour }} />{text}
    </span>
  )
}

const th = (first) => ({
  position: first ? 'sticky' : undefined, left: first ? 0 : undefined, background: 'rgb(var(--c-surface))',
  padding: '6px 8px', color: 'rgb(var(--c-text-3))', fontWeight: 500, textAlign: first ? 'left' : 'right', whiteSpace: 'nowrap',
})
const td = (first, strong, value) => ({
  position: first ? 'sticky' : undefined, left: first ? 0 : undefined, background: 'rgb(var(--c-surface))',
  padding: '6px 8px', whiteSpace: 'nowrap', textAlign: first ? 'left' : 'right',
  color: first ? 'rgb(var(--c-text))' : value < 0 && strong ? 'rgb(var(--c-negative))' : strong ? 'rgb(var(--c-text))' : 'rgb(var(--c-text-2))',
  fontWeight: strong ? 600 : 400,
})

function BalancesTable({ accounts, balances, months }) {
  const shown = accounts.filter(a => balances[a.id])
  if (!shown.length) return <p style={label}>No balances yet.</p>
  const net = m => shown.reduce((s, a) => s + (balances[a.id][m] ?? 0), 0)
  return (
    <div className="overflow-x-auto -mx-4 px-4">
      <table style={{ borderCollapse: 'collapse', fontFamily: 'Inter, sans-serif', fontSize: 12, minWidth: '100%' }}>
        <thead>
          <tr>
            <th style={th(true)} />
            {months.map(m => <th key={m} style={th()}>{format(parseISO(`${m}-01`), 'MMM yy')}</th>)}
          </tr>
        </thead>
        <tbody>
          {shown.map(a => (
            <tr key={a.id} style={{ borderTop: '0.5px solid rgb(var(--c-border))' }}>
              <td style={td(true)}>{a.name}<span style={{ color: 'rgb(var(--c-text-3))' }}> · {KIND_LABEL[a.kind] || 'Account'}</span></td>
              {months.map(m => {
                const v = balances[a.id][m]
                return <td key={m} style={td(false, false, v)}>{v == null ? '—' : money(v)}</td>
              })}
            </tr>
          ))}
          <tr style={{ borderTop: '0.5px solid rgb(var(--c-border-strong))' }}>
            <td style={{ ...td(true), fontWeight: 600 }}>Net position</td>
            {months.map(m => <td key={m} style={td(false, true, net(m))}>{money(net(m))}</td>)}
          </tr>
        </tbody>
      </table>
    </div>
  )
}

function AddBalanceSheet({ open, onClose, accounts, addAccount, userId, onSaved }) {
  const toast = useToast()
  const [form, setForm] = useState({ accountId: '', name: '', kind: 'home_loan', date: format(new Date(), 'yyyy-MM-dd'), amount: '' })
  const [saving, setSaving] = useState(false)
  const isNew = form.accountId === 'new' || accounts.length === 0

  async function save() {
    const amount = parseFloat(String(form.amount).replace(/[\s,]/g, ''))
    if (Number.isNaN(amount)) { toast('Enter the balance (negative if you owe it)', 'error'); return }
    setSaving(true)
    try {
      let accountId = form.accountId
      if (isNew) {
        if (!form.name.trim()) throw new Error('Name the account')
        accountId = (await addAccount({ name: form.name.trim(), bank: form.name.trim(), kind: form.kind })).id
      }
      if (!accountId) throw new Error('Choose an account')
      const { error } = await supabase.from('cycle_account_balances').upsert(
        { user_id: userId, account_id: accountId, as_at: form.date, balance: amount, source: 'manual' },
        { onConflict: 'account_id,as_at' })
      if (error) throw error
      toast('Balance saved', 'success')
      onSaved()
    } catch (e) {
      toast(e.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <BottomSheet open={open} onClose={onClose} title="Add a balance">
      <div className="px-5 space-y-3 pb-8">
        <select style={inputStyle} value={form.accountId} onChange={e => setForm(f => ({ ...f, accountId: e.target.value }))}>
          <option value="">Choose an account…</option>
          {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
          <option value="new">+ New account (bond, loan…)</option>
        </select>
        {isNew && (
          <div className="grid grid-cols-2 gap-2">
            <input style={inputStyle} placeholder="Name, e.g. Home loan" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            <select style={inputStyle} value={form.kind} onChange={e => setForm(f => ({ ...f, kind: e.target.value }))}>
              {Object.entries(KIND_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
        )}
        <input type="date" style={inputStyle} value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
        <input inputMode="decimal" style={inputStyle} placeholder="Balance, e.g. -850000 for a bond" value={form.amount}
          onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} />
        <Button fullWidth loading={saving} onClick={save}>Save balance</Button>
      </div>
    </BottomSheet>
  )
}
