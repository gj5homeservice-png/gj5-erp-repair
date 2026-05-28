import type {Config} from 'tailwindcss';

export default {
  darkMode: ['class'],
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        body: ['Inter', 'sans-serif'],
        headline: ['Space Grotesk', 'sans-serif'],
        code: ['Source Code Pro', 'monospace'],
      },
      colors: {
        background: '#0B0F19',
        foreground: '#F8FAFC',
        card: {
          DEFAULT: '#111827',
          foreground: '#F8FAFC',
        },
        popover: {
          DEFAULT: '#111827',
          foreground: '#F8FAFC',
        },
        primary: {
          DEFAULT: '#0066FF',
          foreground: '#FFFFFF',
        },
        secondary: {
          DEFAULT: '#1F2937',
          foreground: '#F8FAFC',
        },
        muted: {
          DEFAULT: '#1F2937',
          foreground: '#94A3B8',
        },
        accent: {
          DEFAULT: '#1F2937',
          foreground: '#F8FAFC',
        },
        destructive: {
          DEFAULT: '#FF3366',
          foreground: '#FFFFFF',
        },
        warning: {
          DEFAULT: '#FFD700',
          foreground: '#000000',
        },
        success: {
          DEFAULT: '#10B981',
          foreground: '#FFFFFF',
        },
        border: '#1E293B',
        input: '#1E293B',
        ring: '#0066FF',
        chart: {
          '1': '#0066FF',
          '2': '#FFD700',
          '3': '#FF3366',
          '4': '#10B981',
          '5': '#8B5CF6',
        },
        sidebar: {
          DEFAULT: '#0B0F19',
          foreground: '#94A3B8',
          primary: '#0066FF',
          'primary-foreground': '#FFFFFF',
          accent: '#1E293B',
          'accent-foreground': '#F8FAFC',
          border: '#1E293B',
          ring: '#0066FF',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      keyframes: {
        'accordion-down': {
          from: {
            height: '0',
          },
          to: {
            height: 'var(--radix-accordion-content-height)',
          },
        },
        'accordion-up': {
          from: {
            height: 'var(--radix-accordion-content-height)',
          },
          to: {
            height: '0',
          },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
} satisfies Config;
