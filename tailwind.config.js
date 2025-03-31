/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'brand': {
          DEFAULT: '#cc2200',
          50: '#fff5f5',
          100: '#ffe3e3',
          200: '#ffcccc',
          300: '#ff9999',
          400: '#ff6666',
          500: '#ff3333',
          600: '#cc2200', // Primary brand color
          700: '#991a00',
          800: '#661100',
          900: '#330900',
        },
        'accent': {
          DEFAULT: '#ff6b00',
          50: '#fff7e6',
          100: '#ffecd1',
          200: '#ffd699',
          300: '#ffbf66',
          400: '#ffa833',
          500: '#ff9100',
          600: '#ff6b00', // Secondary accent color
          700: '#cc5500',
          800: '#994000',
          900: '#662a00',
        }
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
        heading: ['var(--font-poppins)', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'card': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
      }
    },
  },
  plugins: [],
} 