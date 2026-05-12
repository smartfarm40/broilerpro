// ===== DATA STORE =====
// Hybrid: Supabase sebagai source of truth, localStorage sebagai cache offline

// ---- Shortcut Supabase client ----
function _sb() { return AUTH.getSupabase(); }

// ---- Helper: baca localStorage dengan aman ----
function safeGetItem(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch (e) {
    console.warn('[DB] Gagal membaca key "' + key + '":', e.message);
    return fallback;
  }
}

// ---- Helper: tulis localStorage dengan aman ----
function safeSaveItem(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (e) {
    if (e.name === 'QuotaExceededError' || e.code === 22) {
      showStorageError('Penyimpanan penuh. Hapus data lama atau bersihkan cache browser.');
    } else {
      showStorageError('Gagal menyimpan data: ' + e.message);
    }
    return false;
  }
}

function showStorageError(msg) {
  if (typeof showToast === 'function') showToast('⚠️ ' + msg);
  else console.error('[DB] Storage error:', msg);
}

// ============================================================
// DB — in-memory store (diisi dari Supabase saat loadDB())
// ============================================================
const DB = {
  settings: {
    farmName:     'BroilerTrack',
    darkMode:     false,
    pushAlerts:   true,
    weeklyReports: false,
    units:        'metric'
  },
  flocks:    [],   // diisi dari tabel kandangs
  dailyLogs: [],   // diisi dari tabel data_harian (kandang aktif)
  inventory: []    // diisi dari tabel stock_pakan
};

// ---- Cache key per user ----
function _cacheKey(name) {
  return 'bt_' + (AUTH.userId || 'local') + '_' + name;
}

// ============================================================
// LOAD — ambil semua data dari Supabase ke DB (in-memory)
// ============================================================
async function loadDB() {
  const sb = _sb();
  if (!sb) { _loadFromCache(); return; }

  try {
    await Promise.all([
      _loadFlocks(sb),
      _loadSettings()
    ]);

    // Load daily logs untuk kandang aktif pertama
    const active = DB.flocks.find(f => f.active);
    if (active) await _loadDailyLogs(sb, active.id);

    await _loadInventory(sb);

    // Simpan ke cache
    _saveToCache();

  } catch (e) {
    console.warn('[DB] loadDB error, fallback ke cache:', e.message);
    _loadFromCache();
  }
}

async function _loadFlocks(sb) {
  const { data, error } = await sb
    .from('kandangs')
    .select('id, name, kapasitas, peternak, doc, usia, status, pj_user_id, lat, lng, created_at, officer')
    .order('created_at', { ascending: false });

  if (error) { console.warn('[DB] loadFlocks error:', error.message); return; }

  DB.flocks = (data || []).map(row => ({
    id:          row.id,
    name:        row.name,
    breed:       'Cobb 500',          // tabel kandangs belum punya kolom breed — default
    startDate:   row.created_at ? row.created_at.split('T')[0] : new Date().toISOString().split('T')[0],
    qty:         row.kapasitas || row.doc || 0,
    current_qty: row.kapasitas || row.doc || 0,
    age:         row.usia || 0,
    active:      row.status === 'aktif',
    officer:     row.officer || row.peternak || '',
    lat:         row.lat || null,
    lng:         row.lng || null,
    // simpan id asli untuk query
    _dbId:       row.id
  }));
}

