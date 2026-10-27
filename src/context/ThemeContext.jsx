import { createContext, useContext, useEffect, useState } from 'react'

// Light or dark. 'auto' follows the phone / computer setting.
// Colours live in CSS variables (styles/globals.css); dark is the default and
// <html data-mode="light"> switches to the light palette. The choice is
// remembered on this device; index.html applies it before the app starts.

const KEY = 'cycle-mode'
const META = { dark: '#0E0B1F', light: '#F4F1FF' }   // phone status-bar colour
const ThemeContext = createContext({ mode: 'dark', resolved: 'dark', setMode: () => {}, toggleMode: () => {} })

function readSaved() {
  try {
    const m = localStorage.getItem(KEY)
    return m === 'light' || m === 'auto' ? m : 'dark'
  } catch { return 'dark' }
}

const systemPrefersLight = () => window.matchMedia?.('(prefers-color-scheme: light)').matches

export function ThemeProvider({ children }) {
  const [mode, setMode] = useState(readSaved)
  const [systemLight, setSystemLight] = useState(systemPrefersLight)

  // keep 'auto' in step with the device setting
  useEffect(() => {
    const mq = window.matchMedia?.('(prefers-color-scheme: light)')
    if (!mq) return
    const on = e => setSystemLight(e.matches)
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])

  const resolved = mode === 'auto' ? (systemLight ? 'light' : 'dark') : mode

  useEffect(() => {
    const root = document.documentElement
    if (resolved === 'light') root.dataset.mode = 'light'
    else delete root.dataset.mode
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', META[resolved])
    try { localStorage.setItem(KEY, mode) } catch { /* private mode: still switches, just not remembered */ }
  }, [mode, resolved])

  const toggleMode = () => setMode(resolved === 'light' ? 'dark' : 'light')
  return (
    <ThemeContext.Provider value={{ mode, resolved, setMode, toggleMode }}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => useContext(ThemeContext)
