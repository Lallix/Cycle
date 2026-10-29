import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Plus, Check, ChevronRight } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { useBudget } from '../context/BudgetContext'
import { useToast } from '../components/ui/Toast'
import BottomSheet from '../components/ui/BottomSheet'
import { accountStyle } from '../lib/format'
import CategorySortToggle, { useCategorySort, sortCategories } from '../components/ui/CategorySort'

// The budget sheet: the plan for this cycle, laid out like the spreadsheet.
// Money in, fixed, predicted and unplanned, each row with Budget (tap to
// change), what has actually happened this cycle and what is left. The
// numbers come from lib/sheet.js, the same place the dashboard reads them.

const display = { fontFamily: 'var(--font-display)' }
const small = { fontSize: 11, color: 'rgb(var(--c-text-3))' }
// Whole rands with a no-break space, so amounts never wrap
const R = v => `${v < -0.5 ? '−' : ''}R${Math.round(Math.abs(v)).toLocaleString('en-ZA').replace(/[,\s]/g, ' ')}`
const suffix = d => (d % 10 === 1 && d !== 11 ? 'st' : d % 10 === 2 && d !== 12 ? 'nd' : d % 10 === 3 && d !== 13 ? 'rd' : 'th')

const SECTIONS = [
  { key: 'income', title: 'Money in', tone: 'positive', actual: 'In', left: 'To come', hint: 'What you expect to come in each cycle' },
  { key: 'fixed', title: 'Fixed', tone: 'fixed', actual: 'Paid', left: 'Still due', hint: 'Debit orders and bills: the same every cycle' },
  { key: 'predicted', title: 'Predicted', tone: 'predicted', actual: 'Spent', left: 'Left', hint: 'Everyday spending with a limit' },
  { key: 'unplanned', title: 'Unplanned', tone: 'unplanned', actual: 'Spent', left: 'Left', hint: 'The odd things: keep a buffer here' },
]
const COLS = 'minmax(0, 1fr) 64px 50px 60px'

export default function BudgetPage() {
  const { sheet, cycle, totals } = useBudget()
  const navigate = useNavigate()
  const { hash } = useLocation()
  const [editing, setEditing] = useState(null)       // a row in the edit sheet
  const [adding, setAdding] = useState(null)         // section key for a new row
  const [sort, setSort] = useCategorySort()

  // Opened from a dashboard block: jump to that section
  useEffect(() => {
    if (!hash) return
    const el = document.getElementById(hash.slice(1))
    if (el) setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80)
  }, [hash])

  const over = sheet.toAllocate < -0.5

  return (
    <div style={{ paddingBottom: 120 }}>
      <div className="flex items-center justify-between gap-3 px-4 pb-2" style={{ paddingTop: 'max(env(safe-area-inset-top), 1rem)' }}>
        <div>
          <h1 style={{ ...display, fontSize: 22, fontWeight: 800 }}>Budget</h1>
          <p style={small}>{cycle?.shortLabel} · tap a budget to change it</p>
        </div>
        <CategorySortToggle sort={sort} onChange={setSort} />
      </div>

      {/* The plan in one line: money in − everything planned */}
      <div className="px-4" style={{ marginTop: 8 }}>
        <div className="clay" style={{ padding: 16 }}>
          <div className="grid grid-cols-3 gap-2">
            <Figure label="Money in" value={R(sheet.income)} tone="positive" />
            <Figure label="Planned out" value={R(sheet.planned)} />
            <Figure label={over ? 'Over-planned' : 'To allocate'} value={R(Math.abs(sheet.toAllocate))} tone={over ? 'negative' : 'accent'} />
          </div>
          <p style={{ ...small, marginTop: 10 }}>
            {over
              ? `Your budgets add up to ${R(-sheet.toAllocate)} more than you expect to come in.`
              : sheet.toAllocate > 0.5
                ? `${R(sheet.toAllocate)} of your income has no job yet. Give it one, or leave it as savings.`
                : 'Every rand has a job. 👌'}
          </p>
          <div className="flex justify-between" style={{ ...small, marginTop: 8, paddingTop: 8, borderTop: '0.5px solid rgb(var(--c-border))' }}>
            <span>Left this cycle (as on Home)</span>
            <b style={{ ...display, fontSize: 13, color: totals.remaining < 0 ? 'rgb(var(--c-negative))' : 'rgb(var(--c-text))' }}>{R(totals.remaining)}</b>
          </div>
        </div>
      </div>

      {SECTIONS.map(sec => (
        <Section key={sec.key} sec={sec} data={sheet.sections[sec.key]} sort={sort}
          onEdit={setEditing} onAdd={() => setAdding(sec.key)} />
      ))}

      <div className="px-4" style={{ marginTop: 20 }}>
        <button onClick={() => navigate('/review')} className="clay w-full flex items-center justify-between tappable"
          style={{ padding: '12px 16px', textAlign: 'left' }}>
          <span style={{ fontSize: 13 }}>Review last cycle and get suggested budgets</span>
          <ChevronRight size={16} style={{ color: 'rgb(var(--c-text-3))' }} />
        </button>
      </div>

      <RowSheet row={editing} onClose={() => setEditing(null)} />
      <AddSheet section={adding} onClose={() => setAdding(null)} />
    </div>
  )
}

