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
          DEFAULT:  '#0E0E10',   // Charcoal — primary background
          surface:  '#17171A',   // Surface — cards on dark
          elevated: '#1F1F23',   // Surface Light — elevated elements
          soft:     '#A1A1AA',   // Soft grey — disabled/subtle
        },
        // ── Gold scale (design bible section 2) ───────────────────
        gold: {
          DEFAULT: '#E8C36A',    // Primary Gold
          dark:    '#D4AE55',    // Dark Gold — borders, strokes
          light:   '#F3DDA0',    // Light Gold — highlights, hover
          muted:   'rgba(232,195,106,0.12)', // Gold tint for backgrounds
          glow:    'rgba(232,195,106,0.25)', // Gold glow for shadows
        },
        // ── Surfaces the components refer to by role ─────────────
        surface: {
          DEFAULT: '#17171A',
          1: '#17171A',          // cards
          2: '#1F1F23',          // inputs, hover rows
        },
        text: {
          primary:   '#F4F4F5',
          secondary: '#A1A1AA',
        },
        // ── Semantic colours ──────────────────────────────────────
        success: '#5BC98B',
        warning: '#E9A25A',
        danger:  '#F07A6A',
        info:    '#38B2F8',
        // ── Text ──────────────────────────────────────────────────
        fg: '#F4F4F5',           // Text Primary
        muted: '#A1A1AA',        // Text Secondary / Tertiary
        subtle: '#8B8B93',       // Text Tertiary
        // ── Ivory (for cards and hero surfaces) ──────────────────
        ivory: {
          DEFAULT: '#17171A',   // warm ivory — card backgrounds
          warm:    '#1F1F23',   // slightly darker ivory
          border:  '#26262B',   // ivory border
          muted:   '#8B8B93',   // muted text on ivory
          text:    '#F4F4F5',   // dark text on ivory
        },
        // ── Borders ───────────────────────────────────────────────
        border: {
          DEFAULT: '#26262B',
          strong:  '#34343A',
          gold:    'rgba(232,195,106,0.3)',
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
          '0%,100%': { opacity: '1',  color: '#E8C36A' },
          '50%':     { opacity: '0.7', color: '#F3DDA0' },
        },
      },
      boxShadow: {
        'gold':    '0 0 0 0 transparent',
        'gold-sm': '0 0 0 0 transparent',
        'gold-lg': '0 0 0 0 transparent',
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
