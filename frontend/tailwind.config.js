/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['DM Sans', 'sans-serif'],
        body: ['DM Sans', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      colors: {
        // Summit Range brand palette
        navy: {
          950: '#050d1a',
          900: '#0a1628',
          800: '#0f2040',
          700: '#152b56',
          600: '#1a3570',
          500: '#1e3f8a',
        },
        slate: {
          850: '#141f2e',
          900: '#0e1721',
        },
        accent: {
          DEFAULT: '#3b82f6',
          hover: '#2563eb',
          glow: 'rgba(59,130,246,0.15)',
        },
        critical: '#ef4444',
        high:     '#f97316',
        medium:   '#eab308',
        low:      '#22c55e',
        pass:     '#10b981',
        fail:     '#ef4444',
        partial:  '#f59e0b',
        unknown:  '#6b7280',
      },
      backgroundImage: {
        'grid-pattern': `linear-gradient(rgba(59,130,246,0.03) 1px, transparent 1px),
                         linear-gradient(90deg, rgba(59,130,246,0.03) 1px, transparent 1px)`,
      },
      animation: {
        'fade-in': 'fadeIn 0.4s ease-out forwards',
        'slide-up': 'slideUp 0.4s ease-out forwards',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4,0,0.6,1) infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
}
