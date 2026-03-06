/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx,ts,tsx,mdx}',
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        bg: '#09090B',
        surface: '#18181B',
        elevated: '#27272A',
        border: '#3F3F46',
        'text-primary': '#FAFAFA',
        'text-secondary': '#A1A1AA',
        accent: '#A78BFA',
        'accent-hover': '#C4B5FD',
        success: '#34D399',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      fontSize: {
        'scale-1': ['0.64rem', { lineHeight: '1rem' }],
        'scale-2': ['0.8rem', { lineHeight: '1.2rem' }],
        'scale-3': ['1rem', { lineHeight: '1.5rem' }],
        'scale-4': ['1.25rem', { lineHeight: '1.75rem' }],
        'scale-5': ['1.563rem', { lineHeight: '2rem' }],
        'scale-6': ['1.953rem', { lineHeight: '2.5rem' }],
        'scale-7': ['2.441rem', { lineHeight: '3rem' }],
        'scale-8': ['3.052rem', { lineHeight: '3.5rem' }],
      },
      borderRadius: {
        xl: '12px',
      },
      boxShadow: {
        'glow-accent': '0 0 20px rgba(167, 139, 250, 0.15)',
        'glow-accent-md': '0 0 30px rgba(167, 139, 250, 0.25)',
        card: '0 4px 24px rgba(0,0,0,0.4)',
      },
      backdropBlur: {
        xs: '4px',
      },
      animation: {
        'fade-up': 'fadeUp 0.5s ease forwards',
        'fade-in': 'fadeIn 0.3s ease forwards',
        'scale-in': 'scaleIn 0.3s ease forwards',
        'bar-fill': 'barFill 1s ease forwards',
        'count-up': 'countUp 1s ease forwards',
      },
      keyframes: {
        fadeUp: {
          from: { opacity: '0', transform: 'translateY(16px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        scaleIn: {
          from: { opacity: '0', transform: 'scale(0.95)' },
          to: { opacity: '1', transform: 'scale(1)' },
        },
      },
    },
  },
  plugins: [],
}
