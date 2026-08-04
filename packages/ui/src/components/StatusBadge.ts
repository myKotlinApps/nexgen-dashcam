import { Colors, DashCamColors, Typography, Spacing, Radius } from "../tokens";

/**
 * StatusBadge — semantic status indicator.
 *
 * Variants:
 * - recording: pulsing red dot with label
 * - gps: green (locked) or gray (searching)
 * - alpr: green (confirmed), yellow (tentative), or gray (off)
 * - thermal: green (normal), yellow (warning), red (critical)
 */
export type StatusBadgeVariant =
  | "recording"
  | "gps-locked"
  | "gps-searching"
  | "alpr-confirmed"
  | "alpr-tentative"
  | "alpr-off"
  | "thermal-normal"
  | "thermal-warning"
  | "thermal-critical";

export const STATUS_BADGE_CONFIG: Record<
  StatusBadgeVariant,
  { color: string; bg: string; label: string; pulse?: boolean }
> = {
  recording: {
    color: DashCamColors.recording,
    bg: DashCamColors.recordingPulse,
    label: "Recording",
    pulse: true,
  },
  "gps-locked": {
    color: DashCamColors.gpsLocked,
    bg: "rgba(34,197,94,0.1)",
    label: "GPS Locked",
  },
  "gps-searching": {
    color: DashCamColors.gpsUnlocked,
    bg: "rgba(100,116,139,0.1)",
    label: "GPS Searching",
  },
  "alpr-confirmed": {
    color: DashCamColors.plateConfirmed,
    bg: "rgba(34,197,94,0.1)",
    label: "Plate Confirmed",
  },
  "alpr-tentative": {
    color: DashCamColors.plateTentative,
    bg: "rgba(234,179,8,0.1)",
    label: "Reading Plate",
  },
  "alpr-off": {
    color: Colors.dark.textTertiary,
    bg: "transparent",
    label: "ALPR Off",
  },
  "thermal-normal": {
    color: DashCamColors.thermalNormal,
    bg: "rgba(34,197,94,0.1)",
    label: "Cool",
  },
  "thermal-warning": {
    color: DashCamColors.thermalWarning,
    bg: "rgba(234,179,8,0.1)",
    label: "Warm",
    pulse: true,
  },
  "thermal-critical": {
    color: DashCamColors.thermalCritical,
    bg: "rgba(239,68,68,0.1)",
    label: "Hot!",
    pulse: true,
  },
};

export function getStatusConfig(variant: StatusBadgeVariant) {
  return STATUS_BADGE_CONFIG[variant];
}

export function getThermalVariant(tempC: number): StatusBadgeVariant {
  if (tempC >= 48) return "thermal-critical";
  if (tempC >= 42) return "thermal-warning";
  return "thermal-normal";
}

export function getStorageVariant(
  percentUsed: number
): "normal" | "warning" | "critical" {
  if (percentUsed >= 95) return "critical";
  if (percentUsed >= 85) return "warning";
  return "normal";
}

export const STORAGE_COLORS = {
  normal: DashCamColors.storageNormal,
  warning: DashCamColors.storageWarning,
  critical: DashCamColors.storageCritical,
} as const;
