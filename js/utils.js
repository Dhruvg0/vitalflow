/**
 * VitalFlow — Utilities & Helpers
 */

// ---- Time Helpers ----
function timeAgo(dateStr) {
  if (!dateStr) return 'Unknown';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

function formatDate(dateStr, opts = {}) {
  if (!dateStr) return 'N/A';
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric', ...opts
  });
}

// ---- Blood Type Helpers ----
const BLOOD_COMPAT = {
  'O-': { donate: 'All Types', receive: 'O-', label: 'Universal Donor' },
  'O+': { donate: 'O+, A+, B+, AB+', receive: 'O-, O+', label: 'Most Common' },
  'A-': { donate: 'A-, A+, AB-, AB+', receive: 'O-, A-', label: 'Rare Donor' },
  'A+': { donate: 'A+, AB+', receive: 'O-, O+, A-, A+', label: 'Common Type' },
  'B-': { donate: 'B-, B+, AB-, AB+', receive: 'O-, B-', label: 'Rare Donor' },
  'B+': { donate: 'B+, AB+', receive: 'O-, O+, B-, B+', label: 'Common Type' },
  'AB-': { donate: 'AB-, AB+', receive: 'A-, B-, O-, AB-', label: 'Universal Plasma' },
  'AB+': { donate: 'AB+', receive: 'All Types', label: 'Universal Recipient' },
};

function getBloodDesc(bt) {
  return (BLOOD_COMPAT[bt] || {}).label || 'Verified Donor';
}

function getNextEligibleDate(lastDonation) {
  if (!lastDonation) return 'Eligible Today';
  const last = new Date(lastDonation);
  const next = new Date(last.getTime() + 56 * 86400000);
  if (next <= new Date()) return 'Eligible Today';
  return formatDate(next.toISOString());
}

function isEligibleNow(lastDonation) {
  if (!lastDonation) return true;
  const next = new Date(new Date(lastDonation).getTime() + 56 * 86400000);
  return next <= new Date();
}

// ---- Donor Level ----
const DONOR_LEVELS = [
  { name: 'New Donor',    min: 0,  max: 1,   icon: '🩸', color: '#94a3b8', pts: 0 },
  { name: 'Active Donor', min: 2,  max: 5,   icon: '🥉', color: '#cd7f32', pts: 200 },
  { name: 'Silver Donor', min: 6,  max: 10,  icon: '🥈', color: '#94a3b8', pts: 600 },
  { name: 'Gold Donor',   min: 11, max: 20,  icon: '🥇', color: '#f59e0b', pts: 1100 },
  { name: 'Elite Donor',  min: 21, max: 9999, icon: '👑', color: '#f20d20', pts: 2100 },
];

function getDonorLevel(donations) {
  for (let i = DONOR_LEVELS.length - 1; i >= 0; i--) {
    if (donations >= DONOR_LEVELS[i].min) return DONOR_LEVELS[i];
  }
  return DONOR_LEVELS[0];
}

function getNextLevel(donations) {
  for (let i = 0; i < DONOR_LEVELS.length; i++) {
    if (donations <= DONOR_LEVELS[i].max && donations >= DONOR_LEVELS[i].min) {
      return DONOR_LEVELS[i + 1] || null;
    }
  }
  return null;
}

// ---- Toast ----
let toastTimer = null;
function showToast(msg, type = 'success', duration = 3500) {
  const toast = document.getElementById('toast');
  if (!toast) return;
  const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
  toast.querySelector('#toast-icon').textContent = icons[type] || '✅';
  toast.querySelector('#toast-msg').textContent = msg;
  toast.className = 'show ' + type;
  toast.id = 'toast';
  toast.classList.add('show', type);
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.classList.remove('show');
    toast.className = '';
    toast.id = 'toast';
  }, duration);
}

// ---- Modal Helpers ----
function openModal(id) {
  const el = document.getElementById(id);
  if (el) { el.classList.add('open'); document.body.style.overflow = 'hidden'; }
}
function closeModal(id) {
  const el = document.getElementById(id);
  if (el) { el.classList.remove('open'); document.body.style.overflow = ''; }
}

// ---- Dropdown Helpers ----
function toggleDropdown(id) {
  const el = document.getElementById(id);
  if (!el) return;
  const isOpen = el.classList.contains('open');
  // Close all dropdowns
  document.querySelectorAll('.dropdown-menu.open').forEach(d => d.classList.remove('open'));
  if (!isOpen) el.classList.add('open');
}

// Close dropdowns on outside click
document.addEventListener('click', (e) => {
  if (!e.target.closest('[data-dropdown]') && !e.target.closest('.dropdown-menu')) {
    document.querySelectorAll('.dropdown-menu.open').forEach(d => d.classList.remove('open'));
  }
});

// ---- Urgency Config ----
const URGENCY = {
  urgent: { label: 'Urgent', badgeClass: 'badge-urgent', cardClass: 'urgent', color: '#f20d20', emoji: '🔴' },
  high:   { label: 'High Priority', badgeClass: 'badge-high', cardClass: 'high', color: '#f97316', emoji: '🟠' },
  normal: { label: 'Normal', badgeClass: 'badge-normal', cardClass: 'normal', color: '#16a34a', emoji: '🟢' },
};

