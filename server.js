/**
 * ProImplant Dental Clinic - Express server.
 * Serves the public website, the booking API and the protected admin API.
 */
const path = require('path');
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');

const store = require('./db/store');

// Ensure the database is seeded on first boot (idempotent).
require('./db/seed');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'change-this-secret-in-production';

app.set('trust proxy', 1);
app.use(express.json({ limit: '1mb' }));
app.use(express.static(path.join(__dirname, 'public')));

const db = store.data;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function publicSettings() {
  const s = db.settings;
  return {
    clinicName: s.clinicName,
    tagline: s.tagline,
    phone: s.phone,
    phone2: s.phone2,
    email: s.email,
    address: s.address,
    instagram: s.instagram,
    website: s.website,
    mapsQuery: s.mapsQuery,
    rating: s.rating,
    reviewCount: s.reviewCount,
    hours: s.hours,
    slotMinutes: s.slotMinutes,
  };
}

function sign(admin) {
  return jwt.sign(
    { id: admin.id, email: admin.email, role: admin.role, name: admin.name },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

function auth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Not authenticated' });
  try {
    req.admin = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired session' });
  }
}

function isNonEmpty(v) {
  return typeof v === 'string' && v.trim().length > 0;
}

const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 30 });
const bookingLimiter = rateLimit({ windowMs: 60 * 60 * 1000, max: 20 });

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------
app.get('/api/settings', (req, res) => res.json(publicSettings()));

app.get('/api/services', (req, res) => {
  res.json(db.services.filter((s) => s.active !== false));
});

app.get('/api/doctors', (req, res) => {
  res.json(db.doctors.filter((d) => d.active !== false));
});

// Booked time slots for a given date (so the form can disable taken times).
app.get('/api/availability', (req, res) => {
  const { date } = req.query;
  if (!isNonEmpty(date)) return res.json({ booked: [] });
  const booked = db.appointments
    .filter((a) => a.date === date && a.status !== 'cancelled')
    .map((a) => a.time);
  res.json({ booked });
});

// Create a reservation (public).
app.post('/api/appointments', bookingLimiter, (req, res) => {
  const { name, phone, email, serviceId, doctorId, date, time, message } =
    req.body || {};

  if (!isNonEmpty(name) || !isNonEmpty(phone) || !isNonEmpty(date) || !isNonEmpty(time)) {
    return res.status(400).json({ error: 'Name, phone, date and time are required.' });
  }
  if (name.length > 120 || phone.length > 40) {
    return res.status(400).json({ error: 'Input too long.' });
  }

  // Reject double-booking of the same slot.
  const clash = db.appointments.some(
    (a) => a.date === date && a.time === time && a.status !== 'cancelled'
  );
  if (clash) {
    return res.status(409).json({ error: 'This time slot is already booked.' });
  }

  const service = db.services.find((s) => s.id === Number(serviceId));
  const doctor = db.doctors.find((d) => d.id === Number(doctorId));

  const appointment = {
    id: store.nextId(),
    name: name.trim(),
    phone: phone.trim(),
    email: isNonEmpty(email) ? email.trim() : '',
    serviceId: service ? service.id : null,
    serviceName: service ? service.name : null,
    doctorId: doctor ? doctor.id : null,
    doctorName: doctor ? doctor.name : null,
    date,
    time,
    message: isNonEmpty(message) ? message.trim().slice(0, 1000) : '',
    status: 'pending',
    createdAt: new Date().toISOString(),
  };
  db.appointments.push(appointment);
  store.persist();
  res.status(201).json({ ok: true, id: appointment.id });
});

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------
app.post('/api/auth/login', authLimiter, (req, res) => {
  const { email, password } = req.body || {};
  if (!isNonEmpty(email) || !isNonEmpty(password)) {
    return res.status(400).json({ error: 'Email and password required.' });
  }
  const admin = db.admins.find((a) => a.email === email.toLowerCase().trim());
  if (!admin || !bcrypt.compareSync(password, admin.passwordHash)) {
    return res.status(401).json({ error: 'Invalid credentials.' });
  }
  res.json({ token: sign(admin), admin: { name: admin.name, email: admin.email, role: admin.role } });
});

