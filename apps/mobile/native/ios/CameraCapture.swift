@file: CameraCapture.swift — AVFoundation video recorder
import Foundation
import AVFoundation
import UIKit
import CoreLocation

protocol CameraCaptureDelegate: AnyObject {
    func cameraCapture(didFinishSegment segment: Segment)
    func cameraCapture(didChangeStatus status: NexGenStatus)
}

struct NexGenStatus {
    let status: String
    let tripId: String?
    let currentSegmentIndex: Int
    let elapsedMs: Double
    let droppedFrames: Int
    let thermalState: String
    let gpsLocked: Bool
    let errorMessage: String?
}

struct Segment {
    let id: String
    let path: String
    let sizeBytes: Int64
}

/// AVFoundation-based video capture for dash cam recording.
/// Records segmented MP4 with hardware H.264 encoding.
/// iOS requires foreground — app must stay on screen during recording.
class CameraCapture: NSObject {

    weak var delegate: CameraCaptureDelegate?

    private let session = AVCaptureSession()
    private let videoOutput = AVCaptureMovieFileOutput()
    private var currentOutputURL: URL?
    private var segmentTimer: Timer?
    private var currentSegmentIndex = 0
    private var totalElapsedMs: Double = 0
    private var droppedFrames = 0
    private var segmentDuration: TimeInterval = 180
    private var tripId: String?
    private var isRecording = false
    private var protectedSegments = Set<String>()

    var hasPermission: Bool {
        AVCaptureDevice.authorizationStatus(for: .video) == .authorized
    }

    var status: NexGenStatus {
        let thermal = ProcessInfo.processInfo.thermalState
        return NexGenStatus(
            status: isRecording ? "recording" : "idle",
            tripId: tripId,
            currentSegmentIndex: currentSegmentIndex,
            elapsedMs: totalElapsedMs,
            droppedFrames: droppedFrames,
            thermalState: thermal.description,
            gpsLocked: false,
            errorMessage: nil
        )
    }

    func configure(resolution: String, fps: Int, bitrateMbps: Double,
                   segmentDurationMin: Int, audioEnabled: Bool, gpsEnabled: Bool,
                   storageLimitMB: Int) {
        segmentDuration = TimeInterval(segmentDurationMin) * 60
        tripId = UUID().uuidString
        setupSession(resolution: resolution, audioEnabled: audioEnabled)
    }

    private func setupSession(resolution: String, audioEnabled: Bool) {
        session.beginConfiguration()
        session.sessionPreset = resolution == "1080p" ? .hd1920x1080 : .hd1280x720

        guard let camera = AVCaptureDevice.default(.builtInWideAngleCamera, for: .video, position: .back),
              let input = try? AVCaptureDeviceInput(device: camera),
              session.canAddInput(input) else { return }
        session.addInput(input)

        if audioEnabled, let audioDevice = AVCaptureDevice.default(for: .audio),
           let audioInput = try? AVCaptureDeviceInput(device: audioDevice),
           session.canAddInput(audioInput) {
            session.addInput(audioInput)
        }

        if session.canAddOutput(videoOutput) {
            session.addOutput(videoOutput)
        }

        session.commitConfiguration()
    }

    func startRecording() {
        currentSegmentIndex = 0
        totalElapsedMs = 0
        isRecording = true
        session.startRunning()
        startNewSegment()
    }

    func stopRecording() {
        segmentTimer?.invalidate()
        videoOutput.stopRecording()
        session.stopRunning()
        isRecording = false
    }

    func protectSegment(_ id: String) -> Bool {
        protectedSegments.insert(id)
        return true
    }

    private func startNewSegment() {
        currentSegmentIndex += 1

        let dir = FileManager.default.temporaryDirectory
            .appendingPathComponent("dashcam/\(tripId ?? "unknown")")
        try? FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)

        let url = dir.appendingPathComponent("segment_\(currentSegmentIndex).mp4")
        currentOutputURL = url

        videoOutput.startRecording(to: url, recordingDelegate: self)

        segmentTimer = Timer.scheduledTimer(withTimeInterval: segmentDuration, repeats: false) { [weak self] _ in
            guard let self = self else { return }
            self.totalElapsedMs += self.segmentDuration * 1000
            self.videoOutput.stopRecording()
        }
    }
}

extension CameraCapture: AVCaptureFileOutputRecordingDelegate {
    func fileOutput(_ output: AVCaptureFileOutput, didFinishRecordingTo outputFileURL: URL,
                    from connections: [AVCaptureConnection], error: Error?) {
        let attrs = try? FileManager.default.attributesOfItem(atPath: outputFileURL.path)
        let size = (attrs?[.size] as? Int64) ?? 0

        delegate?.cameraCapture(didFinishSegment: Segment(
            id: "seg-\(currentSegmentIndex)",
            path: outputFileURL.path,
            sizeBytes: size
        ))

        if isRecording { startNewSegment() }
    }
}
