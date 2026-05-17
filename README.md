# 🩸 VitalFlow — Smart Blood Donation System

An enterprise-grade blood donation management platform connecting donors and hospitals in real-time. Built with vanilla HTML, CSS, and JavaScript — powered by Supabase for authentication, live database, and real-time notifications.

**Live:** [vitalflow-web.pages.dev](https://vitalflow-web.pages.dev/)

---

## ✨ Features

### For Donors
- Register with blood type, city, and contact info
- View live blood requests sorted by urgency and distance
- Accept donation requests with one click
- See hospital address, distance, and contact info before accepting
- Track full donation history
- Earn reward points (+100 per donation) and unlock levels (New → Active → Silver → Gold → Elite)
- Find nearby donation centers with directions
- Profile editing
- Real-time notifications for new requests

### For Hospitals
- Register a hospital account
- Post blood requests with patient details, blood type, and urgency level
- View all submitted requests with status tracking (Open / Fulfilled / Cancelled)
- See donor responses — name, blood type, city, contact, and acceptance time
- Edit or cancel requests

### Smart Matching
- Blood requests instantly notify all registered donors via real-time push
- Requests sorted by urgency (Urgent > High > Normal)
- Distance shown on every request
- Filter by blood type, urgency, and status

---

## 🏗️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Vanilla HTML, CSS, JavaScript (no frameworks) |
| Auth | Supabase Auth (email/password, bcrypt hashed) |
| Database | Supabase (PostgreSQL) |
| Real-time | Supabase Realtime (WebSockets) |
| Security | Row Level Security (RLS) on all tables |
| Hosting | Cloudflare Pages |

---

## 📁 Project Structure

```
vitalflow/
├── index.html              # Main SPA — all pages & routing
├── favicon.png             # App icon
├── css/
│   └── styles.css          # Full design system + responsive CSS
├── js/
│   ├── db.js               # Supabase database module (async)
│   ├── utils.js            # Helpers, time, blood type, toast, modal
│   ├── app.js              # Router, auth, landing page
│   ├── dashboard.js        # Donor dashboard all tabs
│   └── hospital.js         # Hospital dashboard all tabs
├── supabase_schema.sql     # Full PostgreSQL schema with RLS
└── SUPABASE_SETUP.md       # Step-by-step Supabase setup guide
```

---




---

## 🔐 Security

- ✅ Row Level Security (RLS) enabled on all tables
- ✅ Auto-RLS event trigger — every new table gets RLS automatically
- ✅ Passwords hashed with bcrypt via Supabase Auth
- ✅ Anon key safe for frontend — RLS is the real lock
- ✅ Service role key never exposed in frontend code



## ✅ Browser Support

Chrome, Firefox, Safari, Edge — all modern versions.

---

*Built with ❤️ for saving lives across India. 🇮🇳*