function Figure({ label, value, tone }) {
  return (
    <div>
      <p style={{ fontSize: 11, color: 'rgb(var(--c-text-3))' }}>{label}</p>
      <p style={{ ...display, fontSize: 18, fontWeight: 800, whiteSpace: 'nowrap',
        color: tone ? `rgb(var(--c-${tone}))` : 'rgb(var(--c-text))' }}>{value}</p>
    </div>
  )
}

function Section({ sec, data, sort, onEdit, onAdd }) {
  const tone = `rgb(var(--c-${sec.tone}))`
  const leftTotal = sec.key === 'fixed' ? data.stillDue : data.left
  return (
    <section id={sec.key} className="px-4" style={{ marginTop: 22, scrollMarginTop: 12 }}>
      <div className="flex items-center justify-between" style={{ marginBottom: 8 }}>
        <div>
          <h2 className="flex items-center gap-2" style={{ ...display, fontSize: 17, fontWeight: 800 }}>
            <span style={{ width: 10, height: 10, borderRadius: 5, background: tone }} />{sec.title}
          </h2>
          <p style={small}>{sec.key === 'fixed' && data.rows.length
            ? `${data.rows.filter(r => r.paid).length} of ${data.rows.length} paid · tap ○ to tick one off`
            : sec.hint}</p>
        </div>
        <button onClick={onAdd} className="flex items-center gap-1 tappable"
          style={{ fontSize: 12, fontWeight: 600, color: 'rgb(var(--c-accent))', background: 'none', border: 0 }}>
          <Plus size={14} /> Add
        </button>
      </div>

      <div className="clay" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="grid items-center" style={{ gridTemplateColumns: COLS, gap: 6, padding: '8px 12px', ...small, fontWeight: 600, borderBottom: '0.5px solid rgb(var(--c-border))' }}>
          <span>Category</span><span style={{ textAlign: 'right' }}>Budget</span>
          <span style={{ textAlign: 'right' }}>{sec.actual}</span><span style={{ textAlign: 'right' }}>{sec.left}</span>
        </div>

        {data.rows.length === 0 && <p style={{ ...small, padding: '14px 12px' }}>Nothing here yet — tap Add.</p>}
        {sortCategories(data.rows, sort, r => r.budget).map(row => <Row key={row.id} row={row} sec={sec} onEdit={onEdit} />)}

        <div className="grid items-center" style={{ gridTemplateColumns: COLS, gap: 6, padding: '10px 12px', background: `rgb(var(--c-${sec.tone}) / 0.1)`, fontWeight: 700 }}>
          <span style={{ fontSize: 13 }}>Total</span>
          <span style={{ ...display, fontSize: 12, textAlign: 'right' }}>{R(data.budget)}</span>
          <span style={{ ...display, fontSize: 12, textAlign: 'right' }}>{R(sec.key === 'fixed' ? data.paidAmount : data.actual)}</span>
          <span style={{ ...display, fontSize: 12, textAlign: 'right', color: leftTotal < -0.5 ? 'rgb(var(--c-negative))' : 'inherit' }}>{R(leftTotal)}</span>
        </div>
      </div>
    </section>
  )
}

