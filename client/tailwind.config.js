/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Be Vietnam Pro"', 'Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        game: {
          bg: '#0A0A1F',
          surface: '#12122A',
          card: '#15152E',
          cardHover: '#1B1B3D',
          border: 'rgba(255, 255, 255, 0.08)',
          borderHover: 'rgba(168, 85, 247, 0.4)',
        },
        brand: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          500: '#7C3AED',
          600: '#6D28D9',
          700: '#5B21B6',
          900: '#4C1D95',
          purple: '#7C3AED',
          violet: '#A855F7',
          pink: '#EC4899',
          cyan: '#22D3EE',
          online: '#22C55E',
          star: '#FACC15',
        },
      },
      boxShadow: {
        'glow-purple': '0 0 25px -5px rgba(168, 85, 247, 0.4)',
        'glow-purple-lg': '0 0 35px -5px rgba(124, 58, 237, 0.5)',
        'glow-cyan': '0 0 20px -5px rgba(34, 211, 238, 0.4)',
        'card': '0 8px 30px rgba(0, 0, 0, 0.4)',
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
      animation: {
        'pulse-subtle': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
    },
  },
  plugins: [],
};
