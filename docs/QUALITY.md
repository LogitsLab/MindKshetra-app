# Quality and release checks

The `PR quality` workflow runs for pull requests and pushes targeting `dev` or
`main`. It installs only the committed lockfile and checks patch whitespace,
TypeScript, Jest, Expo Router targets, `expo install --check`, and Expo Doctor.
It does not invoke EAS, build a binary, or submit a release.

Run the same checks locally:

```bash
npm ci
git diff --check
npm run quality
```

`npm run test:routes` derives route patterns from `app/`, accepts Expo dynamic
segments such as `[id]`, and validates static `router.push`/`router.replace`
targets plus the notification destination allowlist.

## Maestro core flows

The core flows cover guest onboarding, all four tabs and Madhav, chapter-to-
verse navigation, mood detail, and daily practice navigation.

Prerequisites:

1. Install the [Maestro CLI](https://maestro.mobile.dev/getting-started/installing-maestro).
2. Boot one iOS simulator or Android emulator.
3. Install a current local MindKshetra development build with application ID
   `app.mindkshetra.mobile` (for example, `npx expo run:ios` or
   `npx expo run:android`). Expo Go does not use this application ID.
4. Provide the normal `EXPO_PUBLIC_*` development variables and keep the API
   reachable. Chapter/verse loading and anonymous sign-in use the development
   backend; onboarding still exposes its existing guest fallback if anonymous
   sign-in fails.
5. Keep the simulator language supported by the app. Selectors use stable
   `testID` values, so English copy changes do not affect the flows.

Run all core flows:

```bash
npm run test:e2e
```

Each flow launches the installed app and completes onboarding when needed. The
first flow clears application state to exercise guest onboarding from a clean
install.
