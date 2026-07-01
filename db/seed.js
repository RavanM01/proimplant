/**
 * Seeds the database with the default admin account, clinic info, services
 * and doctors. Safe to run multiple times: it only fills in what is missing.
 *
 * Run with:  npm run seed
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const bcrypt = require('bcryptjs');
const store = require('./store');

const db = store.data;

// ---- Default admin ---------------------------------------------------------
const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || 'admin@proimplant.az').toLowerCase();
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'proimplant123';

const existingAdmin = db.admins.find((a) => a.email === ADMIN_EMAIL);
if (!existingAdmin) {
  db.admins.push({
    id: store.nextId(),
    name: 'Administrator',
    email: ADMIN_EMAIL,
    passwordHash: bcrypt.hashSync(ADMIN_PASSWORD, 10),
    role: 'owner',
    createdAt: new Date().toISOString(),
  });
  console.log(`Created admin: ${ADMIN_EMAIL}`);
} else if (
  process.env.ADMIN_FORCE_PASSWORD === 'true' &&
  process.env.ADMIN_PASSWORD &&
  !bcrypt.compareSync(process.env.ADMIN_PASSWORD, existingAdmin.passwordHash)
) {
  // Recovery path only: reset the bootstrap admin's password from the env var,
  // but ONLY when ADMIN_FORCE_PASSWORD=true is set. Normally the password is
  // NOT touched on boot (so password changes made in the panel persist).
  existingAdmin.passwordHash = bcrypt.hashSync(process.env.ADMIN_PASSWORD, 10);
  console.log(`Reset password for ${ADMIN_EMAIL} (ADMIN_FORCE_PASSWORD=true).`);
}

// ---- Clinic settings -------------------------------------------------------
if (!db.settings || !db.settings.clinicName) {
  db.settings = {
    clinicName: 'ProImplant',
    tagline: { az: 'Sumqayıt Stomatoloji Klinikası', en: 'Sumqayit Dental Clinic' },
    phone: '010 334 03 03',
    phone2: '051 800 03 03',
    email: 'info@proimplant.az',
    address: {
      az: 'Səməd Vurğun, 1-ci mkr, 145-ci bina, Sumqayıt 5000',
      en: 'Samad Vurghun, 1st mkr, building 145, Sumqayit 5000',
    },
    instagram: 'https://www.instagram.com/pro_implant/',
    website: 'https://proimplant.az',
    mapsQuery: 'ProImplant Sumqayit Stomatoloji Klinika',
    rating: '4.8',
    reviewCount: '34',
    // hours: 0 = Sunday ... 6 = Saturday
    hours: [
      { day: 0, open: '', close: '', closed: true },
      { day: 1, open: '10:00', close: '19:00', closed: false },
      { day: 2, open: '10:00', close: '19:00', closed: false },
      { day: 3, open: '10:00', close: '19:00', closed: false },
      { day: 4, open: '10:00', close: '19:00', closed: false },
      { day: 5, open: '10:00', close: '19:00', closed: false },
      { day: 6, open: '10:00', close: '17:00', closed: false },
    ],
    slotMinutes: 30,
  };
}

// ---- Services --------------------------------------------------------------
if (db.services.length === 0) {
  const services = [
    {
      icon: '🦷',
      name: { az: 'Dental İmplantasiya', en: 'Dental Implants' },
      description: {
        az: 'İtirilmiş dişlərin müasir implant sistemləri ilə bərpası.',
        en: 'Restoration of missing teeth with modern implant systems.',
      },
      durationMin: 60,
      price: 'dən 400 AZN',
    },
    {
      icon: '✨',
      name: { az: 'Estetik Stomatologiya', en: 'Aesthetic Dentistry' },
      description: {
        az: 'Vinirlər, lüminirlər və mükəmməl təbəssüm dizaynı.',
        en: 'Veneers, lumineers and perfect smile design.',
      },
      durationMin: 45,
      price: 'dən 250 AZN',
    },
    {
      icon: '🔧',
      name: { az: 'Ağız Cərrahiyyəsi', en: 'Oral Surgery' },
      description: {
        az: 'Diş çəkilməsi, 20 yaş dişləri və cərrahi əməliyyatlar.',
        en: 'Tooth extraction, wisdom teeth and surgical procedures.',
      },
      durationMin: 45,
      price: 'dən 50 AZN',
    },
    {
      icon: '👑',
      name: { az: 'Protezləşdirmə', en: 'Prosthetics & Crowns' },
      description: {
        az: 'Sirkonium qapaqlar, körpülər və müasir protezlər.',
        en: 'Zirconium crowns, bridges and modern prosthetics.',
      },
      durationMin: 45,
      price: 'dən 200 AZN',
    },
    {
      icon: '🪥',
      name: { az: 'Terapevtik Müalicə', en: 'Therapeutic Treatment' },
      description: {
        az: 'Kariyesin müalicəsi, plomb və kanal müalicəsi.',
        en: 'Caries treatment, fillings and root canal treatment.',
      },
      durationMin: 40,
      price: 'dən 40 AZN',
    },
    {
      icon: '🌟',
      name: { az: 'Dişlərin Ağardılması', en: 'Teeth Whitening' },
      description: {
        az: 'Peşəkar ağardma ilə daha ağ və parlaq təbəssüm.',
        en: 'Whiter and brighter smile with professional whitening.',
      },
      durationMin: 60,
      price: 'dən 150 AZN',
    },
  ];
  services.forEach((s) =>
    db.services.push({ id: store.nextId(), active: true, ...s })
  );
}

// Default per-doctor working hours (Mon–Sat 10:00–19:00, Sunday closed).
function defaultDoctorHours() {
  return [0, 1, 2, 3, 4, 5, 6].map((day) => ({
    day,
    open: day === 0 ? '' : '10:00',
    close: day === 0 ? '' : '19:00',
    closed: day === 0,
  }));
}

// ---- Doctors ---------------------------------------------------------------
if (db.doctors.length === 0) {
  const doctors = [
    {
      name: 'Dr. Elvin Məmmədov',
      email: 'elvin@proimplant.az',
      specialty: { az: 'İmplantoloq, Cərrah', en: 'Implantologist, Surgeon' },
      bio: {
        az: 'İmplantologiya və ağız cərrahiyyəsi üzrə 12 illik təcrübə.',
        en: '12 years of experience in implantology and oral surgery.',
      },
      photo: '',
    },
    {
      name: 'Dr. Aytən Hüseynova',
      email: 'ayten@proimplant.az',
      specialty: { az: 'Estetik Stomatoloq', en: 'Aesthetic Dentist' },
      bio: {
        az: 'Vinir və təbəssüm dizaynı üzrə ixtisaslaşmışdır.',
        en: 'Specialized in veneers and smile design.',
      },
      photo: '',
    },
    {
      name: 'Dr. Rəşad Quliyev',
      email: 'reshad@proimplant.az',
      specialty: { az: 'Terapevt, Ortoped', en: 'Therapist, Orthopedist' },
      bio: {
        az: 'Terapevtik və ortopedik müalicə üzrə mütəxəssis.',
        en: 'Specialist in therapeutic and orthopedic treatment.',
      },
      photo: '',
    },
  ];
  doctors.forEach((d) =>
    db.doctors.push({ id: store.nextId(), active: true, hours: defaultDoctorHours(), ...d })
  );
}

// ---- Migrations (backfill fields on data seeded before these features) -----
db.doctors.forEach((d) => {
  if (!Array.isArray(d.hours) || d.hours.length === 0) d.hours = defaultDoctorHours();
  if (d.email === undefined) d.email = '';
});
db.admins.forEach((a) => {
  if (a.doctorId === undefined) a.doctorId = null;
});
// Backfill a payments[] history for appointments recorded before that feature.
db.appointments.forEach((a) => {
  if (a.amountTotal != null && !Array.isArray(a.payments)) {
    const paid = Number(a.amountPaid) || 0;
    a.payments = paid > 0
      ? [{ amount: paid, at: a.paidAt || a.createdAt || new Date().toISOString(), date: (a.paidAt || a.createdAt || '').slice(0, 10) || a.date }]
      : [];
  }
});

store.persist();
console.log('Seed complete.');
