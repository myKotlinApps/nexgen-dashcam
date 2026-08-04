package com.nexgen.dashcam

// Lane Departure Warning — native frame pipeline (Android)
//
// Pipeline: CameraX ImageProxy -> grayscale -> Canny edges -> probabilistic
// Hough transform (region-of-interest = lower half of frame) -> hand off
// the raw line segments to the shared TS/JS math in
// packages/core/src/laneDeparture.ts (classifyLaneLines / computeLaneOffset
// / LaneDepartureStateMachine) via the RN bridge event `onLaneDeparture`.
//
// Algorithm shape follows the classic MIT-licensed OpenCV lane-finding
// pipeline (see e.g. tomazas/opencv-lane-vehicle-track, MIT License) —
// Canny + HoughLinesP + slope-based left/right classification — but this
// is an original implementation against OpenCV's Android API, not copied
// code. Requires the `org.opencv:opencv` (Apache-2.0) Gradle dependency.

import android.graphics.Bitmap
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.WritableMap

data class HoughSegment(val x1: Float, val y1: Float, val x2: Float, val y2: Float)

class LaneDepartureDetector(
    private val onSegments: (WritableMap) -> Unit
) {
    private var isRunning = false
    private var frameCounter = 0

    // Every Nth frame is processed — lane geometry doesn't change fast
    // enough to need full frame-rate analysis, and this keeps CPU/thermal
    // budget for the ALPR + encoder pipelines running concurrently.
    private val frameStride = 3

    fun start() {
        isRunning = true
        frameCounter = 0
    }

    fun stop() {
        isRunning = false
    }

    /**
     * @param bitmap Downscaled grayscale frame (recommended ~640x360) from
     * the CameraX analyzer. Actual Canny/Hough calls go through OpenCV's
     * `Imgproc.Canny` + `Imgproc.HoughLinesP` (TODO: wire up once the
     * `org.opencv:opencv` dependency is added to build.gradle.kts).
     */
    fun processFrame(bitmap: Bitmap, timestampMs: Long) {
        if (!isRunning) return
        if (frameCounter++ % frameStride != 0) return

        // TODO once OpenCV dependency is added:
        // val mat = Mat(); Utils.bitmapToMat(bitmap, mat)
        // Imgproc.cvtColor(mat, mat, Imgproc.COLOR_RGBA2GRAY)
        // val roi = Mat(mat, Rect(0, mat.rows() / 2, mat.cols(), mat.rows() / 2))
        // Imgproc.GaussianBlur(roi, roi, Size(5.0, 5.0), 0.0)
        // Imgproc.Canny(roi, roi, 50.0, 150.0)
        // val lines = Mat()
        // Imgproc.HoughLinesP(roi, lines, 1.0, Math.PI / 180, 40, 30.0, 100.0)
        // val segments = extractSegments(lines, bitmap.height / 2)
        // emit(segments, bitmap.width, bitmap.height, timestampMs)
    }

    /** Emits raw Hough segments up to JS, where laneDeparture.ts owns the math. */
    private fun emit(segments: List<HoughSegment>, frameWidth: Int, frameHeight: Int, timestampMs: Long) {
        val map = Arguments.createMap()
        val arr = Arguments.createArray()
        for (seg in segments) {
            val segMap = Arguments.createMap()
            segMap.putDouble("x1", seg.x1.toDouble())
            segMap.putDouble("y1", seg.y1.toDouble())
            segMap.putDouble("x2", seg.x2.toDouble())
            segMap.putDouble("y2", seg.y2.toDouble())
            arr.pushMap(segMap)
        }
        map.putArray("segments", arr)
        map.putInt("frameWidth", frameWidth)
        map.putInt("frameHeight", frameHeight)
        map.putDouble("timestampMs", timestampMs.toDouble())
        onSegments(map)
    }
}
