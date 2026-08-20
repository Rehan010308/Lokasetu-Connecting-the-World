# Rollback

Three ways back, cheapest first. Try them in order — the first one is almost
always enough.

## Level 1 — turn Supabase off (10 seconds, no code change)

The Supabase integration is inert unless two environment variables are present.
Remove them and the app is byte-for-byte the product it was before.

**On Vercel**

1. Project → **Settings** → **Environment Variables**
2. Delete `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. **Deployments** → most recent → **⋯** → **Redeploy**

**Locally**

```powershell
Remove-Item .env.local
npm run dev
```

The app reverts to per-browser localStorage. Nothing else changes. No data on
the device is lost.

## Level 2 — the pre-Supabase code

A tag and a branch were created before any Supabase work began.

```powershell
git checkout v4.2.0-stable          # the tag
git checkout backup/pre-supabase-v4.2.0   # the branch
```

To make that the live version on GitHub and Vercel:

```powershell
git checkout -B main v4.2.0-stable
git push --force origin main
```

Vercel redeploys automatically.

## Level 3 — the archive

`lokasetu-ROLLBACK-v4.2.0.zip` was delivered before the migration started.
Extract it anywhere and you are exactly where you were, including git history.

```powershell
cd ~\Downloads
Expand-Archive lokasetu-ROLLBACK-v4.2.0.zip -DestinationPath .\rollback
cd rollback\lokasetu
npm install
npm run dev
```

## Clearing the Supabase data without touching the app

Supabase SQL Editor:

```sql
truncate table sos_events, reviews, messages, bookings, jobs,
               verification_status, residents, workers cascade;
```

Tables and policies survive; only the rows go.

## Deleting the Supabase project entirely

Project Settings → General → scroll to the bottom → **Delete project**. Then do
Level 1 so the app stops pointing at something that no longer exists.

## How to tell which mode you are in

Open the app and check the browser console:

- silence → either not configured, or configured and working
- `[supabase] …` warnings → configured, a query failed, running on local data

Or check `lib/supabase/env.ts` logic directly: if `NEXT_PUBLIC_SUPABASE_URL` is
absent, you are in local mode.
