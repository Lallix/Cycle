/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // ── Backgrounds (design bible section 6) ──────────────────
        bg: {
          DEFAULT:  '#0D0D0D',   // Charcoal — primary background
          surface:  '#1B1B1B',   // Surface — cards on dark
          elevated: '#2E2E2E',   // Surface Light — elevated elements
          soft:     '#A1A1AA',   // Soft grey — disabled/subtle
        },
        // ── Gold scale (design bible section 2) ───────────────────
        gold: {
          DEFAULT: '#FFD166',    // Primary Gold
          dark:    '#E6BB45',    // Dark Gold — borders, strokes
          light:   '#FFE8A3',    // Light Gold — highlights, hover
          muted:   'rgba(255,209,102,0.12)', // Gold tint for backgrounds
          glow:    'rgba(255,209,102,0.25)', // Gold glow for shadows
        },
        // ── Semantic colours ──────────────────────────────────────
        success: '#22C55E',
        warning: '#FFB347',
        danger:  '#EF4444',
        info:    '#38B2F8',
        // ── Text ──────────────────────────────────────────────────
        fg: '#FFFFFF',           // Text Primary
        muted: '#A1A1AA',        // Text Secondary / Tertiary
        subtle: '#717179',       // Text Tertiary
        // ── Ivory (for cards and hero surfaces) ──────────────────
        ivory: {
          DEFAULT: '#FAF7F0',   // warm ivory — card backgrounds
          warm:    '#F5F0E8',   // slightly darker ivory
          border:  '#E8E0D0',   // ivory border
          muted:   '#9A9080',   // muted text on ivory
          text:    '#1C1814',   // dark text on ivory
        },
        // ── Borders ───────────────────────────────────────────────
        border: {
          DEFAULT: '#2A2A2A',
          strong:  '#3A3A3A',
          gold:    'rgba(255,209,102,0.3)',
        },
      },
      fontFamily: {
        sans:    ['Inter', 'system-ui', 'sans-serif'],     // Body text
        display: ['Poppins', 'system-ui', 'sans-serif'],   // Headings
        mono:    ['Poppins', 'system-ui', 'sans-serif'],   // Numbers (tabular)
      },
      fontSize: {
        // Design bible type scale
        'caption': ['0.75rem',  { lineHeight: '1rem' }],     // 12/16
        'small':   ['0.875rem', { lineHeight: '1.25rem' }],  // 14/20
        'body':    ['1rem',     { lineHeight: '1.5rem' }],   // 16/24
        'h4':      ['1.125rem', { lineHeight: '1.5rem' }],   // 18/24
        'h3':      ['1.25rem',  { lineHeight: '1.75rem' }],  // 20/28
        'h2':      ['1.5rem',   { lineHeight: '2rem' }],     // 24/32
        'h1':      ['2rem',     { lineHeight: '2.5rem' }],   // 32/40
        // Keep shorthand aliases
        '2xs': '0.625rem',
        xs:    '0.75rem',
        sm:    '0.875rem',
        base:  '1rem',
        lg:    '1.125rem',
        xl:    '1.25rem',
        '2xl': '1.5rem',
        '3xl': '1.875rem',
        '4xl': '2.25rem',
        '5xl': '3rem',
      },
      borderRadius: {
        DEFAULT: '0.5rem',
        lg:  '0.75rem',
        xl:  '1rem',
        '2xl': '1.25rem',
        '3xl': '1.5rem',
        '4xl': '2rem',          // 20px radius cards (design bible rule 12)
      },
      animation: {
        'fade-in':     'fadeIn 0.25s ease-out',
        'fade-in-up':  'fadeInUp 0.35s cubic-bezier(0.22,1,0.36,1)',
        'slide-up':    'slideUp 0.35s cubic-bezier(0.22,1,0.36,1)',
        'slide-down':  'slideDown 0.3s ease-out',
        'scale-in':    'scaleIn 0.2s cubic-bezier(0.22,1,0.36,1)',
        'bar-grow':    'barGrow 0.6s cubic-bezier(0.22,1,0.36,1)',
        'ring-spin-cw':  'spin 4s linear infinite',
        'ring-spin-ccw': 'spinCCW 2.8s linear infinite',
        'ring-pulse':    'ringPulse 3s ease-in-out infinite',
        'gold-pulse':    'goldPulse 2s ease-in-out infinite',
        'spark-orbit':   'spin 3s linear infinite',
        'count-up':      'fadeIn 0.8s ease-out',
        'stagger-1':     'fadeInUp 0.4s 0.1s cubic-bezier(0.22,1,0.36,1) both',
        'stagger-2':     'fadeInUp 0.4s 0.25s cubic-bezier(0.22,1,0.36,1) both',
        'stagger-3':     'fadeInUp 0.4s 0.4s cubic-bezier(0.22,1,0.36,1) both',
        'stagger-4':     'fadeInUp 0.4s 0.55s cubic-bezier(0.22,1,0.36,1) both',
      },
      keyframes: {
        fadeIn: {
          '0%':   { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeInUp: {
          '0%':   { opacity: '0', transform: 'translateY(14px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideUp: {
          '0%':   { transform: 'translateY(100%)' },
          '100%': { transform: 'translateY(0)' },
        },
        slideDown: {
          '0%':   { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(0)' },
        },
        scaleIn: {
          '0%':   { opacity: '0', transform: 'scale(0.96)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        barGrow: {
          '0%':   { width: '0%' },
          '100%': { width: 'var(--bar-width)' },
        },
        spinCCW: {
          '0%':   { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(-360deg)' },
        },
        ringPulse: {
          '0%,100%': { opacity: '0.85', transform: 'scale(1)' },
          '50%':     { opacity: '1',    transform: 'scale(1.04)' },
        },
        goldPulse: {
          '0%,100%': { opacity: '1',  color: '#FFD166' },
          '50%':     { opacity: '0.7', color: '#FFE8A3' },
        },
      },
      boxShadow: {
        'gold':    '0 0 24px rgba(255,209,102,0.2)',
        'gold-sm': '0 0 12px rgba(255,209,102,0.15)',
        'gold-lg': '0 0 40px rgba(255,209,102,0.3)',
        'card':    '0 4px 24px rgba(0,0,0,0.5)',
        'sheet':   '0 -8px 32px rgba(0,0,0,0.7)',
      },
      spacing: {
        'safe-bottom': 'env(safe-area-inset-bottom)',
        'safe-top':    'env(safe-area-inset-top)',
      },
    },
  },
  plugins: [],
}
