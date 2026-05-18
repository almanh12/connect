import type { Config } from "tailwindcss";

const config: Config = {
  theme: {
    extend: {
      fontFamily: {
        gotham: ["var(--font-gotham)", "ui-sans-serif", "system-ui", "sans-serif"],
        sans: ["var(--font-gotham)", "ui-sans-serif", "system-ui", "sans-serif"],
        heading: ["var(--font-heading)"],
      },
      colors: {
        "deca-blue": "var(--deca-blue)",
        "deca-blue-dark": "var(--deca-blue-dark)",
        "deca-blue-deeper": "var(--deca-blue-deeper)",
        "deca-blue-light": "var(--deca-blue-light)",
        "deca-blue-muted": "var(--deca-blue-muted)",
        "deca-gold": "var(--deca-gold)",
        "deca-gold-light": "var(--deca-gold-light)",
        "deca-gold-dark": "var(--deca-gold-dark)",
        "achievement-gold": "var(--achievement-gold)",
        "achievement-gold-muted": "var(--achievement-gold-muted)",
        "on-achievement": "var(--on-achievement)",
        gray: {
          50: "var(--gray-50)",
          100: "var(--gray-100)",
          200: "var(--gray-200)",
          300: "var(--gray-300)",
          400: "var(--gray-400)",
          500: "var(--gray-500)",
          600: "var(--gray-600)",
          700: "var(--gray-700)",
          800: "var(--gray-800)",
          900: "var(--gray-900)",
        },
        success: "var(--success)",
        warning: "var(--warning)",
        info: "var(--info)",
        error: "var(--error)",
      },
      boxShadow: {
        sm: "var(--shadow-sm)",
        md: "var(--shadow-md)",
        lg: "var(--shadow-lg)",
        xl: "var(--shadow-xl)",
        elevated: "var(--shadow-elevated)",
        brand: "var(--shadow-brand)",
        card: "var(--shadow-card)",
        "card-default": "var(--shadow-card-default)",
      },
      borderRadius: {
        sm: "var(--radius-sm)",
        md: "var(--radius-md)",
        lg: "var(--radius-lg)",
        panel: "var(--panel-radius)",
        chip: "var(--chip-radius)",
      },
      fontSize: {
        body: "var(--text-body)",
        "metric-number": "var(--metric-number-size)",
      },
      transitionTimingFunction: {
        out: "var(--ease-out)",
        "in-out": "var(--ease-in-out)",
        emphasized: "var(--ease-emphasized)",
      },
      transitionDuration: {
        instant: "var(--duration-instant)",
        fast: "var(--duration-fast)",
        normal: "var(--duration-normal)",
        slow: "var(--duration-slow)",
        slower: "var(--duration-slower)",
      },
      zIndex: {
        dropdown: "var(--z-dropdown)",
        modal: "var(--z-modal)",
        toast: "var(--z-toast)",
        "nav-progress": "var(--z-nav-progress)",
      },
      spacing: {
        "18": "4.5rem",
        "22": "5.5rem",
      },
    },
  },
};

export default config;
