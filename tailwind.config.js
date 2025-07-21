/** @type {import('tailwindcss').Config} */
export default {
  content: ['./**/*.html', './js/**/*.{js,ts}'],
  safelist: [
    'bg-handlebar-blue',
    'bg-default-bg'
  ],
  theme: {
    extend: {
      colors: {
        'handlebar-blue': '#003f7f',  // Strong RGB blue for window title bars
        'default-bg': '#c0c0c0'  // Gray background like Windows 95
      }
    }
  },
  plugins: [],
}
