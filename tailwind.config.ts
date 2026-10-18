import type { Config } from "tailwindcss";

const config: Config = {
  // ธีมสลับด้วย data-theme ที่ <html> (ดู components/themetoggle.tsx) — สี navy/gray/ink อ่านจาก CSS variables
  darkMode: ['selector', '[data-theme="dark"]'],
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          50: 'rgb(var(--navy-50) / <alpha-value>)',
          100: 'rgb(var(--navy-100) / <alpha-value>)',
          200: 'rgb(var(--navy-200) / <alpha-value>)',
          300: 'rgb(var(--navy-300) / <alpha-value>)',
          400: 'rgb(var(--navy-400) / <alpha-value>)',
          500: 'rgb(var(--navy-500) / <alpha-value>)',
          600: 'rgb(var(--navy-600) / <alpha-value>)',
          700: 'rgb(var(--navy-700) / <alpha-value>)',
          800: 'rgb(var(--navy-800) / <alpha-value>)',
          900: 'rgb(var(--navy-900) / <alpha-value>)',
          950: 'rgb(var(--navy-950) / <alpha-value>)',
        },
        gray: {
          50: 'rgb(var(--gray-50) / <alpha-value>)',
          100: 'rgb(var(--gray-100) / <alpha-value>)',
          200: 'rgb(var(--gray-200) / <alpha-value>)',
          300: 'rgb(var(--gray-300) / <alpha-value>)',
          400: 'rgb(var(--gray-400) / <alpha-value>)',
          500: 'rgb(var(--gray-500) / <alpha-value>)',
          600: 'rgb(var(--gray-600) / <alpha-value>)',
          700: 'rgb(var(--gray-700) / <alpha-value>)',
          800: 'rgb(var(--gray-800) / <alpha-value>)',
          900: 'rgb(var(--gray-900) / <alpha-value>)',
          950: 'rgb(var(--gray-950) / <alpha-value>)',
        },
        ink: 'rgb(var(--ink) / <alpha-value>)',
        gold: {
          50: '#fef9e7',
          100: '#fdf2c3',
          200: '#fbe58a',
          300: '#f9d851',
          400: '#f7cb28',
          500: '#d4a825',
          600: '#b8921e',
          700: '#9c7c17',
          800: '#806510',
          900: '#6b4f0e',
        },
      },
      fontFamily: {
        sans: ['Sarabun', 'Noto Sans Thai', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
export default config;
