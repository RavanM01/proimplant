/* ProImplant — admin panel logic. */

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
let token = localStorage.getItem('token') || '';
let me = null;
let cache = { doctors: [], services: [], settings: null };

const $ = (s) => document.querySelector(s);
const esc = (s) =>
  String(s == null ? '' : s).replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])
  );

// --- API helper -------------------------------------------------------------
async function api(path, opts = {}) {
  const res = await fetch('/api' + path, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer ' + token,
      ...(opts.headers || {}),
    },
  });
  if (res.status === 401) {
    logout();
    throw new Error('Session expired');
  }
  const data = res.status === 204 ? {} : await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

function toast(msg, type = '') {
  const el = $('#toast');
  el.textContent = msg;
  el.className = 'toast show ' + type;
  setTimeout(() => (el.className = 'toast ' + type), 2600);
}

// --- Auth -------------------------------------------------------------------
async function login(e) {
  e.preventDefault();
  const err = $('#loginErr');
  err.classList.remove('show');
  $('#loginBtn').disabled = true;
  try {
    const out = await (await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: $('#loginEmail').value,
        password: $('#loginPassword').value,
      }),
    }).then(async (r) => {
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Login failed');
      return { json: () => d };
    })).json();
    token = out.token;
    localStorage.setItem('token', token);
    me = out.admin;
    showApp();
  } catch (e2) {
    err.textContent = e2.message;
    err.classList.add('show');
  } finally {
    $('#loginBtn').disabled = false;
  }
}

function logout() {
  token = '';
  localStorage.removeItem('token');
  $('#app').classList.remove('show');
  $('#loginWrap').style.display = 'grid';
}

async function showApp() {
  $('#loginWrap').style.display = 'none';
  $('#app').classList.add('show');
  $('#whoName').textContent = me ? me.name : '';
  await loadAll();
  switchView('dashboard');
}

// --- Views ------------------------------------------------------------------
function switchView(view) {
  document.querySelectorAll('.view').forEach((v) => v.classList.remove('active'));
  $('#view-' + view).classList.add('active');
  document.querySelectorAll('.sidebar nav a[data-view]').forEach((a) =>
    a.classList.toggle('active', a.dataset.view === view)
  );
  $('#viewTitle').textContent = { dashboard: 'Dashboard', appointments: 'Appointments',
    doctors: 'Doctors', services: 'Services', settings: 'Clinic settings', admins: 'Admins' }[view];
  if (view === 'dashboard') renderDashboard();
  if (view === 'appointments') loadAppointments();
  if (view === 'doctors') renderDoctors();
  if (view === 'services') renderServices();
  if (view === 'settings') renderSettings();
  if (view === 'admins') loadAdmins();
}

async function loadAll() {
  try {
    const [doctors, services, settings] = await Promise.all([
      api('/admin/doctors'),
      api('/admin/services'),
      api('/admin/settings'),
    ]);
    cache = { doctors, services, settings };
  } catch (e) { console.error(e); }
}

// --- Dashboard --------------------------------------------------------------
async function renderDashboard() {
  try {
    const stats = await api('/admin/stats');
    $('#statsGrid').innerHTML = [
      ['Today', stats.today, 'accent'],
      ['Pending', stats.pending, ''],
      ['Confirmed', stats.confirmed, ''],
      ['Total bookings', stats.total, ''],
      ['Doctors', stats.doctors, ''],
      ['Services', stats.services, ''],
    ].map(([l, n, c]) => `<div class="stat-card ${c}"><div class="n">${n}</div><div class="l">${l}</div></div>`).join('');

    const appts = await api('/admin/appointments');
    $('#recentApptsWrap').innerHTML = apptTable(appts.slice(0, 8));
    bindApptActions();
  } catch (e) { toast(e.message, 'error'); }
}

// --- Appointments -----------------------------------------------------------
async function loadAppointments() {
  const status = $('#filterStatus').value;
  const date = $('#filterDate').value;
  const q = new URLSearchParams();
  if (status) q.set('status', status);
  if (date) q.set('date', date);
  try {
    const appts = await api('/admin/appointments?' + q.toString());
    $('#apptsWrap').innerHTML = apptTable(appts);
    bindApptActions();
  } catch (e) { toast(e.message, 'error'); }
}

