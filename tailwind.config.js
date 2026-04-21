/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,jsx}',
    './components/**/*.{js,jsx}',
    './app/**/*.{js,jsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Forest / moss-green: richer and more grounded than the
        // previous bright emerald. Darker mid-tones feel confident
        // on cream surfaces.
        primary: {
          50:  '#f2f7f2',
          100: '#dcebdd',
          200: '#b9d5bc',
          300: '#8ab893',
          400: '#5d9a6a',
          500: '#3f7d4f',
          600: '#2f6540',
          700: '#255034',
          800: '#1f402c',
          900: '#162d1f',
        },
        // Warm amber / hay — used sparingly for price accents and
        // "negotiable" / auction badges.
        secondary: {
          50:  '#fdf8ee',
          100: '#faeccb',
          200: '#f4d88d',
          300: '#edbf5a',
          400: '#e5a537',
          500: '#c88820',
          600: '#a06817',
          700: '#7a4f14',
          800: '#553713',
          900: '#38240f',
        },
        // Terracotta accent — for hover/focus glows and rare CTAs.
        accent: {
          50:  '#fbf1ec',
          100: '#f4dacc',
          200: '#e7b39a',
          300: '#d98b6b',
          400: '#c76a48',
          500: '#a8502f',
          600: '#853e24',
          700: '#602d1b',
          800: '#3d1d13',
          900: '#22100b',
        },
        // Cream / bone surfaces — softer than stone-50 so cards
        // feel elevated without heavy shadows.
        surface: {
          0:   '#ffffff',
          50:  '#fbfaf7',
          100: '#f5f3ec',
          200: '#ebe7d9',
          300: '#d9d3bf',
          400: '#b9b19a',
          500: '#8f8775',
          600: '#6b6557',
          700: '#4d483d',
          800: '#33302a',
          900: '#24221e',
          ink: '#1a1a17',
        },
      },
      fontFamily: {
        sans:    ['var(--font-inter)', 'Inter', 'system-ui', 'sans-serif'],
        display: ['var(--font-fraunces)', 'Fraunces', 'Georgia', 'serif'],
      },
      fontSize: {
        // Editorial display scale — used for hero + section headings.
        'display-2xl': ['clamp(3rem, 6vw + 1rem, 6rem)', { lineHeight: '0.95', letterSpacing: '-0.035em', fontWeight: '500' }],
        'display-xl':  ['clamp(2.25rem, 4vw + 0.5rem, 4.25rem)', { lineHeight: '1', letterSpacing: '-0.03em', fontWeight: '500' }],
        'display-lg':  ['clamp(1.75rem, 2.5vw + 0.5rem, 2.75rem)', { lineHeight: '1.05', letterSpacing: '-0.02em', fontWeight: '500' }],
        'display-md':  ['1.75rem', { lineHeight: '1.1', letterSpacing: '-0.015em', fontWeight: '500' }],
        'eyebrow':     ['0.75rem', { lineHeight: '1', letterSpacing: '0.18em', fontWeight: '600' }],
      },
      borderRadius: {
        'xl':  '0.875rem',
        '2xl': '1.25rem',
        '3xl': '1.75rem',
      },
      boxShadow: {
        // Flat, sophisticated — avoids the default blurry "card drop".
        'soft':    '0 1px 2px rgba(20, 26, 20, 0.04), 0 2px 6px rgba(20, 26, 20, 0.04)',
        'lift':    '0 2px 4px rgba(20, 26, 20, 0.04), 0 10px 30px -8px rgba(20, 26, 20, 0.12)',
        'float':   '0 6px 14px -6px rgba(20, 26, 20, 0.12), 0 22px 48px -12px rgba(20, 26, 20, 0.18)',
        'inner-soft': 'inset 0 1px 0 rgba(255, 255, 255, 0.6)',
      },
      animation: {
        'skeleton':  'skeleton 1.5s ease-in-out infinite',
        'fade-in':   'fadeIn 0.5s ease-out',
        'slide-up':  'slideUp 0.6s cubic-bezier(0.22, 1, 0.36, 1)',
        'slide-down':'slideDown 0.3s ease-out',
        'bounce-in': 'bounceIn 0.6s ease-out',
        'pulse-soft':'pulseSoft 2s ease-in-out infinite',
        'reveal':    'reveal 0.9s cubic-bezier(0.22, 1, 0.36, 1) both',
        'marquee':   'marquee 40s linear infinite',
      },
      keyframes: {
        skeleton: {
          '0%, 100%': { opacity: '0.5' },
          '50%':      { opacity: '1' },
        },
        fadeIn: {
          '0%':   { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%':   { opacity: '0', transform: 'translateY(24px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideDown: {
          '0%':   { opacity: '0', transform: 'translateY(-10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        bounceIn: {
          '0%':   { opacity: '0', transform: 'scale(0.94)' },
          '50%':  { transform: 'scale(1.02)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: '1' },
          '50%':      { opacity: '0.7' },
        },
        reveal: {
          '0%':   { opacity: '0', transform: 'translateY(14px)', filter: 'blur(6px)' },
          '100%': { opacity: '1', transform: 'translateY(0)', filter: 'blur(0)' },
        },
        marquee: {
          '0%':   { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
      },
      backgroundImage: {
        'grain':    "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.35 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
        'radial-fade': 'radial-gradient(120% 80% at 50% 0%, rgba(47,101,64,0.12) 0%, rgba(47,101,64,0) 60%)',
      },
    },
  },
  plugins: [],
}