// ---- Render Helpers ----
function renderRequestCard(r, opts = {}) {
  const uc = URGENCY[r.urgency] || URGENCY.normal;
  const isAccepted = r.status === 'accepted';
  const isCancelled = r.status === 'cancelled';
  const acceptedByMe = isAccepted && r.acceptedBy === (window.currentUser?.id);

  return `
    <div class="request-card ${uc.cardClass} animate-fade">
      <div class="flex-between mb-3">
        <div style="display:flex;align-items:center;gap:12px;">
          <div class="blood-badge">${r.bloodType}</div>
          <div>
            <h4 style="font-size:14px;font-weight:700;color:var(--text-primary);margin-bottom:2px;">${escHtml(r.hospital)}</h4>
            <p style="font-size:12px;color:var(--text-muted);">${escHtml(r.patient)} · ${r.units} unit${r.units > 1 ? 's' : ''}</p>
          </div>
        </div>
        <span class="badge ${uc.badgeClass}">${uc.label}</span>
      </div>
      <div style="display:flex;flex-wrap:wrap;gap:7px;margin-bottom:12px;">
        <span class="dist-badge"><span class="material-symbols-outlined">near_me</span>${r.distance} km</span>
        <span class="dist-badge"><span class="material-symbols-outlined">location_on</span>${escHtml(r.address.split(',')[0])}</span>
        <span class="dist-badge"><span class="material-symbols-outlined">schedule</span>${timeAgo(r.createdAt)}</span>
      </div>
      ${r.notes ? `<p style="font-size:12px;color:var(--text-secondary);background:#f8fafc;border-radius:8px;padding:8px 12px;margin-bottom:12px;line-height:1.5;">${escHtml(r.notes)}</p>` : ''}
      <div class="flex-between">
        <span style="font-size:11px;color:var(--text-muted);font-weight:600;">#${r.id.slice(-6).toUpperCase()}</span>
        ${isCancelled
          ? `<span style="font-size:12px;color:var(--text-muted);font-weight:600;">Cancelled</span>`
          : isAccepted
            ? `<span style="display:inline-flex;align-items:center;gap:4px;background:#dcfce7;color:#15803d;padding:4px 12px;border-radius:20px;font-size:11px;font-weight:700;">
                <span class="material-symbols-outlined" style="font-size:13px;font-variation-settings:'FILL' 1;">check_circle</span>
                ${acceptedByMe ? 'You accepted' : 'Accepted'}
              </span>`
            : `<button class="btn btn-primary btn-sm" onclick="openAcceptModal('${r.id}')">
                <span class="material-symbols-outlined" style="font-size:14px;font-variation-settings:'FILL' 1;">volunteer_activism</span>
                Donate Now
              </button>`
        }
      </div>
    </div>`;
}

function renderNotificationItem(n) {
  const dotColor = { urgent: 'var(--primary)', high: '#f97316', success: 'var(--success)', info: 'var(--info)' }[n.type] || 'var(--info)';
  return `
    <div style="display:flex;align-items:flex-start;gap:12px;padding:10px 12px;border-radius:10px;transition:background 0.15s;${n.read ? '' : 'background:rgba(242,13,32,0.03);'}cursor:default;">
      <div style="width:8px;height:8px;border-radius:50%;background:${dotColor};flex-shrink:0;margin-top:6px;${n.read ? 'opacity:0.35;' : ''}"></div>
      <p style="flex:1;font-size:13px;color:var(--text-secondary);line-height:1.5;">${escHtml(n.msg)}</p>
      <span style="font-size:11px;color:var(--text-muted);flex-shrink:0;margin-top:2px;">${timeAgo(n.time)}</span>
    </div>`;
}

// ---- Security: HTML Escape ----
function escHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// ---- Accordion ----
document.addEventListener('click', (e) => {
  const trigger = e.target.closest('.accordion-trigger');
  if (!trigger) return;
  const item = trigger.closest('.accordion-item');
  const body = item.querySelector('.accordion-body');
  const inner = item.querySelector('.accordion-body-inner');
  const isOpen = item.classList.contains('open');
  // Close all
  document.querySelectorAll('.accordion-item.open').forEach(i => {
    i.classList.remove('open');
    i.querySelector('.accordion-body').style.maxHeight = '0';
  });
  if (!isOpen) {
    item.classList.add('open');
    body.style.maxHeight = inner.scrollHeight + 32 + 'px';
  }
});

// ---- Generate unique ID ----
function genId(prefix = 'id') {
  return prefix + Date.now() + Math.random().toString(36).slice(2, 6);
}

// ---- Password Visibility Toggle ----
function togglePasswordVisibility(inputId, btn) {
  const inp = document.getElementById(inputId);
  if (!inp) return;
  if (inp.type === 'password') {
    inp.type = 'text';
    btn.innerHTML = '<span class="material-symbols-outlined" style="font-size:18px;font-variation-settings:\'FILL\' 1;">visibility</span>';
  } else {
    inp.type = 'password';
    btn.innerHTML = '<span class="material-symbols-outlined" style="font-size:18px;">visibility_off</span>';
  }
}
