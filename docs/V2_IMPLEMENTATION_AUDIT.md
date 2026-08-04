# Mobile v2.0.0 implementation audit

Updated: 2026-08-05

## Integration baseline

- Integration branch: `feat/mobile-v2-integration`
- Starting `dev`: `767c837`
- Shared branch base: `2f4c92e`
- Preserved local Account/Astrology work: `7fd9df3`
- Reconciled production `main`: merge commit `1f5f619`
- Reconciled Stitch `ui-v2`: merge commit `9756936`
- Initial post-merge quality baseline: TypeScript pass; 12 Jest suites and
  138 tests pass; `git diff --check` pass.

The v2 branch was not accepted as a snapshot. It removed the complete Home and
Personalize route. The integration keeps the richer Design v3 product surface
and ports v2 visual/interaction work screen by screen.

## Source of truth

1. Product behavior: web PRD and `docs/design-v3/FEATURE-AUDIT.md`.
2. Mobile visual language: `docs/design/VISUAL_SYSTEM.md`.
3. Stitch v2 references:
   `../MindKshetra/docs/design-v2/references/<slug>/screen.html`.
4. Locked IA: Home, Explore, Mood, Astrology tabs; Madhav as FAB/modal.

## Merge dispositions

| Area | Decision |
| --- | --- |
| Home | Keep complete Design v3 Home: brand, VOTD, Sadhana, meditation continuation, Japa, Panchang, Paths, Community, six paths, moods, Madhav close |
| Onboarding | Keep complete personalization sequence and account step; retain v2 header/progress styling where it does not alter behavior |
| Personalize | Keep native `/account/personalize` with local-first/server-wins hydration |
| Mood | Retain Stitch v2 visual rebuild |
| Madhav | Retain v2 chat presentation; preserve streaming, crisis, citations, and chart context |
| Meditation | Retain v2 hub/player presentation; correct completion semantics and truthful navigation |
| Astrology | Keep current functional Horoscope, Muhurat, and Transits; retain v2 hub/chart presentation |
| Account | Keep Personalize, Achievements, Progress, Journal, Reflection archive, Favorites, export/delete, and notification controls |
| Shared components | Retain v2 BrandMark, SlokaCard, MessageBubble, MeditationPlayer, and visual-system updates after behavior review |
| Version | `2.0.0` in Expo/npm/lockfile; EAS native build numbers remain remote/auto-incremented |

## Screen coverage

### Route inventory and disposition

| Route | Stitch / product source | v2.0.0 disposition |
| --- | --- | --- |
| `/` | Boot contract | Onboarding/auth gate, then Home |
| `/onboarding` | 01, 42, 43, 46–48 | Implemented; detailed six-stage flow retained |
| `/(tabs)/home` | 02 + v3 Home audit | Implemented; complete lifestyle Home retained |
| `/(tabs)/explore` | 03 | Implemented; chapter discovery |
| `/(tabs)/explore/[chapter]` | 04 | Implemented; virtualized verse list and cursor |
| `/sloka/[id]` | 05 | Functional; v2 visual parity workstream |
| `/(tabs)/mood` | 06 | v2 implementation retained |
| `/(tabs)/mood/[id]` | 07 | Implemented; API-backed results |
| `/madhav` | 08 | v2 implementation retained; structured verse context workstream |
| `/(tabs)/astrology` | 09 | v2 implementation retained |
| `/astrology/incognito` | 10 | Implemented with shared native birth form |
| `/astrology/members` | Account/Jyotish flow | Implemented |
| `/astrology/members/new` | 10 | Implemented |
| `/astrology/members/[id]` | 11 | v2 chart presentation retained |
| `/astrology/milan` | 12 | Implemented |
| `/astrology/muhurat` | 30 | Implemented; contract verification required |
| `/astrology/horoscope` | 31 | Implemented with saved-member predictions |
| `/astrology/transits` | Jyotish suite | Implemented with saved-member transit data |
| `/panchang` | 13 | Implemented |
| `/panchang-calendar` | 13 | Implemented |
| `/verse-of-the-day` | 14 | Implemented |
| `/favorites` | 15 | Implemented |
| `/sadhana` | 16 | Implemented; offline + signed-in logging |
| `/japa` | 17 | Implemented |
| `/meditation` | 18 | v2 implementation retained |
| `/meditation/[day]` | 19 | v2 player retained |
| `/meditation/daily/[id]` | 19 | Implemented |
| Meditation complete state | 44 | v2 parity workstream |
| `/paths` | 20 | Implemented |
| `/paths/[id]` | 21 | Implemented |
| `/community` | 22 | Implemented |
| `/care` | 23 | Native route workstream |
| `/support` | 24 | Native route workstream |
| `/account` | 25 | Implemented |
| `/account/progress` | 33, 45 | Implemented |
| `/account/achievements` | 29, 41 | Implemented |
| `/account/personalize` | v3 app requirement | Implemented; retained over ui-v2 deletion |
| `/journal` | 28, 32 | Implemented |
| `/account/reflections` | Account flow | Implemented |
| `/privacy` | Legal requirement | Implemented |
| `/auth/callback` | Auth contract | Implemented |

