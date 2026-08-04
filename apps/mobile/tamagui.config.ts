// NexGen DashCam — Tamagui design system
//
// Fonts:
//   Vazirmatn — primary Persian/Arabic typeface (SIL OFL 1.1)
//   SpaceMono — monospace for plate numbers, codes and timestamps
//
// Vazirmatn ships Latin glyphs derived from Roboto, so it covers the Latin
// digits and D/S series letters that appear on plates. A separate Latin body
// font is therefore unnecessary.
//
// Color tokens follow the Fluent 2 / SharePoint Web UI Kit inspired theme
// (Communication Blue accent + Fluent neutral dark ramp) — see
// packages/ui/DESIGN_SYSTEM.md for the full rationale and palette.

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
      6: 20, 7: 24, 8: 28, 9: 40, 10: 48,
    },
    // Persian script needs more leading than Latin at the same size.
    lineHeight: {
      1: 18, 2: 20, 3: 22, 4: 24, 5: 27,
      6: 32, 7: 36, 8: 40, 9: 52, 10: 60,
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

/**
 * Semantic tokens for recording, GPS, ALPR and thermal state.
 * Fluent 2 / SharePoint-inspired: Communication Blue accent, Fluent
 * neutral dark surfaces, Fluent semantic success/warning/danger colors.
 */
export const dashcamTokens = {
  ...tokens,
  color: {
    ...tokens.color,
    accent: "#0078D4",
    accentHover: "#106EBE",
    accentLight: "#479EF5",
    plateBg: "#292827",
    plateBorder: "#3B3A39",
    recRed: "#D13438",
    okGreen: "#6BB700",
    warnYellow: "#FFC83D",
    surfaceGlass: "rgba(27,26,25,0.85)",
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
