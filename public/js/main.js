/* ProImplant — public site logic: i18n, data loading, booking form. */

const I18N = {
  az: {
    'nav.services': 'Xidmətlər', 'nav.doctors': 'Həkimlər', 'nav.why': 'Niyə biz',
    'nav.location': 'Ünvan', 'nav.book': 'Qəbula yazıl',
    'hero.reviews': 'rəy',
    'hero.script': 'Təbəssümünüz bizim sənətimizdir',
    'hero.title': 'Sağlam və gözəl təbəssüm burada başlayır',
    'hero.subtitle': 'Sumqayıtda müasir dental implantasiya, estetik stomatologiya və ağız cərrahiyyəsi. Təcrübəli həkimlər, müasir avadanlıq.',
    'hero.cta1': 'Onlayn qəbula yazıl', 'hero.cta2': 'Xidmətlər',
    'hero.stat1': 'il təcrübə', 'hero.stat2': 'məmnun xəstə', 'hero.stat3': 'reytinq',
    'hero.cardTitle': 'Klinika məlumatı', 'hero.cardBtn': 'Qəbula yazıl',
    'services.eyebrow': 'Xidmətlərimiz', 'services.title': 'Tam stomatoloji xidmətlər',
    'services.subtitle': 'İmplantologiyadan estetik stomatologiyaya qədər bütün müalicə növləri bir yerdə.',
    'doctors.eyebrow': 'Komandamız', 'doctors.title': 'Təcrübəli həkimlərimiz',
    'doctors.subtitle': 'Peşəkar və qayğıkeş mütəxəssislər sizə xidmət göstərir.',
    'why.eyebrow': 'Üstünlüklər', 'why.title': 'Niyə ProImplant?',
    'why.1t': 'Müasir avadanlıq', 'why.1p': 'Ən son texnologiyalar və 3D diaqnostika.',
    'why.2t': 'Təcrübəli həkimlər', 'why.2p': 'Beynəlxalq təlim keçmiş mütəxəssislər.',
    'why.3t': 'Tam sterilizasiya', 'why.3p': 'Yüksək gigiyena və təhlükəsizlik standartları.',
    'why.4t': 'Münasib qiymət', 'why.4p': 'Şəffaf qiymətlər və hissə-hissə ödəniş.',
    'booking.title': 'Onlayn qəbula yazılın',
    'booking.subtitle': 'Formu doldurun, biz ən qısa zamanda sizinlə əlaqə saxlayaq və qəbulu təsdiqləyək.',
    'booking.formTitle': 'Qəbul üçün müraciət', 'booking.formSub': 'Bütün məcburi xanaları (*) doldurun.',
    'form.name': 'Ad, Soyad *', 'form.phone': 'Telefon *', 'form.email': 'E-mail',
    'form.service': 'Xidmət *', 'form.doctor': 'Həkim *', 'form.date': 'Tarix *',
    'form.time': 'Saat *', 'form.message': 'Qeyd', 'form.submit': 'Qəbulu təsdiqlə',
    'form.selectDoctor': 'Həkim seçin', 'form.selectService': 'Xidmət seçin', 'form.pickTime': 'Saat seçin',
    'form.pickPrereq': 'Əvvəlcə xidmət, həkim və tarix seçin', 'form.doctorClosed': 'Həkim bu gün qəbul etmir',
    'form.success': '✅ Müraciətiniz qəbul olundu! Tezliklə sizinlə əlaqə saxlayacağıq.',
    'form.error': 'Xəta baş verdi. Yenidən cəhd edin.',
    'form.slotTaken': 'Bu saat artıq doludur. Başqa saat seçin.',
    'form.required': 'Zəhmət olmasa məcburi xanaları (xidmət, həkim, tarix, saat) doldurun.',
    'form.noSlots': 'Bu gün üçün boş saat yoxdur',
    'location.eyebrow': 'Ünvan', 'location.title': 'Bizi tapın', 'location.addr': 'Ünvan',
    'location.phone': 'Telefon', 'location.hours': 'İş saatları', 'location.directions': 'Marşrutu göstər',
    'footer.about': 'Sumqayıtda müasir stomatoloji klinika. Sağlamlığınız bizim prioritetimizdir.',
    'footer.links': 'Keçidlər', 'footer.contact': 'Əlaqə', 'footer.admin': 'Admin paneli',
    'status.open': '● Açıqdır', 'status.closed': '● Bağlıdır',
    'price.from': 'dən', 'min': 'dəq',
    days: ['Bazar', 'Bazar ertəsi', 'Çərşənbə axşamı', 'Çərşənbə', 'Cümə axşamı', 'Cümə', 'Şənbə'],
    'closed': 'Bağlı',
  },
  en: {
    'nav.services': 'Services', 'nav.doctors': 'Doctors', 'nav.why': 'Why us',
    'nav.location': 'Location', 'nav.book': 'Book now',
    'hero.reviews': 'reviews',
    'hero.script': 'Your smile is our craft',
    'hero.title': 'A healthy, beautiful smile starts here',
    'hero.subtitle': 'Modern dental implants, aesthetic dentistry and oral surgery in Sumqayit. Experienced doctors, modern equipment.',
    'hero.cta1': 'Book online', 'hero.cta2': 'Our services',
    'hero.stat1': 'years experience', 'hero.stat2': 'happy patients', 'hero.stat3': 'rating',
    'hero.cardTitle': 'Clinic info', 'hero.cardBtn': 'Book appointment',
    'services.eyebrow': 'Our services', 'services.title': 'Complete dental care',
    'services.subtitle': 'From implantology to aesthetic dentistry — every treatment in one place.',
    'doctors.eyebrow': 'Our team', 'doctors.title': 'Experienced doctors',
    'doctors.subtitle': 'Professional and caring specialists at your service.',
    'why.eyebrow': 'Advantages', 'why.title': 'Why ProImplant?',
    'why.1t': 'Modern equipment', 'why.1p': 'Latest technology and 3D diagnostics.',
    'why.2t': 'Experienced doctors', 'why.2p': 'Internationally trained specialists.',
    'why.3t': 'Full sterilization', 'why.3p': 'High hygiene and safety standards.',
    'why.4t': 'Affordable prices', 'why.4p': 'Transparent pricing and installments.',
    'booking.title': 'Book an appointment online',
    'booking.subtitle': 'Fill out the form and we will contact you shortly to confirm your appointment.',
    'booking.formTitle': 'Appointment request', 'booking.formSub': 'Fill in all required (*) fields.',
    'form.name': 'Full name *', 'form.phone': 'Phone *', 'form.email': 'E-mail',
    'form.service': 'Service *', 'form.doctor': 'Doctor *', 'form.date': 'Date *',
    'form.time': 'Time *', 'form.message': 'Note', 'form.submit': 'Confirm appointment',
    'form.selectDoctor': 'Select a doctor', 'form.selectService': 'Select a service', 'form.pickTime': 'Select a time',
    'form.pickPrereq': 'First choose service, doctor and date', 'form.doctorClosed': 'Doctor is not available this day',
    'form.success': '✅ Your request has been received! We will contact you soon.',
    'form.error': 'Something went wrong. Please try again.',
    'form.slotTaken': 'This time is already booked. Please choose another.',
    'form.required': 'Please fill in the required fields (service, doctor, date, time).',
    'form.noSlots': 'No free slots for this day',
    'location.eyebrow': 'Location', 'location.title': 'Find us', 'location.addr': 'Address',
    'location.phone': 'Phone', 'location.hours': 'Working hours', 'location.directions': 'Get directions',
    'footer.about': 'A modern dental clinic in Sumqayit. Your health is our priority.',
    'footer.links': 'Links', 'footer.contact': 'Contact', 'footer.admin': 'Admin panel',
    'status.open': '● Open now', 'status.closed': '● Closed now',
    'price.from': 'from', 'min': 'min',
    days: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
    'closed': 'Closed',
  },
};

