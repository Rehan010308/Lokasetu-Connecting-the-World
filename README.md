# LokaSetu — connecting the world of work

A hyperlocal work network for India. Employers post work, workers post what they
are available for, the two sides connect — and then they **agree on a price
together, in the open, before anything starts**.

**Current build: v5.1.1**

Built on Next.js 15 (App Router), React 19 and Supabase. Ten languages. No
utility CSS framework — the design system is one hand-written stylesheet.

---

## What is actually wired

| Feature | Screen | Table |
|---|---|---|
| Email + password sign up, sign in, sign out | `/login` | `auth.users` |
| Profiles: read, edit, public page | `/me`, `/profile/[username]` | `public.profiles` |
| Community feed: create, read, filter, delete | `/feed`, `/post/new` | `public.posts` |
| Connections: send, accept, decline, remove | `/network` | `public.connections` |
| **Rapido-style price negotiation** | `/post/[id]`, `/offers` | `public.offers` |
| Earnings, from accepted offers only | `/earnings` | `public.offers` |

Nothing is stubbed. There is no mock data layer and no `// TODO` waiting to be
filled in: every screen reads and writes the real database through
`lib/queries.ts`.

---

## 1. Set up in PowerShell

Run these from the project folder.

### 1.1 Create the environment file

```powershell
cd ~\Downloads\lokasetu
Copy-Item .env.example .env.local
notepad .env.local
```

Paste your two values from **Supabase → Project Settings → API**, save, close:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9....
```

Or write it in one go without opening an editor — replace the two values first:

```powershell
@"
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-public-key
"@ | Set-Content -Encoding utf8 .env.local
```

> `.env.local` is already in `.gitignore`. Check with `git status` — if it shows
> up in the list, stop and tell me.
>
> **Never put the `service_role` key in this file.** It bypasses every security
> policy in the database. Only the two `NEXT_PUBLIC_` values above belong here.

### 1.2 Install dependencies

```powershell
npm install
```

That is enough — every package is already declared in `package.json`. If you
would rather name them explicitly, this is the equivalent (the quotes matter in
PowerShell):

```powershell
npm install "@supabase/supabase-js@^2.47.10" "@supabase/ssr@^0.5.2" "lucide-react@^0.469.0"
```

### 1.3 Run it

```powershell
npm run dev
```

Open <http://localhost:3000>.

### 1.4 Verify before you deploy

```powershell
npm run verify
npm run build
```

- `npm run verify` — TypeScript, then 213 assertions over the negotiation
  rules, the connection state machine, the normalisers, the formatters and all
  ten languages.
- `npm run build` — the real production build. If it succeeds locally, the
  Vercel build succeeds.

Two extra tools ship with the project:

- `npm run ssr` renders every route through `react-dom/server` — the same
  operation the production build performs — which catches a crash that only
  happens during prerendering.
- `npm run preview` writes `preview.html` and `preview-dark.html`: the real
  components with real props and the real stylesheet, in one page you can open
  in a browser to review the design without a dev server.

### 1.5 Push to GitHub, which redeploys Vercel

```powershell
cd ~\Downloads\lokasetu
git add -A
git commit -m "LokaSetu v5.0.0 - Supabase auth, feed, connections and price negotiation"
git branch -M main
git push -u origin main
```

If git says `fatal: 'origin' does not appear to be a git repository`:

```powershell
git remote add origin https://github.com/Rehan010308/Lokasetu-Connecting-the-World.git
git push -u origin main
```

If it says `remote origin already exists` but points somewhere wrong:

```powershell
git remote set-url origin https://github.com/Rehan010308/Lokasetu-Connecting-the-World.git
git push -u origin main
```

If GitHub rejects the push because the histories differ, and you are certain
this local copy is the one you want to keep:

```powershell
git push --force origin main
```

---

## 2. Supabase

The four tables (`profiles`, `posts`, `connections`, `offers`) are the schema
you already ran. **`supabase/schema.sql` is safe to run on top of it** — every
statement is idempotent. It adds the columns the features need, switches on Row
Level Security with real policies, installs the triggers that enforce the rules,
and turns on realtime.

Full walkthrough, click by click: **[SUPABASE.md](./SUPABASE.md)**.

The three things people miss:

1. Run `supabase/schema.sql` in the SQL Editor. Without it, Row Level Security
   is off and there is no trigger creating a profile when someone signs up.
2. **Authentication → Sign In / Providers → Email → turn "Confirm email" off.**
   Otherwise a new account cannot sign in until it clicks a link in an email.
3. On Vercel, environment variables only apply to builds that happen *after*
   you add them. Add both, then redeploy.

---

## 3. Demo accounts

One tap on `/login` — no sign-up, no email confirmation, no seeding step.

| Role | Email | Password |
|---|---|---|
| Employer — Priya Menon | `employer@lokasetu.com` | `DemoPass123!` |
| Worker — Ramesh Kumar | `worker@lokasetu.com` | `DemoPass123!` |

The quick-login button is self-healing: it tries to sign in, and if the account
does not exist in *your* Supabase project yet, it creates it, signs in, and
seeds a few posts and one live negotiation. So the demo works on a database you
provisioned five minutes ago.

These are public credentials for a public demo. They are not a back door: they
go through the same `signInWithPassword` call as anybody else and are bound by
exactly the same policies.

### The two-minute tour

1. Sign in as the **employer** in one browser. The feed already has three jobs.
2. Open the electrical job. There is a pending offer at ₹900 — **you cannot
   accept it, because you are the one who named that number.**
3. Sign in as the **worker** in a private window. Open **Offers**. The ₹900 is
   waiting for an answer: accept it, or counter at ₹1,400.
4. Counter. Watch the employer's screen — it updates without a refresh.
5. Accept from the employer side, then open **Earnings** as the worker. The
   money is there, because earnings are nothing but accepted offers added up.

---

## 4. How the negotiation works

An offer is one row that both sides edit, not a thread of messages.

```
employer proposes ₹900        status = pending    last_actor = employer
  worker counters ₹1400       status = countered  last_actor = worker   round 2
    employer counters ₹1100   status = countered  last_actor = employer round 3
      worker accepts          status = accepted   — frozen
