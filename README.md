# 🦷 ProImplant — Dental Clinic Website + Reservation System

A complete, self-contained website for **ProImplant Sumqayıt Stomatoloji Klinikası** with:

- Modern, responsive, **bilingual (Azərbaycanca / English)** public website
- Online **appointment / reservation system** with automatic time-slot generation and double-booking protection
- Full **admin panel** to manage appointments, doctors, services, working hours, clinic info and admin accounts
- **Zero external database** — everything is stored in a single JSON file, so it runs anywhere with just Node.js
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
- Dashboard with live stats (today / pending / confirmed / totals)
- Appointments: filter by status & date, confirm / complete / cancel / delete
- Doctors: full create / edit / delete (bilingual)
- Services: full create / edit / delete (bilingual, price, duration, icon)
- Clinic settings: contact info, address, Instagram, rating, **working hours editor**, slot length
- Admin accounts: owner can add/remove staff & owner admins

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
| `DATA_DIR` | Where the JSON database is stored (default `./data`) |

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
├── data/                # JSON database (auto-created, git-ignored)
├── Dockerfile
├── render.yaml
└── .env.example
```

---

## 🔒 Production checklist
- [ ] Set a strong, unique `JWT_SECRET`
- [ ] Change the default admin email/password
- [ ] Ensure `DATA_DIR` is on persistent storage
- [ ] Serve over HTTPS (Render/Railway do this automatically)

---

Built for ProImplant Sumqayıt Stomatoloji Klinikası · proimplant.az
