@file: CameraService — Foreground Service for dash cam recording
package com.nexgen.dashcam

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.hardware.camera2.CameraManager
import android.os.Build
import android.os.IBinder
import android.os.PowerManager
import androidx.core.app.NotificationCompat
import java.util.concurrent.atomic.AtomicBoolean

/**
 * Android Foreground Service for continuous dash cam video recording.
 *
 * Uses CameraX internally via MediaEncoder. The service keeps a persistent
 * notification so the system does not kill recording.
 *
 * Platform constraints:
 * - Android 9+ (API 28): Requires foreground service for background camera.
 * - Android 14+ (API 34): Must declare FOREGROUND_SERVICE_TYPE_CAMERA|LOCATION.
 * - Service CANNOT start from BOOT_COMPLETED — user must initiate.
 */
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
    private var alprProcessor: ALPRProcessor? = null
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
        when (intent?.action) {
            ACTION_STOP -> stop()
            ACTION_PROTECT -> handleProtect()
        }
        return START_STICKY
    }

    fun start(
        context: Context,
        resolution: String,
        fps: Int,
        bitrateMbps: Double,
        segmentDurationMin: Int,
        audioEnabled: Boolean,
        gpsEnabled: Boolean,
        alprEnabled: Boolean,
        storageLimitMB: Int,
        callback: (String, Any?) -> Unit
    ) {
        this.eventCallback = callback

        val notification = buildNotification()

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            startForeground(
                NOTIFICATION_ID,
                notification,
                android.content.pm.ServiceInfo.FOREGROUND_SERVICE_TYPE_CAMERA or
                        android.content.pm.ServiceInfo.FOREGROUND_SERVICE_TYPE_LOCATION
            )
        } else {
            startForeground(NOTIFICATION_ID, notification)
        }

        acquireWakeLock()

        storageManager.configure(storageLimitMB)
        mediaEncoder.configure(resolution, fps, bitrateMbps, segmentDurationMin, audioEnabled)

        if (gpsEnabled) gpsTracker.start()
        thermalMonitor.start()

        if (alprEnabled) {
            alprProcessor = ALPRProcessor(context).also { it.start() }
        }

        mediaEncoder.setOnSegmentReady { segment ->
            storageManager.addSegment(segment)
            eventCallback?.invoke("onSegmentReady", mapOf(
                "id" to segment.id,
                "path" to segment.path,
                "sizeBytes" to segment.sizeBytes
            ))
        }

        mediaEncoder.startRecording()
        isRecording.set(true)
        eventCallback?.invoke("onStatusChange", getStatusMap())
    }

    fun stop() {
        isRecording.set(false)
        mediaEncoder.stopRecording()
        gpsTracker.stop()
        thermalMonitor.stop()
        alprProcessor?.stop()
        releaseWakeLock()

        stopForeground(STOP_FOREGROUND_REMOVE)
        stopSelf()
        instance = null
        eventCallback?.invoke("onRecordingStopped", null)
    }

    fun protectSegment(segmentId: String): Boolean {
        return storageManager.protectSegment(segmentId)
    }

    fun getStatus(): NexGenStatus {
        return NexGenStatus(
            status = if (isRecording.get()) "recording" else "idle",
            tripId = storageManager.currentTripId,
            currentSegmentIndex = mediaEncoder.currentSegmentIndex,
            elapsedMs = mediaEncoder.elapsedMs,
            droppedFrames = mediaEncoder.droppedFrames,
            thermalState = thermalMonitor.currentState,
            gpsLocked = gpsTracker.isLocked,
            errorMessage = mediaEncoder.lastError
        )
    }

    private fun getStatusMap(): Map<String, Any?> {
        val s = getStatus()
        return mapOf(
            "status" to s.status,
            "tripId" to s.tripId,
            "currentSegmentIndex" to s.currentSegmentIndex,
            "elapsedMs" to s.elapsedMs,
            "droppedFrames" to s.droppedFrames,
            "thermalState" to s.thermalState,
            "gpsLocked" to s.gpsLocked,
            "errorMessage" to s.errorMessage
        )
    }

    private fun buildNotification(): Notification {
        val stopIntent = Intent(this, CameraService::class.java).apply {
            action = ACTION_STOP
        }
        val stopPending = PendingIntent.getService(
            this, 0, stopIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val protectIntent = Intent(this, CameraService::class.java).apply {
            action = ACTION_PROTECT
        }
        val protectPending = PendingIntent.getService(
            this, 1, protectIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("DashCam — Recording")
            .setContentText("Tap to stop \u00B7 Protect recent clip")
            .setSmallIcon(android.R.drawable.ic_menu_camera)
            .setOngoing(true)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .addAction(android.R.drawable.ic_media_pause, "Stop", stopPending)
            .addAction(android.R.drawable.ic_secure, "Protect", protectPending)
            .build()
    }

    private fun handleProtect() {
        mediaEncoder.protectCurrentSegment()
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "Recording",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "DashCam recording active"
                setShowBadge(false)
            }
            val manager = getSystemService(NotificationManager::class.java)
            manager.createNotificationChannel(channel)
        }
    }

    private fun acquireWakeLock() {
        val pm = getSystemService(Context.POWER_SERVICE) as PowerManager
        wakeLock = pm.newWakeLock(
            PowerManager.PARTIAL_WAKE_LOCK,
            "NexGenDashCam:RecordingWakeLock"
        ).apply {
            setReferenceCounted(false)
            acquire(4 * 60 * 60 * 1000L)
        }
    }

    private fun releaseWakeLock() {
        wakeLock?.takeIf { it.isHeld }?.release()
        wakeLock = null
    }

    override fun onBind(intent: Intent?): IBinder? = null
    override fun onDestroy() {
        if (isRecording.get()) stop()
        super.onDestroy()
    }

    data class NexGenStatus(
        val status: String,
        val tripId: String?,
        val currentSegmentIndex: Int,
        val elapsedMs: Long,
        val droppedFrames: Int,
        val thermalState: String,
        val gpsLocked: Boolean,
        val errorMessage: String?
    )
}
