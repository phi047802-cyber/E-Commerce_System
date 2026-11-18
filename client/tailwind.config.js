/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Inter"', '"Be Vietnam Pro"', 'system-ui', 'sans-serif'],
      },
      colors: {
        app: {
          bg: '#0A0A0A',
          surface: '#141414',
          elevated: '#1C1C1C',
          border: '#2A2A2A',
          red: {
            DEFAULT: '#E11D2E',
            hover: '#B91C1C',
            badge: 'rgba(225, 29, 46, 0.12)',
          },
          text: {
            heading: '#FFFFFF',
            secondary: '#A3A3A3',
            muted: '#6B6B6B',
          },
          status: {
            green: '#22C55E',
            yellow: '#FACC15',
            orange: '#F59E0B',
          },
        },
      },
      borderRadius: {
        'button': '8px',
        'card': '12px',
        'frame': '24px',
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-in-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(4px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
};