```

Three rules, and all three are enforced **in the database**, not in React:

- **Nobody accepts their own number.** `guard_offer_update` refuses when
  `auth.uid()` equals the `last_actor` who set the current price.
- **Changing the price is a counter-offer.** You cannot quietly edit the amount
  and leave the status alone.
- **A settled offer stays settled.** Accepted or declined is terminal.

`lib/model.ts` mirrors these rules so the UI can grey out a button instead of
letting someone press it and read a Postgres error. The database is still the
authority — if the two ever disagree, the database wins and the person sees the
message.

---

## 5. Security

Your rules, and the line that enforces each one:

| Rule | Where it is enforced |
|---|---|
| Never hardcode API keys | `utils/supabase/config.ts` reads `process.env` and nothing else. No key appears in any source file. |
| No secret key in the browser | The `service_role` key is not read anywhere in this repository. Only the `anon` key ships, which is designed to be public. |
| Passwords are never stored in plaintext | The app never stores a password at all. Supabase Auth holds a bcrypt hash; the app only ever calls `signInWithPassword`. |
| Users cannot change their role from the frontend | Three layers: `role` is absent from `ProfilePatch`, so it is never sent; the update call does not include it; and `freeze_profile_role` raises an exception if it ever arrives. |
| Proper database security, not client-side checks | Row Level Security is on for all four tables, with policies written against `auth.uid()`. There is no anonymous write anywhere. |
| Do not expose unnecessary personal information | Connections and offers are readable only by the two people involved. Nobody can enumerate somebody else's network or see a price they are not party to. |
| Do not expose private phone numbers | There is no phone column. It was left out on purpose — a public directory with a phone number in it is a leak waiting to happen. |
| Use environment variables | Both values come from `.env.local` locally and from Vercel's environment variables in production. |

---

## 6. The code

```
app/
  layout.tsx              providers, metadata, no-flash theme script
  page.tsx                landing — a Server Component that redirects if signed in
  login/                  sign in, sign up, demo quick-login
  feed/                   the community feed, filtered by type and category
  post/new/               composer for a job or an update
  post/[id]/              one post, its offers, and the propose-a-price control
  network/                discover people, answer requests, see connections
  offers/                 every negotiation, grouped by whose move it is
  profile/[username]/     public profile
  me/                     edit your own profile, language, theme, sign out
  earnings/               accepted offers, summed and charted
  not-found / error / global-error
