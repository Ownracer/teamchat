/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        teal: {
          500: '#14B8A6',
          600: '#0D9488',
          700: '#0F766E',
        },
      },
    },
  },
  plugins: [],
}

