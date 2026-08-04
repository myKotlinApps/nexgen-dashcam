@file: ThermalMonitor
package com.nexgen.dashcam

import android.content.Context
import android.os.PowerManager

class ThermalMonitor(private val context: Context) {

    var currentState = STATUS_NORMAL
        private set

    fun start() {
        val pm = context.getSystemService(Context.POWER_SERVICE) as PowerManager
        pm.addThermalStatusListener { status ->
            currentState = when (status) {
                PowerManager.THERMAL_STATUS_NONE,
                PowerManager.THERMAL_STATUS_LIGHT -> STATUS_NORMAL
                PowerManager.THERMAL_STATUS_MODERATE -> STATUS_WARNING
                PowerManager.THERMAL_STATUS_SEVERE,
                PowerManager.THERMAL_STATUS_CRITICAL,
                PowerManager.THERMAL_STATUS_EMERGENCY -> STATUS_CRITICAL
                else -> STATUS_NORMAL
            }
        }
    }

    fun stop() {}

    companion object {
        const val STATUS_NORMAL = "normal"
        const val STATUS_WARNING = "warning"
        const val STATUS_CRITICAL = "critical"
    }
}