let lang = localStorage.getItem('lang') || 'az';
let settings = null;
let services = [];
let doctors = [];

const t = (key) => (I18N[lang] && I18N[lang][key]) || key;
const localized = (obj) => (obj && (obj[lang] || obj.az || obj.en)) || '';
const $ = (sel) => document.querySelector(sel);

// Escape any admin-entered content before injecting into HTML (prevents XSS).
const esc = (s) =>
  String(s == null ? '' : s).replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])
  );

// Timezone-aware "today" and current time (clinic timezone from settings).
let TZ = 'Asia/Baku';
const todayTz = () => new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(new Date());
const nowTzMinutes = () => {
  const p = {};
  new Intl.DateTimeFormat('en-CA', { timeZone: TZ, hour: '2-digit', minute: '2-digit', hour12: false })
    .formatToParts(new Date()).forEach((x) => (p[x.type] = x.value));
  const hh = p.hour === '24' ? 0 : Number(p.hour);
  return hh * 60 + Number(p.minute);
};

function applyI18n() {
  document.documentElement.lang = lang;
  document.querySelectorAll('[data-i18n]').forEach((el) => {
    el.textContent = t(el.dataset.i18n);
  });
  document.querySelectorAll('.lang-toggle button').forEach((b) =>
    b.classList.toggle('active', b.dataset.lang === lang)
  );
}

