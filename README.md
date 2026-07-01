# 🦷 ProImplant — Dental Clinic Website + Reservation System

A complete, self-contained website for **ProImplant Sumqayıt Stomatoloji Klinikası** with:

- Modern, responsive, **bilingual (Azərbaycanca / English)** public website
- Online **appointment / reservation system** with automatic time-slot generation and double-booking protection
- Full **admin panel** to manage appointments, doctors, services, working hours, clinic info and admin accounts
- **Embedded SQLite database** (via better-sqlite3, prebuilt binary — no build tools, no external DB server) — one portable file, ACID/crash-safe, runs anywhere with just Node.js
- Ready-to-use **Docker** and **Render.com** deployment configs

---

## ✨ Features

### Public website (`/`)
- Hero with live "Open / Closed now" status
- Services grid (managed from admin)
- Doctors / team section (managed from admin)
- "Why us" highlights
- Online booking form: picks service, doctor, date and an available time slot
- Working hours table, Google Maps location, Instagram & contact links
- AZ / EN language switch

### Admin panel (`/admin`)
- Secure login (JWT, bcrypt-hashed passwords)
- **Role-based access:**
  - **Owner / Staff** → full access to everything
  - **Doctor** → sees and manages *only their own* appointments
- Dashboard with live stats (today / pending / confirmed / totals)
- Appointments: filter by status & date, confirm / complete / cancel / delete
- **Reports**: totals by status, a 14-day bookings chart, breakdown by doctor and by service (with date range)
- **Finance**: when you click **Done** you're asked the fee and whether it was **paid / debt / installment**; the Finance section then shows **income per doctor** (daily / monthly / yearly) — billed, collected and outstanding debt — and lets you **export to Excel (.xlsx)**. Debts/installments can be settled later with a "Pay" button.
- Doctors: full create / edit / delete (bilingual) **+ each doctor's own email and working days/hours**
- Services: full create / edit / delete (bilingual, price, **duration**, icon)
- Clinic settings: contact info, address, Instagram, rating, working hours, slot length
- Accounts: owner can add/remove **owner, staff and doctor** logins

### Smart booking rules
- Time slots are generated from **the selected doctor's own working hours**
- A booking blocks the doctor for the **full duration of the chosen service** — e.g. a 45-min service at 10:00 makes 10:30 unavailable for that doctor (but other doctors stay free)
- Bookings outside a doctor's working hours are rejected

### Notifications (optional, configured via env)
- **Email to the doctor** when a new appointment is booked (SMTP)
- **SMS to the patient** when their appointment is confirmed / cancelled / completed (Twilio)
- If not configured, notifications are simply logged — the app works fine without them. See `.env.example`.

---

## 🚀 Run locally

Requires **Node.js 18+**.

```bash
cd proimplant
npm install
npm start
```

Then open:
- Website → http://localhost:3000
- Admin panel → http://localhost:3000/admin

**Default admin login:**
- Email: `admin@proimplant.az`
- Password: `proimplant123`

> Change these via the `.env` file (copy `.env.example` to `.env`) **before first launch**, or add a new admin and delete the default one from the admin panel.

---

## ⚙️ Configuration

Copy `.env.example` to `.env` and adjust:

| Variable | Purpose |
|----------|---------|
| `PORT` | Port to listen on (default 3000) |
| `JWT_SECRET` | Secret for signing login tokens — **set a long random value in production** |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | Default admin created on first launch |
| `DATA_DIR` | Where the SQLite database (`clinic.sqlite`) is stored (default `./data`) |

All clinic content (services, doctors, hours, contact info) is editable from the admin panel — no code changes needed.

---

## 📦 Deployment

### Option A — Render.com (easiest, free tier)
1. Push this folder to a **GitHub** repository.
2. Go to [render.com](https://render.com) → **New + → Blueprint** → select your repo.
3. Render reads `render.yaml`, creates the service **and a persistent disk** for the database.
4. Set the `ADMIN_PASSWORD` environment variable when prompted.
5. Deploy. Your site is live at `https://<your-app>.onrender.com`.

### Option B — Docker (any server / VPS)
```bash
docker build -t proimplant .
docker run -d -p 3000:3000 -v proimplant_data:/data \
  -e JWT_SECRET="a-long-random-secret" \
  -e ADMIN_PASSWORD="your-strong-password" \
  --name proimplant proimplant
```

### Option C — Any Node host (Railway, Fly.io, VPS, etc.)
- Build command: `npm install`
- Start command: `node server.js`
- Make sure the `data/` directory (or `DATA_DIR`) is on **persistent storage** so bookings aren't lost on restart.

---

## 🗂️ Project structure

```
proimplant/
├── server.js            # Express server + all API routes
├── db/
│   ├── store.js         # Tiny JSON-file database
│   └── seed.js          # Default admin, clinic info, services, doctors
├── public/
│   ├── index.html       # Public website
│   ├── admin.html       # Admin panel
│   ├── css/             # styles.css, admin.css
│   └── js/              # main.js, admin.js
├── data/                # SQLite database + backups (auto-created, git-ignored)
├── Dockerfile
├── render.yaml
└── .env.example
```

---

## 🔒 Production checklist
- [ ] Set a strong, unique `JWT_SECRET` (if unset, a persistent random one is generated under `DATA_DIR/.jwtsecret`)
- [ ] Change the default admin password (login → **Change password**, or set `ADMIN_PASSWORD`)
- [ ] Ensure `DATA_DIR` is on persistent storage
- [ ] Set `CLINIC_TZ` (default `Asia/Baku`)
- [ ] **Run only ONE instance** (the embedded SQLite database is single-process — never scale horizontally)
- [ ] Serve over HTTPS (Render/Railway/Coolify do this automatically)

## 🛡️ Reliability & hardening (built in)
- **Timezone-correct**: "today", finance periods and past-time checks use `CLINIC_TZ`, not UTC.
- **Automatic backups**: a daily snapshot of the database is written to `DATA_DIR/backups/` (last 30 days kept).
- **Persistent JWT secret**: no insecure hardcoded default; a random secret is generated and stored if you don't provide one.
- **No past bookings**: the API rejects slots in the past; the form hides them.
- **Payment history**: every payment (and installment) is recorded with its own date; finance counts *collected* by the day money actually came in.
- **Passwords**: any user can change their own password; the owner can reset any account's password. The env password is **not** silently re-applied on boot (set `ADMIN_FORCE_PASSWORD=true` only for recovery).
- **Cascade cleanup**: deleting a doctor also removes their linked login account (no orphans).
- **XSS-safe**: all admin-entered content is HTML-escaped before rendering.
- **Single dependency-audited stack**: `npm audit` reports 0 vulnerabilities.

> ⚠️ **Scaling note:** this app uses an embedded SQLite database, which means it must run as a **single process** (SQLite is a single-file DB). This is plenty for one clinic. For very high volume or true multi-instance/horizontal scaling, migrate to Postgres — the data layer is isolated in `db/store.js`. A legacy `db.json` is auto-imported into SQLite on first boot.

---

Built for ProImplant Sumqayıt Stomatoloji Klinikası · proimplant.az
