# LokaSetu — AI-powered hyperlocal employment platform

> लोक सेतु — "the bridge of people". Connects India's informal workforce
> (electricians, plumbers, carpenters, painters, house help, cooks, drivers,
> raddiwalas, shop assistants) with the people who need them in the same
> neighbourhood — **by voice**, in **ten languages**, with **no forms to fill**.

**Current build: v4.1.7**

The same number prints on the login screen and at the foot of the Profile tab,
so what you are running is always checkable against what this file claims.
`lib/version.ts` is the source of truth; `npm run version:sync` copies it into
`package.json` and here, and `npm test` fails if the three ever disagree.

```bash
npm install
npm run dev        # http://localhost:3000
npm test           # 223 assertions over the whole logic layer
npm run ssr        # render every route server-side, as a deploy does
npm run typecheck  # TypeScript, no emit
npm run doctor     # detect leftover files from an older unzip
```

## Demo accounts

One tap on `/login`. OTP is always **123456**.

| Role | Who | Phone |
|---|---|---|
| Worker | Ramesh Kumar — electrician, verified, a year of earnings history | 9000000001 |
| Customer | Priya Menon — Koramangala | 9000000002 |
| Society | Anil Sharma — Green Valley Apartments, 180 flats | 9000000003 |
| Business | Rakesh Sharma — Sharma Kirana Store | 9000000004 |

## The three-minute tour

1. Sign in as the **worker**. The feed shows only electrical work — search it,
   sort by distance, urgency or pay.
2. **Earnings** — seven ranges over a real year of history, with a chart.
3. Sign in as the **customer** in another window. Open *"Switchboard sparking
   in the kitchen"*: the Contact Hub leads with call / WhatsApp / location, and
   the map shows the worker moving toward you with a live ETA.
4. **Society or business** → `/hire` → build a recurring shift: Mon/Wed/Fri,
   9pm–11pm, for three months. The cost is derived from the roster, not guessed.
5. Change city in the header. Twelve cities, each with its own marketplace.

## Routes

| Route | What it is |
|---|---|
| `/login` | Role picker, city picker, one-tap demo accounts |
| `/` | Search-first home (customers) or the job feed (workers) |
| `/search` | Categories → services → workers who do that exact service |
| `/worker/[id]` | Public profile: facts and reviews, no scores |
| `/worker/onboarding` | Conversational sign-up — the AI asks, never assumes |
| `/verify` | Aadhaar verification (simulated, KYC-ready) |
| `/book` | Seven-step booking request |
| `/job/[id]` | Contact Hub, live map, payment, cancellation, SOS, chat |
| `/hire` | Bulk and recurring-shift hiring for societies and businesses |
| `/earnings` | Worker earnings across seven time ranges |
| `/jobs`, `/me` | Bookings, profile, saved places, payment method, logout |
| `/trust` | Trust & Safety centre |
| `/join`, `/qr` | QR onboarding landing page and printable poster |

## Architecture

```
app/                 Next.js App Router pages (client components)
  layout.tsx         providers, no-flash theme script
  not-found.tsx      404 — a server component with no dependencies
  error.tsx          error boundary with a recovery action
components/
  store.tsx          the "API" — every read and write goes through here
  aurora.tsx         motion + surface library
  kit.tsx            shell, top bar, voice field, empty states
  contact.tsx        the Contact Hub a confirmed booking opens on
  map.tsx            OpenStreetMap tiles, no SDK and no API key
  chart.tsx          the earnings chart
  panels.tsx         desktop context panels
  city.tsx           city and locality picker
lib/
  types.ts           domain model — becomes the DB schema unchanged
  cities.ts          12 cities, 78 localities, deterministic scatter
  catalog.ts         13 categories → 47 services
  i18n*.ts           ten languages, completeness enforced by the compiler
  earnings.ts        pure earnings maths
  shifts.ts          recurring rotas
  payments.ts        Razorpay-shaped state machine
  cancellation.ts    the published fee schedule
  verify.ts          Verhoeff checksum; stores last 4 digits only
  tiles.ts           slippy-map projection
  seed.ts            113 workers, 85 jobs, a year of history
  selftest.ts        npm test
  ai/                profile, request, pricing, matching
```

Two rules keep phase 2 cheap:

1. **Every AI function is already `async` and returns a typed object.** Swapping
   a rule-based body for `await fetch('/api/…')` changes nothing upstream.
2. **Every read and write goes through `components/store.tsx`.** Moving from
   localStorage to Postgres means rewriting one file.

## Decisions worth defending

- **Ten languages, enforced by the type system.** The dictionary is
  `Record<Key, string>` — not `Partial` — so a missing translation is a build
  error, not a screen that silently falls back to English. 3,180 strings.
- **The AI asks instead of assuming.** A worker who says only *"I am an
  electrician"* is asked how many years, which services, which languages.
  `experienceYears` is `number | null`; unstated renders as `—`, never a
  number the product invented.
- **Strict trade matching.** An electrician is never shown a cooking job — the
  rule lives in one function and is pinned by tests.
- **Real distances.** Every worker and job is scattered deterministically
  inside its locality, so nothing is ever "0 m away".
- **No API keys anywhere.** Map tiles are plain image requests. Calling,
  WhatsApp and navigation are deep links. There is no key to leak.
- **Aadhaar: last four digits only.** Full numbers go to the KYC provider and
  are discarded. Asserted in the test suite.
- **No gamification.** No points, tiers, streaks or leaderboards. A worker is
  facts and reviews.
- **The phone is the base layer.** Desktop is built on top at 1024/1440/1920,
  never at the phone's expense.

## Verification

`npm test` covers the logic layer end to end — 223 assertions including the
regressions that have actually happened: overnight shifts costed as negative
hours, workers at exactly zero distance, an AI inventing years of experience,
the prerender crash that broke a deploy.

`npm run ssr` renders all 16 routes through `react-dom/server` — the same
operation a production build performs — because a route that works in `npm run
dev` can still fail the build, and that failure is invisible until you deploy.

## Deploying

See **[DEPLOY.md](./DEPLOY.md)** and **[PUSH.md](./PUSH.md)**.
