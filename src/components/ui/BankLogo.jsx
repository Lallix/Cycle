import { useState } from 'react'
import { CreditCard, PiggyBank } from 'lucide-react'

// A bank's logo in a white disc. Credit cards and savings accounts get a
// small corner badge so they stand apart from the same bank's main account.
// st: an account style from accountStyle() / getAccountConfig() (logo, color, label, kind)
const BADGE = {
  credit_card: { Icon: CreditCard, bg: '#FF4D5E' },
  savings:     { Icon: PiggyBank,  bg: 'rgb(var(--c-positive))' },
}

export default function BankLogo({ st, kind = st?.kind, size = 36 }) {
  const [broken, setBroken] = useState(false)
  const badge = BADGE[kind]
  const b = Math.max(8, Math.round(size * 0.5))
  return (
    <span style={{ position: 'relative', width: size, height: size, flexShrink: 0, display: 'inline-block' }}>
      <span style={{
        width: size, height: size, borderRadius: '50%', background: '#fff', overflow: 'hidden',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 0 0 0.5px rgb(0 0 0 / 0.12)',
      }}>
        {st?.logo && !broken ? (
          <img src={st.logo} alt={st.label || ''} onError={() => setBroken(true)}
            style={{ width: '70%', height: '70%', objectFit: 'contain' }} />
        ) : (
          <span style={{ fontSize: size * 0.32, fontWeight: 700, color: st?.color || '#888', fontFamily: 'Inter, sans-serif' }}>
            {(st?.label || '?').slice(0, 2).toUpperCase()}
          </span>
        )}
      </span>
      {badge && (
        <span style={{
          position: 'absolute', right: -b * 0.25, bottom: -b * 0.2, width: b, height: b, borderRadius: '50%',
          background: badge.bg, border: '1.5px solid rgb(var(--c-bg))',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <badge.Icon size={b * 0.64} color="#fff" strokeWidth={2.5} />
        </span>
      )}
    </span>
  )
}
