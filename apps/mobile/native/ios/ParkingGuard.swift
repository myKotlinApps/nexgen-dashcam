// ParkingGuard.swift — impact/motion detection while parked
//
// Uses CoreMotion's accelerometer while the trip has ended and the phone
// stays mounted, mirroring ParkingGuard.kt on Android and the shared
// threshold/debounce math in packages/core/src/parkingMode.ts. On trigger,
// wakes CameraCapture with a pre-roll pulled from the ring buffer.
//
// Dual-camera mode uses AVCaptureMultiCamSession (iPhone XS/XR and newer)
// to record front + back simultaneously while parked.

import Foundation
import CoreMotion
import AVFoundation

private let gravityMs2 = 9.80665

class ParkingGuard {

    typealias ImpactCallback = (Double, String, Int64) -> Void

    private let motionManager = CMMotionManager()
    private var onImpact: ImpactCallback?
    private var lastEventAtMs: Int64 = 0

    var impactThresholdG = 1.6
    var cooldownMs: Int64 = 15000
    private(set) var dualCameraEnabled = false

    func setDualCameraEnabled(_ enabled: Bool) {
        // AVCaptureMultiCamSession.isMultiCamSupported must be checked
        // before enabling — only iPhone XS/XR (2018) and newer support it.
        dualCameraEnabled = enabled && AVCaptureMultiCamSession.isMultiCamSupported
    }

    func onImpactDetected(_ cb: @escaping ImpactCallback) { onImpact = cb }

    func startMonitoring() {
        guard motionManager.isAccelerometerAvailable else { return }
        // A slow update interval is enough for impact detection and keeps
        // battery drain minimal over hours of parking.
        motionManager.accelerometerUpdateInterval = 0.2
        motionManager.startAccelerometerUpdates(to: .main) { [weak self] data, _ in
            guard let self = self, let d = data else { return }
            let totalMs2 = sqrt(d.acceleration.x * d.acceleration.x + d.acceleration.y * d.acceleration.y + d.acceleration.z * d.acceleration.z) * gravityMs2
            let magnitudeG = abs(totalMs2 - gravityMs2) / gravityMs2
            let now = Int64(Date().timeIntervalSince1970 * 1000)
            if magnitudeG >= self.impactThresholdG && now - self.lastEventAtMs >= self.cooldownMs {
                self.lastEventAtMs = now
                self.onImpact?(magnitudeG, "impact", now)
            }
        }
    }

    func stopMonitoring() {
        motionManager.stopAccelerometerUpdates()
    }
}
