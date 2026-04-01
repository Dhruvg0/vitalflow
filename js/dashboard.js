/**
 * VitalFlow — Donor Dashboard (Supabase Edition)
 * All DB calls are async.
 */

async function renderDonorDashboard(tab = 'home') {
  if (!window.currentUser) return;
  const u = window.currentUser;
  document.getElementById('dash-user-avatar').textContent = u.fname[0].toUpperCase();
  document.getElementById('dash-location').textContent = u.city || 'Mumbai, IN';

  await Promise.all([
    renderDashHome(),
    renderRequestsTab(),
    renderHistoryTab(),
    renderProfileTab(),
    renderCentersTab(),
    renderRewardsTab(),
    updateNotifBadge(),
  ]);

  showDashTab(tab || 'home');
}

function showDashTab(tab) {
  window.currentDashTab = tab;
  const tabs = ['home','requests','history','profile','find-centers','rewards'];
  tabs.forEach(t => {
    const el  = document.getElementById('dtab-' + t);
    if (el) el.classList.toggle('hidden', t !== tab);
    const nav = document.getElementById('dnav-' + t);
    if (nav) nav.classList.toggle('active', t === tab);
    const mob = document.getElementById('dmob-' + t);
    if (mob) mob.classList.toggle('active', t === tab);
  });
  const titles = { home:'Dashboard', requests:'Blood Requests', history:'Donation History', profile:'My Profile', 'find-centers':'Find Centers', rewards:'Rewards' };
  const titleEl = document.getElementById('dash-page-title');
  if (titleEl) titleEl.textContent = titles[tab] || 'Dashboard';
  closeMobileSidebar();
}

// ---- HOME TAB ----
async function renderDashHome() {
  const u = window.currentUser;
  const level    = getDonorLevel(u.donations || 0);
  const eligible = isEligibleNow(u.lastDonation);

  setTextContent('home-blood-type', u.bloodType || '?');
  setTextContent('home-blood-desc', getBloodDesc(u.bloodType));

  const eligEl = document.getElementById('home-eligibility');
  if (eligEl) {
    eligEl.className = 'badge ' + (eligible ? 'badge-normal' : 'badge-info');
    eligEl.innerHTML = `<span class="dot" style="background:${eligible ? 'var(--success)' : 'var(--info)'}"></span> ${eligible ? 'Eligible to Donate' : 'On Cooldown'}`;
  }
  setTextContent('home-last-donation', u.lastDonation ? `Last donation: ${formatDate(u.lastDonation)}` : 'No donations yet — start today!');
  setTextContent('home-next-eligible', getNextEligibleDate(u.lastDonation));
  setTextContent('home-total-donations', u.donations || 0);
  setTextContent('stat-total-donations', u.donations || 0);
  setTextContent('stat-lives-saved', Math.floor((u.donations || 0) * 3));
  setTextContent('stat-donor-level', level.name);
  setTextContent('stat-points', (u.points || 0).toLocaleString());

  const requests = (await DB.getRequests())
    .filter(r => r.status === 'open')
    .sort((a, b) => { const o = {urgent:0,high:1,normal:2}; return (o[a.urgency]||2)-(o[b.urgency]||2); })
    .slice(0, 4);

  const homeReqEl = document.getElementById('home-req-list');
  if (homeReqEl) {
    homeReqEl.innerHTML = requests.length
      ? requests.map(r => renderRequestCard(r)).join('')
      : `<div class="empty-state" style="padding:40px 20px;"><span class="material-symbols-outlined empty-icon">volunteer_activism</span><h4>No active requests</h4><p>Check back soon for blood requests near you.</p></div>`;
  }

  await renderNotifList();
}

async function renderNotifList() {
  const notifs    = await DB.getNotifications(currentUser?.id);
  const container = document.getElementById('notif-list');
  if (!container) return;
  if (!notifs.length) {
    container.innerHTML = '<p style="text-align:center;color:var(--text-muted);font-size:13px;padding:20px;">No notifications yet.</p>';
    return;
  }
  container.innerHTML = notifs.slice(0, 8).map(renderNotificationItem).join('');
}

