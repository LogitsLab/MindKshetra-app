# MindKshetra Mobile — Visual System

Shipped design language for Expo SDK 54. Brand DNA from web `DESIGN.md`; atmosphere and compositions are mobile-native.

## Atmosphere

Fixed stack behind every `Screen` (unless `atmosphere="none"`):

1. `assets/backgrounds/hero.jpg` — cover, focal slightly high
2. Teal radial wash (top)
3. Brass radial wash (top-right)
4. Vertical void veil
5. Optional brass breathe ring (respects reduce-motion)

## Brand

- **Mark:** lotus leaf SVG (`BrandMark`) — Home, Account, Astrology hero
- **Madhav:** portrait on chat header; glyph on FAB (not letter-M)
- **Type:** Fraunces display / Sanskrit; Sora body / chrome
- **Accent:** brass only (`#c9a227` / `#e2c45a`). Teal is atmosphere-only.

## Surfaces

| Primitive | Use |
|-----------|-----|
| `Panel` | Contained content with `--line` border |
| `Glass` / blur panels | Reading / chat where supported (iOS BlurView) |
| `surface` rows | Browse lists — hairline, not card soup |
| Path tiles | Photo + media scrim (Explore / Mood / Madhav / Astrology) |

## Navigation

- Tabs: Home · Explore · Mood · Astrology with custom icons + blur tab bar
- Madhav: brass FAB bottom-right with Madhav glyph + streaming pulse
- Lists reserve `contentBottom` so FAB never covers the last row

## Motion

1. `Rise` — screen enter fade + 18px Y
2. FAB haptic + pulse while streaming
3. Favorite / complete haptics
4. Tab active → brass-soft
5. Kill all when reduce-motion is on

`Rise` takes `active` (default true). A horizontal pager renders its pages
eagerly, so a page inside one animates while it is still off to the side and
arrives flat. Pass `active` whenever the content is not yet on screen.

## Onboarding

One photograph for the whole flow, not one per step. `OnboardingBackdrop` owns
it; the steps are transparent compositions over it.

`hero.jpg` is self-scrimming — near-black sky, near-black ground, one bright
horizon band about 62% down. That band is the visual anchor and nothing sits on
it. Two veils instead of one flat veil:

| Veil | Shape | Purpose |
|---|---|---|
| poster | dark at top and bottom, light across the horizon | copy gets contrast from the image; the glow survives |
| reading | roughly flat, fades in from step 2 | cards, inputs and buttons get a calm ground |

Rules that are load-bearing:

1. **Copy over the photograph uses `onMedia` / `onMediaMuted`, never `text`.**
   The photo is dark in both themes; `colors.text` is near-black under light.
2. **The hero is edge-to-edge.** No inset, no radius, no second image. Slides pad
   their own copy; the pager does not pad them.
3. **Progress counts the four screens a person sees**, not the three internal
   steps. An indicator that changes its own scale mid-flow cannot answer the one
   question it exists for.
4. **Back exists on every step and is wired to `BackHandler`.** The route sets
   `gestureEnabled: false`, so without that Android's back button leaves the app.
5. **One `pending` action, not one `busy` boolean.** A shared flag makes every
   button report the same request and tells you nothing about which one you
   started.
6. **A provider resolving `false` means cancelled.** Never finish onboarding on
   it — that marks the flow complete and strands the person signed out.

## Screen compositions

- **Home:** brand + hero copy + VOTD glass + image path tiles
- **Explore:** 2-col chapter grid with brass number rings
- **Mood:** accent-tinted tiles
- **Sloka:** immersive reading + brass divider + icon toolbar
- **Madhav:** portrait header + glass replies + chart epigraph
- **Astrology:** image hero + clear CTAs

## Type scale

`src/theme/tokens.ts` → `typeScale`. Sizes come from it; screens do not pick
their own. Steps: `poster` 52/58, `display` 32/38, `title` 22/28, `subtitle`
18/24, `sanskrit` 24/36, `body` 16/24, `soft` 15/22, `muted` 13/18, `eyebrow`
11/14.

`muted` at 13 is the floor. Anything smaller is a bug, not a choice.

**`text-muted` is chrome. `text-soft` is prose.** If the sentence is meant to be
read, it is `soft`, whatever its size.

## Anti-patterns

No purple gradients, multi-FAB, emoji chrome, uppercase Devanagari, or dashboard stats strips on Home.

**Fraunces has no Devanagari coverage.** Declaring it on Devanagari text does not
fail loudly — it falls back to the platform face and drops the weight. Do not add
new `fontFamily: "Fraunces_*"` to anything that can render Devanagari. See the
open item in `TODOS.md`.
