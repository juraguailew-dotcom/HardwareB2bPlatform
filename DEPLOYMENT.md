# Deployment Guide — Hardware B2B Platform

## Overview
- **Backend** → Railway (Node.js + PostgreSQL)
- **Frontend** → Vercel (React)
- **Database** → Neon (free hosted PostgreSQL)
- **File Storage** → Cloudinary (free tier)

---

## Step 1 — Secure Your Secrets (Do This First)

### 1.1 — Rotate your database password
Your old DB password was committed to git. If this repo was ever pushed to GitHub, change it immediately in your PostgreSQL provider dashboard.

### 1.2 — Generate strong secrets
Run this in your terminal to generate secure values for `JWT_SECRET` and `CSRF_SECRET`:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```
Run it twice — use one value for `JWT_SECRET` and another for `CSRF_SECRET`.

### 1.3 — Ensure .env is not tracked by git
```bash
git rm --cached backend/.env
git rm --cached frontend/.env
git rm --cached frontend/.env.production
git commit -m "remove env files from tracking"
```

---

## Step 2 — Set Up a Hosted Database (Neon)

1. Go to https://neon.tech and create a free account
2. Create a new project (e.g. `hardware-b2b`)
3. Copy the **Connection String** — it looks like:
   ```
   postgresql://user:password@ep-xxx.neon.tech/neondb?sslmode=require
   ```
4. Keep this for Step 4

---

## Step 3 — Set Up Cloudinary (Image Uploads)

1. Go to https://cloudinary.com and create a free account
2. From your dashboard, copy:
   - **Cloud Name**
   - **API Key**
   - **API Secret**
3. Keep these for Step 4

---

## Step 4 — Deploy Backend to Railway

1. Go to https://railway.app and sign in with GitHub
2. Click **New Project → Deploy from GitHub repo**
3. Select this repository
4. Railway will detect `railway.json` at the root automatically
5. Go to your service → **Variables** tab and add ALL of the following:

| Variable | Value |
|---|---|
| `NODE_ENV` | `production` |
| `DATABASE_URL` | your Neon connection string from Step 2 |
| `JWT_SECRET` | your generated secret from Step 1.2 |
| `CSRF_SECRET` | your generated secret from Step 1.2 |
| `CLIENT_URL` | `https://<your-app>.vercel.app` (fill in after Step 5) |
| `CLOUDINARY_CLOUD_NAME` | from Step 3 |
| `CLOUDINARY_API_KEY` | from Step 3 |
| `CLOUDINARY_API_SECRET` | from Step 3 |
| `EMAIL_HOST` | `smtp.gmail.com` |
| `EMAIL_PORT` | `587` |
| `EMAIL_USER` | your Gmail address |
| `EMAIL_PASS` | your Gmail App Password |
| `ORDER_APPROVAL_THRESHOLD` | `5000` |

6. Click **Deploy**
7. Once deployed, copy your Railway backend URL (e.g. `https://hardware-b2b-production.up.railway.app`)

> **Gmail App Password**: Go to Google Account → Security → 2-Step Verification → App Passwords. Generate one for "Mail".

---

## Step 5 — Deploy Frontend to Vercel

1. Go to https://vercel.com and sign in with GitHub
2. Click **Add New Project** and import this repository
3. Set the **Root Directory** to `frontend`
4. Under **Environment Variables**, add:

| Variable | Value |
|---|---|
| `REACT_APP_API_URL` | `https://<your-railway-url>/api` |
| `REACT_APP_BASE_URL` | `https://<your-railway-url>` |

5. Click **Deploy**
6. Copy your Vercel URL (e.g. `https://hardware-b2b.vercel.app`)

---

## Step 6 — Update CORS on Railway

Now that you have your Vercel URL, go back to Railway:

1. Update the `CLIENT_URL` variable to your actual Vercel URL:
   ```
   CLIENT_URL=https://hardware-b2b.vercel.app
   ```
2. Railway will auto-redeploy

---

## Step 7 — Run Database Migrations

The migrations run automatically when the server starts (`runMigrations()` in `server.js`).
Check your Railway deployment logs to confirm:
```
✅ Migration applied: migrate-enterprise.sql
✅ Migration applied: migrate-fulfillment.sql
...
✅ Connected to PostgreSQL database
🚀 Server running on port ...
```

If any migration fails, check the Railway logs for the specific SQL error.

---

## Step 8 — Create the Admin User

SSH into Railway or run this locally with `DATABASE_URL` set:
```bash
cd backend
node create-admin.js
```

---

## Step 9 — Verify Everything Works

- [ ] `https://<railway-url>/health` returns `{ "status": "ok" }`
- [ ] `https://<railway-url>/api/test` returns a success message
- [ ] Frontend loads at your Vercel URL
- [ ] Login / Register works
- [ ] Image upload works (tests Cloudinary)
- [ ] Chat works (tests Socket.io)

---

## Optional — Stripe Payments

When ready to activate payments, add to Railway variables:
```
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
```
And add to Vercel variables:
```
REACT_APP_STRIPE_PUBLISHABLE_KEY=pk_live_...
```

---

## Optional — Twilio SMS

When ready, add to Railway variables:
```
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
TWILIO_PHONE_NUMBER=+1...
```
