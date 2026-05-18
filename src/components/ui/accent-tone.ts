export type AccentTone = "blue" | "gold" | "success" | "warning";

export const ACCENT_TONE_STYLES: Record<
  AccentTone,
  { accent: string; tint: string }
> = {
  blue: {
    accent: "var(--deca-blue)",
    tint: "var(--deca-blue-light)",
  },
  gold: {
    accent: "var(--achievement-gold)",
    tint: "var(--achievement-gold-muted)",
  },
  success: {
    accent: "var(--success)",
    tint: "var(--success-light)",
  },
  warning: {
    accent: "var(--warning)",
    tint: "var(--warning-light)",
  },
};
