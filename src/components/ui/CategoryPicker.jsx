import { useMemo, useState } from 'react'
import { ChevronDown, Check, Plus, Search } from 'lucide-react'
import BottomSheet from './BottomSheet'
import { TYPE_OPTIONS } from '../../lib/spend'
import { normaliseType } from '../../lib/totals'

// A category (or filter) picker that opens Cycle's own sheet instead of the
// phone's built-in dropdown, whose large text Cycle can't size. Options come in
// groups, with a search box, and optionally "+ New category" to create one on
// the spot (it is then picked straight away).

const font = { fontFamily: 'Inter, sans-serif' }
const TYPE_GROUPS = [
  ['Income', 'income'], ['Fixed', 'fixed'], ['Predicted', 'predicted'], ['Unplanned', 'unplanned'],
  ['Once-off', 'once_off'], ['Debt', 'debt'], ['Transfer', 'transfer'],
]
const DEFAULT_ICON = { income: '💰', fixed: '🧾', predicted: '🛒', unplanned: '📦', once_off: '🎯', debt: '🤝', transfer: '🔁' }

// Categories as picker groups: by type, A–Z within each
export function categoryGroups(categories, types = TYPE_GROUPS.map(([, t]) => t)) {
  return TYPE_GROUPS
    .filter(([, type]) => types.includes(type))
    .map(([label, type]) => ({
      label,
      options: categories.filter(c => normaliseType(c.type) === type)
        .sort((a, b) => a.name.localeCompare(b.name, 'en', { sensitivity: 'base' }))
        .map(c => ({ value: c.id, label: c.name, icon: c.icon })),
    }))
    .filter(g => g.options.length)
}

/**
 * groups:      [{ label, options: [{ value, label, icon? }] }]
 * value:       the picked option's value ('' or null = nothing picked)
 * placeholder: shown on the button when nothing is picked
 * none:        label of an option that clears the choice (optional)
 * onCreate:    async ({ name, type, icon }) => new option value (optional)
 * title, tone: sheet title; 'warning' outlines the button in amber
 */
