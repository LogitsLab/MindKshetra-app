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

## Screen compositions

- **Home:** brand + hero copy + VOTD glass + image path tiles
- **Explore:** 2-col chapter grid with brass number rings
- **Mood:** accent-tinted tiles
- **Sloka:** immersive reading + brass divider + icon toolbar
- **Madhav:** portrait header + glass replies + chart epigraph
- **Astrology:** image hero + clear CTAs

## Anti-patterns

No purple gradients, multi-FAB, emoji chrome, uppercase Devanagari, or dashboard stats strips on Home.
