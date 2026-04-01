/**
 * VitalFlow — Hospital Dashboard (Supabase Edition)
 */

async function renderHospitalDashboard(tab = 'overview') {
  if (!window.currentUser) return;
  const u = window.currentUser;
  document.getElementById('hosp-avatar-text').textContent = (u.hospitalName || u.fname)?.[0]?.toUpperCase() || 'H';
  document.getElementById('hosp-name-display').textContent = u.hospitalName || (u.fname + ' ' + u.lname);

  await Promise.all([
    renderHospitalStats(),
    renderMyRequests(),
    renderDonorResponses(),
  ]);
  showHospitalTab(tab || 'overview');
}

function showHospitalTab(tab) {
  window.currentHospitalTab = tab;
  const tabs = ['overview','my-requests','new-request','donor-responses'];
  tabs.forEach(t => {
    const el  = document.getElementById('htab-' + t);
    if (el) el.classList.toggle('hidden', t !== tab);
    const nav = document.getElementById('hnav-' + t);
    if (nav) nav.classList.toggle('active', t === tab);
  });
  const titles = { overview:'Hospital Dashboard', 'my-requests':'My Requests', 'new-request':'Post New Request', 'donor-responses':'Donor Responses' };
  const titleEl = document.getElementById('hosp-page-title');
  if (titleEl) titleEl.textContent = titles[tab] || 'Dashboard';
  closeMobileSidebar();
}

async function renderHospitalStats() {
  const allReqs  = await DB.getRequests();
  const myReqs   = allReqs.filter(r => r.postedBy === currentUser.id);
  const open      = myReqs.filter(r => r.status === 'open');
  const fulfilled = myReqs.filter(r => r.status === 'accepted');
  const donorIds  = new Set(fulfilled.map(r => r.acceptedBy).filter(Boolean));

  setInnerText('hosp-stat-total',     myReqs.length);
  setInnerText('hosp-stat-open',      open.length);
  setInnerText('hosp-stat-fulfilled', fulfilled.length);
  setInnerText('hosp-stat-donors',    donorIds.size);

  renderOverviewRequests(myReqs.slice(0, 5));
}

function renderOverviewRequests(requests) {
  const container = document.getElementById('hosp-overview-list');
  if (!container) return;
  if (!requests.length) {
    container.innerHTML = `<div style="text-align:center;padding:40px;color:var(--text-muted);font-size:14px;">No requests yet. Post your first blood request.</div>`;
    return;
  }
  container.innerHTML = requests.map(r => {
    const uc = URGENCY[r.urgency] || URGENCY.normal;
    return `
      <div style="display:flex;align-items:center;gap:14px;padding:12px 16px;border-radius:12px;background:#fafafa;border:1px solid var(--border-subtle);margin-bottom:8px;">
        <div class="blood-badge">${r.bloodType}</div>
        <div style="flex:1;">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:3px;">
            <span style="font-size:14px;font-weight:600;color:var(--text-primary);">${escHtml(r.patient)}</span>
            <span class="badge ${uc.badgeClass}" style="font-size:10px;">${uc.label}</span>
          </div>
          <p style="font-size:12px;color:var(--text-muted);">${r.units} unit${r.units>1?'s':''} · ${timeAgo(r.createdAt)}</p>
        </div>
        <div style="text-align:right;">
          <span style="font-size:12px;font-weight:700;color:${r.status === 'accepted' ? 'var(--success)' : r.status === 'cancelled' ? 'var(--text-muted)' : 'var(--warning)'};">
            ${r.status === 'accepted' ? '✅ Fulfilled' : r.status === 'cancelled' ? '❌ Cancelled' : '⏳ Open'}
          </span>
        </div>
      </div>`;
  }).join('');
}

async function renderMyRequests() {
  const container = document.getElementById('hosp-req-list');
  if (!container) return;
  const allReqs = await DB.getRequests();
  const requests = allReqs.filter(r => r.postedBy === currentUser.id);
  if (!requests.length) {
    container.innerHTML = `<div class="empty-state"><span class="material-symbols-outlined empty-icon">list_alt</span><h4>No requests yet</h4><p>Post your first blood request to alert nearby donors.</p><button class="btn btn-primary" onclick="showHospitalTab('new-request')">Post Request</button></div>`;
    return;
  }
  container.innerHTML = requests.map(r => renderHospitalReqCard(r)).join('');
}

