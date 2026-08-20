# Supabase setup — start to finish

Written for someone who has never used Supabase. Every step names the exact
page, the exact button, and the exact text to paste. Roughly 20 minutes.

**Before you start, know this:** the app works *without* Supabase. If you skip
this entire document, LokaSetu still runs exactly as it does today, storing data
in each browser. Supabase is what makes data **shared across users and devices**.
If anything here goes wrong, [rolling back](#18-rollback) is deleting two
environment variables.

---

## 1. Create the account and project

1. Go to **https://supabase.com** → **Start your project** → sign in with GitHub.
2. On the dashboard, click **New project**.
3. Fill in:
   - **Name:** `lokasetu`
   - **Database Password:** click **Generate a password**, then **copy it into a
     text file and save it.** You will not be shown it again. You do not need it
     for this app, but you need it to ever open the database directly.
   - **Region:** **South Asia (Mumbai)** — closest to your users, so every query
     is faster.
4. **Plan: Free.** It gives 500MB of database, 2GB of bandwidth and 200
   concurrent realtime connections. That is far beyond a demo or a hackathon.
   Do not pay for anything.
5. Click **Create new project** and wait ~2 minutes while it provisions.

---

## 2. Create the tables

1. In the left sidebar click **SQL Editor** (icon looks like `>_`).
2. Click **+ New query**.
3. Open `supabase/schema.sql` from this project. Select **all** of it
   (Ctrl+A) and copy it.
4. Paste into the SQL editor.
5. Click **Run** (bottom right, or Ctrl+Enter).

You should see **Success. No rows returned.** That is what success looks like —
the script creates things, it does not select anything.

**Verify it worked.** In the same editor, run:

```sql
select table_name from information_schema.tables
 where table_schema = 'public' order by 1;
```

You must see exactly these nine:

```
bookings
jobs
messages
residents
reviews
sos_events
verification_status
workers
workers_public
```

If any are missing, the script did not finish — scroll up in the editor for a
red error, fix it, and run the whole file again. It is safe to re-run.

---

## 3. Turn on Realtime

The SQL in step 2 already added the tables to the realtime publication. Confirm
it, because this is the single most common reason "realtime isn't working":

1. Sidebar → **Database** → **Publications**.
2. Click **supabase_realtime**.
3. You should see **jobs, bookings, messages, sos_events, reviews** with their
   toggles **on**.
4. If any is off, switch it on.

---

## 4. Find your keys

1. Sidebar → **Project Settings** (gear icon, bottom left) → **API**.
2. You need two values from this page:

| Field on the page | What it is | Safe in the browser? |
|---|---|---|
| **Project URL** | `https://xxxxx.supabase.co` | Yes |
| **Project API keys → `anon` `public`** | a long `eyJ...` string | **Yes** — it is designed to be public and is limited by Row Level Security |
| **Project API keys → `service_role` `secret`** | another long string | **NO. NEVER.** |

**The service_role key bypasses Row Level Security completely.** Anyone who has
it can read and delete your entire database. This app never uses it, it is not
in any file here, and you must never paste it into your code, into Vercel's
`NEXT_PUBLIC_*` variables, or into a chat window. If you ever do by accident,
click **Reset** next to it on that page immediately.

---

## 5. Local environment file

In the project root (next to `package.json`), create a file called exactly
**`.env.local`**:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9....
```

Replace both values with yours from step 4. No quotes, no spaces around `=`.

`.env.local` is already in `.gitignore`, so it will never be committed. Confirm
with `git status` — if `.env.local` appears in the list, stop and tell me.

---

## 6. Install the package

```powershell
npm install @supabase/supabase-js
```

That is the only new dependency.

---

## 7. Run it locally

```powershell
npm run dev
```

Open http://localhost:3000. Then open the browser console (F12).

- **Nothing about Supabase in the console** → connected. Data is now shared.
- **`[supabase] fetchAll — ...`** → connected but a query failed. The message
  names the problem; the app has fallen back to local data and still works.

---

## 8. Seed the shared database

Your Supabase tables are empty. The demo data currently lives in each browser.
To push it up once, so every device sees the same world:

1. Sign in to the app as any demo account.
2. Open the browser console and run:

```js
JSON.parse(localStorage.getItem('lokasetu:v2')).db.workers.length
```

If that prints a number, your local data is intact.

3. Go to **Profile → Reset demo data**. With Supabase configured, the reseed
   writes to Supabase rather than only to the browser.

Alternatively, run `supabase/seed.sql` in the SQL editor for a minimal set of
demo rows.

---

## 9. Vercel environment variables

1. Go to **https://vercel.com** → your **Lokasetu** project.
2. **Settings** → **Environment Variables**.
3. Add the first:
   - **Key:** `NEXT_PUBLIC_SUPABASE_URL`
   - **Value:** your project URL
   - **Environments:** tick **Production**, **Preview** and **Development**
   - **Save**
4. Add the second the same way:
   - **Key:** `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **Value:** your anon key
5. **Deployments** tab → the most recent one → **⋯** → **Redeploy**.

**Environment variables only apply to builds that happen after you add them.**
Adding a variable does not change the running site. You must redeploy. This is
the most common Vercel mistake.

---

## 10. Commands before deploying

```powershell
npm run verify      # typecheck + 233 assertions
npm run ssr         # renders every route server-side, as the build does
npm run build       # the real production build
```

If all three pass locally, the Vercel build will pass.

---

## 11. Vercel settings to change

None. Build command, output directory and install command all stay on their
defaults. The only change is the two environment variables in step 9.

---

## 12. Testing that it actually works

The whole point is data shared **across devices**, so test with two.

### Residents can post jobs
1. Phone (or a private window) → sign in as **customer** `9000000002`.
2. Book anything through to **Send Booking Request**.
3. In Supabase → **Table Editor** → **jobs**. Your job is the top row.

### Workers receive jobs instantly
1. Laptop → sign in as **worker** `9000000001`.
2. Leave the job feed open, **do not refresh**.
3. On the phone, send another booking request in a matching trade.
4. It appears in the worker's feed within a second or two.

### Booking updates sync instantly
1. On the worker device, open the job and press **Accept**.
2. The customer's screen switches to the Contact Hub without a refresh.

### Messages sync instantly
1. Open the same job on both devices.
2. Send a message from one. It appears on the other, no refresh.

### Verify the migration overall
In the SQL editor:

```sql
select
  (select count(*) from jobs)     as jobs,
  (select count(*) from bookings) as bookings,
  (select count(*) from messages) as messages,
  (select count(*) from workers)  as workers;
```

Numbers that grow as you use the app mean the migration is working.

---

## 13. Security — what is enforced, and where

Your rules, and the line that enforces each:

| Rule | Where it is enforced |
|---|---|
| Never hardcode keys | `lib/supabase/env.ts` reads `process.env` only. No key appears in any source file. |
| No secret key in the browser | The service_role key is not read anywhere in this codebase. |
| No plaintext passwords | There are no passwords. Sign-in is phone + OTP. |
| Role cannot be changed from the frontend | `freeze_role()` trigger on `residents`. The database raises an exception on any attempted change — the UI cannot override it. |
| Phone numbers not exposed | The app reads `workers_public`, a view with no `phone` column. |
| Aadhaar: last 4 digits only | `verification_status.id_last4` has `CHECK (id_last4 ~ '^[0-9]{4}$')`. A full number is rejected by the database. |
| Use environment variables | Both values come from `.env.local` / Vercel. |

**Before real users:** the RLS policies marked `-- DEMO ONLY` in `schema.sql`
allow anonymous writes, because the app has no real authentication yet. The
production policy is written directly beneath each one, commented out. Moving to
Supabase Auth means deleting the demo policy and uncommenting the other. Do not
launch to the public with the demo policies in place.

---

## 14. Common mistakes that break it on Vercel

| Symptom | Cause | Fix |
|---|---|---|
| Works locally, no shared data on Vercel | Env vars added but not redeployed | Redeploy (step 9.5) |
| Works locally, not on Vercel, no error | Variable set for Production only | Tick Preview and Development too |
| `Invalid API key` | Copied the JWT from the wrong row | Use the `anon` `public` key |
| Realtime never fires | Tables not in the publication | Step 3 |
| Realtime fires but the UI does not update | `replica identity` not set | Re-run `schema.sql`; it sets this |
| `permission denied for table` | RLS on with no matching policy | Re-run `schema.sql` |
| Env var not picked up locally | File named `.env` not `.env.local`, or dev server not restarted | Rename, then restart `npm run dev` |
| Secrets committed | `.env.local` was force-added | Reset the key in Supabase immediately, then remove the file from git history |

---

## 15. What "no Supabase" looks like

If the variables are absent or wrong, `isSupabaseConfigured()` returns false and:

- no network calls are made,
- the app uses localStorage exactly as before,
- nothing throws, and nothing is logged as an error.

This is by design. The migration cannot be the reason your site is down.

---

## 16. Costs

Free tier, indefinitely, for this workload. Supabase pauses a free project after
**7 days with no activity** — one visit un-pauses it. If you are demoing after a
quiet week, open the app once an hour beforehand.

---

## 17. Files this added

```
supabase/schema.sql          the database: tables, RLS, triggers, realtime
lib/supabase/env.ts          is it configured?
lib/supabase/client.ts       the lazily-created client
lib/supabase/types.ts        row types, mirroring schema.sql
lib/supabase/mappers.ts      row <-> domain, the only place that converts
lib/supabase/repo.ts         every read and write, plus realtime
components/store.tsx         wired to the above; unchanged when not configured
```

---

## 18. Rollback

Three levels, cheapest first.

**Level 1 — turn Supabase off (10 seconds).**
Vercel → Settings → Environment Variables → delete both `NEXT_PUBLIC_SUPABASE_*`
→ Redeploy. The app returns to localStorage. Nothing else changes. Locally,
delete `.env.local` and restart.

**Level 2 — go back to the pre-Supabase code.**

```powershell
git checkout v4.2.0-stable
```

Or the branch kept for exactly this:

```powershell
git checkout backup/pre-supabase-v4.2.0
```

To publish that state:

```powershell
git checkout -B main v4.2.0-stable
git push --force origin main
```

**Level 3 — the archive.** `lokasetu-ROLLBACK-v4.2.0.zip`, delivered before any
Supabase work began. Extract it and you are exactly where you were.

**Wipe the Supabase data without touching the app:**

```sql
truncate table sos_events, reviews, messages, bookings, jobs,
               verification_status, residents, workers cascade;
```
