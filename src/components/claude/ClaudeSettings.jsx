import { useState } from 'react'
import { Sparkles, KeyRound, ExternalLink } from 'lucide-react'
import { useToast } from '../ui/Toast'
import BottomSheet from '../ui/BottomSheet'
import Button from '../ui/Button'
import { formatMoney } from '../../lib/format'
import { MODEL_OPTIONS, ZAR_PER_USD, callClaude, claudeChanged, useClaude } from '../../lib/claude'

// Settings → Claude assistant: add your own Claude API key, pick a model,
// set a monthly limit. The key is checked with Anthropic, stored encrypted on
// the server and never shown again (only its last 4 characters).

const font = { fontFamily: 'Inter, sans-serif' }
const inputStyle = {
  width: '100%', padding: '12px 14px', background: 'rgb(var(--c-surface-2))', border: '0.5px solid rgb(var(--c-border-strong))',
  borderRadius: 12, color: 'rgb(var(--c-text))', fontSize: 14, ...font,
}

export default function ClaudeSettings() {
  const toast = useToast()
  const claude = useClaude()
  const [keyOpen, setKeyOpen] = useState(false)
  const [key, setKey] = useState('')
  const [keyError, setKeyError] = useState('')
  const [busy, setBusy] = useState(false)
  const [limit, setLimit] = useState(null)   // text being edited; null = not editing

  async function saveKey(e) {
    e?.preventDefault()
    setKeyError('')
    setBusy(true)
    try {
      await callClaude('save_key', { key })
      setKey('')
      setKeyOpen(false)
      claudeChanged()
      toast('Claude key saved', 'success')
    } catch (err) {
      setKeyError(err.message)
    } finally {
      setBusy(false)
    }
  }

  async function removeKey() {
    if (!window.confirm('Remove your Claude key? The assistant and "Import any bank" switch off until you add a key again.')) return
    setBusy(true)
    try {
      await callClaude('remove_key')
      claudeChanged()
      toast('Claude key removed', 'success')
    } catch (err) {
      toast(err.message, 'error', 5000)
    } finally {
      setBusy(false)
    }
  }

  async function saveSettings(changes, done) {
    try {
      await callClaude('settings', changes)
      claudeChanged()
      done?.()
    } catch (err) {
      toast(err.message, 'error', 5000)
    }
  }

  function saveLimit() {
    const text = (limit ?? '').replace(/[R\s,]/g, '')
    if (text && !(Number(text) > 0)) { toast('Enter an amount in Rand, or leave it empty for no limit', 'error'); return }
    saveSettings({ monthly_limit_zar: text ? Number(text) : null }, () => { setLimit(null); toast('Limit saved', 'success') })
  }

  if (claude.loading) return null

  return (
    <section>
      <p className="text-xs text-muted uppercase tracking-widest mb-2">Claude assistant</p>
      <div className="border border-border rounded-2xl overflow-hidden" style={{ background: 'rgb(var(--c-surface))' }}>
        <div className="flex items-start gap-3 p-4">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'rgb(var(--c-accent) / 0.12)', color: 'rgb(var(--c-accent))' }}>
            <Sparkles size={18} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-fg" style={font}>
              {claude.hasKey ? 'On' : 'Ask Claude about your budget'}
              {claude.hasKey && <span className="text-xs text-muted"> · key ending {claude.hint}</span>}
            </p>
            <p className="text-xs text-subtle mt-0.5" style={font}>
              {claude.hasKey
                ? 'Quick sums, spending questions, budget help, and statements from any bank.'
                : 'Use your own Claude account for quick sums, spending questions and statements from any bank. You pay Anthropic for what you use.'}
            </p>
          </div>
        </div>

        {!claude.hasKey ? (
          <div className="px-4 pb-4">
            <Button fullWidth onClick={() => { setKeyError(''); setKeyOpen(true) }}><KeyRound size={15} /> Add your Claude key</Button>
          </div>
        ) : (
          <>
            {/* Model */}
            <div className="border-t border-border px-4 py-3">
              <p className="text-xs text-muted mb-2" style={font}>Model</p>
              <div className="grid grid-cols-3 gap-1.5 p-1 rounded-xl" style={{ background: 'rgb(var(--c-surface-2))' }}>
                {MODEL_OPTIONS.map(m => {
                  const on = claude.model === m.id
                  return (
                    <button key={m.id} onClick={() => !on && saveSettings({ model: m.id })} aria-pressed={on}
                      className="py-2 rounded-lg text-xs transition-all"
                      style={{
                        ...font, fontWeight: on ? 600 : 500,
                        background: on ? 'rgb(var(--c-accent))' : 'transparent',
                        color: on ? 'rgb(var(--c-bg))' : 'rgb(var(--c-text-2))',
                      }}>
                      {m.label}
                    </button>
                  )
                })}
              </div>
              <p className="text-xs text-subtle mt-1.5" style={font}>{MODEL_OPTIONS.find(m => m.id === claude.model)?.note}</p>
            </div>

            {/* Usage and limit */}
            <div className="border-t border-border px-4 py-3">
              <div className="flex items-baseline justify-between">
                <p className="text-xs text-muted" style={font}>Used this month</p>
                <p className="text-sm text-fg" style={font}>
                  {formatMoney(claude.usedZar)}
                  {claude.limit != null && <span className="text-muted"> of {formatMoney(claude.limit)}</span>}
                </p>
              </div>
              {limit === null ? (
                <button onClick={() => setLimit(claude.limit != null ? String(claude.limit) : '')}
                  className="text-xs mt-1.5" style={{ ...font, color: 'rgb(var(--c-accent))' }}>
                  {claude.limit != null ? 'Change monthly limit' : 'Set a monthly limit'}
                </button>
              ) : (
                <div className="flex gap-2 mt-2">
                  <input value={limit} onChange={e => setLimit(e.target.value)} inputMode="decimal" placeholder="e.g. 100 (empty = no limit)"
                    aria-label="Monthly limit in Rand" style={{ ...inputStyle, padding: '8px 12px', fontSize: 13 }} autoFocus />
                  <Button size="sm" onClick={saveLimit}>Save</Button>
                  <Button size="sm" variant="ghost" onClick={() => setLimit(null)}>Cancel</Button>
                </div>
              )}
              <p className="text-xs text-subtle mt-1.5" style={font}>Rand amounts are estimates at about R{ZAR_PER_USD} to the dollar.</p>
            </div>

            <div className="border-t border-border px-4 py-3 flex gap-2">
              <Button size="sm" variant="secondary" onClick={() => { setKeyError(''); setKeyOpen(true) }}>Replace key</Button>
              <Button size="sm" variant="danger" onClick={removeKey} loading={busy}>Remove key</Button>
            </div>
          </>
        )}
      </div>

      <BottomSheet open={keyOpen} onClose={() => !busy && setKeyOpen(false)} title={claude.hasKey ? 'Replace your Claude key' : 'Add your Claude key'}>
        <form onSubmit={saveKey} className="px-5 pb-8 space-y-4">
          <ol className="text-sm space-y-2" style={{ ...font, color: 'rgb(var(--c-text-2))', paddingLeft: 18, listStyle: 'decimal' }}>
            <li>
              Sign up or sign in at{' '}
              <a href="https://console.anthropic.com/" target="_blank" rel="noopener noreferrer" style={{ color: 'rgb(var(--c-accent))' }}>
                console.anthropic.com <ExternalLink size={11} style={{ display: 'inline', verticalAlign: '-1px' }} />
              </a>
              . This is separate from a claude.ai subscription.
            </li>
            <li>Under <b>Billing</b>, buy some credit (a few dollars lasts a long time).</li>
            <li>Under <b>API keys</b>, create a key and copy it.</li>
            <li>Paste it below.</li>
          </ol>
          <div>
            <input
              type="password" autoComplete="off" spellCheck={false} value={key}
              onChange={e => { setKey(e.target.value); setKeyError('') }}
              placeholder="sk-ant-…" aria-label="Claude API key" style={inputStyle}
            />
            {keyError && <p className="text-xs mt-1.5" style={{ ...font, color: 'rgb(var(--c-negative))' }}>{keyError}</p>}
          </div>
          <p className="text-xs text-subtle" style={font}>
            Cycle checks the key with Anthropic, then stores it encrypted. It's never shown again, not even to an admin.
            When you use the assistant, your question and the figures needed to answer it are sent to Anthropic.
          </p>
          <Button type="submit" fullWidth loading={busy} disabled={!key.trim()}>
            {busy ? 'Checking with Claude…' : 'Save key'}
          </Button>
        </form>
      </BottomSheet>
    </section>
  )
}
