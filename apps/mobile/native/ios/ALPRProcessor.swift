@file: ALPRProcessor.swift
import Foundation
import Vision
import AVFoundation

/// On-device Persian license plate recognition using Vision + Core ML.
/// All processing stays on-device.
class ALPRProcessor: NSObject {

    typealias PlateCallback = (PlateResult) -> Void

    struct PlateResult {
        let plateRaw: String
        let plateNormalized: String
        let confidence: Float
        let boundingBox: CGRect
        let frameIndex: Int
        let ptsUs: Int64
        let trackId: String
        let regionCode: String?
        let province: String?
        let city: String?
    }

    private var isRunning = false
    private var plateCallback: PlateCallback?
    private var consecutiveCount = 0
    private var lastNormalized: String?
    private let minConsecutive = 3
    private let minConfidence: Float = 0.65

    func start() { isRunning = true; consecutiveCount = 0 }
    func stop() { isRunning = false }

    func onPlateDetected(_ callback: @escaping PlateCallback) {
        plateCallback = callback
    }

    /// Process a sample buffer from camera feed.
    func process(sampleBuffer: CMSampleBuffer, frameIndex: Int) {
        guard isRunning else { return }

        // TODO: Replace with actual Core ML / Vision model inference.
        // Pipeline:
        // 1. VNImageRequestHandler from sampleBuffer
        // 2. Plate detector (VNCoreMLModel)
        // 3. Crop & perspective correction
        // 4. OCR model for Persian characters
        // 5. Multi-frame consensus

        // Placeholder — no model weights in scaffold
    }

    func consensus(_ raw: String, normalized: String, confidence: Float) -> Bool {
        guard confidence >= minConfidence else {
            consecutiveCount = 0
            return false
        }
        if normalized == lastNormalized {
            consecutiveCount += 1
        } else {
            consecutiveCount = 1
            lastNormalized = normalized
        }
        return consecutiveCount >= minConsecutive
    }
}
