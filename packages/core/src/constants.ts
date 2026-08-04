export const RECORDING_SEGMENT_DURATIONS = [1, 3, 5] as const;
export type SegmentDuration = (typeof RECORDING_SEGMENT_DURATIONS)[number];

export const RECORDING_QUALITIES = ["480p", "720p", "1080p"] as const;
export type RecordingQuality = (typeof RECORDING_QUALITIES)[number];

export const RECORDING_FPS = [24, 30] as const;
export type RecordingFps = (typeof RECORDING_FPS)[number];

export const VIDEO_CODECS = ["H.264", "HEVC"] as const;
export type VideoCodec = (typeof VIDEO_CODECS)[number];

export interface RecordingProfile {
  codec: VideoCodec;
  resolution: RecordingQuality;
  fps: RecordingFps;
  targetBitrateMbps: number;
  segmentDurationMin: SegmentDuration;
}

export const PROFILE_LEGACY: RecordingProfile = {
  codec: "H.264", resolution: "720p", fps: 24,
  targetBitrateMbps: 3, segmentDurationMin: 3,
};

export const PROFILE_BALANCED: RecordingProfile = {
  codec: "H.264", resolution: "1080p", fps: 30,
  targetBitrateMbps: 6, segmentDurationMin: 3,
};

export const PROFILE_PLATE_DETAIL: RecordingProfile = {
  codec: "H.264", resolution: "1080p", fps: 30,
  targetBitrateMbps: 10, segmentDurationMin: 1,
};

export const PROFILE_HEVC: RecordingProfile = {
  codec: "HEVC", resolution: "1080p", fps: 30,
  targetBitrateMbps: 5, segmentDurationMin: 3,
};

export const DEFAULT_STORAGE_LIMIT_MB = 8192;
export const STORAGE_SAFE_BUFFER_MB = 256;
export const THERMAL_WARNING_C = 42;
export const THERMAL_CRITICAL_C = 48;

export const ALPR_INFERENCE_FPS_WEAK = 4;
export const ALPR_INFERENCE_FPS_MEDIUM = 8;
export const ALPR_INFERENCE_FPS_STRONG = 12;

/** Minimum per-frame OCR confidence before a read is considered at all. */
export const ALPR_MIN_CONFIDENCE = 0.65;

/** Consecutive agreeing frames required before a plate is emitted. */
export const ALPR_TRACK_MIN_FRAMES = 3;

/** IoU threshold for associating a detection with an existing track. */
export const ALPR_TRACK_IOU_THRESHOLD = 0.3;

// Plate parsing lives in ./plate.ts. PERSIAN_PLATE_REGEX and PERSIAN_DIGITS are
// re-exported from there via ./index.ts — do not redefine them here.
