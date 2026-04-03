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
          hot: '#ef4444',
          warm: '#f97316',
          mild: '#eab308',
          cool: '#22c55e',
          cold: '#3b82f6',
        },
      },
    },
  },
  plugins: [],
}

export default config
