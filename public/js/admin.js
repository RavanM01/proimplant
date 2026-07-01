/* ProImplant — admin panel logic. */

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
let token = localStorage.getItem('token') || '';
let me = null;
let cache = { doctors: [], services: [], settings: null };
let apptCache = [];
let ADMIN_TZ = 'Asia/Baku';

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
  $('#whoName').textContent = me ? `${me.name}${me.role === 'doctor' ? ' (Doctor)' : ''}` : '';
  try { ADMIN_TZ = (await (await fetch('/api/settings')).json()).timezone || ADMIN_TZ; } catch {}
  applyRoleVisibility();
  // Doctor accounts only see their own appointments, so skip loading the
  // staff-only collections (they'd 403 anyway).
  if (me && me.role !== 'doctor') await loadAll();
  switchView('dashboard');
}

// Hide staff/owner-only sections from doctor accounts.
function applyRoleVisibility() {
  const isDoctor = me && me.role === 'doctor';
  document.querySelectorAll('.staff-only').forEach((el) => {
    el.style.display = isDoctor ? 'none' : '';
  });
}

// --- Views ------------------------------------------------------------------
function switchView(view) {
  document.querySelectorAll('.view').forEach((v) => v.classList.remove('active'));
  $('#view-' + view).classList.add('active');
  document.querySelectorAll('.sidebar nav a[data-view]').forEach((a) =>
    a.classList.toggle('active', a.dataset.view === view)
  );
  $('#viewTitle').textContent = { dashboard: 'Dashboard', appointments: 'Appointments',
    reports: 'Reports', finance: 'Finance', doctors: 'Doctors', services: 'Services',
    settings: 'Clinic settings', admins: 'Admins' }[view];
  if (view === 'dashboard') renderDashboard();
  if (view === 'appointments') loadAppointments();
  if (view === 'reports') loadReports();
  if (view === 'finance') loadFinance();
  if (view === 'doctors') renderDoctors();
  if (view === 'services') renderServices();
  if (view === 'settings') renderSettings();
  if (view === 'admins') loadAdmins();
}

// --- Reports ----------------------------------------------------------------
async function loadReports() {
  const from = $('#repFrom').value;
  const to = $('#repTo').value;
  const q = new URLSearchParams();
  if (from) q.set('from', from);
  if (to) q.set('to', to);
  try {
    const r = await api('/admin/reports?' + q.toString());
    $('#repStatus').innerHTML = [
      ['Total', r.total, 'accent'],
      ['Pending', r.byStatus.pending, ''],
      ['Confirmed', r.byStatus.confirmed, ''],
      ['Completed', r.byStatus.completed, ''],
      ['Cancelled', r.byStatus.cancelled, ''],
    ].map(([l, n, c]) => `<div class="stat-card ${c}"><div class="n">${n}</div><div class="l">${l}</div></div>`).join('');

    const max = Math.max(1, ...r.byDay.map((d) => d.count));
    $('#repChart').innerHTML = `<div class="bars">${r.byDay.map((d) =>
      `<div class="bar-col"><div class="bar" style="height:${Math.round((d.count / max) * 120) + 3}px" title="${d.count} on ${d.date}"></div><span class="bar-val">${d.count}</span><span class="bar-lbl">${d.date.slice(5)}</span></div>`).join('')}</div>`;

    $('#repByDoctor').innerHTML = !r.byDoctor.length
      ? '<div class="empty">No data.</div>'
      : `<table><thead><tr><th>Doctor</th><th>Total</th><th>Confirmed</th><th>Completed</th><th>Cancelled</th></tr></thead><tbody>${
          r.byDoctor.map((d) => `<tr><td><b>${esc(d.name)}</b></td><td>${d.total}</td><td>${d.confirmed}</td><td>${d.completed}</td><td>${d.cancelled}</td></tr>`).join('')
        }</tbody></table>`;

    $('#repByService').innerHTML = !r.byService.length
      ? '<div class="empty">No data.</div>'
      : `<table><thead><tr><th>Service</th><th>Bookings</th></tr></thead><tbody>${
          r.byService.map((s) => `<tr><td>${esc(s.name)}</td><td>${s.count}</td></tr>`).join('')
        }</tbody></table>`;
  } catch (e) { toast(e.message, 'error'); }
}

