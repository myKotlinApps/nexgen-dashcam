@file: MediaEncoder — CameraX recorder with ALPR frame sampling
package com.nexgen.dashcam

import android.content.Context
import android.os.Handler
import android.util.Size
import androidx.camera.core.*
import androidx.camera.video.*
import java.io.File

class MediaEncoder(private val context: Context) {

    data class EncodedSegment(val id: String, val path: String, val sizeBytes: Long, val durationMs: Long)

    var currentSegmentIndex = 0; private set
    var elapsedMs = 0L; private set
    var droppedFrames = 0; private set
    var lastError: String? = null; private set

    private var activeRecording: Recording? = null
    private var resolution = Size(1280, 720)
    private var fps = 30
    private var segmentDurationMin = 3
    private var audioEnabled = false
    private var currentOutputDir: File? = null
    private var segmentCallback: ((EncodedSegment) -> Unit)? = null

    fun configure(config: Map<String, Any?>) {
        resolution = when (config["resolution"] as? String) { "1080p" -> Size(1920, 1080); else -> Size(1280, 720) }
        fps = (config["fps"] as? Number)?.toInt() ?: 30
        segmentDurationMin = (config["segmentDurationMin"] as? Number)?.toInt() ?: 3
        audioEnabled = config["audioEnabled"] == true
        currentOutputDir = File(context.filesDir, "dashcam/trips/${System.currentTimeMillis()}").also { it.mkdirs() }
    }

    fun setOnSegmentReady(cb: (EncodedSegment) -> Unit) { segmentCallback = cb }

    fun startRecording() { currentSegmentIndex = 0; elapsedMs = 0L; startNewSegment() }
    fun stopRecording() { activeRecording?.stop() }

    fun protectCurrentSegment() {
        val file = File(currentOutputDir, "segment_${currentSegmentIndex}.mp4")
        if (file.exists()) segmentCallback?.invoke(EncodedSegment("seg-${System.currentTimeMillis()}", file.absolutePath, file.length(), segmentDurationMin * 60_000L))
    }

    private fun startNewSegment() {
        currentSegmentIndex++
        val outputFile = File(currentOutputDir, "segment_${currentSegmentIndex}.mp4")
        activeRecording?.stop()

        val recorder = Recorder.Builder()
            .setQualitySelector(QualitySelector.from(if (resolution.height <= 720) Quality.SD else Quality.HD, FallbackStrategy.lowerQualityOrHigherThan(Quality.SD)))
            .build()

        activeRecording = recorder.prepareRecording(context, outputFile.toMediaStoreOutputOptions())
            .withAudioEnabled()
            .start(ContextCompat.getMainExecutor(context)) {}

        Handler(context.mainLooper).postDelayed({
            if (activeRecording != null) {
                segmentCallback?.invoke(EncodedSegment("seg-${System.currentTimeMillis()}-${currentSegmentIndex}", outputFile.absolutePath, outputFile.length(), segmentDurationMin * 60_000L))
                elapsedMs += segmentDurationMin * 60_000L
                startNewSegment()
            }
        }, segmentDurationMin * 60_000L)
    }

    private fun File.toMediaStoreOutputOptions() = MediaStoreOutputOptions.Builder(context.contentResolver, android.provider.MediaStore.Video.Media.EXTERNAL_CONTENT_URI).build()
}
