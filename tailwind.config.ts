import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: 'var(--bg)',
        surface: 'var(--surface)',
        raised: 'var(--raised)',
        ink: 'var(--ink)',
        muted: 'var(--muted)',
        line: 'var(--line)',
        brand: 'var(--brand)',
        'brand-ink': 'var(--brand-ink)',
        sun: 'var(--sun)',
        done: 'var(--done)',
        miss: 'var(--miss)',
      },
      fontFamily: {
        display: ['var(--font-display)', 'system-ui', 'sans-serif'],
        body: ['var(--font-body)', 'system-ui', 'sans-serif'],
      },
      keyframes: {
        rise: { '0%': { transform: 'translateY(6px) scale(.96)', opacity: '0' }, '100%': { transform: 'none', opacity: '1' } },
        pop: { '0%': { transform: 'scale(.6)' }, '60%': { transform: 'scale(1.25)' }, '100%': { transform: 'scale(1)' } },
      },
      animation: { rise: 'rise .28s ease-out', pop: 'pop .45s ease-out' },
    },
  },
  plugins: [],
};
export default config;
