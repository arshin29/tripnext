import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        background: '#F7F5F0',
        surface: '#FFFFFF',
        'primary-text': '#252A25',
        'secondary-text': '#85877F',
        accent: {
          DEFAULT: '#66836B',
          hover: '#55705A',
          bg: '#EAF0E9',
        },
        border: '#E9E7E0',
      },
      fontFamily: {
        sans: ['var(--font-geist-sans)', 'system-ui', 'sans-serif'],
        serif: ['var(--font-geist-sans)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-geist-mono)', 'monospace'],
      },
      boxShadow: {
        subtle: '0 1px 3px 0 rgba(37, 42, 37, 0.05), 0 1px 2px 0 rgba(37, 42, 37, 0.03)',
        card: '0 4px 12px 0 rgba(37, 42, 37, 0.06)',
        lifted: '0 10px 24px -4px rgba(37, 42, 37, 0.08)',
      },
    },
  },
  plugins: [],
};

export default config;
