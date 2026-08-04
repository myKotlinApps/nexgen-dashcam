# Advanced Features Roadmap — Gap Analysis & Cool Additions

_Based on competitive research across Garmin, Nextbase, 70mai, Viofo, BlackVue (hardware dashcams) and Nexar, Sygic, DailyRoads Voyager (phone-based dashcam apps)._

## Part 1 — Exact list of features we do NOT have yet

### 1. Parking Guard (impact/motion detection while parked)
- Competitors: Nexar, Nextbase (Smart Parking), 70mai, Viofo all detect a knock/bump or sustained motion while parked and auto-start recording with a pre-roll of the seconds *before* the trigger.
- Status: **added** — `ParkingGuard.kt` / `ParkingGuard.swift` + shared math in `packages/core/src/parkingMode.ts`. Still needed: wiring into `CameraService`/`CameraCapture` to actually wake `MediaEncoder`, and a Settings UI toggle.

### 2. Cloud backup & sharing
- Competitors: automatic upload of event clips to private cloud storage (Nexar: unlimited; Nextbase: MyNextbase Cloud; BlackVue: Over the Cloud), one-tap share to insurance/social media.
- Status: **not implemented**. Needs a backend (object storage + auth), which is outside the current mobile/web monorepo — would require a new `apps/api` service or a managed backend (Supabase/Firebase).

