// Parking Guard — impact/motion detection + dual-camera capture types
//
// Mirrors the "protect your car even when parked" pattern used by Nexar and
// Nextbase's Smart Parking: while the phone is mounted and the trip has
// ended, low-power accelerometer polling watches for a sudden jolt (someone
// hitting/keying the car) or sustained motion (towing/break-in), then wakes
// the full recording pipeline with a pre-roll buffer so the moment *before*
// the impact is captured too.
//
// The optional dual-camera mode uses the phone's front + back sensors
// together (Android: CameraX concurrent-camera / Camera2 logical multi-
// camera; iOS: AVCaptureMultiCamSession, iPhone XS+) to cover front and
// rear/cabin simultaneously, similar to how BlackVue/70mai bundle a
// front+rear camera pair. combineForWideCoverage() below is the shared
// geometry helper that decides how to lay the two frames out — actual
// pixel work runs natively.

export type ParkingGuardState = "disabled" | "monitoring" | "triggered" | "recording";

export interface Accelerometer3D {
  x: number;
  y: number;
  z: number;
}

export interface ParkingGuardConfig {
  /** g-force delta (beyond gravity) that counts as an impact, e.g. 1.6 ~= a firm knock */
  impactThresholdG: number;
  /** Sustained motion (lower threshold, longer window) suggests towing/theft, not just a knock */
  sustainedMotionThresholdG: number;
  sustainedMotionWindowMs: number;
  /** Seconds of pre-roll kept from the rolling buffer before the trigger */
  preRollSeconds: number;
  /** Seconds to keep recording after the last motion/impact */
  postEventSeconds: number;
  /** Minimum time between two separate triggered events */
  cooldownMs: number;
  dualCameraEnabled: boolean;
}

export const DEFAULT_PARKING_GUARD_CONFIG: ParkingGuardConfig = {
  impactThresholdG: 1.6,
  sustainedMotionThresholdG: 0.35,
  sustainedMotionWindowMs: 4000,
  preRollSeconds: 10,
  postEventSeconds: 30,
  cooldownMs: 15000,
  dualCameraEnabled: false,
};

export interface ImpactEvent {
  timestampMs: number;
  magnitudeG: number;
  kind: "impact" | "sustained_motion";
}

const GRAVITY_MS2 = 9.80665;

/** Converts a raw accelerometer sample to a gravity-subtracted magnitude in g. */
export function computeImpactMagnitudeG(sample: Accelerometer3D): number {
  const totalMs2 = Math.sqrt(sample.x * sample.x + sample.y * sample.y + sample.z * sample.z);
  return Math.abs(totalMs2 - GRAVITY_MS2) / GRAVITY_MS2;
}

/**
 * Rolling detector: feed it every accelerometer sample while parked.
 * Emits an ImpactEvent when either a sharp knock or sustained motion is
 * detected, with a cooldown so one bump doesn't re-trigger dozens of times.
 */
export class ParkingImpactDetector {
  private lastEventAtMs = 0;
  private sustainedWindow: { atMs: number; g: number }[] = [];

  constructor(private config: ParkingGuardConfig = DEFAULT_PARKING_GUARD_CONFIG) {}

  feed(sample: Accelerometer3D, nowMs: number): ImpactEvent | null {
    const g = computeImpactMagnitudeG(sample);

    if (nowMs - this.lastEventAtMs < this.config.cooldownMs) return null;

    if (g >= this.config.impactThresholdG) {
      this.lastEventAtMs = nowMs;
      return { timestampMs: nowMs, magnitudeG: g, kind: "impact" };
    }

    this.sustainedWindow.push({ atMs: nowMs, g });
    const cutoff = nowMs - this.config.sustainedMotionWindowMs;
    this.sustainedWindow = this.sustainedWindow.filter((s) => s.atMs >= cutoff);

    const allAboveThreshold =
      this.sustainedWindow.length >= 5 &&
      this.sustainedWindow.every((s) => s.g >= this.config.sustainedMotionThresholdG);

    if (allAboveThreshold) {
      this.lastEventAtMs = nowMs;
      this.sustainedWindow = [];
      return { timestampMs: nowMs, magnitudeG: g, kind: "sustained_motion" };
    }

    return null;
  }
}

// ---- Dual-camera wide-coverage capture ----

export interface DualCameraFrameMeta {
  facing: "front" | "back";
  timestampMs: number;
  widthPx: number;
  heightPx: number;
}

export interface WideCoverageLayout {
  mode: "side_by_side" | "overlap_blend";
  /** Pixel width of the blended seam when mode === "overlap_blend" */
  blendWidthPx: number;
  outputWidthPx: number;
  outputHeightPx: number;
}

/**
 * Decides how to combine simultaneous front+back frames into one wide
 * coverage canvas. True 360° stitching needs feature-matching + homography
 * (e.g. OpenCV's Stitcher, as in the Apache-2.0-licensed reference project
 * RaduBolbo/video_to_panorama) which must run natively for performance;
 * since a phone's front and back cameras face opposite directions with no
 * shared overlap, we default to a fast side-by-side "two-way coverage"
 * canvas (front view + rear view in one frame) rather than pretending to
 * seam them into a single perspective — this matches what BlackVue/70mai's
 * own dual-channel viewers do.
 */
export function combineForWideCoverage(
  front: DualCameraFrameMeta,
  back: DualCameraFrameMeta
): WideCoverageLayout {
  return {
    mode: "side_by_side",
    blendWidthPx: 0,
    outputWidthPx: front.widthPx + back.widthPx,
    outputHeightPx: Math.max(front.heightPx, back.heightPx),
  };
}
