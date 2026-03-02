/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Space Grotesk', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        glass: '0 10px 40px rgba(15, 23, 42, 0.14)',
      },
      backgroundImage: {
        mesh: 'radial-gradient(circle at 15% 20%, rgba(56, 189, 248, 0.25), transparent 40%), radial-gradient(circle at 85% 10%, rgba(14, 165, 233, 0.18), transparent 38%), radial-gradient(circle at 50% 90%, rgba(147, 197, 253, 0.22), transparent 45%)',
      },
    },
  },
  plugins: [],
};
