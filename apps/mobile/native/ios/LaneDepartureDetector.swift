// LaneDepartureDetector.swift — camera-based lane departure warning
//
// Pipeline: Vision framework's VNDetectContoursRequest (iOS 14+) hands raw
// line-like segments to the shared math in
// packages/core/src/laneDeparture.ts (classifyLaneLines / computeLaneOffset
// / LaneDepartureStateMachine) via the RN bridge event `onLaneDeparture`,
// mirroring LaneDepartureDetector.kt on Android so both platforms share one
// decision layer.
//
// Algorithm shape follows the classic Canny+Hough lane-finding pipeline
// (see e.g. MIT-licensed tomazas/opencv-lane-vehicle-track for reference)
// — original implementation against Vision, no code copied.

import Foundation
import Vision
import CoreImage

struct HoughSegment {
    let x1: CGFloat
    let y1: CGFloat
    let x2: CGFloat
    let y2: CGFloat
}

@available(iOS 14.0, *)
class LaneDepartureDetector: NSObject {

    typealias SegmentsCallback = ([HoughSegment], Int, Int, Int64) -> Void

    private var isRunning = false
    private var frameCounter = 0
    private let frameStride = 3
    private var segmentsCallback: SegmentsCallback?

    func start() {
        isRunning = true
        frameCounter = 0
    }

    func stop() {
        isRunning = false
    }

    func onSegments(_ cb: @escaping SegmentsCallback) { segmentsCallback = cb }

    /// Processes a downscaled grayscale CIImage (lower half = road ROI).
    func process(image: CIImage, width: Int, height: Int, timestampUs: Int64) {
        guard isRunning else { return }
        frameCounter += 1
        guard frameCounter % frameStride == 0 else { return }

        let request = VNDetectContoursRequest()
        request.contrastAdjustment = 1.8
        request.detectsDarkOnLight = false

        let handler = VNImageRequestHandler(ciImage: image, options: [:])
        do {
            try handler.perform([request])
            guard let observation = request.results?.first else { return }
            let segments = extractLineLikeSegments(from: observation, width: width, height: height)
            segmentsCallback?(segments, width, height, timestampUs)
        } catch {
            // Non-fatal: skip this frame, lane state machine tolerates gaps.
        }
    }

    /// Approximates near-straight contour paths as line segments — the
    /// Vision-based stand-in for OpenCV's HoughLinesP on this platform.
    private func extractLineLikeSegments(from observation: VNContoursObservation, width: Int, height: Int) -> [HoughSegment] {
        var segments: [HoughSegment] = []
        for i in 0..<observation.contourCount {
            guard let contour = try? observation.contour(at: i), contour.pointCount >= 2 else { continue }
            let points = contour.normalizedPoints
            guard let first = points.first, let last = points.last else { continue }
            segments.append(HoughSegment(
                x1: CGFloat(first.x) * CGFloat(width), y1: (1 - CGFloat(first.y)) * CGFloat(height),
                x2: CGFloat(last.x) * CGFloat(width), y2: (1 - CGFloat(last.y)) * CGFloat(height)
            ))
        }
        return segments
    }
}