function apptTable(appts) {
  if (!appts.length) return '<div class="empty">No appointments yet.</div>';
  return `<table><thead><tr>
    <th>Date / Time</th><th>Patient</th><th>Contact</th><th>Service</th><th>Doctor</th><th>Status</th><th>Actions</th>
    </tr></thead><tbody>${appts.map((a) => {
      const sName = a.serviceName ? (a.serviceName.en || a.serviceName.az || '') : '—';
      return `<tr>
        <td><b>${esc(a.date)}</b><br><span style="color:var(--muted)">${esc(a.time)}</span></td>
        <td>${esc(a.name)}${a.message ? `<br><small style="color:var(--muted)">📝 ${esc(a.message)}</small>` : ''}</td>
        <td><a href="tel:${esc(a.phone)}">${esc(a.phone)}</a>${a.email ? `<br><small>${esc(a.email)}</small>` : ''}</td>
        <td>${esc(sName)}</td>
        <td>${esc(a.doctorName || '—')}</td>
        <td><span class="badge ${a.status}">${a.status}</span></td>
        <td><div class="row-actions">
          ${a.status !== 'confirmed' ? `<button class="btn btn-sm btn-info" data-act="confirmed" data-id="${a.id}">Confirm</button>` : ''}
          ${a.status !== 'completed' ? `<button class="btn btn-sm btn-success" data-act="completed" data-id="${a.id}">Done</button>` : ''}
          ${a.status !== 'cancelled' ? `<button class="btn btn-sm btn-ghost" data-act="cancelled" data-id="${a.id}">Cancel</button>` : ''}
          <button class="btn btn-sm btn-danger" data-del="${a.id}">Delete</button>
        </div></td>
      </tr>`;
    }).join('')}</tbody></table>`;
}

function bindApptActions() {
  document.querySelectorAll('[data-act]').forEach((b) =>
    b.addEventListener('click', async () => {
      try {
        await api('/admin/appointments/' + b.dataset.id, {
          method: 'PATCH',
          body: JSON.stringify({ status: b.dataset.act }),
        });
        toast('Updated', 'success');
        refreshCurrentView();
      } catch (e) { toast(e.message, 'error'); }
    })
  );
  document.querySelectorAll('[data-del]').forEach((b) =>
    b.addEventListener('click', async () => {
      if (!confirm('Delete this appointment?')) return;
      try {
        await api('/admin/appointments/' + b.dataset.del, { method: 'DELETE' });
        toast('Deleted', 'success');
        refreshCurrentView();
      } catch (e) { toast(e.message, 'error'); }
    })
  );
}

function refreshCurrentView() {
  const active = document.querySelector('.sidebar nav a.active');
  if (active) switchView(active.dataset.view);
}

// --- Doctors ----------------------------------------------------------------
function renderDoctors() {
  const d = cache.doctors;
  $('#doctorsWrap').innerHTML = !d.length
    ? '<div class="empty">No doctors yet.</div>'
    : `<table><thead><tr><th>Name</th><th>Specialty</th><th>Status</th><th>Actions</th></tr></thead><tbody>${
        d.map((x) => `<tr>
          <td><b>${esc(x.name)}</b></td>
          <td>${esc((x.specialty && x.specialty.en) || (x.specialty && x.specialty.az) || '')}</td>
          <td><span class="badge ${x.active === false ? 'off' : 'on'}">${x.active === false ? 'Hidden' : 'Active'}</span></td>
          <td><div class="row-actions">
            <button class="btn btn-sm btn-ghost" data-edit-doc="${x.id}">Edit</button>
            <button class="btn btn-sm btn-danger" data-del-doc="${x.id}">Delete</button>
          </div></td></tr>`).join('')
      }</tbody></table>`;
  document.querySelectorAll('[data-edit-doc]').forEach((b) =>
    b.addEventListener('click', () => doctorModal(cache.doctors.find((x) => x.id == b.dataset.editDoc)))
  );
  document.querySelectorAll('[data-del-doc]').forEach((b) =>
    b.addEventListener('click', async () => {
      if (!confirm('Delete this doctor?')) return;
      await api('/admin/doctors/' + b.dataset.delDoc, { method: 'DELETE' });
      cache.doctors = await api('/admin/doctors');
      renderDoctors();
      toast('Deleted', 'success');
    })
  );
}

