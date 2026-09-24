/** @type {import('tailwindcss').Config} */
export default {
  // Only classes used in these files end up in main.css.
  content: ['./dist/**/*.html', './dist/assets/js/**/*.js'],
  theme: { extend: {} },
  plugins: [],
};
