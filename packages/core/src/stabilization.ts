// Image Stabilization — types & capability detection
//
// OIS (Optical) — hardware lens-shift. Checked at probe time. Zero CPU.
// EIS (Electronic) — software crop + frame alignment. Works on ANY device.
//
// Strategy: prefer OIS → fall back to EIS → off when thermal critical

export type StabilizationMode = "off" | "ois" | "eis" | "auto";

export interface StabilizationConfig {
  mode: StabilizationMode;
  eisCropMargin: number;
  eisMaxDisplacement: number;
  eisSmoothingFrames: number;
}

export const DEFAULT_STABILIZATION: StabilizationConfig = {
  mode: "auto", eisCropMargin: 0.08, eisMaxDisplacement: 60, eisSmoothingFrames: 5,
};

export interface StabilizationCapability {
  hasOis: boolean;
  hasEis: boolean;
  hasVideoStabilization: boolean;
  oisModes: string[];
}

export function computeEisTransform(
  prevKps: Array<[number, number]>, currKps: Array<[number, number]>
): { dx: number; dy: number; confidence: number } | null {
  if (prevKps.length < 4 || currKps.length < 4) return null;
  let sumDx = 0, sumDy = 0, n = 0;
  const len = Math.min(prevKps.length, currKps.length);
  for (let i = 0; i < len; i++) {
    const [px, py] = prevKps[i]!; const [cx, cy] = currKps[i]!;
    sumDx += cx - px; sumDy += cy - py; n++;
  }
  return { dx: sumDx / n, dy: sumDy / n, confidence: Math.min(1, n / 10) };
}

export function clampEisDisplacement(dx: number, dy: number, max: number) {
  const mag = Math.sqrt(dx * dx + dy * dy);
  if (mag <= max) return { dx, dy };
  const s = max / mag;
  return { dx: dx * s, dy: dy * s };
}
