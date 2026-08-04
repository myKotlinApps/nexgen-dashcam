@file: react-native/NexGenDashCamModule
package com.nexgen.dashcam

import android.Manifest
import android.content.pm.PackageManager
import android.os.Build
import androidx.core.content.ContextCompat
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule

/**
 * React Native bridge for NexGen DashCam native recording.
 * Exposes startRecording, stopRecording, protectClip, getStatus to JS.
 */
class NexGenDashCamModule(
    reactContext: ReactApplicationContext
) : ReactContextBaseJavaModule(reactContext) {

    private var cameraService: CameraService? = null

    override fun getName(): String = "NexGenDashCam"

    override fun initialize() {
        super.initialize()
        cameraService = CameraService.getInstance()
    }

    @ReactMethod
    fun startRecording(config: ReadableMap, promise: Promise) {
        val context = reactApplicationContext

        if (!hasCameraPermission()) {
            promise.reject("PERMISSION_DENIED", "Camera permission not granted")
            return
        }

        val resolution = config.getString("resolution") ?: "720p"
        val fps = config.getInt("fps").takeIf { it > 0 } ?: 30
        val bitrateMbps = config.getDouble("bitrateMbps").takeIf { it > 0 } ?: 6.0
        val segmentDurationMin = config.getInt("segmentDurationMin").takeIf { it > 0 } ?: 3
        val audioEnabled = config.getBoolean("audioEnabled")
        val gpsEnabled = config.getBoolean("gpsEnabled")
        val alprEnabled = config.getBoolean("alprEnabled")
        val storageLimitMB = config.getInt("storageLimitMB").takeIf { it > 0 } ?: 8192

        cameraService?.start(
            context = context,
            resolution = resolution,
            fps = fps,
            bitrateMbps = bitrateMbps,
            segmentDurationMin = segmentDurationMin,
            audioEnabled = audioEnabled,
            gpsEnabled = gpsEnabled,
            alprEnabled = alprEnabled,
            storageLimitMB = storageLimitMB
        ) { eventName, params ->
            sendEvent(eventName, params)
        }

        promise.resolve(true)
    }

    @ReactMethod
    fun stopRecording(promise: Promise) {
        cameraService?.stop()
        promise.resolve(true)
    }

    @ReactMethod
    fun protectClip(segmentId: String, promise: Promise) {
        val success = cameraService?.protectSegment(segmentId) ?: false
        promise.resolve(success)
    }

    @ReactMethod
    fun getStatus(promise: Promise) {
        val status = Arguments.createMap().apply {
            cameraService?.getStatus()?.let { s ->
                putString("status", s.status)
                putString("tripId", s.tripId)
                putInt("currentSegmentIndex", s.currentSegmentIndex)
                putDouble("elapsedMs", s.elapsedMs)
                putInt("droppedFrames", s.droppedFrames)
                putString("thermalState", s.thermalState)
                putBoolean("gpsLocked", s.gpsLocked)
                putString("errorMessage", s.errorMessage)
            }
        }
        promise.resolve(status)
    }

    private fun sendEvent(eventName: String, params: WritableMap?) {
        reactApplicationContext
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            .emit(eventName, params ?: Arguments.createMap())
    }

    private fun hasCameraPermission(): Boolean {
        return ContextCompat.checkSelfPermission(
            reactApplicationContext,
            Manifest.permission.CAMERA
        ) == PackageManager.PERMISSION_GRANTED
    }

    @ReactMethod
    fun addListener(eventName: String?) {}

    @ReactMethod
    fun removeListeners(count: Int?) {}
}