async function fetchJSON(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error('Request failed');
  return res.json();
}

// --- Render functions -------------------------------------------------------
function renderSettings() {
  if (!settings) return;
  if (settings.timezone) TZ = settings.timezone;
  $('#heroRating').textContent = settings.rating || '4.8';
  $('#heroReviews').textContent = settings.reviewCount || '';
  $('#hcAddress').textContent = localized(settings.address);
  $('#hcPhone').textContent = settings.phone;
  $('#hcPhone').href = 'tel:' + (settings.phone || '').replace(/\s/g, '');
  $('#hcInsta').href = settings.instagram || '#';
  $('#chipPhone').textContent = '📞 ' + settings.phone;
  $('#chipPhone').href = 'tel:' + (settings.phone || '').replace(/\s/g, '');
  $('#chipInsta').href = settings.instagram || '#';
  $('#locAddress').textContent = localized(settings.address);
  $('#locPhone').textContent = settings.phone;
  $('#locPhone').href = 'tel:' + (settings.phone || '').replace(/\s/g, '');
  $('#locEmail').textContent = settings.email;
  $('#locEmail').href = 'mailto:' + settings.email;
  $('#footPhone').textContent = settings.phone;
  $('#footPhone').href = 'tel:' + (settings.phone || '').replace(/\s/g, '');
  $('#footAddress').textContent = localized(settings.address);
  $('#footInsta').href = settings.instagram || '#';

  const mapsQuery = encodeURIComponent(settings.mapsQuery || localized(settings.address));
  $('#mapFrame').src = `https://www.google.com/maps?q=${mapsQuery}&output=embed`;
  $('#locDirections').href = `https://www.google.com/maps/search/?api=1&query=${mapsQuery}`;

  renderHours();
}

