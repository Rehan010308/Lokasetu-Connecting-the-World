# LokaSetu — AI-powered hyperlocal employment platform

> लोक सेतु — "the bridge of people". Connects India's informal workforce
> (electricians, plumbers, carpenters, painters, house help, cooks, barbers,
> raddiwalas, shop assistants) with residents in the same neighbourhood —
> by **voice**, in **ten languages**, with **no forms to fill**.

**Current build: v4.1** — 12 cities, dedicated desktop layouts, live tracking,
recurring shifts, an earnings dashboard, and a Trust & Safety centre.

```bash
npm install
npm run dev      # http://localhost:3000
npm test         # 204 assertions
npm run doctor   # detect leftover files from an older unzip
```

**Demo accounts** — OTP is always `123456`:

| Role | Phone |
|---|---|
| Worker | 9000000001 |
| Customer | 9000000002 |
| Society | 9000000003 |
| Business | 9000000004 |

## Run it

```bash
npm install
npm run dev          # http://localhost:3000
npm run test         # self-test of the whole logic layer
npm run build        # production build
```

No database, no API keys, no external services needed. Demo data lives in the
browser's localStorage. "Reset demo" on the home page restores it.

## Try the full loop in 3 minutes

1. **Home →** pick a language (the whole app switches).
2. **"I am looking for work"** → language → phone `9876543210` → OTP `123456`
   → tap the mic and say *"I do electrical wiring, fan installation and
   inverter repairs, six years experience"* (or type it) → confirm the
   auto-generated profile → pick your area + radius → availability → done.
   You now see ranked jobs near you with match scores.
3. Open a job → **send a price**.
4. **New tab → "I need someone for a job"** → sign in with `9000000001`
   (the demo resident, OTP `123456`) → open *"Ceiling fan is making noise"* →
   your quote is there → **Hire** → chat (messages auto-translate between the
   two languages) → mark done → confirm → rate with three taps.
5. **/scrap** — upload any photo, get materials + value, call a collector.
6. **/insights** — demand vs supply per trade and per locality.
7. **/qr** — the printable poster workers scan to sign up.

## Routes

| Route | What it is |
|---|---|
| `/login` | Role picker + one-tap demo accounts |
| `/` | Search-first home (clients) or job feed (workers) |
| `/search` | Categories → services → workers who do that exact service |
| `/worker/[id]` | Public profile: facts and reviews, no scores |
| `/worker/onboarding` | Conversational AI sign-up |
| `/verify` | Aadhaar verification (simulated, KYC-ready) |
| `/post` | Job posting — the AI asks instead of assuming |
| `/job/[id]` | Live job: call, WhatsApp, Maps, SOS, chat, payment, review |
| `/hire` | Bulk hiring for societies and businesses |
| `/jobs`, `/me` | My jobs, profile and settings |
| `/join`, `/qr` | QR onboarding landing page and printable poster |

## Demo accounts

No registration needed — one tap on `/login`:

| Role | Who | Phone |
|---|---|---|
| Worker | Ramesh Kumar, electrician, Aadhaar verified | 9000000001 |
| Resident | Priya Menon | 9000000002 |
| Society | Anil Sharma, Green Valley Apartments | 9000000003 |
| Business | Rakesh Sharma, Sharma Kirana Store | 9000000004 |

OTP is always **123456**.

## Architecture

```
app/                 Next.js App Router pages (all client components)
components/
  aurora.tsx         Aurora motion + surface component library
  theme.tsx          adaptive dark mode, no flash on first paint
  store.tsx          the "API" — every read/write goes through here
  ui.tsx             design-system components
  voice.tsx          Web Speech API capture with typing fallback
  phone.tsx          phone + OTP step
  chat.tsx           auto-translating conversation
lib/
  types.ts           domain model (becomes your DB schema)
  geo.ts             haversine distance + hyperlocal priority bands
  i18n.ts            en / hi / ta / te / ml / kn dictionaries
  seed.ts            14 workers, 2 residents, 3 open jobs
  tiers.ts           trust tiers, streaks, endorsements, leaderboard, ETA
  activity.ts        deterministic live-activity feed
  selftest.ts        npm run test
  ai/
    taxonomy.ts      trades, multilingual keywords, rate card
    profile.ts       #1 #2  voice → skills, experience, category
    jobs.ts          #3     request → category, urgency, duration
    pricing.ts       #6     fair price range
    matching.ts      #4 #5  explainable worker ranking
    translate.ts     #4     multilingual chat
    trust.ts         #7     three-dimension reputation score
    scrap.ts         #8     scrap material recognition
```

Two rules make phase 2 painless:

1. **Every AI function is already `async` and returns a typed object.**
   Replacing a rule-based body with `await fetch('/api/...')` changes nothing
   upstream.
2. **Every read and write goes through `components/store.tsx`.** Moving from
   localStorage to Postgres means rewriting that one file.

## The AI layer

| # | Feature | Now (phase 1) | Phase 2 |
|---|---|---|---|
| 1 | Voice → profile | Web Speech API + keyword extraction | Whisper/Sarvam STT + Claude |
| 2 | Skill extraction | multilingual keyword taxonomy | Claude structured output |
| 3 | Job understanding | keyword + urgency detection | Claude structured output |
| 4 | Translation | 24-phrase book × 6 languages | Claude, phrase book as cache |
| 5 | Hyperlocal ranking | explainable weighted score | + semantic skill similarity |
| 6 | Fair pricing | transparent rate card | Claude over real job history |
| 7 | Trust scoring | 3 yes/no → 3 dimensions | + review-text sentiment |
| 8 | Scrap recognition | deterministic from file | Claude vision |
| 9 | Demand analytics | live aggregation | forecasting + alerts |

The ranking score is deliberately *explainable* — each worker card can show
exactly why it ranked where it did. In a trust-critical marketplace that beats
a black box.

## Deploying

See **[DEPLOY.md](./DEPLOY.md)** — GitHub, then Vercel, step by step.

## Design decisions worth defending

- **Voice-first, not voice-optional.** The mic is the primary control on the
  profile screen; typing is the fallback, not the default.
- **Six languages everywhere**, including the seeded workers' own words.
- **The worker sets the radius**, so nobody is shown a job they cannot reach.
- **Three yes/no questions instead of star ratings** — a worker who is skilled
  but occasionally late shows up as exactly that, not as "4.1 stars".
- **Price is a range with a stated basis**, so neither side is negotiating
  blind.
- **QR onboarding** because the hardest step for this user is *finding* the
  platform at all.
