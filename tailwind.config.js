/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
  safelist: [
    { pattern: /(bg|text|border|shadow|from|to|ring)-(emerald|blue|rose|violet|amber)-(50|100|200|300|400|500|600|700|800|900)/ },
    { pattern: /(bg|text|border)-slate-(50|100|200|300|400|500|600|700|800|900)/ },
  ]
}