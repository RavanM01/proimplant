/**
 * ProImplant Dental Clinic - Express server.
 * Serves the public website, the booking API and the protected admin API.
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const fs = require('fs');
const crypto = require('crypto');
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const ExcelJS = require('exceljs');

const store = require('./db/store');
const notify = require('./db/notify');

// Ensure the database is seeded on first boot (idempotent).
require('./db/seed');

const app = express();
const PORT = process.env.PORT || 3000;
const CLINIC_TZ = process.env.CLINIC_TZ || 'Asia/Baku';

// --- JWT secret: use env if set, otherwise a persistent random secret on disk
// (so sessions survive restarts and there is no insecure hardcoded default).
function resolveJwtSecret() {
  const env = process.env.JWT_SECRET;
  if (env && env !== 'change-this-secret-in-production' && env !== 'please-change-this-to-a-long-random-string') {
    return env;
  }
  const f = path.join(store.DATA_DIR, '.jwtsecret');
  try {
    if (fs.existsSync(f)) return fs.readFileSync(f, 'utf8').trim();
    const secret = crypto.randomBytes(32).toString('hex');
    fs.writeFileSync(f, secret);
    console.warn(`[warn] JWT_SECRET not set — generated a persistent one at ${f}. Set JWT_SECRET in production.`);
    return secret;
  } catch {
    console.warn('[warn] JWT_SECRET not set and could not persist one — using an ephemeral secret (sessions reset on restart).');
    return crypto.randomBytes(32).toString('hex');
  }
}
const JWT_SECRET = resolveJwtSecret();

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
  // Weekday of a YYYY-MM-DD date, timezone-independent (parsed as UTC midday).
  return new Date(date + 'T12:00:00Z').getUTCDay();
}
// Current date + minutes in the clinic's timezone (fixes UTC/off-by-one bugs).
function nowInClinicTz() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: CLINIC_TZ, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false,
  }).formatToParts(new Date());
  const o = {};
  parts.forEach((p) => (o[p.type] = p.value));
  const hh = o.hour === '24' ? 0 : Number(o.hour);
  return { date: `${o.year}-${o.month}-${o.day}`, minutes: hh * 60 + Number(o.minute) };
}
function todayLocal() {
  return nowInClinicTz().date;
}
function parsePrice(str) {
  if (typeof str !== 'string') return 0;
  const m = str.replace(',', '.').match(/\d+(\.\d+)?/);
  return m ? Number(m[0]) : 0;
}
function sumPayments(a) {
  return (a.payments || []).reduce((s, p) => s + (Number(p.amount) || 0), 0);
}

function publicSettings() {
  const s = db.settings;
  return {
    clinicName: s.clinicName, tagline: s.tagline, phone: s.phone, phone2: s.phone2,
    email: s.email, address: s.address, instagram: s.instagram, website: s.website,
    mapsQuery: s.mapsQuery, rating: s.rating, reviewCount: s.reviewCount,
    hours: s.hours, slotMinutes: s.slotMinutes, timezone: CLINIC_TZ,
  };
}

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

app.get('/api/availability', (req, res) => {
  const { date, doctorId } = req.query;
  if (!isNonEmpty(date) || !isNonEmpty(doctorId)) return res.json({ booked: [] });
  const did = Number(doctorId);
  const booked = db.appointments
    .filter((a) => a.doctorId === did && a.date === date && a.status !== 'cancelled')
    .map((a) => ({ time: a.time, durationMin: apptDuration(a) }));
  res.json({ booked });
});

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

  // Reject bookings in the past (clinic timezone).
  const now = nowInClinicTz();
  if (date < now.date || (date === now.date && start < now.minutes)) {
    return res.status(409).json({ error: 'This time is in the past. Please pick a future slot.' });
  }

  const wh = (doctor.hours || []).find((h) => h.day === dayOfDate(date));
  if (!wh || wh.closed) {
    return res.status(409).json({ error: 'The doctor is not available on this day.' });
  }
  if (start < toMin(wh.open) || end > toMin(wh.close)) {
    return res.status(409).json({ error: "Selected time is outside the doctor's working hours." });
  }

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

// Change your own password.
app.post('/api/auth/password', auth, (req, res) => {
  const { currentPassword, newPassword } = req.body || {};
  if (!isNonEmpty(newPassword) || newPassword.length < 6) {
    return res.status(400).json({ error: 'New password must be at least 6 characters.' });
  }
  const admin = db.admins.find((a) => a.id === req.admin.id);
  if (!admin) return res.status(404).json({ error: 'Account not found.' });
  if (!bcrypt.compareSync(currentPassword || '', admin.passwordHash)) {
    return res.status(401).json({ error: 'Current password is incorrect.' });
  }
  admin.passwordHash = bcrypt.hashSync(newPassword, 10);
  store.persist();
  res.json({ ok: true });
});

// ---------------------------------------------------------------------------
// Admin API (protected)
// ---------------------------------------------------------------------------
app.get('/api/admin/stats', auth, (req, res) => {
  const isDoctor = req.admin.role === 'doctor';
  const appts = isDoctor
    ? db.appointments.filter((a) => a.doctorId === req.admin.doctorId)
    : db.appointments;
  const today = todayLocal();
  res.json({
    total: appts.length,
    pending: appts.filter((a) => a.status === 'pending').length,
    confirmed: appts.filter((a) => a.status === 'confirmed').length,
    today: appts.filter((a) => a.date === today && a.status !== 'cancelled').length,
    doctors: db.doctors.length,
    services: db.services.length,
  });
});

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
  const base = todayLocal();
  for (let i = 13; i >= 0; i--) {
    const d = new Date(base + 'T12:00:00Z');
    d.setUTCDate(d.getUTCDate() - i);
    const key = d.toISOString().slice(0, 10);
    byDay.push({ date: key, count: db.appointments.filter((a) => a.date === key && a.status !== 'cancelled').length });
  }

  res.json({ total: list.length, byStatus, byDoctor, byService, byDay });
});

// --- Appointments ---
app.get('/api/admin/appointments', auth, (req, res) => {
  const { status, date } = req.query;
  const limit = Math.min(Number(req.query.limit) || 300, 2000);
  let list = [...db.appointments];
  if (req.admin.role === 'doctor') list = list.filter((a) => a.doctorId === req.admin.doctorId);
  if (isNonEmpty(status)) list = list.filter((a) => a.status === status);
  if (isNonEmpty(date)) list = list.filter((a) => a.date === date);
  list.sort((a, b) => (a.date + a.time < b.date + b.time ? 1 : -1));
  res.json(list.slice(0, limit));
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
    let firstPaid = 0;
    if (pstatus === 'paid') firstPaid = total;
    else if (pstatus === 'installment') firstPaid = Math.max(0, Math.min(total, Number(req.body.amountPaid) || 0));
    appt.amountTotal = total;
    appt.payments = firstPaid > 0
      ? [{ amount: firstPaid, at: new Date().toISOString(), date: todayLocal() }]
      : [];
    appt.amountPaid = Math.min(total, sumPayments(appt));
    appt.paymentStatus = appt.amountPaid >= total && total > 0 ? 'paid' : (appt.amountPaid > 0 ? 'installment' : 'debt');
    appt.paidAt = new Date().toISOString();
  }
  store.persist();

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
  if (!Array.isArray(appt.payments)) appt.payments = [];
  appt.payments.push({ amount, at: new Date().toISOString(), date: todayLocal() });
  appt.amountPaid = Math.min(total, sumPayments(appt));
  appt.paymentStatus = appt.amountPaid >= total && total > 0 ? 'paid' : (appt.amountPaid > 0 ? 'installment' : 'debt');
  store.persist();
  res.json(appt);
});

// ---------------------------------------------------------------------------
// Finance — billed by service date, collected by PAYMENT date (accurate cash).
// ---------------------------------------------------------------------------
function financeData({ from, to }) {
  const inRange = (d) => (!isNonEmpty(from) || d >= from) && (!isNonEmpty(to) || d <= to);
  const billedList = db.appointments.filter((a) => a.amountTotal != null && Number(a.amountTotal) > 0);

  const docMap = {};
  const doc = (id, name) =>
    (docMap[id] ||= { id, name: name || '—', count: 0, billed: 0, collected: 0, debt: 0 });
  db.doctors.forEach((d) => doc(d.id, d.name));

  let billed = 0, collected = 0, debt = 0, count = 0;

  // Billed + outstanding debt: by service (appointment) date.
  billedList.forEach((a) => {
    if (!inRange(a.date)) return;
    const total = Number(a.amountTotal) || 0;
    const paid = Math.min(total, sumPayments(a));
    billed += total;
    debt += total - paid;
    count += 1;
    const m = doc(a.doctorId, a.doctorName);
    m.count += 1;
    m.billed += total;
    m.debt += total - paid;
  });

  // Collected: by the date the money actually came in (payment date).
  db.appointments.forEach((a) => {
    (a.payments || []).forEach((p) => {
      const pd = p.date || (a.paidAt || '').slice(0, 10) || a.date;
      if (!inRange(pd)) return;
      collected += Number(p.amount) || 0;
      doc(a.doctorId, a.doctorName).collected += Number(p.amount) || 0;
    });
  });

  const byDoctor = Object.values(docMap)
    .filter((d) => d.count > 0 || d.collected > 0)
    .sort((a, b) => b.collected - a.collected);

  const rows = billedList
    .filter((a) => inRange(a.date))
    .sort((a, b) => (a.date + a.time < b.date + b.time ? 1 : -1))
    .map((a) => {
      const total = Number(a.amountTotal) || 0;
      const paid = Math.min(total, sumPayments(a));
      return {
        id: a.id, date: a.date, time: a.time, patient: a.name, phone: a.phone,
        doctor: a.doctorName || '',
        service: a.serviceName ? (a.serviceName.az || a.serviceName.en || '') : '',
        total, paid, debt: total - paid, paymentStatus: a.paymentStatus || '',
      };
    });

  const payments = [];
  db.appointments.forEach((a) => {
    (a.payments || []).forEach((p) => {
      const pd = p.date || (a.paidAt || '').slice(0, 10) || a.date;
      if (inRange(pd)) {
        payments.push({ date: pd, patient: a.name, doctor: a.doctorName || '', amount: Number(p.amount) || 0 });
      }
    });
  });

  return { summary: { billed, collected, debt, count }, byDoctor, rows, payments };
}

app.get('/api/admin/finance', auth, requireStaff, (req, res) => {
  res.json(financeData(req.query));
});

app.get('/api/admin/finance/export', auth, requireStaff, async (req, res) => {
  try {
    const data = financeData(req.query);
    const period = `${req.query.from || 'başlanğıc'} — ${req.query.to || 'bu gün'}`;
    const wb = new ExcelJS.Workbook();
    wb.creator = 'ProImplant';

    const s1 = wb.addWorksheet('Xülasə');
    s1.columns = [{ width: 32 }, { width: 18 }];
    s1.addRows([
      ['ProImplant — Maliyyə hesabatı'],
      ['Dövr', period],
      [],
      ['Ümumi hesablanmış (billed)', data.summary.billed],
      ['Yığılmış (collected)', data.summary.collected],
      ['Borc (debt)', data.summary.debt],
      ['Əməliyyat sayı', data.summary.count],
    ]);
    s1.getRow(1).font = { bold: true, size: 14 };

    const s2 = wb.addWorksheet('Həkimlər üzrə');
    s2.columns = [
      { header: 'Həkim', key: 'name', width: 28 },
      { header: 'Qəbul sayı', key: 'count', width: 12 },
      { header: 'Hesablanmış', key: 'billed', width: 14 },
      { header: 'Yığılmış', key: 'collected', width: 14 },
      { header: 'Borc', key: 'debt', width: 14 },
    ];
    data.byDoctor.forEach((d) => s2.addRow(d));
    s2.getRow(1).font = { bold: true };

    const s3 = wb.addWorksheet('Əməliyyatlar');
    s3.columns = [
      { header: 'Tarix', key: 'date', width: 12 },
      { header: 'Saat', key: 'time', width: 8 },
      { header: 'Pasiyent', key: 'patient', width: 22 },
      { header: 'Telefon', key: 'phone', width: 16 },
      { header: 'Həkim', key: 'doctor', width: 22 },
      { header: 'Xidmət', key: 'service', width: 22 },
      { header: 'Məbləğ', key: 'total', width: 12 },
      { header: 'Ödənilib', key: 'paid', width: 12 },
      { header: 'Borc', key: 'debt', width: 12 },
      { header: 'Status', key: 'paymentStatus', width: 12 },
    ];
    data.rows.forEach((r) => s3.addRow(r));
    s3.getRow(1).font = { bold: true };

    const s4 = wb.addWorksheet('Ödənişlər');
    s4.columns = [
      { header: 'Ödəniş tarixi', key: 'date', width: 14 },
      { header: 'Pasiyent', key: 'patient', width: 22 },
      { header: 'Həkim', key: 'doctor', width: 22 },
      { header: 'Məbləğ', key: 'amount', width: 12 },
    ];
    data.payments.forEach((p) => s4.addRow(p));
    s4.getRow(1).font = { bold: true };

    res.setHeader('Content-Disposition', 'attachment; filename="proimplant-finance.xlsx"');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    await wb.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error('[export:error]', err.message);
    res.status(500).json({ error: 'Export failed.' });
  }
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
  const id = Number(req.params.id);
  const i = db.doctors.findIndex((d) => d.id === id);
  if (i === -1) return res.status(404).json({ error: 'Not found' });
  db.doctors.splice(i, 1);
  // Cascade: remove any login accounts linked to this doctor (no orphans).
  const removed = db.admins.filter((a) => a.role === 'doctor' && a.doctorId === id).length;
  db.admins = db.admins.filter((a) => !(a.role === 'doctor' && a.doctorId === id));
  store.persist();
  res.json({ ok: true, removedAccounts: removed });
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
    const docExists = db.doctors.find((d) => d.id === Number(doctorId));
    if (!docExists) return res.status(400).json({ error: 'Select which doctor this account belongs to.' });
    linkedDoctorId = docExists.id;
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

// Owner resets another account's password.
app.put('/api/admin/admins/:id/password', auth, requireOwner, (req, res) => {
  const admin = db.admins.find((a) => a.id === Number(req.params.id));
  if (!admin) return res.status(404).json({ error: 'Not found' });
  const { password } = req.body || {};
  if (!isNonEmpty(password) || password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters.' });
  }
  admin.passwordHash = bcrypt.hashSync(password, 10);
  store.persist();
  res.json({ ok: true });
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
// Routing
// ---------------------------------------------------------------------------
app.get('/admin', (req, res) =>
  res.sendFile(path.join(__dirname, 'public', 'admin.html'))
);

app.use((req, res) => {
  if (req.path.startsWith('/api/')) return res.status(404).json({ error: 'Not found' });
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Daily database backup (on startup + every 24h). Keeps the last 30 days.
store.backup();
setInterval(() => store.backup(), 24 * 60 * 60 * 1000);

app.listen(PORT, () => {
  console.log(`ProImplant running on http://localhost:${PORT} (timezone: ${CLINIC_TZ})`);
  console.log(`Admin panel: http://localhost:${PORT}/admin`);
});
