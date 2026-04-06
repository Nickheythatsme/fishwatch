import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        signal: {
          great: '#22c55e',
          good: '#eab308',
          fair: '#f97316',
          poor: '#ef4444',
        },
      },
    },
  },
  plugins: [],
}

export default config
