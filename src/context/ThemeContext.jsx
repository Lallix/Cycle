import { createContext, useContext, useEffect, useState } from 'react'

// The app's look: 'classic' (refined gold) or 'vibe' (3D, lime and pink).
// Colours live in CSS variables (styles/globals.css) keyed off
// <html data-theme>; this context switches it and remembers the choice on
// this device. index.html applies the saved look before the app starts.

const KEY = 'cycle-theme'
const META = { classic: '#0E0E10', vibe: '#0E0B1F' }   // phone status-bar colour
const ThemeContext = createContext({ theme: 'classic', setTheme: () => {}, toggleTheme: () => {} })

function readSaved() {
  try { return localStorage.getItem(KEY) === 'vibe' ? 'vibe' : 'classic' } catch { return 'classic' }
}

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(readSaved)

  useEffect(() => {
    const root = document.documentElement
    if (theme === 'vibe') root.dataset.theme = 'vibe'
    else delete root.dataset.theme
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', META[theme])
    try { localStorage.setItem(KEY, theme) } catch { /* private mode: still switches, just not remembered */ }
  }, [theme])

  const toggleTheme = () => setTheme(t => (t === 'vibe' ? 'classic' : 'vibe'))
  return <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>{children}</ThemeContext.Provider>
}

export const useTheme = () => useContext(ThemeContext)
