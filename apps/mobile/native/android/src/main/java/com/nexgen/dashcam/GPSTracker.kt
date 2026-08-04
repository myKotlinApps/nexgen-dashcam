@file: GPSTracker
package com.nexgen.dashcam

import android.content.Context
import android.location.Location
import android.location.LocationListener
import android.location.LocationManager
import android.os.Bundle

class GPSTracker(private val context: Context) : LocationListener {

    var isLocked = false
        private set
    private var locationManager: LocationManager? = null

    fun start() {
        locationManager = context.getSystemService(Context.LOCATION_SERVICE) as LocationManager
        try {
            locationManager?.requestLocationUpdates(
                LocationManager.GPS_PROVIDER,
                1000L,
                1f,
                this
            )
        } catch (_: SecurityException) {}
    }

    fun stop() {
        locationManager?.removeUpdates(this)
        isLocked = false
    }

    override fun onLocationChanged(location: Location) {
        isLocked = true
    }

    override fun onProviderEnabled(provider: String) {}
    override fun onProviderDisabled(provider: String) { isLocked = false }
}