export default function CategoryPicker({ groups, value, onChange, placeholder = 'Choose a category…', none, onCreate, title = 'Category', tone, size = 'md', style }) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [creating, setCreating] = useState(null)   // { name, type } while adding a category
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const all = groups.flatMap(g => g.options)
  const picked = all.find(o => o.value === value)
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return groups
    return groups.map(g => ({ ...g, options: g.options.filter(o => o.label.toLowerCase().includes(q)) })).filter(g => g.options.length)
  }, [groups, query])

  function close() { setOpen(false); setQuery(''); setCreating(null); setError('') }
  function pick(v) { onChange(v); close() }

  async function create(e) {
    e.preventDefault()
    const name = creating.name.trim()
    if (!name) { setError('Give the category a name'); return }
    if (all.some(o => o.label.toLowerCase() === name.toLowerCase())) { setError('You already have a category with that name'); return }
    setSaving(true)
    try {
      const id = await onCreate({ name, type: creating.type, icon: DEFAULT_ICON[creating.type] })
      pick(id)
    } catch (err) {
      setError(/duplicate|unique/i.test(err.message) ? 'That name is taken (it may be a removed category: restore it in Settings)' : err.message)
    } finally {
      setSaving(false)
    }
  }

  const sm = size === 'sm'
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="flex items-center gap-2 text-left"
        style={{
          ...font, width: '100%', minWidth: 0, padding: sm ? '8px 10px' : '11px 14px', borderRadius: sm ? 10 : 12,
          fontSize: sm ? 12 : 14, background: 'rgb(var(--c-surface-2))',
          border: `0.5px solid ${tone === 'warning' ? 'rgb(var(--c-warning) / 0.5)' : 'rgb(var(--c-border-strong))'}`,
          color: picked ? 'rgb(var(--c-text))' : tone === 'warning' ? 'rgb(var(--c-warning))' : 'rgb(var(--c-text-3))',
          ...style,
        }}>
        <span className="flex-1 min-w-0" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {picked ? `${picked.icon ? `${picked.icon} ` : ''}${picked.label}` : placeholder}
        </span>
        <ChevronDown size={sm ? 13 : 15} style={{ flexShrink: 0, opacity: 0.6 }} />
      </button>

      <BottomSheet open={open} onClose={close} title={creating ? 'New category' : title}>
        {creating ? (
          <form onSubmit={create} className="px-5 pb-8 space-y-4">
            <input autoFocus value={creating.name} onChange={e => { setCreating(c => ({ ...c, name: e.target.value })); setError('') }}
              placeholder="e.g. Medical aid" aria-label="Category name"
              style={{ ...font, width: '100%', padding: '11px 14px', fontSize: 14, borderRadius: 12, color: 'rgb(var(--c-text))', background: 'rgb(var(--c-surface-2))', border: '0.5px solid rgb(var(--c-border-strong))' }} />
            <div>
              <p className="text-xs mb-2" style={{ ...font, color: 'rgb(var(--c-text-3))' }}>Type</p>
              <div className="flex flex-wrap gap-1.5">
                {TYPE_OPTIONS.map(t => {
                  const on = creating.type === t.value
                  return (
                    <button key={t.value} type="button" onClick={() => setCreating(c => ({ ...c, type: t.value }))}
                      style={{
                        ...font, padding: '6px 12px', borderRadius: 999, fontSize: 12, fontWeight: on ? 600 : 500,
                        background: on ? 'rgb(var(--c-accent))' : 'rgb(var(--c-surface-2))',
                        color: on ? 'rgb(var(--c-bg))' : 'rgb(var(--c-text-2))',
                        border: '0.5px solid rgb(var(--c-border))',
                      }}>
                      {t.label}
                    </button>
                  )
                })}
              </div>
              <p className="text-xs mt-2" style={{ ...font, color: 'rgb(var(--c-text-4))' }}>Set its budget, icon and due day later on the Budget tab or in Settings.</p>
            </div>
            {error && <p className="text-xs" style={{ ...font, color: 'rgb(var(--c-negative))' }}>{error}</p>}
            <div className="flex gap-2">
              <button type="button" onClick={() => { setCreating(null); setError('') }} className="flex-1 py-3 rounded-xl text-sm"
                style={{ ...font, background: 'rgb(var(--c-surface-2))', color: 'rgb(var(--c-text-2))' }}>Back</button>
              <button type="submit" disabled={saving} className="flex-1 py-3 rounded-xl text-sm font-semibold"
                style={{ ...font, background: 'rgb(var(--c-accent))', color: 'rgb(var(--c-bg))', opacity: saving ? 0.6 : 1 }}>
                {saving ? 'Adding…' : 'Add and use'}
              </button>
            </div>
          </form>
        ) : (
          <div className="pb-6">
            {all.length > 10 && (
              <div className="px-5 pb-2">
                <div className="flex items-center gap-2" style={{ padding: '9px 12px', borderRadius: 12, background: 'rgb(var(--c-surface-2))' }}>
                  <Search size={14} color="rgb(var(--c-text-3))" />
                  <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search" aria-label="Search"
                    className="flex-1 min-w-0" style={{ ...font, fontSize: 14, background: 'transparent', border: 0, outline: 'none', color: 'rgb(var(--c-text))' }} />
                </div>
              </div>
            )}
            {onCreate && (
              <Row onClick={() => setCreating({ name: query.trim(), type: 'predicted' })} accent>
                <Plus size={15} /> New category{query.trim() ? ` "${query.trim()}"` : ''}
              </Row>
            )}
            {none && !query && <Row onClick={() => pick(null)} on={!value}>{none}</Row>}
            {shown.map(g => (
              <div key={g.label}>
                <p className="px-5 pt-3 pb-1" style={{ ...font, fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgb(var(--c-text-3))' }}>{g.label}</p>
                {g.options.map(o => (
                  <Row key={o.value} onClick={() => pick(o.value)} on={o.value === value}>
                    {o.icon && <span style={{ width: 20, textAlign: 'center', flexShrink: 0 }}>{o.icon}</span>}
                    <span className="flex-1 min-w-0" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{o.label}</span>
                  </Row>
                ))}
              </div>
            ))}
            {!shown.length && <p className="px-5 py-4 text-sm" style={{ ...font, color: 'rgb(var(--c-text-3))' }}>Nothing matches "{query}"</p>}
          </div>
        )}
      </BottomSheet>
    </>
  )
}

function Row({ children, onClick, on, accent }) {
  return (
    <button type="button" onClick={onClick} className="w-full flex items-center gap-2.5 px-5 text-left tappable"
      style={{
        ...font, minHeight: 42, fontSize: 14,
        color: accent ? 'rgb(var(--c-accent))' : 'rgb(var(--c-text))', fontWeight: accent ? 600 : 400,
        background: on ? 'rgb(var(--c-accent) / 0.1)' : 'transparent',
      }}>
      {children}
      {on && <Check size={15} color="rgb(var(--c-accent))" style={{ flexShrink: 0 }} />}
    </button>
  )
}
