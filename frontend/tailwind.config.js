/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        genba: {
          dark: '#1e293b',
          surface: '#f8fafc',
          border: '#cbd5e1',
          primary: '#0f766e', // high contrast industrial teal
          warning: '#b45309', // high visibility amber
          danger: '#be123c',  // industrial crimson
        }
      }
    },
  },
  plugins: [],
}
