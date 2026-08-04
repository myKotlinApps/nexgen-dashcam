// Typography scale — values in logical pixels
// Vazirmatn is the primary typeface; Inter is Latin fallback
export const Typography = {
  fontFamily: {
    sans: "Vazirmatn",
    sansFallback: "Inter, system-ui, sans-serif",
    mono: "SpaceMono, monospace",
  },
  fontSize: {
    xs: 10,    // Labels, badges, timestamps
    sm: 12,    // Captions, secondary text
    base: 14,  // Body
    md: 16,    // Subheadings, list items
    lg: 18,    // Section titles
    xl: 22,    // Screen titles
    xxl: 28,   // Large titles
    hero: 36,  // Recording indicator, empty states
  },
  fontWeight: {
    regular: "400",
    medium: "500",
    semibold: "600",
    bold: "700",
    extrabold: "800",
  },
  lineHeight: {
    tight: 1.2,     // Titles, indicators
    normal: 1.5,    // Body text
    relaxed: 1.7,   // Persian body text (needs more line height)
    loose: 1.8,
  },
  letterSpacing: {
    tighter: -0.5,
    normal: 0,
    wide: 0.5,
    wider: 1,
  },
} as const;
