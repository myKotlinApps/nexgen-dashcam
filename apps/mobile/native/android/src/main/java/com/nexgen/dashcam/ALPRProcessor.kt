@file: ALPRProcessor — On-device Persian license plate recognition
package com.nexgen.dashcam

import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.RectF
import android.util.Log
import java.io.File
import java.io.FileOutputStream
import java.util.UUID
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.atomic.AtomicBoolean

/**
 * Full ALPR pipeline for Persian (Iranian) license plates.
 *
 * Pipeline:
 *   Frame Sampler → Plate Detector (YOLO/ONNX) →
 *   Crop + Perspective → Persian OCR →
 *   Tracker + Multi-frame Consensus → Region Lookup
 *
 * All processing stays on-device. No data leaves without user consent.
 *
 * Model loading: Models are NOT bundled — downloaded on first run from
 * the model registry (see packages/telemetry/data/models-registry.yaml).
 */
class ALPRProcessor(private val context: Context) {

    companion object {
        private const val TAG = "NexGen_ALPR"
        private const val MIN_CONFIDENCE = 0.65f
        private const val MIN_CONSECUTIVE_FRAMES = 3
        private const val MAX_TRACKING_FRAMES = 15
    }

    // ─── State ──────────────────────────────────────────
    private val isRunning = AtomicBoolean(false)
    private var inferenceFps = 4
    private var frameCounter = 0

    // ─── Pipeline Components ────────────────────────────
    private var detector: PlateDetector? = null
    private var ocr: PersianOCR? = null
    private var regionLookup: RegionLookup
    private var tracker = PlateTracker()
    private var consensus = ConsensusEngine()

    // ─── Callbacks ──────────────────────────────────────
    private var plateCallback: ((PlateEvent) -> Unit)? = null
    private var statusCallback: ((AlprStatus) -> Unit)? = null

    init {
        regionLookup = RegionLookup()
    }

    // ─── Lifecycle ──────────────────────────────────────
    fun start() {
        Log.i(TAG, "Starting ALPR pipeline")
        isRunning.set(true)
        frameCounter = 0
        consensus.reset()
        tracker.clear()
        statusCallback?.invoke(AlprStatus("loading", "Initializing models..."))

        try {
            detector = PlateDetector(context).apply { load() }
            ocr = PersianOCR(context).apply { load() }
            statusCallback?.invoke(AlprStatus("ready", "ALPR active"))
        } catch (e: Exception) {
            Log.e(TAG, "Failed to load ALPR models", e)
            statusCallback?.invoke(AlprStatus("error", "Model load failed: ${e.message}"))
        }
    }

    fun stop() {
        Log.i(TAG, "Stopping ALPR pipeline")
        isRunning.set(false)
        detector?.close()
        ocr?.close()
        statusCallback?.invoke(AlprStatus("idle", "ALPR stopped"))
    }

    fun setInferenceFps(fps: Int) {
        inferenceFps = fps.coerceIn(2, 15)
    }

    // ─── Callbacks ──────────────────────────────────────
    fun onPlateRecognized(callback: (PlateEvent) -> Unit) { plateCallback = callback }
    fun onStatusChanged(callback: (AlprStatus) -> Unit) { statusCallback = callback }

