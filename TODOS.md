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

## From `/design-review`, 2026-07-28 — needs a decision or an asset

Full report:
`~/.gstack/projects/LogitsLab-MindKshetra-app/designs/design-audit-20260728/design-audit-mindkshetra-app.md`

- [ ] **The app has no Devanagari typeface.** `Text`'s `sanskrit` variant declares
      `Fraunces_500Medium` (`src/components/Text.tsx:67`) and the Home watermark
      declares `Fraunces_600SemiBold` (`app/(tabs)/home.tsx:432`). Fraunces has no
      Devanagari coverage, so every Sanskrit verse renders in a silent platform
      fallback with the declared weight ignored — on the product's primary reading
      surface. Either add a real face (`@expo-google-fonts/noto-serif-devanagari`
      pairs with Fraunces) and make `sanskrit` per-script, or declare no family on
      Devanagari and document the platform face as intended. Confirm on a device
      before choosing; this was found by reading source, not by looking.
- [ ] **Explore and Astrology are the same photograph.** `images.pathAstrology`
      is `require(".../path-explore.jpg")` (`src/theme/assets.ts:8`), so two tiles
      in Home's 2×2 grid show one image side by side. Needs an asset.
- [ ] **18 mood accents against a one-accent system.** `DESIGN.md` says brass is
      the whole palette discipline; `moodAccent` defines 18 colours and Home shows
      six at once. Either the mood palette is a documented exception or the rule
      needs rewording — right now docs and code disagree.
- [ ] **Light mode over a dark photograph.** Every `Screen` puts `hero.jpg`
      behind everything, and light mode's `colors.text` is `#0c1220`. Onboarding
      now uses `onMedia` and is safe; other routes were not checked. Bundle with
      the device pass.

## Rejected

- **Android-first launch split.** Considered as a way to dodge Apple's stricter
  mental-health review. Rejected: it splits QA across two timelines for a benefit the
  crisis-path fix delivers directly.

## Not in scope

- Web target. `app.json:31` configures Metro for web, but it is untested and outside
  the store launch plan.
