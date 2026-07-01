/**
 * ProImplant Dental Clinic - Express server.
 * Serves the public website, the booking API and the protected admin API.
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const XLSX = require('xlsx');

const store = require('./db/store');
const notify = require('./db/notify');

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
function isNonEmpty(v) {
  return typeof v === 'string' && v.trim().length > 0;
}
function toMin(t) {
  const [h, m] = String(t || '').split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}
function apptDuration(a) {
  return Number(a.durationMin) || Number(db.settings.slotMinutes) || 30;
}
function rangesOverlap(s1, e1, s2, e2) {
  return s1 < e2 && s2 < e1;
}
function dayOfDate(date) {
  return new Date(date + 'T00:00:00').getDay();
}
// Extract a numeric fee from a free-text price label like "dən 400 AZN" -> 400.
function parsePrice(str) {
  if (typeof str !== 'string') return 0;
  const m = str.replace(',', '.').match(/\d+(\.\d+)?/);
  return m ? Number(m[0]) : 0;
}

function publicSettings() {
  const s = db.settings;
  return {
    clinicName: s.clinicName, tagline: s.tagline, phone: s.phone, phone2: s.phone2,
    email: s.email, address: s.address, instagram: s.instagram, website: s.website,
    mapsQuery: s.mapsQuery, rating: s.rating, reviewCount: s.reviewCount,
    hours: s.hours, slotMinutes: s.slotMinutes,
  };
}

// Public doctor view — never expose the doctor's email publicly.
function publicDoctor(d) {
  return {
    id: d.id, name: d.name, specialty: d.specialty, bio: d.bio,
    photo: d.photo, active: d.active, hours: d.hours || [],
  };
}

function sign(admin) {
  return jwt.sign(
    { id: admin.id, email: admin.email, role: admin.role, name: admin.name, doctorId: admin.doctorId || null },
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

// Staff = owner or staff (i.e. NOT a doctor account). Doctors are limited to
// their own appointments only.
function requireStaff(req, res, next) {
  if (req.admin.role === 'doctor') return res.status(403).json({ error: 'Not allowed for doctor accounts.' });
  next();
}
function requireOwner(req, res, next) {
  if (req.admin.role !== 'owner') return res.status(403).json({ error: 'Owner only.' });
  next();
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
  res.json(db.doctors.filter((d) => d.active !== false).map(publicDoctor));
});

// Booked ranges for a doctor on a date, so the form can block overlapping slots.
app.get('/api/availability', (req, res) => {
  const { date, doctorId } = req.query;
  if (!isNonEmpty(date) || !isNonEmpty(doctorId)) return res.json({ booked: [] });
  const did = Number(doctorId);
  const booked = db.appointments
    .filter((a) => a.doctorId === did && a.date === date && a.status !== 'cancelled')
    .map((a) => ({ time: a.time, durationMin: apptDuration(a) }));
  res.json({ booked });
});

// Create a reservation (public).
app.post('/api/appointments', bookingLimiter, (req, res) => {
  const { name, phone, email, serviceId, doctorId, date, time, message } = req.body || {};

  if (!isNonEmpty(name) || !isNonEmpty(phone) || !isNonEmpty(date) || !isNonEmpty(time)) {
    return res.status(400).json({ error: 'Name, phone, date and time are required.' });
  }
  if (name.length > 120 || phone.length > 40) {
    return res.status(400).json({ error: 'Input too long.' });
  }

  const doctor = db.doctors.find((d) => d.id === Number(doctorId));
  if (!doctor) return res.status(400).json({ error: 'Please select a doctor.' });

  const service = db.services.find((s) => s.id === Number(serviceId));
  const duration = service ? Number(service.durationMin) || 30 : Number(db.settings.slotMinutes) || 30;
  const start = toMin(time);
  const end = start + duration;

  // Must be within the selected doctor's working hours for that weekday.
  const wh = (doctor.hours || []).find((h) => h.day === dayOfDate(date));
  if (!wh || wh.closed) {
    return res.status(409).json({ error: 'The doctor is not available on this day.' });
  }
  if (start < toMin(wh.open) || end > toMin(wh.close)) {
    return res.status(409).json({ error: 'Selected time is outside the doctor\'s working hours.' });
  }

  // Reject any overlap with the same doctor's existing appointments (duration-aware).
  const clash = db.appointments.some(
    (a) =>
      a.doctorId === doctor.id &&
      a.date === date &&
      a.status !== 'cancelled' &&
      rangesOverlap(start, end, toMin(a.time), toMin(a.time) + apptDuration(a))
  );
  if (clash) {
    return res.status(409).json({ error: 'This time slot is already booked for this doctor.' });
  }

  const appointment = {
    id: store.nextId(),
    name: name.trim(),
    phone: phone.trim(),
    email: isNonEmpty(email) ? email.trim() : '',
    serviceId: service ? service.id : null,
    serviceName: service ? service.name : null,
    durationMin: duration,
    priceHint: service ? parsePrice(service.price) : 0,
    doctorId: doctor.id,
    doctorName: doctor.name,
    date,
    time,
    message: isNonEmpty(message) ? message.trim().slice(0, 1000) : '',
    status: 'pending',
    createdAt: new Date().toISOString(),
  };
  db.appointments.push(appointment);
  store.persist();

  // Notify the doctor by email (fire-and-forget; never blocks the booking).
  const svcName = service ? (service.name.az || service.name.en) : '—';
  notify.sendMail({
    to: doctor.email,
    subject: `Yeni rezervasiya — ${date} ${time}`,
    text:
      `Yeni onlayn rezervasiya:\n\n` +
      `Pasiyent: ${appointment.name}\n` +
      `Telefon: ${appointment.phone}\n` +
      `Xidmət: ${svcName} (${duration} dəq)\n` +
      `Tarix: ${date} ${time}\n` +
      (appointment.message ? `Qeyd: ${appointment.message}\n` : '') +
      `\nAdmin panel: ${db.settings.website || ''}/admin`,
  }).catch(() => {});

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
  res.json({
    token: sign(admin),
    admin: { name: admin.name, email: admin.email, role: admin.role, doctorId: admin.doctorId || null },
  });
});

app.get('/api/auth/me', auth, (req, res) => res.json({ admin: req.admin }));

// ---------------------------------------------------------------------------
// Admin API (protected)
// ---------------------------------------------------------------------------
app.get('/api/admin/stats', auth, (req, res) => {
  const isDoctor = req.admin.role === 'doctor';
  const appts = isDoctor
    ? db.appointments.filter((a) => a.doctorId === req.admin.doctorId)
    : db.appointments;
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

// --- Reports (staff/owner) ---
app.get('/api/admin/reports', auth, requireStaff, (req, res) => {
  const { from, to } = req.query;
  let list = [...db.appointments];
  if (isNonEmpty(from)) list = list.filter((a) => a.date >= from);
  if (isNonEmpty(to)) list = list.filter((a) => a.date <= to);

  const byStatus = { pending: 0, confirmed: 0, completed: 0, cancelled: 0 };
  list.forEach((a) => { byStatus[a.status] = (byStatus[a.status] || 0) + 1; });

  const byDoctor = db.doctors
    .map((d) => {
      const items = list.filter((a) => a.doctorId === d.id);
      return {
        id: d.id, name: d.name, total: items.length,
        confirmed: items.filter((a) => a.status === 'confirmed').length,
        completed: items.filter((a) => a.status === 'completed').length,
        cancelled: items.filter((a) => a.status === 'cancelled').length,
      };
    })
    .sort((a, b) => b.total - a.total);

  const svcMap = {};
  list.forEach((a) => {
    const n = a.serviceName ? (a.serviceName.az || a.serviceName.en) : '—';
    svcMap[n] = (svcMap[n] || 0) + 1;
  });
  const byService = Object.entries(svcMap)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  const byDay = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    byDay.push({ date: key, count: db.appointments.filter((a) => a.date === key && a.status !== 'cancelled').length });
  }

  res.json({ total: list.length, byStatus, byDoctor, byService, byDay });
});

// --- Appointments ---
app.get('/api/admin/appointments', auth, (req, res) => {
  const { status, date } = req.query;
  let list = [...db.appointments];
  if (req.admin.role === 'doctor') list = list.filter((a) => a.doctorId === req.admin.doctorId);
  if (isNonEmpty(status)) list = list.filter((a) => a.status === status);
  if (isNonEmpty(date)) list = list.filter((a) => a.date === date);
  list.sort((a, b) => (a.date + a.time < b.date + b.time ? 1 : -1));
  res.json(list);
});

app.patch('/api/admin/appointments/:id', auth, (req, res) => {
  const appt = db.appointments.find((a) => a.id === Number(req.params.id));
  if (!appt) return res.status(404).json({ error: 'Not found' });
  if (req.admin.role === 'doctor' && appt.doctorId !== req.admin.doctorId) {
    return res.status(403).json({ error: 'You can only manage your own appointments.' });
  }
  const { status, note } = req.body || {};
  const allowed = ['pending', 'confirmed', 'completed', 'cancelled'];
  const prevStatus = appt.status;
  if (status && allowed.includes(status)) appt.status = status;
  if (typeof note === 'string') appt.adminNote = note.slice(0, 1000);

  // When completing, record the payment (asked in the admin "Done" dialog).
  if (status === 'completed' && req.body.amountTotal !== undefined) {
    const total = Math.max(0, Number(req.body.amountTotal) || 0);
    const pstatus = req.body.paymentStatus;
    let paid = 0;
    if (pstatus === 'paid') paid = total;
    else if (pstatus === 'installment') paid = Math.max(0, Math.min(total, Number(req.body.amountPaid) || 0));
    else paid = 0; // debt
    appt.amountTotal = total;
    appt.amountPaid = paid;
    appt.paymentStatus = paid >= total && total > 0 ? 'paid' : (paid > 0 ? 'installment' : 'debt');
    appt.paidAt = new Date().toISOString();
  }
  store.persist();

  // SMS the patient when the status meaningfully changes.
  if (status && status !== prevStatus && ['confirmed', 'cancelled', 'completed'].includes(status)) {
    const msgs = {
      confirmed: `Hörmətli ${appt.name}, ${appt.date} ${appt.time} tarixli qəbulunuz TƏSDİQLƏNDİ. ProImplant`,
      cancelled: `Hörmətli ${appt.name}, ${appt.date} ${appt.time} tarixli qəbulunuz LƏĞV edildi. Ətraflı: ${db.settings.phone || ''}. ProImplant`,
      completed: `Hörmətli ${appt.name}, bizi seçdiyiniz üçün təşəkkür edirik! Sağlam təbəssümlər. ProImplant`,
    };
    notify.sendSms({ to: appt.phone, body: msgs[status] }).catch(() => {});
  }

  res.json(appt);
});

app.delete('/api/admin/appointments/:id', auth, requireStaff, (req, res) => {
  const i = db.appointments.findIndex((a) => a.id === Number(req.params.id));
  if (i === -1) return res.status(404).json({ error: 'Not found' });
  db.appointments.splice(i, 1);
  store.persist();
  res.json({ ok: true });
});

// Record an additional payment (settle a debt or pay an installment).
app.post('/api/admin/appointments/:id/payment', auth, requireStaff, (req, res) => {
  const appt = db.appointments.find((a) => a.id === Number(req.params.id));
  if (!appt) return res.status(404).json({ error: 'Not found' });
  const amount = Number(req.body.amount);
  if (isNaN(amount) || amount <= 0) return res.status(400).json({ error: 'Enter a valid amount.' });
  const total = Number(appt.amountTotal) || 0;
  appt.amountPaid = Math.min(total, (Number(appt.amountPaid) || 0) + amount);
  appt.paymentStatus = appt.amountPaid >= total && total > 0 ? 'paid' : (appt.amountPaid > 0 ? 'installment' : 'debt');
  store.persist();
  res.json(appt);
});

// ---------------------------------------------------------------------------
// Finance
// ---------------------------------------------------------------------------
function financeData({ from, to }) {
  let list = db.appointments.filter((a) => a.amountTotal != null && Number(a.amountTotal) > 0);
  if (isNonEmpty(from)) list = list.filter((a) => a.date >= from);
  if (isNonEmpty(to)) list = list.filter((a) => a.date <= to);

  const docMap = {};
  db.doctors.forEach((d) => {
    docMap[d.id] = { id: d.id, name: d.name, count: 0, billed: 0, collected: 0, debt: 0 };
  });

  let billed = 0, collected = 0;
  list.forEach((a) => {
    const total = Number(a.amountTotal) || 0;
    const paid = Number(a.amountPaid) || 0;
    billed += total;
    collected += paid;
    const m = docMap[a.doctorId] ||
      (docMap[a.doctorId] = { id: a.doctorId, name: a.doctorName || '—', count: 0, billed: 0, collected: 0, debt: 0 });
    m.count += 1;
    m.billed += total;
    m.collected += paid;
    m.debt += total - paid;
  });

  const byDoctor = Object.values(docMap).filter((d) => d.count > 0)
    .sort((a, b) => b.collected - a.collected);

  const rows = list
    .slice()
    .sort((a, b) => (a.date + a.time < b.date + b.time ? 1 : -1))
    .map((a) => ({
      date: a.date, time: a.time, patient: a.name, phone: a.phone,
      doctor: a.doctorName || '',
      service: a.serviceName ? (a.serviceName.az || a.serviceName.en || '') : '',
      total: Number(a.amountTotal) || 0,
      paid: Number(a.amountPaid) || 0,
      debt: (Number(a.amountTotal) || 0) - (Number(a.amountPaid) || 0),
      paymentStatus: a.paymentStatus || '',
      id: a.id,
    }));

  return {
    summary: { billed, collected, debt: billed - collected, count: list.length },
    byDoctor,
    rows,
  };
}

app.get('/api/admin/finance', auth, requireStaff, (req, res) => {
  res.json(financeData(req.query));
});

app.get('/api/admin/finance/export', auth, requireStaff, (req, res) => {
  const data = financeData(req.query);
  const period = `${req.query.from || 'başlanğıc'} — ${req.query.to || 'bu gün'}`;

  const wb = XLSX.utils.book_new();

  const summarySheet = XLSX.utils.aoa_to_sheet([
    ['ProImplant — Maliyyə hesabatı'],
    ['Dövr', period],
    [],
    ['Ümumi hesablanmış (billed)', data.summary.billed],
    ['Yığılmış (collected)', data.summary.collected],
    ['Borc (debt)', data.summary.debt],
    ['Əməliyyat sayı', data.summary.count],
  ]);
  XLSX.utils.book_append_sheet(wb, summarySheet, 'Xülasə');

  const doctorSheet = XLSX.utils.json_to_sheet(
    data.byDoctor.map((d) => ({
      Həkim: d.name, 'Qəbul sayı': d.count, 'Hesablanmış': d.billed,
      'Yığılmış': d.collected, 'Borc': d.debt,
    }))
  );
  XLSX.utils.book_append_sheet(wb, doctorSheet, 'Həkimlər üzrə');

  const txSheet = XLSX.utils.json_to_sheet(
    data.rows.map((r) => ({
      Tarix: r.date, Saat: r.time, Pasiyent: r.patient, Telefon: r.phone,
      Həkim: r.doctor, Xidmət: r.service, 'Məbləğ': r.total,
      'Ödənilib': r.paid, 'Borc': r.debt, 'Status': r.paymentStatus,
    }))
  );
  XLSX.utils.book_append_sheet(wb, txSheet, 'Əməliyyatlar');

  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  res.setHeader('Content-Disposition', 'attachment; filename="proimplant-finance.xlsx"');
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.send(buf);
});

// --- Doctors CRUD (staff/owner) ---
app.get('/api/admin/doctors', auth, requireStaff, (req, res) => res.json(db.doctors));

function normalizeHours(hours) {
  if (!Array.isArray(hours)) return undefined;
  return [0, 1, 2, 3, 4, 5, 6].map((day) => {
    const h = hours.find((x) => Number(x.day) === day) || {};
    return { day, open: h.open || '', close: h.close || '', closed: !!h.closed };
  });
}

app.post('/api/admin/doctors', auth, requireStaff, (req, res) => {
  const { name, email, specialty, bio, photo, active, hours } = req.body || {};
  if (!isNonEmpty(name)) return res.status(400).json({ error: 'Name required.' });
  const doctor = {
    id: store.nextId(),
    name: name.trim(),
    email: isNonEmpty(email) ? email.trim() : '',
    specialty: specialty || { az: '', en: '' },
    bio: bio || { az: '', en: '' },
    photo: isNonEmpty(photo) ? photo.trim() : '',
    active: active !== false,
    hours: normalizeHours(hours) || [0, 1, 2, 3, 4, 5, 6].map((day) => ({
      day, open: day === 0 ? '' : '10:00', close: day === 0 ? '' : '19:00', closed: day === 0,
    })),
  };
  db.doctors.push(doctor);
  store.persist();
  res.status(201).json(doctor);
});

app.put('/api/admin/doctors/:id', auth, requireStaff, (req, res) => {
  const doctor = db.doctors.find((d) => d.id === Number(req.params.id));
  if (!doctor) return res.status(404).json({ error: 'Not found' });
  const { name, email, specialty, bio, photo, active, hours } = req.body || {};
  if (isNonEmpty(name)) doctor.name = name.trim();
  if (email !== undefined) doctor.email = email.trim();
  if (specialty) doctor.specialty = specialty;
  if (bio) doctor.bio = bio;
  if (photo !== undefined) doctor.photo = photo;
  if (active !== undefined) doctor.active = !!active;
  const nh = normalizeHours(hours);
  if (nh) doctor.hours = nh;
  store.persist();
  res.json(doctor);
});

app.delete('/api/admin/doctors/:id', auth, requireStaff, (req, res) => {
  const i = db.doctors.findIndex((d) => d.id === Number(req.params.id));
  if (i === -1) return res.status(404).json({ error: 'Not found' });
  db.doctors.splice(i, 1);
  store.persist();
  res.json({ ok: true });
});

// --- Services CRUD (staff/owner) ---
app.get('/api/admin/services', auth, requireStaff, (req, res) => res.json(db.services));

app.post('/api/admin/services', auth, requireStaff, (req, res) => {
  const { name, description, icon, durationMin, price, active } = req.body || {};
  if (!name || (!isNonEmpty(name.az) && !isNonEmpty(name.en))) {
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

app.put('/api/admin/services/:id', auth, requireStaff, (req, res) => {
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

app.delete('/api/admin/services/:id', auth, requireStaff, (req, res) => {
  const i = db.services.findIndex((s) => s.id === Number(req.params.id));
  if (i === -1) return res.status(404).json({ error: 'Not found' });
  db.services.splice(i, 1);
  store.persist();
  res.json({ ok: true });
});

// --- Settings (staff/owner) ---
app.get('/api/admin/settings', auth, requireStaff, (req, res) => res.json(db.settings));

app.put('/api/admin/settings', auth, requireStaff, (req, res) => {
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
app.get('/api/admin/admins', auth, requireStaff, (req, res) => {
  res.json(db.admins.map(({ passwordHash, ...rest }) => rest));
});

app.post('/api/admin/admins', auth, requireOwner, (req, res) => {
  const { name, email, password, role, doctorId } = req.body || {};
  if (!isNonEmpty(name) || !isNonEmpty(email) || !isNonEmpty(password)) {
    return res.status(400).json({ error: 'Name, email and password required.' });
  }
  if (db.admins.some((a) => a.email === email.toLowerCase().trim())) {
    return res.status(409).json({ error: 'Email already exists.' });
  }
  const finalRole = ['owner', 'staff', 'doctor'].includes(role) ? role : 'staff';
  let linkedDoctorId = null;
  if (finalRole === 'doctor') {
    const doc = db.doctors.find((d) => d.id === Number(doctorId));
    if (!doc) return res.status(400).json({ error: 'Select which doctor this account belongs to.' });
    linkedDoctorId = doc.id;
  }
  const admin = {
    id: store.nextId(),
    name: name.trim(),
    email: email.toLowerCase().trim(),
    passwordHash: bcrypt.hashSync(password, 10),
    role: finalRole,
    doctorId: linkedDoctorId,
    createdAt: new Date().toISOString(),
  };
  db.admins.push(admin);
  store.persist();
  const { passwordHash, ...safe } = admin;
  res.status(201).json(safe);
});

app.delete('/api/admin/admins/:id', auth, requireOwner, (req, res) => {
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
