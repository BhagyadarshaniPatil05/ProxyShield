/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        shield: {
          dark: '#0a0e17',
          card: '#131b2e',
          border: '#1e293b',
          accent: '#06b6d4',
          highlight: '#38bdf8',
          subtle: '#64748b'
        }
      }
    },
  },
  plugins: [],
}