// ---- REQUESTS TAB ----
async function renderRequestsTab() { await filterAndRenderRequests(); }

async function filterAndRenderRequests() {
  const blood   = document.getElementById('rf-blood')?.value || '';
  const urgency = document.getElementById('rf-urgency')?.value || '';
  const status  = document.getElementById('rf-status')?.value || 'open';

  let requests = await DB.getRequests();
  if (status === 'open')     requests = requests.filter(r => r.status === 'open');
  else if (status === 'accepted') requests = requests.filter(r => r.status === 'accepted');
  else if (status === 'mine')     requests = requests.filter(r => r.acceptedBy === currentUser?.id);
  if (blood)   requests = requests.filter(r => r.bloodType === blood);
  if (urgency) requests = requests.filter(r => r.urgency === urgency);
  requests.sort((a, b) => {
    const o = {urgent:0,high:1,normal:2};
    return (o[a.urgency]||2) - (o[b.urgency]||2) || new Date(b.createdAt) - new Date(a.createdAt);
  });

  const container = document.getElementById('req-list');
  if (!container) return;
  if (!requests.length) {
    container.innerHTML = `<div class="empty-state" style="grid-column:span 2;"><span class="material-symbols-outlined empty-icon">search_off</span><h4>No requests found</h4><p>Try adjusting your filters.</p></div>`;
    return;
  }
  container.innerHTML = requests.map(r => renderRequestCard(r)).join('');

  const openCount = (await DB.getRequests()).filter(r => r.status === 'open').length;
  const badge = document.getElementById('dnav-requests')?.querySelector('.nav-badge');
  if (badge) { badge.textContent = openCount; badge.style.display = openCount ? '' : 'none'; }
}

// ---- HISTORY TAB ----
async function renderHistoryTab() {
  const donations = await DB.getDonationsByUser(currentUser?.id);
  const container = document.getElementById('history-list');
  if (!container) return;
  if (!donations.length) {
    container.innerHTML = `<div class="empty-state"><span class="material-symbols-outlined empty-icon" style="font-variation-settings:'FILL' 0">history</span><h4>No donations yet</h4><p>Accept a blood request to start your donation journey and earn rewards!</p><button class="btn btn-primary" onclick="showDashTab('requests')">Find Requests</button></div>`;
    return;
  }
  container.innerHTML = donations.map(d => `
    <div class="stat-card animate-fade" style="display:flex;align-items:center;gap:16px;padding:18px 22px;">
      <div class="blood-badge blood-badge-lg">${d.bloodType}</div>
      <div style="flex:1;">
        <h4 style="font-size:15px;font-weight:700;color:var(--text-primary);margin-bottom:3px;">${escHtml(d.hospital)}</h4>
        <p style="font-size:12px;color:var(--text-muted);">${escHtml(d.patient)} · ${d.units} unit${d.units>1?'s':''}</p>
        <p style="font-size:12px;color:var(--text-muted);margin-top:2px;">${formatDate(d.date)}</p>
      </div>
      <div style="text-align:right;">
        <span style="display:inline-flex;align-items:center;gap:4px;background:var(--success-bg);color:var(--success);padding:4px 12px;border-radius:20px;font-size:11px;font-weight:700;">
          <span class="material-symbols-outlined" style="font-size:13px;font-variation-settings:'FILL' 1;">check_circle</span> Completed
        </span>
        <p style="font-size:12px;color:var(--primary);font-weight:700;margin-top:4px;">+100 pts</p>
      </div>
    </div>`).join('');
}

