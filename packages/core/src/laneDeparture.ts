// Lane Departure Warning — shared geometry & state-machine logic
//
// Algorithm lineage: classic Canny-edge + probabilistic Hough-transform lane
// finding, the same approach used by MIT-licensed reference projects such as
// tomazas/opencv-lane-vehicle-track (MIT, 2015) and the well-known Udacity
// "Advanced Lane Finding" course project shape. The actual Canny/Hough pass
// runs natively (Android: OpenCV `Imgproc.HoughLinesP`, iOS: Vision's
// `VNDetectContoursRequest`) — this module is the reusable, testable math
// layer shared by both platforms: line classification, vehicle-offset
// estimation, and a debounced state machine so a single noisy frame never
// triggers a false warning.
//
// No third-party source was copied — only the well-known Canny+Hough
// pipeline shape was referenced; all code below is an original
// implementation against this repo's own architecture.

export interface HoughLine {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface LaneLine {
  slope: number;
  intercept: number;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export type LaneDepartureState =
  | "centered"
  | "drifting_left"
  | "drifting_right"
  | "departed_left"
  | "departed_right"
  | "unknown";

export interface LaneDepartureConfig {
  /** Minimum |slope| to keep a Hough segment (rejects near-horizontal noise, e.g. shadows) */
  minAbsSlope: number;
  /** Normalized offset (-1..1) beyond which a "drift" warning fires */
  driftThreshold: number;
  /** Normalized offset beyond which a "departed" (urgent) warning fires */
  departureThreshold: number;
  /** Consecutive frames required before escalating state (debounce) */
  debounceFrames: number;
  /** Minimum ms between repeated audio/haptic warnings of the same kind */
  warningCooldownMs: number;
}

export const DEFAULT_LANE_DEPARTURE_CONFIG: LaneDepartureConfig = {
  minAbsSlope: 0.35,
  driftThreshold: 0.22,
  departureThreshold: 0.4,
  debounceFrames: 4,
  warningCooldownMs: 2500,
};

/** Fits y = slope*x + intercept from a Hough segment. */
export function toLaneLine(seg: HoughLine): LaneLine {
  const dx = seg.x2 - seg.x1;
  const slope = dx === 0 ? (seg.y2 > seg.y1 ? 1e6 : -1e6) : (seg.y2 - seg.y1) / dx;
  const intercept = seg.y1 - slope * seg.x1;
  return { slope, intercept, ...seg };
}

/**
 * Splits raw Hough segments into left/right lane candidates by slope sign
 * and screen position, then averages each side into one representative line.
 * Mirrors the classic left-negative-slope / right-positive-slope heuristic
 * (image y grows downward) used across most OpenCV lane-finding tutorials.
 */
export function classifyLaneLines(
  segments: HoughLine[],
  frameWidth: number,
  config: LaneDepartureConfig = DEFAULT_LANE_DEPARTURE_CONFIG
): { left: LaneLine | null; right: LaneLine | null } {
  const midX = frameWidth / 2;
  const leftCandidates: LaneLine[] = [];
  const rightCandidates: LaneLine[] = [];

  for (const seg of segments) {
    const line = toLaneLine(seg);
    if (Math.abs(line.slope) < config.minAbsSlope) continue; // reject near-flat noise
    const midpointX = (seg.x1 + seg.x2) / 2;
    if (line.slope < 0 && midpointX < midX) leftCandidates.push(line);
    else if (line.slope > 0 && midpointX >= midX) rightCandidates.push(line);
  }

  return {
    left: averageLine(leftCandidates),
    right: averageLine(rightCandidates),
  };
}

function averageLine(lines: LaneLine[]): LaneLine | null {
  if (lines.length === 0) return null;
  const n = lines.length;
  const slope = lines.reduce((s, l) => s + l.slope, 0) / n;
  const intercept = lines.reduce((s, l) => s + l.intercept, 0) / n;
  const x1 = lines.reduce((s, l) => s + l.x1, 0) / n;
  const y1 = lines.reduce((s, l) => s + l.y1, 0) / n;
  const x2 = lines.reduce((s, l) => s + l.x2, 0) / n;
  const y2 = lines.reduce((s, l) => s + l.y2, 0) / n;
  return { slope, intercept, x1, y1, x2, y2 };
}

/**
 * Estimates the vehicle's lateral offset from lane center as a normalized
 * value in [-1, 1] (negative = drifting left, positive = drifting right),
 * by comparing the midpoint of the two lane lines (evaluated near the
 * bottom of the frame, closest to the vehicle) against the frame center.
 */
export function computeLaneOffset(
  left: LaneLine | null,
  right: LaneLine | null,
  frameWidth: number,
  frameHeight: number
): number | null {
  if (!left && !right) return null;
  const evalY = frameHeight; // bottom of frame == closest to the car
  const xAt = (l: LaneLine) => (evalY - l.intercept) / l.slope;

  let laneCenter: number;
  if (left && right) laneCenter = (xAt(left) + xAt(right)) / 2;
  else if (left) laneCenter = xAt(left) + frameWidth * 0.28; // assume ~half lane width
  else laneCenter = xAt(right!) - frameWidth * 0.28;

  const frameCenter = frameWidth / 2;
  const offset = (laneCenter - frameCenter) / (frameWidth / 2);
  return Math.max(-1, Math.min(1, offset));
}

/**
 * Debounced state machine turning a raw per-frame offset into a stable
 * LaneDepartureState, so a single noisy frame can't trigger a warning
 * and rapid oscillation near a threshold doesn't spam alerts.
 */
export class LaneDepartureStateMachine {
  private state: LaneDepartureState = "unknown";
  private pendingState: LaneDepartureState | null = null;
  private pendingCount = 0;
  private lastWarningAtMs = 0;

  constructor(private config: LaneDepartureConfig = DEFAULT_LANE_DEPARTURE_CONFIG) {}

  /** Feed one frame's offset (or null if lanes weren't found). Returns the debounced state and whether a new warning should fire now. */
  update(offset: number | null, nowMs: number): { state: LaneDepartureState; shouldWarn: boolean } {
    const candidate = this.classify(offset);

    if (candidate === this.pendingState) this.pendingCount++;
    else {
      this.pendingState = candidate;
      this.pendingCount = 1;
    }

    let shouldWarn = false;
    if (this.pendingCount >= this.config.debounceFrames && candidate !== this.state) {
      this.state = candidate;
      const isDeparture = candidate === "departed_left" || candidate === "departed_right";
      const isDrift = candidate === "drifting_left" || candidate === "drifting_right";
      if ((isDeparture || isDrift) && nowMs - this.lastWarningAtMs >= this.config.warningCooldownMs) {
        shouldWarn = true;
        this.lastWarningAtMs = nowMs;
      }
    }

    return { state: this.state, shouldWarn };
  }

  private classify(offset: number | null): LaneDepartureState {
    if (offset === null) return "unknown";
    if (offset <= -this.config.departureThreshold) return "departed_left";
    if (offset >= this.config.departureThreshold) return "departed_right";
    if (offset <= -this.config.driftThreshold) return "drifting_left";
    if (offset >= this.config.driftThreshold) return "drifting_right";
    return "centered";
  }
}