function renderHours() {
  if (!settings || !settings.hours) return;
  const today = new Date().getDay();
  const days = I18N[lang].days;
  const rows = settings.hours
    .slice()
    .sort((a, b) => ((a.day + 6) % 7) - ((b.day + 6) % 7)) // Mon first
    .map((h) => {
      const isToday = h.day === today ? ' today' : '';
      const val = h.closed
        ? `<span class="closed">${t('closed')}</span>`
        : `${h.open} – ${h.close}`;
      return `<div class="row${isToday}"><span>${days[h.day]}</span><span>${val}</span></div>`;
    })
    .join('');
  $('#hoursTable').innerHTML = rows;

  // hero card hours summary + open/closed status
  const todayH = settings.hours.find((h) => h.day === today);
  let statusText = '';
  if (todayH && !todayH.closed) {
    const now = new Date();
    const cur = now.getHours() * 60 + now.getMinutes();
    const [oh, om] = todayH.open.split(':').map(Number);
    const [ch, cm] = todayH.close.split(':').map(Number);
    const isOpen = cur >= oh * 60 + om && cur <= ch * 60 + cm;
    statusText = isOpen ? t('status.open') : t('status.closed');
    $('#hcHours').textContent = `${days[today]}: ${todayH.open}–${todayH.close}`;
  } else {
    statusText = t('status.closed');
    $('#hcHours').textContent = `${days[today]}: ${t('closed')}`;
  }
  $('#hcStatus').textContent = statusText;
  $('#hcStatus').style.color = statusText.includes('●') && statusText === t('status.open') ? 'var(--ok)' : 'var(--danger)';
  $('#locHours').textContent = settings.hours
    .filter((h) => !h.closed)
    .map((h) => `${days[h.day].slice(0,2)} ${h.open}-${h.close}`)
    .join(', ');
}

function renderServices() {
  $('#servicesGrid').innerHTML = services
    .map(
      (s) => `
    <div class="service-card">
      <div class="ic">${esc(s.icon) || '🦷'}</div>
      <h3>${esc(localized(s.name))}</h3>
      <p>${esc(localized(s.description))}</p>
      <div class="meta">
        <span class="price">${esc(s.price || '')}</span>
        <span class="dur">⏱ ${Number(s.durationMin) || 0} ${t('min')}</span>
      </div>
    </div>`
    )
    .join('');

  const sel = $('#formService');
  sel.innerHTML =
    `<option value="">${t('form.selectService')}</option>` +
    services.map((s) => `<option value="${s.id}">${esc(localized(s.name))}</option>`).join('');
}

function renderDoctors() {
  $('#doctorsGrid').innerHTML = doctors
    .map(
      (d) => `
    <div class="doctor-card">
      <div class="doctor-photo">${d.photo ? `<img src="${esc(d.photo)}" alt="${esc(d.name)}">` : '👨‍⚕️'}</div>
      <div class="body">
        <h3>${esc(d.name)}</h3>
        <div class="spec">${esc(localized(d.specialty))}</div>
        <div class="bio">${esc(localized(d.bio))}</div>
      </div>
    </div>`
    )
    .join('');

  const sel = $('#formDoctor');
  sel.innerHTML =
    `<option value="">${t('form.selectDoctor')}</option>` +
    doctors.map((d) => `<option value="${d.id}">${esc(d.name)}</option>`).join('');
}

