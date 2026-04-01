# VitalFlow — Smart Blood Donation System

A fully functional, enterprise-grade frontend application for smart blood donation management. Built with vanilla HTML, CSS, and JavaScript — zero dependencies, ready to deploy.

## 🩸 Features

### For Donors
- Register with blood type, city, and contact info
- View live blood requests sorted by urgency and distance
- Accept donation requests with one click
- See hospital address, distance, contact info before accepting
- Track full donation history
- Earn reward points (+100 per donation) and unlock levels (New → Active → Silver → Gold → Elite)
- Find nearby donation centers with directions
- Profile editing
- Real-time notifications for new requests

### For Hospitals
- Register hospital account
- Post blood requests with patient details, blood type, urgency level
- View all submitted requests with status tracking (Open / Fulfilled / Cancelled)
- See donor responses — donor name, blood type, city, contact, and acceptance time
- Edit or cancel requests

### Smart Matching
- Blood requests instantly notify all registered donors
- Requests sorted by urgency (Urgent > High > Normal)
- Distance shown on every request
- Filter by blood type, urgency, and status

---

## 📁 Project Structure

```
vitalflow/
├── index.html          # Main SPA — all pages/routing
├── css/
│   └── styles.css      # Full design system + responsive CSS
└── js/
    ├── db.js           # Database layer (localStorage)
    ├── utils.js        # Helpers, time, blood type, toast, modal
    ├── app.js          # Router, auth, landing page, public request
    ├── dashboard.js    # Donor dashboard all tabs
    └── hospital.js     # Hospital dashboard all tabs
```

---

## 🚀 Running Locally

Just open `index.html` in any modern browser — no build step, no server required.

```bash
# Option 1: Open directly
open index.html

# Option 2: Local server (recommended)
npx serve .
# or
python3 -m http.server 3000
```

---

## 🔑 Demo Credentials

| Role     | Email               | Password  |
|----------|---------------------|-----------|
| Donor    | alex@demo.com       | demo123   |
| Hospital | hospital@demo.com   | demo123   |

Or use the **"Login as Donor"** / **"Login as Hospital"** quick-login buttons on the login page.

---

## 💾 Data Storage

All data is stored in **localStorage** under the `vf_` prefix:

| Key                | Contents                        |
|--------------------|---------------------------------|
| `vf_users`         | User accounts (donors + hospitals) |
| `vf_requests`      | Blood requests                  |
| `vf_donations`     | Completed donations             |
| `vf_notifs_<uid>`  | Per-user notifications          |
| `vf_session`       | Current logged-in user          |
| `vf_seeded_v2`     | Seed flag (prevents re-seeding) |

To **reset all data**, run in browser console:
```javascript
Object.keys(localStorage).filter(k => k.startsWith('vf_')).forEach(k => localStorage.removeItem(k));
location.reload();
```

---

## 🏗️ Architecture

Single-Page Application (SPA) with manual routing:
- `navigateTo(page)` — shows a page div, hides others
- `showDashTab(tab)` — switches donor dashboard tabs
- `showHospitalTab(tab)` — switches hospital dashboard tabs

**No frameworks.** Pure HTML + CSS + vanilla JS.

---

## 🌐 Deployment

Works on any static hosting:
- **GitHub Pages**: Push and enable Pages in repo settings
- **Netlify**: Drag and drop the folder
- **Vercel**: `vercel deploy`
- **Firebase Hosting**: `firebase deploy`

---

## 🔮 Production Upgrade Path

To connect a real backend, replace the `DB` module in `js/db.js` with API calls:

```javascript
// Example: Replace DB.getRequests() with:
async function getRequests() {
  const res = await fetch('/api/requests', { headers: { Authorization: `Bearer ${token}` } });
  return res.json();
}
```

Recommended stack for backend:
- **Node.js + Express** or **FastAPI (Python)**
- **PostgreSQL** or **MongoDB**
- **JWT** for authentication
- **Socket.io** for real-time notifications

---

## 📱 Responsive Breakpoints

| Breakpoint | Layout |
|------------|--------|
| < 480px    | Single column, mobile-optimized |
| 480–768px  | 2-column grids |
| 768–1024px | Sidebar + 2-3 column content |
| > 1024px   | Full sidebar + multi-column dashboard |

---

## ✅ Browser Support

Chrome, Firefox, Safari, Edge (all modern versions). Uses:
- CSS Custom Properties
- CSS Grid & Flexbox
- backdrop-filter (with -webkit- prefix)
- localStorage API

---

*Built with ❤️ for saving lives.*
