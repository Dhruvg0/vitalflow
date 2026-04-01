/**
 * VitalFlow — Main App Controller (Supabase Edition)
 * All DB calls are now async/await via the Supabase DB module.
 */

// ---- Global State ----
window.currentUser = null;
window.currentPage = 'landing';
window.currentDashTab = 'home';
window.currentHospitalTab = 'overview';
window.pendingAcceptId = null;
window.regRole = 'donor';
window._requestChannel = null;
window._notifChannel = null;

// ---- Init ----
document.addEventListener('DOMContentLoaded', async () => {
  showPageLoader(true);
  try {
    const user = await DB.getSession();
    if (user) {
      window.currentUser = user;
      if (user.type === 'hospital') navigateTo('hospital-dashboard');
      else navigateTo('dashboard');
      _startRealtime(user.id);
    } else {
      navigateTo('landing');
    }
    await renderLandingRequests();
    initLandingCounters();
  } finally {
    showPageLoader(false);
  }
});

function showPageLoader(show) {
  let el = document.getElementById('global-loader');
  if (!el) {
    el = document.createElement('div');
    el.id = 'global-loader';
    el.style.cssText = 'position:fixed;inset:0;background:rgba(255,255,255,0.85);display:flex;align-items:center;justify-content:center;z-index:9999;font-size:14px;color:#666;gap:10px;';
    el.innerHTML = '<span class="material-symbols-outlined" style="animation:spin 1s linear infinite;font-size:24px;color:var(--primary);">progress_activity</span> Loading VitalFlow...';
    document.body.appendChild(el);
  }
  el.style.display = show ? 'flex' : 'none';
}

// ---- Real-time subscriptions ----
function _startRealtime(uid) {
  // Live request badge updates
  window._requestChannel = DB.subscribeToRequests(async () => {
    if (window.currentPage === 'landing') await renderLandingRequests();
    if (window.currentPage === 'dashboard') await updateNotifBadge();
    if (window.currentPage === 'hospital-dashboard') await renderHospitalStats();
  });
  // Live notification toast
  window._notifChannel = DB.subscribeToNotifications(uid, (payload) => {
    const n = payload.new;
    if (n) showToast(n.message, n.type === 'urgent' ? 'error' : n.type);
    updateNotifBadge();
  });
}

function _stopRealtime() {
  DB.unsubscribe(window._requestChannel);
  DB.unsubscribe(window._notifChannel);
  window._requestChannel = null;
  window._notifChannel = null;
}

// ---- Router ----
function navigateTo(page, opts = {}) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const el = document.getElementById('page-' + page);
  if (!el) return;
  el.classList.add('active');
  window.currentPage = page;
  window.scrollTo(0, 0);

  if (page === 'dashboard') renderDonorDashboard(opts.tab);
  if (page === 'hospital-dashboard') renderHospitalDashboard(opts.tab);
  if (page === 'login') resetLoginForm();
  if (page === 'register') resetRegisterForm();
}

// ---- Auth: Login ----
async function handleLogin() {
  const email = document.getElementById('login-email').value.trim().toLowerCase();
  const pass = document.getElementById('login-password').value;
  const btn = document.querySelector('[onclick="handleLogin()"]');

  clearError('login-error');
  if (!email || !pass) { showError('login-error', 'Please enter your email and password.'); return; }

  const originalText = btn.textContent;
  btn.disabled = true;
  btn.innerHTML = '<span class="material-symbols-outlined" style="font-size:16px;animation:spin 1s linear infinite;">progress_activity</span> Signing in...';

  const { user, error } = await DB.signIn(email, pass);

  if (error || !user) {
    showError('login-error', 'Invalid email or password.');
    btn.disabled = false;
    btn.textContent = originalText;
    return;
  }

  window.currentUser = user;
  showToast(`Welcome back, ${user.fname}! 👋`, 'success');
  _startRealtime(user.id);
  if (user.type === 'hospital') navigateTo('hospital-dashboard');
  else navigateTo('dashboard');
  btn.disabled = false;
  btn.textContent = originalText;
}

