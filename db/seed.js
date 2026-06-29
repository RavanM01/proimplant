/**
 * Seeds the database with the default admin account, clinic info, services
 * and doctors. Safe to run multiple times: it only fills in what is missing.
 *
 * Run with:  npm run seed
 */
const bcrypt = require('bcryptjs');
const store = require('./store');

const db = store.data;

// ---- Default admin ---------------------------------------------------------
const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || 'admin@proimplant.az').toLowerCase();
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'proimplant123';

if (!db.admins.some((a) => a.email === ADMIN_EMAIL)) {
  db.admins.push({
    id: store.nextId(),
    name: 'Administrator',
    email: ADMIN_EMAIL,
    passwordHash: bcrypt.hashSync(ADMIN_PASSWORD, 10),
    role: 'owner',
    createdAt: new Date().toISOString(),
  });
  console.log(`Created admin: ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}`);
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

// ---- Doctors ---------------------------------------------------------------
if (db.doctors.length === 0) {
  const doctors = [
    {
      name: 'Dr. Elvin Məmmədov',
      specialty: { az: 'İmplantoloq, Cərrah', en: 'Implantologist, Surgeon' },
      bio: {
        az: 'İmplantologiya və ağız cərrahiyyəsi üzrə 12 illik təcrübə.',
        en: '12 years of experience in implantology and oral surgery.',
      },
      photo: '',
    },
    {
      name: 'Dr. Aytən Hüseynova',
      specialty: { az: 'Estetik Stomatoloq', en: 'Aesthetic Dentist' },
      bio: {
        az: 'Vinir və təbəssüm dizaynı üzrə ixtisaslaşmışdır.',
        en: 'Specialized in veneers and smile design.',
      },
      photo: '',
    },
    {
      name: 'Dr. Rəşad Quliyev',
      specialty: { az: 'Terapevt, Ortoped', en: 'Therapist, Orthopedist' },
      bio: {
        az: 'Terapevtik və ortopedik müalicə üzrə mütəxəssis.',
        en: 'Specialist in therapeutic and orthopedic treatment.',
      },
      photo: '',
    },
  ];
  doctors.forEach((d) =>
    db.doctors.push({ id: store.nextId(), active: true, ...d })
  );
}

store.persist();
console.log('Seed complete.');
