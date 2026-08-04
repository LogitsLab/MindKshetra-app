# MindKshetra mobile v2.0.0 QA report

Updated: 2026-08-05

Candidate branch: `feat/mobile-v2-integration`

## Quality summary

| Gate | Result | Evidence |
| --- | --- | --- |
| TypeScript | Pass | `npm run lint` |
| Jest baseline | Pass | 12 suites, 138 tests before v2 gap-closure additions |
| Expo dependency alignment | Pass | `npx expo install --check` |
| Expo diagnostics | Pending rerun | Missing `expo-asset` was found and installed |
| Git whitespace | Pass | `git diff --check` |
| Dev API public smoke | Pass | health, VOTD, slokas, moods, panchang, calendar, astrology health and Muhurat returned HTTP 200 |
| Route inventory | Pass | 40 pre-gap Expo route files classified; Care and Support pending integration |
| Maestro | Pending | Flows are being added; local Maestro binary was not initially installed |
| iOS internal artifact | Pending | EAS build and credentials check required |
| Android internal artifact | Pending | EAS build and credentials check required |
| Physical-device push/OAuth/audio | Blocked | No iOS or Android physical device is attached to this workstation |

## Automated coverage

- Fresh onboarding and guest Home completeness.
- Four-tab IA and Madhav FAB.
- Explore, chapter, verse, favorite, reflection and Account handoffs.
- Mood result and verse detail.
- Practice completion/progression and offline recovery.
- Panchang/calendar navigation.
- Astrology member/chart/prediction/context isolation.
- Auth persistence and one-time guest merge.
- Notification preferences and safe tap targets.
- English/Hindi crisis detection and SSE parsing.

## Dev-backend smoke

Base URL: `https://mind-dev.logitslab.com`

Successful unauthenticated checks on 2026-08-05:

- `/api/health`
- `/api/votd/today`
- `/api/slokas?limit=1`
- `/api/moods`
- `/api/panchang`
- `/api/panchang/calendar`
- `/api/astrology/health`
- `/api/astrology/muhurat`

Authenticated endpoints remain covered by typed Jest request adapters and must
be exercised on the signed-in internal candidates.

## Device matrix

| Platform | Target | Dev-backend candidate | Production candidate |
| --- | --- | --- | --- |
| iOS | iPhone 17 simulator, iOS 26.5 | Pending | Pending |
| iOS | Compact physical device | Blocked: device not attached | Blocked |
| iOS | Current large physical device | Blocked: device not attached | Blocked |
| Android | Compact emulator/device | Blocked: no Android device/emulator configured | Blocked |
| Android | Current physical device/API | Blocked: device not attached | Blocked |

Required physical checks: fresh install; 1.1.14 upgrade; warm/cold launch;
background/foreground; network loss/recovery; denied permissions; deep links;
Google OAuth; email OTP; audio; haptics; APNs/FCM registration and delivery;
notification taps; keyboard behavior; share sheet.

## Release blockers

1. Production EAS environment must provide the production Supabase URL and
   publishable anon key as well as the production API URL.
2. APNs and FCM credentials must be attached and delivery-tested on physical
   devices.
3. Internal iOS and Android builds must reach `finished` status and the exact
   artifacts must complete the device matrix above.
4. There must be no P0/P1 defects before promotion from `dev`.

Blocked rows are not passes and must not be waived for a store submission.