function renderHospitalReqCard(r) {
  const uc = URGENCY[r.urgency] || URGENCY.normal;
  return `
    <div class="request-card ${uc.cardClass}">
      <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:12px;">
        <div style="display:flex;align-items:center;gap:12px;">
          <div class="blood-badge blood-badge-lg">${r.bloodType}</div>
          <div>
            <h4 style="font-size:16px;font-weight:700;color:var(--text-primary);">${escHtml(r.patient)}</h4>
            <p style="font-size:13px;color:var(--text-muted);">${r.units} unit${r.units>1?'s':''} · ${r.contact}</p>
          </div>
        </div>
        <div style="display:flex;flex-direction:column;align-items:flex-end;gap:6px;">
          <span class="badge ${uc.badgeClass}">${uc.label}</span>
          <span style="font-size:12px;font-weight:700;color:${r.status==='accepted'?'var(--success)':r.status==='cancelled'?'var(--text-muted)':'var(--warning)'};">
            ${r.status === 'accepted' ? '✅ Fulfilled' : r.status === 'cancelled' ? '❌ Cancelled' : '⏳ Open'}
          </span>
        </div>
      </div>
      <div style="display:flex;flex-wrap:wrap;gap:7px;margin-bottom:12px;">
        <span class="dist-badge"><span class="material-symbols-outlined">location_on</span>${escHtml(r.address)}</span>
        <span class="dist-badge"><span class="material-symbols-outlined">near_me</span>${r.distance} km</span>
        <span class="dist-badge"><span class="material-symbols-outlined">schedule</span>${timeAgo(r.createdAt)}</span>
      </div>
      ${r.notes ? `<p style="font-size:12px;color:var(--text-secondary);background:#f8fafc;border-radius:8px;padding:8px 12px;margin-bottom:12px;">${escHtml(r.notes)}</p>` : ''}
      ${r.status === 'open' ? `
        <div style="display:flex;gap:10px;justify-content:flex-end;">
          <button class="btn btn-ghost btn-sm" onclick="editRequest('${r.id}')">
            <span class="material-symbols-outlined" style="font-size:15px;">edit</span> Edit
          </button>
          <button class="btn btn-sm" style="background:#fef2f2;color:#ef4444;" onclick="cancelRequest('${r.id}')">
            <span class="material-symbols-outlined" style="font-size:15px;">cancel</span> Cancel
          </button>
        </div>` : ''}
    </div>`;
}

async function renderDonorResponses() {
  const container = document.getElementById('hosp-donor-list');
  if (!container) return;
  const allReqs = await DB.getRequests();
  const myReqs  = allReqs.filter(r => r.postedBy === currentUser.id && r.status === 'accepted' && r.acceptedBy);

  if (!myReqs.length) {
    container.innerHTML = `<div class="empty-state"><span class="material-symbols-outlined empty-icon">people</span><h4>No donor responses yet</h4><p>When donors accept your requests, their details will appear here.</p></div>`;
    return;
  }

  // Fetch all donor profiles in one call
  const donorIds = [...new Set(myReqs.map(r => r.acceptedBy))];
  const allUsers = await DB.getUsers();

  container.innerHTML = myReqs.map(r => {
    const donor = allUsers.find(u => u.id === r.acceptedBy);
    if (!donor) return '';
    const level = getDonorLevel(donor.donations || 0);
    return `
      <div class="stat-card animate-fade" style="display:flex;align-items:center;gap:16px;padding:18px 22px;">
        <div style="width:48px;height:48px;border-radius:12px;background:var(--primary);display:flex;align-items:center;justify-content:center;color:white;font-weight:700;font-size:18px;flex-shrink:0;">${donor.fname[0]?.toUpperCase()}</div>
        <div style="flex:1;">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">
            <h4 style="font-size:15px;font-weight:700;color:var(--text-primary);">${escHtml(donor.fname + ' ' + donor.lname)}</h4>
            <span class="blood-badge" style="width:36px;height:36px;font-size:11px;">${donor.bloodType || '?'}</span>
          </div>
          <p style="font-size:12px;color:var(--text-muted);">${escHtml(donor.city || 'Unknown')} · ${escHtml(donor.phone || 'No phone')} · ${level.icon} ${level.name}</p>
          <p style="font-size:12px;color:var(--text-secondary);margin-top:3px;">For: <strong>${escHtml(r.patient)}</strong></p>
        </div>
        <div style="text-align:right;">
          <span style="display:inline-flex;align-items:center;gap:4px;background:var(--success-bg);color:var(--success);padding:4px 12px;border-radius:20px;font-size:11px;font-weight:700;">
            <span class="material-symbols-outlined" style="font-size:13px;font-variation-settings:'FILL' 1;">check_circle</span>
            Accepted ${timeAgo(r.acceptedAt)}
          </span>
          <p style="margin-top:6px;"><a href="tel:${donor.phone}" class="btn btn-ghost btn-sm">
            <span class="material-symbols-outlined" style="font-size:14px;">call</span> Call
          </a></p>
        </div>
      </div>`;
  }).join('');
}

