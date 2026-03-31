/**
 * Design system tokens for DECA Engage.
 * Matches globals.css and DECA brand guidelines.
 */
export const TOKENS = {
  radius: {
    sm: "var(--radius-sm)",
    md: "var(--radius-md)",
    lg: "var(--radius-lg)",
    full: "var(--radius-full)",
  },
  shadow: {
    sm: "var(--shadow-sm)",
    md: "var(--shadow-md)",
    lg: "var(--shadow-lg)",
    card: "var(--shadow-card)",
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
    white: "var(--white)",
    gray: {
      50: "var(--gray-50)",
      100: "var(--gray-100)",
      200: "var(--gray-200)",
      300: "var(--gray-300)",
      500: "var(--gray-500)",
      700: "var(--gray-700)",
      900: "var(--gray-900)",
    },
    success: "var(--success)",
    warning: "var(--warning)",
    error: "var(--error)",
  },
  spacing: {
    pagePadding: "1rem",
    pagePaddingLg: "1.5rem",
    contentMaxWidth: "1280px",
  },
} as const;