function Row({ row, sec, onEdit }) {
  const { accounts } = useBudget()
  const left = sec.key === 'fixed' ? row.stillDue : row.left
  const overspent = sec.key !== 'income' && sec.key !== 'fixed' && row.left < -0.5
  const payAcc = row.payAccountId && accounts.find(a => a.id === row.payAccountId)
  const meta = sec.key === 'fixed'
    ? [row.dueDay && `${row.dueDayGuessed ? '~' : ''}${row.dueDay}${suffix(row.dueDay)}`, payAcc && accountStyle(payAcc).label, row.paid && 'paid ✓'].filter(Boolean).join(' · ')
    : null

  return (
    <div style={{ borderBottom: '0.5px solid rgb(var(--c-border))' }}>
    <div className="grid items-center" style={{ gridTemplateColumns: COLS, gap: 6, padding: '9px 12px' }}>
      <div className="flex items-center gap-2" style={{ minWidth: 0 }}>
      {sec.key === 'fixed' && <PaidTick row={row} />}
      <button onClick={() => !row.uncategorised && onEdit(row)} className="flex items-center gap-2 tappable"
        style={{ minWidth: 0, background: 'none', border: 0, padding: 0, textAlign: 'left', color: 'inherit', cursor: row.uncategorised ? 'default' : 'pointer' }}>
        {sec.key !== 'fixed' && <span style={{ fontSize: 16, flexShrink: 0 }}>{row.icon || '💳'}</span>}
        <span style={{ minWidth: 0 }}>
          <span className="block" style={{ fontSize: 13, fontWeight: 500, lineHeight: 1.25, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', overflowWrap: 'anywhere' }}>{row.name}</span>
          {meta && <span className="block truncate" style={{ ...small, fontSize: 10, color: row.paid ? 'rgb(var(--c-positive))' : small.color }}>{meta}</span>}
        </span>
      </button>
      </div>
      {row.uncategorised
        ? <span style={{ ...small, textAlign: 'right' }}>—</span>
        : <BudgetCell row={row} />}
      <span style={{ ...display, fontSize: 12, textAlign: 'right', color: 'rgb(var(--c-text-2))' }}>{R(sec.key === 'fixed' ? row.paidAmount : row.actual)}</span>
      <span style={{ ...display, fontSize: 12, textAlign: 'right', fontWeight: 700,
        color: overspent ? 'rgb(var(--c-negative))' : sec.key === 'fixed' && row.paid ? 'rgb(var(--c-positive))' : 'rgb(var(--c-text))' }}>
        {sec.key === 'fixed' && row.paid ? '✓' : R(left)}
      </span>
    </div>
    {row.suggest != null && <SuggestHint row={row} />}
    </div>
  )
}

// A fixed bill went off at a different amount: offer it as the new budget
function SuggestHint({ row }) {
  const { updateCategory } = useBudget()
  const toast = useToast()
  const [busy, setBusy] = useState(false)
  async function accept() {
    setBusy(true)
    try {
      await updateCategory(row.id, { budget_amount: row.suggest })
      toast(`${row.name}: budget now ${R(row.suggest)} from this cycle`, 'success')
    } catch (e) { toast(e.message, 'error') } finally { setBusy(false) }
  }
  return (
    <button onClick={accept} disabled={busy} className="tappable"
      style={{ display: 'block', width: 'calc(100% - 24px)', margin: '0 12px 9px', padding: '6px 10px', borderRadius: 10, textAlign: 'left',
        border: '0.5px dashed rgb(var(--c-warning) / 0.6)', background: 'rgb(var(--c-warning) / 0.08)', color: 'rgb(var(--c-warning))', fontSize: 12, cursor: 'pointer' }}>
      Went off at <b>{R(row.suggest)}</b>, budget is {R(row.budget)} — <u>use {R(row.suggest)} as the budget?</u>
    </button>
  )
}

// The payments checklist: tick a fixed bill off once it is paid. A bill whose
// debit is on an imported statement is ticked already and stays that way.
function PaidTick({ row }) {
  const { toggleFixedPaid } = useBudget()
  const toast = useToast()
  const [busy, setBusy] = useState(false)
  async function tap() {
    if (row.autoPaid) { toast(`${row.name} is on your statement — already paid`, 'info'); return }
    setBusy(true)
    try {
      await toggleFixedPaid(row.id)
      toast(row.ticked ? `${row.name} marked as not paid` : `${row.name} paid ✓`, 'success')
    } catch (e) { toast(e.message, 'error') } finally { setBusy(false) }
  }
  return (
    <button onClick={tap} disabled={busy} role="checkbox" aria-checked={row.paid}
      aria-label={row.paid ? `${row.name} is paid` : `Mark ${row.name} as paid`} className="tappable"
      style={{ width: 24, height: 24, flexShrink: 0, borderRadius: 12, cursor: 'pointer', display: 'grid', placeItems: 'center', padding: 0,
        border: row.paid ? 0 : '1.5px solid rgb(var(--c-text-3))',
        background: row.paid ? 'rgb(var(--c-positive))' : 'transparent', opacity: busy ? 0.5 : 1 }}>
      {row.paid && <Check size={14} strokeWidth={3} color="rgb(var(--c-bg))" />}
    </button>
  )
}

// Tap the amount to type a new one; Enter or tapping away saves it from
// this cycle onward (earlier cycles keep their budget).
function BudgetCell({ row }) {
  const { updateCategory } = useBudget()
  const toast = useToast()
  const [value, setValue] = useState(null)
  const inputRef = useRef(null)
  const editing = value !== null

  useEffect(() => { if (editing) inputRef.current?.select() }, [editing])

  async function save() {
    const next = value === '' ? null : parseFloat(value)
    setValue(null)
    if (next !== null && (Number.isNaN(next) || next < 0)) { toast('Enter an amount', 'error'); return }
    if ((next ?? 0) === row.budget) return
    try {
      await updateCategory(row.id, { budget_amount: next })
      toast(`${row.name}: ${R(next || 0)} from this cycle`, 'success')
    } catch (e) { toast(e.message, 'error') }
  }

  if (editing) {
    return (
      <input ref={inputRef} type="number" inputMode="decimal" value={value} aria-label={`Budget for ${row.name}`}
        onChange={e => setValue(e.target.value)} onBlur={save}
        onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur(); if (e.key === 'Escape') setValue(null) }}
        style={{ width: '100%', minWidth: 0, textAlign: 'right', ...display, fontSize: 12, padding: '5px 4px', borderRadius: 8,
          border: '1px solid rgb(var(--c-accent))', background: 'rgb(var(--c-surface-2))', color: 'rgb(var(--c-text))', outline: 'none' }} />
    )
  }
  return (
    <button onClick={() => setValue(row.budget ? String(row.budget) : '')} aria-label={`Change budget for ${row.name}`}
      className="tappable"
      style={{ ...display, fontSize: 12, fontWeight: 700, textAlign: 'right', padding: '5px 4px', borderRadius: 8, border: 0,
        background: 'rgb(var(--c-surface-2))', color: row.budget ? 'rgb(var(--c-text))' : 'rgb(var(--c-text-4))', cursor: 'pointer' }}>
      {row.budget ? R(row.budget) : 'Set'}
    </button>
  )
}

