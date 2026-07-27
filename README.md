# MindKshetra (React Native)

Expo app for iOS and Android — same Supabase data and Next.js API as the [MindKshetra](../MindKshetra) web product.

## Stack

- Expo SDK 57 + Expo Router
- Theme tokens from web `DESIGN.md` (Fraunces + Sora, brass on void)
- Supabase Auth (anonymous, Google, Email OTP, Apple on iOS)
- API: `EXPO_PUBLIC_API_URL` with `Authorization: Bearer <access_token>`
- Madhav via persistent bottom-right FAB → full-screen chat (SSE)

## Setup

```bash
cp .env.example .env
# Set EXPO_PUBLIC_API_URL, EXPO_PUBLIC_SUPABASE_URL, EXPO_PUBLIC_SUPABASE_ANON_KEY

npm install
npx expo start
```

## Design

See [docs/design/VISUAL_SYSTEM.md](docs/design/VISUAL_SYSTEM.md).

Navigation: **Home · Explore · Mood · Astrology** tabs + **Madhav FAB** (not a tab).

## EAS

```bash
npx eas build --platform all --profile preview
```

Configure Supabase redirect URLs: `mindkshetra://auth/callback`.