function demoLogin(type) {
  const creds = {
    donor:    { email: 'alex@demo.com', pass: 'demo123' },
    hospital: { email: 'hospital@demo.com', pass: 'demo123' },
  };
  const c = creds[type];
  const emailField = document.getElementById('login-email');
  const passField  = document.getElementById('login-password');
  let emailIdx = 0, passIdx = 0;
  emailField.value = ''; passField.value = '';

  const emailInterval = setInterval(() => {
    emailField.value = c.email.substring(0, emailIdx++);
    updateLoginFieldValidation();
    if (emailIdx > c.email.length) clearInterval(emailInterval);
  }, 30);
  const passInterval = setInterval(() => {
    passField.value = c.pass.substring(0, passIdx++);
    if (passIdx > c.pass.length) { clearInterval(passInterval); setTimeout(handleLogin, 200); }
  }, 40);
}

async function handleLogout() {
  _stopRealtime();
  window.currentUser = null;
  await DB.signOut();
  navigateTo('landing');
  showToast('Signed out successfully.', 'info');
  renderLandingRequests();
}

function resetLoginForm() {
  const e = document.getElementById('login-email');
  const p = document.getElementById('login-password');
  if (e) e.value = '';
  if (p) p.value = '';
  clearError('login-error');
  document.querySelectorAll('.login-field-valid').forEach(el => el.classList.remove('login-field-valid'));
  document.querySelectorAll('.login-field-invalid').forEach(el => el.classList.remove('login-field-invalid'));
}

function updateLoginFieldValidation() {
  const email = document.getElementById('login-email');
  const pass  = document.getElementById('login-password');
  if (email?.value.trim()) {
    const ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value.trim());
    email.parentElement.classList.toggle('login-field-valid', ok);
    email.parentElement.classList.toggle('login-field-invalid', !ok);
  } else {
    email?.parentElement.classList.remove('login-field-valid', 'login-field-invalid');
  }
  if (pass?.value) {
    const ok = pass.value.length >= 6;
    pass.parentElement.classList.toggle('login-field-valid', ok);
    pass.parentElement.classList.toggle('login-field-invalid', !ok);
  } else {
    pass?.parentElement.classList.remove('login-field-valid', 'login-field-invalid');
  }
}

