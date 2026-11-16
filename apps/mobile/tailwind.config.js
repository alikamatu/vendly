/**
 * Mirrors the web app's design tokens (apps/web/app/globals.css) so the
 * mobile app shares the exact same black / red / neutral palette.
 *
 * @type {import('tailwindcss').Config}
 */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  darkMode: 'class',
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        primary: { DEFAULT: '#000000', foreground: '#ffffff' },
        accent: { DEFAULT: '#ef4444', foreground: '#ffffff' },
        surface: { DEFAULT: '#f7f8fa', dark: '#141414' },
        border: { DEFAULT: '#e2e4e9', dark: '#262626' },
        muted: { DEFAULT: '#6b7280', dark: '#a3a3a3' },
      },
    },
  },
  plugins: [],
};
