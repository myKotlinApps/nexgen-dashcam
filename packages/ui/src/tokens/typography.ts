// Typography scale — values in logical pixels.
// Aligned to the Fluent 2 type ramp (Caption / Body / Subtitle / Title /
// Large Title). Vazirmatn stays the primary typeface: Segoe UI (Fluent's
// default) is Windows-only and unavailable on Android/iOS/web without
// licensing, and Vazirmatn already ships Latin glyphs for the D/S plate
// series letters and digits.
export const Typography = {
  fontFamily: {
    sans: "Vazirmatn",
    sansFallback: "Inter, system-ui, sans-serif",
    mono: "SpaceMono, monospace",
  },
  fontSize: {
    xs: 10,    // Caption 2 — labels, badges, timestamps
    sm: 12,    // Caption 1 — captions, secondary text
    base: 14,  // Body 1 — body copy
    md: 16,    // Body 2 — subheadings, list items
    lg: 20,    // Subtitle 1 — section titles
    xl: 24,    // Title 3 — screen titles
    xxl: 28,   // Title 2 — large titles
    hero: 40,  // Large Title — recording indicator, empty states
  },
  fontWeight: {
    regular: "400",
    medium: "500",
    semibold: "600",
    bold: "700",
    extrabold: "700",
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
