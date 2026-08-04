@file: CameraService — Foreground Service with ALPR integration
package com.nexgen.dashcam

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.IBinder
import android.os.PowerManager
import androidx.core.app.NotificationCompat
import java.util.concurrent.atomic.AtomicBoolean

class CameraService : Service() {

    companion object {
        private const val CHANNEL_ID = "nexgen_dashcam_recording"
        private const val NOTIFICATION_ID = 4242
        const val ACTION_STOP = "com.nexgen.dashcam.STOP"
        const val ACTION_PROTECT = "com.nexgen.dashcam.PROTECT"
        private var instance: CameraService? = null
        fun getInstance(): CameraService? = instance
    }

    private lateinit var mediaEncoder: MediaEncoder
    private lateinit var storageManager: StorageManager
    var alprProcessor: ALPRProcessor? = null
        private set
    private lateinit var gpsTracker: GPSTracker
    private lateinit var thermalMonitor: ThermalMonitor

    private val isRecording = AtomicBoolean(false)
    private var eventCallback: ((String, Any?) -> Unit)? = null
    private var wakeLock: PowerManager.WakeLock? = null

    override fun onCreate() {
        super.onCreate()
        instance = this
        createNotificationChannel()
        mediaEncoder = MediaEncoder(this)
        storageManager = StorageManager(this)
        gpsTracker = GPSTracker(this)
        thermalMonitor = ThermalMonitor(this)
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        when (intent?.action) { ACTION_STOP -> stop(); ACTION_PROTECT -> mediaEncoder.protectCurrentSegment() }
        return START_STICKY
    }

    fun start(context: Context, config: Map<String, Any?>, callback: (String, Any?) -> Unit) {
        this.eventCallback = callback
        val notification = buildNotification()
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            startForeground(NOTIFICATION_ID, notification,
                android.content.pm.ServiceInfo.FOREGROUND_SERVICE_TYPE_CAMERA or
                android.content.pm.ServiceInfo.FOREGROUND_SERVICE_TYPE_LOCATION)
        } else { startForeground(NOTIFICATION_ID, notification) }

        acquireWakeLock()
        storageManager.configure((config["storageLimitMB"] as? Number)?.toInt() ?: 8192)
        mediaEncoder.configure(config)
        if (config["gpsEnabled"] == true) gpsTracker.start()
        thermalMonitor.start()

        // ALPR is started by NexGenDashCamModule via startAlpr()

        mediaEncoder.setOnSegmentReady { segment ->
            storageManager.addSegment(segment)
            eventCallback?.invoke("onSegmentReady", mapOf("id" to segment.id, "path" to segment.path, "sizeBytes" to segment.sizeBytes))
        }
        mediaEncoder.startRecording()
        isRecording.set(true)
        eventCallback?.invoke("onStatusChange", getStatusMap())
    }

    fun stop() {
        isRecording.set(false)
        mediaEncoder.stopRecording()
        gpsTracker.stop(); thermalMonitor.stop()
        releaseWakeLock()
        stopForeground(STOP_FOREGROUND_REMOVE); stopSelf()
        instance = null
        eventCallback?.invoke("onRecordingStopped", null)
    }

    fun protectSegment(id: String) = storageManager.protectSegment(id)
    fun getStatus() = NexGenStatus(
        status = if (isRecording.get()) "recording" else "idle",
        tripId = storageManager.currentTripId, currentSegmentIndex = mediaEncoder.currentSegmentIndex,
        elapsedMs = mediaEncoder.elapsedMs, droppedFrames = mediaEncoder.droppedFrames,
        thermalState = thermalMonitor.currentState, gpsLocked = gpsTracker.isLocked,
        errorMessage = mediaEncoder.lastError
    )

    private fun getStatusMap() = mapOf("status" to getStatus().status, "elapsedMs" to getStatus().elapsedMs)

    private fun buildNotification() = NotificationCompat.Builder(this, CHANNEL_ID)
        .setContentTitle("DashCam — Recording")
        .setContentText("Tap to stop")
        .setSmallIcon(android.R.drawable.ic_menu_camera)
        .setOngoing(true).setPriority(NotificationCompat.PRIORITY_LOW)
        .addAction(android.R.drawable.ic_media_pause, "Stop",
            PendingIntent.getService(this, 0, Intent(this, CameraService::class.java).apply { action = ACTION_STOP }, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE))
        .addAction(android.R.drawable.ic_secure, "Protect",
            PendingIntent.getService(this, 1, Intent(this, CameraService::class.java).apply { action = ACTION_PROTECT }, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE))
        .build()

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            (getSystemService(NOTIFICATION_SERVICE) as NotificationManager)
                .createNotificationChannel(NotificationChannel(CHANNEL_ID, "Recording", NotificationManager.IMPORTANCE_LOW).apply { description = "DashCam recording active"; setShowBadge(false) })
        }
    }

    private fun acquireWakeLock() {
        wakeLock = (getSystemService(POWER_SERVICE) as PowerManager)
            .newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "NexGenDashCam:Recording")
            .apply { setReferenceCounted(false); acquire(4 * 60 * 60 * 1000L) }
    }

    private fun releaseWakeLock() { wakeLock?.takeIf { it.isHeld }?.release(); wakeLock = null }

    override fun onBind(intent: Intent?): IBinder? = null
    override fun onDestroy() { if (isRecording.get()) stop(); super.onDestroy() }

    data class NexGenStatus(val status: String, val tripId: String?, val currentSegmentIndex: Int, val elapsedMs: Long, val droppedFrames: Int, val thermalState: String, val gpsLocked: Boolean, val errorMessage: String?)
}
