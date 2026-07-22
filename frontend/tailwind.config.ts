import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: { DEFAULT: '#2563EB', dark: '#1D4ED8', light: '#EFF6FF', mid: '#DBEAFE' },
        success: { DEFAULT: '#16A34A', light: '#DCFCE7' },
        warning: { DEFAULT: '#D97706', light: '#FEF3C7' },
        danger: { DEFAULT: '#DC2626', light: '#FEE2E2' },
        purple: { DEFAULT: '#7C3AED', light: '#EDE9FE' },
        teal: { DEFAULT: '#0891B2', light: '#E0F7FA' },
        orange: { DEFAULT: '#EA580C', light: '#FFF7ED' },
        surface: { DEFAULT: '#FFFFFF', 2: '#F1F6FB' },
        bg: '#F5F7FA',
        border: { DEFAULT: '#E5EDF4', light: '#EDF2F7' },
        text: { primary: '#152232', secondary: '#5B6B7B', muted: '#8DA0B4' },
      },
      borderRadius: { card: '16px', sm: '10px', xs: '8px' },
      boxShadow: {
        card: '0 1px 2px rgba(21,34,50,0.04), 0 1px 3px rgba(21,34,50,0.03)',
        md: '0 6px 16px rgba(37,99,235,0.10)',
        lg: '0 30px 70px rgba(21,34,50,0.20)',
      },
      backgroundImage: { brand: 'linear-gradient(135deg,#3B82F6 0%,#2563EB 100%)' },
      fontFamily: {
        sans: ['Instrument Sans', 'Inter', '-apple-system', 'sans-serif'],
        serif: ['Newsreader', 'Georgia', 'serif'],
      },
      width: { sidebar: '220px' },
      height: { topbar: '64px' },
    },
  },
  plugins: [],
} satisfies Config
