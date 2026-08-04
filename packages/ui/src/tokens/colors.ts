// Fluent 2 / SharePoint-inspired palette.
//
// Source of truth is Microsoft's public Fluent 2 design language
// (Communication Blue accent + Fluent neutral ramps), since exact Figma
// Variables from the SharePoint Web UI Kit community file are not
// available through the connected Figma MCP server (it only exposes
// FigJam/diagram tools, not design-file reading).

const tintColorLight = "#201F1E";
const tintColorDark = "#F3F2F1";

export const Colors = {
  light: {
    text: "#201F1E",
    textSecondary: "#605E5C",
    textTertiary: "#A19F9D",
    background: "#FAF9F8",
    surface: "#FFFFFF",
    surfaceSecondary: "#F3F2F1",
    border: "#EDEBE9",
    borderFocus: "#0078D4",
    tint: tintColorLight,
    tabIconDefault: "#A19F9D",
    tabIconSelected: tintColorLight,
    primary: "#0078D4",
    primaryHover: "#106EBE",
    destructive: "#D13438",
    destructiveHover: "#A4262C",
    success: "#107C10",
    warning: "#FFB900",
  },
  dark: {
    text: "#F3F2F1",
    textSecondary: "#979593",
    textTertiary: "#797673",
    background: "#1B1A19",
    surface: "#292827",
    surfaceSecondary: "#3B3A39",
    border: "#3B3A39",
    borderFocus: "#479EF5",
    tint: tintColorDark,
    tabIconDefault: "#797673",
    tabIconSelected: tintColorDark,
    primary: "#479EF5",
    primaryHover: "#8AC2F0",
    destructive: "#F1707B",
    destructiveHover: "#F8A7AD",
    success: "#6BB700",
    warning: "#FFC83D",
  },
};

// DashCam-specific semantic tokens (Fluent semantic colors)
export const DashCamColors = {
  recording: "#D13438",
  recordingPulse: "rgba(209, 52, 56, 0.15)",
  gpsLocked: "#6BB700",
  gpsUnlocked: "#797673",
  plateConfirmed: "#6BB700",
  plateTentative: "#FFC83D",
  plateBounding: "rgba(107, 183, 0, 0.3)",
  thermalNormal: "#6BB700",
  thermalWarning: "#FFC83D",
  thermalCritical: "#D13438",
  storageNormal: "#6BB700",
  storageWarning: "#FFC83D",
  storageCritical: "#D13438",
  overlayDark: "rgba(27, 26, 25, 0.75)",
  overlayGlass: "rgba(27, 26, 25, 0.85)",
};
