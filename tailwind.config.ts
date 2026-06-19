import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          50: '#f0f3f9',
          100: '#d9e0f0',
          200: '#b3c2e1',
          300: '#8da4d2',
          400: '#6786c3',
          500: '#4168b4',
          600: '#1a2744',
          700: '#162039',
          800: '#111a2e',
          900: '#0d1423',
          950: '#0a0f1a',
        },
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