async function _loadDailyLogs(sb, kandangId) {
  const { data, error } = await sb
    .from('data_harian')
    .select(`
      id, kandang_id, hari, tanggal,
      mati, culling,
      pakan_total, feed_code, feed_am, feed_pm,
      timbang_rows, checklist, activities,
      berat_rata_rata, is_complete,
      suhu_pagi, blower_nyala, inverter_status, inverter_hz, listrik_status,
      catatan, input_oleh, created_at
    `)
    .eq('kandang_id', kandangId)
    .order('hari', { ascending: true });

  if (error) { console.warn('[DB] loadDailyLogs error:', error.message); return; }

  DB.dailyLogs = (data || []).map(row => ({
    _id:          row.id,
    _kandangId:   row.kandang_id,
    day:          row.hari,
    date:         row.tanggal,
    mortality:    row.mati,
    culling:      row.culling || 0,
    feed_code:    row.feed_code || '',
    feed_am:      row.feed_am || null,
    feed_pm:      row.feed_pm || null,
    feed:         row.pakan_total || null,
    water:        null,                   // kolom air belum ada di tabel
    weight:       row.berat_rata_rata || null,
    timbang_rows: row.timbang_rows || [],
    checklist:    row.checklist || _buildChecklistFromRow(row),
    activities:   row.activities || [],
    notes:        row.catatan || '',
    is_complete:  row.is_complete || (row.mati !== null)
  }));

  // Tambah entry hari ini jika belum ada
  _ensureTodayLog(kandangId);
}

function _buildChecklistFromRow(row) {
  return {
    suhu:        row.suhu_pagi ? String(row.suhu_pagi) : '',
    kipas:       row.blower_nyala > 0 ? 'on' : 'off',
    kipasQty:    row.blower_nyala ? String(row.blower_nyala) : '',
    inverter:    row.inverter_status === 'on' ? 'on' : 'off',
    inverterQty: '',
    inverterHz:  row.inverter_hz ? String(row.inverter_hz) : '',
    pln:         row.listrik_status === 'pln' ? 'on' : 'off',
    genset:      row.listrik_status === 'genset' ? 'on' : 'off'
  };
}

function _ensureTodayLog(kandangId) {
  const today = new Date().toISOString().split('T')[0];
  const lastLog = DB.dailyLogs[DB.dailyLogs.length - 1];
  if (!lastLog || lastLog.date !== today) {
    const nextDay = lastLog ? lastLog.day + 1 : 1;
    DB.dailyLogs.push({
      _id:          null,
      _kandangId:   kandangId,
      day:          nextDay,
      date:         today,
      mortality:    null, culling: null,
      feed_code:    '', feed_am: null, feed_pm: null, feed: null,
      water:        null, weight: null,
      timbang_rows: [],
      checklist:    Object.assign({}, CL_DEFAULTS || {}),
      activities:   [],
      notes:        '',
      is_complete:  false
    });
  }
}

async function _loadInventory(sb) {
  const { data, error } = await sb
    .from('stock_pakan')
    .select('id, kandang_id, jumlah_kg, updated_at');

  if (error) { console.warn('[DB] loadInventory error:', error.message); return; }

  // Konversi stock_pakan ke format inventory yang dipakai UI
  DB.inventory = (data || []).map((row, i) => ({
    id:        row.id,
    name:      'Pakan Kandang ' + (i + 1),
    category:  'feed',
    qty:       Math.round(row.jumlah_kg || 0),
    unit:      'kg',
    status:    (row.jumlah_kg || 0) === 0 ? 'empty' : (row.jumlah_kg < 100 ? 'reorder' : 'ok'),
    icon:      'bakery_dining',
    iconColor: '#FBBF24',
    bgTint:    'rgba(251,191,36,.12)',
    _kandangId: row.kandang_id
  }));

  // Tambah item default jika kosong
  if (DB.inventory.length === 0) {
    DB.inventory = [
      { id:'inv-1', name:'Pakan Starter', category:'feed', qty:0, unit:'kg', status:'empty', icon:'bakery_dining', iconColor:'#FBBF24', bgTint:'rgba(251,191,36,.12)' },
      { id:'inv-2', name:'Pakan Finisher', category:'feed', qty:0, unit:'kg', status:'empty', icon:'grain', iconColor:'#3B82F6', bgTint:'rgba(59,130,246,.1)' },
      { id:'inv-3', name:'Vitamin', category:'medication', qty:0, unit:'Botol', status:'empty', icon:'vaccine', iconColor:'#EF4444', bgTint:'rgba(239,68,68,.1)' },
      { id:'inv-4', name:'Sekam', category:'supplies', qty:0, unit:'Karung', status:'empty', icon:'grass', iconColor:'#10B981', bgTint:'rgba(16,185,129,.1)' }
    ];
  }
}

