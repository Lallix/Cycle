import { createPortal } from 'react-dom'
import BrandLogo from '../branding/BrandLogo'

// Rendered into <body> so it always covers the whole screen. Inside a page,
// the fade-in animation's transform would otherwise pin this "fixed" layer
// to the page's own box and the ring would sit half off the top.
export default function LoadingScreen({ message = 'Loading...' }) {
  return createPortal(
    <div style={{
      position: 'fixed',
      inset: 0,
      top: 0, left: 0, right: 0, bottom: 0,   // explicit for older WebKit
      width: '100%',
      height: '100%',
      background: 'rgb(var(--c-bg))',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
    }}>
      <BrandLogo size={72} fill={0.3} animate="spin" />
      <p style={{
        marginTop: 24,
        fontFamily: 'Inter, sans-serif',
        fontSize: 13,
        color: 'rgb(var(--c-text-3))',
        animation: 'pulse 2s ease-in-out infinite',
      }}>
        {message}
      </p>
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.4; }
          50%       { opacity: 1; }
        }
      `}</style>
    </div>,
    document.body
  )
}