function doctorModal(doc) {
  const d = doc || { name: '', specialty: {}, bio: {}, photo: '', active: true };
  openModal(`
    <h3>${doc ? 'Edit' : 'Add'} doctor</h3>
    <div class="field"><label>Full name</label><input id="dName" value="${esc(d.name)}" /></div>
    <div class="grid2">
      <div class="field"><label>Specialty (AZ)</label><input id="dSpecAz" value="${esc(d.specialty?.az)}" /></div>
      <div class="field"><label>Specialty (EN)</label><input id="dSpecEn" value="${esc(d.specialty?.en)}" /></div>
    </div>
    <div class="field"><label>Bio (AZ)</label><textarea id="dBioAz">${esc(d.bio?.az)}</textarea></div>
    <div class="field"><label>Bio (EN)</label><textarea id="dBioEn">${esc(d.bio?.en)}</textarea></div>
    <div class="field"><label>Photo URL (optional)</label><input id="dPhoto" value="${esc(d.photo)}" /></div>
    <div class="field"><label><input type="checkbox" id="dActive" ${d.active === false ? '' : 'checked'} style="width:auto;margin-right:6px">Show on website</label></div>
    <div class="modal-actions">
      <button class="btn btn-ghost" onclick="closeModal()">Cancel</button>
      <button class="btn btn-primary" id="saveDoc">Save</button>
    </div>`);
  $('#saveDoc').addEventListener('click', async () => {
    const body = {
      name: $('#dName').value,
      specialty: { az: $('#dSpecAz').value, en: $('#dSpecEn').value },
      bio: { az: $('#dBioAz').value, en: $('#dBioEn').value },
      photo: $('#dPhoto').value,
      active: $('#dActive').checked,
    };
    try {
      if (doc) await api('/admin/doctors/' + doc.id, { method: 'PUT', body: JSON.stringify(body) });
      else await api('/admin/doctors', { method: 'POST', body: JSON.stringify(body) });
      cache.doctors = await api('/admin/doctors');
      closeModal();
      renderDoctors();
      toast('Saved', 'success');
    } catch (e) { toast(e.message, 'error'); }
  });
}

// --- Services ---------------------------------------------------------------
function renderServices() {
  const s = cache.services;
  $('#servicesWrap').innerHTML = !s.length
    ? '<div class="empty">No services yet.</div>'
    : `<table><thead><tr><th>Service</th><th>Price</th><th>Duration</th><th>Status</th><th>Actions</th></tr></thead><tbody>${
        s.map((x) => `<tr>
          <td>${esc(x.icon)} <b>${esc((x.name && x.name.en) || (x.name && x.name.az) || '')}</b></td>
          <td>${esc(x.price)}</td>
          <td>${esc(x.durationMin)} min</td>
          <td><span class="badge ${x.active === false ? 'off' : 'on'}">${x.active === false ? 'Hidden' : 'Active'}</span></td>
          <td><div class="row-actions">
            <button class="btn btn-sm btn-ghost" data-edit-srv="${x.id}">Edit</button>
            <button class="btn btn-sm btn-danger" data-del-srv="${x.id}">Delete</button>
          </div></td></tr>`).join('')
      }</tbody></table>`;
  document.querySelectorAll('[data-edit-srv]').forEach((b) =>
    b.addEventListener('click', () => serviceModal(cache.services.find((x) => x.id == b.dataset.editSrv)))
  );
  document.querySelectorAll('[data-del-srv]').forEach((b) =>
    b.addEventListener('click', async () => {
      if (!confirm('Delete this service?')) return;
      await api('/admin/services/' + b.dataset.delSrv, { method: 'DELETE' });
      cache.services = await api('/admin/services');
      renderServices();
      toast('Deleted', 'success');
    })
  );
}