async function _loadSettings() {
  // Settings disimpan di localStorage per user
  const cached = safeGetItem(_cacheKey('settings'), null);
  if (cached) Object.assign(DB.settings, cached);
}

// ============================================================
// CACHE — simpan/muat dari localStorage sebagai fallback offline
// ============================================================
function _saveToCache() {
  safeSaveItem(_cacheKey('flocks'),    DB.flocks);
  safeSaveItem(_cacheKey('logs'),      DB.dailyLogs);
  safeSaveItem(_cacheKey('inventory'), DB.inventory);
  safeSaveItem(_cacheKey('settings'),  DB.settings);
}

function _loadFromCache() {
  const f = safeGetItem(_cacheKey('flocks'),    null);
  const l = safeGetItem(_cacheKey('logs'),      null);
  const i = safeGetItem(_cacheKey('inventory'), null);
  const s = safeGetItem(_cacheKey('settings'),  null);
  if (f) DB.flocks    = f;
  if (l) DB.dailyLogs = l;
  if (i) DB.inventory = i;
  if (s) Object.assign(DB.settings, s);
}

// ============================================================
// SAVE — tulis ke Supabase + update cache
// ============================================================

// Simpan settings (hanya localStorage)
function saveSettings() {
  safeSaveItem(_cacheKey('settings'), DB.settings);
}

// Simpan log harian ke Supabase
async function saveLog(log) {
  const sb = _sb();
  if (!sb) { _saveToCache(); return { error: 'Offline' }; }

  const active = DB.flocks.find(f => f.active);
  if (!active) return { error: 'Tidak ada kandang aktif' };

  // ── Partial payload — hanya kirim field yang punya nilai ─────────────────
  // Ini mencegah overwrite data existing dengan null/0
  const payload = {
    kandang_id:  log._kandangId || active._dbId || active.id,
    hari:        log.day,
    tanggal:     log.date,
    input_oleh:  AUTH.userId || '',
    is_complete: log.is_complete || false
  };

  // Hanya tambahkan field jika ada nilainya
  if (log.mortality !== null && log.mortality !== undefined) payload.mati    = log.mortality;
  if (log.culling   !== null && log.culling   !== undefined) payload.culling = log.culling;
  if (log.feed_code)  payload.feed_code = log.feed_code;
  if (log.feed_am  !== null && log.feed_am  !== undefined)  payload.feed_am = log.feed_am;
  if (log.feed_pm  !== null && log.feed_pm  !== undefined)  payload.feed_pm = log.feed_pm;
  if (log.feed     !== null && log.feed     !== undefined)  payload.pakan_total = log.feed;
  if (log.weight   !== null && log.weight   !== undefined)  payload.berat_rata_rata = log.weight;
  if (log.timbang_rows?.length)  payload.timbang_rows = log.timbang_rows;
  if (log.checklist)             payload.checklist    = log.checklist;
  if (log.activities?.length)    payload.activities   = log.activities;
  if (log.notes?.trim())         payload.catatan      = log.notes;

  // Checklist ke kolom lama (kompatibilitas) — hanya jika ada nilai
  if (log.checklist) {
    const suhu = parseFloat(log.checklist.suhu);
    if (!isNaN(suhu) && suhu > 0) payload.suhu_pagi = suhu;
    if (log.checklist.kipasQty)   payload.blower_nyala    = parseInt(log.checklist.kipasQty) || 0;
    if (log.checklist.inverter)   payload.inverter_status = log.checklist.inverter;
    if (log.checklist.inverterHz) payload.inverter_hz     = parseFloat(log.checklist.inverterHz) || null;
    if (log.checklist.pln || log.checklist.genset)
      payload.listrik_status = log.checklist.genset === 'on' ? 'genset' : 'pln';
  }

  let result;
  if (log._id) {
    // Update existing by ID
    const { data, error } = await sb
      .from('data_harian')
      .update(payload)
      .eq('id', log._id)
      .select()
      .single();
    result = { data, error };
  } else {
    // Upsert — handle duplikat (kandang_id, hari, tanggal)
    const { data, error } = await sb
      .from('data_harian')
      .upsert(payload, { onConflict: 'kandang_id,hari,tanggal' })
      .select()
      .single();
    if (!error && data) log._id = data.id;
    result = { data, error };
  }

  if (result.error) {
    console.warn('[DB] saveLog error:', result.error.message);
    _saveToCache(); // fallback cache
    return { error: result.error.message };
  }

  _saveToCache();
  return { success: true };
}

