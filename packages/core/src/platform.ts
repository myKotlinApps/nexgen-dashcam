// Platform version targeting
//
// Android 7.0+ (API 24)  — Camera2 full support, CameraX API 21+
// Android 5.0+ (API 21)  — CameraX available, limited stabilization
// iOS 12+                 — AVCaptureDevice cinematic, CoreML, Vision
// iOS 9+                  — Basic AVFoundation, no ML, no ALPR
// iOS 7                   — NOT SUPPORTED (Xcode dropped support in 2015)

export const PLATFORM_TARGETS = {
  android: { minSdk: 21, targetSdk: 36, recommendedMin: 24 },
  ios: { deploymentTarget: "12.0", legacyFallback: "9.0", unsupported: ["7.0"] },
} as const;

export type DeviceTier = "legacy" | "standard" | "premium";

export function getDeviceTier(
  osVersion: number, totalRamMb: number, hasHardwareEncoder: boolean
): DeviceTier {
  if (osVersion <= 23 || totalRamMb <= 2048) return "legacy";
  if (osVersion >= 28 && totalRamMb >= 4096 && hasHardwareEncoder) return "premium";
  return "standard";
}