### Complete or covered by the integration

- App shell, four-tab IA, global Madhav FAB, providers and onboarding gate.
- Home full companion surface and all required destinations.
- Onboarding welcome, goals, inspirations, time, setup, and account.
- Post-onboarding Personalize settings.
- Mood grid and mood verse detail.
- Madhav streaming chat, citations, crisis interception, and chart context.
- Astrology hub, incognito/member charts, chart detail, Dasha, predictions,
  Milan, Horoscope, Muhurat, and Transits.
- Meditation hub/player, 45-day progression, one-off sits, guest progress
  merge, Sadhana, Japa, Paths, Panchang, Community, Account, Progress,
  Achievements, Journal, Reflections, Favorites, VOTD, and Privacy.

### Gaps being closed for v2.0.0

- `05-sloka`: functional but requires final Stitch visual parity without
  removing favorite, completion, narration, sharing, journal, story, or Madhav.
- `44-meditation-complete`: use Great/Good/Neutral/Low text choices, localized
  completion, gold-lotus state, and next-day handoff.
- Native Care and Support routes; Community currently hands these to web.
- Structured `slokaId` in Madhav requests.
- Visible recovery states for Home, Journal, Achievements, Explore cursor,
  Account preferences, and partial Sloka-reference resolution.
- Production Supabase config must fail clearly instead of using a placeholder.
- Automated route validation, CI quality checks, and Maestro device flows.

## Connectivity contracts

All HTTP goes through `src/api/client.ts` and typed wrappers in
`src/api/endpoints.ts`. The app and API/Supabase environment must be paired.

| Domain | Required behavior |
| --- | --- |
| Auth | Anonymous, Google, email OTP; `mindkshetra://auth/callback`; refresh and one-time guest merge |
| Gita | Chapter/verse/mood fetch, VOTD, favorites, journal, cursor and completion |
| Madhav | Incremental SSE, abort/offline recovery, citations, session, verse/member/chart context isolation |
| Practice | Sadhana/Japa log, meditation progress/complete/merge, journey run/merge |
| Astrology | Members, geocode, compute/chart, predictions, compatibility, Muhurat, health |
| Panchang | Today and calendar with timezone/date correctness |
| Account | Profile, preferences, achievements, progress, export/delete, notification preferences |
| Push | Token registration, permission flow, safe app-relative tap destinations |

## Release blockers

- Production EAS must contain matching API and Supabase public variables.
- Google OAuth redirect must include `mindkshetra://auth/callback`.
- APNs and FCM credentials require physical-device validation.
- `package-lock.json` and curated `store/release-notes/2.0.0.md` must match
  marketing version `2.0.0`.
- Internal iOS and Android artifacts must complete successfully; EAS
  `--no-wait` invocation alone is not build success.
