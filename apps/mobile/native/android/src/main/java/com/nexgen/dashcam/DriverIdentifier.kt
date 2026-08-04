package com.nexgen.dashcam

// Driver Identification — on-device face detection + owner matching
//
// Detection: Google ML Kit Face Detection (`com.google.mlkit:face-detection`,
// Apache-2.0, free, fully on-device — no network calls). Recognition
// (turning a detected face into a comparable embedding) needs a small
// extra model; recommended is `dlib_face_recognition_resnet_model_v1`
// (davisking/dlib, Boost Software License 1.0 — free for commercial use,
// keep the license notice) converted to TFLite, or Google's MobileFaceNet.
// Neither model's binary weights are vendored in this repo; drop the
// converted .tflite into android/app/src/main/assets/ and point
// `embeddingModelPath` at it. All matching happens on-device — no face
// image or embedding ever leaves the phone (see
// packages/core/src/driverProfile.ts for the storage/matching contract).

import android.graphics.Bitmap
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.WritableMap
import com.google.mlkit.vision.common.InputImage
import com.google.mlkit.vision.face.FaceDetection
import com.google.mlkit.vision.face.FaceDetectorOptions

class DriverIdentifier(
    private val onFaceEmbedding: (WritableMap) -> Unit
) {
    // ACCURATE mode + landmarks so the crop fed to the embedding model is
    // well-aligned (eyes/nose/mouth), which matters a lot for embedding
    // quality with ResNet/FaceNet-style models.
    private val detector = FaceDetection.getClient(
        FaceDetectorOptions.Builder()
            .setPerformanceMode(FaceDetectorOptions.PERFORMANCE_MODE_ACCURATE)
            .setLandmarkMode(FaceDetectorOptions.LANDMARK_MODE_ALL)
            .setMinFaceSize(0.25f)
            .build()
    )

    // TODO: load the converted embedding model (see class doc above), e.g.
    // via TFLite Interpreter(FileUtil.loadMappedFile(context, embeddingModelPath))
    var embeddingModelPath: String? = null

    fun processFrame(bitmap: Bitmap, timestampMs: Long) {
        val image = InputImage.fromBitmap(bitmap, 0)
        detector.process(image)
            .addOnSuccessListener { faces ->
                val largest = faces.maxByOrNull { it.boundingBox.width() * it.boundingBox.height() }
                    ?: return@addOnSuccessListener

                // TODO: crop `largest.boundingBox` from bitmap, align via
                // eye landmarks, run through the embedding model, then emit.
                // val embedding = runEmbeddingModel(alignedCrop)
                // emit(embedding, timestampMs)
            }
    }

    private fun emit(embedding: FloatArray, timestampMs: Long) {
        val map: WritableMap = Arguments.createMap()
        val arr = Arguments.createArray()
        for (v in embedding) arr.pushDouble(v.toDouble())
        map.putArray("embedding", arr)
        map.putDouble("timestampMs", timestampMs.toDouble())
        onFaceEmbedding(map)
    }

    fun release() {
        detector.close()
    }
}
