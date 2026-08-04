package com.nexgen.dashcam

// Parking Guard — impact/motion detection + optional dual-camera capture
//
// Listens to the accelerometer while the trip is stopped and the phone is
// left mounted, matching the "protect your car even when parked" behavior
// of Nexar/Nextbase Smart Parking. On trigger, wakes MediaEncoder with a
// pre-roll pulled from StorageManager's ring buffer (see
// packages/core/src/parkingMode.ts for the shared threshold/debounce math).
//
// Dual-camera mode uses CameraX's concurrent-camera support (front + back
// simultaneously, requires `PackageManager.FEATURE_CAMERA_CONCURRENT` —
// available on most 2019+ flagship and many mid-range devices) to record
// both directions at once while parked.

import android.content.Context
import android.hardware.Sensor
import android.hardware.SensorEvent
import android.hardware.SensorEventListener
import android.hardware.SensorManager
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.WritableMap
import kotlin.math.abs
import kotlin.math.sqrt

private const val GRAVITY_MS2 = 9.80665

class ParkingGuard(
    context: Context,
    private val onImpact: (WritableMap) -> Unit
) : SensorEventListener {

    private val sensorManager = context.getSystemService(Context.SENSOR_SERVICE) as SensorManager
    private val accelerometer = sensorManager.getDefaultSensor(Sensor.TYPE_ACCELEROMETER)

    var impactThresholdG = 1.6
    var cooldownMs = 15000L
    var dualCameraEnabled = false
        private set

    private var lastEventAtMs = 0L
    private var monitoring = false

    fun setDualCameraEnabled(enabled: Boolean) {
        // CameraX concurrent-camera capability must be probed before enabling;
        // callers should check DeviceCapability.cameraSensors from
        // packages/core/src/types.ts and only allow this on supported devices.
        dualCameraEnabled = enabled
    }

    fun startMonitoring() {
        if (monitoring || accelerometer == null) return
        monitoring = true
        // SENSOR_DELAY_NORMAL is plenty for impact detection and keeps
        // battery drain minimal while the car is parked for hours.
        sensorManager.registerListener(this, accelerometer, SensorManager.SENSOR_DELAY_NORMAL)
    }

    fun stopMonitoring() {
        if (!monitoring) return
        monitoring = false
        sensorManager.unregisterListener(this)
    }

    override fun onSensorChanged(event: SensorEvent) {
        val x = event.values[0]
        val y = event.values[1]
        val z = event.values[2]
        val totalMs2 = sqrt((x * x + y * y + z * z).toDouble())
        val magnitudeG = abs(totalMs2 - GRAVITY_MS2) / GRAVITY_MS2

        val now = System.currentTimeMillis()
        if (magnitudeG >= impactThresholdG && now - lastEventAtMs >= cooldownMs) {
            lastEventAtMs = now
            val map: WritableMap = Arguments.createMap()
            map.putString("kind", "impact")
            map.putDouble("magnitudeG", magnitudeG)
            map.putDouble("timestampMs", now.toDouble())
            onImpact(map)
        }
    }

    override fun onAccuracyChanged(sensor: Sensor?, accuracy: Int) {}
}
