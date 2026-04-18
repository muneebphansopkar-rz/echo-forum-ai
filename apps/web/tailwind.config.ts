import type { Config } from 'tailwindcss';

/**
 * Tokens mirror html/skep-forum-updated.html (+ project/DESIGN-SYSTEM.json).
 * Everything is driven by CSS custom properties in src/app/globals.css so
 * runtime theming stays a one-file change. Never use raw hex in components.
 */
const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // shadcn / base semantic
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },

        // SKEP brand chrome
        navy: 'hsl(var(--skep-navy))',
        'navy-hover': 'hsl(var(--skep-navy-hover))',
        'brand-blue': 'hsl(var(--skep-blue))',
        'brand-blue-light': 'hsl(var(--skep-blue-light))',
        'brand-blue-mid': 'hsl(var(--skep-blue-mid))',

        // Surfaces + text
        'page-bg': 'hsl(var(--skep-page-bg))',
        'sidebar-bg': 'hsl(var(--skep-sidebar-bg))',
        'card-bg': 'hsl(var(--skep-card-bg))',
        'border-strong': 'hsl(var(--skep-border))',
        'border-light': 'hsl(var(--skep-border-light))',
        'text-primary': 'hsl(var(--skep-text-primary))',
        'text-secondary': 'hsl(var(--skep-text-secondary))',
        'text-muted': 'hsl(var(--skep-text-muted))',

        // Tag palette — reused by both F1 feed chips and F2 compose picker
        'tag-launches': 'hsl(var(--skep-blue))',
        'tag-launches-bg': 'hsl(var(--skep-blue-light))',
        'tag-feedback': 'hsl(var(--skep-teal))',
        'tag-feedback-bg': 'hsl(var(--skep-teal-light))',
        'tag-tools': 'hsl(var(--skep-purple))',
        'tag-tools-bg': 'hsl(var(--skep-purple-light))',
        'tag-questions': 'hsl(var(--skep-amber))',
        'tag-questions-bg': 'hsl(var(--skep-amber-light))',
        'tag-hiring': 'hsl(var(--skep-pink))',
        'tag-hiring-bg': 'hsl(var(--skep-pink-light))',
        'tag-announcements': 'hsl(var(--skep-green))',
        'tag-announcements-bg': 'hsl(var(--skep-green-light))',
        'status-pinned': 'hsl(var(--skep-amber))',
        'status-pinned-bg': 'hsl(var(--skep-amber-light))',
        'status-locked': 'hsl(var(--skep-red))',
        'status-locked-bg': 'hsl(var(--skep-red-light))',
        'status-mod': 'hsl(var(--skep-purple))',
        'status-mod-bg': 'hsl(var(--skep-purple-light))',
      },
      borderRadius: {
        // Map to the explicit px scale from the source of truth.
        sm: 'var(--skep-radius-sm)',
        md: 'var(--skep-radius-md)',
        lg: 'var(--skep-radius-lg)',
        xl: 'var(--skep-radius-xl)',
      },
      boxShadow: {
        'skep-sm': 'var(--skep-shadow-sm)',
        'skep-md': 'var(--skep-shadow-md)',
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'Inter', 'system-ui', 'sans-serif'],
      },
      maxWidth: {
        'forum-center': '820px',
        'compose-wrap': '1180px',
      },
    },
  },
  plugins: [],
};

export default config;
