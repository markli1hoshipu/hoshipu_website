/** @type {import('tailwindcss').Config} */
export default {
    content: [
      "./index.html",
      "./src/**/*.{js,ts,jsx,tsx}",
    ],
    darkMode: ["class"], // Keep this for potential dark mode toggle
    theme: {
      extend: {
        colors: {
          // Color Template System Integration
          'theme': {
            'primary': {
              '50': 'var(--color-primary-50)',
              '100': 'var(--color-primary-100)',
              '200': 'var(--color-primary-200)',
              '300': 'var(--color-primary-300)',
              '400': 'var(--color-primary-400)',
              '500': 'var(--color-primary-500)',
              '600': 'var(--color-primary-600)',
              '700': 'var(--color-primary-700)',
              '800': 'var(--color-primary-800)',
              '900': 'var(--color-primary-900)',
              DEFAULT: 'var(--color-primary-500)',
            },
            'secondary': {
              '50': 'var(--color-secondary-50)',
              '100': 'var(--color-secondary-100)',
              '200': 'var(--color-secondary-200)',
              '300': 'var(--color-secondary-300)',
              '400': 'var(--color-secondary-400)',
              '500': 'var(--color-secondary-500)',
              '600': 'var(--color-secondary-600)',
              '700': 'var(--color-secondary-700)',
              '800': 'var(--color-secondary-800)',
              '900': 'var(--color-secondary-900)',
              DEFAULT: 'var(--color-secondary-500)',
            },
            'accent': {
              '50': 'var(--color-accent-50)',
              '100': 'var(--color-accent-100)',
              '200': 'var(--color-accent-200)',
              '300': 'var(--color-accent-300)',
              '400': 'var(--color-accent-400)',
              '500': 'var(--color-accent-500)',
              '600': 'var(--color-accent-600)',
              '700': 'var(--color-accent-700)',
              '800': 'var(--color-accent-800)',
              '900': 'var(--color-accent-900)',
              DEFAULT: 'var(--color-accent-500)',
            },
            'background': {
              'primary': 'var(--color-background-primary)',
              'secondary': 'var(--color-background-secondary)',
              'tertiary': 'var(--color-background-tertiary)',
              DEFAULT: 'var(--color-background-primary)',
            },
            'surface': {
              'primary': 'var(--color-surface-primary)',
              'secondary': 'var(--color-surface-secondary)',
              'tertiary': 'var(--color-surface-tertiary)',
              'hover': 'var(--color-surface-hover)',
              'active': 'var(--color-surface-active)',
              DEFAULT: 'var(--color-surface-primary)',
            },
            'text': {
              'primary': 'var(--color-text-primary)',
              'secondary': 'var(--color-text-secondary)',
              'tertiary': 'var(--color-text-tertiary)',
              'inverse': 'var(--color-text-inverse)',
              'placeholder': 'var(--color-text-placeholder)',
              DEFAULT: 'var(--color-text-primary)',
            },
            'border': {
              'primary': 'var(--color-border-primary)',
              'secondary': 'var(--color-border-secondary)',
              'tertiary': 'var(--color-border-tertiary)',
              'focus': 'var(--color-border-focus)',
              'error': 'var(--color-border-error)',
              'success': 'var(--color-border-success)',
              DEFAULT: 'var(--color-border-primary)',
            },
            'status': {
              'success': 'var(--color-status-success-500)',
              'warning': 'var(--color-status-warning-500)',
              'error': 'var(--color-status-error-500)',
              'info': 'var(--color-status-info-500)',
            },
          },
          
          // Legacy Prelude brand colors (for backward compatibility)
          'prelude': {
            50: '#f0f4ff',
            100: '#e0eaff',
            200: '#c7d9ff',
            300: '#a5bfff',
            400: '#7c9eff',
            500: '#5981ff',
            600: '#4263ff',
            700: '#3048ff',
            800: '#031D4A',
            900: '#021537',
            950: '#010c22',
          },
          
          // Keep existing shadcn colors
          border: "hsl(var(--border))",
          input: "hsl(var(--input))",
          ring: "hsl(var(--ring))",
          background: "hsl(var(--background))",
          foreground: "hsl(var(--foreground))",
          primary: {
            DEFAULT: "hsl(var(--primary))",
            foreground: "hsl(var(--primary-foreground))",
          },
          secondary: {
            DEFAULT: "hsl(var(--secondary))",
            foreground: "hsl(var(--secondary-foreground))",
          },
          destructive: {
            DEFAULT: "hsl(var(--destructive))",
            foreground: "hsl(var(--destructive-foreground))",
          },
          muted: {
            DEFAULT: "hsl(var(--muted))",
            foreground: "hsl(var(--muted-foreground))",
          },
          accent: {
            DEFAULT: "hsl(var(--accent))",
            foreground: "hsl(var(--accent-foreground))",
          },
          popover: {
            DEFAULT: "hsl(var(--popover))",
            foreground: "hsl(var(--popover-foreground))",
          },
          card: {
            DEFAULT: "hsl(var(--card))",
            foreground: "hsl(var(--card-foreground))",
          },
        },
        fontFamily: {
          'manrope': ['Manrope', 'sans-serif'],
          'inter': ['Inter', 'sans-serif'],
          'sans': ['Inter', 'system-ui', 'sans-serif'],
          'display': ['Manrope', 'sans-serif'],
        },
        borderRadius: {
          lg: "var(--radius)",
          md: "calc(var(--radius) - 2px)",
          sm: "calc(var(--radius) - 4px)",
        },
        keyframes: {
          "accordion-down": {
            from: { height: "0" },
            to: { height: "var(--radix-accordion-content-height)" },
          },
          "accordion-up": {
            from: { height: "var(--radix-accordion-content-height)" },
            to: { height: "0" },
          },
          fadeIn: {
            from: { opacity: "0" },
            to: { opacity: "1" },
          },
          slideUp: {
            from: { 
              opacity: "0",
              transform: "translateY(20px)"
            },
            to: { 
              opacity: "1",
              transform: "translateY(0)"
            },
          },
        },
        animation: {
          "accordion-down": "accordion-down 0.2s ease-out",
          "accordion-up": "accordion-up 0.2s ease-out",
          "fade-in": "fadeIn 0.6s ease-out",
          "slide-up": "slideUp 0.6s ease-out",
        },
      },
    },
    // Make sure 'tailwindcss-animate' is installed and included if you plan to use animations
    plugins: [require("tailwindcss-animate")],
  }