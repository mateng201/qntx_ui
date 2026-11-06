/** Platform-neutral values; each application maps them to its own styling system. */
export const palette = {
  surface: "#fafaf8",
  white: "#ffffff",
  ink: "#181918",
  brand: "#1b1d19",
  hover: "#e9ece5",
  hoverInk: "#11130f",
  primaryHover: "#353d2e",
  selection: "#dfe2d8",
} as const;

export const spacing = { xs: 6, sm: 12, text: 14, md: 20, action: 24, lg: 28 } as const;
export const typeScale = {
  caption: 12,
  label: 13,
  control: 14,
  body: 16,
  subtitle: 24,
  title: 38,
} as const;
export const mascotMaterial = [
  { offset: "0", color: "#60645b" },
  { offset: "0.4", color: "#363a31" },
  { offset: "1", color: "#191c17" },
] as const;

/** GitHub-style system typography; native platforms select their own UI face. */
export const fontFamilies = {
  web: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans", Helvetica, Arial, sans-serif',
  ios: "System",
  android: "sans-serif",
} as const;

export const homeTheme = {
  opening: { ink: "#263d4b", accent: "#526a78", copy: "#596b76" },
  about: { ink: palette.brand, accent: "#6c7463", copy: "#50564a" },
  resources: { ink: "#403832", accent: "#7a6559", copy: "#6e6259" },
} as const;

/** Shared scene timing; DOM scrolling and native animation graphs remain platform-owned. */
export const homeMotion = {
  openingFadeEnd: 0.12,
  backgroundEnd: 0.2,
  aboutEnter: 0.18,
  aboutFade: 0.1,
  aboutLeave: 0.48,
  backgroundScale: 0.8,
  backgroundOpacity: 0.045,
  flightOpacity: 0.22,
  arrivalStart: 0.78,
} as const;
