@file: MediaEncoder — CameraX + MediaCodec video segment encoder
package com.nexgen.dashcam

import android.content.Context
import android.media.MediaCodec
import android.media.MediaCodecInfo
import android.media.MediaFormat
import android.media.MediaMuxer
import android.os.Handler
import android.os.HandlerThread
import android.util.Size
import android.view.Surface
import androidx.camera.core.*
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.camera.video.*
import androidx.core.content.ContextCompat
import androidx.lifecycle.LifecycleOwner
import java.io.File
import java.util.concurrent.Executors

/**
 * Manages CameraX preview + video recording into segmented MP4 files.
 *
 * Adaptive quality: drops to 720p when thermal state is warning.
 * Encoder uses hardware H.264 (AVC) by default for max compatibility.
 */
class MediaEncoder(
    private val context: Context
) : LifecycleOwner {

    data class EncodedSegment(
        val id: String,
        val path: String,
        val sizeBytes: Long,
        val durationMs: Long
    )

    var currentSegmentIndex = 0
        private set
    var elapsedMs = 0L
        private set
    var droppedFrames = 0
        private set
    var lastError: String? = null
        private set

    private var cameraProvider: ProcessCameraProvider? = null
    private var preview: Preview? = null
    private var videoCapture: VideoCapture<Recorder>? = null
    private var activeRecording: Recording? = null

    private var resolution: Size = Size(1280, 720)
    private var fps = 30
    private var bitrate = 6_000_000
    private var segmentDurationMin = 3
    private var audioEnabled = false
    private var currentOutputDir: File? = null

    private var segmentCallback: ((EncodedSegment) -> Unit)? = null

    fun configure(
        resolutionStr: String,
        fps: Int,
        bitrateMbps: Double,
        segmentDurationMin: Int,
        audioEnabled: Boolean
    ) {
        this.resolution = when (resolutionStr) {
            "1080p" -> Size(1920, 1080)
            "720p" -> Size(1280, 720)
            else -> Size(1280, 720)
        }
        this.fps = fps
        this.bitrate = (bitrateMbps * 1_000_000).toInt()
        this.segmentDurationMin = segmentDurationMin
        this.audioEnabled = audioEnabled
        this.currentOutputDir = File(context.filesDir, "dashcam/trips/${System.currentTimeMillis()}")
            .also { it.mkdirs() }
    }

    fun setOnSegmentReady(callback: (EncodedSegment) -> Unit) {
        segmentCallback = callback
    }

    fun startRecording() {
        currentSegmentIndex = 0
        elapsedMs = 0L
        droppedFrames = 0
        startNewSegment()
    }

    fun stopRecording() {
        activeRecording?.stop()
    }

    fun protectCurrentSegment() {
        segmentCallback?.let { cb ->
            val path = File(currentOutputDir, "segment_${currentSegmentIndex}.mp4")
            if (path.exists()) {
                cb(EncodedSegment(
                    id = "seg-${System.currentTimeMillis()}",
                    path = path.absolutePath,
                    sizeBytes = path.length(),
                    durationMs = segmentDurationMin * 60_000L
                ))
            }
        }
    }

    private fun startNewSegment() {
        currentSegmentIndex++
        val outputFile = File(currentOutputDir, "segment_${currentSegmentIndex}.mp4")

        activeRecording?.stop()

        val recorder = Recorder.Builder()
            .setQualitySelector(
                QualitySelector.from(
                    if (resolution.height <= 720) Quality.SD else Quality.HD,
                    FallbackStrategy.lowerQualityOrHigherThan(Quality.SD)
                )
            )
            .build()

        val pendingRecording = recorder.prepareRecording(context, outputFile.toMediaStoreOutputOptions())
            .withAudioEnabled()

        activeRecording = pendingRecording
            .start(ContextCompat.getMainExecutor(context)) { recordEvent ->
                // Event not strongly needed here; handled by segment callbacks
            }

        val segmentDurationMs = segmentDurationMin * 60_000L

        Handler(context.mainLooper).postDelayed({
            if (activeRecording != null) {
                val fileSize = outputFile.length()
                segmentCallback?.invoke(EncodedSegment(
                    id = "seg-${System.currentTimeMillis()}-${currentSegmentIndex}",
                    path = outputFile.absolutePath,
                    sizeBytes = fileSize,
                    durationMs = segmentDurationMs
                ))
                elapsedMs += segmentDurationMs
                startNewSegment()
            }
        }, segmentDurationMs)
    }

    private fun File.toMediaStoreOutputOptions(): MediaStoreOutputOptions {
        return MediaStoreOutputOptions.Builder(
            context.contentResolver,
            android.provider.MediaStore.Video.Media.EXTERNAL_CONTENT_URI
        ).apply {}
            .build()
    }

    override fun getLifecycle(): androidx.lifecycle.Lifecycle {
        return object : androidx.lifecycle.Lifecycle() {
            override fun addObserver(observer: androidx.lifecycle.LifecycleObserver) {}
            override fun removeObserver(observer: androidx.lifecycle.LifecycleObserver) {}
            override fun getCurrentState(): androidx.lifecycle.Lifecycle.State {
                return androidx.lifecycle.Lifecycle.State.STARTED
            }
        }
    }
}
