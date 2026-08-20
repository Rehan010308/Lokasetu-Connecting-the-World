# Supabase, click by click

Written for someone who has not administered Supabase before. Every step names
the exact page, the exact button and the exact text to paste. About fifteen
minutes.

Your four tables — `profiles`, `posts`, `connections`, `offers` — already exist.
Nothing here drops or recreates them.

---

## 1. Run the schema

The DDL you ran created the tables. It did **not** switch on Row Level
Security, and it did not create the trigger that gives each new user a profile
row. Without both, the app signs someone up and then has a user with nothing
attached — the single most common way a Supabase app breaks on day one.

1. Open <https://supabase.com/dashboard> and click your project.
2. Left sidebar → **SQL Editor** (the `>_` icon).
3. Click **+ New query**.
4. Open `supabase/schema.sql` from this project, select all of it (Ctrl+A),
   copy.
5. Paste into the editor.
6. Click **Run** (bottom right, or Ctrl+Enter).

You should see **Success. No rows returned.** That is what success looks like:
the script creates things, it does not select anything.

**It is safe to run more than once.** Tables use `CREATE TABLE IF NOT EXISTS`
with exactly the DDL you already ran, new columns use `ADD COLUMN IF NOT
EXISTS`, and every policy and trigger is dropped before it is created.

### Check it worked

In the same editor, run this:

```sql
select tablename, rowsecurity
  from pg_tables
 where schemaname = 'public'
 order by 1;
```

You must see all four tables with `rowsecurity = true`:

```
connections   true
offers        true
posts         true
profiles      true
```

If any says `false`, the script did not finish. Scroll up in the editor for a
red error, fix it, and run the whole file again.

Then check the triggers landed:

```sql
select trigger_name, event_object_table
  from information_schema.triggers
 where trigger_schema in ('public', 'auth')
 order by 2, 1;
```

You are looking for `on_auth_user_created` on `users`, `profiles_freeze_role`
on `profiles`, and `offers_guard_update` on `offers`.

---

## 2. Turn off email confirmation

**Do this or the demo accounts will not work.** By default Supabase makes a new
account confirm its email address before it can sign in. For a demo, that means
the quick-login button creates an account and then cannot use it.

1. Sidebar → **Authentication**.
2. **Sign In / Providers** (older dashboards call this **Providers**).
3. Click **Email**.
4. Turn **Confirm email** **off**.
5. **Save**.

You can turn it back on before real users arrive. Nothing in the app depends on
it being off except the convenience of instant sign-up.

---

## 3. Find your two keys

1. Sidebar → **Project Settings** (gear icon, bottom left) → **API**.
2. You need two values from this page:

| Field on the page | What it is | Safe in a browser? |
|---|---|---|
| **Project URL** | `https://xxxxx.supabase.co` | Yes |
| **Project API keys → `anon` `public`** | a long `eyJ…` string | **Yes** — designed to be public, and limited by Row Level Security |
| **Project API keys → `service_role` `secret`** | another long `eyJ…` string | **NO. NEVER.** |

**The `service_role` key bypasses Row Level Security completely.** Anyone
holding it can read and delete your entire database. This app never uses it, it
appears in no file here, and it must never be pasted into your code, into a
`NEXT_PUBLIC_*` variable, or into a chat window. If you ever paste it somewhere
by accident, click **Reset** next to it on that page immediately.

---

## 4. Local environment file

In the project root, next to `package.json`, create a file called exactly
**`.env.local`**:

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9....
```

No quotes, no spaces around `=`. Then:

```powershell
npm install
npm run dev
```

Environment variables are read when the dev server starts. If you edit
`.env.local` while it is running, stop it (Ctrl+C) and start it again.

---

## 5. Confirm realtime is on

The schema already added the tables to the realtime publication. Confirm it,
because this is the single most common reason "realtime isn't working":

1. Sidebar → **Database** → **Publications**.
2. Click **supabase_realtime**.
3. `profiles`, `posts`, `connections` and `offers` should all be **on**.
4. If any is off, switch it on.

`schema.sql` also sets `replica identity full` on those tables. Without it,
realtime fires but the payload is missing the columns the UI needs — the event
arrives and nothing changes on screen.

---

## 6. Prove it works, with two browsers

The whole point is data shared between people, so test it with two sessions.

### Sign-up creates a profile
1. Open <http://localhost:3000/login>.
2. Press **Demo employer**. You should land on the feed with three jobs.
3. In Supabase → **Table Editor** → **profiles**. There is a row with
   `username = lokasetu_employer` and `role = employer`.

### A negotiation cannot be gamed
1. Still as the employer, open **Offers**. There is a ₹900 offer, pending.
2. The **Accept** button is disabled, and the card says *"You named this price.
   Waiting for them."* That is not a UI trick — try it from the SQL editor:

```sql
-- as the employer, accepting their own price
update public.offers set status = 'accepted' where id = <the id>;
```

   From the SQL editor this succeeds, because the SQL editor runs as the
   database owner and bypasses RLS. From the app, signed in as the employer, it
   raises `the side that proposed this price cannot also accept it`.

### Realtime
1. Open a private window, go to `/login`, press **Demo worker**.
2. Put the two windows side by side. Worker → **Offers** → **Counter** → 1400.
3. The employer's screen updates without a refresh.

### Earnings are real
1. As the employer, accept the ₹1,400.
2. As the worker, open **Earnings**. ₹1,400, one job. That number is the sum of
   accepted offers and nothing else.

### Count the rows
```sql
select
  (select count(*) from profiles)    as profiles,
  (select count(*) from posts)       as posts,
  (select count(*) from connections) as connections,
  (select count(*) from offers)      as offers;
