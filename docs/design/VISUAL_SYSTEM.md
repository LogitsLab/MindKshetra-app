# MindKshetra Mobile — Design R&D

Locked visual and interaction system for the Expo app. Brand DNA from web `DESIGN.md`; composition is mobile-native.

## Moodboard (direction)

- Night field / ink void with a single brass accent
- Warm serif (Fraunces) for verse & brand; geometric sans (Sora) for chrome
- Hairline borders, almost no shadows — elevation via surface opacity
- Calm wellness apps (generous reading space, quiet chrome) without purple gradients or emoji UI
- Reference energy: Gmail’s single FAB (one primary action) + immersive reading apps

## Information architecture

| Zone | Contents |
|------|----------|
| Bottom tabs (4) | Home · Explore · Mood · Astrology |
| FAB (bottom-right) | Madhav — only primary floating action |
| Stack / header | Account, Favorites, VOTD, Sloka detail, Madhav full-screen |

Madhav is **not** a tab. Always open via the brass FAB.

## Wireframe notes (key screens)

### Home
- Brand mark + “MindKshetra” as hero signal
- One short line of supporting copy
- Verse of the Day teaser (tap → VOTD)
- Three path rows: Explore / Mood / Astrology (not a dashboard of cards)
- Quiet streak chip near account avatar (top-right)

### Explore
- Search in header
- Chapter grid (18) with thin brass progress marks
- Chapter → verse list → Sloka

### Sloka (immersive)
- Devanagari first, then IAST, then translation/meaning
- Bottom toolbar: favorite · speak · share · journal · complete
- FAB remains; long-press can “Ask Madhav about this verse”

### Mood
- 18 mood tiles, calm labels
- Mood → matched verse list → Sloka

### Astrology hub
- Chart as hero when available
- Segmented: Chart / Dasha / Predictions
- Members list + Incognito entry
- Details in bottom sheets where possible

### Madhav (full-screen from FAB)
- Message list, citations as hairline list
- Two-voice reply: chart epigraph (Fraunces) + Madhav glass reply
- Composer pinned bottom; crisis helplines when triggered

### Account
- Sign-in (anonymous / Google / Email / Apple)
- Theme, language, profile, VOTD email, export, reflections

## FAB placement (thumb zone)

```
┌─────────────────────┐
│                     │
│      content        │
│                     │
│              ┌───┐  │  ← FAB ~16–20px from right
│              │ M │  │     above tab bar + safe area
│              └───┘  │
├─────────────────────┤
│  Home Explore Mood …│
└─────────────────────┘
```

- Hide FAB on Madhav screen and when keyboard covers composer
- Lists use `paddingBottom` ≥ FAB height + tab bar + 24

## Motion / haptic shortlist (max 5)

1. Screen enter: soft fade + 8px rise (200ms)
2. FAB tap: light haptic + spring open to Madhav
3. Favorite / verse complete: light haptic + brass flash
4. Madhav streaming: low-opacity brass pulse on FAB (when minimized) or on send button
5. Tab focus: subtle label color to brass-soft

`prefers-reduced-motion` / accessibility: disable non-essential motion; keep haptics optional.

## Light + dark QA targets

| Token | Dark | Light |
|-------|------|-------|
| void | `#07090f` | cool mist field (near-transparent over soft blue-grey) |
| field | `#0e1420` | translucent white-mist |
| brass | `#c9a227` | `#c9a227` |
| brass-soft | `#e2c45a` | `#8a6410` |
| text | `#eef2f7` | `#0c1220` |
| text-soft | `#c3ccd9` | `#2b3a4f` |
| text-muted | `#9aa8bc` | `#334155` |

## Anti-patterns (do not ship)

- Multi-FAB / speed-dial
- Purple-to-indigo wellness gradients
- Cream + terracotta “AI default” look
- Card soup on Home
- Stats strips / pill clusters in the first viewport
- Uppercase or letter-spacing on Devanagari
