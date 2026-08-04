// VoiceAssistant.swift — connectivity-aware speech recognition + spoken alerts
//
// Recognition: SFSpeechRecognizer (built into iOS, free, no API key).
// When online, uses Apple's server-based recognition
// (`requiresOnDeviceRecognition = false`) for the best accuracy; when
// offline, switches to on-device recognition
// (`requiresOnDeviceRecognition = true`), which needs the Persian
// language model to support on-device mode
// (`SFSpeechRecognizer.supportsOnDeviceRecognition`) — if it doesn't,
// `onOfflineUnavailable` fires so the app can show a friendly message
// instead of silently failing.
//
// Alerts: AVSpeechSynthesizer (built into iOS, free, works fully offline)
// speaks warnings from packages/core/src/voiceAssistant.ts's
// ALERT_MESSAGES / AlertAnnouncer.
//
// Requires NSMicrophoneUsageDescription and NSSpeechRecognitionUsageDescription
// entries in Info.plist.

import Foundation
import Speech
import AVFoundation
import Network

class VoiceAssistant: NSObject {

    typealias TranscriptCallback = (String) -> Void
    typealias SpeechFinishedCallback = (String) -> Void

    private let speechRecognizer = SFSpeechRecognizer(locale: Locale(identifier: "fa-IR"))
    private let audioEngine = AVAudioEngine()
    private var recognitionRequest: SFSpeechAudioBufferRecognitionRequest?
    private var recognitionTask: SFSpeechRecognitionTask?
    private let synthesizer = AVSpeechSynthesizer()
    private let pathMonitor = NWPathMonitor()
    private var isOnline = false
    private var pendingUtteranceIds: [ObjectIdentifier: String] = [:]

    var onTranscript: TranscriptCallback?
    var onSpeechFinished: SpeechFinishedCallback?
    var onOfflineUnavailable: (() -> Void)?

    override init() {
        super.init()
        synthesizer.delegate = self
        pathMonitor.pathUpdateHandler = { [weak self] path in
            self?.isOnline = path.status == .satisfied
        }
        pathMonitor.start(queue: DispatchQueue.global(qos: .background))
    }

    func requestAuthorization(_ completion: @escaping (Bool) -> Void) {
        SFSpeechRecognizer.requestAuthorization { status in
            completion(status == .authorized)
        }
    }

    /// Starts one listen-and-transcribe pass, choosing online/offline per current connectivity.
    func listenOnce() {
        guard let recognizer = speechRecognizer, recognizer.isAvailable else { return }

        recognitionTask?.cancel()
        recognitionTask = nil

        let audioSession = AVAudioSession.sharedInstance()
        try? audioSession.setCategory(.record, mode: .measurement, options: .duckOthers)
        try? audioSession.setActive(true, options: .notifyOthersOnDeactivation)

        let request = SFSpeechAudioBufferRecognitionRequest()
        recognitionRequest = request
        request.shouldReportPartialResults = false

        let preferOffline = !isOnline
        if preferOffline && !recognizer.supportsOnDeviceRecognition {
            onOfflineUnavailable?()
            return
        }
        request.requiresOnDeviceRecognition = preferOffline

        let inputNode = audioEngine.inputNode
        let recordingFormat = inputNode.outputFormat(forBus: 0)
        inputNode.installTap(onBus: 0, bufferSize: 1024, format: recordingFormat) { buffer, _ in
            request.append(buffer)
        }

        audioEngine.prepare()
        try? audioEngine.start()

        recognitionTask = recognizer.recognitionTask(with: request) { [weak self] result, error in
            guard let self = self else { return }
            if let result = result, result.isFinal {
                self.onTranscript?(result.bestTranscription.formattedString)
                self.stopListening()
            }
            if error != nil {
                self.stopListening()
            }
        }
    }

    func stopListening() {
        audioEngine.stop()
        audioEngine.inputNode.removeTap(onBus: 0)
        recognitionRequest?.endAudio()
        recognitionRequest = nil
        recognitionTask = nil
    }

    /// Speaks an alert/status message aloud. `utteranceId` should be the AlertKind string so
    /// onSpeechFinished can be routed back into core's AlertAnnouncer.onSpeechFinished().
    func speak(_ text: String, utteranceId: String) {
        let utterance = AVSpeechUtterance(string: text)
        utterance.voice = AVSpeechSynthesisVoice(language: "fa-IR")
        utterance.rate = AVSpeechUtteranceDefaultSpeechRate
        pendingUtteranceIds[ObjectIdentifier(utterance)] = utteranceId
        synthesizer.speak(utterance)
    }
}

extension VoiceAssistant: AVSpeechSynthesizerDelegate {
    func speechSynthesizer(_ synthesizer: AVSpeechSynthesizer, didFinish utterance: AVSpeechUtterance) {
        if let id = pendingUtteranceIds.removeValue(forKey: ObjectIdentifier(utterance)) {
            onSpeechFinished?(id)
        }
    }
}
