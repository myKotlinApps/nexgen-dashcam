// NexGen DashCam — Tamagui design system
//
// Fonts:
//   Vazirmatn — primary Persian/Arabic typeface (SIL OFL 1.1)
//   SpaceMono — monospace for plate numbers, codes and timestamps
//
// Vazirmatn ships Latin glyphs derived from Roboto, so it covers the Latin
// digits and D/S series letters that appear on plates. A separate Latin body
// font is therefore unnecessary.

import { createTamagui } from "tamagui";
import { createInterFont } from "@tamagui/font-inter";
import { shorthands } from "@tamagui/shorthands";
import { themes, tokens } from "@tamagui/themes";
import { createMedia } from "@tamagui/react-native-media-driver";

const vazirmatnFont = createInterFont(
  {
    face: {
      400: { normal: "Vazirmatn_400Regular" },
      500: { normal: "Vazirmatn_500Medium" },
      600: { normal: "Vazirmatn_600SemiBold" },
      700: { normal: "Vazirmatn_700Bold" },
      800: { normal: "Vazirmatn_800ExtraBold" },
    },
    size: {
      1: 11, 2: 12, 3: 13, 4: 14, 5: 16,
      6: 18, 7: 22, 8: 28, 9: 36, 10: 44,
    },
    // Persian script needs more leading than Latin at the same size.
    lineHeight: {
      1: 18, 2: 20, 3: 22, 4: 24, 5: 27,
      6: 30, 7: 34, 8: 40, 9: 48, 10: 56,
    },
    weight: {
      4: "400", 5: "500", 6: "600", 7: "700", 8: "800",
    },
    letterSpacing: {
      4: 0, 8: -0.5, 10: -1,
    },
  },
  {
    sizeSize: (size) => Math.round(size * 1.05),
    sizeLineHeight: (size) => Math.round(size * 1.7),
  }
);

const monoFont = createInterFont(
  {
    face: { 400: { normal: "SpaceMono" }, 700: { normal: "SpaceMono" } },
    size: { 1: 10, 2: 11, 3: 12, 4: 14, 5: 16, 6: 20, 7: 26, 8: 32 },
  },
  {
    sizeSize: (size) => Math.round(size),
    sizeLineHeight: (size) => Math.round(size * 1.3),
  }
);

/** Semantic tokens for recording, GPS, ALPR and thermal state. */
export const dashcamTokens = {
  ...tokens,
  color: {
    ...tokens.color,
    plateBg: "#1E293B",
    plateBorder: "#334155",
    recRed: "#EF4444",
    okGreen: "#22C55E",
    warnYellow: "#EAB308",
    surfaceGlass: "rgba(15,23,42,0.85)",
  },
};

const config = createTamagui({
  defaultTheme: "dark",
  shouldAddPrefersColorThemes: true,
  themeClassNameOnRoot: true,
  shorthands,
  fonts: {
    heading: vazirmatnFont,
    body: vazirmatnFont,
    mono: monoFont,
  },
  themes,
  tokens: dashcamTokens,
  media: createMedia({
    xs: { maxWidth: 660 },
    sm: { maxWidth: 800 },
    md: { maxWidth: 1020 },
    lg: { maxWidth: 1280 },
    xl: { maxWidth: 1420 },
    xxl: { maxWidth: 1600 },
    gtXs: { minWidth: 661 },
    gtSm: { minWidth: 801 },
    gtMd: { minWidth: 1021 },
    gtLg: { minWidth: 1281 },
    short: { maxHeight: 820 },
    tall: { minHeight: 820 },
    hoverNone: { hover: "none" },
    pointerCoarse: { pointer: "coarse" },
  }),
});

export type AppConfig = typeof config;

declare module "tamagui" {
  interface TamaguiCustomConfig extends AppConfig {}
}

export default config;
