import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./app/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        bg: '#080D1A',
        surface: '#0F1629',
        border: '#1E2D4A',
        accent: '#4F8EF7',
        'accent-dim': '#1E3A6E',
        muted: '#8899BB',
        fg: '#E8F0FF',
      },
      fontFamily: {
        sans: ['var(--font-noto)', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

export default config
