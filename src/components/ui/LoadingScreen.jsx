import BrandLogo from '../branding/BrandLogo'

export default function LoadingScreen({ message = 'Loading...' }) {
  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      top: 0, left: 0, right: 0, bottom: 0,   // explicit for older WebKit
      width: '100%',
      height: '100%',
      background: '#0D0D0D',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
    }}>
      <BrandLogo size={80} animated />
      <p style={{
        marginTop: 24,
        fontFamily: 'Inter, sans-serif',
        fontSize: 13,
        color: '#717179',
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
    </div>
  )
}
