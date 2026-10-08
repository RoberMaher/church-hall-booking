/* Shared store: localStorage persistence. Starts with ZERO rooms.
   Rooms are added only from the secretary account (admin.html).
   Only secretary accounts exist — no public signup. */
(function () {
  'use strict';
  var DB_KEY = 'smarthard_v1';
  var SESSION_KEY = 'smarthard_session';

  function seed() {
    return {
      rooms: [], // empty by design — secretary adds them
      secretaries: [
        { code: 'SEC-ADMIN-01', name: 'أمين السكرتارية الرئيسي', phone: '0122 345 6789', active: true, main: true }
      ],
      services: [
        { code: 'SRV-BOYS-PRI', name: 'خدمة ابتدائي بنين' }
      ],
      bookings: [],
      blocks: [] // secretary hour-blocks: {id, roomId, date, from, to}
    };
  }

  /* Storage that survives hostile browsers:
     - localStorage (primary, shared across tabs, persists across visits)
     - window.name envelope (fallback — lives with the TAB across page
       loads, so rooms/codes/bookings AND the session survive browsers that
       wipe localStorage on every navigation). Envelope: {db, ses}. */
  var ENV_PREFIX = 'smart:';

  function readLS(key) {
    try {
      var raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  }
  function readEnvelope() {
    try {
      var w = window.name || '';
      if (w.indexOf(ENV_PREFIX) === 0) return JSON.parse(decodeURIComponent(w.slice(ENV_PREFIX.length)));
    } catch (e) { /* ignore */ }
    return null;
  }
  function writeEnvelope(env) {
    try { window.name = ENV_PREFIX + encodeURIComponent(JSON.stringify(env)); } catch (e) { /* ignore */ }
  }

  function normalize(db) {
    if (!Array.isArray(db.rooms)) db.rooms = [];
    if (!Array.isArray(db.secretaries) || !db.secretaries.length) db.secretaries = seed().secretaries;
    if (!Array.isArray(db.services)) db.services = [];
    if (!Array.isArray(db.bookings)) db.bookings = [];
    if (!Array.isArray(db.blocks)) db.blocks = [];
    return db;
  }

  function persist(db) {
    try { localStorage.setItem(DB_KEY, JSON.stringify(db)); } catch (e) { /* ignore */ }
    try {
      var env = readEnvelope() || {};
      env.db = db;
      writeEnvelope(env);
    } catch (e2) { /* ignore */ }
  }

  function load() {
    var db = readLS(DB_KEY);
    if (!db) {
      var env = readEnvelope();
      db = (env && env.db) || null;
    }
    if (!db) db = seed();
    normalize(db);
    persist(db); // converge both copies
    return db;
  }

  function save(db) { persist(db); }

  function getSession() {
    var s = readLS(SESSION_KEY);
    if (s) return s;
    var env = readEnvelope();
    return (env && env.ses) || null;
  }
  function setSession(s) {
    try {
      if (s) localStorage.setItem(SESSION_KEY, JSON.stringify(s));
      else localStorage.removeItem(SESSION_KEY);
    } catch (e) { /* envelope below still applies */ }
    try {
      var env = readEnvelope() || {};
      env.ses = s || null;
      writeEnvelope(env);
    } catch (e2) { /* ignore */ }
  }

  function uid(prefix) {
    return prefix + '-' + Date.now().toString(36).toUpperCase() + Math.floor(Math.random() * 90 + 10);
  }
  function bookingCode() {
    var n = 1000 + Math.floor(Math.random() * 9000);
    return 'BK-2026-' + n;
  }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  /* Normalize typed codes: Arabic-keyboard dashes/tatweel -> hyphen,
     Arabic-Indic digits -> Latin, drop spaces & invisible RTL/ZW marks
     that sneak in when copy-pasting. */
  function normCode(raw) {
    return String(raw || '')
      .replace(/[ـ–—−]/g, '-')
      .replace(/[٠-٩]/g, function (d) { return '0123456789'['٠١٢٣٤٥٦٧٨٩'.indexOf(d)]; })
      .toUpperCase()
      .replace(/[^A-Z0-9-]/g, '');
  }

  /* 12-hour display for all shown times: "18:00" -> "6:00 م" (inputs stay native) */
  function t12(t) {
    var p = String(t == null ? '' : t).split(':');
    if (p.length < 2 || p[0] === '' || isNaN(+p[0])) return String(t || '');
    var h = +p[0], m = p[1];
    var ap = h < 12 ? 'ص' : 'م';
    var h12 = h % 12;
    if (h12 === 0) h12 = 12;
    return h12 + ':' + m + ' ' + ap;
  }

  var STATUS_AR = { available: 'متاحة', booked: 'محجوزة', review: 'قيد المراجعة', pending: 'منتظر', approved: 'معتمدة', rejected: 'مرفوضة', cancelled: 'ملغاة' };
  var VERSION = 'v6'; // bump on every release; gate+admin compare it to detect mixed cached copies

  window.Store = { load: load, save: save, getSession: getSession, setSession: setSession, uid: uid, bookingCode: bookingCode, esc: esc, normCode: normCode, t12: t12, STATUS_AR: STATUS_AR, VERSION: VERSION };
})();
