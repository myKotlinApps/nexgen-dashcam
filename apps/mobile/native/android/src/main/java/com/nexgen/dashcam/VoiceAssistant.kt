package com.nexgen.dashcam

// Voice Assistant — connectivity-aware speech recognition + spoken alerts
//
// Recognition: uses Android's built-in `SpeechRecognizer`, which is free
// with no API key. When the phone has a network connection it uses
// Google's cloud recognizer (EXTRA_PREFER_OFFLINE = false) for the best
// accuracy; with no connection it switches to on-device offline
// recognition (EXTRA_PREFER_OFFLINE = true), which requires the user to
// have a Persian offline language pack installed (Settings > System >
// Languages > On-device recognition on most devices; we surface a
// friendly callback via `onOfflineLanguageUnavailable` if it's missing
// rather than silently failing).
//
// Alerts: uses Android's built-in `TextToSpeech` engine (also free, works
// fully offline once the Persian voice is installed) to speak warnings
// from packages/core/src/voiceAssistant.ts's ALERT_MESSAGES /
// AlertAnnouncer, so the driver doesn't need to look at the screen.
//
// Requires the RECORD_AUDIO permission in AndroidManifest.xml.

import android.content.Context
import android.content.Intent
import android.net.ConnectivityManager
import android.net.NetworkCapabilities
import android.os.Bundle
import android.speech.RecognitionListener
import android.speech.RecognizerIntent
import android.speech.SpeechRecognizer
import android.speech.tts.TextToSpeech
import android.speech.tts.UtteranceProgressListener
import java.util.Locale

class VoiceAssistant(
    private val context: Context,
    private val onTranscript: (String) -> Unit,
    private val onSpeechFinished: (String) -> Unit,
    private val onOfflineLanguageUnavailable: () -> Unit
) {
    private var recognizer: SpeechRecognizer? = null
    private var tts: TextToSpeech? = null
    private var ttsReady = false

    fun start() {
        tts = TextToSpeech(context) { status ->
            if (status == TextToSpeech.SUCCESS) {
                val result = tts?.setLanguage(Locale("fa", "IR"))
                ttsReady = result != TextToSpeech.LANG_MISSING_DATA && result != TextToSpeech.LANG_NOT_SUPPORTED
            }
        }
        tts?.setOnUtteranceProgressListener(object : UtteranceProgressListener() {
            override fun onStart(utteranceId: String?) {}
            override fun onDone(utteranceId: String?) {
                utteranceId?.let { onSpeechFinished(it) }
            }
            @Deprecated("Deprecated in Java")
            override fun onError(utteranceId: String?) {}
        })
    }

    fun stop() {
        recognizer?.destroy()
        recognizer = null
        tts?.stop()
        tts?.shutdown()
        tts = null
    }

    private fun isOnline(): Boolean {
        val cm = context.getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager
        val network = cm.activeNetwork ?: return false
        val capabilities = cm.getNetworkCapabilities(network) ?: return false
        return capabilities.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)
    }

    /** Starts one listen-and-transcribe pass, choosing online/offline per current connectivity. */
    fun listenOnce() {
        if (!SpeechRecognizer.isRecognitionAvailable(context)) return

        val preferOffline = !isOnline()
        recognizer?.destroy()
        recognizer = SpeechRecognizer.createSpeechRecognizer(context)

        val intent = Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH).apply {
            putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
            putExtra(RecognizerIntent.EXTRA_LANGUAGE, "fa-IR")
            putExtra(RecognizerIntent.EXTRA_PREFER_OFFLINE, preferOffline)
            putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 1)
        }

        recognizer?.setRecognitionListener(object : RecognitionListener {
            override fun onResults(results: Bundle) {
                val matches = results.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)
                val transcript = matches?.firstOrNull()
                if (transcript != null) onTranscript(transcript)
            }

            override fun onError(error: Int) {
                // ERROR_LANGUAGE_UNAVAILABLE / ERROR_LANGUAGE_NOT_SUPPORTED fire when the
                // offline Persian pack isn't installed on this device.
                if (preferOffline && (error == SpeechRecognizer.ERROR_LANGUAGE_UNAVAILABLE ||
                        error == SpeechRecognizer.ERROR_LANGUAGE_NOT_SUPPORTED)
                ) {
                    onOfflineLanguageUnavailable()
                }
            }

            override fun onReadyForSpeech(params: Bundle?) {}
            override fun onBeginningOfSpeech() {}
            override fun onRmsChanged(rmsdB: Float) {}
            override fun onBufferReceived(buffer: ByteArray?) {}
            override fun onEndOfSpeech() {}
            override fun onPartialResults(partialResults: Bundle?) {}
            override fun onEvent(eventType: Int, params: Bundle?) {}
        })

        recognizer?.startListening(intent)
    }

    /** Speaks an alert/status message aloud. `utteranceId` should be the AlertKind string so
     * onSpeechFinished can be routed back into core's AlertAnnouncer.onSpeechFinished(). */
    fun speak(text: String, utteranceId: String) {
        if (!ttsReady) return
        tts?.speak(text, TextToSpeech.QUEUE_ADD, null, utteranceId)
    }
}
