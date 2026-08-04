@file: ALPRProcessor.swift — Persian plate recognition
import Foundation
import Vision
import CoreImage

/// On-device Persian license plate recognition using Vision + Core ML.
/// Pipeline: Detector → Crop → OCR → Normalize → Consensus → Region Lookup
@available(iOS 12.0, *)
class ALPRProcessor: NSObject {

    typealias PlateCallback = (PlateEvent) -> Void
    typealias StatusCallback = (String, String) -> Void

    private var isRunning = false
    private var plateCallback: PlateCallback?
    private var statusCallback: StatusCallback?
    private var consecutiveCount = 0
    private var lastNormalized: String?
    private var detectionCount = 0
    private let minConfidence: Float = 0.65
    private let minConsecutive = 3
    private let regionDB = RegionDatabase()

    func start() {
        isRunning = true
        consecutiveCount = 0
        detectionCount = 0
        statusCallback?("ready", "ALPR active")
    }

    func stop() {
        isRunning = false
        statusCallback?("idle", "ALPR stopped")
    }

    func onPlateDetected(_ cb: @escaping PlateCallback) { plateCallback = cb }
    func onStatusChanged(_ cb: @escaping (String, String) -> Void) { statusCallback = cb }

    /// Process a CIImage from the camera feed.
    func process(image: CIImage, width: Int, height: Int, frameIndex: Int, ptsUs: Int64, segmentId: String, tripId: String) {
        guard isRunning else { return }

        // Skip frames for performance (processed at configured FPS, not camera FPS)
        detectionCount += 1
        guard detectionCount % 8 == 0 else { return }  // ~4 FPS at 30 FPS camera

        // TODO: Run Vision + CoreML pipeline
        // 1. VNImageRequestHandler(image)
        // 2. Plate detection via VNCoreMLModel (YOLO-based)
        // 3. Crop detected region
        // 4. OCR via dedicated Persian OCR model
        // 5. Normalize & validate
        // 6. Multi-frame consensus
        // 7. Region lookup

        // When model is loaded, call:
        // plateCallback?(PlateEvent(...))
    }

    func consensusCheck(_ raw: String, normalized: String, confidence: Float) -> Bool {
        guard confidence >= minConfidence else { consecutiveCount = 0; return false }
        if normalized == lastNormalized { consecutiveCount += 1 }
        else { consecutiveCount = 1; lastNormalized = normalized }
        return consecutiveCount >= minConsecutive
    }
}

/// Persian plate normalizer — corrects OCR errors and validates format.
struct PersianNormalizer {

    static let digitMap: [Character: Character] = [
        "۰": "0", "۱": "1", "۲": "2", "۳": "3", "۴": "4",
        "۵": "5", "۶": "6", "۷": "7", "۸": "8", "۹": "9"
    ]

    static let confusionMap: [Character: Character] = [
        "ي": "ی", "ى": "ی", "ك": "ک", "ة": "ه"
    ]

    static func normalize(_ raw: String) -> String {
        var s = raw
            .replacingOccurrences(of: "ایران ", with: "")
            .replacingOccurrences(of: " ", with: "")

        s = String(s.map { digitMap[$0] ?? $0 })
        s = String(s.map { confusionMap[$0] ?? $0 })
        return s.lowercased()
    }

    static func isValid(_ normalized: String) -> Bool {
        let pattern = try! NSRegularExpression(pattern: "^\\d{2}[\\u0600-\\u06FF]\\d{3}[\\u0600-\\u06FF]\\d{2}$")
        return pattern.firstMatch(in: normalized, range: NSRange(location: 0, length: normalized.utf16.count)) != nil
    }

    static func extractCode(_ normalized: String) -> String? {
        guard normalized.utf16.count >= 2 else { return nil }
        return String(normalized.prefix(2))
    }
}

/// In-memory region database.
struct RegionDatabase {
    private let regions: [String: (province: String, city: String)] = [
        "11": ("تهران", "تهران"), "22": ("تهران", "تهران"), "33": ("تهران", "تهران"),
        "12": ("خراسان رضوی", "مشهد"), "32": ("خراسان رضوی", "مشهد"),
        "13": ("اصفهان", "اصفهان"), "23": ("اصفهان", "اصفهان"),
        "14": ("فارس", "شیراز"), "15": ("آذربایجان شرقی", "تبریز"),
        "16": ("گیلان", "رشت"), "17": ("آذربایجان غربی", "ارومیه"),
        "18": ("همدان", "همدان"), "19": ("کرمانشاه", "کرمانشاه"),
        "21": ("البرز", "کرج"), "24": ("خوزستان", "اهواز"),
        "25": ("آذربایجان شرقی", "تبریز"), "26": ("خراسان شمالی", "بجنورد"),
        "31": ("لرستان", "خرم آباد"), "34": ("قزوین", "قزوین"),
        "41": ("مازندران", "ساری"), "45": ("کرمان", "کرمان"),
    ]

    func lookup(normalized: String) -> (String, String)? {
        guard let code = PersianNormalizer.extractCode(normalized) else { return nil }
        return regions[code]
    }
}
