// NexGen DashCam — Tamagui Design System with Vazirmatn
//
// Fonts:
//   Vazirmatn  — primary Persian/Arabic (SIL OFL 1.1)
//   Inter      — Latin fallback for digits & non-Persian text
//   SpaceMono  — monospace for plate numbers, codes, timestamps

import { createTamagui } from "tamagui";
import { createInterFont } from "@tamagui/font-inter";
import { shorthands } from "@tamagui/shorthands";
import { themes, tokens } from "@tamagui/themes";
import { createMedia } from "@tamagui/react-native-media-driver";

// ─── Vazirmatn — Primary Persian/Arabic (OFL) ───────────────
const vazirmatnFace = { normal: { normal: "Vazirmatn" } };

const vazirmatnFont = createInterFont(
  {
    face: vazirmatnFace,
    size: {
      1: 11, 2: 12, 3: 13, 4: 14, 5: 16,
      6: 18, 7: 22, 8: 28, 9: 36, 10: 44,
    },
    lineHeight: {
      1: 16, 2: 18, 3: 20, 4: 22, 5: 26,
      6: 28, 7: 32, 8: 38, 9: 46, 10: 54,
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

// ─── Inter — Latin fallback (digits, English UI) ─────────────
const interFace = { normal: { normal: "Inter" } };

const interFont = createInterFont(
  { face: interFace },
  {
    sizeSize: (size) => Math.round(size * 1.1),
    sizeLineHeight: (size) => Math.round(size * 1.1 + (size > 20 ? 10 : 10)),
  }
);

// ─── SpaceMono — Plate numbers, codes, data ──────────────────
const monoFace = { normal: { normal: "SpaceMono" } };

const monoFont = createInterFont(
  {
    face: monoFace,
    size: {
      1: 10, 2: 11, 3: 12, 4: 14, 5: 16,
      6: 20, 7: 26, 8: 32,
    },
  },
  {
    sizeSize: (size) => Math.round(size),
    sizeLineHeight: (size) => Math.round(size * 1.3),
  }
);

// ─── DashCam-specific color tokens ───────────────────────────
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

// ─── Config ──────────────────────────────────────────────────
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
