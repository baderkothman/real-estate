import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: 'class',
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#fa6b05',
          hover: '#c85604',
          soft: '#fef0e6',
          strong: '#964003',
        },
        accent: {
          DEFAULT: '#379579',
          soft: '#ecf8f5',
          strong: '#1c4a3c',
        },
        bg: {
          base: '#fcfaf7',
          soft: '#faf7eb',
          surface: '#ffffff',
          muted: '#fef3e7',
        },
        text: {
          primary: '#181411',
          secondary: '#5f554d',
          muted: '#8b8178',
        },
      },
      fontFamily: {
        display: ['Playfair Display', 'Georgia', 'serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['DM Mono', 'Courier New', 'monospace'],
      },
      fontSize: {
        '5xl': ['3rem', { lineHeight: '1.1' }],
        '6xl': ['3.75rem', { lineHeight: '1.05' }],
        '7xl': ['4.5rem', { lineHeight: '1' }],
        '8xl': ['6rem', { lineHeight: '0.95' }],
      },
      borderRadius: {
        xl: '0.75rem',
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
      boxShadow: {
        brand: '0 0 0 1px rgba(250, 107, 5, 0.2)',
        'brand-sm': '0 2px 12px rgba(250, 107, 5, 0.08)',
        'brand-lg': '0 8px 32px rgba(250, 107, 5, 0.15)',
        card: '0 6px 20px rgba(24, 20, 17, 0.06)',
        'card-hover': '0 14px 40px rgba(24, 20, 17, 0.10)',
        lift: '0 24px 80px rgba(24, 20, 17, 0.16)',
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'hero-gradient':
          'linear-gradient(135deg, #fcfaf7 0%, #fef3e7 50%, #fcfaf7 100%)',
      },
      transitionTimingFunction: {
        spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
        smooth: 'cubic-bezier(0.4, 0, 0.2, 1)',
      },
      animation: {
        'fade-in': 'fadeIn 0.4s ease-out both',
        'fade-up': 'fadeUp 0.5s ease-out both',
        'fade-up-sm': 'fadeUpSm 0.4s ease-out both',
        'slide-up': 'slideUp 0.4s ease-out',
        'slide-down': 'slideDown 0.25s ease-out',
        'scale-in': 'scaleIn 0.2s ease-out',
        shimmer: 'shimmer 1.8s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeUp: {
          '0%': { opacity: '0', transform: 'translateY(24px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeUpSm: {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideDown: {
          '0%': { opacity: '0', transform: 'translateY(-8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.96) translateY(-4px)' },
          '100%': { opacity: '1', transform: 'scale(1) translateY(0)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
    },
  },
  plugins: [],
}

export default config
