export interface Segment {
  id: string;
  tripId: string;
  path: string;
  sizeBytes: number;
  durationMs: number;
  startPts: number;
  endPts: number;
  codec: string;
  resolution: string;
  fps: number;
  isProtected: boolean;
  createdAt: string;
}

export interface Trip {
  id: string;
  startedAt: string;
  endedAt?: string;
  segments: Segment[];
  totalSizeBytes: number;
  totalDurationMs: number;
}

export interface PlateEvent {
  eventId: string;
  tripId: string;
  segmentId: string;
  frameIndex: number;
  ptsUs: number;
  capturedAtUtc: string;
  plateRaw: string;
  plateNormalized: string;
  confidence: number;
  boundingBox: [number, number, number, number];
  trackId: string;
  bestFrame: boolean;
  regionCode: string | null;
  province: string | null;
  city: string | null;
  modelVersion: string;
}

export interface GpsDataPoint {
  timestampMs: number;
  latitude: number;
  longitude: number;
  speedMs: number;
  heading: number;
  altitude: number;
  accuracy: number;
}

export interface DeviceCapability {
  deviceModel: string;
  osVersion: string;
  totalRamMb: number;
  availableStorageMb: number;
  encodeProfiles: string[];
  cameraSensors: CameraSensor[];
  thermalZoneNames: string[];
  is16kbPageSupported: boolean;
}

export interface CameraSensor {
  facing: "back" | "front";
  supportedResolutions: string[];
  supportedFps: number[];
  hasStabilization: boolean;
  hasHardwareEncoder: boolean;
}

export type RecordingStatus =
  | "idle"
  | "preparing"
  | "recording"
  | "paused"
  | "finalizing"
  | "error";

export interface RecordingState {
  status: RecordingStatus;
  tripId?: string;
  currentSegmentIndex: number;
  elapsedMs: number;
  estimatedStorageRemainingMb: number;
  droppedFrames: number;
  thermalState: "normal" | "warning" | "critical";
  gpsLocked: boolean;
  errorMessage?: string;
}

export interface RegionEntry {
  regionCode: string;
  plateType: string;
  letterRange: [string, string] | null;
  province: string;
  city: string | null;
  version: number;
  effectiveFrom: string;
  source: string;
}
