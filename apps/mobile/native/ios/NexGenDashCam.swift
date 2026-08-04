@file: NexGenDashCam.swift
import Foundation
import React
import AVFoundation
import CoreLocation

/// React Native bridge for NexGen DashCam on iOS.
/// iOS limitation: camera requires foreground. App must stay on-screen during recording.
@objc(NexGenDashCam)
class NexGenDashCam: RCTEventEmitter {

    private let cameraCapture = CameraCapture()
    private let alprProcessor = ALPRProcessor()
    private var hasListeners = false

    override init() {
        super.init()
        cameraCapture.delegate = self
    }

    override func supportedEvents() -> [String] {
        return [
            "onSegmentReady",
            "onStatusChange",
            "onRecordingStopped",
            "onPlateRecognized",
            "onThermalChange",
            "onStorageWarning"
        ]
    }

    override static func requiresMainQueueSetup() -> Bool { return false }

    override func startObserving() { hasListeners = true }
    override func stopObserving() { hasListeners = false }

    @objc
    func startRecording(_ config: NSDictionary, resolver resolve: @escaping RCTPromiseResolveBlock,
                        rejecter reject: @escaping RCTPromiseRejectBlock) {
        guard cameraCapture.hasPermission else {
            reject("PERMISSION_DENIED", "Camera permission not granted", nil)
            return
        }

        let resolution = config["resolution"] as? String ?? "720p"
        let fps = config["fps"] as? Int ?? 30
        let bitrateMbps = config["bitrateMbps"] as? Double ?? 6.0
        let segmentDurationMin = config["segmentDurationMin"] as? Int ?? 3
        let audioEnabled = config["audioEnabled"] as? Bool ?? false
        let gpsEnabled = config["gpsEnabled"] as? Bool ?? true
        let alprEnabled = config["alprEnabled"] as? Bool ?? false
        let storageLimitMB = config["storageLimitMB"] as? Int ?? 8192

        cameraCapture.configure(
            resolution: resolution,
            fps: fps,
            bitrateMbps: bitrateMbps,
            segmentDurationMin: segmentDurationMin,
            audioEnabled: audioEnabled,
            gpsEnabled: gpsEnabled,
            storageLimitMB: storageLimitMB
        )

        if alprEnabled { alprProcessor.start() }

        cameraCapture.startRecording()
        resolve(true)
    }

    @objc
    func stopRecording(_ resolve: @escaping RCTPromiseResolveBlock,
                       rejecter reject: @escaping RCTPromiseRejectBlock) {
        cameraCapture.stopRecording()
        alprProcessor.stop()
        resolve(true)
    }

    @objc
    func protectClip(_ segmentId: String, resolver resolve: @escaping RCTPromiseResolveBlock,
                     rejecter reject: @escaping RCTPromiseRejectBlock) {
        let success = cameraCapture.protectSegment(segmentId)
        resolve(success)
    }

    @objc
    func getStatus(_ resolve: @escaping RCTPromiseResolveBlock,
                   rejecter reject: @escaping RCTPromiseRejectBlock) {
        let status = cameraCapture.status
        resolve([
            "status": status.status,
            "tripId": status.tripId as Any,
            "currentSegmentIndex": status.currentSegmentIndex,
            "elapsedMs": status.elapsedMs,
            "droppedFrames": status.droppedFrames,
            "thermalState": status.thermalState,
            "gpsLocked": status.gpsLocked,
            "errorMessage": status.errorMessage as Any
        ])
    }
}

extension NexGenDashCam: CameraCaptureDelegate {
    func cameraCapture(didFinishSegment segment: Segment) {
        guard hasListeners else { return }
        sendEvent(withName: "onSegmentReady", body: [
            "id": segment.id,
            "path": segment.path,
            "sizeBytes": segment.sizeBytes
        ])
    }

    func cameraCapture(didChangeStatus status: NexGenStatus) {
        guard hasListeners else { return }
        sendEvent(withName: "onStatusChange", body: [
            "status": status.status,
            "elapsedMs": status.elapsedMs,
            "thermalState": status.thermalState
        ])
    }
}
