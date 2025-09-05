/** @type {import('tailwindcss').Config} */
export default {
  content: ['./**/*.html', './js/**/*.{js,ts}'],
  safelist: [
  'bg-handlebar-blue',
  'bg-default-bg',
  // Ensure dynamic font utilities exist even when used via JS
  'font-sans',
  'font-serif',
  'font-blackletter'
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