    // ─── Frame Processing ───────────────────────────────
    /**
     * Process a camera frame. Called from CameraX ImageAnalysis or frame processor.
     *
     * @param frameData Raw YUV or JPEG bytes
     * @param width Frame width in pixels
     * @param height Frame height in pixels
     * @param frameIndex Monotonic frame counter
     * @param ptsUs Presentation timestamp in microseconds
     * @param segmentId Current recording segment ID
     * @param tripId Current trip ID
     */
    fun processFrame(
        frameData: ByteArray,
        width: Int,
        height: Int,
        frameIndex: Int,
        ptsUs: Long,
        segmentId: String,
        tripId: String
    ): List<PlateEvent> {
        if (!isRunning.get()) return emptyList()

        // Frame skipping based on configured FPS
        frameCounter++
        val skipFrames = 30 / inferenceFps
        if (frameCounter % skipFrames != 0) return emptyList()

        val results = mutableListOf<PlateEvent>()

        try {
            // 1. Decode frame to bitmap (use thumbnail decode for speed)
            val opts = BitmapFactory.Options().apply {
                inSampleSize = if (width > 1920) 2 else 1
                inPreferredConfig = Bitmap.Config.RGB_565
            }
            val bitmap = BitmapFactory.decodeByteArray(frameData, 0, frameData.size, opts)
                ?: return emptyList()

            // 2. Detect plates
            val detections = detector?.detect(bitmap) ?: emptyList()

            // 3. For each detection, run OCR
            for (detection in detections) {
                if (detection.confidence < MIN_CONFIDENCE) continue

                val croppedPlate = cropPlate(bitmap, detection.boundingBox)
                val ocrResult = ocr?.recognize(croppedPlate) ?: continue
                if (ocrResult.confidence < MIN_CONFIDENCE) continue

                // 4. Normalize & validate
                val normalized = PersianPlateNormalizer.normalize(ocrResult.raw)
                if (!PersianPlateNormalizer.isValid(normalized)) continue

                // 5. Track across frames
                val trackId = tracker.update(detection.boundingBox, normalized)

                // 6. Multi-frame consensus
                val confirmed = consensus.check(normalized, ocrResult.confidence)
                if (!confirmed) continue  // need 3+ consistent reads

                // 7. Region lookup
                val region = regionLookup.lookup(normalized)

                // 8. Build event
                val event = PlateEvent(
                    eventId = UUID.randomUUID().toString(),
                    tripId = tripId,
                    segmentId = segmentId,
                    frameIndex = frameIndex,
                    ptsUs = ptsUs,
                    capturedAtUtc = java.time.Instant.now().toString(),
                    plateRaw = ocrResult.raw,
                    plateNormalized = normalized,
                    confidence = ocrResult.confidence.toDouble(),
                    boundingBox = floatArrayOf(
                        detection.boundingBox.left / width,
                        detection.boundingBox.top / height,
                        detection.boundingBox.width() / width,
                        detection.boundingBox.height() / height
                    ),
                    trackId = trackId,
                    bestFrame = consensus.isBestFrame(normalized),
                    regionCode = region?.regionCode,
                    province = region?.province,
                    city = region?.city,
                    modelVersion = "ir-alpr-1.0"
                )

                results.add(event)
                plateCallback?.invoke(event)
                Log.d(TAG, "Plate recognized: $normalized (${ocrResult.confidence})")
            }

            bitmap.recycle()

        } catch (e: Exception) {
            Log.e(TAG, "Frame processing error", e)
        }

        return results
    }

    private fun cropPlate(bitmap: Bitmap, box: RectF): Bitmap {
        val left = (box.left * bitmap.width).toInt().coerceIn(0, bitmap.width)
        val top = (box.top * bitmap.height).toInt().coerceIn(0, bitmap.height)
        val right = (box.right * bitmap.width).toInt().coerceIn(0, bitmap.width)
        val bottom = (box.bottom * bitmap.height).toInt().coerceIn(0, bitmap.height)
        return Bitmap.createBitmap(bitmap, left, top, right - left, bottom - top)
    }

    // ─── Status ────────────────────────────────────────
    fun getStatus(): AlprStatus {
        return AlprStatus(
            status = if (isRunning.get()) "ready" else "idle",
            detail = "FPS: $inferenceFps | Tracks: ${tracker.count()}"
        )
    }

    data class AlprStatus(val status: String, val detail: String)
}

// ═══════════════════════════════════════════════════════
// Plate Detector — YOLO-based bounding box detection
// ═══════════════════════════════════════════════════════

class PlateDetector(context: Context) {

    data class Detection(val boundingBox: RectF, val confidence: Float)

    private var isLoaded = false

    fun load() {
        // TODO: Load ONNX/TFLite model from assets or download
        // val modelFile = File(context.filesDir, "models/plate_detector.onnx")
        // ortSession = OrtSession(ortEnv, modelFile.absolutePath)
        isLoaded = true
    }

    fun detect(bitmap: Bitmap): List<Detection> {
        if (!isLoaded) return emptyList()

        // TODO: Run ONNX/TFLite inference
        // 1. Preprocess: resize to 640x640, normalize [0,1]
        // 2. Run model → get bounding boxes + scores
        // 3. NMS (non-maximum suppression)
        // 4. Return detections above threshold

        // Placeholder for now — real inference when model is available
        return emptyList()
    }

    fun close() { isLoaded = false }
}

