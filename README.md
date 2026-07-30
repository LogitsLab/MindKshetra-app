# MindKshetra (mobile)

Expo app for iOS and Android — the same Gita companion and Jyotish experience as the web product.

**Web / API:** [LogitsLab/MindKshetra](https://github.com/LogitsLab/MindKshetra) · [mind.logitslab.com](https://mind.logitslab.com)

## Features

- Explore verses, mood matching, favorites, journal
- **Ask Madhav** (FAB → full-screen chat over the web API)
- Astrology: members, incognito charts, dashas, predictions
- Auth: anonymous, Google, email OTP, Apple (iOS)

## Quick start

Requires a recent **Expo Go** build matching the project SDK (see `package.json` / `app.json`).

```bash
cp .env.example .env
# EXPO_PUBLIC_API_URL=https://mind.logitslab.com
# EXPO_PUBLIC_SUPABASE_URL=…
# EXPO_PUBLIC_SUPABASE_ANON_KEY=…

npm install --legacy-peer-deps
npx expo start
```

Scan the QR code, or press `i` / `a` / `w`.

For local API work, point `EXPO_PUBLIC_API_URL` at your Next.js server (`http://localhost:3000` or your LAN IP).

## Contributing

This is an **open repository**. We welcome:

- **Issues** — bugs, UX ideas, or store/release questions
- **Pull requests** — small, focused changes with a clear write-up

Please read **[CONTRIBUTING.md](CONTRIBUTING.md)** before opening a PR.  
Not ready to code? Open an issue with your idea and as much detail as you can — that helps maintainers prioritize.

## Design & navigation

- Design notes: [`docs/design/VISUAL_SYSTEM.md`](docs/design/VISUAL_SYSTEM.md)
- Tabs: **Home · Explore · Mood · Astrology** + **Madhav** FAB (not a tab)

## Store releases (maintainers)

Marketing version: `app.json` → `expo.version`.  
Release notes: `store/release-notes/<version>.md`. Listing copy: `store/listing.json`.

```bash
npm run release:notes
```

On version bumps to `main`, GitHub Actions can run EAS build + submit (TestFlight + Play **internal**). Required maintainer secrets: `EXPO_TOKEN`, `GOOGLE_SERVICE_ACCOUNT_JSON`, `VERSION_BUMP_TOKEN`.

Set Supabase public env for production builds in the **Expo** dashboard (Environment variables / EAS secrets): `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`. Do not commit service-account JSON or private keys. Keep `google-service-account.json` local only (gitignored).

```bash
npx eas build --platform all --profile production
npx eas submit --platform all --latest
```

## Security

- Never commit `.env`, Play service accounts, or keystores
- Report suspected leaks privately to maintainers when possible

## License

[AGPL-3.0-or-later](LICENSE)