// --- Finance ----------------------------------------------------------------
const azn = (n) => `${(Math.round((Number(n) || 0) * 100) / 100).toLocaleString('az-AZ')} ₼`;
const pad2 = (n) => String(n).padStart(2, '0');
const tzToday = () => new Intl.DateTimeFormat('en-CA', { timeZone: ADMIN_TZ }).format(new Date());
const payBadge = { paid: 'completed', installment: 'pending', debt: 'cancelled' };

function setFinancePeriod(period) {
  // Build ranges from the clinic-timezone date parts (no UTC off-by-one).
  const [y, m] = tzToday().split('-').map(Number);
  let from, to;
  if (period === 'today') {
    from = to = tzToday();
  } else if (period === 'year') {
    from = `${y}-01-01`;
    to = `${y}-12-31`;
  } else { // month
    const lastDay = new Date(y, m, 0).getDate(); // day count is timezone-independent
    from = `${y}-${pad2(m)}-01`;
    to = `${y}-${pad2(m)}-${pad2(lastDay)}`;
  }
  $('#finFrom').value = from;
  $('#finTo').value = to;
}

function financeQuery() {
  const q = new URLSearchParams();
  if ($('#finFrom').value) q.set('from', $('#finFrom').value);
  if ($('#finTo').value) q.set('to', $('#finTo').value);
  return q.toString();
}

async function loadFinance() {
  if (!$('#finFrom').value && !$('#finTo').value) setFinancePeriod('month');
  try {
    const f = await api('/admin/finance?' + financeQuery());
    $('#finSummary').innerHTML = [
      ['Collected', azn(f.summary.collected), 'accent'],
      ['Billed', azn(f.summary.billed), ''],
      ['Outstanding debt', azn(f.summary.debt), ''],
      ['Transactions', f.summary.count, ''],
    ].map(([l, n, c]) => `<div class="stat-card ${c}"><div class="n">${n}</div><div class="l">${l}</div></div>`).join('');

    $('#finByDoctor').innerHTML = !f.byDoctor.length
      ? '<div class="empty">No paid appointments in this period.</div>'
      : `<table><thead><tr><th>Doctor</th><th>Appointments</th><th>Billed</th><th>Collected</th><th>Debt</th></tr></thead><tbody>${
          f.byDoctor.map((d) => `<tr>
            <td><b>${esc(d.name)}</b></td><td>${d.count}</td>
            <td>${azn(d.billed)}</td><td style="color:var(--ok);font-weight:600">${azn(d.collected)}</td>
            <td style="color:${d.debt > 0 ? 'var(--danger)' : 'var(--muted)'}">${azn(d.debt)}</td>
          </tr>`).join('')
        }</tbody></table>`;

    $('#finRows').innerHTML = !f.rows.length
      ? '<div class="empty">No transactions.</div>'
      : `<table><thead><tr><th>Date</th><th>Patient</th><th>Doctor</th><th>Service</th><th>Total</th><th>Paid</th><th>Debt</th><th>Status</th><th></th></tr></thead><tbody>${
          f.rows.map((r) => `<tr>
            <td>${esc(r.date)}<br><small style="color:var(--muted)">${esc(r.time)}</small></td>
            <td>${esc(r.patient)}</td><td>${esc(r.doctor)}</td><td>${esc(r.service)}</td>
            <td>${azn(r.total)}</td><td>${azn(r.paid)}</td>
            <td style="color:${r.debt > 0 ? 'var(--danger)' : 'var(--muted)'}">${azn(r.debt)}</td>
            <td><span class="badge ${payBadge[r.paymentStatus] || 'off'}">${r.paymentStatus || '—'}</span></td>
            <td>${r.debt > 0 ? `<button class="btn btn-sm btn-info" data-pay="${r.id}">₼ Pay</button>` : ''}</td>
          </tr>`).join('')
        }</tbody></table>`;
    document.querySelectorAll('#finRows [data-pay]').forEach((b) =>
      b.addEventListener('click', () => addPaymentModal(b.dataset.pay, 'finance'))
    );
  } catch (e) { toast(e.message, 'error'); }
}