function updatePasswordStrength() {
  const password = document.getElementById('reg-password').value;
  const strengthIndicator = document.getElementById('password-strength');
  const strengthText = document.getElementById('password-strength-text');
  if (!strengthIndicator || !password) { strengthIndicator?.parentElement.classList.add('hidden'); return; }
  strengthIndicator.parentElement.classList.remove('hidden');
  let strength = 0;
  if (password.length >= 6)  strength++;
  if (password.length >= 10) strength++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++;
  if (/[0-9]/.test(password))    strength++;
  if (/[!@#$%^&*]/.test(password)) strength++;
  const labels = ['Weak','Fair','Good','Strong','Very Strong'];
  const colors = ['#ef4444','#f97316','#eab308','#84cc16','#22c55e'];
  strengthIndicator.style.width = (strength * 20) + '%';
  strengthIndicator.style.background = colors[strength - 1] || '#ef4444';
  strengthText.textContent = labels[strength - 1] || 'Weak';
  strengthText.style.color = colors[strength - 1] || '#ef4444';
}

let emailCheckTimeout;
async function checkEmailAvailability() {
  const email = document.getElementById('reg-email').value.trim().toLowerCase();
  const feedback = document.getElementById('email-feedback');
  if (!email) { feedback?.classList.add('hidden'); return; }
  clearTimeout(emailCheckTimeout);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    feedback?.classList.remove('hidden');
    if (feedback) feedback.innerHTML = '<span style="color:#ef4444;font-weight:500;">✗ Invalid email format</span>';
    return;
  }
  feedback?.classList.remove('hidden');
  if (feedback) feedback.innerHTML = '<span style="color:#2563eb;"><span class="material-symbols-outlined" style="font-size:14px;vertical-align:middle;animation:spin 1s linear infinite;">progress_activity</span> Checking...</span>';
  emailCheckTimeout = setTimeout(async () => {
    const exists = await DB.getUserByEmail(email);
    const feedbackEl = document.getElementById('email-feedback');
    if (!feedbackEl) return;
    if (exists) {
      feedbackEl.innerHTML = '<span style="color:#ef4444;font-weight:500;">✗ Email already registered</span>';
    } else {
      feedbackEl.innerHTML = '<span style="color:#22c55e;font-weight:500;">✓ Email available</span>';
    }
  }, 600);
}

function validateRegField(fieldId) {
  const field = document.getElementById(fieldId);
  if (!field) return;
  const value = field.value.trim();
  let isValid = false;
  if (fieldId === 'reg-fname' || fieldId === 'reg-lname')                      isValid = value.length >= 2;
  else if (fieldId === 'reg-email')                                              isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  else if (fieldId === 'reg-password')                                           isValid = value.length >= 6;
  else if (fieldId === 'reg-bloodtype')                                          isValid = value !== '';
  else if (fieldId === 'reg-city')                                               isValid = value.length >= 2;
  else if (fieldId === 'reg-phone')                                              isValid = value === '' || value.length >= 7;
  else if (fieldId === 'reg-hospital-name' || fieldId === 'reg-hospital-address') isValid = value.length >= 3;
  if (value) {
    field.classList.toggle('reg-field-valid', isValid);
    field.classList.toggle('reg-field-invalid', !isValid);
  } else {
    field.classList.remove('reg-field-valid', 'reg-field-invalid');
  }
}

// ---- Auth: Register ----
function setRole(role) {
  window.regRole = role;
  document.getElementById('donor-fields').classList.toggle('hidden', role !== 'donor');
  document.getElementById('hospital-fields').classList.toggle('hidden', role !== 'hospital');
  document.querySelectorAll('.role-tab').forEach(btn => {
    const isActive = btn.dataset.role === role;
    btn.style.background   = isActive ? 'white' : 'transparent';
    btn.style.boxShadow    = isActive ? 'var(--shadow-sm)' : 'none';
    btn.style.color        = isActive ? 'var(--text-primary)' : 'var(--text-muted)';
  });
}

async function handleRegister() {
  const fname    = document.getElementById('reg-fname').value.trim();
  const lname    = document.getElementById('reg-lname').value.trim();
  const email    = document.getElementById('reg-email').value.trim().toLowerCase();
  const password = document.getElementById('reg-password').value;
  const btn      = document.querySelector('[onclick="handleRegister()"]');
  clearError('reg-error');

  if (!fname || !lname || !email || !password) { showError('reg-error', 'Please fill in all required fields.'); return; }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { showError('reg-error', 'Please enter a valid email address.'); return; }
  if (password.length < 6) { showError('reg-error', 'Password must be at least 6 characters.'); return; }

  const originalText = btn.textContent;
  btn.disabled = true;
  btn.innerHTML = '<span class="material-symbols-outlined" style="font-size:16px;animation:spin 1s linear infinite;">progress_activity</span> Creating account...';

  let profileData = { type: regRole, fname, lname, email };

  if (regRole === 'donor') {
    const bloodType = document.getElementById('reg-bloodtype').value;
    const phone     = document.getElementById('reg-phone').value.trim();
    const city      = document.getElementById('reg-city').value.trim();
    if (!bloodType || !city) {
      showError('reg-error', 'Please select blood type and enter your city.');
      btn.disabled = false; btn.textContent = originalText; return;
    }
    Object.assign(profileData, { bloodType, phone, city, donations: 0, points: 50, lastDonation: null });
  } else {
    const hospitalName    = document.getElementById('reg-hospital-name').value.trim();
    const hospitalAddress = document.getElementById('reg-hospital-address').value.trim();
    const phone           = document.getElementById('reg-hospital-phone').value.trim();
    if (!hospitalName || !hospitalAddress) {
      showError('reg-error', 'Please enter hospital name and address.');
      btn.disabled = false; btn.textContent = originalText; return;
    }
    Object.assign(profileData, { hospitalName, hospitalAddress, phone });
  }

  const { user, error } = await DB.signUp(email, password, profileData);

  if (error || !user) {
    const msg = error?.message || 'Registration failed. Please try again.';
    showError('reg-error', msg.includes('already registered') ? 'This email is already registered.' : msg);
    btn.disabled = false; btn.textContent = originalText; return;
  }

  window.currentUser = user;
  await DB.addNotification(user.id, '🎉 Welcome to VitalFlow! Your account is ready. Start saving lives today.', 'success');
  showToast('Account created! Welcome to VitalFlow 🎉', 'success');
  _startRealtime(user.id);
  if (regRole === 'hospital') navigateTo('hospital-dashboard');
  else navigateTo('dashboard');
  btn.disabled = false; btn.textContent = originalText;
}

function resetRegisterForm() {
  ['reg-fname','reg-lname','reg-email','reg-password','reg-bloodtype','reg-phone','reg-city',
   'reg-hospital-name','reg-hospital-address','reg-hospital-phone'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  clearError('reg-error');
  document.querySelectorAll('.reg-field-valid, .reg-field-invalid').forEach(el => {
    el.classList.remove('reg-field-valid', 'reg-field-invalid');
  });
  const fb = document.getElementById('email-feedback');
  if (fb) fb.classList.add('hidden');
  const si = document.getElementById('password-strength');
  if (si) si.parentElement?.classList.add('hidden');
}

// ---- Public Blood Request (landing page) ----
async function handlePublicRequest() {
  const fields = {
    patient:   document.getElementById('pub-patient')?.value.trim(),
    bloodType: document.getElementById('pub-blood')?.value,
    units:     parseInt(document.getElementById('pub-units')?.value) || 1,
    urgency:   document.getElementById('pub-urgency')?.value || 'normal',
    hospital:  document.getElementById('pub-hospital')?.value.trim(),
    address:   document.getElementById('pub-address')?.value.trim(),
    contact:   document.getElementById('pub-contact')?.value.trim(),
    distance:  parseFloat(document.getElementById('pub-distance')?.value) || 5,
    notes:     document.getElementById('pub-notes')?.value.trim() || '',
  };

  if (!fields.patient || !fields.bloodType || !fields.hospital || !fields.contact) {
    showToast('Please fill in all required fields.', 'warning'); return;
  }

  const req = {
    ...fields,
    status: 'open',
    postedBy: currentUser?.id || null,
    acceptedBy: null,
  };

  const saved = await DB.addRequest(req);
  if (!saved) { showToast('Failed to submit request. Please try again.', 'error'); return; }

  // Notify all donors
  const donors = (await DB.getUsers()).filter(u => u.type === 'donor');
  await Promise.all(donors.map(u =>
    DB.addNotification(u.id, `${URGENCY[saved.urgency]?.emoji || '🔴'} New ${saved.bloodType} blood request at ${saved.hospital} (${saved.distance} km away)`, saved.urgency)
  ));

  showToast('Blood request submitted! Donors are being notified. 🩸', 'success');
  await renderLandingRequests();

  ['pub-patient','pub-blood','pub-units','pub-hospital','pub-address','pub-contact','pub-distance','pub-notes'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  setTimeout(() => {
    navigateTo(currentUser ? (currentUser.type === 'hospital' ? 'hospital-dashboard' : 'dashboard') : 'landing');
  }, 1500);
}

// ---- Accept Modal ----
async function openAcceptModal(reqId) {
  if (!window.currentUser) { navigateTo('login'); return; }
  const req = await DB.getRequestById(reqId);
  if (!req || req.status !== 'open') { showToast('This request is no longer available.', 'warning'); return; }

  window.pendingAcceptId = reqId;
  document.getElementById('modal-req-info').innerHTML = `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
      <div><p style="font-size:11px;color:var(--text-muted);font-weight:600;text-transform:uppercase;margin-bottom:3px;">Patient</p><p style="font-size:14px;font-weight:600;color:var(--text-primary);">${escHtml(req.patient)}</p></div>
      <div><p style="font-size:11px;color:var(--text-muted);font-weight:600;text-transform:uppercase;margin-bottom:3px;">Blood Type</p><p style="font-size:22px;font-weight:800;color:var(--primary);">${req.bloodType}</p></div>
      <div><p style="font-size:11px;color:var(--text-muted);font-weight:600;text-transform:uppercase;margin-bottom:3px;">Hospital</p><p style="font-size:14px;font-weight:600;color:var(--text-primary);">${escHtml(req.hospital)}</p></div>
      <div><p style="font-size:11px;color:var(--text-muted);font-weight:600;text-transform:uppercase;margin-bottom:3px;">Units Needed</p><p style="font-size:14px;font-weight:600;color:var(--text-primary);">${req.units} unit${req.units > 1 ? 's' : ''}</p></div>
      <div style="grid-column:span 2;"><p style="font-size:11px;color:var(--text-muted);font-weight:600;text-transform:uppercase;margin-bottom:3px;">Address</p><p style="font-size:13px;color:var(--text-secondary);">${escHtml(req.address)}</p></div>
      <div><p style="font-size:11px;color:var(--text-muted);font-weight:600;text-transform:uppercase;margin-bottom:3px;">Distance</p><p style="font-size:14px;font-weight:600;color:var(--text-primary);">${req.distance} km away</p></div>
      <div><p style="font-size:11px;color:var(--text-muted);font-weight:600;text-transform:uppercase;margin-bottom:3px;">Contact</p><a href="tel:${req.contact}" style="font-size:13px;color:var(--primary);font-weight:600;">${escHtml(req.contact)}</a></div>
    </div>
    ${req.notes ? `<div style="background:#fff5f5;border-radius:8px;padding:10px 14px;margin-top:12px;border-left:3px solid var(--primary);"><p style="font-size:12px;color:var(--text-secondary);">${escHtml(req.notes)}</p></div>` : ''}
  `;
  document.getElementById('modal-directions').textContent =
    `Head to ${req.hospital}, ${req.address}. Call ${req.contact} on arrival and mention VitalFlow. Ask for the blood bank counter.`;

  const arr = new Date(Date.now() + 45 * 60000);
  document.getElementById('modal-arrival-time').value = arr.toISOString().slice(0, 16);
  document.getElementById('modal-donor-note').value = '';

  openModal('accept-modal');
}

async function confirmAccept() {
  if (!window.pendingAcceptId || !window.currentUser) return;
  const req = await DB.getRequestById(window.pendingAcceptId);
  if (!req || req.status !== 'open') {
    showToast('This request was already fulfilled.', 'warning');
    closeModal('accept-modal'); return;
  }

  const now = new Date().toISOString();

  // Update request
  await DB.updateRequest(window.pendingAcceptId, {
    status: 'accepted',
    acceptedBy: currentUser.id,
    acceptedAt: now,
  });

  // Update donor stats
  const updated = await DB.updateUser(currentUser.id, {
    donations: (currentUser.donations || 0) + 1,
    points:    (currentUser.points || 0) + 100,
    lastDonation: now,
  });
  window.currentUser = updated;
  DB.setSession(updated);

  // Record donation
  await DB.addDonation({
    donorId:     currentUser.id,
    requestId:   window.pendingAcceptId,
    hospital:    req.hospital,
    patient:     req.patient,
    bloodType:   req.bloodType,
    units:       req.units,
    status:      'completed',
    arrivalTime: document.getElementById('modal-arrival-time')?.value,
    note:        document.getElementById('modal-donor-note')?.value,
  });

  // Notifications
  await DB.addNotification(currentUser.id, `✅ You accepted a donation at ${req.hospital} for ${req.patient}. +100 points earned!`, 'success');
  if (req.postedBy) {
    await DB.addNotification(req.postedBy, `👤 Donor ${currentUser.fname} ${currentUser.lname} accepted your request for ${req.patient} (${req.bloodType}).`, 'info');
  }

  closeModal('accept-modal');
  window.pendingAcceptId = null;
  showToast('Thank you for accepting! 🩸 +100 reward points earned!', 'success');
  renderDonorDashboard('home');
}

// ---- Toggle Mobile Sidebar ----
function toggleMobileSidebar() {
  const sidebar  = document.querySelector('.app-shell .sidebar');
  const overlay  = document.getElementById('sidebar-overlay');
  if (!sidebar) return;
  sidebar.classList.toggle('mobile-open');
  overlay?.classList.toggle('open');
  document.body.style.overflow = sidebar.classList.contains('mobile-open') ? 'hidden' : '';
}
function closeMobileSidebar() {
  const sidebar = document.querySelector('.app-shell .sidebar');
  const overlay = document.getElementById('sidebar-overlay');
  sidebar?.classList.remove('mobile-open');
  overlay?.classList.remove('open');
  document.body.style.overflow = '';
}

// ---- Error helpers ----
function showError(id, msg) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = msg;
  el.classList.remove('hidden');
  el.style.animation = 'none';
  setTimeout(() => { el.style.animation = 'fadeIn 0.3s ease'; }, 10);
}
function clearError(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = '';
  el.classList.add('hidden');
}

// ---- Landing ----
async function renderLandingRequests() {
  const container = document.getElementById('landing-requests');
  if (!container) return;
  const requests = (await DB.getRequests()).filter(r => r.status === 'open').slice(0, 4);
  if (!requests.length) {
    container.innerHTML = '<p style="text-align:center;color:var(--text-muted);font-size:13px;padding:20px 0;">No active requests right now.</p>';
    return;
  }
  container.innerHTML = requests.map(r => {
    const uc = URGENCY[r.urgency] || URGENCY.normal;
    return `
      <div style="display:flex;align-items:center;gap:12px;padding:11px 14px;background:rgba(255,255,255,0.65);border-radius:12px;transition:background 0.15s;cursor:pointer;" onclick="navigateTo('login')" onmouseenter="this.style.background='rgba(255,255,255,0.9)'" onmouseleave="this.style.background='rgba(255,255,255,0.65)'">
        <div class="blood-badge" style="flex-shrink:0;">${r.bloodType}</div>
        <div style="flex:1;min-width:0;">
          <p style="font-size:13px;font-weight:700;color:var(--text-primary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escHtml(r.hospital)}</p>
          <p style="font-size:11px;color:var(--text-muted);">${r.distance} km · ${r.units} unit${r.units>1?'s':''}</p>
        </div>
        <span class="badge ${uc.badgeClass}" style="flex-shrink:0;">${uc.label}</span>
      </div>`;
  }).join('');

  const urgentCount = (await DB.getRequests()).filter(r => r.status === 'open' && r.urgency === 'urgent').length;
  const liveEl = document.getElementById('hero-live-text');
  if (liveEl) liveEl.textContent = `Live Network · ${urgentCount} Urgent Request${urgentCount !== 1 ? 's' : ''}`;
}

async function initLandingCounters() {
  const users     = await DB.getUsers();
  const donations = await DB.getDonations();
  const donors    = users.filter(u => u.type === 'donor').length + 1200;
  const total     = donations.length + 4800;
  animateCounter('stat-donors', donors);
  animateCounter('stat-donations', total);
  animateCounter('stat-lives', Math.floor(total * 2.5));
}

function animateCounter(id, target) {
  const el = document.getElementById(id);
  if (!el) return;
  const duration = 1800;
  const start = performance.now();
  function step(now) {
    const elapsed  = now - start;
    const progress = Math.min(elapsed / duration, 1);
    const eased    = 1 - Math.pow(1 - progress, 3);
    el.textContent = Math.floor(target * eased).toLocaleString();
    if (progress < 1) requestAnimationFrame(step);
    else el.textContent = target.toLocaleString() + (target > 1000 ? '+' : '');
  }
  requestAnimationFrame(step);
}

// Auto-refresh landing requests every 20s
setInterval(async () => {
  if (window.currentPage === 'landing') await renderLandingRequests();
}, 20000);
