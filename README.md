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
# Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY
# Default API is production web: https://mind.logitslab.com (see EXPO_PUBLIC_API_URL in .env)
# For local Next.js instead: http://localhost:3000 (simulator) or http://192.168.x.x:3000 (device)

npm install --legacy-peer-deps
npx expo start
```

Scan the QR with Expo Go, or press `i` / `a` / `w`.

## Design

See [docs/design/VISUAL_SYSTEM.md](docs/design/VISUAL_SYSTEM.md).

Navigation: **Home · Explore · Mood · Astrology** tabs + **Madhav FAB** (not a tab).

## EAS / store releases

Production builds use EAS (`logitsllab/mindkshetra`). Marketing version lives in `app.json` (`expo.version`); native build numbers auto-increment remotely.

### Automatic release (GitHub Actions)

On `main`, when the marketing version changes (or a `chore: bump version` commit lands), [EAS store release](.github/workflows/eas-release.yml) runs:

1. Reads `store/release-notes/<version>.md` (falls back to `DEFAULT.md`)
2. Builds **iOS + Android** (`production` profile)
3. Auto-submits:
   - **iOS** → TestFlight (notes via `--what-to-test`)
   - **Android** → Play **internal** track by default

Manual run: **Actions → EAS store release → Run workflow** (choose platforms / Play track / build-only).

### Store copy

| File | Purpose |
|------|---------|
| [`store/listing.json`](store/listing.json) | Title, short/full description (EN/HI), categories, URLs |
| [`store/release-notes/`](store/release-notes/) | Per-version “What’s new” |

```bash
npm run release:notes          # print notes for current version
npm run release:notes -- --ensure-file   # stub notes for this version
```

### Required GitHub secrets

| Secret | How to create |
|--------|----------------|
| `EXPO_TOKEN` | [expo.dev/settings/access-tokens](https://expo.dev/settings/access-tokens) |
| `GOOGLE_SERVICE_ACCOUNT_JSON` | Full JSON of Play Console service account (same as local `google-service-account.json`) |
| `VERSION_BUMP_TOKEN` | Already used for auto patch bumps |

Apple submit uses credentials already stored on the Expo account from prior iOS builds.

```bash
npx eas build --platform all --profile preview
```

Configure Supabase Redirect URLs:

- `mindkshetra://auth/callback` (dev builds / production app)
- `exp://127.0.0.1:8081/--/auth/callback` (Expo Go local)
- Web callbacks on the MindKshetra Next.js project (`/auth/callback`)

Google Sign-In is enabled on Account → **Continue with Google** (Supabase Google provider must be on).
