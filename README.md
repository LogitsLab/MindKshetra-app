# MindKshetra (React Native)

Expo app for iOS and Android — same Supabase data and Next.js API as the [MindKshetra](../MindKshetra) web product.

## Stack

- Expo SDK 57 + Expo Router
- Theme tokens from web `DESIGN.md` (Fraunces + Sora, brass on void)
- Supabase Auth (anonymous, Google, Email OTP, Apple on iOS)
- API: `EXPO_PUBLIC_API_URL` with `Authorization: Bearer <access_token>`
- Madhav via persistent bottom-right FAB → full-screen chat (SSE)

## Setup

Requires **Expo Go for SDK 54** (App Store / Play Store current build).

```bash
cp .env.example .env
# Set EXPO_PUBLIC_API_URL, EXPO_PUBLIC_SUPABASE_URL, EXPO_PUBLIC_SUPABASE_ANON_KEY
# On a physical device, use your Mac LAN IP, e.g. http://192.168.x.x:3000

npm install --legacy-peer-deps
npx expo start
```

Scan the QR with Expo Go, or press `i` / `a` / `w`.

## Design

See [docs/design/VISUAL_SYSTEM.md](docs/design/VISUAL_SYSTEM.md).

Navigation: **Home · Explore · Mood · Astrology** tabs + **Madhav FAB** (not a tab).

## EAS

```bash
npx eas build --platform all --profile preview
```

Configure Supabase Redirect URLs:

- `mindkshetra://auth/callback` (dev builds / production app)
- `exp://127.0.0.1:8081/--/auth/callback` (Expo Go local)
- Web callbacks on the MindKshetra Next.js project (`/auth/callback`)

Google Sign-In is enabled on Account → **Continue with Google** (Supabase Google provider must be on).
