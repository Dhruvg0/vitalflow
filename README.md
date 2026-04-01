# 🩸 VitalFlow — Smart Blood Donation System

An enterprise-grade blood donation management platform connecting donors and hospitals in real-time. Built with vanilla HTML, CSS, and JavaScript — powered by Supabase for authentication, live database, and real-time notifications.

**Live:** [vitalflow-india.pages.dev](https://vitalflow-web.pages.dev/)

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

## 🚀 Running Locally

```bash
# Clone the repo
git clone https://github.com/Dhruvg0/vitalflow.git
cd vitalflow

# Start local server
npx serve .
```

Open `http://localhost:3000` — requires a Supabase project (see setup below).

---

## ⚙️ Supabase Setup

1. Create a project at [supabase.com](https://supabase.com)
2. Run `supabase_schema.sql` in the SQL Editor
3. Add your credentials to `js/db.js`:
```js
const SUPABASE_URL = 'https://your-project-id.supabase.co';
const SUPABASE_ANON_KEY = 'your-anon-public-key';
```
4. Enable Realtime on `notifications` and `blood_requests` tables
5. Disable email confirmation for local dev: Authentication → Sign In / Providers → Confirm email OFF

Full guide: [SUPABASE_SETUP.md](./SUPABASE_SETUP.md)

---

## 🗄️ Database Schema

| Table | Description |
|---|---|
| `profiles` | User accounts — donors & hospitals |
| `blood_requests` | All blood requests (open / accepted / cancelled) |
| `donations` | Completed donation records per donor |
| `notifications` | Per-user real-time notification inbox |

---

## 🔐 Security

- ✅ Row Level Security (RLS) enabled on all tables
- ✅ Auto-RLS event trigger — every new table gets RLS automatically
- ✅ Passwords hashed with bcrypt via Supabase Auth
- ✅ Anon key safe for frontend — RLS is the real lock
- ✅ Service role key never exposed in frontend code

---

## 📱 Responsive Breakpoints

| Breakpoint | Layout |
|---|---|
| < 480px | Single column, mobile-optimized |
| 480–768px | 2-column grids |
| 768–1024px | Sidebar + 2-3 column content |
| > 1024px | Full sidebar + multi-column dashboard |

---

## 🌐 Deployment

Deployed on **Cloudflare Pages** for maximum speed across India (20+ edge locations).

To deploy your own:
1. Push to GitHub
2. Connect repo to [Cloudflare Pages](https://pages.cloudflare.com)
3. Framework: None, Build command: empty, Output: `/`
4. Add your live URL to Supabase → Authentication → URL Configuration

---

## ✅ Browser Support

Chrome, Firefox, Safari, Edge — all modern versions.

---

*Built with ❤️ for saving lives across India. 🇮🇳*
