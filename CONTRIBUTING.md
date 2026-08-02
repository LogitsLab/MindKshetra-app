# Contributing to MindKshetra (mobile)

Thanks for helping improve the Expo app. This repo is open — proposals and PRs are welcome.

## How to participate

### Open an issue
Use [Issues](https://github.com/LogitsLab/MindKshetra-app/issues) for:

- Bugs (device, OS, Expo Go vs production build, steps to reproduce)
- Feature or UX ideas (screenshots or rough flows help)
- Store / release questions

Search existing issues before opening a new one.

### Open a pull request
1. Fork and branch from `dev`; target PRs at **`dev`** — never `main`. `main` is the release branch (store builds are cut from it)
2. Keep PRs small and focused
3. Match existing theme tokens and navigation patterns
4. Run `npm run lint` before pushing
5. Describe **what** and **why**; link issues when relevant

If your change needs a store release note, add or update `store/release-notes/<version>.md`.

## Local development

Node **20+** (`.nvmrc`). No secrets needed — `.env.example` ships working publishable defaults.

```bash
cp .env.example .env
npm install
npx expo start
```

Plain `npm install` is enough; the committed `.npmrc` already applies `legacy-peer-deps`.

This repo is a thin client: the API lives in the web repo, [LogitsLab/MindKshetra](https://github.com/LogitsLab/MindKshetra). Point `EXPO_PUBLIC_API_URL` at a local Next.js server from that repo when working on API + app together (keep the Supabase pair matching that server's project).

## What not to commit

- `.env`, Play service accounts, keystores, provisioning profiles
- `.expo/`, `node_modules/`, generated `ios/` / `android/`
- Internal agent or planning files (`.claude/`, `*.plan.md`)

Store builds go through **EAS** (`eas.json`), triggered by maintainers from `main`. Maintainers set `EXPO_TOKEN` / Play submit secrets in GitHub Actions — contributors do not need EAS or store credentials for local development or ordinary PRs.

## License

By contributing, you agree that your contributions are licensed under the same license as this repository (AGPL-3.0-or-later).
