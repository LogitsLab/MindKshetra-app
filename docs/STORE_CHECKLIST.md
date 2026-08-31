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

## Who submits to App Review

Apple’s App Review “Submitted By” column is the identity that **sent the version to review**, not who uploaded the IPA.

- Uploading with the App Store Connect API key (`eas submit`, `--auto-submit`) shows as **API user {Key ID}**.
- **Submit for Review** must be done in the App Store Connect website while logged in as **Saksham Chaurasia**, so the row shows that name — never via ASC API / Fastlane `submit_for_review`.

TestFlight binary upload via EAS + API key is fine. App Review click is not.

## Android quality (API 35 / 36)

Portrait lock is **iOS-only** (`UISupportedInterfaceOrientations`). Android
`orientation` is `default` so Play does not see `screenOrientation=portrait`
on `MainActivity`.

Play’s [26 Aug 2026 quality post](https://android-developers.googleblog.com/2026/08/app-quality-memory-optimization-secure-onboarding.html)
and [technical quality requirements](https://support.google.com/googleplay/android-developer/answer/17492799)
are **upcoming**, not this binary. Missing them after the dates below can cut
visibility and publishing. MindKshetra is an **app** (not a game) on phone/tablet.

### Memory + DEX — enforce Feb 2027

Play scores **P90 over 28 days**, Android 13+, by RAM tier and process state.
Anon RSS + swap for apps (4 GB devices): **2 GB** foreground, **1 GB**
background / user-perceived services. Higher RAM tiers are looser. Bitmap P90
must stay **≤ 200 MB** in background / user-perceived services and **≤ 400 MB**
cached (foreground has no bitmap cap in the table).

- Production EAS Android builds minify with **R8** (Expo release default). Do
  not ship a debug APK/AAB to Play.
- After the first Play AAB, open **App bundle explorer** and confirm DEX
  shrink / optimize / obfuscate are each **≥ 25%** if DEX is **> 10 MB** (apps
  under 10 MB DEX are not forced).
- `CoverImage` uses `resizeMethod="resize"` on Android so decoded bitmaps match
  view size. Watch Android vitals **Memory** (anon RSS + swap, bitmap) once
  production traffic exists; do not hold hero bitmaps after the UI is hidden.
- FGS / `BOOT_COMPLETED` already stripped (`plugins/withStripAudioFgsAndBootCompleted.js`)
  so we do not keep a background process that inflates RSS.

### Zero-Tap Sign-In — enforce Apr 2027

Any app with sign-in (optional or required) must restore the **active**
session on a new phone/tablet via the
[Restore Credentials API](https://developer.android.com/identity/sign-in/restore-credentials)
(Android 9+), when the user restores from D2D or cloud backup. Guest / signed-out
users must stay unsigned-in. Games are exempt; we are not a game.

Google sign-in is still **browser OAuth** (`AuthContext.signInWithGoogle`).
That does **not** meet this rule. Credential Manager restore + writing a
restore key on sign-in (and deleting it on logout) is a native auth rewrite —
track it here; **do not block this binary**. Block Store only counts if it was
live on or before **30 Sep 2026**; we never shipped it, so the path is Restore
Credentials, not Block Store.

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