// --- Booking time slots (duration-aware, per selected doctor) ----------------
const toMin = (str) => {
  const [h, m] = String(str || '').split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
};
const fmt = (min) =>
  `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;
const getDoctorById = (id) => doctors.find((d) => d.id === Number(id));
const getServiceById = (id) => services.find((s) => s.id === Number(id));

async function refreshTimeSlots() {
  const timeSel = $('#formTime');
  const doctorId = $('#formDoctor').value;
  const serviceId = $('#formService').value;
  const date = $('#formDate').value;

  // Need doctor + date (and service, for its duration) before we can offer slots.
  if (!doctorId || !date || !serviceId) {
    timeSel.innerHTML = `<option value="">${t('form.pickPrereq')}</option>`;
    return;
  }

  const doctor = getDoctorById(doctorId);
  const service = getServiceById(serviceId);
  const duration = (service && Number(service.durationMin)) || (settings.slotMinutes || 30);
  const step = settings.slotMinutes || 30;

  // The selected doctor's working window for that weekday.
  const day = new Date(date + 'T00:00').getDay();
  const wh = (doctor.hours || []).find((x) => x.day === day);
  if (!wh || wh.closed || !wh.open || !wh.close) {
    timeSel.innerHTML = `<option value="">${t('form.doctorClosed')}</option>`;
    return;
  }
  const open = toMin(wh.open);
  const close = toMin(wh.close);

  // Existing bookings for that doctor/date, as [start, end) minute ranges.
  let booked = [];
  try {
    const data = await fetchJSON(
      `/api/availability?date=${encodeURIComponent(date)}&doctorId=${encodeURIComponent(doctorId)}`
    );
    booked = (data.booked || []).map((b) => ({
      s: toMin(b.time),
      e: toMin(b.time) + (Number(b.durationMin) || step),
    }));
  } catch {}

  // For today, don't offer times that have already passed (clinic timezone).
  const minStart = date === todayTz() ? nowTzMinutes() : -1;
  const available = [];
  for (let m = open; m + duration <= close; m += step) {
    if (m < minStart) continue;
    const overlaps = booked.some((r) => m < r.e && r.s < m + duration);
    if (!overlaps) available.push(fmt(m));
  }

  if (!available.length) {
    timeSel.innerHTML = `<option value="">${t('form.noSlots')}</option>`;
  } else {
    timeSel.innerHTML =
      `<option value="">${t('form.pickTime')}</option>` +
      available.map((s) => `<option value="${s}">${s}</option>`).join('');
  }
}

// --- Booking submit ---------------------------------------------------------
async function submitBooking(e) {
  e.preventDefault();
  const form = e.target;
  const msg = $('#formMsg');
  const btn = $('#submitBtn');
  const data = Object.fromEntries(new FormData(form).entries());

  if (!data.name || !data.phone || !data.serviceId || !data.doctorId || !data.date || !data.time) {
    showMsg('error', t('form.required'));
    return;
  }
  btn.disabled = true;
  try {
    const res = await fetch('/api/appointments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const out = await res.json();
    if (res.ok) {
      showMsg('success', t('form.success'));
      form.reset();
      await refreshTimeSlots();
    } else if (res.status === 409) {
      // Server returns a specific reason (already booked / outside hours / closed).
      showMsg('error', out.error || t('form.slotTaken'));
      await refreshTimeSlots();
    } else {
      showMsg('error', out.error || t('form.error'));
    }
  } catch {
    showMsg('error', t('form.error'));
  } finally {
    btn.disabled = false;
  }
}

function showMsg(type, text) {
  const msg = $('#formMsg');
  msg.className = `form-msg show ${type}`;
  msg.textContent = text;
  msg.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

// --- Init -------------------------------------------------------------------
function setupDate() {
  const d = $('#formDate');
  d.min = todayTz();
  d.addEventListener('change', refreshTimeSlots);
  // Slots depend on doctor + service + date, so recompute when any changes.
  $('#formDoctor').addEventListener('change', refreshTimeSlots);
  $('#formService').addEventListener('change', refreshTimeSlots);
}

function setLang(newLang) {
  lang = newLang;
  localStorage.setItem('lang', lang);
  applyI18n();
  renderSettings();
  renderServices();
  renderDoctors();
  refreshTimeSlots();
}

async function init() {
  $('#year').textContent = new Date().getFullYear();
  applyI18n();
  setupDate();

  document.querySelectorAll('.lang-toggle button').forEach((b) =>
    b.addEventListener('click', () => setLang(b.dataset.lang))
  );
  $('#menuToggle').addEventListener('click', () =>
    $('#navLinks').classList.toggle('open')
  );
  document.querySelectorAll('.nav-links a').forEach((a) =>
    a.addEventListener('click', () => $('#navLinks').classList.remove('open'))
  );
  $('#bookingForm').addEventListener('submit', submitBooking);

  try {
    [settings, services, doctors] = await Promise.all([
      fetchJSON('/api/settings'),
      fetchJSON('/api/services'),
      fetchJSON('/api/doctors'),
    ]);
    renderSettings();
    renderServices();
    renderDoctors();
  } catch (err) {
    console.error('Failed to load clinic data', err);
  }
}

init();
