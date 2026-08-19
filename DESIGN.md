# Aurora — the KaamSetu design system

> A layered-glass, gradient-mesh visual language for a marketplace that has to
> read as *premium* to a customer and as *obvious* to a worker holding a ₹6,000
> phone in direct sunlight.

Everything here is implemented, not aspirational. `app/globals.css` is the
system; `components/aurora.tsx` is the component library.

---

## 1. Principles

| # | Principle | Consequence in the code |
|---|---|---|
| 1 | **Depth over borders** | Surfaces float on two-layer shadows plus a lit top edge. There is not one 1px grey box in the system. |
| 2 | **Light is the brand** | Emerald→cyan gradients and soft glow carry hierarchy so chrome doesn't have to. |
| 3 | **Motion only on transform + opacity** | Every animation is GPU-composited. Nothing animates `width`, `height`, `top` or `left`. |
| 4 | **Colour never carries meaning alone** | Every coloured state also has an icon or a word. Works for colour-blind users and in sunlight. |
| 5 | **One motion per intent** | Nothing animates just because it can. If a movement doesn't explain a state change, it was cut. |

---

## 2. Colour

Four hues, each with a job. Ramps live as CSS custom properties in `:root`.

| Role | Token | Value | Used for |
|---|---|---|---|
| Primary | `--em-500/600/700` | `#10B981` `#059669` `#047857` | Brand, primary action, "trusted / verified / available" |
| Secondary | `--cy-400/500` | `#38DDF2` `#14C8E0` | AI, speed, distance and ETA, gradient terminus |
| Accent | `--gd-400/500` | `#FFC65C` `#F5A623` | Gold tier, ratings, money, warm reward |
| Support | `--in-400/500` | `#818CF8` `#6366F1` | AI voice, informational notes, second identity colour |
| Alert | `--danger` | `#E5484D` | Emergency urgency, recording state, destructive only |

**Surfaces** are never flat fills. `--glass` is a translucent layer over an
animated four-point gradient mesh (`body::before`), finished with a fine SVG
grain (`body::after`) that stops large gradients banding on cheap panels.

**Elevation** is three tokens, each a two-layer shadow plus an inset highlight:
`--lift-1` (resting) → `--lift-2` (card) → `--lift-3` (raised / hovered / modal).

**Glow** (`--glow-em`, `--glow-cy`, `--glow-gd`) is reserved for exactly one
element per screen — the thing you should touch next.

### Dark mode

Adaptive by default: follows the OS, with a manual override stored in
localStorage, and an inline `<script>` in `<head>` that sets `data-theme`
**before first paint** so a dark-mode phone never flashes white.

Dark is not an inversion. Canvas drops to `#060A11`, glass gains opacity rather
than losing it, shadows deepen, and glow intensity rises ~20% because bloom
reads weaker on dark. Contrast was re-checked per token, not assumed.

---

## 3. Type

`Plus Jakarta Sans` for Latin, `Noto Sans Devanagari / Tamil / Telugu /
Malayalam / Kannada` for the five Indic scripts — loaded via `<link>` rather
than `next/font` so a blocked font CDN degrades to the system stack instead of
failing the build.

| Class | Size | Tracking | Use |
|---|---|---|---|
| `.t-display` | `clamp(34–46px)`, 800 | −0.042em | One per screen. The question the screen answers. |
| `.t-h1` | 30px, 780 | −0.032em | Section owner |
| `.t-h2` | 23px, 750 | −0.026em | Card group |
| `.t-h3` | 18.5px, 700 | −0.018em | Card title |
| `.t-body` | 16.5px | −0.011em | Reading text |
| `.t-sm` / `.t-xs` | 14.5 / 13px | — | Meta, captions |
| `.t-micro` | 11.5px, 750, uppercase | +0.075em | Eyebrow labels only |

Body never goes below **13px**. Tap targets never below **56px** (`--tap`).
`.t-num` switches on tabular figures so prices and distances don't jitter while
counting up.

---

## 4. Motion specification

Two spring families and two eases. Springs for anything a finger caused; eases
for anything time caused.

```ts
SPRING.snap   = { stiffness: 420, damping: 32, mass: 0.7 }   // taps, toggles, chips
SPRING.soft   = { stiffness: 240, damping: 26, mass: 0.9 }   // cards, sheets, step changes
SPRING.bouncy = { stiffness: 300, damping: 15, mass: 0.8 }   // rewards and badges ONLY
EASE.out      = cubic-bezier(.22, 1, .36, 1)
EASE.inOut    = cubic-bezier(.65, 0, .35, 1)
```

| Interaction | Spec |
|---|---|
| Card hover | `translateY(-3px)` + `--lift-2` → `--lift-3`, 260ms `EASE.out` |
| Card press | `scale(.988)`, 140ms — press is always faster than release |
| Sheen sweep | `translateX(-120% → 120%)`, 460ms, hover only |
| Button press | `scale(.978)` + gradient sheen sweep 620ms |
| Magnetic button | pointer offset × 0.22, clamped to **±8px**, spring 260/18. Mouse only — disabled on touch, where there is no hover to answer |
| List entry | stagger 55ms, `y: 14 → 0`, 450ms `EASE.out` |
| Section reveal | `whileInView`, `y: 18 → 0`, 550ms, `once: true`, −40px margin |
| Step change | `AnimatePresence` swap, in `y:18`, out `y:−12`, `SPRING.soft` |
| Dock indicator | `layoutId="dock-pill"` — the pill physically travels between tabs |
| Score ring | conic-gradient `--pct` transition 460ms, number counts up over 1100ms with a cubic ease-out |
| Voice orb | three concentric rings, `scale 1 → 2.05` + fade, 3s loop, 750ms apart; 1.6s and gold when live |
| Radar | conic sweep 5.5s linear; pins float ±6px on a 4s alternate, staggered 400ms so they never pulse in unison |
| Live feed | rotate every 3.4s, `AnimatePresence mode="wait"`, in `y:16` / out `y:−16` |
| Bottom sheet | slide from 100%, `SPRING.soft`, **drag-to-dismiss** past 110px |
| Tier rank-up | `scale .6 → 1` on `SPRING.bouncy` — the only bouncy spring in the app |

