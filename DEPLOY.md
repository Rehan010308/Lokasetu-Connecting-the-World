# Getting LokaSetu online

Two steps: **GitHub** (stores the code), then **Vercel** (runs it on a real
URL). Total time: about 10 minutes the first time.

---

## 0. Run it on your machine first

```bash
cd lokasetu
npm install
npm run dev
```

Open http://localhost:3000. If that works, deployment will work.

> Node 18.18+ is required (Node 20 or 22 recommended). Check with `node -v`.

---

## 1. Put the code on GitHub

### Option A — GitHub website (no CLI needed)

1. Go to https://github.com/new
2. Repository name: `lokasetu` · Private or Public · **do not** tick
   "Add a README" (the project already has one) · **Create repository**.
3. GitHub shows you a page with commands. In your terminal, inside the
   `lokasetu` folder, run:

```bash
git init
git add .
git commit -m "LokaSetu: hyperlocal employment platform (phase 1)"
git branch -M main
git remote add origin https://github.com/<your-username>/lokasetu.git
git push -u origin main
```

If git asks for a password, it wants a **Personal Access Token**, not your
account password: GitHub → Settings → Developer settings → Personal access
tokens → Tokens (classic) → Generate new token → tick `repo` → copy it and
paste it as the password.

### Option B — GitHub CLI (faster if you have it)

```bash
gh auth login          # once
gh repo create lokasetu --private --source=. --remote=origin --push
```

### Pushing later changes

```bash
git add .
git commit -m "what changed"
git push
```

---

## 2. Deploy to Vercel

### Option A — Import from GitHub (recommended)

1. Go to https://vercel.com and sign in **with GitHub**.
2. **Add New → Project**.
3. Find `lokasetu` in the list → **Import**.
4. Vercel auto-detects Next.js. Leave every setting at its default:
   - Framework Preset: **Next.js**
   - Build Command: `next build` (default)
   - Output Directory: default
   - Install Command: `npm install` (default)
   - Environment Variables: **none needed for phase 1**
5. **Deploy**. About 90 seconds later you get a live URL like
   `https://lokasetu.vercel.app`.

From then on, **every `git push` to `main` redeploys automatically**, and every
pull request gets its own preview URL.

### Option B — Vercel CLI

```bash
npm i -g vercel
vercel login
vercel          # preview deploy, answer the prompts with defaults
vercel --prod   # production deploy
```

---

## 3. After it is live

- Open `https://<your-app>.vercel.app/qr` on a laptop — the QR code now points
  at your real URL. Print it; anyone who scans it lands on the sign-up flow.
- **Test on a real phone.** Voice input needs HTTPS, which Vercel gives you
  automatically — it will not work over plain `http://` on a phone, only on
  `localhost`.
- Voice recognition works in Chrome, Edge, Android Chrome and iOS Safari
  14.5+. Everywhere else the app silently falls back to typing.

---

## Common problems

| Symptom | Fix |
|---|---|
| Build fails: "Module not found" | Run `npm install` locally and commit `package-lock.json`. |
| Build fails on a type error | `npm run typecheck` locally to see it in full. |
| `node_modules` got committed | It is in `.gitignore`; if it slipped in: `git rm -r --cached node_modules && git commit -m "drop node_modules"`. |
| Mic button does nothing | Not HTTPS, or the browser blocked mic permission. Check the address bar. |
| Data disappeared | It lives in that browser's localStorage. Different browser or incognito = fresh demo data. |
| Two "users" see different data | Same reason. For a live demo use two tabs in the **same** browser. |

---

## Phase 2 — wiring in real AI

Everything is already shaped for this. For each feature, add an API route and
change one function body.

**Step 1 — install the SDK and set the key**

```bash
npm i @anthropic-ai/sdk
```

Locally, put the key in `.env.local`:

```
ANTHROPIC_API_KEY=sk-ant-...
```

On Vercel: Project → Settings → Environment Variables → add
`ANTHROPIC_API_KEY` → redeploy. **Never commit the key** — `.env*` is already
in `.gitignore`.

**Step 2 — add a server route** (example: `app/api/extract-profile/route.ts`)

```ts
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic();      // reads ANTHROPIC_API_KEY

export async function POST(req: Request) {
  const { transcript, lang } = await req.json();

  const msg = await client.messages.create({
    model: 'claude-sonnet-4-5',   // check https://docs.claude.com/en/docs/about-claude/models for the current model IDs
    max_tokens: 512,
    system:
      'You extract worker profiles for an Indian hyperlocal jobs app. ' +
      'Reply with JSON only: {"category","skills","experienceYears","summary","confidence"}. ' +
      'category must be one of: electrician, plumber, carpenter, painter, maid, cook, ' +
      'barber, raddiwala, shop_assistant, other.',
    messages: [{ role: 'user', content: `Language: ${lang}\nWorker said: "${transcript}"` }],
  });

  const text = msg.content[0].type === 'text' ? msg.content[0].text : '{}';
  return Response.json(JSON.parse(text));
}
```

**Step 3 — point the stub at it.** In `lib/ai/profile.ts`, replace the body of
`extractWorkerProfile` with:

```ts
const res = await fetch('/api/extract-profile', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ transcript, lang }),
});
if (!res.ok) throw new Error('extract failed');
return res.json();
```

Nothing else in the app changes. Do the same for `jobs.ts` (`/api/parse-job`),
`translate.ts` (`/api/translate`), `pricing.ts` (`/api/suggest-price`) and
`scrap.ts` (`/api/identify-scrap`, using Claude's vision input).

Keep the rule-based version as the fallback in a `try/catch` — if the API is
down or the key is missing, the app still works. Run `npm run test` after each
swap; the assertions there are your safety net.

**Suggested order:** translation → job parsing → voice profile → pricing →
scrap vision. Translation gives the biggest visible win for the least work.

---

## Phase 3 — a real database (when you need two devices to see each other)

Today all data is per-browser. To make a worker on one phone see a resident's
job posted on another, add Postgres:

1. Vercel → Storage → **Neon / Supabase Postgres** → connect to the project.
2. Turn `lib/types.ts` into your schema (each interface = one table).
3. Add `app/api/jobs/route.ts` etc.
4. Rewrite **only** `components/store.tsx` to call those routes instead of
   localStorage. No page needs to change.

Then real OTP (MSG91 or Firebase Auth), and push notifications so workers hear
about a job without opening the app.
