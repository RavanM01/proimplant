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
    'form.service': 'Xidmət', 'form.doctor': 'Həkim', 'form.date': 'Tarix *',
    'form.time': 'Saat *', 'form.message': 'Qeyd', 'form.submit': 'Qəbulu təsdiqlə',
    'form.anyDoctor': 'Fərqi yoxdur', 'form.selectService': 'Xidmət seçin', 'form.pickTime': 'Saat seçin',
    'form.success': '✅ Müraciətiniz qəbul olundu! Tezliklə sizinlə əlaqə saxlayacağıq.',
    'form.error': 'Xəta baş verdi. Yenidən cəhd edin.',
    'form.slotTaken': 'Bu saat artıq doludur. Başqa saat seçin.',
    'form.required': 'Zəhmət olmasa məcburi xanaları doldurun.',
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
    'form.service': 'Service', 'form.doctor': 'Doctor', 'form.date': 'Date *',
    'form.time': 'Time *', 'form.message': 'Note', 'form.submit': 'Confirm appointment',
    'form.anyDoctor': 'No preference', 'form.selectService': 'Select a service', 'form.pickTime': 'Select a time',
    'form.success': '✅ Your request has been received! We will contact you soon.',
    'form.error': 'Something went wrong. Please try again.',
    'form.slotTaken': 'This time is already booked. Please choose another.',
    'form.required': 'Please fill in the required fields.',
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
      <div class="ic">${s.icon || '🦷'}</div>
      <h3>${localized(s.name)}</h3>
      <p>${localized(s.description)}</p>
      <div class="meta">
        <span class="price">${s.price ? s.price : ''}</span>
        <span class="dur">⏱ ${s.durationMin} ${t('min')}</span>
      </div>
    </div>`
    )
    .join('');

  const sel = $('#formService');
  sel.innerHTML =
    `<option value="">${t('form.selectService')}</option>` +
    services.map((s) => `<option value="${s.id}">${localized(s.name)}</option>`).join('');
}

function renderDoctors() {
  $('#doctorsGrid').innerHTML = doctors
    .map(
      (d) => `
    <div class="doctor-card">
      <div class="doctor-photo">${d.photo ? `<img src="${d.photo}" alt="${d.name}">` : '👨‍⚕️'}</div>
      <div class="body">
        <h3>${d.name}</h3>
        <div class="spec">${localized(d.specialty)}</div>
        <div class="bio">${localized(d.bio)}</div>
      </div>
    </div>`
    )
    .join('');

  const sel = $('#formDoctor');
  sel.innerHTML =
    `<option value="">${t('form.anyDoctor')}</option>` +
    doctors.map((d) => `<option value="${d.id}">${d.name}</option>`).join('');
}

// --- Booking time slots -----------------------------------------------------
function generateSlots() {
  if (!settings) return [];
  const date = $('#formDate').value;
  if (!date) return [];
  const day = new Date(date + 'T00:00').getDay();
  const h = settings.hours.find((x) => x.day === day);
  if (!h || h.closed) return [];
  const step = settings.slotMinutes || 30;
  const [oh, om] = h.open.split(':').map(Number);
  const [ch, cm] = h.close.split(':').map(Number);
  const slots = [];
  for (let m = oh * 60 + om; m + step <= ch * 60 + cm; m += step) {
    slots.push(`${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`);
  }
  return slots;
}

async function refreshTimeSlots() {
  const date = $('#formDate').value;
  const timeSel = $('#formTime');
  const slots = generateSlots();
  let booked = [];
  if (date) {
    try {
      const data = await fetchJSON('/api/availability?date=' + encodeURIComponent(date));
      booked = data.booked || [];
    } catch {}
  }
  const available = slots.filter((s) => !booked.includes(s));
  if (available.length === 0) {
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

  if (!data.name || !data.phone || !data.date || !data.time) {
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
      showMsg('error', t('form.slotTaken'));
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
  const today = new Date().toISOString().slice(0, 10);
  d.min = today;
  d.addEventListener('change', refreshTimeSlots);
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