app.get('/api/auth/me', auth, (req, res) => res.json({ admin: req.admin }));

// ---------------------------------------------------------------------------
// Admin API (protected)
// ---------------------------------------------------------------------------
app.get('/api/admin/stats', auth, (req, res) => {
  const appts = db.appointments;
  const today = new Date().toISOString().slice(0, 10);
  res.json({
    total: appts.length,
    pending: appts.filter((a) => a.status === 'pending').length,
    confirmed: appts.filter((a) => a.status === 'confirmed').length,
    today: appts.filter((a) => a.date === today && a.status !== 'cancelled').length,
    doctors: db.doctors.length,
    services: db.services.length,
  });
});

// --- Appointments ---
app.get('/api/admin/appointments', auth, (req, res) => {
  const { status, date } = req.query;
  let list = [...db.appointments];
  if (isNonEmpty(status)) list = list.filter((a) => a.status === status);
  if (isNonEmpty(date)) list = list.filter((a) => a.date === date);
  list.sort((a, b) => (a.date + a.time < b.date + b.time ? 1 : -1));
  res.json(list);
});

app.patch('/api/admin/appointments/:id', auth, (req, res) => {
  const appt = db.appointments.find((a) => a.id === Number(req.params.id));
  if (!appt) return res.status(404).json({ error: 'Not found' });
  const { status, note } = req.body || {};
  const allowed = ['pending', 'confirmed', 'completed', 'cancelled'];
  if (status && allowed.includes(status)) appt.status = status;
  if (typeof note === 'string') appt.adminNote = note.slice(0, 1000);
  store.persist();
  res.json(appt);
});

app.delete('/api/admin/appointments/:id', auth, (req, res) => {
  const i = db.appointments.findIndex((a) => a.id === Number(req.params.id));
  if (i === -1) return res.status(404).json({ error: 'Not found' });
  db.appointments.splice(i, 1);
  store.persist();
  res.json({ ok: true });
});

// --- Doctors CRUD ---
app.get('/api/admin/doctors', auth, (req, res) => res.json(db.doctors));

app.post('/api/admin/doctors', auth, (req, res) => {
  const { name, specialty, bio, photo, active } = req.body || {};
  if (!isNonEmpty(name)) return res.status(400).json({ error: 'Name required.' });
  const doctor = {
    id: store.nextId(),
    name: name.trim(),
    specialty: specialty || { az: '', en: '' },
    bio: bio || { az: '', en: '' },
    photo: isNonEmpty(photo) ? photo.trim() : '',
    active: active !== false,
  };
  db.doctors.push(doctor);
  store.persist();
  res.status(201).json(doctor);
});

app.put('/api/admin/doctors/:id', auth, (req, res) => {
  const doctor = db.doctors.find((d) => d.id === Number(req.params.id));
  if (!doctor) return res.status(404).json({ error: 'Not found' });
  const { name, specialty, bio, photo, active } = req.body || {};
  if (isNonEmpty(name)) doctor.name = name.trim();
  if (specialty) doctor.specialty = specialty;
  if (bio) doctor.bio = bio;
  if (photo !== undefined) doctor.photo = photo;
  if (active !== undefined) doctor.active = !!active;
  store.persist();
  res.json(doctor);
});

app.delete('/api/admin/doctors/:id', auth, (req, res) => {
  const i = db.doctors.findIndex((d) => d.id === Number(req.params.id));
  if (i === -1) return res.status(404).json({ error: 'Not found' });
  db.doctors.splice(i, 1);
  store.persist();
  res.json({ ok: true });
});

// --- Services CRUD ---
app.get('/api/admin/services', auth, (req, res) => res.json(db.services));

