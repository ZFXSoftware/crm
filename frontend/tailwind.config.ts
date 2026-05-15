import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      boxShadow: {
        soft: '0 1px 2px rgba(16,24,40,0.06), 0 1px 3px rgba(16,24,40,0.10)',
      },
      colors: {
        border: 'rgba(16, 24, 40, 0.10)',
        muted: 'rgba(16, 24, 40, 0.55)',
        bg: '#ffffff',
        surface: '#ffffff',
        page: '#f7f8fa',
      },
      borderRadius: {
        card: '14px',
      },
    },
  },
  plugins: [],
} satisfies Config
