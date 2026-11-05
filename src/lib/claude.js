import { useCallback, useEffect, useState } from 'react'
import { supabase } from './supabase'

// The Claude assistant. Each person uses their own Claude API key, saved
// encrypted on the server (the app never sees it again after saving). All
// calls go through the cycle-claude server function.

export const ZAR_PER_USD = 18.5   // rough; the server uses the same figure

export const MODEL_OPTIONS = [
  { id: 'claude-opus-5-5',   label: 'Opus 5.5',   note: 'Smartest. About R0.50 a question.' },
  { id: 'claude-sonnet-5-5', label: 'Sonnet 5.5', note: 'Good balance. About R0.25 a question.' },
  { id: 'claude-haiku-5-5',  label: 'Haiku 5.5',  note: 'Fast and cheapest. About 2c a question.' },
]

const CHANGED = 'cycle-claude-changed'

export async function callClaude(action, payload = {}) {
  const { data, error } = await supabase.functions.invoke('cycle-claude', { body: { action, ...payload } })
  if (error) {
    let message = 'Claude could not be reached. Check your connection and try again.'
    try { message = (await error.context.json()).error || message } catch { /* not a JSON error */ }
    const err = new Error(message)
    err.status = error.context?.status
    throw err
  }
  return data
}

// Tell every open screen that the key or settings changed
export function claudeChanged() {
  window.dispatchEvent(new Event(CHANGED))
}

// The signed-in person's Claude set-up and what they've used this month
export function useClaude() {
  const [state, setState] = useState({ loading: true, hasKey: false, hint: null, model: MODEL_OPTIONS[0].id, limit: null, usedZar: 0 })

  const load = useCallback(async () => {
    const monthStart = new Date(); monthStart.setUTCDate(1); monthStart.setUTCHours(0, 0, 0, 0)
    const [{ data: s }, { data: usage }] = await Promise.all([
      supabase.from('cycle_ai_settings').select('key_hint, model, monthly_limit_zar').maybeSingle(),
      supabase.from('cycle_ai_usage').select('cost_usd').gte('created_at', monthStart.toISOString()),
    ])
    setState({
      loading: false,
      hasKey: Boolean(s?.key_hint),
      hint: s?.key_hint || null,
      model: s?.model || MODEL_OPTIONS[0].id,
      limit: s?.monthly_limit_zar != null ? Number(s.monthly_limit_zar) : null,
      usedZar: (usage || []).reduce((t, r) => t + Number(r.cost_usd), 0) * ZAR_PER_USD,
    })
  }, [])

  useEffect(() => {
    load()
    window.addEventListener(CHANGED, load)
    return () => window.removeEventListener(CHANGED, load)
  }, [load])

  return { ...state, reload: load }
}