**Reduced motion is not a downgrade path, it's a supported mode.**
`useReducedMotion()` is consulted in every animated component, and the
stylesheet independently collapses all durations under
`prefers-reduced-motion: reduce`. Layout is identical; only movement stops.

---

## 5. Component library

`components/aurora.tsx`

| Component | What it does |
|---|---|
| `Reveal` | Scroll-triggered entrance, fires once |
| `Stagger` / `StaggerItem` | Sequenced list entrance |
| `Magnetic` | Pointer-following wrapper, ±8px, mouse only |
| `Counter` | rAF count-up with cubic ease-out, tabular figures |
| `Ring` | Conic score ring, animated fill + count-up, `s`/`m`/`l`, emerald/cyan/gold |
| `Meter` | Horizontal bar with scale-in |
| `GlassCard` | The surface. `interactive`, `sheen`, `glow`, polymorphic `as` |
| `VoiceOrb` | Mic with breathing rings; `compact` fits inside a search field |
| `AudioBars` | Five-bar level indicator |
| `RadarMap` | Schematic proximity view with pins |
| `LiveFeed` | Rotating activity ticker |
| `TierBadge` / `TierUp` | Reputation badge and the rank-up moment |
| `Dock` | Floating nav; label morphs open on the active tab, pill travels via `layoutId` |
| `PageFade` | Page transition wrapper |
| `Sheet` | Drag-dismissible bottom sheet with Escape handling |
| `CardSkeleton` | Shimmer placeholder |

---

## 6. Trust system

Reputation you cannot buy. `lib/tiers.ts`.

| Tier | Requirement | Why |
|---|---|---|
| **Bronze** ● | Phone verified, profile complete | Earned by *showing up*. A new worker is never rank-less. |
| **Silver** ◆ | 10 jobs, 4.0+ | First real proof |
| **Gold** ★ | 40 jobs, 4.5+ | Sustained quality |
| **Community hero** ✦ | 120 jobs, 4.7+ | Cannot be rushed or bought |

Points = `jobs × 10 + rating × 40 + reviews × 4`. No paid boosts — a rank you
can buy is a rank nobody trusts.

Progress toward the next rung is always visible as a gold ring plus one plain
sentence (*"73 more jobs to reach Community hero"*), because an invisible
ladder motivates nobody. Streaks are **derived** from completion timestamps,
never stored, so they can never drift from reality. Endorsements
(*Always on time*, *Knows the work*, *Neighbourhood regular*) are computed from
review dimensions rather than self-declared.

---

## 7. User journeys

**Worker — from poster to first job**
```
QR on a shop wall
  → /join  (language chosen before a single word of English appears)
  → /worker/onboarding — a conversation, not a form:
      AI asks in their language → phone + OTP → they SPEAK their trade
      → skills / experience / category extracted live, shown as chips
      → they confirm or tap a different trade
      → area + radius → availability
      → Bronze badge awarded, profile live
  → /worker — ranked jobs, each showing why it matched
```
Every screen: one question, one big control, zero typing required except the
phone number.

**Resident — from problem to hire**
```
/ "Need help today?"
  → speak or type the problem  (voice button is in the search field itself)
  → /discover — AI parses the request, ranks workers, shows a fair price band
  → smart cards: match ring, tier, live availability, distance, ETA, verified
  → profile sheet: reputation dashboard, trust meters, badges, their own words
  → hire → auto-translated chat → completion → three taps of feedback
```
Time to first useful screen: **one input**.

**Third audience — the community.** `/leaderboard` and `/insights` exist for
RWAs, NGOs and municipal skilling offices, who need to know which trade is
short in which locality.

---

## 8. Accessibility

Built for first-time smartphone users, elderly users, low-literacy users and
six languages at once.

- **Tap targets** ≥56px for primary controls, ≥42px for chips. Nothing smaller.
- **Voice-first**: the mic is the primary control on the profile and search
  screens; typing is the fallback, not the default.
- **Text never below 13px**; body 16.5px; `clamp()` display scales with viewport.
- **Icon + word, always.** No icon-only affordance carries unique meaning.
- **Contrast**: `prefers-contrast: more` raises surface opacity and darkens
  secondary ink. Every heading and value sets `color` explicitly rather than
  inheriting, so no element can be stranded in the wrong theme.
- **Focus**: 2.5px emerald `:focus-visible` ring at 3px offset, never removed.
- **Motion**: `prefers-reduced-motion` honoured in CSS *and* in every component.
- **Semantics**: `role="dialog"` + `aria-modal` on sheets with Escape to close;
  `aria-current="page"` on the dock; `aria-pressed` on the mic; `aria-label`
  on every score ring stating the number in words.
- **Colour independence**: tiers pair colour with a distinct glyph (● ◆ ★ ✦).

---

## 9. What is deliberately *not* here

- **No confetti.** Celebration animation was scoped out — the rank-up spring
  and the tier ring carry the reward without a particle system to maintain.
- **No street map.** The radar is schematic on purpose: a worker's home address
  is not shown to a stranger, and a ring reads as "close to me" far faster than
  a road network for a low-literacy user.
- **No paid ranking.** Structural, not cosmetic.
