// DriverIdentifier.swift — on-device face detection + owner matching
//
// Detection: Vision's VNDetectFaceLandmarksRequest (built into iOS, no
// extra dependency). Recognition needs a small embedding model — same
// recommendation as DriverIdentifier.kt: convert
// `dlib_face_recognition_resnet_model_v1` (davisking/dlib, Boost Software
// License 1.0) or MobileFaceNet to Core ML and bundle it in the app. No
// face image or embedding ever leaves the device — matching happens
// entirely locally against DriverProfile.faceEmbedding
// (packages/core/src/driverProfile.ts).

import Foundation
import Vision
import CoreImage

class DriverIdentifier: NSObject {

    typealias EmbeddingCallback = ([Float], Int64) -> Void
    private var onEmbedding: EmbeddingCallback?

    // TODO: load the converted Core ML embedding model here, e.g.
    // let embeddingModel = try? MobileFaceNet(configuration: MLModelConfiguration())
    var embeddingModelName: String?

    func onFaceEmbedding(_ cb: @escaping EmbeddingCallback) { onEmbedding = cb }

    func process(image: CIImage, timestampUs: Int64) {
        let request = VNDetectFaceLandmarksRequest { [weak self] request, error in
            guard let self = self, error == nil,
                  let faces = request.results as? [VNFaceObservation],
                  let largest = faces.max(by: { $0.boundingBox.width * $0.boundingBox.height < $1.boundingBox.width * $1.boundingBox.height })
            else { return }

            // TODO: crop `largest.boundingBox` from `image`, align via
            // landmarks (eyes/nose), run through the embedding model, then:
            // self.onEmbedding?(embeddingFloats, timestampUs)
            _ = largest
        }
        request.revision = VNDetectFaceLandmarksRequestRevision3

        let handler = VNImageRequestHandler(ciImage: image, options: [:])
        try? handler.perform([request])
    }
}