// Simpan kandang baru ke Supabase
async function saveFlock(flock) {
  const sb = _sb();
  if (!sb) { _saveToCache(); return { error: 'Offline' }; }

  const payload = {
    id:        flock.id ? String(flock.id) : undefined,
    name:      flock.name,
    kapasitas: flock.qty,
    doc:       flock.qty,
    peternak:  flock.officer || '',
    officer:   flock.officer || '',
    usia:      0,
    status:    flock.active ? 'aktif' : 'panen',
    lat:       flock.lat || null,
    lng:       flock.lng || null
  };

  // Hapus id jika undefined agar Supabase generate sendiri
  if (!payload.id) delete payload.id;

  const { data, error } = await sb
    .from('kandangs')
    .insert(payload)
    .select()
    .single();

  if (error) {
    console.warn('[DB] saveFlock error:', error.message);
    _saveToCache();
    return { error: error.message };
  }

  // Update id di DB.flocks dengan id dari Supabase
  flock._dbId = data.id;
  flock.id    = data.id;
  _saveToCache();
  return { success: true, data };
}

// Update stok pakan di Supabase
async function saveStockPakan(kandangId, jumlahKg) {
  const sb = _sb();
  if (!sb) { _saveToCache(); return { error: 'Offline' }; }

  const { error } = await sb
    .from('stock_pakan')
    .upsert({ kandang_id: kandangId, jumlah_kg: jumlahKg, updated_at: new Date().toISOString() },
             { onConflict: 'kandang_id' });

  if (error) { console.warn('[DB] saveStockPakan error:', error.message); return { error: error.message }; }
  _saveToCache();
  return { success: true };
}

// saveDB — kompatibilitas: simpan settings + cache
function saveDB() {
  saveSettings();
  _saveToCache();
}

// updateDBKeys — kompatibilitas dengan app.js (tidak perlu lagi, tapi jangan hapus)
function updateDBKeys() {
  // Tidak ada operasi — data sekarang dari Supabase
  // Tetap ada untuk kompatibilitas kode lama di app.js
}

// ============================================================
// QUERY HELPERS — dipakai app.js
// ============================================================

function getCurrentDay() {
  return DB.dailyLogs.length > 0 ? DB.dailyLogs[DB.dailyLogs.length - 1].day : 1;
}

function getTodayLog() {
  return DB.dailyLogs[DB.dailyLogs.length - 1] || null;
}

function getActiveFlocks() {
  return DB.flocks.filter(f => f.active);
}

function getHistoryFlocks() {
  return DB.flocks.filter(f => !f.active);
}

function getInventoryByCategory(cat) {
  return DB.inventory.filter(i => i.category === cat);
}

function getCriticalCount() {
  return DB.inventory.filter(i => i.status === 'reorder' || i.status === 'empty').length;
}

function getFeedBagCount() {
  return DB.inventory.filter(i => i.category === 'feed').reduce((s, i) => s + i.qty, 0);
}

// ============================================================
// STANDAR BERAT & PAKAN — dari tabel Supabase (dengan fallback hardcode)
// ============================================================

// Cache targets setelah pertama kali dimuat
let _growthTargetsCache = null;
let _feedTargetsCache   = null;

