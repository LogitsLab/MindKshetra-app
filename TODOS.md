# TODOS

Deferred scope from the `/autoplan` store-launch review, 2026-07-27 (`2190f3c`).
Full plan: `~/.gstack/projects/LogitsLab-MindKshetra-app/main-launch-plan-20260727-125750.md`

## v1.1 — deferred, not rejected

- [ ] **Accessibility audit across all 20 routes.** Currently 3 accessibility props
      total, 2 of them on the Madhav FAB. Needs labels, roles, and hit-target checks
      per screen. Deferred because a full pass would stall launch, not because the gap
      is acceptable.
- [ ] **`prefers-reduced-motion` support.** `docs/design/VISUAL_SYSTEM.md:87` requires
      disabling non-essential motion; there are zero implementations. The FAB pulse
      (`src/components/MadhavFab.tsx:38-45`) loops unconditionally. Bundle with the a11y pass.
- [ ] **Crash and error reporting.** No Sentry or equivalent. Deferred as new
      infrastructure outside the launch blast radius, but nothing today tells you when
      a user hits a failure.
- [ ] **Device test coverage.** Auth flows, deep links, favorites round-trip, and FAB
      geometry are manual-QA only for v1. See the test plan artifact, section "Deferred
      to manual QA".
- [ ] **Tab label legibility.** Tab labels render at 11px
      (`app/(tabs)/_layout.tsx:16`), below the 12px floor.

## Rejected

- **Android-first launch split.** Considered as a way to dodge Apple's stricter
  mental-health review. Rejected: it splits QA across two timelines for a benefit the
  crisis-path fix delivers directly.

## Not in scope

- Web target. `app.json:31` configures Metro for web, but it is untested and outside
  the store launch plan.
