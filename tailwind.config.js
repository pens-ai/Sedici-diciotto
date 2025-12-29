/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#6b4ce6',
          50: '#f9f7ff',
          100: '#f3efff',
          200: '#e7deff',
          300: '#d4c2ff',
          400: '#b99bff',
          500: '#9d74ff',
          600: '#6b4ce6',
          700: '#5a3ec4',
          800: '#4a329f',
          900: '#3d2982',
        },
        gray: {
          50: '#fafafa',
          100: '#f0f0f2',
          200: '#e8e8ea',
          300: '#d1d1d6',
          400: '#a1a1a8',
          500: '#86868b',
          600: '#6e6e73',
          700: '#515154',
          800: '#3a3a3c',
          900: '#1c1c1e',
        }
      },
      borderRadius: {
        'xl': '12px',
        '2xl': '16px',
        '3xl': '24px',
      },
      boxShadow: {
        'card': '0 2px 8px rgba(0, 0, 0, 0.08)',
        'card-hover': '0 4px 16px rgba(0, 0, 0, 0.12)',
      }
    },
  },
  plugins: [],
}
