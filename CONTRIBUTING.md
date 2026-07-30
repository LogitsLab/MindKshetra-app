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
1. Fork and branch from `main`
2. Keep PRs small and focused
3. Match existing theme tokens and navigation patterns
4. Run `npm run lint` before pushing
5. Describe **what** and **why**; link issues when relevant

If your change needs a store release note, add or update `store/release-notes/<version>.md`.

## Local development

```bash
cp .env.example .env
# EXPO_PUBLIC_API_URL, EXPO_PUBLIC_SUPABASE_URL, EXPO_PUBLIC_SUPABASE_ANON_KEY
npm install --legacy-peer-deps
npx expo start
```

The default API points at production web (`https://mind.logitslab.com`). Point `EXPO_PUBLIC_API_URL` at a local Next.js server when working on API + app together.

## What not to commit

- `.env`, Play service accounts, keystores, provisioning profiles
- `.expo/`, `node_modules/`, generated `ios/` / `android/`
- Internal agent or planning files (`.claude/`, `*.plan.md`)

Maintainers set `EXPO_TOKEN` / Play submit secrets in GitHub Actions — contributors do not need them for ordinary PRs.

## License

By contributing, you agree that your contributions are licensed under the same license as this repository (AGPL-3.0-or-later).