function serviceModal(srv) {
  const s = srv || { name: {}, description: {}, icon: '🦷', durationMin: 30, price: '', active: true };
  openModal(`
    <h3>${srv ? 'Edit' : 'Add'} service</h3>
    <div class="grid2">
      <div class="field"><label>Name (AZ)</label><input id="sNameAz" value="${esc(s.name?.az)}" /></div>
      <div class="field"><label>Name (EN)</label><input id="sNameEn" value="${esc(s.name?.en)}" /></div>
    </div>
    <div class="field"><label>Description (AZ)</label><textarea id="sDescAz">${esc(s.description?.az)}</textarea></div>
    <div class="field"><label>Description (EN)</label><textarea id="sDescEn">${esc(s.description?.en)}</textarea></div>
    <div class="grid2">
      <div class="field"><label>Icon (emoji)</label><input id="sIcon" value="${esc(s.icon)}" /></div>
      <div class="field"><label>Duration (min)</label><input id="sDur" type="number" value="${esc(s.durationMin)}" /></div>
    </div>
    <div class="field"><label>Price label</label><input id="sPrice" value="${esc(s.price)}" placeholder="e.g. from 400 AZN" /></div>
    <div class="field"><label><input type="checkbox" id="sActive" ${s.active === false ? '' : 'checked'} style="width:auto;margin-right:6px">Show on website</label></div>
    <div class="modal-actions">
      <button class="btn btn-ghost" onclick="closeModal()">Cancel</button>
      <button class="btn btn-primary" id="saveSrv">Save</button>
    </div>`);
  $('#saveSrv').addEventListener('click', async () => {
    const body = {
      name: { az: $('#sNameAz').value, en: $('#sNameEn').value },
      description: { az: $('#sDescAz').value, en: $('#sDescEn').value },
      icon: $('#sIcon').value,
      durationMin: $('#sDur').value,
      price: $('#sPrice').value,
      active: $('#sActive').checked,
    };
    try {
      if (srv) await api('/admin/services/' + srv.id, { method: 'PUT', body: JSON.stringify(body) });
      else await api('/admin/services', { method: 'POST', body: JSON.stringify(body) });
      cache.services = await api('/admin/services');
      closeModal();
      renderServices();
      toast('Saved', 'success');
    } catch (e) { toast(e.message, 'error'); }
  });
}

// --- Settings ---------------------------------------------------------------
function renderSettings() {
  const s = cache.settings;
  if (!s) return;
  $('#setClinicName').value = s.clinicName || '';
  $('#setMapsQuery').value = s.mapsQuery || '';
  $('#setPhone').value = s.phone || '';
  $('#setPhone2').value = s.phone2 || '';
  $('#setEmail').value = s.email || '';
  $('#setInstagram').value = s.instagram || '';
  $('#setAddressAz').value = s.address?.az || '';
  $('#setAddressEn').value = s.address?.en || '';
  $('#setRating').value = s.rating || '';
  $('#setReviewCount').value = s.reviewCount || '';
  $('#setSlotMinutes').value = s.slotMinutes || 30;

  $('#hoursEditor').innerHTML = [1, 2, 3, 4, 5, 6, 0].map((day) => {
    const h = (s.hours || []).find((x) => x.day === day) || { day, open: '10:00', close: '19:00', closed: day === 0 };
    return `<div class="hrow" data-day="${day}">
      <span class="day">${DAYS[day]}</span>
      <input type="time" class="h-open" value="${h.open || ''}" ${h.closed ? 'disabled' : ''} />
      <input type="time" class="h-close" value="${h.close || ''}" ${h.closed ? 'disabled' : ''} />
      <label style="display:flex;align-items:center;gap:5px;font-weight:500;margin:0;">
        <input type="checkbox" class="h-closed" ${h.closed ? 'checked' : ''} style="width:auto"> Closed
      </label>
    </div>`;
  }).join('');

  document.querySelectorAll('.h-closed').forEach((cb) =>
    cb.addEventListener('change', () => {
      const row = cb.closest('.hrow');
      row.querySelector('.h-open').disabled = cb.checked;
      row.querySelector('.h-close').disabled = cb.checked;
    })
  );
}

async function saveSettings(e) {
  e.preventDefault();
  const hours = [...document.querySelectorAll('.hrow')].map((row) => ({
    day: Number(row.dataset.day),
    open: row.querySelector('.h-open').value,
    close: row.querySelector('.h-close').value,
    closed: row.querySelector('.h-closed').checked,
  }));
  const body = {
    clinicName: $('#setClinicName').value,
    mapsQuery: $('#setMapsQuery').value,
    phone: $('#setPhone').value,
    phone2: $('#setPhone2').value,
    email: $('#setEmail').value,
    instagram: $('#setInstagram').value,
    address: { az: $('#setAddressAz').value, en: $('#setAddressEn').value },
    rating: $('#setRating').value,
    reviewCount: $('#setReviewCount').value,
    slotMinutes: Number($('#setSlotMinutes').value) || 30,
    hours,
  };
  try {
    cache.settings = await api('/admin/settings', { method: 'PUT', body: JSON.stringify(body) });
    toast('Settings saved', 'success');
  } catch (e2) { toast(e2.message, 'error'); }
}

