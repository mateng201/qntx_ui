/** Platform-neutral values; each application maps them to its own styling system. */
export const palette = {
  surface: "#ffffff",
  ink: "#181918",
  muted: "#777a76",
  copy: "#62655f",
  line: "#e8e9e5",
  protocolSurface: "#f5f5f2",
  badge: "#e8ebe3",
  badgeInk: "#343b2f",
  hover: "#e9ece5",
  accent: "#4c5641",
  darkSurface: "#181b16",
  darkInk: "#f5f6f2",
  darkCopy: "#c4c8be",
  darkMuted: "#b5b8af",
  darkLine: "#3c4237",
  darkHover: "#232620",
} as const;

export const spacing = { xs: 6, sm: 12, md: 20, lg: 28, xl: 40, xxl: 56 } as const;
export const typeScale = { caption: 12, label: 13, body: 16, subtitle: 24, title: 38 } as const;

/** GitHub-style system typography; native platforms select their own UI face. */
export const fontFamilies = {
  web: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans", Helvetica, Arial, sans-serif',
  ios: "System",
  android: "sans-serif",
} as const;

export const homeTheme = {
  opening: { ink: "#263d4b", accent: "#526a78", copy: "#596b76" },
  about: { ink: "#1b1d19", accent: "#6c7463", copy: "#50564a" },
  resources: { ink: "#403832", accent: "#7a6559", copy: "#6e6259" },
} as const;