async function exportFinance() {
  try {
    const r = await fetch('/api/admin/finance/export?' + financeQuery(), {
      headers: { Authorization: 'Bearer ' + token },
    });
    if (!r.ok) throw new Error('Export failed');
    const blob = await r.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `proimplant-finance-${$('#finFrom').value || 'all'}.xlsx`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    toast('XLSX downloaded', 'success');
  } catch (e) { toast(e.message, 'error'); }
}

// Modal to add a payment towards an existing debt / installment.
function addPaymentModal(id, back) {
  openModal(`
    <h3>Add payment</h3>
    <div class="field"><label>Amount (AZN)</label><input id="addPayAmount" type="number" min="0" step="0.01" /></div>
    <div class="modal-actions">
      <button class="btn btn-ghost" onclick="closeModal()">Cancel</button>
      <button class="btn btn-primary" id="saveAddPay">Add payment</button>
    </div>`);
  $('#saveAddPay').addEventListener('click', async () => {
    try {
      await api('/admin/appointments/' + id + '/payment', {
        method: 'POST',
        body: JSON.stringify({ amount: Number($('#addPayAmount').value) || 0 }),
      });
      closeModal();
      toast('Payment recorded', 'success');
      if (back === 'finance') loadFinance();
      else refreshCurrentView();
    } catch (e) { toast(e.message, 'error'); }
  });
}

// "Done" dialog: asks the fee and whether it was paid / debt / installment.
function paymentModal(id) {
  const a = apptCache.find((x) => x.id === Number(id)) || {};
  const def = a.amountTotal != null ? a.amountTotal : (a.priceHint || '');
  openModal(`
    <h3>Complete appointment</h3>
    <p class="sub" style="color:var(--muted);margin-bottom:16px">${esc(a.name || '')} · ${esc(a.date || '')} ${esc(a.time || '')}${a.doctorName ? ' · ' + esc(a.doctorName) : ''}</p>
    <div class="field"><label>Total fee (AZN)</label><input id="payTotal" type="number" min="0" step="0.01" value="${def}" /></div>
    <div class="field"><label>Was it paid?</label>
      <select id="payStatus">
        <option value="paid">✅ Paid in full</option>
        <option value="debt">🔴 Debt (unpaid)</option>
        <option value="installment">🟡 Installment (partial)</option>
      </select>
    </div>
    <div class="field" id="payPartialWrap" style="display:none"><label>Amount paid now (AZN)</label><input id="payPartial" type="number" min="0" step="0.01" value="0" /></div>
    <div class="modal-actions">
      <button class="btn btn-ghost" onclick="closeModal()">Cancel</button>
      <button class="btn btn-primary" id="savePay">Mark as done</button>
    </div>`);
  $('#payStatus').addEventListener('change', () => {
    $('#payPartialWrap').style.display = $('#payStatus').value === 'installment' ? 'block' : 'none';
  });
  $('#savePay').addEventListener('click', async () => {
    const body = {
      status: 'completed',
      amountTotal: Number($('#payTotal').value) || 0,
      paymentStatus: $('#payStatus').value,
      amountPaid: Number($('#payPartial').value) || 0,
    };
    try {
      await api('/admin/appointments/' + id, { method: 'PATCH', body: JSON.stringify(body) });
      closeModal();
      toast('Completed & payment recorded', 'success');
      refreshCurrentView();
    } catch (e) { toast(e.message, 'error'); }
  });
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
  apptCache = appts;
  if (!appts.length) return '<div class="empty">No appointments yet.</div>';
  return `<table><thead><tr>
    <th>Date / Time</th><th>Patient</th><th>Contact</th><th>Service</th><th>Doctor</th><th>Status / Payment</th><th>Actions</th>
    </tr></thead><tbody>${appts.map((a) => {
      const sName = a.serviceName ? (a.serviceName.en || a.serviceName.az || '') : '—';
      const payInfo = a.paymentStatus
        ? `<br><span class="badge ${payBadge[a.paymentStatus] || 'off'}" title="${azn(a.amountPaid)} / ${azn(a.amountTotal)}">${a.paymentStatus} · ${azn(a.amountPaid)}${a.paymentStatus !== 'paid' ? '/' + azn(a.amountTotal) : ''}</span>`
        : '';
      const hasDebt = a.amountTotal != null && (Number(a.amountPaid) || 0) < (Number(a.amountTotal) || 0);
      return `<tr>
        <td><b>${esc(a.date)}</b><br><span style="color:var(--muted)">${esc(a.time)}</span></td>
        <td>${esc(a.name)}${a.message ? `<br><small style="color:var(--muted)">📝 ${esc(a.message)}</small>` : ''}</td>
        <td><a href="tel:${esc(a.phone)}">${esc(a.phone)}</a>${a.email ? `<br><small>${esc(a.email)}</small>` : ''}</td>
        <td>${esc(sName)}${a.durationMin ? ` <small style="color:var(--muted)">${a.durationMin}m</small>` : ''}</td>
        <td>${esc(a.doctorName || '—')}</td>
        <td><span class="badge ${a.status}">${a.status}</span>${payInfo}</td>
        <td><div class="row-actions">
          ${a.status !== 'confirmed' ? `<button class="btn btn-sm btn-info" data-act="confirmed" data-id="${a.id}">Confirm</button>` : ''}
          ${a.status !== 'completed' ? `<button class="btn btn-sm btn-success" data-act="completed" data-id="${a.id}">Done</button>` : ''}
          ${a.status === 'completed' && hasDebt ? `<button class="btn btn-sm btn-info" data-pay="${a.id}">₼ Pay</button>` : ''}
          ${a.status !== 'cancelled' ? `<button class="btn btn-sm btn-ghost" data-act="cancelled" data-id="${a.id}">Cancel</button>` : ''}
          <button class="btn btn-sm btn-danger" data-del="${a.id}">Delete</button>
        </div></td>
      </tr>`;
    }).join('')}</tbody></table>`;
}

