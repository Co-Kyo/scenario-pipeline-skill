import type { Config } from 'tailwindcss';

/**
 * Tailwind configuration extending the existing dashboard-template.html CSS variables
 * as design tokens. This ensures visual consistency between the old vanilla JS dashboard
 * and the new React-based dashboard.
 *
 * Color values are sourced from dashboard-template.html :root CSS variables.
 */
const config: Config = {
  content: [
    './index.html',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Core palette — evolved from dashboard-template.html CSS variables
        bg: '#0a0a0f',
        surface: '#12121a',
        surface2: '#1a1a25',
        border: '#2a2a3a',
        text: '#e8e8f0',
        text2: '#8888a0',
        accent: '#6c5ce7',
        accent2: '#a29bfe',
        green: '#00b894',
        yellow: '#fdcb6e',
        red: '#e17055',
        blue: '#74b9ff',
        orange: '#fab1a0',
        // Tech layer colors
        'layer-browser': '#6c5ce7',
        'layer-network': '#00b894',
        'layer-runtime': '#e17055',
        'layer-engineering': '#fdcb6e',
        'layer-tool': '#74b9ff',
        'layer-security': '#d63031',
      },
      fontFamily: {
        sans: ['-apple-system', 'Segoe UI', 'system-ui', 'sans-serif'],
        mono: ['SF Mono', 'Consolas', 'monospace'],
      },
      fontSize: {
        '2xs': ['10px', '1.4'],
        '3xs': ['8px', '1.2'],
      },
      borderRadius: {
        'xl2': '12px',
      },
      animation: {
        'pulse-slow': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-in': 'fadeIn 0.3s ease-in-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(4px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
