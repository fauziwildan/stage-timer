import type { Config } from 'tailwindcss'
import animate from 'tailwindcss-animate'

const config: Config = {
  darkMode: ['class'],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}'
  ],
  prefix: '',
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: { '2xl': '1400px' }
    },
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: { DEFAULT: 'hsl(var(--primary))', foreground: 'hsl(var(--primary-foreground))' },
        secondary: { DEFAULT: 'hsl(var(--secondary))', foreground: 'hsl(var(--secondary-foreground))' },
        destructive: { DEFAULT: 'hsl(var(--destructive))', foreground: 'hsl(var(--destructive-foreground))' },
        muted: { DEFAULT: 'hsl(var(--muted))', foreground: 'hsl(var(--muted-foreground))' },
        accent: { DEFAULT: 'hsl(var(--accent))', foreground: 'hsl(var(--accent-foreground))' },
        popover: { DEFAULT: 'hsl(var(--popover))', foreground: 'hsl(var(--popover-foreground))' },
        card: { DEFAULT: 'hsl(var(--card))', foreground: 'hsl(var(--card-foreground))' },
        // ── Timer state colors ────────────────────────────
        'timer-green':    '#22C55E',
        'timer-yellow':   '#EAB308',
        'timer-orange':   '#F97316',
        'timer-red':      '#EF4444',
        'timer-overtime': '#A855F7',

        // ── App surfaces ──────────────────────────────────
        'tm-darker':    '#0A0A0A',
        'tm-dark':      '#0D0D0D',
        'tm-surface':   '#111111',
        'tm-surface-2': '#161616',
        'tm-surface-3': '#1C1C1C',
        'tm-border':    '#1F1F1F',
        'tm-border-2':  '#2A2A2A',
        'tm-border-3':  '#383838',

        // ── Text ──────────────────────────────────────────
        'tm-text':   '#F1F1F1',
        'tm-muted':  '#A3A3A3',
        'tm-subtle': '#525252',

        // ── Accent ────────────────────────────────────────
        'accent-cyan':   '#00D4FF',
        'accent-purple': '#A855F7'
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)'
      },
      keyframes: {
        'accordion-down': { from: { height: '0' }, to: { height: 'var(--radix-accordion-content-height)' } },
        'accordion-up': { from: { height: 'var(--radix-accordion-content-height)' }, to: { height: '0' } },
        'pulse-ring': {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(239, 68, 68, 0.4)' },
          '50%': { boxShadow: '0 0 0 8px rgba(239, 68, 68, 0)' }
        },
        'flash-message': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.3' }
        },
        'slide-up': {
          from: { transform: 'translateY(100%)', opacity: '0' },
          to: { transform: 'translateY(0)', opacity: '1' }
        },
        'countdown-tick': {
          '0%': { transform: 'scale(1.05)', color: 'hsl(var(--primary))' },
          '100%': { transform: 'scale(1)', color: 'inherit' }
        }
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        'pulse-ring': 'pulse-ring 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'flash-message': 'flash-message 0.5s ease-in-out infinite',
        'slide-up': 'slide-up 0.3s ease-out',
        'countdown-tick': 'countdown-tick 0.1s ease-out'
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'Consolas', 'monospace'],
        display: ['Inter', 'system-ui', 'sans-serif']
      }
    }
  },
  plugins: [animate]
}

export default config
