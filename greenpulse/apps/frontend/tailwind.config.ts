import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'Consolas', 'monospace'],
      },
      colors: {
        gp: {
          bg:     '#0f1117',
          s1:     '#161b27',
          s2:     '#1a2030',
          s3:     '#1f2638',
          accent: '#22d3a5',
          cyan:   '#38bdf8',
          t1:     '#fafafa',
          t2:     '#71717a',
          t3:     '#3f3f46',
        },
      },
      animation: {
        'shimmer':    'shimmer 1.5s ease-in-out infinite',
        'glow-pulse': 'glow-pulse 2s ease-in-out infinite',
        'slide-up':   'slide-up 0.35s cubic-bezier(0.16,1,0.3,1) both',
        'fade-in':    'fade-in 0.25s ease both',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4,0,0.6,1) infinite',
        'spin-slow':  'spin 3s linear infinite',
      },
      keyframes: {
        shimmer: {
          '0%':   { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition:  '200% 0' },
        },
        'glow-pulse': {
          '0%, 100%': { opacity: '1' },
          '50%':       { opacity: '0.6' },
        },
        'slide-up': {
          from: { opacity: '0', transform: 'translateY(10px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': {
          from: { opacity: '0' },
          to:   { opacity: '1' },
        },
      },
      boxShadow: {
        'card':  '0 0 0 1px rgba(255,255,255,0.06), 0 4px 24px rgba(0,0,0,0.5)',
        'modal': '0 0 0 1px rgba(255,255,255,0.09), 0 24px 80px rgba(0,0,0,0.75)',
        'glow':  '0 0 20px rgba(34,211,165,0.25)',
        'glow-indigo': '0 0 20px rgba(129,140,248,0.25)',
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'shimmer-bg': 'linear-gradient(90deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.07) 50%, rgba(255,255,255,0.03) 100%)',
      },
    },
  },
  plugins: [],
} satisfies Config;