// ---- PROFILE TAB ----
function renderProfileTab() {
  const u = window.currentUser;
  const level = getDonorLevel(u.donations || 0);
  setTextContent('profile-avatar-text', u.fname[0].toUpperCase());
  setTextContent('profile-full-name', u.fname + ' ' + u.lname);
  setTextContent('profile-email-text', u.email);
  setTextContent('profile-blood-badge', u.bloodType || '?');
  setTextContent('profile-stat-donations', u.donations || 0);
  setTextContent('profile-stat-points', (u.points || 0).toLocaleString());
  setTextContent('profile-stat-level', level.name);
  setTextContent('profile-stat-lives', Math.floor((u.donations || 0) * 3));
  setVal('edit-fname', u.fname);
  setVal('edit-lname', u.lname);
  setVal('edit-phone', u.phone || '');
  setVal('edit-city', u.city || '');
  setVal('edit-blood', u.bloodType || '');
  setVal('edit-notes', u.medicalNotes || '');
}

async function saveProfile() {
  const fname = document.getElementById('edit-fname').value.trim();
  const lname = document.getElementById('edit-lname').value.trim();
  if (!fname || !lname) { showToast('Name cannot be empty.', 'warning'); return; }
  const updated = await DB.updateUser(currentUser.id, {
    fname, lname,
    phone:        document.getElementById('edit-phone').value.trim(),
    city:         document.getElementById('edit-city').value.trim(),
    bloodType:    document.getElementById('edit-blood').value,
    medicalNotes: document.getElementById('edit-notes').value.trim(),
  });
  window.currentUser = updated;
  DB.setSession(updated);
  showToast('Profile updated! ✅', 'success');
  await renderDonorDashboard('profile');
}

// ---- FIND CENTERS TAB ----
const CENTERS = [
  { name: 'Lilavati Hospital',       address: 'Bandra West, Mumbai',     distance: '2.4 km', phone: '+91 22 2675 1000', status: 'Open',     hours: '8am–8pm',  accepts: ['O-','A+','B+','AB+'] },
  { name: 'Kokilaben Hospital',      address: 'Andheri West, Mumbai',    distance: '4.1 km', phone: '+91 22 3060 0000', status: 'Open',     hours: '9am–6pm',  accepts: ['A-','AB+','O+','B-'] },
  { name: 'Hinduja Hospital',        address: 'Mahim, Mumbai',           distance: '5.8 km', phone: '+91 22 2445 2222', status: 'Open 24/7', hours: '24/7',    accepts: ['B-','AB-','O-','A+'] },
  { name: 'Breach Candy Hospital',   address: 'Breach Candy, Mumbai',    distance: '3.2 km', phone: '+91 22 2367 1888', status: 'Open',     hours: '8am–9pm',  accepts: ['A+','O+','B+'] },
  { name: 'Nanavati Hospital',       address: 'Vile Parle West, Mumbai', distance: '6.5 km', phone: '+91 22 2626 7500', status: 'Open',     hours: '8am–8pm',  accepts: ['O-','B+','AB+'] },
  { name: 'P.D. Hinduja Blood Bank', address: 'Mahim, Mumbai',           distance: '5.9 km', phone: '+91 22 2444 9191', status: 'Open 24/7', hours: '24/7',   accepts: ['All Types'] },
];

function renderCentersTab() {
  const container = document.getElementById('centers-grid');
  if (!container) return;
  container.innerHTML = CENTERS.map(c => `
    <div class="stat-card" style="transition:transform 0.2s;" onmouseenter="this.style.transform='translateY(-3px)'" onmouseleave="this.style.transform=''">
      <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:12px;">
        <div>
          <h4 style="font-size:14px;font-weight:700;color:var(--text-primary);margin-bottom:4px;">${escHtml(c.name)}</h4>
          <p style="font-size:12px;color:var(--text-muted);display:flex;align-items:center;gap:3px;"><span class="material-symbols-outlined" style="font-size:13px;">location_on</span>${escHtml(c.address)}</p>
        </div>
        <span style="font-size:11px;font-weight:700;background:var(--success-bg);color:var(--success);padding:3px 10px;border-radius:20px;white-space:nowrap;">${escHtml(c.status)}</span>
      </div>
      <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:14px;">
        <span class="dist-badge"><span class="material-symbols-outlined">near_me</span>${c.distance}</span>
        <span class="dist-badge"><span class="material-symbols-outlined">schedule</span>${c.hours}</span>
        <span class="dist-badge"><span class="material-symbols-outlined">call</span>${c.phone}</span>
      </div>
      <div style="display:flex;align-items:center;justify-content:space-between;">
        <div style="display:flex;flex-wrap:wrap;gap:4px;">${c.accepts.map(bt => `<span style="background:var(--primary-light);color:var(--primary);font-size:10px;font-weight:700;padding:2px 7px;border-radius:4px;">${bt}</span>`).join('')}</div>
        <a href="https://maps.google.com/?q=${encodeURIComponent(c.name + ' ' + c.address)}" target="_blank" class="btn btn-ghost btn-sm">
          <span class="material-symbols-outlined" style="font-size:14px;">open_in_new</span> Directions
        </a>
      </div>
    </div>`).join('');
}