// ═══════════════════════════════════════════════════════
// Persian OCR — Character recognition for plates
// ═══════════════════════════════════════════════════════

class PersianOCR(context: Context) {

    data class OcrResult(val raw: String, val confidence: Float)

    private var isLoaded = false

    fun load() { isLoaded = true }

    fun recognize(bitmap: Bitmap): OcrResult {
        if (!isLoaded) return OcrResult("", 0f)

        // TODO: Run PaddleOCR / custom ONNX model for Persian character recognition
        // 1. Preprocess: grayscale, threshold, resize to 100x32
        // 2. Run CRNN/CTC model
        // 3. Decode CTC output to string
        // 4. Apply confusion matrix for similar-looking Persian chars

        return OcrResult("", 0f)
    }

    fun close() { isLoaded = false }
}

// ═══════════════════════════════════════════════════════
// Plate Tracker — Multi-frame object tracking
// ═══════════════════════════════════════════════════════

class PlateTracker {

    data class Track(val id: String, val plate: String, var lastBox: RectF, var framesSinceSeen: Int)

    private val tracks = mutableMapOf<String, Track>()
    private val iouThreshold = 0.3f

    fun update(box: RectF, plate: String): String {
        // Find closest existing track by IoU
        var bestTrack: Track? = null
        var bestIoU = 0f

        for (track in tracks.values) {
            val iou = computeIoU(box, track.lastBox)
            if (iou > bestIoU && iou > iouThreshold) {
                bestTrack = track
                bestIoU = iou
            }
        }

        if (bestTrack != null) {
            bestTrack.lastBox = box
            bestTrack.plate = plate
            bestTrack.framesSinceSeen = 0
            return bestTrack.id
        }

        val id = UUID.randomUUID().toString()
        tracks[id] = Track(id, plate, box, 0)
        return id
    }

    fun count(): Int = tracks.size

    fun clear() { tracks.clear() }

    private fun computeIoU(a: RectF, b: RectF): Float {
        val intersectLeft = maxOf(a.left, b.left)
        val intersectTop = maxOf(a.top, b.top)
        val intersectRight = minOf(a.right, b.right)
        val intersectBottom = minOf(a.bottom, b.bottom)
        if (intersectLeft >= intersectRight || intersectTop >= intersectBottom) return 0f

        val intersectArea = (intersectRight - intersectLeft) * (intersectBottom - intersectTop)
        val aArea = a.width() * a.height()
        val bArea = b.width() * b.height()
        return intersectArea / (aArea + bArea - intersectArea)
    }
}

// ═══════════════════════════════════════════════════════
// Consensus Engine — Multi-frame agreement
// ═══════════════════════════════════════════════════════

class ConsensusEngine {
    private var lastPlate: String? = null
    private var consecutiveCount = 0
    private var bestFrames = mutableMapOf<String, Float>()

    fun check(plate: String, confidence: Float): Boolean {
        if (confidence < 0.65f) { consecutiveCount = 0; return false }
        if (plate == lastPlate) consecutiveCount++ else { consecutiveCount = 1; lastPlate = plate }

        // Track best frame for each plate
        val current = bestFrames[plate] ?: 0f
        if (confidence > current) bestFrames[plate] = confidence

        return consecutiveCount >= 3
    }

    fun isBestFrame(plate: String): Boolean {
        return consecutiveCount == 3  // mark the first confirmed frame as best
    }

    fun reset() { lastPlate = null; consecutiveCount = 0; bestFrames.clear() }
}

// ═══════════════════════════════════════════════════════
// Persian Plate Normalizer
// ═══════════════════════════════════════════════════════

object PersianPlateNormalizer {

    // Persian ↔ Latin digit map
    private val digitMap = mapOf(
        '۰' to '0', '۱' to '1', '۲' to '2', '۳' to '3', '۴' to '4',
        '۵' to '5', '۶' to '6', '۷' to '7', '۸' to '8', '۹' to '9'
    )

    // Common OCR confusions for Persian characters
    private val confusionMap = mapOf(
        'ي' to 'ی', 'ى' to 'ی',  // Yeh variants
        'ك' to 'ک',               // Kaf
        'ة' to 'ه',               // Teh marbuta
        'ؤ' to 'و',               // Waw with hamza
    )

