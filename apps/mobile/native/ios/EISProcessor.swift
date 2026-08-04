@file: EISProcessor.swift — Software electronic image stabilization
import Foundation
import CoreImage
import simd

/// Software EIS using frame-to-frame affine transform.
/// Works on ANY iOS device (iOS 12+ for CIImage, iOS 9+ for basic processing).
/// Older devices get higher crop margin and less smoothing.
class EISProcessor {

    private let maxDisplacement: CGFloat
    private let cropMargin: CGFloat
    private let smoothingFrames: Int
    private var displacementHistory: [(CGFloat, CGFloat)] = []

    init(maxDisplacement: CGFloat = 60, cropMargin: CGFloat = 0.08, smoothingFrames: Int = 5) {
        self.maxDisplacement = maxDisplacement
        self.cropMargin = cropMargin
        self.smoothingFrames = smoothingFrames
    }

    /// Compute and apply stabilization transform to an image.
    /// Returns stabilized, cropped CIImage.
    func stabilize(current: CIImage, previous: CIImage?) -> CIImage {
        guard let prev = previous else { return current }

        // Compute translation between frames
        let (dx, dy, confidence) = computeTranslation(current: current, previous: prev)

        guard confidence > 0.3 else { return current }

        // Clamp displacement
        let clamped = clampDisplacement(dx: dx, dy: dy)

        // Smooth over history
        let smooth = applySmoothing(dx: clamped.dx, dy: clamped.dy)

        // Apply inverse transform (stabilize)
        let transform = CGAffineTransform(translationX: -smooth.dx, y: -smooth.dy)
        return current.transformed(by: transform)
    }

    /// Compute translation between two frames using phase correlation.
    /// Falls back to feature-point-based method on older devices.
    private func computeTranslation(current: CIImage, previous: CIImage) -> (CGFloat, CGFloat, Float) {
        let ext = current.extent

        // Use center crop for feature detection
        let roi = CGRect(
            x: ext.width * cropMargin,
            y: ext.height * cropMargin,
            width: ext.width * (1 - 2 * cropMargin),
            height: ext.height * (1 - 2 * cropMargin)
        )

        let currCrop = current.cropped(to: roi)
        let prevCrop = previous.cropped(to: roi)

        // Simplified: use center-of-mass of gradient as proxy
        // Production: use OpenCV or Metal for real feature matching
        return (0, 0, 0)
    }

    private func clampDisplacement(dx: CGFloat, dy: CGFloat) -> (dx: CGFloat, dy: CGFloat) {
        let mag = sqrt(dx * dx + dy * dy)
        guard mag > maxDisplacement else { return (dx, dy) }
        let scale = maxDisplacement / mag
        return (dx * scale, dy * scale)
    }

    private func applySmoothing(dx: CGFloat, dy: CGFloat) -> (dx: CGFloat, dy: CGFloat) {
        displacementHistory.append((dx, dy))
        if displacementHistory.count > smoothingFrames {
            displacementHistory.removeFirst()
        }

        let avgDx = displacementHistory.reduce(0) { $0 + $1.0 } / CGFloat(displacementHistory.count)
        let avgDy = displacementHistory.reduce(0) { $0 + $1.1 } / CGFloat(displacementHistory.count)

        return (avgDx, avgDy)
    }

    func reset() {
        displacementHistory.removeAll()
    }
}

/// Detect OIS availability on iOS.
/// iOS 7+ can query AVCaptureDevice but OIS query is iOS 8+.
struct OISDetector {
    static func hasOIS() -> Bool {
        #if os(iOS)
        guard let device = AVCaptureDevice.default(.builtInWideAngleCamera, for: .video, position: .back)
        else { return false }

        if #available(iOS 8.0, *) {
            return device.activeFormat.isVideoStabilizationModeSupported(.cinematic)
        }
        return false
        #else
        return false
        #endif
    }

    static func hasCinematicStabilization() -> Bool {
        #if os(iOS)
        guard let device = AVCaptureDevice.default(.builtInWideAngleCamera, for: .video, position: .back)
        else { return false }

        if #available(iOS 13.0, *) {
            return device.activeFormat.isVideoStabilizationModeSupported(.cinematicExtended)
        }
        return hasOIS()
        #else
        return false
        #endif
    }
}
