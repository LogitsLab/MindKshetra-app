# Store release checklist

Revised 2026-07-27 after `/autoplan` review. Items marked **[new]** were added because
the original list assumed the app was correct and only needed configuration.

## Blocking code fixes — done

- [x] Crisis detection runs on the user's message, not just the model's reply
      (`src/safety/crisis.ts`, wired in `app/madhav.tsx`) — **[new]**
- [x] Madhav actually streams — `expo/fetch` incremental reader replaces the buffered
      `res.text()` in `src/api/client.ts` — **[new]**
- [x] `streamChat` handles offline and aborts instead of throwing unhandled — **[new]**
- [x] FAB clears the tab bar; `spacing.tabBar` is the single source of truth — **[new]**
- [x] Tab labels come from `t()` instead of hardcoded English — **[new]**
- [x] Missing Supabase env fails configuration validation instead of booting
      broken auth — **[new]**
- [x] `eas.json` declares `cli.appVersionSource` — **[new]**
- [x] Jest suite covering crisis detection, SSE parsing, auth headers, route
      targets, progression, and context isolation — **[new]**

## Blocking — still to do

- [ ] **EAS push credentials (APNs + FCM).** Code registers tokens via
      `expo-notifications`; real-device delivery needs `eas credentials` push
      key (iOS) and FCM (Android), then a rebuild. See web
      `docs/runbooks/push-dispatch.md` § APNs/FCM. Verify Account prefs against
      dawn / streak kinds on a TestFlight / internal build. — **[new]**
      Sitting-course + VOTD streak prefs are already wired client-side; this is
      the only blocker for practice nudges.
- [x] EAS project UUID is configured in `app.json`.
- [x] Dependencies align with Expo SDK 54 (`npx expo install --check`);
      `expo-asset` is installed explicitly for `expo-audio`.
- [x] React and React DOM are aligned at the SDK 54-compatible version.
- [ ] `EXPO_PUBLIC_*` env set for production API + Supabase
- [ ] Supabase Auth: Google, email redirect `mindkshetra://auth/callback`
- [ ] Privacy policy URL live: `https://mind.logitslab.com/privacy`; link from Account screen
- [ ] **Privacy nutrition label** declaring Supabase auth data collection. Required by
      App Store Connect and absent from the original list. — **[new]**
- [ ] App icons / splash (void `#07090f`, brass mark)
- [ ] EAS production build + TestFlight / internal testing track

## Manual QA before submission

- [ ] Visual QA vs `docs/design/VISUAL_SYSTEM.md` (dark + light)
- [ ] Madhav FAB: thumb reach on large phones; no overlap with tab bar
      (fixed in code; verify on iPhone SE and 15 Pro Max)
- [ ] Crisis helpline path smoke-tested — type distress phrasing in both English and
      Hindi and confirm the helpline banner appears **before** the model replies
- [ ] Bearer auth smoke-test: signed-in favorites from device
- [ ] Madhav reply renders progressively, not all at once

## Push

- [ ] **APNs + FCM credentials in EAS** before any push-capable release. Run
      `eas credentials` (or answer yes when EAS Build first prompts) so Apple Push
      and Firebase Cloud Messaging V1 are attached to the project. Without them,
      token registration compiles but remote delivery fails.
- [ ] **Physical device + dev-backend / production build required** to exercise
      end-to-end push. Simulators and emulators cannot obtain a real Expo push
      token; registration no-ops there.
- [ ] **Expo Go limitations.** Remote push is unreliable or unavailable in Expo
      Go (especially Android). Use a development build (`eas build --profile
      development` or `npx expo run:[ios|android]`) when verifying
      `registerPush` + `/api/push/register`. Denied permissions and Expo Go gaps
      are intentional soft no-ops — the app must still launch and sign in.

Full review and rationale:
`~/.gstack/projects/LogitsLab-MindKshetra-app/main-launch-plan-20260727-125750.md`
Deferred scope: [`TODOS.md`](../TODOS.md)
