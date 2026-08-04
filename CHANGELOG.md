# Changelog

## 2.0.0 — UI 2.0 (Stitch-aligned)

- Reconciled the complete Design v3 product with the Stitch-aligned v2 visual
  system (void + brass, Fraunces / Sora / Noto Serif Devanagari).
- Retained the full Home: Verse of the Day, six paths, Sadhana, meditation
  continuation, Japa, Panchang, themed paths, Community, moods, and Madhav.
- Added native Care and Support destinations and strengthened bilingual crisis
  guidance.
- Expanded Jyotish with saved-member Horoscope, Muhurat, Transits, chart
  predictions, compatibility, and safer context isolation.
- Refined Mood, Madhav, Sloka, meditation hub/player/completion, progress,
  achievements, and onboarding presentation.
- Preserved detailed personalization onboarding and added post-onboarding
  Personalize settings with server-backed hydration.
- Added route validation, API/context tests, PR quality gates, and Maestro
  device flows.
- Aligned Expo, npm, and lockfile marketing versions at `2.0.0`; native build
  numbers remain managed remotely by EAS.

### Upgrade notes

- Existing guest practice data is retained and merged once after sign-in.
- Production builds now require valid public API and Supabase configuration;
  missing auth configuration fails during app setup instead of launching a
  broken sign-in experience.
- Push delivery still requires valid APNs/FCM credentials and physical-device
  verification for each release candidate.
