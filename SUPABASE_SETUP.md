# VitalFlow — Supabase Integration Guide

This is the **enterprise backend edition** of VitalFlow, fully wired to Supabase.  
All data (users, blood requests, donations, notifications) is now stored in a real  
PostgreSQL database with Row-Level Security, real-time subscriptions, and Supabase Auth.

---

## ⚡ Quick Setup (5 minutes)

### 1. Create a Supabase project
Go to [https://supabase.com](https://supabase.com) → New Project.  
Choose a region close to your users (e.g. `ap-south-1` for India).

---

### 2. Run the schema
In your Supabase Dashboard → **SQL Editor** → paste and run the entire contents of:

```
supabase_schema.sql
```

This creates 4 tables (`profiles`, `blood_requests`, `donations`, `notifications`),  
Row-Level Security policies, indexes, and triggers.

---

### 3. Plug in your credentials
Open `js/db.js` and replace lines 12–13:

```js
const SUPABASE_URL = 'https://YOUR_PROJECT_ID.supabase.co';
const SUPABASE_ANON_KEY = 'YOUR_ANON_PUBLIC_KEY';
```

Find these values in: **Dashboard → Settings → API**
- **Project URL** → `SUPABASE_URL`
- **anon / public key** → `SUPABASE_ANON_KEY`

⚠️  Use the **anon** key, never the `service_role` key in frontend code.

---

### 4. Enable Real-Time (for live notifications)
In Supabase Dashboard → **Table Editor**:
- Open `notifications` table → toggle **Realtime ON**
- Open `blood_requests` table → toggle **Realtime ON**

Or run in SQL Editor:
```sql
alter publication supabase_realtime add table public.notifications;
alter publication supabase_realtime add table public.blood_requests;
```

---

### 5. Configure Auth settings (optional but recommended)
Dashboard → **Authentication → Settings**:
- **Site URL**: set to your deployed URL (e.g. `https://vitalflow.vercel.app`)
- **Email confirmations**: disable for local dev; enable for production
- **Redirect URLs**: add your domain

---

### 6. Run locally
```bash
npx serve .
# or
python3 -m http.server 3000
```
Open `http://localhost:3000` — register a donor and hospital account.

---

## 🗄️ Database Schema

| Table            | Description                                      |
|------------------|--------------------------------------------------|
| `profiles`       | User accounts — donors & hospitals               |
| `blood_requests` | All blood requests (open / accepted / cancelled) |
| `donations`      | Completed donation records per donor             |
| `notifications`  | Per-user notification inbox                      |

---

## 🔐 Security Model

All tables use **Row-Level Security (RLS)**:

| Table            | Who can read?                     | Who can write?            |
|------------------|-----------------------------------|---------------------------|
| `profiles`       | Own profile + all donor profiles  | Own profile only          |
| `blood_requests` | Any authenticated user            | Hospital (own) / Donor (accept) |
| `donations`      | Own donations only                | Own donations only        |
| `notifications`  | Own notifications only            | Own notifications only    |

---

## 📡 Real-Time Features

VitalFlow uses two Supabase real-time channels:

1. **`blood_requests_changes`** — fires on any INSERT/UPDATE to `blood_requests`.  
   Updates the live badge count and refreshes the request list for the current user.

2. **`user_notifs_<uid>`** — fires on INSERT to `notifications` filtered by `user_id`.  
   Shows a toast to the recipient immediately.

---

## 🚀 Deploy to Production

### Vercel (recommended)
```bash
npm i -g vercel
vercel deploy
```
Set `SUPABASE_URL` and `SUPABASE_ANON_KEY` as env vars in Vercel dashboard,  
or keep them hardcoded in `js/db.js` since the anon key is safe for public use.

### Netlify
Drag and drop the `vitalflow-supabase/` folder into Netlify.

### Any static host
Upload all files — it's a pure static SPA, no server required.

---

## 🔄 What Changed From the localStorage Version

| File             | Change                                                              |
|------------------|---------------------------------------------------------------------|
| `js/db.js`       | **Fully rewritten** — all functions are now `async`, Supabase calls |
| `js/app.js`      | `handleLogin/Register/Logout` use `DB.signIn/signUp/signOut`; all DB calls `await`-ed |
| `js/dashboard.js`| All render functions `async`; `DB.*` calls `await`-ed              |
| `js/hospital.js` | All render functions `async`; `DB.*` calls `await`-ed              |
| `index.html`     | Added Supabase JS CDN, async dashboard wrapper                     |
| `js/utils.js`    | **Unchanged** — pure helpers, no DB calls                          |
| `js/db.js` (old) | `seedDatabase()` removed — data now lives in Supabase              |

---

## 🛠️ Troubleshooting

**"Failed to sign in" even with correct credentials**  
→ Check that `SUPABASE_URL` and `SUPABASE_ANON_KEY` are correct and have no trailing spaces.

**Registration succeeds but profile page is blank**  
→ The `profiles` INSERT may have failed. Check browser console and Supabase Dashboard → Logs.

**Real-time notifications not appearing**  
→ Make sure Realtime is enabled on the `notifications` table (Step 4 above).

**RLS blocking queries**  
→ Check Supabase Dashboard → Authentication → Policies. All policies in `supabase_schema.sql` must be applied.

**CORS errors in local dev**  
→ Use `npx serve .` or `python3 -m http.server` instead of opening `index.html` directly with `file://`.

---

*Built with ❤️ for saving lives — now powered by Supabase.*
