import { useEffect, useMemo, useState } from 'react'
import { format, parseISO } from 'date-fns'
import { ChevronDown } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { useBudget } from '../../context/BudgetContext'
import { coverByBank, latestBalance } from '../../lib/cover'
import { accountStyle, getAccountConfig } from '../../lib/format'

// What each bank still has to pay this cycle (debit orders, bills,
// subscriptions) against what is in it — so you know what to move where.
const display = { fontFamily: 'var(--font-display)' }
const small = { fontSize: 12, color: 'rgb(var(--c-text-3))' }
const R = v => `${v < 0 ? '−' : ''}R${Math.round(Math.abs(v)).toLocaleString('en-ZA').replace(/[,\s]/g, ' ')}`

export default function CoverAccounts() {
  const { user } = useAuth()
  const { accounts, categories, cycles, transactions, getTransactionsForCycle } = useBudget()
  const [recent, setRecent] = useState(null)
  const [balances, setBalances] = useState({})
  const [open, setOpen] = useState(null)

  const recentKeys = cycles.slice(1, 4).map(c => c.key).join(',')
  useEffect(() => {
    if (!recentKeys) { setRecent([]); return }
    Promise.all(cycles.slice(1, 4).map(c => getTransactionsForCycle(c.key)))
      .then(setRecent)
      .catch(() => setRecent([]))
  }, [recentKeys])

  const accountIds = accounts.map(a => a.id).join(',')
  useEffect(() => {
    if (!accounts.length) return
    Promise.all(accounts.map(async a => {
      const [{ data: tx }, { data: snap }] = await Promise.all([
        supabase.from('cycle_transactions')
          .select('transaction_date, amount, direction, balance')
          .eq('user_id', user.id).eq('account_id', a.id).not('balance', 'is', null)
          .order('transaction_date', { ascending: false }).limit(40),
        supabase.from('cycle_account_balances')
          .select('as_at, balance').eq('account_id', a.id)
          .order('as_at', { ascending: false }).limit(1),
      ])
      const fromTx = latestBalance(tx || [])
      const typed = snap?.[0] ? { balance: parseFloat(snap[0].balance), date: snap[0].as_at } : null
      const best = typed && (!fromTx || typed.date > fromTx.date) ? typed : fromTx
      return [a.id, best]
    })).then(rows => setBalances(Object.fromEntries(rows.filter(([, b]) => b))))
  }, [accountIds])

  const groups = useMemo(() => (recent ? coverByBank({
    accounts, categories, recent, current: transactions, balances,
  }) : []), [recent, accounts, categories, transactions, balances])

  if (!groups.length) return null
  const cycleStart = cycles[0]?.key

  return (
    <div className="px-4" style={{ marginTop: 14 }}>
      <div className="flex items-baseline justify-between" style={{ margin: '10px 0 10px' }}>
        <h2 style={{ ...display, fontSize: 19, fontWeight: 800 }}>cover your accounts 💳</h2>
        <span style={small}>this cycle</span>
      </div>
      <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))' }}>
        {groups.map(g => {
          const cfg = getAccountConfig(g.bank)
          const covered = g.topUp < 1
          const stale = g.asOf && cycleStart && g.asOf < cycleStart
          const expanded = open === g.bank
          return (
            <div key={g.bank} className="clay" style={{ padding: 16 }}>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2" style={{ fontWeight: 700, fontSize: 15 }}>
                  <span style={{ width: 10, height: 10, borderRadius: 5, background: cfg.color, boxShadow: `0 0 10px ${cfg.color}` }} />
                  {g.bank}
                </span>
                <span style={{
                  fontSize: 12, fontWeight: 700, padding: '4px 10px', borderRadius: 999,
                  background: covered ? 'rgb(var(--c-positive) / 0.14)' : 'rgb(var(--c-negative) / 0.14)',
                  color: covered ? 'rgb(var(--c-positive))' : 'rgb(var(--c-negative))',
                }}>{covered ? 'covered ✅' : 'top up needed'}</span>
              </div>

              <p style={{ ...display, fontSize: 30, fontWeight: 800, letterSpacing: '-0.03em', marginTop: 10, lineHeight: 1,
                color: covered ? 'rgb(var(--c-text))' : 'rgb(var(--c-negative))' }}>
                {covered ? R(g.available - g.remaining) : R(g.topUp)}
              </p>
              <p style={{ ...small, marginTop: 4 }}>
                {covered ? 'left over after everything goes off' : `to move into ${g.bank} before the debit orders`}
              </p>

              <div className="grid grid-cols-2 gap-2" style={{ marginTop: 12 }}>
                <Stat label="still to go off" value={R(g.remaining)} />
                <Stat label={`in ${g.bank} now`} value={g.asOf ? R(g.available) : '—'}
                  sub={g.asOf ? `as at ${format(parseISO(g.asOf), 'd MMM')}` : 'no balance yet'} warn={stale} />
              </div>

              {g.accounts.filter(a => a.kind === 'credit_card').map(a => {
                const st = accountStyle(a)
                return (
                  <div key={a.id} className="flex items-center justify-between" style={{ marginTop: 10, padding: '8px 12px', borderRadius: 14, background: st.bg }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: st.color }}>{st.label} owes</span>
                    <span style={{ ...display, fontWeight: 700, color: st.color }}>{balances[a.id] ? R(balances[a.id].balance) : '—'}</span>
                  </div>
                )
              })}

              {stale && (
                <p style={{ fontSize: 11, color: 'rgb(var(--c-warning))', marginTop: 8 }}>
                  Balance is from before this cycle — import a fresh statement for today's figure.
                </p>
              )}

              <button onClick={() => setOpen(expanded ? null : g.bank)} aria-expanded={expanded}
                className="flex items-center justify-between w-full"
                style={{ marginTop: 10, background: 'none', border: 0, padding: '4px 0', cursor: 'pointer', ...small }}>
                <span>{g.items.length} payment{g.items.length !== 1 ? 's' : ''} · {R(g.paid)} of {R(g.expected)} paid</span>
                <ChevronDown size={14} style={{ transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
              </button>
              {expanded && (
                <div style={{ marginTop: 4 }}>
                  {g.items.map(i => (
                    <div key={i.id} className="flex items-center gap-2" style={{ padding: '7px 0', borderTop: '0.5px solid rgb(var(--c-border))' }}>
                      <span style={{ width: 22, textAlign: 'center' }}>{i.icon || '🧾'}</span>
                      <span className="flex-1 truncate" style={{ fontSize: 13 }}>{i.name}</span>
                      <span style={{ ...small, fontSize: 11 }}>{i.remaining < 1 ? 'paid ✓' : i.dueDay ? `~${i.dueDay}${suffix(i.dueDay)}` : ''}</span>
                      <span style={{ ...display, fontWeight: 700, fontSize: 13, minWidth: 70, textAlign: 'right',
                        color: i.remaining < 1 ? 'rgb(var(--c-text-3))' : 'rgb(var(--c-text))' }}>{R(i.remaining < 1 ? i.expected : i.remaining)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function Stat({ label, value, sub, warn }) {
  return (
    <div style={{ background: 'rgb(var(--c-surface-2))', borderRadius: 14, padding: '9px 11px' }}>
      <p style={{ fontSize: 11, color: 'rgb(var(--c-text-3))' }}>{label}</p>
      <p style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 800 }}>{value}</p>
      {sub && <p style={{ fontSize: 10, color: warn ? 'rgb(var(--c-warning))' : 'rgb(var(--c-text-4))' }}>{sub}</p>}
    </div>
  )
}

const suffix = d => (d % 10 === 1 && d !== 11 ? 'st' : d % 10 === 2 && d !== 12 ? 'nd' : d % 10 === 3 && d !== 13 ? 'rd' : 'th')
