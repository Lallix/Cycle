import { Fragment, useEffect, useRef, useState } from 'react'
import { Sparkles, Send, RotateCcw } from 'lucide-react'
import BottomSheet from '../ui/BottomSheet'
import { formatMoney } from '../../lib/format'
import { callClaude, claudeChanged, useClaude } from '../../lib/claude'

// "Ask Claude": a chat about your own budget. Shown only once you've added
// your Claude key in Settings. The conversation lasts until you start a new
// one or close the app; nothing is saved.

const font = { fontFamily: 'Inter, sans-serif' }

const STARTERS = [
  "What's left this cycle, and what's still due?",
  'Where am I over budget this cycle?',
  'What did I spend on groceries over the last 3 cycles?',
  'Can I afford R2,000 before payday?',
]

export default function AskClaude() {
  const claude = useClaude()
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState([])   // { role, content, cost? }
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const endRef = useRef(null)

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }) }, [messages, busy, open])

  if (!claude.hasKey) return null

  async function send(question) {
    const q = question.trim()
    if (!q || busy) return
    const next = [...messages, { role: 'user', content: q }]
    setMessages(next)
    setText('')
    setError('')
    setBusy(true)
    try {
      const { answer, cost_zar } = await callClaude('ask', { messages: next.map(({ role, content }) => ({ role, content })) })
      setMessages([...next, { role: 'assistant', content: answer, cost: cost_zar }])
      claudeChanged()   // refresh "used this month"
    } catch (err) {
      setMessages(messages)   // let them try the same question again
      setText(q)
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="Ask Claude"
        className="flex items-center justify-center rounded-full active:scale-90 transition-transform no-select"
        style={{
          position: 'fixed', right: 16, zIndex: 50, width: 46, height: 46,
          bottom: 'calc(60px + env(safe-area-inset-bottom) + 14px)',
          background: 'rgb(var(--c-surface))', border: '0.5px solid rgb(var(--c-accent) / 0.5)',
          color: 'rgb(var(--c-accent))', boxShadow: '0 6px 18px rgba(0,0,0,0.35)',
        }}
      >
        <Sparkles size={20} />
      </button>

      <BottomSheet open={open} onClose={() => setOpen(false)} title="Ask Claude">
        <div className="px-5 pb-4" style={{ minHeight: '50svh', display: 'flex', flexDirection: 'column' }}>
          {messages.length === 0 && !busy ? (
            <div className="space-y-2 mt-1">
              <p className="text-sm" style={{ ...font, color: 'rgb(var(--c-text-2))' }}>
                Ask about your spending, budgets and bills, or for a quick sum. Claude reads your Cycle figures to answer.
              </p>
              {STARTERS.map(s => (
                <button key={s} onClick={() => send(s)}
                  className="w-full text-left px-4 py-3 rounded-2xl text-sm tappable"
                  style={{ ...font, background: 'rgb(var(--c-surface-2))', border: '0.5px solid rgb(var(--c-border))', color: 'rgb(var(--c-text))' }}>
                  {s}
                </button>
              ))}
            </div>
          ) : (
            <div className="space-y-3 flex-1">
              {messages.map((m, i) => m.role === 'user' ? (
                <div key={i} className="flex justify-end">
                  <div className="px-4 py-2.5 rounded-2xl text-sm max-w-[85%]"
                    style={{ ...font, background: 'rgb(var(--c-accent))', color: 'rgb(var(--c-bg))', borderBottomRightRadius: 6 }}>
                    {m.content}
                  </div>
                </div>
              ) : (
                <div key={i}>
                  <div className="px-4 py-3 rounded-2xl text-sm"
                    style={{ ...font, background: 'rgb(var(--c-surface-2))', color: 'rgb(var(--c-text))', borderBottomLeftRadius: 6 }}>
                    <Answer text={m.content} />
                  </div>
                  {m.cost != null && (
                    <p className="text-xs mt-1 ml-1" style={{ ...font, color: 'rgb(var(--c-text-4))' }}>
                      about {m.cost < 0.1 ? 'under 10c' : formatMoney(m.cost)}
                    </p>
                  )}
                </div>
              ))}
              {busy && (
                <div className="px-4 py-3 rounded-2xl text-sm inline-flex items-center gap-2"
                  style={{ ...font, background: 'rgb(var(--c-surface-2))', color: 'rgb(var(--c-text-3))' }}>
                  <Sparkles size={14} style={{ animation: 'pulse 1.5s ease-in-out infinite' }} /> Looking at your figures…
                </div>
              )}
              <div ref={endRef} />
            </div>
          )}

          {error && <p className="text-xs mt-3" style={{ ...font, color: 'rgb(var(--c-negative))' }}>{error}</p>}

          <form onSubmit={e => { e.preventDefault(); send(text) }} className="flex gap-2 mt-4 sticky bottom-0 pt-2"
            style={{ background: 'rgb(var(--c-surface))' }}>
            {messages.length > 0 && (
              <button type="button" onClick={() => { setMessages([]); setError('') }} aria-label="New chat"
                className="flex-shrink-0 w-11 h-11 rounded-xl flex items-center justify-center"
                style={{ background: 'rgb(var(--c-surface-2))', color: 'rgb(var(--c-text-3))' }}>
                <RotateCcw size={16} />
              </button>
            )}
            <input
              value={text} onChange={e => setText(e.target.value)} placeholder="Ask about your money…"
              aria-label="Your question" disabled={busy}
              className="flex-1 min-w-0"
              style={{
                ...font, padding: '11px 14px', fontSize: 14, borderRadius: 12, color: 'rgb(var(--c-text))',
                background: 'rgb(var(--c-surface-2))', border: '0.5px solid rgb(var(--c-border-strong))',
              }}
            />
            <button type="submit" disabled={busy || !text.trim()} aria-label="Send"
              className="flex-shrink-0 w-11 h-11 rounded-xl flex items-center justify-center transition-opacity"
              style={{ background: 'rgb(var(--c-accent))', color: 'rgb(var(--c-bg))', opacity: busy || !text.trim() ? 0.5 : 1 }}>
              <Send size={16} />
            </button>
          </form>
        </div>
      </BottomSheet>
    </>
  )
}