const field = { width: '100%', padding: '11px 14px', borderRadius: 12, border: '0.5px solid rgb(var(--c-border-strong))',
  background: 'rgb(var(--c-surface-2))', color: 'rgb(var(--c-text))', fontSize: 14, minWidth: 0 }
const labelStyle = { fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'rgb(var(--c-text-3))', display: 'block', marginBottom: 6 }

function FixedFields({ form, setForm }) {
  const { accounts } = useBudget()
  return (
    <>
      <div>
        <label style={labelStyle}>Goes off on</label>
        <select value={form.due_day} onChange={e => setForm(f => ({ ...f, due_day: e.target.value }))} style={field}>
          <option value="">Not set</option>
          {Array.from({ length: 31 }, (_, i) => i + 1).map(d => <option key={d} value={d}>{d}{suffix(d)} of the month</option>)}
        </select>
      </div>
      <div>
        <label style={labelStyle}>Paid from</label>
        <div className="flex flex-wrap gap-2">
          {[{ id: '', name: 'Not set' }, ...accounts].map(a => {
            const sel = (form.pay_account_id || '') === a.id
            const st = a.id ? accountStyle(a) : null
            return (
              <button key={a.id || 'none'} type="button" onClick={() => setForm(f => ({ ...f, pay_account_id: a.id }))}
                style={{ padding: '8px 12px', borderRadius: 10, fontSize: 13, cursor: 'pointer',
                  border: `1px solid ${sel ? (st?.color || 'rgb(var(--c-accent))') : 'rgb(var(--c-border-strong))'}`,
                  background: sel ? (st?.bg || 'rgb(var(--c-accent) / 0.1)') : 'transparent',
                  color: sel && st ? st.color : 'rgb(var(--c-text))' }}>
                {a.id ? st.label : a.name}
              </button>
            )
          })}
        </div>
      </div>
    </>
  )
}