function bindApptActions() {
  document.querySelectorAll('[data-act]').forEach((b) =>
    b.addEventListener('click', async () => {
      // "Done" opens the payment dialog instead of completing directly.
      if (b.dataset.act === 'completed') { paymentModal(b.dataset.id); return; }
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
  document.querySelectorAll('#apptsWrap [data-pay], #recentApptsWrap [data-pay]').forEach((b) =>
    b.addEventListener('click', () => addPaymentModal(b.dataset.pay))
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
      if (!confirm('Delete this doctor? Any linked login account will also be removed.')) return;
      const r = await api('/admin/doctors/' + b.dataset.delDoc, { method: 'DELETE' });
      cache.doctors = await api('/admin/doctors');
      renderDoctors();
      toast(r.removedAccounts ? `Deleted (+${r.removedAccounts} login removed)` : 'Deleted', 'success');
    })
  );
}

// Shared working-hours editor helpers (used by doctor modal, Mon-first order).
function hoursForEdit(hours) {
  return [1, 2, 3, 4, 5, 6, 0].map((day) => {
    const h = (hours || []).find((x) => Number(x.day) === day) || {};
    return {
      day,
      open: h.open || (day === 0 ? '' : '10:00'),
      close: h.close || (day === 0 ? '' : '19:00'),
      closed: h.closed !== undefined ? !!h.closed : day === 0,
    };
  });
}
function hoursRowsHTML(hours) {
  return hoursForEdit(hours).map((h) => `
    <div class="hrow" data-day="${h.day}">
      <span class="day">${DAYS[h.day]}</span>
      <input type="time" value="${h.open}" ${h.closed ? 'disabled' : ''} />
      <input type="time" value="${h.close}" ${h.closed ? 'disabled' : ''} />
      <label style="display:flex;align-items:center;gap:5px;font-weight:500;margin:0;">
        <input type="checkbox" ${h.closed ? 'checked' : ''} style="width:auto"> Closed
      </label>
    </div>`).join('');
}
function bindHoursToggles(container) {
  document.querySelectorAll(container + ' .hrow').forEach((row) => {
    const cb = row.querySelector('input[type=checkbox]');
    const times = row.querySelectorAll('input[type=time]');
    cb.addEventListener('change', () => times.forEach((t) => (t.disabled = cb.checked)));
  });
}
function readHours(container) {
  return [...document.querySelectorAll(container + ' .hrow')].map((row) => {
    const times = row.querySelectorAll('input[type=time]');
    return {
      day: Number(row.dataset.day),
      open: times[0].value,
      close: times[1].value,
      closed: row.querySelector('input[type=checkbox]').checked,
    };
  });
}

function doctorModal(doc) {
  const d = doc || { name: '', email: '', specialty: {}, bio: {}, photo: '', active: true, hours: [] };
  openModal(`
    <h3>${doc ? 'Edit' : 'Add'} doctor</h3>
    <div class="grid2">
      <div class="field"><label>Full name</label><input id="dName" value="${esc(d.name)}" /></div>
      <div class="field"><label>Email (booking notifications)</label><input id="dEmail" type="email" value="${esc(d.email)}" /></div>
    </div>
    <div class="grid2">
      <div class="field"><label>Specialty (AZ)</label><input id="dSpecAz" value="${esc(d.specialty?.az)}" /></div>
      <div class="field"><label>Specialty (EN)</label><input id="dSpecEn" value="${esc(d.specialty?.en)}" /></div>
    </div>
    <div class="field"><label>Bio (AZ)</label><textarea id="dBioAz">${esc(d.bio?.az)}</textarea></div>
    <div class="field"><label>Bio (EN)</label><textarea id="dBioEn">${esc(d.bio?.en)}</textarea></div>
    <div class="field"><label>Photo URL (optional)</label><input id="dPhoto" value="${esc(d.photo)}" /></div>
    <label style="margin-bottom:8px;display:block">Working days &amp; hours</label>
    <div class="hours-editor" id="dHours">${hoursRowsHTML(d.hours)}</div>
    <div class="field" style="margin-top:14px"><label><input type="checkbox" id="dActive" ${d.active === false ? '' : 'checked'} style="width:auto;margin-right:6px">Show on website</label></div>
    <div class="modal-actions">
      <button class="btn btn-ghost" onclick="closeModal()">Cancel</button>
      <button class="btn btn-primary" id="saveDoc">Save</button>
    </div>`);
  bindHoursToggles('#dHours');
  $('#saveDoc').addEventListener('click', async () => {
    const body = {
      name: $('#dName').value,
      email: $('#dEmail').value,
      specialty: { az: $('#dSpecAz').value, en: $('#dSpecEn').value },
      bio: { az: $('#dBioAz').value, en: $('#dBioEn').value },
      photo: $('#dPhoto').value,
      active: $('#dActive').checked,
      hours: readHours('#dHours'),
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
    const docName = (id) => {
      const d = cache.doctors.find((x) => x.id === id);
      return d ? d.name : '#' + id;
    };
    const roleBadge = { owner: 'confirmed', staff: 'on', doctor: 'pending' };
    $('#adminsWrap').innerHTML = `<table><thead><tr><th>Name</th><th>Email</th><th>Role</th><th></th></tr></thead><tbody>${
      admins.map((a) => `<tr>
        <td><b>${esc(a.name)}</b></td><td>${esc(a.email)}</td>
        <td><span class="badge ${roleBadge[a.role] || 'off'}">${a.role}</span>${a.role === 'doctor' && a.doctorId ? ` <small style="color:var(--muted)">${esc(docName(a.doctorId))}</small>` : ''}</td>
        <td><div class="row-actions">${me && me.role === 'owner' ? `<button class="btn btn-sm btn-ghost" data-reset-admin="${a.id}" data-name="${esc(a.name)}">Reset pw</button>` : ''}${me && me.role === 'owner' && a.id !== me.id ? `<button class="btn btn-sm btn-danger" data-del-admin="${a.id}">Delete</button>` : ''}</div></td>
      </tr>`).join('')
    }</tbody></table>`;
    document.querySelectorAll('[data-reset-admin]').forEach((b) =>
      b.addEventListener('click', () => resetPasswordModal(b.dataset.resetAdmin, b.dataset.name))
    );
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
  const docOptions = cache.doctors
    .map((d) => `<option value="${d.id}">${esc(d.name)}</option>`).join('');
  openModal(`
    <h3>Add account</h3>
    <div class="field"><label>Name</label><input id="aName" /></div>
    <div class="field"><label>Email</label><input id="aEmail" type="email" /></div>
    <div class="field"><label>Password</label><input id="aPassword" type="text" /></div>
    <div class="field"><label>Role</label>
      <select id="aRole">
        <option value="staff">Staff — full access</option>
        <option value="owner">Owner — full access + manage admins</option>
        <option value="doctor">Doctor — own appointments only</option>
      </select>
    </div>
    <div class="field" id="aDoctorWrap" style="display:none">
      <label>Linked doctor</label>
      <select id="aDoctor">${docOptions || '<option value="">No doctors yet</option>'}</select>
    </div>
    <div class="modal-actions">
      <button class="btn btn-ghost" onclick="closeModal()">Cancel</button>
      <button class="btn btn-primary" id="saveAdmin">Create</button>
    </div>`);
  $('#aRole').addEventListener('change', () => {
    $('#aDoctorWrap').style.display = $('#aRole').value === 'doctor' ? 'block' : 'none';
  });
  $('#saveAdmin').addEventListener('click', async () => {
    const role = $('#aRole').value;
    const body = {
      name: $('#aName').value, email: $('#aEmail').value,
      password: $('#aPassword').value, role,
    };
    if (role === 'doctor') body.doctorId = $('#aDoctor').value;
    try {
      await api('/admin/admins', { method: 'POST', body: JSON.stringify(body) });
      closeModal();
      loadAdmins();
      toast('Account created', 'success');
    } catch (e) { toast(e.message, 'error'); }
  });
}

// Change your own password.
function changePasswordModal() {
  openModal(`
    <h3>Change password</h3>
    <div class="field"><label>Current password</label><input id="cpCurrent" type="password" /></div>
    <div class="field"><label>New password (min 6 chars)</label><input id="cpNew" type="password" /></div>
    <div class="field"><label>Repeat new password</label><input id="cpNew2" type="password" /></div>
    <div class="modal-actions">
      <button class="btn btn-ghost" onclick="closeModal()">Cancel</button>
      <button class="btn btn-primary" id="saveCp">Change</button>
    </div>`);
  $('#saveCp').addEventListener('click', async () => {
    if ($('#cpNew').value !== $('#cpNew2').value) return toast('Passwords do not match', 'error');
    try {
      await api('/auth/password', {
        method: 'POST',
        body: JSON.stringify({ currentPassword: $('#cpCurrent').value, newPassword: $('#cpNew').value }),
      });
      closeModal();
      toast('Password changed', 'success');
    } catch (e) { toast(e.message, 'error'); }
  });
}

// Owner resets another account's password.
function resetPasswordModal(id, name) {
  openModal(`
    <h3>Reset password</h3>
    <p class="sub" style="color:var(--muted);margin-bottom:14px">${esc(name || '')}</p>
    <div class="field"><label>New password (min 6 chars)</label><input id="rpNew" type="text" /></div>
    <div class="modal-actions">
      <button class="btn btn-ghost" onclick="closeModal()">Cancel</button>
      <button class="btn btn-primary" id="saveRp">Reset</button>
    </div>`);
  $('#saveRp').addEventListener('click', async () => {
    try {
      await api('/admin/admins/' + id + '/password', {
        method: 'PUT', body: JSON.stringify({ password: $('#rpNew').value }),
      });
      closeModal();
      toast('Password reset', 'success');
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
  $('#changePwBtn').addEventListener('click', changePasswordModal);
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
  $('#repApply').addEventListener('click', loadReports);
  $('#finApply').addEventListener('click', loadFinance);
  $('#finExport').addEventListener('click', exportFinance);
  document.querySelectorAll('.finperiod').forEach((b) =>
    b.addEventListener('click', () => { setFinancePeriod(b.dataset.period); loadFinance(); })
  );
  $('#settingsForm').addEventListener('submit', saveSettings);
  $('#modalBg').addEventListener('click', (e) => { if (e.target.id === 'modalBg') closeModal(); });

  // resume session
  if (token) {
    api('/auth/me').then((d) => { me = d.admin; showApp(); }).catch(() => logout());
  }
}

init();
