@file: StabilizationCapability — OIS & EIS detection for Android
package com.nexgen.dashcam

import android.content.Context
import android.hardware.camera2.CameraCharacteristics
import android.hardware.camera2.CameraManager
import android.os.Build

/**
 * Detects available stabilization features on the device.
 *
 * Android OIS detection via CameraCharacteristics.
 * EIS is always available as a software fallback.
 *
 * API level compatibility:
 * - API 21+: Camera2 basic
 * - API 24+: Camera2 full
 * - API 28+: OIS query reliable
 */
class StabilizationCapability(private val context: Context) {

    data class Capability(
        val hasOis: Boolean,
        val hasEis: Boolean,
        val hasVideoStabilization: Boolean,
        val oisModes: List<String>,
        val apiLevel: Int,
        val cameraId: String?
    )

    fun probe(): Capability {
        val manager = context.getSystemService(Context.CAMERA_SERVICE) as CameraManager
        val modes = mutableListOf<String>()
        var hasOis = false
        var hasVideoStab = false
        var cameraId: String? = null

        try {
            for (id in manager.cameraIdList) {
                val chars = manager.getCameraCharacteristics(id)
                val facing = chars.get(CameraCharacteristics.LENS_FACING)
                if (facing != CameraCharacteristics.LENS_FACING_BACK) continue

                cameraId = id

                // OIS — optical image stabilization
                val oisModes = chars.get(CameraCharacteristics.LENS_INFO_AVAILABLE_OPTICAL_STABILIZATION)
                if (oisModes != null && oisModes.isNotEmpty()) {
                    hasOis = true
                    modes.add("OIS")
                }

                // Video stabilization (EIS at the hardware/framework level)
                val stabModes = chars.get(CameraCharacteristics.CONTROL_AVAILABLE_VIDEO_STABILIZATION_MODES)
                if (stabModes != null && stabModes.isNotEmpty() &&
                    stabModes.any { it == CameraCharacteristics.CONTROL_VIDEO_STABILIZATION_MODE_ON }
                ) {
                    hasVideoStab = true
                    modes.add("VIDEO_STAB")
                }

                break // probe only first back camera
            }
        } catch (e: Exception) {
            // Camera2 may not be fully available on some devices
        }

        return Capability(
            hasOis = hasOis,
            hasEis = true, // always available as software fallback
            hasVideoStabilization = hasVideoStab,
            oisModes = modes,
            apiLevel = Build.VERSION.SDK_INT,
            cameraId = cameraId
        )
    }

    /**
     * Get recommended stabilization mode for the device.
     * Old devices (API < 24): EIS software only, higher crop margin.
     * Mid devices (API 24–27): Use video stabilization if available.
     * New devices (API 28+): OIS if available, video stab otherwise.
     */
    fun recommendedMode(): String {
        val cap = probe()
        return when {
            cap.hasOis && cap.apiLevel >= 28 -> "ois"
            cap.hasVideoStabilization -> "eis" // framework-level
            cap.apiLevel >= 21 -> "eis" // software fallback
            else -> "off"
        }
    }

    fun recommendedCropMargin(): Float {
        return when {
            Build.VERSION.SDK_INT < 24 -> 0.12f  // older device, more crop
            Build.VERSION.SDK_INT < 28 -> 0.08f  // standard
            else -> 0.05f  // new, likely OIS
        }
    }
}
