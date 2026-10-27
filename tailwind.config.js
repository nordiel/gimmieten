/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: '#101018',
          900: '#0b0b11',
          800: '#16161f',
          700: '#1e1e29',
          600: '#2a2a37',
          500: '#3a3a49',
        },
        lime: {
          DEFAULT: '#B9F66B',
          dim: '#8fc24f',
          glow: 'rgba(185, 246, 107, 0.15)',
        },
        bone: '#F2F1EC',
        mute: '#9a9aa8',
        alert: '#FF6B5B',
      },
      fontFamily: {
        display: ['"Space Grotesk"', 'system-ui', 'sans-serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        pop: {
          '0%': { transform: 'scale(0.85)', opacity: '0' },
          '60%': { transform: 'scale(1.05)', opacity: '1' },
          '100%': { transform: 'scale(1)' },
        },
        pulse_urgent: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.55' },
        },
        burst: {
          '0%': { transform: 'translate(0,0) scale(1)', opacity: '1' },
          '100%': { transform: 'translate(var(--dx), var(--dy)) scale(0.4)', opacity: '0' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.45s cubic-bezier(0.2, 0.8, 0.2, 1) both',
        pop: 'pop 0.5s cubic-bezier(0.2, 0.8, 0.2, 1) both',
        urgent: 'pulse_urgent 1s ease-in-out infinite',
        burst: 'burst 0.9s cubic-bezier(0.2, 0.8, 0.2, 1) forwards',
      },
    },
  },
  plugins: [],
};
