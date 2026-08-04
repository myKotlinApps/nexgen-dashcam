# NexGen DashCam 🚗

**Turn any old phone into a smart dash cam with live Persian license plate recognition.**

> Production-grade dash cam app with on-device ALPR, loop recording, GPS overlay, and crash detection. Built with React Native for cross-platform UI and native Kotlin/Swift for reliable video capture.

## Architecture

```
┌─────────────────────────────────────────────┐
│              React Native UI                │
│    Tamagui · Reanimated · VisionCamera       │
├─────────────────────────────────────────────┤
│         Shared Core (TypeScript)            │
│   Storage · Telemetry · Trip Logic · ALPR   │
├──────────────────┬──────────────────────────┤
│  Android Native  │      iOS Native          │
│  Kotlin/CameraX  │   Swift/AVFoundation     │
│  Foreground Svc  │   Foreground-Only        │
│  ONNX Runtime    │   Core ML / ONNX         │
└──────────────────┴──────────────────────────┘
```

## Tech Stack

| Layer | Technology |
|---|---|
| UI Framework | React Native + TypeScript |
| Design System | Tamagui (cross-platform) |
| Navigation | Expo Router |
| Camera | react-native-vision-camera (MIT) |
| Animations | Reanimated 3 + Gesture Handler |
| State | Zustand |
| Storage | WatermelonDB / SQLite |
| ML Inference | ONNX Runtime Mobile (MIT) |
| Native Camera | CameraX (Android) · AVFoundation (iOS) |

## Project Structure

```
nexgen-dashcam/
├── apps/
│   ├── mobile/              # React Native (Expo) — Android + iOS
│   └── web/                 # Next.js dashboard
├── packages/
│   ├── ui/                  # Shared Tamagui components
│   ├── core/                # Types, utilities, constants
│   ├── storage/             # Ring buffer, file management
│   └── telemetry/           # GPS, accelerometer, plate DB
├── turbo.json
└── package.json
```

## Quick Start

```bash
pnpm install
pnpm dev:mobile
```

## Platform Support

| Platform | Min Version | Notes |
|---|---|---|
| Android | 5.0 (API 21) | CameraX + Foreground Service |
| iOS | 15.0 | Foreground-only capture required |

## License

Source code: Proprietary. Third-party dependencies retain their respective open-source licenses.

## Security

- All video processing is on-device by default
- No telemetry without explicit consent
- Plate data never leaves device unless user opts into cloud sync
- Audio recording disabled by default
