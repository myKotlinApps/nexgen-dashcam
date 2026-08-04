# NexGen DashCam — Roadmap

## Phase 0 — Device Validation (2 weeks)
- [ ] Collect 20–30 real devices (Android 5/7/10/12/14, iOS 12/15/16)
- [ ] 2-hour recording test on each device
- [ ] Record encoder, storage, thermal incompatibilities

## Phase 1 — Capture Engine MVP (4 weeks)
- [ ] 720p/1080p loop recording (H.264)
- [ ] 1/3/5 min segments with atomic finalize
- [ ] Manual clip protection (keep previous + current + next)
- [ ] Foreground Service (Android) / foreground-only (iOS)
- [ ] Crash/truncation recovery

## Phase 2 — Driving UX (3 weeks)
- [ ] GPS + speed overlay (sidecar + optional burned-in)
- [ ] Auto-start triggers (power, Bluetooth, app launch)
- [ ] Trip gallery with share/export
- [ ] Storage quota management

## Phase 3 — Old Device Resilience (3 weeks)
- [ ] Adaptive quality (thermal, dropped frames → auto-downscale)
- [ ] EIS software stabilization on legacy devices
- [ ] 4–8 hour endurance testing
- [ ] Battery optimizer onboarding guides per manufacturer

## Phase 4 — Beta + Intelligence (3–4 weeks)
- [ ] 100–300 beta testers
- [ ] Crash/impact detection (accelerometer + gyroscope)
- [ ] Optional cloud upload for protected clips
- [ ] False-positive tuning

## Phase 5 — ALPR Release
- [ ] Plate detector model training & quantization
- [ ] Persian OCR model fine-tuning
- [ ] Live overlay (GPU-rendered, independent of raw encode)
- [ ] Multi-frame consensus + tracking
- [ ] Region database (city/province from plate code)
- [ ] ALPR timeline export (JSON/CSV + burned-in video)

## Phase 6 — Platform Launches
- [ ] Google Play Store
- [ ] Cafe Bazaar
- [ ] Myket
- [ ] Apple App Store

## Phase 7 — Web Dashboard
- [ ] Trips browser with map
- [ ] Plate search and filtering
- [ ] Video playback with synced ALPR overlay
- [ ] Account management + data deletion
