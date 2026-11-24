/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#0f766e', // Dark Tosca / Teal
          hover: '#115e59',
          dark: '#134e4a',
          light: '#14b8a6',
          border: '#134e4a',
          50: '#f0fdfa',
          100: '#ccfbf1',
          200: '#99f6e4',
        },
        background: '#ddf4ff', // Duolingo pale sky canvas
        canvas: '#ddf4ff',
        surface: {
          DEFAULT: '#ffffff',
          strong: '#f8fafc',
          subtle: '#f1f5f9',
          border: '#dbeafe',
        },
        text: {
          DEFAULT: '#3c3c3c', // Duolingo charcoal body text
          muted: '#777777',   // Duolingo gray
          dark: '#111111',
        },
        accent: {
          DEFAULT: '#1cb0f6', // Duolingo vivid sky blue accent
          hover: '#0284c7',
          dark: '#0369a1',
        },
        mint: {
          DEFAULT: '#10b981',
          hover: '#059669',
          dark: '#047857',
        },
        danger: {
          DEFAULT: '#ef4444',
          hover: '#dc2626',
          dark: '#b91c1c',
        },
      },
      fontFamily: {
        sans: ['Quicksand', 'Nunito', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        'xl': '12px',
        '2xl': '16px',
        '3xl': '20px',
      },
    },
  },
  plugins: [],
};
