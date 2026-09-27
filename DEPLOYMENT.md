# Deploying to Vercel — Step-by-Step Guide

This project is a Next.js application, so it deploys to Vercel natively.
The only extra piece you need is a **PostgreSQL database**, since Vercel's
serverless functions don't have a persistent file system (a local SQLite
file would not survive between requests).

Total time: about 15 minutes.

---

## Step 1 — Create a PostgreSQL database

Pick any one of these (all have a free tier and work well with Vercel):

### Option A: Neon (recommended, simplest)
1. Go to **https://neon.tech** and sign up / sign in.
2. Click **Create a project**, choose a region close to your users.
3. Once created, open the **Connection Details** panel and copy the
   connection string. It looks like:
   ```
   postgresql://user:password@ep-xxxx.us-east-2.aws.neon.tech/neondb?sslmode=require
   ```
4. Keep this tab open — you'll paste this into Vercel in Step 4.

### Option B: Vercel Postgres (native integration)
1. You can add this directly from inside your Vercel project after Step 3
   below: **Project → Storage → Create Database → Postgres**.
2. Vercel automatically sets the `DATABASE_URL` environment variable for
   you — you can skip manually adding it in Step 4.

### Option C: Supabase
1. Go to **https://supabase.com**, create a project.
2. Go to **Project Settings → Database → Connection string → URI** and
   copy it (use the "connection pooling" string for serverless use).

---

## Step 2 — Push the project to GitHub

Vercel deploys from a Git repository.

```bash
cd fyp-management
git init
git add .
git commit -m "Initial commit: FYP Management System"
```

Create a new empty repository on GitHub (via github.com → **New repository**,
do not initialize it with a README), then:

```bash
git remote add origin https://github.com/<your-username>/fyp-management.git
git branch -M main
git push -u origin main
```

---

## Step 3 — Import the project into Vercel

1. Go to **https://vercel.com** and sign in (you can sign in with your
   GitHub account directly).
2. Click **Add New → Project**.
3. Select your `fyp-management` repository from the list and click **Import**.
4. Vercel will auto-detect this as a **Next.js** project. Leave the build
   settings as default:
   - **Build Command:** `prisma generate && next build` (already set in `package.json`)
   - **Output Directory:** default (`.next`)
   - **Install Command:** default (`npm install`)

Do **not** click Deploy yet — set the environment variable first (Step 4),
otherwise the first build will fail because there's no database to connect to.

---

## Step 4 — Set the `DATABASE_URL` environment variable

Still on the "Configure Project" screen (or afterwards under **Project →
Settings → Environment Variables** if you already deployed):

1. Add a new environment variable:
   - **Key:** `DATABASE_URL`
   - **Value:** the connection string you copied in Step 1
   - **Environments:** check all three — Production, Preview, and Development
2. Click **Save**.

If you used the Vercel Postgres integration (Option B), this variable is
already set for you and you can skip this step.

---

## Step 5 — Deploy

1. Click **Deploy**.
2. Vercel will run `npm install`, then `prisma generate && next build`.
3. Wait for the build to finish — you'll get a live URL like
   `https://fyp-management.vercel.app`.

---

## Step 6 — Create the database tables

The database is empty until you push the Prisma schema to it. Run this
**once**, from your local machine, pointed at the same database you
configured in Vercel:

```bash
# In your local project folder
echo 'DATABASE_URL="paste-your-connection-string-here"' > .env
npx prisma db push
```

This creates all tables (`Student`, `Group`, `Project`, `DefenceRoom`,
`DefenceSchedule`, `RoomAllocation`, `Faculty`, `ImportBatch`, `AuditLog`,
etc.) defined in `prisma/schema.prisma`.

(Optional) Load sample rooms and faculty so you have something to test with:

```bash
npm run db:seed
```

---

## Step 7 — Verify

Open your live Vercel URL. You should see the **Coordinator Overview**
page with all stat counters at 0 (or populated, if you seeded data).

Try the full flow:
1. **Defence Rooms** → add a room.
2. **Student Import** → upload a CSV, map columns, preview, confirm.
3. **Defence Scheduling** → create a session, allocate projects to rooms,
   assign examiners, check conflicts, finalize.
4. **Room Dashboard** → view and export the room-wise schedule.

---

## Ongoing deployments

Every time you `git push` to `main`, Vercel automatically builds and
deploys the new version. Pushing to any other branch creates a **Preview**
deployment with its own URL, so you can test changes before merging.

If you change `prisma/schema.prisma` later, remember to run
`npx prisma db push` (or set up `prisma migrate` for versioned migrations)
against your production database after deploying the code change.

---

## Troubleshooting

| Problem | Fix |
|---|---|
| Build fails with a Prisma error | Confirm `DATABASE_URL` is set in Vercel → Settings → Environment Variables, for the Production environment, then redeploy. |
| Pages load but show "Could not reach the database" | The schema hasn't been pushed yet — run Step 6, or double-check the connection string (must include `?sslmode=require` for Neon/Supabase). |
| "Too many connections" errors under load | Use your provider's **connection pooling** URL (Neon and Supabase both provide one) instead of the direct connection string. |
| Want a custom domain | Vercel → Project → Settings → Domains → Add, then follow the DNS instructions shown. |