function SaveButton({ busy, children, onClick }) {
  return (
    <button onClick={onClick} disabled={busy} className="tappable"
      style={{ width: '100%', padding: '14px 0', borderRadius: 14, border: 0, ...display, fontSize: 15, fontWeight: 700,
        background: 'rgb(var(--c-accent))', color: 'rgb(var(--c-on-accent))', opacity: busy ? 0.6 : 1, cursor: 'pointer' }}>
      {busy ? 'Saving…' : children}
    </button>
  )
}

// One row in detail: name, budget, and for fixed bills when and from where it
// goes off and a manual "paid" tick. Lists this cycle's lines for it.
function RowSheet({ row, onClose }) {
  const { updateCategory, toggleFixedPaid, transactions } = useBudget()
  const toast = useToast()
  const [form, setForm] = useState(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (row) setForm({
      name: row.name, budget: row.budget ? String(row.budget) : '',
      due_day: row.category?.due_day ? String(row.category.due_day) : '',
      pay_account_id: row.category?.pay_account_id || '',
    })
  }, [row])

  if (!row || !form) return <BottomSheet open={false} onClose={onClose} />
  const lines = transactions.filter(t => t.category_id === row.id).slice(0, 8)

  async function save() {
    if (!form.name.trim()) { toast('Give it a name', 'error'); return }
    setBusy(true)
    try {
      const payload = { name: form.name.trim(), budget_amount: form.budget === '' ? null : parseFloat(form.budget) }
      if (row.type === 'fixed') {
        payload.due_day = form.due_day ? parseInt(form.due_day, 10) : null
        payload.pay_account_id = form.pay_account_id || null
      }
      await updateCategory(row.id, payload)
      toast('Saved ✓', 'success')
      onClose()
    } catch (e) { toast(e.message, 'error') } finally { setBusy(false) }
  }

  async function togglePaid() {
    try { await toggleFixedPaid(row.id); toast(row.ticked ? 'Marked as not paid' : 'Marked as paid ✓', 'success'); onClose() }
    catch (e) { toast(e.message, 'error') }
  }

  return (
    <BottomSheet open onClose={onClose} title={`${row.icon || ''} ${row.name}`}>
      <div className="px-5 pb-8" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div>
          <label style={labelStyle}>Name</label>
          <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} style={field} />
        </div>
        <div>
          <label style={labelStyle}>Budget per cycle</label>
          <input type="number" inputMode="decimal" value={form.budget} placeholder="0"
            onChange={e => setForm(f => ({ ...f, budget: e.target.value }))} style={field} />
          <p style={{ ...small, marginTop: 6 }}>A change applies from this cycle on. Earlier cycles keep their budget.</p>
        </div>
        {row.type === 'fixed' && <FixedFields form={form} setForm={setForm} />}
        <SaveButton busy={busy} onClick={save}>Save</SaveButton>

        {row.type === 'fixed' && !row.autoPaid && (
          <button onClick={togglePaid} className="tappable flex items-center justify-center gap-2"
            style={{ width: '100%', padding: '12px 0', borderRadius: 14, fontSize: 14, cursor: 'pointer',
              border: '1px solid rgb(var(--c-positive) / 0.5)', background: row.ticked ? 'rgb(var(--c-positive) / 0.12)' : 'transparent', color: 'rgb(var(--c-positive))' }}>
            <Check size={16} /> {row.ticked ? 'Paid this cycle — tap to undo' : 'Mark as paid this cycle'}
          </button>
        )}
        {row.type === 'fixed' && row.autoPaid && (
          <p style={{ ...small, color: 'rgb(var(--c-positive))' }}>Paid this cycle — it’s on your statement.</p>
        )}

        <div>
          <label style={labelStyle}>This cycle</label>
          {lines.length === 0
            ? <p style={small}>Nothing yet.</p>
            : lines.map(t => (
              <div key={t.id} className="flex items-center justify-between gap-3" style={{ padding: '7px 0', borderTop: '0.5px solid rgb(var(--c-border))' }}>
                <span className="truncate" style={{ fontSize: 13 }}>{t.description || t.notes || row.name}</span>
                <span style={{ ...small, flexShrink: 0 }}>{t.transaction_date ? format(parseISO(t.transaction_date), 'd MMM') : ''}</span>
                <span style={{ ...display, fontSize: 13, flexShrink: 0, color: t.direction === 'in' ? 'rgb(var(--c-positive))' : 'inherit' }}>
                  {t.direction === 'in' ? '+' : '−'}{R(parseFloat(t.amount))}
                </span>
              </div>
            ))}
        </div>
      </div>
    </BottomSheet>
  )
}