```

---

## 7. Vercel

1. <https://vercel.com> → your **Lokasetu** project.
2. **Settings** → **Environment Variables**.
3. Add the first:
   - **Key:** `NEXT_PUBLIC_SUPABASE_URL`
   - **Value:** your project URL
   - **Environments:** tick **Production**, **Preview** and **Development**
   - **Save**
4. Add `NEXT_PUBLIC_SUPABASE_ANON_KEY` the same way.
5. **Deployments** → the most recent → **⋯** → **Redeploy**.

**Environment variables only apply to builds that happen after you add them.**
Adding a variable does not change the running site. You must redeploy. This is
the most common Vercel mistake.

Nothing else in Vercel needs changing — build command, output directory and
install command all stay on their defaults.

---

## 8. When something is wrong

| What you see | Why | Fix |
|---|---|---|
| "Supabase is not connected yet" banner | The two variables are missing or misspelt | Check `.env.local` spelling exactly, restart `npm run dev` |
| `The database tables are missing. Run supabase/schema.sql…` | The schema has not been applied to *this* project | Step 1 |
| `permission denied for table …` | RLS is on with no matching policy | Re-run `schema.sql` — it creates the policies |
| Sign-up works, then the profile is empty | `on_auth_user_created` is missing | Re-run `schema.sql`; it also backfills existing users |
| `This account still needs email confirmation` | Confirm email is on | Step 2 |
| `That email and password do not match an account` | Wrong password, or the account is in a different Supabase project | Check you are pointed at the project you think you are |
| Realtime never fires | Tables not in the publication | Step 5 |
| Realtime fires but nothing updates | `replica identity` not set | Re-run `schema.sql` |
| Works locally, not on Vercel | Variables added but not redeployed | Step 7.5 |
| Works in production, not in a preview deploy | Variables set for Production only | Tick Preview and Development too |
| `Invalid API key` | The JWT was copied from the wrong row | Use `anon` `public`, not `service_role` |
| `.env.local` shows up in `git status` | It was force-added at some point | Reset the key in Supabase immediately, then remove the file from git history |

---

## 9. What the database enforces, and where

| Rule | Enforced by |
|---|---|
| A role cannot be changed after sign-up | `freeze_profile_role` trigger on `profiles` |
| Nobody accepts their own price | `guard_offer_update` — compares `auth.uid()` to `last_actor` |
| Changing a price is a counter-offer, not a silent edit | `guard_offer_update` |
| A settled offer stays settled | `guard_offer_update` |
| An offer cannot be moved to a different post or person | `guard_offer_update` |
| Only the receiver answers a connection request | `guard_connection_update` |
| You can only write rows that are yours | RLS policies on all four tables |
| A negotiation is private to its two parties | `offers: readable by the two parties` |
| A network is private to its owner | `connections: readable by the two parties` |
| Every new user gets a profile | `on_auth_user_created` trigger on `auth.users` |
| A price is a positive number under a crore | `offers_price_positive` check constraint |
| Nobody connects to themselves | `connections_not_self` check constraint |

---

## 10. Cost

The free tier covers this workload indefinitely: 500MB of database, 2GB of
bandwidth, 200 concurrent realtime connections.

Supabase pauses a free project after **seven days with no activity**. One visit
un-pauses it, but the first request after a pause is slow. If you are demoing
after a quiet week, open the app once an hour beforehand.

---

## 11. Backing out

**Turn Supabase off (ten seconds).** Delete both `NEXT_PUBLIC_SUPABASE_*`
variables from Vercel and redeploy, or delete `.env.local` locally. The app
still builds and still loads; it shows a setup notice instead of data.

**Clear the data, keep the schema:**

```sql
truncate table public.offers, public.connections, public.posts restart identity cascade;
delete from public.profiles;
-- profiles cascade from auth.users, so to remove the accounts too:
-- Authentication -> Users -> select -> Delete
```

**Start over completely.** Project Settings → General → scroll to the bottom →
**Delete project**. Then create a new one and come back to step 1.
