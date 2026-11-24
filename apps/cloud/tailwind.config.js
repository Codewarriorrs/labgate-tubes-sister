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
          DEFAULT: '#1A1A1A',
          hover: '#333333',
          dark: '#000000',
        },
        secondary: {
          DEFAULT: '#4A4A4A',
          hover: '#666666',
        },
        tertiary: {
          DEFAULT: '#0066FF',
          hover: '#0052CC',
        },
        accent: {
          DEFAULT: '#0066FF',
          hover: '#0052CC',
        },
        canvas: '#FFFFFF',
        surface: {
          DEFAULT: '#FFFFFF',
          muted: '#F8F9FA',
          border: '#E5E7EB',
          subtle: '#F3F4F6',
        },
        danger: {
          DEFAULT: '#DC2626',
          hover: '#B91C1C',
        },
        success: {
          DEFAULT: '#16A34A',
          hover: '#15803D',
        },
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', 'Helvetica', 'Arial', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
      },
      borderRadius: {
        sm: '2px',
        DEFAULT: '4px',
        md: '4px',
        lg: '8px',
      },
    },
  },
  plugins: [],
};