async function handleHospitalRequest() {
  const patient   = document.getElementById('hosp-req-patient').value.trim();
  const bloodType = document.getElementById('hosp-req-blood').value;
  const units     = parseInt(document.getElementById('hosp-req-units').value);
  const urgency   = document.getElementById('hosp-req-urgency').value;
  const contact   = document.getElementById('hosp-req-contact').value.trim();
  const distance  = parseFloat(document.getElementById('hosp-req-distance').value) || 5;
  const notes     = document.getElementById('hosp-req-notes').value.trim();

  clearError('hosp-req-error');
  if (!patient || !bloodType || !units || !contact) {
    showError('hosp-req-error', 'Please fill in all required fields.'); return;
  }

  const u = window.currentUser;
  const req = {
    patient, bloodType, units, urgency,
    hospital: u.hospitalName || (u.fname + ' Hospital'),
    address:  u.hospitalAddress || 'Hospital Address',
    contact, distance, notes,
    status: 'open', postedBy: u.id, acceptedBy: null,
  };

  const saved = await DB.addRequest(req);
  if (!saved) { showError('hosp-req-error', 'Failed to post request. Please try again.'); return; }

  // Notify all donors
  const donors = (await DB.getUsers()).filter(u2 => u2.type === 'donor');
  await Promise.all(donors.map(d =>
    DB.addNotification(d.id, `${URGENCY[saved.urgency]?.emoji || '🔴'} New ${bloodType} blood request at ${saved.hospital} (${distance} km away)`, urgency)
  ));

  ['hosp-req-patient','hosp-req-blood','hosp-req-units','hosp-req-contact','hosp-req-distance','hosp-req-notes'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  clearError('hosp-req-error');
  showToast('Blood request posted! Donors have been notified. 🩸', 'success');
  await renderHospitalDashboard('my-requests');
}

async function cancelRequest(reqId) {
  if (!confirm('Are you sure you want to cancel this request?')) return;
  await DB.updateRequest(reqId, { status: 'cancelled' });
  showToast('Request cancelled.', 'info');
  await renderHospitalDashboard(window.currentHospitalTab);
}

async function editRequest(reqId) {
  const req = await DB.getRequestById(reqId);
  if (!req) return;
  showHospitalTab('new-request');
  setFormVal('hosp-req-patient',  req.patient);
  setFormVal('hosp-req-blood',    req.bloodType);
  setFormVal('hosp-req-units',    req.units);
  setFormVal('hosp-req-urgency',  req.urgency);
  setFormVal('hosp-req-contact',  req.contact);
  setFormVal('hosp-req-distance', req.distance);
  setFormVal('hosp-req-notes',    req.notes);
  await DB.updateRequest(reqId, { status: 'cancelled' });
  showToast('Editing request — submit to re-post.', 'info');
}

// helpers
function setInnerText(id, val) { const el = document.getElementById(id); if (el) el.textContent = val; }
function setFormVal(id, val) { const el = document.getElementById(id); if (el) el.value = val || ''; }
