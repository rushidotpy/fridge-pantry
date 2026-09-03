# Fridge & Pantry

A fridge, freezer and pantry tracker that runs as an installable web app on your Mac and iPhone and keeps both in sync.

- **What I Have** – everything in stock, grouped by how soon it needs using
- **Need to Have** – shopping list; staples are added automatically when they run out
- **Good Foods** – what's fresh, healthy staples worth stocking, your favorites, and recipe ideas from what you have
- **Expiration Dates** – every dated item in one place with color-coded warnings and a "use these first" strip
- **Label scanning** – snap a photo and the expiration date and product name are read for you
- **Reminders** – in-app, Apple Calendar subscription, push notifications, and a daily email digest

It works out of the box in **local mode** (data stays in the browser). Connecting a free Supabase project turns on cross-device sync, photo storage, server-side scanning, and reminders.

---

## 1. Run it locally

```bash
npm install
npm run dev
```

Open http://localhost:5173/fridge-pantry/. To try label scanning and recipes in local mode, paste a free Gemini API key from [Google AI Studio](https://aistudio.google.com/apikey) in **Settings → Label scanning**.

## 2. Put it on GitHub Pages

1. Create a new repository on GitHub named `fridge-pantry` (any name works; the URL path follows the repo name).
2. Push this folder:

   ```bash
   git remote add origin https://github.com/<you>/fridge-pantry.git
   git push -u origin main
   ```

3. In the repo, open **Settings → Pages** and set **Source** to **GitHub Actions**.
4. The `Deploy to GitHub Pages` workflow runs on every push. Your app is at `https://<you>.github.io/fridge-pantry/`.

Open that URL on your iPhone in Safari and tap **Share → Add to Home Screen**. On your Mac use Safari **File → Add to Dock** (or the install icon in Chrome).

At this point the app runs in local mode on each device. Continue below to sync them.

## 3. Turn on sync with Supabase (free)

1. Create a project at [supabase.com](https://supabase.com) (free plan, no card).
2. Open **SQL Editor**, paste the contents of [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql), and run it. This creates the tables, row-level security, realtime, and the `photos` storage bucket.
3. In **Authentication → URL Configuration**, set **Site URL** to `https://<you>.github.io/fridge-pantry/` and add the same URL under **Redirect URLs**. (Email sign-in links point here.)
4. In **Project Settings → API**, copy the **Project URL** and the **anon public** key.
5. In your GitHub repo, **Settings → Secrets and variables → Actions**, add:
   - `VITE_SUPABASE_URL` – the project URL
   - `VITE_SUPABASE_ANON_KEY` – the anon key
6. Re-run the deploy workflow (**Actions → Deploy to GitHub Pages → Run workflow**).

Reload the app: you'll be asked for your email and sent a sign-in link. Sign in with the same email on every device and the list syncs in real time. If you had local data, export it first from **Settings → Your data** and import it after signing in.

## 4. Server-side scanning and recipes

The Edge Functions keep your Gemini key on the server.

```bash
npm i -g supabase          # or: npx supabase ...
supabase login
supabase link --project-ref <your-project-ref>
supabase secrets set GEMINI_API_KEY=<key from aistudio.google.com/apikey>
supabase functions deploy scan-label suggest-recipes calendar-feed daily-digest
```

The project ref is the part of your project URL before `.supabase.co`.

## 5. Reminders

### Apple Calendar (recommended, no extra setup)

After deploying `calendar-feed`, open **Settings → Expiry reminders** in the app and tap **Subscribe in Calendar** on your Mac. Every dated item becomes an all-day event with an alert two days before. iCloud syncs the subscription to your iPhone; the feed refreshes itself.

### Push notifications and email digest

Both are sent by the `daily-digest` function, triggered hourly by the `Expiry digest` GitHub Actions workflow (which also keeps the free Supabase project awake).

```bash
# 1. Generate push keys
node scripts/gen-vapid.mjs

# 2. Server secrets
supabase secrets set \
  VAPID_KEYS='<the JSON line from step 1>' \
  VAPID_CONTACT='mailto:you@example.com' \
  CRON_SECRET="$(openssl rand -hex 24)" \
  APP_URL='https://<you>.github.io/fridge-pantry/'

# optional: email digest via https://resend.com (free tier)
supabase secrets set RESEND_API_KEY=re_xxx DIGEST_FROM='Pantry <pantry@yourdomain.com>'
```

Then add to GitHub Actions secrets:

- `VITE_VAPID_PUBLIC_KEY` – the base64url public key printed by the script
- `CRON_SECRET` – the same value you set in Supabase

Re-run the deploy workflow. In the app, **Settings → Expiry reminders → Push notifications** turns it on for that device. On iPhone, push only works from the Home Screen icon, not a Safari tab. Email and the send hour are configured in the same panel.

To test immediately: **Actions → Expiry digest → Run workflow** with *force* checked.

## Project layout

```
src/
  views/         Inventory, Shopping, GoodFoods, Expiry, Settings, SignIn
  components/    ItemForm (add/edit + scan), ItemCard, shared UI
  state/         DataProvider (optimistic updates, realtime), AuthGate
  lib/           store/ (local + cloud), scan, recipes, ics, push, dates
  data/          curated healthy foods list
  sw.ts          service worker: offline cache + push handler
supabase/
  migrations/    schema, RLS, realtime, storage
  functions/     scan-label, suggest-recipes, calendar-feed, daily-digest
.github/workflows/
  deploy.yml     build + publish to Pages
  digest.yml     hourly reminder cron
```

## Free-tier limits worth knowing

- Supabase: 500 MB database, 1 GB photos, 500k function calls/month. Photos are compressed in the browser to ~150 KB, so thousands fit. Projects pause after 7 idle days; the hourly digest prevents that.
- Gemini: 15 requests/minute, 1,500/day on the free tier.
- Resend: 100 emails/day.