// Just enough Markdown for Claude's answers: paragraphs, bullet and numbered
// lists, **bold**, and tables.
function Answer({ text }) {
  const blocks = []
  const lines = text.split('\n')
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (/^\s*\|.*\|\s*$/.test(line)) {
      const rows = []
      while (i < lines.length && /^\s*\|.*\|\s*$/.test(lines[i])) rows.push(lines[i++])
      i--
      const cells = rows.filter(r => !/^\s*\|[\s:|-]+\|\s*$/.test(r))
        .map(r => r.trim().slice(1, -1).split('|').map(c => c.trim()))
      blocks.push({ type: 'table', cells })
    } else if (/^\s*([-*]|\d+\.)\s+/.test(line)) {
      const items = []
      const ordered = /^\s*\d+\./.test(line)
      while (i < lines.length && /^\s*([-*]|\d+\.)\s+/.test(lines[i])) items.push(lines[i++].replace(/^\s*([-*]|\d+\.)\s+/, ''))
      i--
      blocks.push({ type: ordered ? 'ol' : 'ul', items })
    } else if (line.trim()) {
      blocks.push({ type: 'p', text: line.replace(/^#+\s*/, '') })
    }
  }
  return (
    <div className="space-y-2" style={{ lineHeight: 1.55 }}>
      {blocks.map((b, i) => {
        if (b.type === 'table') return (
          <div key={i} style={{ overflowX: 'auto' }}>
            <table style={{ borderCollapse: 'collapse', fontSize: 13, width: '100%' }}>
              <tbody>
                {b.cells.map((row, r) => (
                  <tr key={r} style={{ borderBottom: '0.5px solid rgb(var(--c-border))' }}>
                    {row.map((c, k) => {
                      const Cell = r === 0 ? 'th' : 'td'
                      return <Cell key={k} style={{ padding: '5px 8px 5px 0', textAlign: k > 0 && /^[-R\d\s,.%]+$/.test(c) ? 'right' : 'left', fontWeight: r === 0 ? 600 : 400, whiteSpace: 'nowrap' }}><Inline text={c} /></Cell>
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
        if (b.type === 'ul' || b.type === 'ol') {
          const List = b.type
          return <List key={i} style={{ paddingLeft: 18, listStyle: b.type === 'ol' ? 'decimal' : 'disc' }}>{b.items.map((it, k) => <li key={k}><Inline text={it} /></li>)}</List>
        }
        return <p key={i}><Inline text={b.text} /></p>
      })}
    </div>
  )
}

function Inline({ text }) {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    /^\*\*[^*]+\*\*$/.test(part) ? <b key={i}>{part.slice(2, -2)}</b> : <Fragment key={i}>{part}</Fragment>)
}