const BLANK = { name: '', icon: '', budget: '', due_day: '', pay_account_id: '' }
const DEFAULT_ICON = { income: '💰', fixed: '🧾', predicted: '🛒', unplanned: '🎲' }

function AddSheet({ section, onClose }) {
  const { addCategory } = useBudget()
  const toast = useToast()
  const [form, setForm] = useState(BLANK)
  const [busy, setBusy] = useState(false)
  useEffect(() => { if (section) setForm(BLANK) }, [section])
  const title = SECTIONS.find(s => s.key === section)?.title

  async function save() {
    if (!form.name.trim()) { toast('Give it a name', 'error'); return }
    setBusy(true)
    try {
      await addCategory({
        name: form.name.trim(), type: section, icon: form.icon.trim() || DEFAULT_ICON[section],
        budget_amount: form.budget === '' ? null : parseFloat(form.budget),
        due_day: section === 'fixed' && form.due_day ? parseInt(form.due_day, 10) : null,
        pay_account_id: section === 'fixed' ? form.pay_account_id || null : null,
      })
      toast(`${form.name.trim()} added ✓`, 'success')
      onClose()
    } catch (e) { toast(e.message, 'error') } finally { setBusy(false) }
  }

  return (
    <BottomSheet open={!!section} onClose={onClose} title={`Add to ${title || ''}`}>
      <div className="px-5 pb-8" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div className="flex gap-2">
          <div style={{ width: 70 }}>
            <label style={labelStyle}>Icon</label>
            <input value={form.icon} placeholder={DEFAULT_ICON[section]} maxLength={4}
              onChange={e => setForm(f => ({ ...f, icon: e.target.value }))} style={{ ...field, textAlign: 'center' }} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <label style={labelStyle}>Name</label>
            <input value={form.name} placeholder={section === 'income' ? 'e.g. Side job' : 'e.g. Gym'}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))} style={field} />
          </div>
        </div>
        <div>
          <label style={labelStyle}>{section === 'income' ? 'Expected per cycle' : 'Budget per cycle'}</label>
          <input type="number" inputMode="decimal" value={form.budget} placeholder="0"
            onChange={e => setForm(f => ({ ...f, budget: e.target.value }))} style={field} />
        </div>
        {section === 'fixed' && <FixedFields form={form} setForm={setForm} />}
        <SaveButton busy={busy} onClick={save}>Add</SaveButton>
      </div>
    </BottomSheet>
  )
}
