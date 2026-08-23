/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        hero: '#EC612C',
        layerGreen: '#90EE90',
        layerBlue: '#89CFF0',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        bamboly: ['"Bamboly Demo"', 'sans-serif'],
        poppins: ['Poppins', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