    // Valid Persian letters on private plates
    private val validLetters = setOf(
        'ب', 'ج', 'د', 'س', 'ص', 'ط', 'ق', 'ل', 'م', 'ن', 'و', 'ه', 'ی',
        'ت', 'پ', 'ث', 'ز', 'ژ', 'ش', 'ع', 'ف', 'ک', 'گ'
    )

    fun normalize(raw: String): String {
        var result = raw
            .trim()
            .replace(Regex("[\\s|\\-–—]+"), "-")
            .replace(Regex("ایران\\s*"), "")

        // Convert Persian digits to Latin for storage
        result = result.map { c -> digitMap[c] ?: c }.joinToString("")

        // Fix character confusions
        result = result.map { c -> confusionMap[c] ?: c }.joinToString("")

        // Normalize separator
        result = result.replace("-", "")

        return result.lowercase()
    }

    fun isValid(normalized: String): Boolean {
        // Pattern: 2-digit region code + 1 Persian letter + 3 digits + 1 letter + 2 digits
        val pattern = Regex("^\\d{2}([\\u0600-\\u06FF])\\d{3}([\\u0600-\\u06FF])\\d{2}$")
        val match = pattern.find(normalized) ?: return false
        val letter1 = match.groupValues[1].firstOrNull()
        val letter2 = match.groupValues[2].firstOrNull()
        return letter1 in validLetters && letter2 in validLetters
    }

    fun extractRegionCode(normalized: String): String? {
        val pattern = Regex("^(\\d{2})")
        return pattern.find(normalized)?.groupValues?.get(1)
    }
}

// ═══════════════════════════════════════════════════════
// Region Lookup — Plate code → city/province
// ═══════════════════════════════════════════════════════

class RegionLookup {

    data class Region(val regionCode: String, val province: String, val city: String)

    // Lookup table loaded from JSON at runtime
    private val regions = mutableMapOf<String, Region>()

