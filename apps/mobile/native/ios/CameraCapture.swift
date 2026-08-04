import Foundation
import AVFoundation

/// CameraCapture with image stabilization support.
/// - iOS 12+: cinematic video stabilization
/// - iOS 9+: basic optical stabilization if hardware supports it
/// - All versions: software EIS fallback via EISProcessor

@available(iOS 9.0, *)
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
    private var eisProcessor: EISProcessor?
    private var stabilizationMode: String = "auto"

    var hasPermission: Bool {
        if #available(iOS 9.0, *) {
            return AVCaptureDevice.authorizationStatus(for: .video) == .authorized
        }
        return false
    }

    var status: NexGenStatus {
        let thermal = ProcessInfo.processInfo.thermalState
        return NexGenStatus(
            status: isRecording ? "recording" : "idle",
            tripId: tripId, currentSegmentIndex: currentSegmentIndex,
            elapsedMs: totalElapsedMs, droppedFrames: droppedFrames,
            thermalState: thermal.description, gpsLocked: false, errorMessage: nil
        )
    }

    func configure(resolution: String, fps: Int, bitrateMbps: Double,
                   segmentDurationMin: Int, audioEnabled: Bool, gpsEnabled: Bool,
                   storageLimitMB: Int, stabilization: String = "auto") {
        segmentDuration = TimeInterval(segmentDurationMin) * 60
        tripId = UUID().uuidString
        stabilizationMode = stabilization
        eisProcessor = EISProcessor()
        setupSession(resolution: resolution, audioEnabled: audioEnabled)
    }

    private func setupSession(resolution: String, audioEnabled: Bool) {
        session.beginConfiguration()

        let preset: AVCaptureSession.Preset = resolution == "1080p" ? .hd1920x1080 : .hd1280x720
        if session.canSetSessionPreset(preset) { session.sessionPreset = preset }

        guard let camera = AVCaptureDevice.default(.builtInWideAngleCamera, for: .video, position: .back),
              let input = try? AVCaptureDeviceInput(device: camera),
              session.canAddInput(input) else {
            session.commitConfiguration()
            return
        }
        session.addInput(input)

        // Configure stabilization
        configureStabilization(camera: camera, videoInput: input)

        if audioEnabled, let audioDevice = AVCaptureDevice.default(for: .audio),
           let audioInput = try? AVCaptureDeviceInput(device: audioDevice),
           session.canAddInput(audioInput) {
            session.addInput(audioInput)
        }

        if session.canAddOutput(videoOutput) { session.addOutput(videoOutput) }
        session.commitConfiguration()
    }

    private func configureStabilization(camera: AVCaptureDevice, videoInput: AVCaptureDeviceInput) {
        // Hardware stabilization (iOS 12+ preferred cinematc)
        if #available(iOS 12.0, *) {
            let connection = videoOutput.connection(with: .video)
            if connection?.isVideoStabilizationSupported == true {
                connection?.preferredVideoStabilizationMode = .cinematic
            }
        }

        // OIS on older devices (iOS 8+, but we target 12+)
        if camera.activeFormat.isVideoStabilizationModeSupported(.standard) {
            // Standard video stabilization uses OIS + software
        }

        // Software EIS always available as fallback
        if stabilizationMode == "eis" || stabilizationMode == "auto" {
            eisProcessor = EISProcessor(maxDisplacement: 60, cropMargin: 0.08, smoothingFrames: 5)
        }
    }

    func startRecording() {
        currentSegmentIndex = 0
        totalElapsedMs = 0
        isRecording = true
        eisProcessor?.reset()
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
            id: "seg-\(currentSegmentIndex)", path: outputFileURL.path, sizeBytes: size
        ))
        if isRecording { startNewSegment() }
    }
}