components/
  providers.tsx           theme, language, toasts, session — all SSR-safe
  data.tsx                the data hooks, each with its own realtime subscription
  shell.tsx               sidebar on desktop, tab bar on a phone
  ui.tsx                  Button, Card, Badge, Avatar, Skeleton, Modal, Segment…
  offer.tsx               the negotiation card and the price form
  post-card.tsx           one post in the feed
  person-row.tsx          one person, plus the right connection control
  guard.tsx               the signed-out gate and the setup notice
  icons.tsx               every icon, imported once
lib/
  database.types.ts       one type per column in schema.sql
  model.ts                joined shapes, normalisers, and the rules — all pure
  queries.ts              every read and write; nothing throws
  errors.ts               Postgres codes translated into English
  i18n.ts                 ten languages, completeness enforced by the compiler
  format.ts               rupees, relative time, amount parsing
  catalog.ts              15 categories, 12 cities
  demo.ts / demo-accounts.ts
  selftest.ts             npm test
utils/supabase/
  config.ts               the two public values, with build-safe fallbacks
  client.ts               createBrowserClient — one instance per tab
  server.ts               createServerClient for Server Components
  middleware.ts           session refresh on every request
supabase/
  schema.sql              tables, columns, RLS, triggers, indexes, realtime
  seed.sql                optional demo content
middleware.ts             keeps the session alive
```

Two properties hold everywhere:

1. **Nothing in `lib/queries.ts` throws.** Every call returns
   `{ data, error }` where `error` is a sentence a person can read. A dropped
   connection is a message on screen, never a white page.
2. **Everything in `lib/model.ts` is pure.** No network, no React, no browser.
   That is why the negotiation rules can be asserted directly instead of
   clicked through.

---

## 7. Decisions worth defending

- **Ten languages, enforced by the type system.** Each string holds all ten
  translations in one entry, and `satisfies Record<string, Entry>` means a
  missing language is a build error rather than a screen that quietly falls back
  to English.
- **The rules live in the database.** Anything enforced only in React is a
  suggestion. `supabase/schema.sql` has the triggers.
- **The role is chosen once.** At sign-up, and frozen. There is no path from the
  UI to change it, and the database would refuse anyway.
- **No phone numbers.** Not a column, not a field, not a leak.
- **Earnings are derived, never stored.** They are the sum of accepted offers.
  If nothing has been accepted, the screen says so instead of drawing a chart of
  imaginary money.
- **Desktop is a different layout, not a stretched phone.** A persistent rail
  with live counts at 1024px and up; a bottom tab bar below that.
- **No animation library.** Every transition is CSS. The bundle is smaller and
  there is no third-party frame clock to crash inside.

---

## 8. Deploying to Vercel

1. Push to GitHub (§1.5). Vercel picks it up automatically.
2. **Settings → Environment Variables** → add `NEXT_PUBLIC_SUPABASE_URL` and
   `NEXT_PUBLIC_SUPABASE_ANON_KEY`, ticking **Production**, **Preview** and
   **Development**.
3. **Deployments → the most recent → ⋯ → Redeploy.**

Build command, output directory and install command all stay on their defaults.
Nothing else needs changing.

If the environment variables are missing, the site still builds and still
loads — it shows a setup notice instead of crashing. That is deliberate: a
missing variable should never be a white screen.