    init {
        // Core mapping — loaded from assets/iran-plate-codes.json at runtime
        // Inlined here for the scaffold; production loads from bundled JSON
        val builtin = listOf(
            "10" to Region("10", "تهران", "تهران"),
            "11" to Region("11", "تهران", "تهران"),
            "12" to Region("12", "خراسان رضوی", "مشهد"),
            "13" to Region("13", "اصفهان", "اصفهان"),
            "14" to Region("14", "فارس", "شیراز"),
            "15" to Region("15", "آذربایجان شرقی", "تبریز"),
            "16" to Region("16", "گیلان", "رشت"),
            "17" to Region("17", "آذربایجان غربی", "ارومیه"),
            "18" to Region("18", "همدان", "همدان"),
            "19" to Region("19", "کرمانشاه", "کرمانشاه"),
            "20" to Region("20", "تهران", "تهران"),
            "21" to Region("21", "البرز", "کرج"),
            "22" to Region("22", "تهران", "تهران"),
            "23" to Region("23", "اصفهان", "اصفهان"),
            "24" to Region("24", "خوزستان", "اهواز"),
            "25" to Region("25", "آذربایجان شرقی", "تبریز"),
            "26" to Region("26", "خراسان شمالی", "بجنورد"),
            "27" to Region("27", "آذربایجان غربی", "ارومیه"),
            "28" to Region("28", "همدان", "همدان"),
            "29" to Region("29", "کردستان", "سنندج"),
            "30" to Region("30", "تهران", "ورامین"),
            "31" to Region("31", "لرستان", "خرم آباد"),
            "32" to Region("32", "خراسان شمالی", "بجنورد"),
            "33" to Region("33", "تهران", "تهران"),
            "34" to Region("34", "قزوین", "قزوین"),
            "35" to Region("35", "آذربایجان شرقی", "تبریز"),
            "36" to Region("36", "خراسان رضوی", "مشهد"),
            "37" to Region("37", "آذربایجان غربی", "ارومیه"),
            "38" to Region("38", "البرز", "اشتهارد"),
            "39" to Region("39", "کرمانشاه", "کرمانشاه"),
            "40" to Region("40", "تهران", "تهران"),
            "41" to Region("41", "مازندران", "ساری"),
            "42" to Region("42", "خراسان رضوی", "مشهد"),
            "43" to Region("43", "اصفهان", "اصفهان"),
            "44" to Region("44", "تهران", "تهران"),
            "45" to Region("45", "کرمان", "کرمان"),
            "46" to Region("46", "زنجان", "زنجان"),
            "47" to Region("47", "مرکزی", "اراک"),
            "48" to Region("48", "بوشهر", "بوشهر"),
            "49" to Region("49", "اردبیل", "اردبیل"),
            "50" to Region("50", "تهران", "تهران"),
            "51" to Region("51", "کردستان", "سنندج"),
            "52" to Region("52", "خراسان رضوی", "مشهد"),
            "53" to Region("53", "اصفهان", "کاشان"),
            "54" to Region("54", "یزد", "یزد"),
            "55" to Region("55", "تهران", "تهران"),
            "56" to Region("56", "سیستان و بلوچستان", "زاهدان"),
            "57" to Region("57", "چهارمحال و بختیاری", "شهرکرد"),
            "58" to Region("58", "بوشهر", "بوشهر"),
            "59" to Region("59", "کهگیلویه و بویراحمد", "یاسوج"),
            "60" to Region("60", "تهران", "تهران"),
            "61" to Region("61", "خراسان جنوبی", "بیرجند"),
            "62" to Region("62", "خراسان رضوی", "مشهد"),
            "63" to Region("63", "خوزستان", "اهواز"),
            "64" to Region("64", "یزد", "اردکان"),
            "65" to Region("65", "کرمان", "سیرجان"),
            "66" to Region("66", "تهران", "تهران"),
            "68" to Region("68", "البرز", "کرج"),
            "69" to Region("69", "گلستان", "گرگان"),
            "70" to Region("70", "تهران", "تهران"),
            "71" to Region("71", "قم", "قم"),
            "72" to Region("72", "خراسان رضوی", "سبزوار"),
            "73" to Region("73", "فارس", "شیراز"),
            "74" to Region("74", "مازندران", "بابل"),
            "75" to Region("75", "خوزستان", "آبادان"),
            "76" to Region("76", "گیلان", "لاهیجان"),
            "77" to Region("77", "تهران", "تهران"),
            "78" to Region("78", "البرز", "شهریار"),
            "80" to Region("80", "تهران", "تهران"),
            "81" to Region("81", "سمنان", "سمنان"),
            "82" to Region("82", "خراسان رضوی", "نیشابور"),
            "83" to Region("83", "فارس", "لار"),
            "84" to Region("84", "هرمزگان", "بندرعباس"),
            "85" to Region("85", "سیستان و بلوچستان", "زاهدان"),
            "86" to Region("86", "ایلام", "ایلام"),
            "88" to Region("88", "تهران", "تهران"),
            "90" to Region("90", "تهران", "تهران"),
            "91" to Region("91", "اردبیل", "اردبیل"),
            "92" to Region("92", "خراسان رضوی", "قوچان"),
            "93" to Region("93", "فارس", "جهرم"),
            "94" to Region("94", "هرمزگان", "میناب"),
            "95" to Region("95", "سیستان و بلوچستان", "زابل"),
            "96" to Region("96", "سمنان", "شاهرود"),
            "97" to Region("97", "زنجان", "خدابنده"),
            "98" to Region("98", "ایلام", "ایلام"),
            "99" to Region("99", "تهران", "تهران")
        )
        builtin.forEach { (code, region) -> regions[code] = region }
    }

    fun lookup(normalizedPlate: String): Region? {
        val code = PersianPlateNormalizer.extractRegionCode(normalizedPlate) ?: return null
        return regions[code]
    }

    fun getProvinces(): List<String> = regions.values.map { it.province }.distinct().sorted()
    fun getRegionCodes(): List<String> = regions.keys.sorted()
}

// ═══════════════════════════════════════════════════════
// Data Classes
// ═══════════════════════════════════════════════════════

data class PlateEvent(
    val eventId: String, val tripId: String, val segmentId: String,
    val frameIndex: Int, val ptsUs: Long, val capturedAtUtc: String,
    val plateRaw: String, val plateNormalized: String, val confidence: Double,
    val boundingBox: FloatArray, val trackId: String, val bestFrame: Boolean,
    val regionCode: String?, val province: String?, val city: String?,
    val modelVersion: String
) {
    override fun equals(other: Any?): Boolean {
        if (this === other) return true
        if (other !is PlateEvent) return false
        return eventId == other.eventId
    }
    override fun hashCode(): Int = eventId.hashCode()
}
