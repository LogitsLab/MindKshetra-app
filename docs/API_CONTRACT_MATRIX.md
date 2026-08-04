# Mobile API contract matrix

Updated: 2026-08-05

All app requests use `src/api/client.ts`; bearer auth is attached centrally,
401 is retried once after refresh, and structured API errors reach the UI.

| Domain / routes | Methods | Auth | Guest behavior | Primary consumers |
| --- | --- | --- | --- | --- |
| `/api/health` | GET | No | Public | Release smoke |
| `/api/slokas`, `/api/slokas/:id`, `/story` | GET | No | Public, cached locally | Explore, Sloka, VOTD |
| `/api/moods`, `/api/moods/:id/slokas` | GET | No | Public | Mood |
| `/api/votd/today` | GET | No | Public, local fallback | Home, VOTD |
| `/api/favorites` | GET/POST/DELETE | Yes | Sign-in prompt/local navigation only | Sloka, Favorites |
| `/api/journal` | GET/POST | Yes | Local draft may be retained | Sloka, Journal, Reflections |
| `/api/account/streak`, `/milestones`, `/achievements` | GET/POST | Yes | Local practice state | Home, Progress, Achievements |
| `/api/account/preferences`, `/profile` | GET/PATCH | Yes | AsyncStorage preferences | Account, Personalize |
| `/api/account/export`, `/delete` | GET/POST | Yes | Not available | Account |
| `/api/account/onboarding/complete` | POST | Yes | AsyncStorage completion | Onboarding |
| `/api/account/notification-preferences` | GET/PATCH | Yes | Local defaults | Account |
| `/api/account/push-tokens` | POST/DELETE | Yes | Safe no-op | Push registration |
| `/api/progress`, `/complete`, `/cursor`, `/merge` | GET/POST | Yes | Local progress and cursor | Explore, Sloka |
| `/api/sadhana`, `/api/sadhana/merge` | GET/POST | Optional | Local log; deterministic merge | Sadhana, Home |
| `/api/meditation/*` | GET/POST | Optional | Bundled program + local progress | Meditation |
| `/api/journeys`, `/:id/run`, `/merge` | GET/POST | Optional | Bundled catalog + local run | Paths |
| `/api/panchang`, `/calendar` | GET | No | Visible retry | Panchang |
| `/api/chat`, `/api/chat/sessions`, `/merge` | SSE/GET/POST | Optional | Local session; no cross-account reuse | Madhav |
| `/api/astrology/health`, `/geocode`, `/compute` | GET/POST | Optional | Incognito chart session | Astrology |
| `/api/astrology/members/*` | GET/POST/DELETE | Yes | Not available | Saved members |
| `/api/astrology/predictions`, `/compatibility` | POST | Optional | Incognito session where supported | Chart, Milan, Horoscope |
| `/api/astrology/muhurat` | GET | No | Public | Muhurat |

## Context isolation

- Verse conversations send `slokaId` as a dedicated field.
- Saved-member conversations send `memberId`.
- Incognito chart conversations send `chartSessionId`.
- Starting or changing a context clears incompatible IDs; no member or chart
  context is restored into another signed-in account.

## Response normalization

The mobile adapters accept only documented compatibility variants:

- Sloka catalogs: bare array, `{ slokas, total }`, or legacy `{ results }`.
- Mood catalog: bare array (current backend) or `{ moods }`.
- Astrology prediction prose is normalized by
  `extractPredictionsText`; UI screens do not invent absent fields.

Unexpected shapes resolve to an explicit empty/error state and are covered by
adapter tests rather than being presented as successful data.
