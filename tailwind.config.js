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
        // -------------------------------------------------------------
        // PRIMARY — Pasture / sage green.
        // Cooler, more pastoral than emerald. Reads "fresh dairy field"
        // rather than "tech green". Mid-tones (500/600) carry CTAs.
        // -------------------------------------------------------------
        primary: {
          50:  '#f3f7f2',
          100: '#e2ede0',
          200: '#c2dabe',
          300: '#94bf8d',
          400: '#67a161',
          500: '#468445',
          600: '#356b36',
          700: '#2a552d',
          800: '#1f3f23',
          900: '#142b18',
        },
        // -------------------------------------------------------------
        // SECONDARY — Cream butter / hay. The dairy "warmth" anchor.
        // 50–200 are surface tints (oatmilk / cream); 300–500 are
        // accent fills used for prices, badges, golden hour CTAs.
        // -------------------------------------------------------------
        secondary: {
          50:  '#fbf6ea',
          100: '#f5ebd0',
          200: '#ecd9a3',
          300: '#dfc173',
          400: '#cfa748',
          500: '#b88a2b',
          600: '#946d20',
          700: '#705219',
          800: '#4d3812',
          900: '#2e220c',
        },
        // -------------------------------------------------------------
        // ACCENT — Terracotta / sunbaked clay. Used sparingly for
        // hover-glows, wishlist heart, and rare emphasis.
        // -------------------------------------------------------------
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
        // -------------------------------------------------------------
        // SURFACE — Sand / bone / milk. The whole site sits on these.
        // 50 is the page background (warm, never sterile); 100–200 are
        // card backgrounds; 700+ are body text.
        // -------------------------------------------------------------
        surface: {
          0:   '#ffffff',
          50:  '#faf7f0',   // sand-cream page bg
          100: '#f3eee2',   // oat
          200: '#e7e0cd',   // dry hay
          300: '#d2c8ad',
          400: '#a89e83',
          500: '#7e7560',
          600: '#5c5544',
          700: '#403b2f',
          800: '#2a2620',
          900: '#1c1a15',
          ink: '#181612',
        },
        // -------------------------------------------------------------
        // DAIRY — Branded utility tints to keep the "milk + meadow"
        // language explicit at component sites (chips, gradients).
        // -------------------------------------------------------------
        dairy: {
          milk:    '#fbfaf5',
          cream:   '#f6efdc',
          butter:  '#f1d98e',
          oat:     '#e9dec0',
          moss:    '#5d8a55',
          forest:  '#2a552d',
          terracotta: '#c76a48',
          earth:   '#7c5a3a',
        },
      },
      fontFamily: {
        // Modern, friendly geometric sans for body + UI.
        sans:    ['var(--font-jakarta)', 'Plus Jakarta Sans', 'Inter', 'system-ui', 'sans-serif'],
        // Editorial serif for display headlines.
        display: ['var(--font-fraunces)', 'Fraunces', 'Georgia', 'serif'],
        // Tech-leaning numeric for stats / prices (futuristic feel).
        mono:    ['var(--font-jetbrains)', 'JetBrains Mono', 'ui-monospace', 'monospace'],
      },
      fontSize: {
        // Editorial display scale — used for hero + section headings.
        'display-2xl': ['clamp(2.75rem, 6vw + 0.5rem, 5.75rem)', { lineHeight: '0.95', letterSpacing: '-0.035em', fontWeight: '500' }],
        'display-xl':  ['clamp(2rem, 4vw + 0.5rem, 4rem)', { lineHeight: '1', letterSpacing: '-0.03em', fontWeight: '500' }],
        'display-lg':  ['clamp(1.65rem, 2.5vw + 0.5rem, 2.6rem)', { lineHeight: '1.05', letterSpacing: '-0.02em', fontWeight: '500' }],
        'display-md':  ['1.65rem', { lineHeight: '1.1', letterSpacing: '-0.015em', fontWeight: '500' }],
        'eyebrow':     ['0.7rem', { lineHeight: '1', letterSpacing: '0.22em', fontWeight: '700' }],
      },
      borderRadius: {
        'xl':  '0.875rem',
        '2xl': '1.25rem',
        '3xl': '1.75rem',
        '4xl': '2.25rem',
      },
      boxShadow: {
        // Flat, sophisticated — avoids the default blurry "card drop".
        'soft':    '0 1px 2px rgba(28, 26, 21, 0.04), 0 2px 6px rgba(28, 26, 21, 0.04)',
        'lift':    '0 2px 4px rgba(28, 26, 21, 0.04), 0 10px 30px -8px rgba(28, 26, 21, 0.12)',
        'float':   '0 6px 14px -6px rgba(28, 26, 21, 0.12), 0 22px 48px -12px rgba(28, 26, 21, 0.18)',
        'glow':    '0 0 0 1px rgba(70, 132, 69, 0.18), 0 18px 40px -16px rgba(70, 132, 69, 0.45)',
        'inner-soft': 'inset 0 1px 0 rgba(255, 255, 255, 0.6)',
      },
      animation: {
        'skeleton':   'skeleton 1.5s ease-in-out infinite',
        'fade-in':    'fadeIn 0.5s ease-out',
        'slide-up':   'slideUp 0.6s cubic-bezier(0.22, 1, 0.36, 1)',
        'slide-down': 'slideDown 0.3s ease-out',
        'bounce-in':  'bounceIn 0.6s ease-out',
        'pulse-soft': 'pulseSoft 2s ease-in-out infinite',
        'reveal':     'reveal 0.9s cubic-bezier(0.22, 1, 0.36, 1) both',
        'marquee':    'marquee 40s linear infinite',
        'page-turn':  'pageTurn 28s linear infinite',
        'float-slow': 'floatSlow 6s ease-in-out infinite',
        'shimmer':    'shimmer 2.4s linear infinite',
        // Slow Ken Burns zoom + drift used on the active hero slide.
        'ken-burns':  'kenBurns 12s ease-out forwards',
        // Breathing emerald ring used on the primary "Become a seller" CTA.
        'pulse-glow': 'pulseGlow 2.6s ease-in-out infinite',
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
        pageTurn: {
          '0%':   { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
        floatSlow: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%':      { transform: 'translateY(-6px)' },
        },
        shimmer: {
          '0%':   { transform: 'translateX(-120%)' },
          '100%': { transform: 'translateX(220%)' },
        },
        kenBurns: {
          '0%':   { transform: 'scale(1) translate(0, 0)' },
          '100%': { transform: 'scale(1.08) translate(-1.5%, -1%)' },
        },
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(70, 132, 69, 0.55), 0 18px 40px -16px rgba(70, 132, 69, 0.45)' },
          '50%':      { boxShadow: '0 0 0 14px rgba(70, 132, 69, 0), 0 22px 50px -16px rgba(70, 132, 69, 0.65)' },
        },
      },
      backgroundImage: {
        'grain':       "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.32 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
        'radial-fade': 'radial-gradient(120% 80% at 50% 0%, rgba(53, 107, 54, 0.12) 0%, rgba(53, 107, 54, 0) 60%)',
        'meadow':      'linear-gradient(135deg, #f6efdc 0%, #fbfaf5 45%, #e2ede0 100%)',
        'cream-fade':  'linear-gradient(180deg, #faf7f0 0%, #f3eee2 100%)',
      },
    },
  },
  plugins: [],
}
