# Contributing to NexGen DashCam

## Prerequisites

- Node.js >= 20
- pnpm >= 9
- Java 17 (Android)
- Xcode 16+ (iOS)

## Setup

```bash
git clone git@github.com:myKotlinApps/nexgen-dashcam.git
cd nexgen-dashcam
pnpm install
```

## Development

```bash
pnpm dev:mobile    # React Native (Expo)
pnpm dev:web       # Next.js dashboard
pnpm lint          # Lint all packages
pnpm typecheck     # TypeScript check
```

## ALPR Models

Models are not bundled. Download with:
```bash
node scripts/download-models.js --all
```

## Before PR

1. `pnpm typecheck` passes
2. `pnpm lint` passes
3. No secrets committed
4. New dependency license checked

## License

Source code: Proprietary. Third-party OSS retains original licenses.
