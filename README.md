# MindKshetra (mobile)

Expo app for iOS and Android — the same Gita companion and Jyotish experience as the web product.

**Web / API:** [LogitsLab/MindKshetra](https://github.com/LogitsLab/MindKshetra) · [mind.logitslab.com](https://mind.logitslab.com)

## Features

- Explore verses, mood matching, favorites, journal
- **Ask Madhav** (FAB → full-screen chat over the web API)
- Astrology: members, incognito charts, dashas, predictions
- Auth: anonymous, Google, email OTP

## Quick start

No credentials to hunt for — local dev needs no secrets. Requires **Node 20+** (`.nvmrc`) and a recent **Expo Go** build matching the project SDK (see `package.json` / `app.json`).

```bash
cp .env.example .env
npm install
npx expo start
```

Scan the QR code, or press `i` / `a` / `w`.

- `.env.example` ships working defaults: the dev API plus the matching **MindKshetra-dev** Supabase URL and publishable key — the same public pair already committed in `eas.json` (`dev-backend` profile). `EXPO_PUBLIC_*` values are embedded in the client bundle by design; none of them is a secret.
- The app reads exactly three variables: `EXPO_PUBLIC_API_URL` (defaults to production in code), plus `EXPO_PUBLIC_SUPABASE_URL` / `EXPO_PUBLIC_SUPABASE_ANON_KEY`, which must be set for a dev launch (`src/auth/supabase.ts` fails loudly without them) and must belong to the same stack as the API URL.
- Plain `npm install` works — the committed `.npmrc` already applies `legacy-peer-deps`.

For local API work, point `EXPO_PUBLIC_API_URL` at your Next.js server from the [web repo](https://github.com/LogitsLab/MindKshetra) (`http://localhost:3000` or your LAN IP) and use that server's Supabase pair.

## Contributing

This is an **open repository**. We welcome:

- **Issues** — bugs, UX ideas, or store/release questions
- **Pull requests** — small, focused changes with a clear write-up

Please read **[CONTRIBUTING.md](CONTRIBUTING.md)** before opening a PR.  
Not ready to code? Open an issue with your idea and as much detail as you can — that helps maintainers prioritize.

## Architecture

- Mobile structure & API usage: **[ARCHITECTURE.md](ARCHITECTURE.md)**  
- Full product / backend: [MindKshetra ARCHITECTURE.md](https://github.com/LogitsLab/MindKshetra/blob/main/ARCHITECTURE.md)

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