### 3. Remote live view over LTE/4G
- Competitors: Garmin Dash Cam Live, Nexar One let you watch your car's live camera feed from anywhere via a cellular connection built into the dashcam hardware itself.
- Status: **not directly applicable** — we run on a phone, not dedicated hardware with its own SIM. The phone equivalent (streaming from the phone's own connection while unattended) conflicts with iOS background-execution limits; feasible on Android as a lower-priority feature, not realistic on iOS without the phone staying plugged in and foregrounded.

### 4. ADAS: forward collision warning
- Competitors: Garmin, 70mai, some Viofo models estimate following distance and warn if you're closing too fast on the vehicle ahead.
- Status: **not implemented**. Would reuse the same camera-analysis pipeline as ALPR/lane detection (vehicle detection model + monocular distance estimation).

### 5. ADAS: lane departure warning
- Status: **added** — see Part 2, `laneDeparture.ts` + `LaneDepartureDetector.kt`/`.swift`.

### 6. Multi-channel recording (front + rear + cabin simultaneously)
- Competitors: BlackVue, Viofo, 70mai ship physically separate front/rear/cabin camera units recording in sync.
- Status: **partially addressed** — a phone only has 2 cameras (front+back), so we added dual-camera side-by-side capture for parking mode (see Part 2). True 3-channel coverage isn't possible without external camera hardware.

### 7. Emergency SOS with automatic location share
- Competitors: Nextbase's Emergency SOS auto-notifies emergency services + shares medical info + location on a severe impact.
- Status: **not implemented**. Would reuse `ParkingImpactDetector`'s impact-magnitude logic (already built) plus `GPSTracker`, wired to native SMS/emergency-call APIs — needs legal/liability review before shipping since it would contact real emergency services.

### 8. Voice assistant
- Competitors: Nextbase bundles Alexa for hands-free "start recording", music, navigation while driving.
- Status: **added** — see Part 2, `voiceAssistant.ts` + `VoiceAssistant.kt`/`.swift`. Implemented as a small fixed Persian command set (safer for driving than open-ended natural language) rather than a full Alexa-style assistant, plus spoken safety alerts.

### 9. Firmware/OTA-style device updates
- Not applicable — we ship as a normal app update via Play Store/App Store/Cafe Bazaar; there's no separate device firmware.

### 10. Driver face recognition / owner identification
- Status: **added** — see Part 2, `driverProfile.ts` + `DriverIdentifier.kt`/`.swift`.

## Part 2 — New modules added

All modules follow the existing repo pattern: a shared, unit-testable TypeScript "brain" in `packages/core/src`, plus thin native capture/bridge layers in `apps/mobile/native/{android,ios}` that feed raw sensor/frame/audio data to it.

### Lane Departure Warning (camera-based)
- `packages/core/src/laneDeparture.ts` — Hough-segment classification, vehicle-offset estimation, debounced state machine (`centered` → `drifting_*` → `departed_*`).
- `apps/mobile/native/android/.../LaneDepartureDetector.kt` — CameraX frame → OpenCV Canny + HoughLinesP → segments.
- `apps/mobile/native/ios/LaneDepartureDetector.swift` — Vision `VNDetectContoursRequest` → line-like segments.
- Algorithm lineage: the classic Canny-edge + probabilistic-Hough-transform lane-finding pipeline, as implemented under the **MIT License** by [`tomazas/opencv-lane-vehicle-track`](https://github.com/tomazas/opencv-lane-vehicle-track) and used across most OpenCV lane-finding tutorials. No code was copied — only the well-known pipeline shape (Canny → ROI → Hough → slope classify) was referenced; every line here is an original implementation against this repo's own architecture.
- Requires adding the `org.opencv:opencv` (Apache-2.0) Gradle dependency on Android (Vision is built into iOS, no extra dependency there).

### Parking Guard (impact detection + dual-camera parking capture)
- `packages/core/src/parkingMode.ts` — g-force impact/sustained-motion detector, dual-camera wide-coverage layout helper.
- `apps/mobile/native/android/.../ParkingGuard.kt` — `SensorManager` accelerometer listener + CameraX concurrent-camera hook.
- `apps/mobile/native/ios/ParkingGuard.swift` — `CoreMotion` accelerometer + `AVCaptureMultiCamSession` hook.
- Note on "360°": a phone's front and back cameras point in opposite directions with no overlapping field of view, so they can't be optically stitched into one continuous panorama the way two overlapping lenses can. What this module does instead is capture both simultaneously into one side-by-side "front + rear coverage" canvas while parked, matching how BlackVue/70mai's dual-channel viewers present their two physical cameras. True seamless 360° would need external hardware (e.g. a second phone/camera covering the missing angles) — called out here as a hardware-dependent stretch goal, not silently faked.
- Reference for true panorama/homography stitching if external multi-camera hardware is added later: [`RaduBolbo/video_to_panorama`](https://github.com/RaduBolbo/video_to_panorama) (Apache-2.0).

### Driver Identification (on-device face recognition)
- `packages/core/src/driverProfile.ts` — cosine-similarity embedding match + debounced identity confirmation.
- `apps/mobile/native/android/.../DriverIdentifier.kt` — Google ML Kit Face Detection (Apache-2.0, on-device, free) for detection.
- `apps/mobile/native/ios/DriverIdentifier.swift` — Vision `VNDetectFaceLandmarksRequest` (built into iOS) for detection.
- Recognition (turning a detected face into a comparable embedding) needs one additional small on-device model, not vendored in this repo (binary model weights don't belong in source control via this workflow). Recommended, license-clear options:
  - [`davisking/dlib`](https://github.com/davisking/dlib) — `dlib_face_recognition_resnet_model_v1`, **Boost Software License 1.0**: free for any use including commercial, only requires keeping the license notice. Convert to TFLite/CoreML.
  - Google's MobileFaceNet — also permissively licensed, smaller/faster, slightly less accurate.
- Privacy design: embeddings are computed and matched **entirely on-device**; nothing is uploaded. `DriverProfile.faceEmbedding` is stored locally only (see `packages/core/src/driverProfile.ts`).
- Suggested UX: an onboarding screen where the owner registers their face once (`isOwner: true`), with optional additional profiles for family members; trips/events can then be tagged with "who was driving."

### Voice Assistant (hands-free commands, online/offline) + Spoken Safety Alerts
- `packages/core/src/voiceAssistant.ts` — fixed Persian command grammar (start/stop recording, save moment, check status) with a text normalizer + fuzzy (Levenshtein) matching tolerant of ASR mistakes; `chooseSpeechRecognitionMode(isOnline)` picks online vs offline; `ALERT_MESSAGES` catalog (lane departure, parking impact, overheating, low storage, GPS lost, recording start/stop), each with Persian text, a priority, and a cooldown; `AlertAnnouncer` decides which alert actually gets spoken right now (debounced per kind, higher priority can interrupt a lower one).
- `apps/mobile/native/android/.../VoiceAssistant.kt` — `android.speech.SpeechRecognizer`: online uses Google's free cloud recognizer (best accuracy) whenever `ConnectivityManager` reports internet; offline sets `EXTRA_PREFER_OFFLINE` and uses the on-device Persian language pack, surfacing a callback if that pack isn't installed instead of failing silently. Alerts are spoken via the built-in, free, fully-offline-capable `android.speech.tts.TextToSpeech`.
- `apps/mobile/native/ios/VoiceAssistant.swift` — `SFSpeechRecognizer`: online uses Apple's free server-based recognition whenever `NWPathMonitor` reports connectivity; offline sets `requiresOnDeviceRecognition = true` after checking `supportsOnDeviceRecognition`. Alerts are spoken via the built-in, free, fully-offline-capable `AVSpeechSynthesizer`.
- Deliberately a small fixed command set rather than open-ended natural language: short, unambiguous Persian phrases recognize far more reliably (online or offline) and are safer to use while driving than a chatty general assistant.
- No third-party recognition/TTS service or API key is used anywhere — both the online and offline paths are each OS's own built-in, free speech stack, so there's no ongoing cost and no new licensing consideration.
- Required permissions to add: `RECORD_AUDIO` in `AndroidManifest.xml`; `NSMicrophoneUsageDescription` and `NSSpeechRecognitionUsageDescription` in `Info.plist`.

## Part 3 — Also fixed while in these files
- `ALPRProcessor.swift` line 1 used a bare `@file:` prefix, which is not valid Swift syntax (that annotation only exists in Kotlin) and would have failed to compile — corrected to a plain comment, no logic changed.

## Licensing summary

| Reference | License | Used for |
|---|---|---|
| tomazas/opencv-lane-vehicle-track | MIT | Lane-finding pipeline shape (not copied) |
| RaduBolbo/video_to_panorama | Apache-2.0 | Future true-panorama stitching reference |
| davisking/dlib (ResNet face model) | Boost Software License 1.0 | Recommended face embedding model |
| Google ML Kit Face Detection | Apache-2.0 | On-device face detection (Android) |
| OpenCV | Apache-2.0 | Canny/Hough native CV calls (Android) |
| Android SpeechRecognizer / TextToSpeech | Built into OS, free | Voice assistant + spoken alerts (Android) |
| iOS Speech / AVFoundation | Built into OS, free | Voice assistant + spoken alerts (iOS) |

All of the above are permissive licenses (MIT / Apache-2.0 / Boost) or built-in OS frameworks with no usage fees — safe for this project, including Cafe Bazaar distribution.
