@file: react-native/NexGenDashCamModule — Full bridge with ALPR
package com.nexgen.dashcam

import android.Manifest
import android.content.pm.PackageManager
import android.os.Build
import androidx.core.content.ContextCompat
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule

class NexGenDashCamModule(
    reactContext: ReactApplicationContext
) : ReactContextBaseJavaModule(reactContext) {

    private var cameraService: CameraService? = null
    private var alprProcessor: ALPRProcessor? = null

    override fun getName(): String = "NexGenDashCam"

    @ReactMethod
    fun startRecording(config: ReadableMap, promise: Promise) {
        val ctx = reactApplicationContext
        if (!hasPermission(Manifest.permission.CAMERA)) {
            promise.reject("PERMISSION_DENIED", "Camera permission not granted"); return
        }
        cameraService = CameraService.getInstance()
        cameraService?.start(ctx, config.toHashMap(), ::sendEvent)
        promise.resolve(true)
    }

    @ReactMethod fun stopRecording(promise: Promise) { cameraService?.stop(); promise.resolve(true) }
    @ReactMethod fun protectClip(id: String, p: Promise) { p.resolve(cameraService?.protectSegment(id) ?: false) }

    @ReactMethod
    fun getStatus(promise: Promise) {
        val s = cameraService?.getStatus()
        promise.resolve(Arguments.createMap().apply {
            putString("status", s?.status ?: "idle")
            putString("tripId", s?.tripId)
            putInt("segmentIndex", s?.currentSegmentIndex ?: 0)
            putDouble("elapsedMs", s?.elapsedMs?.toDouble() ?: 0.0)
            putInt("droppedFrames", s?.droppedFrames ?: 0)
            putString("thermalState", s?.thermalState ?: "normal")
            putBoolean("gpsLocked", s?.gpsLocked ?: false)
            putString("errorMessage", s?.errorMessage)
        })
    }

    // ─── ALPR Bridge ────────────────────────────────────

    @ReactMethod
    fun startAlpr(config: ReadableMap, promise: Promise) {
        alprProcessor = ALPRProcessor(reactApplicationContext)
        val fps = config.getInt("fps").takeIf { it > 0 } ?: 4
        alprProcessor?.setInferenceFps(fps)

        alprProcessor?.onPlateRecognized { plate ->
            sendEvent("onPlateRecognized", Arguments.createMap().apply {
                putString("eventId", plate.eventId)
                putString("tripId", plate.tripId)
                putString("segmentId", plate.segmentId)
                putInt("frameIndex", plate.frameIndex)
                putDouble("ptsUs", plate.ptsUs.toDouble())
                putString("capturedAtUtc", plate.capturedAtUtc)
                putString("plateRaw", plate.plateRaw)
                putString("plateNormalized", plate.plateNormalized)
                putDouble("confidence", plate.confidence)
                putArray("boundingBox", Arguments.fromArray(plate.boundingBox.toList()))
                putString("trackId", plate.trackId)
                putBoolean("bestFrame", plate.bestFrame)
                putString("regionCode", plate.regionCode)
                putString("province", plate.province)
                putString("city", plate.city)
                putString("modelVersion", plate.modelVersion)
            })
        }

        alprProcessor?.onStatusChanged { status ->
            sendEvent("onAlprStatus", Arguments.createMap().apply {
                putString("status", status.status)
                putString("detail", status.detail)
            })
        }

        alprProcessor?.start()
        promise.resolve(true)
    }

    @ReactMethod fun stopAlpr(promise: Promise) { alprProcessor?.stop(); promise.resolve(true) }

    @ReactMethod
    fun getAlprStatus(promise: Promise) {
        val s = alprProcessor?.getStatus()
        promise.resolve(Arguments.createMap().apply {
            putString("status", s?.status ?: "idle")
            putString("detail", s?.detail ?: "")
        })
    }

    // ─── Stabilization ──────────────────────────────────

    @ReactMethod
    fun getStabilizationCapability(promise: Promise) {
        val cap = StabilizationCapability(reactApplicationContext).probe()
        promise.resolve(Arguments.createMap().apply {
            putBoolean("hasOis", cap.hasOis)
            putBoolean("hasEis", cap.hasEis)
            putBoolean("hasVideoStabilization", cap.hasVideoStabilization)
            putArray("oisModes", Arguments.fromList(cap.oisModes))
            putInt("apiLevel", cap.apiLevel)
            putString("cameraId", cap.cameraId)
        })
    }

    // ─── Helpers ───────────────────────────────────────

    private fun sendEvent(name: String, params: WritableMap?) {
        reactApplicationContext
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            .emit(name, params ?: Arguments.createMap())
    }

    private fun hasPermission(perm: String) =
        ContextCompat.checkSelfPermission(reactApplicationContext, perm) == PackageManager.PERMISSION_GRANTED

    @ReactMethod fun addListener(e: String?) {}
    @ReactMethod fun removeListeners(c: Int?) {}
}

private fun ReadableMap.toHashMap(): HashMap<String, Any?> {
    val map = HashMap<String, Any?>()
    val iter = this.keySetIterator()
    while (iter.hasNextKey()) {
        val key = iter.nextKey()
        map[key] = when (getType(key)) {
            ReadableType.String -> getString(key)
            ReadableType.Number -> getDouble(key)
            ReadableType.Boolean -> getBoolean(key)
            else -> null
        }
    }
    return map
}
