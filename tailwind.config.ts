import type { Config } from "tailwindcss";

const config: Config = {
  theme: {
    extend: {
      fontFamily: {
        gotham: ["var(--font-gotham)", "ui-sans-serif", "system-ui", "sans-serif"],
        sans: ["var(--font-gotham)", "ui-sans-serif", "system-ui", "sans-serif"],
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
      },
      boxShadow: {
        sm: "var(--shadow-sm)",
        md: "var(--shadow-md)",
        lg: "var(--shadow-lg)",
        card: "var(--shadow-card)",
        "card-default": "var(--shadow-card-default)",
      },
      borderRadius: {
        sm: "var(--radius-sm)",
        md: "var(--radius-md)",
        lg: "var(--radius-lg)",
      },
      spacing: {
        "18": "4.5rem",
        "22": "5.5rem",
      },
    },
  },
};

export default config;