async function loadTargets() {
  const sb = _sb();
  if (!sb) return;
  try {
    const [gt, ft] = await Promise.all([
      sb.from('growth_targets').select('breed, day_number, target_weight'),
      sb.from('feed_targets').select('breed, day_number, feed_per_thousand')
    ]);
    if (!gt.error && gt.data) {
      _growthTargetsCache = {};
      gt.data.forEach(r => {
        if (!_growthTargetsCache[r.breed]) _growthTargetsCache[r.breed] = {};
        _growthTargetsCache[r.breed][r.day_number] = r.target_weight;
      });
    }
    if (!ft.error && ft.data) {
      _feedTargetsCache = {};
      ft.data.forEach(r => {
        if (!_feedTargetsCache[r.breed]) _feedTargetsCache[r.breed] = {};
        _feedTargetsCache[r.breed][r.day_number] = parseFloat(r.feed_per_thousand);
      });
    }
  } catch (e) {
    console.warn('[DB] loadTargets error:', e.message);
  }
}

// Fallback hardcode jika Supabase belum dimuat
const GROWTH_TARGETS_FALLBACK = {
  'Cobb 500': { 1:42,2:57,3:76,4:100,5:129,6:162,7:200,8:243,9:291,10:344,11:401,12:463,13:529,14:598,15:671,16:747,17:826,18:907,19:990,20:1075,21:1162,22:1250,23:1340,24:1431,25:1523,26:1616,27:1709,28:1803,29:1897,30:1991,31:2084,32:2177,33:2268,34:2358,35:2446 },
  'Ross 308': { 1:40,2:54,3:72,4:95,5:123,6:156,7:194,8:237,9:285,10:338,11:395,12:456,13:521,14:589,15:660,16:734,17:810,18:888,19:968,20:1050,21:1133,22:1218,23:1304,24:1391,25:1479,26:1568,27:1657,28:1747,29:1837,30:1927,31:2016,32:2105,33:2193,34:2280,35:2365 }
};
const FEED_TARGETS_FALLBACK = {
  'Cobb 500': { 1:0.013,2:0.020,3:0.029,4:0.040,5:0.053,6:0.068,7:0.085,8:0.104,9:0.124,10:0.146,11:0.169,12:0.193,13:0.218,14:0.244,15:0.270,16:0.297,17:0.324,18:0.351,19:0.378,20:0.405,21:0.431,22:0.457,23:0.482,24:0.506,25:0.529,26:0.551,27:0.572,28:0.592,29:0.611,30:0.629,31:0.645,32:0.661,33:0.675,34:0.688,35:0.700 },
  'Ross 308': { 1:0.012,2:0.019,3:0.027,4:0.038,5:0.050,6:0.065,7:0.082,8:0.100,9:0.120,10:0.141,11:0.163,12:0.186,13:0.210,14:0.235,15:0.260,16:0.286,17:0.312,18:0.338,19:0.364,20:0.390,21:0.415,22:0.440,23:0.464,24:0.487,25:0.509,26:0.530,27:0.550,28:0.569,29:0.587,30:0.604,31:0.620,32:0.635,33:0.649,34:0.662,35:0.674 }
};

function getTargetWeight(day, breed) {
  breed = breed || 'Cobb 500';
  const table = (_growthTargetsCache && _growthTargetsCache[breed])
    || GROWTH_TARGETS_FALLBACK[breed]
    || GROWTH_TARGETS_FALLBACK['Cobb 500'];
  return table[day] || null;
}

function getTargetFeed(day, breed) {
  breed = breed || 'Cobb 500';
  const table = (_feedTargetsCache && _feedTargetsCache[breed])
    || FEED_TARGETS_FALLBACK[breed]
    || FEED_TARGETS_FALLBACK['Cobb 500'];
  const perThousand = table[day] || null;
  if (!perThousand) return null;
  const flock = DB.flocks.find(f => f.active);
  const qty   = flock ? (flock.current_qty || flock.qty || 1000) : 1000;
  return Math.round((perThousand * qty) * 10) / 10;
}

function getActiveBreed() {
  const active = DB.flocks.find(f => f.active);
  return active ? (active.breed || 'Cobb 500') : 'Cobb 500';
}