app.post('/api/admin/services', auth, (req, res) => {
  const { name, description, icon, durationMin, price, active } = req.body || {};
  if (!name || !isNonEmpty(name.az) && !isNonEmpty(name.en)) {
    return res.status(400).json({ error: 'Service name required.' });
  }
  const service = {
    id: store.nextId(),
    name,
    description: description || { az: '', en: '' },
    icon: isNonEmpty(icon) ? icon : '🦷',
    durationMin: Number(durationMin) || 30,
    price: price || '',
    active: active !== false,
  };
  db.services.push(service);
  store.persist();
  res.status(201).json(service);
});

app.put('/api/admin/services/:id', auth, (req, res) => {
  const service = db.services.find((s) => s.id === Number(req.params.id));
  if (!service) return res.status(404).json({ error: 'Not found' });
  const { name, description, icon, durationMin, price, active } = req.body || {};
  if (name) service.name = name;
  if (description) service.description = description;
  if (isNonEmpty(icon)) service.icon = icon;
  if (durationMin !== undefined) service.durationMin = Number(durationMin) || service.durationMin;
  if (price !== undefined) service.price = price;
  if (active !== undefined) service.active = !!active;
  store.persist();
  res.json(service);
});

app.delete('/api/admin/services/:id', auth, (req, res) => {
  const i = db.services.findIndex((s) => s.id === Number(req.params.id));
  if (i === -1) return res.status(404).json({ error: 'Not found' });
  db.services.splice(i, 1);
  store.persist();
  res.json({ ok: true });
});

// --- Settings ---
app.get('/api/admin/settings', auth, (req, res) => res.json(db.settings));

app.put('/api/admin/settings', auth, (req, res) => {
  const allowed = [
    'clinicName', 'tagline', 'phone', 'phone2', 'email', 'address',
    'instagram', 'website', 'mapsQuery', 'rating', 'reviewCount',
    'hours', 'slotMinutes',
  ];
  for (const key of allowed) {
    if (req.body[key] !== undefined) db.settings[key] = req.body[key];
  }
  store.persist();
  res.json(db.settings);
});

// --- Admin accounts (owner only) ---
app.get('/api/admin/admins', auth, (req, res) => {
  res.json(db.admins.map(({ passwordHash, ...rest }) => rest));
});

app.post('/api/admin/admins', auth, (req, res) => {
  if (req.admin.role !== 'owner') {
    return res.status(403).json({ error: 'Only the owner can add admins.' });
  }
  const { name, email, password, role } = req.body || {};
  if (!isNonEmpty(name) || !isNonEmpty(email) || !isNonEmpty(password)) {
    return res.status(400).json({ error: 'Name, email and password required.' });
  }
  if (db.admins.some((a) => a.email === email.toLowerCase().trim())) {
    return res.status(409).json({ error: 'Email already exists.' });
  }
  const admin = {
    id: store.nextId(),
    name: name.trim(),
    email: email.toLowerCase().trim(),
    passwordHash: bcrypt.hashSync(password, 10),
    role: role === 'owner' ? 'owner' : 'staff',
    createdAt: new Date().toISOString(),
  };
  db.admins.push(admin);
  store.persist();
  const { passwordHash, ...safe } = admin;
  res.status(201).json(safe);
});

app.delete('/api/admin/admins/:id', auth, (req, res) => {
  if (req.admin.role !== 'owner') {
    return res.status(403).json({ error: 'Only the owner can remove admins.' });
  }
  const id = Number(req.params.id);
  if (id === req.admin.id) return res.status(400).json({ error: 'You cannot delete yourself.' });
  const i = db.admins.findIndex((a) => a.id === id);
  if (i === -1) return res.status(404).json({ error: 'Not found' });
  db.admins.splice(i, 1);
  store.persist();
  res.json({ ok: true });
});

// ---------------------------------------------------------------------------
// Routing for SPA-ish pages
// ---------------------------------------------------------------------------
app.get('/admin', (req, res) =>
  res.sendFile(path.join(__dirname, 'public', 'admin.html'))
);

app.use((req, res) => {
  if (req.path.startsWith('/api/')) return res.status(404).json({ error: 'Not found' });
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`ProImplant running on http://localhost:${PORT}`);
  console.log(`Admin panel: http://localhost:${PORT}/admin`);
});