// ---- REWARDS TAB ----
function renderRewardsTab() {
  const u = window.currentUser;
  const level     = getDonorLevel(u.donations || 0);
  const nextLevel = getNextLevel(u.donations || 0);
  const pts       = u.points || 0;

  setTextContent('reward-points-value', pts.toLocaleString());
  setTextContent('reward-current-level', level.name);

  if (nextLevel) {
    const ptsNeeded = nextLevel.pts - pts;
    setTextContent('reward-pts-to-next', `${Math.max(0, ptsNeeded)} pts to ${nextLevel.name}`);
    const pct    = Math.min(100, ((pts - level.pts) / (nextLevel.pts - level.pts)) * 100);
    const progEl = document.getElementById('reward-progress');
    if (progEl) setTimeout(() => progEl.style.width = Math.max(5, pct) + '%', 300);
  } else {
    setTextContent('reward-pts-to-next', 'Max level reached! 🎉');
    const progEl = document.getElementById('reward-progress');
    if (progEl) setTimeout(() => progEl.style.width = '100%', 300);
  }

  const levelsEl = document.getElementById('levels-breakdown');
  if (levelsEl) {
    levelsEl.innerHTML = DONOR_LEVELS.map(l => {
      const isCurrent = l.name === level.name;
      const done      = (u.donations || 0) > l.max;
      return `
        <div style="display:flex;align-items:center;gap:12px;padding:10px 12px;border-radius:10px;${isCurrent ? 'background:rgba(242,13,32,0.05);border:1px solid rgba(242,13,32,0.15);' : ''}">
          <span style="font-size:22px;">${l.icon}</span>
          <div style="flex:1;">
            <p style="font-size:13px;font-weight:700;color:${isCurrent ? 'var(--primary)' : 'var(--text-primary)'};">${l.name}</p>
            <p style="font-size:11px;color:var(--text-muted);">${l.min}–${l.max === 9999 ? '∞' : l.max} donations · ${l.pts}+ pts</p>
          </div>
          ${done || isCurrent ? `<span class="material-symbols-outlined" style="color:${isCurrent ? 'var(--primary)' : 'var(--success)'};font-variation-settings:'FILL' 1;">${isCurrent ? 'radio_button_checked' : 'check_circle'}</span>` : ''}
        </div>`;
    }).join('');
  }
}

// ---- Notification Badge ----
async function updateNotifBadge() {
  const count = await DB.getUnreadCount(currentUser?.id);
  const dot   = document.getElementById('notif-dot');
  if (dot) dot.style.display = count > 0 ? 'block' : 'none';
  const openCount = (await DB.getRequests()).filter(r => r.status === 'open').length;
  const badge = document.getElementById('dnav-requests')?.querySelector('.nav-badge');
  if (badge) { badge.textContent = openCount; badge.style.display = openCount ? '' : 'none'; }
}

async function openNotifPanel() {
  await DB.markAllNotificationsRead(currentUser?.id);
  await updateNotifBadge();
  showDashTab('home');
  await renderNotifList();
}

// ---- Helpers ----
function setTextContent(id, val) { const el = document.getElementById(id); if (el) el.textContent = val; }
function setVal(id, val) { const el = document.getElementById(id); if (el) el.value = val; }
