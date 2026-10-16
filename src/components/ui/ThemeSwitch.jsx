import { useTheme } from '../../context/ThemeContext'
import { T } from '../../lib/theme'

// Classic / Vibe segmented switch (Settings), and a one-tap toggle (dashboard).
const OPTIONS = [
  { value: 'classic', label: 'Classic', hint: 'Refined gold' },
  { value: 'vibe', label: 'Vibe ✨', hint: '3D, lime and pink' },
]

export default function ThemeSwitch() {
  const { theme, setTheme } = useTheme()
  return (
    <div role="radiogroup" aria-label="App look" className="grid grid-cols-2 gap-2 p-1"
      style={{ background: T.surface2, borderRadius: 16, border: `0.5px solid ${T.border}` }}>
      {OPTIONS.map(o => {
        const on = theme === o.value
        return (
          <button key={o.value} role="radio" aria-checked={on} onClick={() => setTheme(o.value)} className="tappable"
            style={{
              padding: '10px 8px', borderRadius: 12, border: 'none', cursor: 'pointer', textAlign: 'center',
              background: on ? T.gold : 'transparent', color: on ? 'rgb(var(--c-on-accent))' : T.text2,
              fontFamily: 'Inter, sans-serif', transition: 'background 0.2s, color 0.2s',
            }}>
            <span style={{ display: 'block', fontSize: 14, fontWeight: 600 }}>{o.label}</span>
            <span style={{ display: 'block', fontSize: 11, opacity: 0.75 }}>{o.hint}</span>
          </button>
        )
      })}
    </div>
  )
}

export function ThemeToggleButton() {
  const { theme, toggleTheme } = useTheme()
  const vibe = theme === 'vibe'
  return (
    <button onClick={toggleTheme} aria-label={vibe ? 'Switch to the Classic look' : 'Switch to the Vibe look'}
      title={vibe ? 'Classic look' : 'Vibe look'}
      style={{
        width: 38, height: 38, display: 'flex', alignItems: 'center', justifyContent: 'center',
        borderRadius: 12, border: `0.5px solid ${T.border}`, background: T.surface, cursor: 'pointer', fontSize: 17,
      }}>
      {vibe ? '🪙' : '✨'}
    </button>
  )
}
