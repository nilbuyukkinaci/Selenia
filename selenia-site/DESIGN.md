# Design

## Theme
A **moonlit, lunar-calm** world. Color strategy: **Committed → Drenched** in the brand's own deep teal (the logo's native habitat: a white spiral mark on deep teal). Dark teal-drenched sections (hero, cycle, closing) alternate with soft moon-white sections (philosophy, the day, features) for editorial rhythm. The deliberate scene: a woman at dawn or dusk, low warm light, unhurried — the surface should feel like still water under moonlight, with occasional candle-warm highlights. Explicitly NOT cream/beige, NOT clinical white, NOT corporate gradient.

## Color (OKLCH)
- `--teal-950` oklch(0.255 0.040 196) — deepest drench / hero base
- `--teal-900` oklch(0.305 0.046 196) — primary brand teal (logo background)
- `--teal-800` oklch(0.385 0.055 197) — raised teal surface
- `--teal-600` oklch(0.50 0.062 198) — wordmark teal / borders on dark
- `--teal-300` oklch(0.80 0.060 192) — light teal text/lines on dark
- `--moon-050` oklch(0.985 0.004 190) — moon-white body (whisper of teal, near-zero chroma; avoids warm-beige tell)
- `--moon-100` oklch(0.965 0.007 190) — soft raised light surface
- `--ink-900` oklch(0.255 0.030 200) — primary text on light (cool near-black)
- `--ink-600` oklch(0.46 0.022 200) — secondary text on light (passes 4.5:1 on moon-050)
- Accents (used sparingly, meaningfully):
  - `--candle` oklch(0.815 0.105 78) — warm honey; energy peaks, sun in day-arc, key highlight
  - `--clay` oklch(0.66 0.095 28) — soft terracotta-rose; menstrual phase / warmth
- Cycle phases (natural, desaturated ring gradient):
  - menstrual `--p-menstrual` oklch(0.62 0.095 25) (clay-rose)
  - follicular `--p-follicular` oklch(0.72 0.075 155) (fresh sage)
  - ovulation `--p-ovulation` oklch(0.84 0.105 92) (honey-gold)
  - luteal `--p-luteal` oklch(0.66 0.060 350) (dusty mauve)

## Typography
Pairing on a contrast axis (serif + humanist sans), both deliberate, neither on the reflex-reject list:
- **Display / headings — Spectral** (Production Type): calm, literary, intelligent serif with refined italics; reads like a well-set journal, not a fashion masthead. Weights 300/400/500, italic for emphasis only.
- **Body / UI — Hanken Grotesk**: warm humanist sans, soft but grounded, not childish; 400/500/600.
- Scale: fluid `clamp()`, ratio ≈1.28; display max **5.5rem** (≤6rem ceiling); display letter-spacing -0.02 to -0.03em (≥-0.04 floor); `text-wrap: balance` on h1–h3, `pretty` on prose; body measure 62–70ch; +line-height on light-on-dark.

## Components / Figures (all bespoke)
- **Lunar spiral mark** — hand-built SVG recreation of the Selenia galaxy/triskelion logo; stroke draw-on at load.
- **Cycle-orbit (hero signature)** — concentric celestial rings, four phase arcs, a moon marker slowly orbiting (~90s), soft drifting starfield + grain. Carries the "cyclical" idea; ambient, calm, pausable via reduced-motion.
- **Energy curve** — the "old way" rigid straight line morphing into Selenia's flowing sine wave; the page's thesis figure.
- **Day-arc** — sun→moon traveling a Morning·Midday·Night arc, with greeting → check-in → adapt vignette.
- **Phase ring + energy chart** — four phases with energy levels and per-phase guidance; hover to focus.
- **Check-in chips, sample supportive notification** — real product texture, not screenshots.
- Surfaces use soft multi-layer shadows over borders on light; hairline teal borders on dark.

## Motion (weighting: Jakub → Jhey → Emil)
- Enter recipe: opacity + translateY(8–14px) + blur(6px→0), spring `bounce:0`, 420–620ms; exits subtler.
- Easing: custom `cubic-bezier(0.22,1,0.36,1)` (ease-out-expo-ish); never bare ease; no bounce/elastic (calm brand).
- Ambient looping motion ONLY in meaning-bearing figures (orbit, energy wave, drift), slow + low-contrast; never on CTAs/labels (no pulsing/glowing decoration).
- Scroll reveals: varied per section, enhancement over already-visible defaults, IntersectionObserver with reveal-all fallback (`window.__revealAll`).
- `prefers-reduced-motion`: every loop + transition stops, content resolves to final static state. Animate only transform/opacity/filter; targeted `will-change`.
