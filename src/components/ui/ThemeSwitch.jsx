import { useTheme } from '../../context/ThemeContext'
import { T } from '../../lib/theme'

// Light / Dark / Auto switch (Settings), and a one-tap sun/moon toggle (dashboard).
const OPTIONS = [
  { value: 'light', label: 'Light', icon: '☀️' },
  { value: 'dark', label: 'Dark', icon: '🌙' },
  { value: 'auto', label: 'Auto', icon: '📱' },
]

export default function ThemeSwitch() {
  const { mode, setMode } = useTheme()
  return (
    <div role="radiogroup" aria-label="Light or dark" className="grid grid-cols-3 gap-2 p-1"
      style={{ background: T.surface2, borderRadius: 16, border: `0.5px solid ${T.border}` }}>
      {OPTIONS.map(o => {
        const on = mode === o.value
        return (
          <button key={o.value} role="radio" aria-checked={on} onClick={() => setMode(o.value)} className="tappable"
            style={{
              padding: '10px 6px', borderRadius: 12, border: 'none', cursor: 'pointer', textAlign: 'center',
              background: on ? T.gold : 'transparent', color: on ? 'rgb(var(--c-on-accent))' : T.text2,
              fontFamily: 'Inter, sans-serif', transition: 'background 0.2s, color 0.2s',
            }}>
            <span style={{ display: 'block', fontSize: 16 }}>{o.icon}</span>
            <span style={{ display: 'block', fontSize: 13, fontWeight: 600 }}>{o.label}</span>
          </button>
        )
      })}
    </div>
  )
}

export function ModeToggleButton() {
  const { resolved, toggleMode } = useTheme()
  const light = resolved === 'light'
  return (
    <button onClick={toggleMode} aria-label={light ? 'Switch to dark mode' : 'Switch to light mode'}
      title={light ? 'Dark mode' : 'Light mode'}
      style={{
        width: 46, height: 46, display: 'grid', placeItems: 'center', borderRadius: 16, cursor: 'pointer', fontSize: 20,
        border: `0.5px solid ${T.border}`, background: T.surface,
      }}>
      {light ? '🌙' : '☀️'}
    </button>
  )
}