// --- Admins -----------------------------------------------------------------
async function loadAdmins() {
  try {
    const admins = await api('/admin/admins');
    $('#adminsWrap').innerHTML = `<table><thead><tr><th>Name</th><th>Email</th><th>Role</th><th></th></tr></thead><tbody>${
      admins.map((a) => `<tr>
        <td><b>${esc(a.name)}</b></td><td>${esc(a.email)}</td>
        <td><span class="badge ${a.role === 'owner' ? 'confirmed' : 'off'}">${a.role}</span></td>
        <td>${me && me.role === 'owner' && a.id !== me.id ? `<button class="btn btn-sm btn-danger" data-del-admin="${a.id}">Delete</button>` : ''}</td>
      </tr>`).join('')
    }</tbody></table>`;
    document.querySelectorAll('[data-del-admin]').forEach((b) =>
      b.addEventListener('click', async () => {
        if (!confirm('Delete this admin?')) return;
        try {
          await api('/admin/admins/' + b.dataset.delAdmin, { method: 'DELETE' });
          loadAdmins();
          toast('Deleted', 'success');
        } catch (e) { toast(e.message, 'error'); }
      })
    );
  } catch (e) { toast(e.message, 'error'); }
}

function adminModal() {
  openModal(`
    <h3>Add admin</h3>
    <div class="field"><label>Name</label><input id="aName" /></div>
    <div class="field"><label>Email</label><input id="aEmail" type="email" /></div>
    <div class="field"><label>Password</label><input id="aPassword" type="text" /></div>
    <div class="field"><label>Role</label><select id="aRole"><option value="staff">Staff</option><option value="owner">Owner</option></select></div>
    <div class="modal-actions">
      <button class="btn btn-ghost" onclick="closeModal()">Cancel</button>
      <button class="btn btn-primary" id="saveAdmin">Create</button>
    </div>`);
  $('#saveAdmin').addEventListener('click', async () => {
    try {
      await api('/admin/admins', {
        method: 'POST',
        body: JSON.stringify({
          name: $('#aName').value, email: $('#aEmail').value,
          password: $('#aPassword').value, role: $('#aRole').value,
        }),
      });
      closeModal();
      loadAdmins();
      toast('Admin created', 'success');
    } catch (e) { toast(e.message, 'error'); }
  });
}

// --- Modal ------------------------------------------------------------------
function openModal(html) {
  $('#modal').innerHTML = html;
  $('#modalBg').classList.add('show');
}
function closeModal() {
  $('#modalBg').classList.remove('show');
}
window.closeModal = closeModal;

// --- Init -------------------------------------------------------------------
function init() {
  $('#loginForm').addEventListener('submit', login);
  $('#logoutBtn').addEventListener('click', logout);
  document.querySelectorAll('.sidebar nav a[data-view]').forEach((a) =>
    a.addEventListener('click', () => switchView(a.dataset.view))
  );
  $('#filterStatus').addEventListener('change', loadAppointments);
  $('#filterDate').addEventListener('change', loadAppointments);
  $('#clearFilters').addEventListener('click', () => {
    $('#filterStatus').value = '';
    $('#filterDate').value = '';
    loadAppointments();
  });
  $('#addDoctorBtn').addEventListener('click', () => doctorModal(null));
  $('#addServiceBtn').addEventListener('click', () => serviceModal(null));
  $('#addAdminBtn').addEventListener('click', adminModal);
  $('#settingsForm').addEventListener('submit', saveSettings);
  $('#modalBg').addEventListener('click', (e) => { if (e.target.id === 'modalBg') closeModal(); });

  // resume session
  if (token) {
    api('/auth/me').then((d) => { me = d.admin; showApp(); }).catch(() => logout());
  }
}

init();
