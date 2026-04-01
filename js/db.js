/**
 * VitalFlow — Supabase Database Module
 * Replaces the localStorage DB with real Supabase backend calls.
 *
 * SETUP:
 *   1. Create a Supabase project at https://supabase.com
 *   2. Run supabase_schema.sql in your SQL editor
 *   3. Replace the two constants below with your project values
 *      (Dashboard → Settings → API)
 */

const SUPABASE_URL = 'https://jmxucewjjpaqrrqtfsjf.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpteHVjZXdqanBhcXJycXRmc2pmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUwMjE0NjEsImV4cCI6MjA5MDU5NzQ2MX0.3t0TTk0cb3aTuwcIPaTa1sXYYoaO5CP4EWJob5H6zaU';

const _sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let _sessionCache = null;

const DB = (() => {

  // SESSION
  async function getSession() {
    if (_sessionCache) return _sessionCache;
    const { data: { session } } = await _sb.auth.getSession();
    if (!session) return null;
    const profile = await getUserById(session.user.id);
    if (!profile) return null;
    _sessionCache = profile;
    return profile;
  }
  function clearSession() { _sessionCache = null; }
  function setSession(profile) { _sessionCache = profile; }

  // USERS / PROFILES
  async function getUserById(id) {
    const { data, error } = await _sb.from('profiles').select('*').eq('id', id).single();
    if (error) { console.error('getUserById', error); return null; }
    return _mapProfile(data);
  }
  async function getUserByEmail(email) {
    const { data, error } = await _sb.from('profiles').select('*').eq('email', email.toLowerCase()).maybeSingle();
    if (error) { console.error('getUserByEmail', error); return null; }
    return data ? _mapProfile(data) : null;
  }
  async function getUsers() {
    const { data, error } = await _sb.from('profiles').select('*');
    if (error) { console.error('getUsers', error); return []; }
    return data.map(_mapProfile);
  }
  async function updateUser(id, updates) {
    const { data, error } = await _sb.from('profiles').update(_profileToDb(updates)).eq('id', id).select().single();
    if (error) { console.error('updateUser', error); return null; }
    const mapped = _mapProfile(data);
    if (id === _sessionCache?.id) _sessionCache = mapped;
    return mapped;
  }

  // AUTH
  async function signUp(email, password, profileData) {
    const { data, error } = await _sb.auth.signUp({ email, password });
    if (error) return { user: null, error };
    const uid = data.user.id;
    const { error: profileError } = await _sb.from('profiles').insert({ id: uid, email: email.toLowerCase(), ..._profileToDb(profileData) });
    if (profileError) { console.error('profile insert', profileError); return { user: null, error: profileError }; }
    const fullProfile = await getUserById(uid);
    _sessionCache = fullProfile;
    return { user: fullProfile, error: null };
  }
  async function signIn(email, password) {
    const { data, error } = await _sb.auth.signInWithPassword({ email, password });
    if (error) return { user: null, error };
    const profile = await getUserById(data.user.id);
    if (!profile) return { user: null, error: { message: 'Profile not found.' } };
    _sessionCache = profile;
    return { user: profile, error: null };
  }
  async function signOut() { _sessionCache = null; await _sb.auth.signOut(); }

  // BLOOD REQUESTS
  async function getRequests() {
    const { data, error } = await _sb.from('blood_requests').select('*').order('created_at', { ascending: false });
    if (error) { console.error('getRequests', error); return []; }
    return data.map(_mapRequest);
  }
  async function getRequestById(id) {
    const { data, error } = await _sb.from('blood_requests').select('*').eq('id', id).single();
    if (error) { console.error('getRequestById', error); return null; }
    return _mapRequest(data);
  }
  async function addRequest(req) {
    const { id: _id, ...rest } = req;
    const { data, error } = await _sb.from('blood_requests').insert(_requestToDb(rest)).select().single();
    if (error) { console.error('addRequest', error); return null; }
    return _mapRequest(data);
  }
  async function updateRequest(id, updates) {
    const { data, error } = await _sb.from('blood_requests').update(_requestToDb(updates)).eq('id', id).select().single();
    if (error) { console.error('updateRequest', error); return null; }
    return _mapRequest(data);
  }

  // DONATIONS
  async function getDonations() {
    const { data, error } = await _sb.from('donations').select('*').order('created_at', { ascending: false });
    if (error) { console.error('getDonations', error); return []; }
    return data.map(_mapDonation);
  }
  async function getDonationsByUser(uid) {
    const { data, error } = await _sb.from('donations').select('*').eq('donor_id', uid).order('created_at', { ascending: false });
    if (error) { console.error('getDonationsByUser', error); return []; }
    return data.map(_mapDonation);
  }
  async function addDonation(donation) {
    const { id: _id, ...rest } = donation;
    const { data, error } = await _sb.from('donations').insert(_donationToDb(rest)).select().single();
    if (error) { console.error('addDonation', error); return null; }
    return _mapDonation(data);
  }

  // NOTIFICATIONS
  async function getNotifications(uid) {
    const { data, error } = await _sb.from('notifications').select('*').eq('user_id', uid).order('created_at', { ascending: false }).limit(30);
    if (error) { console.error('getNotifications', error); return []; }
    return data.map(_mapNotif);
  }
  async function addNotification(uid, msg, type = 'info') {
    const { data, error } = await _sb.from('notifications').insert({ user_id: uid, message: msg, type }).select().single();
    if (error) { console.error('addNotification', error); return null; }
    return _mapNotif(data);
  }
  async function markAllNotificationsRead(uid) {
    const { error } = await _sb.from('notifications').update({ is_read: true }).eq('user_id', uid).eq('is_read', false);
    if (error) console.error('markAllRead', error);
  }
  async function getUnreadCount(uid) {
    const { count, error } = await _sb.from('notifications').select('id', { count: 'exact', head: true }).eq('user_id', uid).eq('is_read', false);
    if (error) { console.error('getUnreadCount', error); return 0; }
    return count || 0;
  }

  // REAL-TIME SUBSCRIPTIONS
  function subscribeToRequests(callback) {
    return _sb.channel('blood_requests_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'blood_requests' }, callback)
      .subscribe();
  }
  function subscribeToNotifications(uid, callback) {
    return _sb.channel('user_notifs_' + uid)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${uid}` }, callback)
      .subscribe();
  }
  function unsubscribe(channel) { if (channel) _sb.removeChannel(channel); }

  // MAPPERS
  function _mapProfile(r) {
    if (!r) return null;
    return { id: r.id, type: r.type, fname: r.fname, lname: r.lname, email: r.email, phone: r.phone || '', bloodType: r.blood_type || '', city: r.city || '', donations: r.donations || 0, points: r.points || 50, lastDonation: r.last_donation || null, medicalNotes: r.medical_notes || '', hospitalName: r.hospital_name || '', hospitalAddress: r.hospital_address || '', createdAt: r.created_at };
  }
  function _profileToDb(obj) {
    const out = {};
    if (obj.type !== undefined)            out.type = obj.type;
    if (obj.fname !== undefined)           out.fname = obj.fname;
    if (obj.lname !== undefined)           out.lname = obj.lname;
    if (obj.email !== undefined)           out.email = obj.email.toLowerCase();
    if (obj.phone !== undefined)           out.phone = obj.phone;
    if (obj.bloodType !== undefined)       out.blood_type = obj.bloodType;
    if (obj.city !== undefined)            out.city = obj.city;
    if (obj.donations !== undefined)       out.donations = obj.donations;
    if (obj.points !== undefined)          out.points = obj.points;
    if (obj.lastDonation !== undefined)    out.last_donation = obj.lastDonation;
    if (obj.medicalNotes !== undefined)    out.medical_notes = obj.medicalNotes;
    if (obj.hospitalName !== undefined)    out.hospital_name = obj.hospitalName;
    if (obj.hospitalAddress !== undefined) out.hospital_address = obj.hospitalAddress;
    return out;
  }
  function _mapRequest(r) {
    return { id: r.id, patient: r.patient, bloodType: r.blood_type, units: r.units, urgency: r.urgency, hospital: r.hospital, address: r.address, contact: r.contact, distance: r.distance, notes: r.notes || '', status: r.status, postedBy: r.posted_by, acceptedBy: r.accepted_by || null, acceptedAt: r.accepted_at || null, createdAt: r.created_at };
  }
  function _requestToDb(obj) {
    const out = {};
    if (obj.patient !== undefined)    out.patient = obj.patient;
    if (obj.bloodType !== undefined)  out.blood_type = obj.bloodType;
    if (obj.units !== undefined)      out.units = obj.units;
    if (obj.urgency !== undefined)    out.urgency = obj.urgency;
    if (obj.hospital !== undefined)   out.hospital = obj.hospital;
    if (obj.address !== undefined)    out.address = obj.address;
    if (obj.contact !== undefined)    out.contact = obj.contact;
    if (obj.distance !== undefined)   out.distance = obj.distance;
    if (obj.notes !== undefined)      out.notes = obj.notes;
    if (obj.status !== undefined)     out.status = obj.status;
    if (obj.postedBy !== undefined)   out.posted_by = obj.postedBy;
    if (obj.acceptedBy !== undefined) out.accepted_by = obj.acceptedBy;
    if (obj.acceptedAt !== undefined) out.accepted_at = obj.acceptedAt;
    return out;
  }
  function _mapDonation(r) {
    return { id: r.id, donorId: r.donor_id, requestId: r.request_id, hospital: r.hospital, patient: r.patient, bloodType: r.blood_type, units: r.units, status: r.status, arrivalTime: r.arrival_time, note: r.note, date: r.created_at };
  }
  function _donationToDb(obj) {
    const out = {};
    if (obj.donorId !== undefined)    out.donor_id = obj.donorId;
    if (obj.requestId !== undefined)  out.request_id = obj.requestId;
    if (obj.hospital !== undefined)   out.hospital = obj.hospital;
    if (obj.patient !== undefined)    out.patient = obj.patient;
    if (obj.bloodType !== undefined)  out.blood_type = obj.bloodType;
    if (obj.units !== undefined)      out.units = obj.units;
    if (obj.status !== undefined)     out.status = obj.status;
    if (obj.arrivalTime !== undefined) out.arrival_time = obj.arrivalTime;
    if (obj.note !== undefined)       out.note = obj.note;
    return out;
  }
  function _mapNotif(r) {
    return { id: r.id, msg: r.message, type: r.type, time: r.created_at, read: r.is_read };
  }

  return {
    signUp, signIn, signOut,
    getSession, clearSession, setSession,
    getUserById, getUserByEmail, getUsers, updateUser,
    getRequests, getRequestById, addRequest, updateRequest,
    getDonations, getDonationsByUser, addDonation,
    getNotifications, addNotification, markAllNotificationsRead, getUnreadCount,
    subscribeToRequests, subscribeToNotifications, unsubscribe,
    client: _sb,
  };
})();
