/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: {
          DEFAULT: '#0E0E0E',
          surface: '#171717',
          card: '#1C1C1C',
          elevated: '#222222',
        },
        gold: {
          DEFAULT: '#D4AF37',
          light: '#E5C76B',
          dark: '#B8972E',
          muted: 'rgba(212,175,55,0.15)',
        },
        success: '#3DD598',
        warning: '#FFB347',
        danger: '#FF6B6B',
        border: {
          DEFAULT: '#2A2A2A',
          light: '#333333',
        },
        muted: '#888888',
        text: {
          primary: '#F5F5F5',
          secondary: '#BBBBBB',
          muted: '#888888',
        }
      },
      fontFamily: {
        sans: ['Poppins', 'system-ui', 'sans-serif'],
        mono: ['DM Mono', 'monospace'],
      },
      fontSize: {
        '2xs': '0.625rem',
        xs: '0.75rem',
        sm: '0.875rem',
        base: '1rem',
        lg: '1.125rem',
        xl: '1.25rem',
        '2xl': '1.5rem',
        '3xl': '1.875rem',
        '4xl': '2.25rem',
        '5xl': '3rem',
      },
      borderRadius: {
        DEFAULT: '0.5rem',
        lg: '0.75rem',
        xl: '1rem',
        '2xl': '1.25rem',
        '3xl': '1.5rem',
        '4xl': '2rem',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.35s cubic-bezier(0.32, 0.72, 0, 1)',
        'slide-down': 'slideDown 0.3s ease-out',
        'bar-grow': 'barGrow 0.6s cubic-bezier(0.32, 0.72, 0, 1)',
        'pulse-gold': 'pulseGold 2s ease-in-out infinite',
        'spin-slow': 'spin 3s linear infinite',
        'fade-in-up': 'fadeInUp 0.4s ease-out',
        'scale-in': 'scaleIn 0.2s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideUp: {
          '0%': { transform: 'translateY(100%)' },
          '100%': { transform: 'translateY(0)' },
        },
        slideDown: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(0)' },
        },
        barGrow: {
          '0%': { width: '0%' },
          '100%': { width: 'var(--bar-width)' },
        },
        pulseGold: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.4' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
      },
      boxShadow: {
        'gold': '0 0 20px rgba(212,175,55,0.2)',
        'gold-sm': '0 0 10px rgba(212,175,55,0.15)',
        'card': '0 4px 24px rgba(0,0,0,0.4)',
        'sheet': '0 -8px 32px rgba(0,0,0,0.6)',
      },
      backgroundImage: {
        'gradient-gold': 'linear-gradient(135deg, #D4AF37 0%, #E5C76B 100%)',
        'gradient-dark': 'linear-gradient(180deg, #171717 0%, #0E0E0E 100%)',
        'gradient-card': 'linear-gradient(135deg, #1C1C1C 0%, #171717 100%)',
      },
      spacing: {
        'safe-bottom': 'env(safe-area-inset-bottom)',
        'safe-top': 'env(safe-area-inset-top)',
      }
    },
  },
  plugins: [],
}
