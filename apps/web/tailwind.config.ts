import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        headline: ['var(--font-headline)', 'serif'],
        body: ['var(--font-body)', 'sans-serif'],
        label: ['var(--font-body)', 'sans-serif'],
      },
      colors: {
        // Material 3 token palette — "The Tactile Cartographer". Values sourced
        // verbatim from the Stitch prototype design system.
        primary: '#0f426f',
        'primary-container': '#2e5a88',
        'on-primary': '#ffffff',
        'on-primary-container': '#aed1ff',
        'primary-fixed': '#d2e4ff',
        'primary-fixed-dim': '#a0cafe',
        'on-primary-fixed': '#001d36',
        'on-primary-fixed-variant': '#194976',

        secondary: '#50653e',
        'secondary-container': '#cce5b4',
        'on-secondary': '#ffffff',
        'on-secondary-container': '#526740',
        'secondary-fixed': '#d2eab9',
        'secondary-fixed-dim': '#b6ce9f',
        'on-secondary-fixed': '#0e2002',
        'on-secondary-fixed-variant': '#394c28',

        tertiary: '#5b3918',
        'tertiary-container': '#754f2d',
        'on-tertiary': '#ffffff',
        'on-tertiary-container': '#f8c499',
        'tertiary-fixed': '#ffdcc1',
        'tertiary-fixed-dim': '#f0bc92',
        'on-tertiary-fixed': '#2e1500',
        'on-tertiary-fixed-variant': '#623f1e',

        error: '#ba1a1a',
        'error-container': '#ffdad6',
        'on-error': '#ffffff',
        'on-error-container': '#93000a',

        background: '#f8faf9',
        'on-background': '#191c1c',
        surface: '#f8faf9',
        'surface-dim': '#d8dada',
        'surface-bright': '#f8faf9',
        'surface-container-lowest': '#ffffff',
        'surface-container-low': '#f2f4f3',
        'surface-container': '#eceeee',
        'surface-container-high': '#e7e8e8',
        'surface-container-highest': '#e1e3e2',
        'surface-variant': '#e1e3e2',
        'surface-tint': '#35618f',
        'on-surface': '#191c1c',
        'on-surface-variant': '#42474f',
        'inverse-surface': '#2e3131',
        'inverse-on-surface': '#eff1f1',
        'inverse-primary': '#a0cafe',

        outline: '#737780',
        'outline-variant': '#c2c7d0',
      },
    },
  },
  plugins: [],
}

export default config
