/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        lunar: {
          base: '#F4F7FA',
          surface: '#FFFFFF',
          sidebar: '#E9EEF3',
          primary: '#17212B',
          secondary: '#5B6875',
          border: '#D5DDE5',
          accent: '#176B87',
          accentSky: '#3B82A0',
          highlight: '#E3A93B',
          success: '#2E7D5B',
          warning: '#C48A24',
          error: '#B94A48',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'Consolas', 'monospace'],
      }
    },
  },
  plugins: [],
}
