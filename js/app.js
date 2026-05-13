// ===== APP.JS =====
let currentPage = 'dashboard';
let currentFlockTab = 'active';
let currentInvTab = 'feed';

// ---- HTTPS Enforcement ----
// Redirect ke HTTPS jika diakses via HTTP di production (bukan localhost)
(function enforceHTTPS() {
  if (
    location.protocol === 'http:' &&
    location.hostname !== 'localhost' &&
    location.hostname !== '127.0.0.1' &&
    !location.hostname.startsWith('192.168.')
  ) {
    location.replace('https://' + location.host + location.pathname + location.search);
  }
})();

// ---- INIT ----
window.addEventListener('load', async () => {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  }

  // Tampilkan splash segera
  applyTheme();

  // ---- AUTH GUARD — timeout 5 detik agar tidak hang selamanya ----
  const authTimeout = new Promise(resolve => setTimeout(() => resolve(false), 5000));
  const loggedIn = await Promise.race([AUTH.init(), authTimeout]);

  if (!loggedIn) {
    window.location.href = 'auth/login.html';
    return;
  }

  // ---- Tampilkan app segera, load data di background ----
  // Jangan tunggu data selesai — render dulu, data menyusul
  _hideSplash();

  // Load data di background (non-blocking)
  Promise.all([loadDB(), loadTargets(), loadFarmSettings()])
    .then(() => {
      // Refresh dashboard setelah data masuk
      if (currentPage === 'dashboard') renderDashboard();
    })
    .catch(e => console.warn('[APP] loadDB error:', e.message));
});

function _hideSplash() {
  applyTheme();
  const splash = document.getElementById('splash');
  const app    = document.getElementById('app');
  if (splash) {
    splash.style.transition = 'opacity 0.3s';
    splash.style.opacity = '0';
    setTimeout(() => {
      splash.classList.add('hidden');
      if (app) app.classList.remove('hidden');
      navigateTo('dashboard');
      applyRoleUI();
    }, 300);
  }
}

// ---- Update DB keys dengan prefix tenant ----
function updateDBKeys() {
  const tid = AUTH.tenantId;
  if (!tid) return;
  ['settings','flocks','logs','inventory'].forEach(key => {
    const prefixed = 'bt_' + tid + '_' + key;
    const old      = 'bt_' + key;
    const existing = localStorage.getItem(prefixed);
    const legacy   = localStorage.getItem(old);
    if (!existing && legacy) {
      localStorage.setItem(prefixed, legacy);
    }
  });
  // Patch DB object untuk pakai prefixed keys
  const tid2 = tid;
  const orig = saveDB;
  window.saveDB = function() {
    localStorage.setItem('bt_' + tid2 + '_settings',   JSON.stringify(DB.settings));
    localStorage.setItem('bt_' + tid2 + '_flocks',     JSON.stringify(DB.flocks));
    localStorage.setItem('bt_' + tid2 + '_logs',       JSON.stringify(DB.dailyLogs));
    localStorage.setItem('bt_' + tid2 + '_inventory',  JSON.stringify(DB.inventory));
  };
  // Reload DB dari prefixed keys
  // Reload DB dari prefixed keys (pakai safeGetItem agar tidak crash jika corrupt)
  const s = safeGetItem('bt_' + tid2 + '_settings',  null);
  const f = safeGetItem('bt_' + tid2 + '_flocks',    null);
  const l = safeGetItem('bt_' + tid2 + '_logs',      null);
  const i = safeGetItem('bt_' + tid2 + '_inventory', null);
  if (s) Object.assign(DB.settings, s);
  if (f) DB.flocks    = f;
  if (l) DB.dailyLogs = l;
  if (i) DB.inventory = i;
}

// ---- Terapkan UI berdasarkan role ----
function applyRoleUI() {
  const role = AUTH.role;

  // ── 1. Tampilkan nama & role user di header ──────────────────────────────
  const orgEl = document.querySelector('.header-text .body-small');
  if (orgEl) {
    const roleLabel = { owner:'Pemilik', manager:'Manajer', ts:'Technical Service',
                        staff:'Staff Kantor', operator:'Operator', viewer:'Viewer' };
    orgEl.textContent = AUTH.userName + '  •  ' + (roleLabel[role] || role);
  }

  // ── 2. Nav items — tampilkan hanya yang relevan per role ─────────────────
  const navRules = {
    'nav-targets':  AUTH.can('target.view')    && !['staff','operator','viewer'].includes(role),
    'nav-health':   AUTH.can('health.view')    && role !== 'staff',
    'nav-delivery': AUTH.can('delivery.view'),
    'nav-cost':     AUTH.can('cost.view'),
    'nav-visits':   (AUTH.can('visit.view') || AUTH.can('visit.create')) && role !== 'staff',
    'nav-panen':    AUTH.can('panen.view')
  };
  Object.entries(navRules).forEach(([id, show]) => {
    const el = document.getElementById(id);
    if (el) el.style.display = show ? '' : 'none';
  });

  // Nav items tanpa id — sembunyikan per role
  const navPageRules = {
    'flock':   ['owner','manager'],           // hanya owner/manager bisa kelola kandang
    'growth':  ['owner','manager','ts'],      // grafik untuk owner/manager/ts
    'inventory': ['owner','manager','staff','operator'] // semua kecuali viewer
  };
  document.querySelectorAll('.nav-item[data-page]').forEach(el => {
    const page = el.getAttribute('data-page');
    if (navPageRules[page]) {
      el.style.display = navPageRules[page].includes(role) ? '' : 'none';
    }
  });

  // ── 3. Tombol aksi — sembunyikan jika tidak punya permission ─────────────
  if (!AUTH.can('kandang.create')) {
    document.querySelectorAll('[onclick*="showAddFlockModal"]').forEach(el => el.style.display = 'none');
  }
  if (!AUTH.can('settings.edit')) {
    document.querySelectorAll('.settings-row[onclick]').forEach(el => el.style.pointerEvents = 'none');
    const teamSection = document.getElementById('section-team');
    if (teamSection) teamSection.style.display = AUTH.can('member.invite') ? '' : 'none';
  }
  if (!AUTH.can('log.create') && !['operator','owner','manager','staff'].includes(AUTH.role)) {
    document.querySelectorAll('[onclick*="completeDay"],[onclick*="saveProgress"]')
      .forEach(el => el.style.display = 'none');
  }

  // ── 4. Sembunyikan cost/harga untuk TS, Operator, Viewer ─────────────────
  if (!AUTH.can('cost.view')) {
    document.querySelectorAll('.cost-only, .price-only, [data-cost]')
      .forEach(el => el.style.display = 'none');
  }

  // ── 5. Tambahkan badge role di avatar header ──────────────────────────────
  const avatarEl = document.getElementById('header-avatar-icon');
  if (avatarEl) {
    const roleIcons = { owner:'star', manager:'manage_accounts', ts:'biotech',
                        staff:'badge', operator:'agriculture', viewer:'visibility' };
    avatarEl.textContent = roleIcons[role] || 'person';
  }

  // ── 6. Tambahkan tombol logout di settings ────────────────────────────────
  _ensureLogoutButton();

  // ── 7. Dashboard widgets berdasarkan role ─────────────────────────────────
  _applyDashboardWidgets();
}

// Pastikan tombol logout ada di halaman settings
function _ensureLogoutButton() {
  if (document.getElementById('btn-logout-main')) return;
  const settingsBody = document.querySelector('.settings-body');
  if (!settingsBody) return;

  const logoutSection = document.createElement('div');
  logoutSection.className = 'settings-section';
  logoutSection.innerHTML = `
    <div class="settings-section-title">Akun</div>
    <div class="settings-row" style="cursor:pointer" onclick="doLogout()">
      <div class="settings-row-icon" style="background:rgba(239,68,68,.12)">
        <span class="material-icons-round" style="color:#EF4444">logout</span>
      </div>
      <div class="settings-row-text">
        <div class="title-small bold" style="color:#EF4444">Keluar</div>
        <div class="body-small secondary-text">${AUTH.userEmail || ''}</div>
      </div>
    </div>
    <div id="btn-logout-main"></div>`;
  settingsBody.appendChild(logoutSection);
  _ensureVersionInfo(settingsBody);
}

// Versi aplikasi — dipanggil terpisah agar tidak terblokir guard btn-logout-main
function _ensureVersionInfo(settingsBody) {
  if (document.getElementById('app-version-info')) return;
  const el = settingsBody || document.querySelector('.settings-body');
  if (!el) return;
  const versionEl = document.createElement('div');
  versionEl.id = 'app-version-info';
  versionEl.style.cssText = 'text-align:center;padding:12px 0 24px;font-size:11px;color:var(--hint);letter-spacing:0.3px;user-select:none';
  versionEl.innerHTML =
    '<span class="material-icons-round" style="font-size:11px;vertical-align:middle;margin-right:3px;opacity:.6">verified</span>' +
    'BroilerPro v' + (window.UpdateManager?.currentVersion || '2.1');
  el.appendChild(versionEl);
}

async function doLogout() {
  if (!confirm('Yakin ingin keluar?')) return;
  await AuthService.logout();
  window.location.href = 'auth/login.html';
}

// Tambahkan widget dashboard sesuai role
function _applyDashboardWidgets() {
  const role = AUTH.role;
  const dashBody = document.querySelector('#page-dashboard .page-body');
  if (!dashBody || document.getElementById('role-widgets')) return;

  const widgetWrap = document.createElement('div');
  widgetWrap.id = 'role-widgets';

  if (role === 'ts' || role === 'owner' || role === 'manager') {
    widgetWrap.innerHTML = `
      <div class="section-header" style="margin-top:16px">
        <span class="title-medium bold">Jadwal Hari Ini</span>
        <button class="link-btn" onclick="navigateTo('visits')">Lihat Semua</button>
      </div>
      <div id="widget-visits-today" class="widget-today-list">
        <div style="color:var(--hint);font-size:13px;padding:8px 0">Memuat...</div>
      </div>
      <div class="section-header" style="margin-top:12px">
        <span class="title-medium bold">Jadwal Obat/Vaksin</span>
        <button class="link-btn" onclick="navigateTo('health')">Lihat Semua</button>
      </div>
      <div id="widget-health-today" class="widget-today-list">
        <div style="color:var(--hint);font-size:13px;padding:8px 0">Memuat...</div>
      </div>
      <div class="section-header" style="margin-top:12px">
        <span class="title-medium bold">Pengiriman Pending</span>
        <button class="link-btn" onclick="navigateTo('delivery')">Lihat Semua</button>
      </div>
      <div id="widget-delivery-pending" class="widget-today-list">
        <div style="color:var(--hint);font-size:13px;padding:8px 0">Memuat...</div>
      </div>`;
  } else if (role === 'staff') {
    widgetWrap.innerHTML = `
      <div class="section-header" style="margin-top:16px">
        <span class="title-medium bold">Pengiriman Pending</span>
        <button class="link-btn" onclick="navigateTo('delivery')">Lihat Semua</button>
      </div>
      <div id="widget-delivery-pending" class="widget-today-list">
        <div style="color:var(--hint);font-size:13px;padding:8px 0">Memuat...</div>
      </div>
      <div class="section-header" style="margin-top:12px">
        <span class="title-medium bold">Stok Kritis</span>
        <button class="link-btn" onclick="navigateTo('inventory')">Lihat Semua</button>
      </div>
      <div id="widget-stock-critical" class="widget-today-list">
        <div style="color:var(--hint);font-size:13px;padding:8px 0">Memuat...</div>
      </div>`;
  } else if (role === 'operator') {
    widgetWrap.innerHTML = `
      <div class="section-header" style="margin-top:16px">
        <span class="title-medium bold">Jadwal Obat Hari Ini</span>
        <button class="link-btn" onclick="navigateTo('health')">Lihat Semua</button>
      </div>
      <div id="widget-health-today" class="widget-today-list">
        <div style="color:var(--hint);font-size:13px;padding:8px 0">Memuat...</div>
      </div>`;
  }

  // Insert sebelum spacer
  const spacer = dashBody.querySelector('.spacer-xxl') || dashBody.lastElementChild;
  dashBody.insertBefore(widgetWrap, spacer);

  // Load widget data
  setTimeout(_loadDashboardWidgets, 500);
}

async function _loadDashboardWidgets() {
  const role = AUTH.role;

  // Widget kunjungan hari ini (TS/Owner/Manager)
  const visitsEl = document.getElementById('widget-visits-today');
  if (visitsEl) {
    try {
      const today = new Date().toISOString().split('T')[0];
      const visits = await TSVisits.getAll({ start_date: today, end_date: today });
      if (!visits.length) {
        visitsEl.innerHTML = '<div style="color:var(--hint);font-size:13px;padding:4px 0">Tidak ada kunjungan hari ini</div>';
      } else {
        visitsEl.innerHTML = visits.slice(0, 3).map(v => `
          <div class="widget-item" onclick="navigateTo('visits')">
            <span class="material-icons-round" style="color:#3B82F6;font-size:18px">event_available</span>
            <div style="flex:1;min-width:0">
              <div style="font-size:13px;font-weight:600">${v.kandang?.name || v.kandang_id}</div>
              <div style="font-size:11px;color:var(--secondary-text)">${v.waktu_mulai || ''} &bull; ${TSVisits.formatTujuan(v.tujuan)}</div>
            </div>
            <span style="font-size:11px;padding:2px 8px;border-radius:10px;background:${TSVisits.getStatusColor(v.status)}20;color:${TSVisits.getStatusColor(v.status)}">${TSVisits.formatStatus(v.status)}</span>
          </div>`).join('');
      }
    } catch (e) { visitsEl.innerHTML = ''; }
  }

  // Widget obat hari ini
  const healthEl = document.getElementById('widget-health-today');
  if (healthEl) {
    try {
      const activeFlock = DB.flocks.find(f => f.active);
      if (!activeFlock) {
        healthEl.innerHTML = '<div style="color:var(--hint);font-size:13px;padding:4px 0">Tidak ada kandang aktif</div>';
      } else {
        const schedule = await Medication.getTodaySchedule(activeFlock._dbId || activeFlock.id);
        if (!schedule.length) {
          healthEl.innerHTML = '<div style="color:var(--hint);font-size:13px;padding:4px 0">Tidak ada jadwal obat hari ini</div>';
        } else {
          healthEl.innerHTML = schedule.slice(0, 3).map(s => {
            const info = Medication.getTypeInfo(s.medication_type);
            const statusInfo = Medication.getStatusInfo(s.log_status || 'scheduled');
            return `
              <div class="widget-item" onclick="navigateTo('health')">
                <span class="material-icons-round" style="color:${info.color};font-size:18px">${info.icon}</span>
                <div style="flex:1;min-width:0">
                  <div style="font-size:13px;font-weight:600">${s.nama_produk}</div>
                  <div style="font-size:11px;color:var(--secondary-text)">${info.label} &bull; H-${s.hari_ke}</div>
                </div>
                <span style="font-size:11px;padding:2px 8px;border-radius:10px;background:${statusInfo.color}20;color:${statusInfo.color}">${statusInfo.label}</span>
              </div>`;
          }).join('');
        }
      }
    } catch (e) { healthEl.innerHTML = ''; }
  }

  // Widget pengiriman pending (Staff/Owner/Manager)
  const deliveryEl = document.getElementById('widget-delivery-pending');
  if (deliveryEl) {
    try {
      const pending = await Deliveries.getAll({ status: 'pending' });
      if (!pending.length) {
        deliveryEl.innerHTML = '<div style="color:var(--hint);font-size:13px;padding:4px 0">Tidak ada pengiriman pending</div>';
      } else {
        deliveryEl.innerHTML = pending.slice(0, 3).map(d => {
          const info = Deliveries.getTypeInfo(d.delivery_type);
          return `
            <div class="widget-item" onclick="navigateTo('delivery')">
              <span class="material-icons-round" style="color:${info.color};font-size:18px">${info.icon}</span>
              <div style="flex:1;min-width:0">
                <div style="font-size:13px;font-weight:600">${d.item_name}</div>
                <div style="font-size:11px;color:var(--secondary-text)">${d.kandang?.name || d.kandang_id} &bull; ${Deliveries.formatDate(d.tanggal_kirim)}</div>
              </div>
              <span style="font-size:11px;padding:2px 8px;border-radius:10px;background:rgba(245,158,11,.15);color:#D97706">Pending</span>
            </div>`;
        }).join('');
      }
    } catch (e) { deliveryEl.innerHTML = ''; }
  }

  // Widget stok kritis (Staff)
  const stockEl = document.getElementById('widget-stock-critical');
  if (stockEl) {
    const critical = DB.inventory.filter(i => i.status === 'reorder' || i.status === 'empty');
    if (!critical.length) {
      stockEl.innerHTML = '<div style="color:var(--hint);font-size:13px;padding:4px 0">Semua stok aman ✓</div>';
    } else {
      stockEl.innerHTML = critical.slice(0, 3).map(item => `
        <div class="widget-item" onclick="navigateTo('inventory')">
          <span class="material-icons-round" style="color:${item.iconColor};font-size:18px">${item.icon}</span>
          <div style="flex:1;min-width:0">
            <div style="font-size:13px;font-weight:600">${item.name}</div>
            <div style="font-size:11px;color:var(--secondary-text)">${item.qty} ${item.unit} tersisa</div>
          </div>
          <span style="font-size:11px;padding:2px 8px;border-radius:10px;background:rgba(239,68,68,.12);color:#DC2626">
            ${item.status === 'empty' ? 'Habis' : 'Kritis'}
          </span>
        </div>`).join('');
    }
  }

  // Alert mortalitas tinggi
  _checkMortalityAlert();
}

// Alert jika mortalitas hari ini > 2%
function _checkMortalityAlert() {
  const log = getTodayLog();
  if (!log || log.mortality === null) return;

  const activeFlock = DB.flocks.find(f => f.active);
  if (!activeFlock) return;

  const totalPop = activeFlock.qty || 1000;
  const mortalityPct = (log.mortality / totalPop) * 100;

  if (mortalityPct >= 2) {
    _showAlert('mortality', `⚠️ Mortalitas Tinggi: ${log.mortality} ekor (${mortalityPct.toFixed(1)}%) hari ini`, 'error');
  }

  // Alert berat jauh dari target
  if (log.weight) {
    const day    = log.day || getCurrentDay();
    const breed  = getActiveBreed();
    const target = getTargetWeight(day, breed);
    if (target) {
      const deviasi = Math.abs(log.weight - target) / target * 100;
      if (deviasi > 10) {
        const arah = log.weight < target ? 'di bawah' : 'di atas';
        _showAlert('weight', `⚠️ Berat ${arah} target: ${log.weight}g vs target ${target}g (${deviasi.toFixed(1)}% deviasi)`, 'warning');
      }
    }
  }
}

// Tampilkan alert banner di dashboard
function _showAlert(id, message, type) {
  const dashBody = document.querySelector('#page-dashboard .page-body');
  if (!dashBody || document.getElementById('alert-' + id)) return;

  const colors = { error: '#EF4444', warning: '#F59E0B', info: '#3B82F6' };
  const bgs    = { error: 'rgba(239,68,68,.08)', warning: 'rgba(245,158,11,.08)', info: 'rgba(59,130,246,.08)' };
  const color  = colors[type] || colors.info;
  const bg     = bgs[type]    || bgs.info;

  const alert = document.createElement('div');
  alert.id = 'alert-' + id;
  alert.style.cssText = `background:${bg};border:1px solid ${color}40;border-radius:10px;padding:10px 14px;margin-bottom:10px;font-size:13px;color:${color};display:flex;align-items:center;gap:8px;cursor:pointer`;
  alert.innerHTML = `<span class="material-icons-round" style="font-size:18px;flex-shrink:0">${type === 'error' ? 'warning' : 'info'}</span><span style="flex:1">${message}</span><span class="material-icons-round" style="font-size:16px;opacity:.6" onclick="this.parentElement.remove()">close</span>`;

  const firstChild = dashBody.firstElementChild;
  dashBody.insertBefore(alert, firstChild);
}

// ---- checkPerm helper — dipakai di onclick HTML ----
function checkPerm(permission, actionLabel) {
  if (AUTH.can(permission)) return true;
  showToast('⚠️ Tidak punya izin: ' + actionLabel);
  return false;
}

// ---- NAVIGATION ----
function navigateTo(page) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  const target = document.getElementById('page-' + page);
  if (target) target.classList.add('active');
  const navBtn = document.querySelector('[data-page="' + page + '"]');
  if (navBtn) navBtn.classList.add('active');
  currentPage = page;
  if (page === 'dashboard') renderDashboard();
  if (page === 'daily') renderDaily();
  if (page === 'flock') renderFlock();
  if (page === 'growth') { setTimeout(initGrowthCharts, 100); }
  if (page === 'inventory') renderInventory();
  if (page === 'panen') { loadPanen().then(() => renderPanen()); }
  if (page === 'settings') renderSettings();
  document.getElementById('main-content').scrollTop = 0;
}

// ---- DASHBOARD ----
function renderDashboard() {
  const day = getCurrentDay();
  document.getElementById('dash-day').textContent = 'Hari ' + day;
  const lastLog = DB.dailyLogs.filter(l => l.weight).pop();
  if (lastLog) document.getElementById('dash-avg-weight').textContent = lastLog.weight + 'g';
  renderRecentActivity();
  setTimeout(initDashboardChart, 100);
}

function renderRecentActivity() {
  const el = document.getElementById('recent-activity');
  if (!el) return;
  const logs = [...DB.dailyLogs].reverse().slice(0, 5);
  el.innerHTML = logs.map(l => {
    const done = l.mortality !== null;
    return '<div class="activity-item">' +
      '<div class="activity-icon" style="background:' + (done ? 'rgba(16,185,129,.15)' : 'rgba(59,130,246,.12)') + '">' +
      '<span class="material-icons-round" style="color:' + (done ? '#10B981' : '#3B82F6') + '">' + (done ? 'check_circle' : 'pending') + '</span></div>' +
      '<div class="activity-text"><div class="activity-title">Laporan Hari ' + l.day + '</div>' +
      '<div class="activity-sub">' + (done ? 'Mortalitas: ' + l.mortality + ' ekor | Pakan: ' + l.feed + ' karung' : 'Belum diisi') + '</div></div>' +
      '<div class="activity-time">' + (l.date || '') + '</div></div>';
  }).join('');
}

// ---- DAILY ----
function renderDaily() {
  const role = AUTH.role;

  // ── TS: tampilkan histori laporan semua kandang ───────────────────────────
  if (role === 'ts' || role === 'staff') {
    document.getElementById('daily-ts-view').classList.remove('hidden');
    document.getElementById('daily-input-view').classList.add('hidden');

    if (role === 'ts') {
      document.getElementById('daily-day-title').textContent = 'Histori Laporan';
      document.getElementById('daily-page-subtitle').textContent = '1 Minggu Terakhir';
    } else {
      // Staff: verifikasi input harian
      document.getElementById('daily-day-title').textContent = 'Verifikasi Laporan';
      document.getElementById('daily-page-subtitle').textContent = 'Input harian semua kandang';
    }
    _populateTSKandangFilter();
    renderTSReportHistory();
    return;
  }

  // ── Operator/Owner/Manager: form input harian ─────────────────────────────
  document.getElementById('daily-ts-view').classList.add('hidden');
  document.getElementById('daily-input-view').classList.remove('hidden');

  const day = getCurrentDay();
  const el = document.getElementById('daily-day-title');
  const subtitleEl = document.getElementById('daily-page-subtitle');
  const lbl = document.getElementById('btn-complete-label');

  if (role === 'operator') {
    // Header: nama kandang + umur
    const kandangId = AUTH.kandangId;
    const flock = DB.flocks.find(f => (f._dbId || f.id) === kandangId) || DB.flocks.find(f => f.active);
    const kandangName = flock ? (flock.name || flock.nama || 'Kandang') : 'Kandang';
    const umur = flock ? (flock.age || day) : day;

    if (el)        el.textContent        = kandangName;
    if (subtitleEl) subtitleEl.textContent = 'Umur ' + umur + ' hari · Hari ke-' + day;
    if (lbl)       lbl.textContent       = 'Hari ' + day;
  } else {
    if (el)        el.textContent        = 'Hari ' + day;
    if (subtitleEl) subtitleEl.textContent = 'BroilerTrack Laporan Harian';
    if (lbl)       lbl.textContent       = 'Hari ' + day;
  }
  renderDayProgressNodes();

  // Operator: tampilkan target banner + jadwal obat
  if (role === 'operator') {
    _loadOperatorTargetBanner();
    _loadOperatorMedBanner();
  } else {
    // Sembunyikan banner untuk non-operator
    const banner = document.getElementById('operator-target-banner');
    if (banner) banner.classList.add('hidden');
  }

  // Load feed codes dari pengiriman pakan
  _loadFeedCodes();

  const log = getTodayLog();
  if (log) {
    if (log.mortality !== null) document.getElementById('input-mortality').value = log.mortality;
    if (log.culling  !== null) document.getElementById('input-culling').value  = log.culling;
    if (log.feed_code) document.getElementById('input-feed-code').value = log.feed_code;
    if (log.feed_am !== null && log.feed_am !== undefined) document.getElementById('input-feed-am').value = log.feed_am;
    if (log.feed_pm !== null && log.feed_pm !== undefined) document.getElementById('input-feed-pm').value = log.feed_pm;
    calcFeedTotal();
    if (log.water !== null) document.getElementById('input-water').value = log.water;
    updateTimbangCard();
    renderChecklist();
    renderActivityLog();
    if (log.notes) document.getElementById('input-notes').value = log.notes;
  }
}

function renderDayProgressNodes() {
  const el = document.getElementById('day-progress-nodes');
  if (!el) return;
  const logs = DB.dailyLogs.slice(-5);
  el.innerHTML = logs.map((l, i) => {
    const isLast = i === logs.length - 1;
    const isDone = l.mortality !== null && !isLast;
    const cls = isLast ? 'active' : (isDone ? 'done' : '');
    return '<div class="progress-node ' + cls + '">' +
      '<div class="progress-dot">' + (isDone ? '<span class="material-icons-round" style="font-size:16px">check</span>' : l.day) + '</div>' +
      '<div class="progress-label">H' + l.day + '</div></div>';
  }).join('');
}

async function completeDay() {
  // ---- Validasi input sebelum selesaikan ----
  const mortalityRaw = document.getElementById('input-mortality').value;
  const cullingRaw   = document.getElementById('input-culling').value;
  const mortality    = parseInt(mortalityRaw) || 0;
  const culling      = parseInt(cullingRaw)   || 0;

  // Ambil populasi aktif untuk batas maksimum mortalitas
  const activeFlock  = DB.flocks.find(f => f.active);
  const maxPopulation = activeFlock ? (activeFlock.current_qty || activeFlock.qty || 99999) : 99999;

  // Hitung total deplesi yang sudah terjadi sebelumnya
  const prevDeplesi = DB.dailyLogs.slice(0, -1).reduce((sum, l) => {
    return sum + (l.mortality || 0) + (l.culling || 0);
  }, 0);
  const sisaPopulasi = maxPopulation - prevDeplesi;

  const errors = [];
  if (mortality < 0) errors.push('Jumlah mati tidak boleh negatif');
  if (culling < 0)   errors.push('Jumlah afkir tidak boleh negatif');
  if ((mortality + culling) > sisaPopulasi) {
    errors.push('Total deplesi (' + (mortality + culling) + ' ekor) melebihi sisa populasi (' + sisaPopulasi + ' ekor)');
  }

  const feedAm = parseFloat(document.getElementById('input-feed-am').value) || 0;
  const feedPm = parseFloat(document.getElementById('input-feed-pm').value) || 0;
  if (feedAm < 0) errors.push('Pakan pagi tidak boleh negatif');
  if (feedPm < 0) errors.push('Pakan sore tidak boleh negatif');

  const water = parseInt(document.getElementById('input-water').value) || 0;
  if (water < 0) errors.push('Konsumsi air tidak boleh negatif');

  if (errors.length > 0) {
    showToast('⚠️ ' + errors[0]);
    return;
  }

  // ---- Konfirmasi sebelum menutup hari ----
  const day = getCurrentDay();
  const confirmed = confirm(
    'Selesaikan Hari ' + day + '?\n\n' +
    'Ringkasan:\n' +
    '• Mati: ' + mortality + ' ekor | Afkir: ' + culling + ' ekor\n' +
    '• Pakan: ' + (feedAm + feedPm).toFixed(1) + ' kg\n' +
    '• Air: ' + water + ' liter\n\n' +
    'Setelah diselesaikan, data hari ini tidak bisa diedit lagi.'
  );
  if (!confirmed) return;

  // ---- Simpan data hari ini ----
  const feed_code = document.getElementById('input-feed-code').value;
  const feed      = feedAm + feedPm;
  const weight    = (getTodayLog() && getTodayLog().weight) ? getTodayLog().weight : 0;
  const notes     = document.getElementById('input-notes').value;
  const log       = getTodayLog();
  if (log) {
    log.mortality = mortality;
    log.culling   = culling;
    log.feed_code = feed_code;
    log.feed_am   = feedAm;
    log.feed_pm   = feedPm;
    log.feed      = feed;
    log.water     = water;
    log.weight    = weight;
    log.notes     = notes;
    log.checklist = Object.assign({}, readChecklist());
  }

  // Update sisa populasi di flock aktif
  if (activeFlock) {
    activeFlock.current_qty = sisaPopulasi - mortality - culling;
  }

  const nextDay = day + 1;
  const today   = new Date();
  DB.dailyLogs.push({
    _id:          null,
    _kandangId:   activeFlock ? (activeFlock._dbId || activeFlock.id) : null,
    day:          nextDay,
    mortality:    null, culling: null,
    feed_code:    '', feed_am: null, feed_pm: null, feed: null,
    water:        null, weight: null,
    timbang_rows: [],
    checklist:    Object.assign({}, CL_DEFAULTS),
    activities:   [],
    notes:        '',
    date:         today.toISOString().split('T')[0],
    is_complete:  false
  });

  // Tandai log selesai lalu simpan ke Supabase
  const completedLog = DB.dailyLogs[DB.dailyLogs.length - 2];
  if (completedLog) completedLog.is_complete = true;
  logActivity('selesai', 'Laporan Hari ' + (nextDay - 1) + ' ditandai selesai');

  const result = await saveLog(completedLog || getTodayLog());
  if (result.error && result.error !== 'Offline') {
    showToast('⚠️ Gagal menyimpan: ' + result.error);
  } else {
    showToast('Hari ' + (nextDay - 1) + ' berhasil diselesaikan!');
  }
  renderDaily();
}

async function saveProgress() {
  // ---- Validasi input ----
  const mortalityVal = document.getElementById('input-mortality').value;
  const cullingVal   = document.getElementById('input-culling').value;
  const feedAmVal    = document.getElementById('input-feed-am').value;
  const feedPmVal    = document.getElementById('input-feed-pm').value;
  const waterVal     = document.getElementById('input-water').value;
  const notesVal     = document.getElementById('input-notes').value;
  const feedCodeVal  = document.getElementById('input-feed-code').value;

  // Konversi — null jika kosong (tidak overwrite data existing)
  const mortality = mortalityVal !== '' ? parseInt(mortalityVal)   : undefined;
  const culling   = cullingVal   !== '' ? parseInt(cullingVal)     : undefined;
  const feedAm    = feedAmVal    !== '' ? parseFloat(feedAmVal)    : undefined;
  const feedPm    = feedPmVal    !== '' ? parseFloat(feedPmVal)    : undefined;
  const water     = waterVal     !== '' ? parseInt(waterVal)       : undefined;

  // Validasi nilai negatif
  if ((mortality !== undefined && mortality < 0) ||
      (culling   !== undefined && culling   < 0) ||
      (feedAm    !== undefined && feedAm    < 0) ||
      (feedPm    !== undefined && feedPm    < 0) ||
      (water     !== undefined && water     < 0)) {
    showToast('⚠️ Nilai tidak boleh negatif');
    return;
  }

  // Validasi deplesi
  if (mortality !== undefined || culling !== undefined) {
    const activeFlock  = DB.flocks.find(f => f.active);
    const maxPop       = activeFlock ? (activeFlock.current_qty || activeFlock.qty || 99999) : 99999;
    const prevDeplesi  = DB.dailyLogs.slice(0, -1).reduce((s, l) => s + (l.mortality||0) + (l.culling||0), 0);
    const sisaPop      = maxPop - prevDeplesi;
    const totalDeplesi = (mortality || 0) + (culling || 0);
    if (totalDeplesi > sisaPop) {
      showToast('⚠️ Total deplesi melebihi sisa populasi (' + sisaPop + ' ekor)');
      return;
    }
  }

  const log = getTodayLog();
  if (log) {
    // ── Partial merge: hanya update field yang diisi ──────────────────────
    if (mortality !== undefined) log.mortality = mortality;
    if (culling   !== undefined) log.culling   = culling;
    if (feedAm    !== undefined) log.feed_am   = feedAm;
    if (feedPm    !== undefined) log.feed_pm   = feedPm;
    if (water     !== undefined) log.water     = water;
    if (feedCodeVal)             log.feed_code = feedCodeVal;
    if (notesVal.trim())         log.notes     = notesVal;

    // Hitung total pakan dari nilai yang ada (existing + baru)
    const am = log.feed_am || 0;
    const pm = log.feed_pm || 0;
    log.feed = am + pm;

    // Checklist — merge dengan existing
    const cl = readChecklist();
    log.checklist = Object.assign({}, log.checklist || {}, cl);
  }

  // Log aktivitas
  const _log = getTodayLog();
  if (_log) {
    if (mortality !== undefined || culling !== undefined)
      logActivity('deplesi', 'Mati: ' + (_log.mortality||0) + ' | Afkir: ' + (_log.culling||0) + ' ekor');
    if (feedAm !== undefined || feedPm !== undefined)
      logActivity('pakan', (_log.feed_code||'') + ' Pagi: ' + (_log.feed_am||0) + ' Sore: ' + (_log.feed_pm||0) + ' kg');
    if (water !== undefined)
      logActivity('air', _log.water + ' liter');
    if (notesVal.trim())
      logActivity('catatan', notesVal.substring(0, 40));
    if (_log.checklist?.suhu)
      logActivity('checklist', 'Suhu: ' + _log.checklist.suhu + '°C');
  }

  // Simpan ke Supabase
  const result = await saveLog(getTodayLog());
  if (result.error && result.error !== 'Offline') {
    showToast('⚠️ Gagal menyimpan: ' + result.error);
    return;
  }
  showToast(result.error === 'Offline' ? 'Tersimpan offline' : 'Progress tersimpan');
}

// ---- FEED TOTAL ----
function calcFeedTotal() {
  const am  = parseFloat(document.getElementById('input-feed-am').value) || 0;
  const pm  = parseFloat(document.getElementById('input-feed-pm').value) || 0;
  const tot = am + pm;

  // Total
  const totalEl = document.getElementById('feed-total-display');
  if (totalEl) totalEl.textContent = tot % 1 === 0 ? tot : tot.toFixed(1);

  // Std target pakan hari ini
  const stdEl = document.getElementById('feed-std-display');
  if (stdEl) {
    const day    = getCurrentDay();
    const breed  = getActiveBreed();
    const target = getTargetFeed(day, breed);
    if (target !== null) {
      stdEl.textContent = target % 1 === 0 ? target : target.toFixed(1);
      // Warna: hijau jika aktual >= std, merah jika kurang (hanya jika sudah ada input)
      if (tot > 0) {
        stdEl.style.color = tot >= target ? 'var(--success)' : 'var(--error)';
      } else {
        stdEl.style.color = 'var(--info)';
      }
    } else {
      stdEl.textContent = '-';
      stdEl.style.color = 'var(--secondary-text)';
    }
  }
}

// ---- FLOCK ----
function renderFlock() {
  const list = document.getElementById('flock-list');
  if (!list) return;
  const flocks = currentFlockTab === 'active' ? getActiveFlocks() : getHistoryFlocks();
  const isOwner = AUTH.role === 'owner';
  
  list.innerHTML = flocks.map(f => {
    const startDate = new Date(f.startDate);
    const fmt = startDate.toLocaleDateString('id-ID', { day:'numeric', month:'short', year:'numeric' });

    // Baris lokasi (jika ada koordinat)
    let locationRow = '';
    if (f.lat !== null && f.lat !== undefined && f.lng !== null && f.lng !== undefined) {
      const latFmt = parseFloat(f.lat).toFixed(5);
      const lngFmt = parseFloat(f.lng).toFixed(5);
      locationRow = '<div class="flock-location-row">' +
        '<span class="material-icons-round" style="font-size:14px;color:var(--primary)">location_on</span>' +
        '<span class="flock-location-coords">' + latFmt + ', ' + lngFmt + '</span>' +
        '<button class="flock-location-btn" onclick="openFlockInMaps(' + f.lat + ',' + f.lng + ',\'' + f.name + '\')">' +
        '<span class="material-icons-round">map</span>Buka Maps</button>' +
        '</div>';
    }

    // Tombol aksi (Edit & Hapus - hanya Owner yang bisa hapus)
    const flockId = f._dbId || f.id || '';
    let actionButtons = '';
    if (AUTH.can('kandang.edit')) {
      actionButtons += '<button class="flock-action-btn flock-action-btn--edit" onclick="editFlock(\'' + flockId + '\')" title="Edit Kandang">' +
        '<span class="material-icons-round">edit</span></button>';
    }
    if (isOwner) {
      actionButtons += '<button class="flock-action-btn flock-action-btn--delete" onclick="deleteFlock(\'' + flockId + '\', \'' + f.name + '\')" title="Hapus Kandang">' +
        '<span class="material-icons-round">delete</span></button>';
    }

    return '<div class="flock-card">' +
      '<div class="flock-card-header">' +
      '<div><div class="flock-name">' + f.name + '</div>' +
      '<div class="flock-breed">' + f.breed + (f.officer ? ' &bull; ' + f.officer : '') + '</div></div>' +
      '<div style="display:flex;align-items:center;gap:8px">' +
      '<span class="flock-badge ' + (f.active ? 'active' : 'inactive') + '">' + (f.active ? 'Aktif' : 'Selesai') + '</span>' +
      (actionButtons ? '<div class="flock-actions">' + actionButtons + '</div>' : '') +
      '</div></div>' +
      '<div class="flock-stats">' +
      '<div class="flock-stat"><div class="flock-stat-val">' + f.qty.toLocaleString('id-ID') + '</div><div class="flock-stat-lbl">Ekor</div></div>' +
      '<div class="flock-stat"><div class="flock-stat-val">H' + f.age + '</div><div class="flock-stat-lbl">Umur</div></div>' +
      '<div class="flock-stat"><div class="flock-stat-val">' + fmt + '</div><div class="flock-stat-lbl">Mulai</div></div>' +
      '</div>' +
      locationRow +
      '</div>';
  }).join('') || '<div style="text-align:center;padding:32px;color:var(--secondary-text)">Tidak ada data kandang</div>';
}

function switchFlockTab(tab, btn) {
  currentFlockTab = tab;
  document.querySelectorAll('#page-flock .tab-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderFlock();
}

function showAddFlockModal() {
  document.getElementById('new-flock-date').value = new Date().toISOString().split('T')[0];

  // Reset state lokasi
  _flockMapLat = null;
  _flockMapLng = null;

  // Cek role — owner & manager dapat peta, lainnya input manual
  // Fallback ke manual jika role tidak dikenali
  const role = (AUTH.role || '').toLowerCase();
  const isOwner = (role === 'owner' || role === 'manager');

  const ownerSec    = document.getElementById('location-owner-section');
  const operatorSec = document.getElementById('location-operator-section');

  if (isOwner) {
    ownerSec.classList.remove('hidden');
    operatorSec.classList.add('hidden');
  } else {
    ownerSec.classList.add('hidden');
    operatorSec.classList.remove('hidden');
    // Reset input manual
    document.getElementById('manual-lat').value = '';
    document.getElementById('manual-lng').value = '';
    document.getElementById('btn-open-maps').style.display = 'none';
    document.getElementById('manual-coords-status').classList.add('hidden');
  }

  document.getElementById('map-coords-display').classList.add('hidden');

  // Tampilkan modal
  document.getElementById('modal-add-flock').classList.remove('hidden');

  // Init peta hanya untuk owner, setelah modal benar-benar visible
  if (isOwner) {
    // Gunakan MutationObserver untuk deteksi saat container punya ukuran
    _initMapWhenReady();
  }
}

// Tunggu container peta punya offsetHeight > 0, lalu init
function _initMapWhenReady() {
  const el = document.getElementById('flock-map');
  if (!el) return;

  let attempts = 0;
  const tryInit = () => {
    attempts++;
    if (el.offsetHeight > 0) {
      initFlockMap();
    } else if (attempts < 20) {
      // Coba lagi tiap 50ms, maks 1 detik
      setTimeout(tryInit, 50);
    } else {
      // Paksa height dan init
      el.style.height = '220px';
      el.style.minHeight = '220px';
      initFlockMap();
    }
  };
  setTimeout(tryInit, 50);
}

async function addFlock() {
  const name    = document.getElementById('new-flock-name').value.trim();
  const breed   = document.getElementById('new-flock-breed').value;
  const qty     = parseInt(document.getElementById('new-flock-qty').value) || 0;
  const date    = document.getElementById('new-flock-date').value;
  const officer = document.getElementById('new-flock-officer').value.trim();

  // Validasi
  if (!name)        { showToast('⚠️ Nama kandang wajib diisi'); return; }
  if (!date)        { showToast('⚠️ Tanggal mulai wajib diisi'); return; }
  if (qty <= 0)     { showToast('⚠️ Jumlah ekor harus lebih dari 0'); return; }
  if (qty > 500000) { showToast('⚠️ Jumlah ekor terlalu besar (maks 500.000)'); return; }

  // Ambil koordinat sesuai role
  const isOwner = AUTH.role === 'owner' || AUTH.role === 'manager';
  let lat = null, lng = null;

  if (isOwner) {
    // Dari peta Leaflet
    lat = _flockMapLat;
    lng = _flockMapLng;
  } else {
    // Dari input manual
    const latVal = parseFloat(document.getElementById('manual-lat').value);
    const lngVal = parseFloat(document.getElementById('manual-lng').value);
    if (!isNaN(latVal) && !isNaN(lngVal)) {
      if (latVal < -90 || latVal > 90)   { showToast('⚠️ Latitude harus antara -90 dan 90'); return; }
      if (lngVal < -180 || lngVal > 180) { showToast('⚠️ Longitude harus antara -180 dan 180'); return; }
      lat = latVal;
      lng = lngVal;
    }
  }

  const newFlock = {
    id: Date.now(), name, breed, startDate: date,
    qty, current_qty: qty, age: 0, active: true, officer,
    lat: lat, lng: lng
  };
  DB.flocks.push(newFlock);

  // Simpan ke Supabase
  const result = await saveFlock(newFlock);
  if (result.error) {
    showToast('⚠️ Gagal menyimpan kandang: ' + result.error);
  }

  closeModal('modal-add-flock');

  // Reset form
  document.getElementById('new-flock-name').value    = '';
  document.getElementById('new-flock-qty').value     = '';
  document.getElementById('new-flock-officer').value = '';
  _flockMapLat = null;
  _flockMapLng = null;
  if (_flockMap) { _flockMap.remove(); _flockMap = null; _flockMarker = null; }

  renderFlock();
  showToast('Kandang ' + name + ' berhasil ditambahkan');
}

// ---- INVENTORY ----
function renderInventory() {
  document.getElementById('inv-feed-count').textContent = getFeedBagCount();
  document.getElementById('inv-critical-count').textContent = getCriticalCount();
  renderInvList();
}

function renderInvList() {
  const list = document.getElementById('inv-list');
  if (!list) return;
  const items = getInventoryByCategory(currentInvTab);
  list.innerHTML = items.map(item => {
    const statusLabel = { ok: 'Tersedia', reorder: 'Perlu Reorder', empty: 'Habis' }[item.status] || item.status;
    const statusCls = { ok: 'success', reorder: 'warning', empty: 'error' }[item.status] || '';
    return '<div class="inv-item">' +
      '<div class="inv-item-icon" style="background:' + item.bgTint + '">' +
      '<span class="material-icons-round" style="color:' + item.iconColor + '">' + item.icon + '</span></div>' +
      '<div class="inv-item-info"><div class="inv-item-name">' + item.name + '</div>' +
      '<span class="inv-status-badge ' + statusCls + '">' + statusLabel + '</span></div>' +
      '<div class="inv-item-right"><div class="inv-item-qty">' + item.qty + '</div><div class="inv-item-unit">' + item.unit + '</div></div></div>';
  }).join('') || '<div style="text-align:center;padding:24px;color:var(--secondary-text)">Tidak ada item</div>';
}

function switchInvTab(tab, btn) {
  currentInvTab = tab;
  document.querySelectorAll('#page-inventory .tab-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderInvList();
}

async function updateStock() {
  const sel = document.getElementById('inv-item-select').value;
  const qty = parseInt(document.getElementById('inv-qty-input').value) || 0;
  if (!sel)    { showToast('⚠️ Pilih item terlebih dahulu'); return; }
  if (qty <= 0) { showToast('⚠️ Jumlah harus lebih dari 0'); return; }
  if (qty > 10000) { showToast('⚠️ Jumlah terlalu besar (maks 10.000)'); return; }
  const item = DB.inventory.find(i => i.id.toString() === sel || i.name.toLowerCase().includes(sel));
  if (item) {
    item.qty += qty;
    if (item.qty > 0) item.status = item.qty < 5 ? 'reorder' : 'ok';

    // Simpan ke Supabase jika item punya kandang_id
    if (item._kandangId) {
      await saveStockPakan(item._kandangId, item.qty);
    } else {
      saveDB(); // fallback cache
    }

    renderInventory();
    document.getElementById('inv-qty-input').value = '';
    showToast(item.name + ' diperbarui: ' + item.qty + ' ' + item.unit);
  }
}

// ---- SETTINGS ----

function toggleSetting(key, val) {
  if (key === 'push') DB.settings.pushAlerts = val;
  if (key === 'weekly') DB.settings.weeklyReports = val;
  saveSettings();
  showToast(val ? 'Notifikasi diaktifkan' : 'Notifikasi dinonaktifkan');
}

function toggleDarkMode(val) {
  DB.settings.darkMode = val;
  saveSettings();
  applyTheme();
}

function applyTheme() {
  document.body.dataset.theme = DB.settings.darkMode ? 'dark' : 'light';
  document.getElementById('toggle-dark') && (document.getElementById('toggle-dark').checked = DB.settings.darkMode);
}

// ---- Farm Settings ----
let _farmSettingsCache = null;

async function loadFarmSettings() {
  const sb = AUTH.getSupabase();
  if (!sb) return;
  try {
    // Ambil farm_settings — semua user bisa baca (single-tenant, satu row)
    const { data } = await sb
      .from('farm_settings')
      .select('*')
      .limit(1)
      .maybeSingle();
    if (data) {
      _farmSettingsCache = data;
      DB.settings.farmName = data.farm_name || DB.settings.farmName;
      _applyFarmPhoto(data.farm_photo);
    }
  } catch (e) {
    console.warn('[Farm] loadFarmSettings:', e.message);
  }
}

function _applyFarmPhoto(photoUrl) {
  if (!photoUrl) return;
  // Tampilkan di header avatar jika ada
  const avatarEl = document.getElementById('header-avatar-icon');
  if (avatarEl && avatarEl.parentElement) {
    avatarEl.parentElement.style.backgroundImage = `url(${photoUrl})`;
    avatarEl.parentElement.style.backgroundSize = 'cover';
    avatarEl.style.display = 'none';
  }
  // Tampilkan di settings farm photo preview
  const previewEl = document.getElementById('farm-photo-preview');
  if (previewEl) {
    previewEl.src = photoUrl;
    previewEl.style.display = 'block';
  }
}

async function saveFarmSettingsToDB(updates) {
  const sb = AUTH.getSupabase();
  if (!sb) return { error: 'Supabase tidak tersedia' };
  try {
    const { data, error } = await sb
      .from('farm_settings')
      .upsert({ owner_id: AUTH.userId, ...updates }, { onConflict: 'owner_id' })
      .select()
      .single();
    if (error) return { error: error.message };
    _farmSettingsCache = data;
    return { data };
  } catch (e) {
    return { error: e.message };
  }
}

function editFarmName() {
  // Buat modal edit nama farm
  const current = DB.settings.farmName || 'BroilerTrack';

  // Hapus modal lama jika ada
  const existing = document.getElementById('modal-edit-farm-name');
  if (existing) existing.remove();

  const modal = document.createElement('div');
  modal.id = 'modal-edit-farm-name';
  modal.className = 'modal';
  modal.style.cssText = 'display:flex';
  modal.innerHTML = `
    <div class="modal-content">
      <div class="modal-header">
        <h3 class="modal-title">Edit Nama Peternakan</h3>
        <button class="modal-close" onclick="document.getElementById('modal-edit-farm-name').remove()">
          <span class="material-icons-round">close</span>
        </button>
      </div>
      <div class="modal-body">
        <div class="form-field">
          <label class="form-label">Nama Peternakan</label>
          <input type="text" id="input-farm-name" class="form-input"
            value="${current}" placeholder="Nama peternakan Anda" maxlength="50" />
        </div>
        <div class="form-field" style="margin-top:16px">
          <label class="form-label">Foto / Logo Peternakan</label>
          <div style="display:flex;align-items:center;gap:12px;margin-top:8px">
            <div id="farm-photo-wrap" style="width:72px;height:72px;border-radius:12px;border:2px dashed var(--outline-variant);overflow:hidden;display:flex;align-items:center;justify-content:center;background:var(--surface-variant);flex-shrink:0">
              <img id="farm-photo-preview" style="width:100%;height:100%;object-fit:cover;display:none" />
              <span class="material-icons-round" id="farm-photo-icon" style="color:var(--hint);font-size:28px">add_photo_alternate</span>
            </div>
            <div style="flex:1">
              <button class="btn btn-outline" onclick="document.getElementById('farm-photo-input').click()" style="width:100%">
                <span class="material-icons-round">upload</span>
                Pilih Foto
              </button>
              <input type="file" id="farm-photo-input" accept="image/*" style="display:none" onchange="onFarmPhotoSelected(this)" />
              <div style="font-size:11px;color:var(--hint);margin-top:6px">JPG/PNG, semua ukuran. Foto akan dikompres otomatis.</div>
            </div>
          </div>
        </div>
        <div id="farm-edit-error" style="color:var(--error);font-size:13px;margin-top:8px;display:none"></div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-ghost" onclick="document.getElementById('modal-edit-farm-name').remove()">Batal</button>
        <button class="btn btn-primary" onclick="saveFarmName()">
          <span class="material-icons-round">save</span>
          Simpan
        </button>
      </div>
    </div>`;
  document.body.appendChild(modal);

  // Tampilkan foto yang sudah ada
  if (_farmSettingsCache?.farm_photo) {
    const preview = document.getElementById('farm-photo-preview');
    const icon    = document.getElementById('farm-photo-icon');
    if (preview) { preview.src = _farmSettingsCache.farm_photo; preview.style.display = 'block'; }
    if (icon)    icon.style.display = 'none';
  }

  setTimeout(() => document.getElementById('input-farm-name')?.focus(), 100);
}

// Kompresi foto menggunakan Canvas API (tanpa library tambahan)
// Target: maks 800x800px, JPEG quality 72%, hasil < 150KB
function compressImage(file, maxWidth, maxHeight, quality) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        // Hitung dimensi baru dengan mempertahankan aspect ratio
        let w = img.width;
        let h = img.height;
        if (w > maxWidth || h > maxHeight) {
          const ratio = Math.min(maxWidth / w, maxHeight / h);
          w = Math.round(w * ratio);
          h = Math.round(h * ratio);
        }

        const canvas = document.createElement('canvas');
        canvas.width  = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, w, h);

        // Export sebagai JPEG dengan quality yang ditentukan
        const compressed = canvas.toDataURL('image/jpeg', quality);
        resolve(compressed);
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

// Saat user pilih foto — kompresi otomatis sebelum preview
async function onFarmPhotoSelected(input) {
  const file = input.files[0];
  if (!file) return;

  const errEl   = document.getElementById('farm-edit-error');
  const preview = document.getElementById('farm-photo-preview');
  const icon    = document.getElementById('farm-photo-icon');

  // Validasi tipe file
  if (!file.type.startsWith('image/')) {
    if (errEl) { errEl.textContent = 'File harus berupa gambar (JPG/PNG)'; errEl.style.display = 'block'; }
    input.value = '';
    return;
  }

  // Tampilkan loading state
  if (icon) { icon.textContent = 'hourglass_empty'; icon.style.display = 'block'; }
  if (preview) preview.style.display = 'none';
  if (errEl) errEl.style.display = 'none';

  try {
    // Kompresi: maks 800x800px, JPEG quality 72%
    const compressed = await compressImage(file, 800, 800, 0.72);

    // Hitung ukuran hasil kompresi (base64 → bytes ≈ length * 0.75)
    const sizeKB = Math.round(compressed.length * 0.75 / 1024);

    // Tampilkan preview
    if (preview) { preview.src = compressed; preview.style.display = 'block'; }
    if (icon)    icon.style.display = 'none';

    // Simpan hasil kompresi
    input.dataset.dataUrl = compressed;

    // Info ukuran
    if (errEl) {
      errEl.style.color = 'var(--secondary-text)';
      errEl.textContent = `Foto dikompres: ${sizeKB}KB (dari ${Math.round(file.size / 1024)}KB)`;
      errEl.style.display = 'block';
    }
  } catch (e) {
    if (errEl) { errEl.textContent = 'Gagal memproses foto. Coba foto lain.'; errEl.style.display = 'block'; }
    if (icon) { icon.textContent = 'add_photo_alternate'; icon.style.display = 'block'; }
    input.value = '';
  }
}

async function saveFarmName() {
  const nameInput  = document.getElementById('input-farm-name');
  const photoInput = document.getElementById('farm-photo-input');
  const errEl      = document.getElementById('farm-edit-error');
  const btn        = document.querySelector('#modal-edit-farm-name .btn-primary');

  const name = nameInput?.value.trim();
  if (!name) {
    if (errEl) { errEl.textContent = 'Nama peternakan tidak boleh kosong'; errEl.style.display = 'block'; }
    return;
  }

  if (btn) { btn.disabled = true; btn.innerHTML = '<span class="material-icons-round spin">refresh</span> Menyimpan...'; }

  const updates = { farm_name: name };

  // Tambahkan foto jika ada yang baru dipilih
  const newPhoto = photoInput?.dataset.dataUrl;
  if (newPhoto) updates.farm_photo = newPhoto;

  const result = await saveFarmSettingsToDB(updates);

  if (btn) { btn.disabled = false; btn.innerHTML = '<span class="material-icons-round">save</span> Simpan'; }

  if (result.error) {
    if (errEl) { errEl.textContent = 'Gagal menyimpan: ' + result.error; errEl.style.display = 'block'; }
    return;
  }

  // Update lokal
  DB.settings.farmName = name;
  saveSettings();
  if (newPhoto) _applyFarmPhoto(newPhoto);

  document.getElementById('modal-edit-farm-name')?.remove();
  renderSettings();
  showToast('✓ Nama peternakan berhasil diperbarui');
}

function changeMeasurement() {
  showToast('Satuan: Metrik (Liter, Kilogram)');
}

function showHelp() {
  showToast('Hubungi: support@broilertrack.id');
}



function exportReport() {
  showToast('Fitur ekspor segera hadir');
}





// ===== TEAM MANAGEMENT =====
function renderSettings() {
  const role = AUTH.role;

  // Role yang dapat tampilan terbatas (bukan owner/manager)
  const isLimitedView = !['owner', 'manager'].includes(role);

  const tsView   = document.getElementById('settings-ts-view');
  const fullView = document.getElementById('settings-full-view');

  if (isLimitedView) {
    // ── Tampilan terbatas: semua role kecuali owner/manager ──────────────
    tsView.classList.remove('hidden');
    fullView.classList.add('hidden');

    // Update header sesuai role
    const subtitle = document.getElementById('settings-page-subtitle');
    const icon     = document.getElementById('settings-page-icon');
    const roleLabels = {
      ts:       { text: 'Profil & Preferensi',  icon: 'manage_accounts' },
      staff:    { text: 'Profil & Preferensi',  icon: 'manage_accounts' },
      operator: { text: 'Profil & Preferensi',  icon: 'manage_accounts' },
      viewer:   { text: 'Profil',               icon: 'manage_accounts' }
    };
    const rl = roleLabels[role] || { text: 'Profil', icon: 'manage_accounts' };
    if (subtitle) subtitle.textContent = rl.text;
    if (icon)     icon.textContent     = rl.icon;

    // Isi profil
    const nama     = AUTH.userName || '-';
    const email    = AUTH.userEmail || '-';
    const initials = nama.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

    const avatarEl = document.getElementById('ts-avatar-initials');
    const nameEl   = document.getElementById('ts-profile-name');
    const emailEl  = document.getElementById('ts-profile-email');
    if (avatarEl) avatarEl.textContent = initials;
    if (nameEl)   nameEl.textContent   = nama;
    if (emailEl)  emailEl.textContent  = email;

    // Ganti label role di profil card
    const roleEl = tsView.querySelector('.ts-profile-role');
    const roleDisplayNames = {
      ts:       'Technical Service',
      staff:    'Staff Kantor',
      operator: 'Operator Kandang',
      viewer:   'Viewer'
    };
    if (roleEl) roleEl.textContent = roleDisplayNames[role] || role;

    // Info peternakan
    const farmEl   = document.getElementById('ts-farm-name');
    const flocksEl = document.getElementById('ts-active-flocks');
    if (farmEl)   farmEl.textContent   = DB.settings.farmName || AUTH.tenantName || '-';
    const activeCount = DB.flocks.filter(f => f.active).length;
    if (flocksEl) flocksEl.textContent = activeCount + ' kandang aktif';

    // Sync dark mode toggle
    const darkToggleTS = document.getElementById('toggle-dark-ts');
    if (darkToggleTS) darkToggleTS.checked = DB.settings.darkMode;

  } else {
    // ── Tampilan lengkap: owner & manager ────────────────────────────────
    tsView.classList.add('hidden');
    fullView.classList.remove('hidden');

    const farmNameEl = document.getElementById('farm-name-display');
    if (farmNameEl) farmNameEl.textContent = DB.settings.farmName || AUTH.tenantName;

    const pushEl   = document.getElementById('toggle-push');
    const weeklyEl = document.getElementById('toggle-weekly');
    const darkEl   = document.getElementById('toggle-dark');
    if (pushEl)   pushEl.checked   = DB.settings.pushAlerts;
    if (weeklyEl) weeklyEl.checked = DB.settings.weeklyReports;
    if (darkEl)   darkEl.checked   = DB.settings.darkMode;

    renderTeamMembers();

    const btnInvite = document.getElementById('btn-show-invite');
    if (btnInvite) btnInvite.style.display = AUTH.can('member.invite') ? '' : 'none';

    // Sesuaikan opsi role undangan berdasarkan role yang login
    // Hanya owner yang bisa undang sebagai manager
    const inviteRoleSel = document.getElementById('invite-role');
    if (inviteRoleSel) {
      const isOwner = AUTH.role === 'owner';
      // Hapus opsi manager jika sudah ada
      Array.from(inviteRoleSel.options).forEach(opt => {
        if (opt.value === 'manager') opt.remove();
      });
      // Tambahkan manager di posisi pertama hanya untuk owner
      if (isOwner) {
        const managerOpt = document.createElement('option');
        managerOpt.value = 'manager';
        managerOpt.textContent = 'Manajer';
        inviteRoleSel.insertBefore(managerOpt, inviteRoleSel.firstChild);
      }
    }
  }

  // Tampilkan versi di semua role (dipanggil setelah DOM settings siap)
  setTimeout(() => _ensureVersionInfo(), 50);
}

async function renderTeamMembers() {
  const el = document.getElementById('team-member-list');
  if (!el) return;
  const members = await AuthService.getMembers();
  if (!members.length) {
    el.innerHTML = '<div style="color:var(--hint);font-size:13px;padding:8px 0">Belum ada anggota lain</div>';
    return;
  }

  // Urutkan: owner dulu, lalu sisanya berdasarkan abjad nama
  const roleOrder = { owner: 0, manager: 1, ts: 2, staff: 3, operator: 4, viewer: 5 };
  members.sort((a, b) => {
    const ro = (roleOrder[a.role] ?? 9) - (roleOrder[b.role] ?? 9);
    if (ro !== 0) return ro;
    return (a.full_name || '').localeCompare(b.full_name || '', 'id');
  });

  const roleLabel = {
    owner:    'Pemilik',
    manager:  'Manajer',
    ts:       'Technical Service',
    staff:    'Staff Kantor',
    operator: 'Operator',
    viewer:   'Viewer'
  };

  el.innerHTML = members.map(m => {
    const initials = (m.full_name || m.email || '?').charAt(0).toUpperCase();
    const isMe     = m.user_id === AUTH.userId;
    const canRemove = AUTH.can('member.remove') && !isMe && m.role !== 'owner';
    return '<div class="team-member-item">' +
      '<div class="team-member-avatar">' + initials + '</div>' +
      '<div class="team-member-info">' +
        '<div class="team-member-name">' + (m.full_name || '-') + (isMe ? ' <span style="color:var(--primary);font-size:11px">(Anda)</span>' : '') + '</div>' +
        '<div class="team-member-email">' + (m.email || '') + '</div>' +
      '</div>' +
      '<span class="team-role-badge ' + m.role + '">' + (roleLabel[m.role] || m.role) + '</span>' +
      (canRemove ? '<button class="icon-btn" onclick="removeMember(\'' + m.user_id + '\')" title="Hapus anggota" style="color:var(--error);margin-left:4px"><span class="material-icons-round" style="font-size:18px">person_remove</span></button>' : '') +
      '</div>';
  }).join('');
}

// ---- Helper: bangun kotak link undangan dengan tombol salin ----
function _buildInviteLinkBox(link, label) {
  return '<div style="margin-top:10px;background:rgba(59,130,246,0.05);border:1px solid rgba(59,130,246,0.2);border-radius:10px;padding:12px">' +
    '<div style="font-size:13px;font-weight:600;color:var(--primary);margin-bottom:8px">' + label + '</div>' +
    '<div style="display:flex;align-items:center;gap:8px;background:#fff;border:1px solid var(--outline-variant);border-radius:8px;padding:10px 12px">' +
    '<span style="font-size:12px;color:var(--secondary-text);flex:1;word-break:break-all;line-height:1.5" id="invite-link-text">' + link + '</span>' +
    '<button onclick="copyInviteLink()" title="Salin link" ' +
    'style="flex-shrink:0;background:var(--primary);color:#fff;border:none;border-radius:8px;padding:8px 14px;cursor:pointer;display:flex;align-items:center;gap:6px;font-size:13px;font-weight:600;box-shadow:0 2px 4px rgba(59,130,246,0.2)">' +
    '<span class="material-icons-round" style="font-size:18px">content_copy</span>Salin</button>' +
    '</div>' +
    '<button onclick="shareToWhatsApp()" ' +
    'style="width:100%;margin-top:8px;background:#25D366;color:#fff;border:none;border-radius:8px;padding:10px;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;font-size:13px;font-weight:600">' +
    '<span class="material-icons-round" style="font-size:18px">send</span>Kirim via WhatsApp</button>' +
    '<div style="font-size:11px;color:var(--hint);margin-top:8px;text-align:center">⚠️ Link berlaku 24 jam dan hanya bisa dipakai sekali.</div>' +
    '</div>';
}

function copyInviteLink() {
  const el = document.getElementById('invite-link-text');
  if (!el) return;
  const link = el.textContent.trim();
  if (navigator.clipboard) {
    navigator.clipboard.writeText(link).then(() => showToast('✓ Link disalin ke clipboard'));
  } else {
    // Fallback untuk browser lama
    const ta = document.createElement('textarea');
    ta.value = link;
    ta.style.position = 'fixed';
    ta.style.opacity  = '0';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    showToast('✓ Link disalin ke clipboard');
  }
}

function shareToWhatsApp() {
  const el = document.getElementById('invite-link-text');
  if (!el) return;
  const link = el.textContent.trim();
  
  // Pesan template untuk WhatsApp
  const message = `Halo! Anda diundang untuk bergabung ke BroilerTrack.\n\nKlik link berikut untuk mendaftar:\n${link}\n\n⚠️ Link berlaku 24 jam dan hanya bisa dipakai sekali.`;
  
  // Encode message untuk URL
  const encodedMessage = encodeURIComponent(message);
  
  // Buka WhatsApp (web atau app)
  const whatsappUrl = `https://wa.me/?text=${encodedMessage}`;
  window.open(whatsappUrl, '_blank');
}

function toggleInviteForm() {
  const wrap = document.getElementById('invite-form-wrap');
  const btn  = document.getElementById('btn-show-invite');
  const show = wrap.style.display === 'none';
  wrap.style.display = show ? 'flex' : 'none';
  wrap.style.flexDirection = 'column';
  btn.innerHTML = show
    ? '<span class="material-icons-round">close</span> Tutup'
    : '<span class="material-icons-round">person_add</span> Undang Anggota';
  document.getElementById('invite-link-result').classList.add('hidden');
}

async function removeMember(userId) {
  // Cari info anggota yang akan dihapus
  const members = await AuthService.getMembers();
  const member = members.find(m => m.user_id === userId);
  const memberName = member ? (member.full_name || member.email) : 'anggota ini';
  
  // Konfirmasi dengan peringatan
  const confirmed = confirm(
    '⚠️ HAPUS ANGGOTA\n\n' +
    'Anda akan menghapus: ' + memberName + '\n\n' +
    'Anggota ini akan:\n' +
    '• Dikeluarkan dari organisasi\n' +
    '• Kehilangan akses ke semua data\n' +
    '• Tidak bisa login ke aplikasi ini\n\n' +
    'Lanjutkan?'
  );
  
  if (!confirmed) return;
  
  showToast('⏳ Menghapus anggota...');
  const result = await AuthService.removeMember({ userId });
  
  if (result.error) { 
    showToast('❌ Gagal: ' + result.error); 
    return; 
  }
  
  renderTeamMembers();
  showToast('✓ ' + memberName + ' berhasil dihapus dari organisasi');
}

async function doInvite() {
  const email = document.getElementById('invite-email').value.trim();
  const role  = document.getElementById('invite-role').value;
  const resEl = document.getElementById('invite-link-result');

  if (!email) { showToast('Masukkan email anggota'); return; }

  const btn = document.querySelector('[onclick="doInvite()"]');
  if (btn) { btn.disabled = true; btn.innerHTML = '<span class="material-icons-round spin">refresh</span> Mengirim...'; }

  const result = await AuthService.inviteMember({ email, role });

  if (btn) { btn.disabled = false; btn.innerHTML = '<span class="material-icons-round">send</span> Kirim Undangan'; }

  if (result.error) { showToast('⚠️ ' + result.error); return; }

  // Tampilkan konfirmasi sesuai tipe hasil
  const inviteLink = result.invite_link || '';

  const noLinkMsg = '<div style="margin-top:8px;padding:10px 12px;background:rgba(245,158,11,.1);border:1px solid rgba(245,158,11,.3);border-radius:8px;font-size:12px;color:#92400E">' +
    '<span class="material-icons-round" style="font-size:14px;vertical-align:middle;margin-right:4px">warning</span>' +
    'Link tidak tersedia. Coba undang ulang atau hubungi support.</div>';

  if (result.type === 'role_updated') {
    resEl.innerHTML =
      '<div style="margin-bottom:6px">' +
      '<span class="material-icons-round" style="color:var(--warning);font-size:15px;vertical-align:middle">info</span> ' +
      '<strong>' + email + '</strong> sudah terdaftar. Role diperbarui ke <strong>' + role + '</strong>.</div>' +
      (inviteLink ? _buildInviteLinkBox(inviteLink, 'Link login untuk dikirim via WA:') : noLinkMsg);
  } else {
    resEl.innerHTML =
      '<div style="margin-bottom:6px">' +
      '<span class="material-icons-round" style="color:var(--success);font-size:15px;vertical-align:middle">check_circle</span> ' +
      'Link undangan berhasil dibuat untuk <strong>' + email + '</strong>.</div>' +
      (inviteLink ? _buildInviteLinkBox(inviteLink, 'Salin dan kirim via WA / chat:') : noLinkMsg);
  }
  resEl.classList.remove('hidden');
  document.getElementById('invite-email').value = '';
  showToast(result.type === 'role_updated' ? 'Role anggota diperbarui' : (inviteLink ? 'Link undangan siap disalin' : 'Undangan dibuat, tapi link tidak tersedia'));
}
async function signOut() {
  if (confirm('Yakin ingin keluar?')) {
    await AuthService.logout();
    window.location.href = 'auth/login.html';
  }
}

// ===== HISTORI AKTIVITAS =====
// Definisi kategori aktivitas
const ACT_TYPES = {
  deplesi:   { label: 'Deplesi',        icon: 'heart_broken',   bg: 'rgba(239,68,68,.12)',   color: '#EF4444' },
  pakan:     { label: 'Pakan',          icon: 'bakery_dining',  bg: 'rgba(251,191,36,.12)',  color: '#FBBF24' },
  air:       { label: 'Konsumsi Air',   icon: 'water_drop',     bg: 'rgba(59,130,246,.12)',  color: '#3B82F6' },
  timbang:   { label: 'Timbang Berat',  icon: 'monitor_weight', bg: 'rgba(16,185,129,.12)',  color: '#10B981' },
  checklist: { label: 'Check List',     icon: 'checklist',      bg: 'rgba(99,102,241,.12)',  color: '#6366F1' },
  catatan:   { label: 'Catatan',        icon: 'edit_note',      bg: 'rgba(156,163,175,.15)', color: '#6B7280' },
  selesai:   { label: 'Hari Selesai',   icon: 'check_circle',   bg: 'rgba(16,185,129,.15)',  color: '#10B981' },
};

function logActivity(type, detail) {
  const log = getTodayLog();
  if (!log) return;
  if (!log.activities) log.activities = [];

  const now  = new Date();
  const time = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

  // Cegah duplikat dalam 10 detik untuk kategori yang sama
  const last = log.activities[0];
  if (last && last.type === type && (now - new Date(last.ts)) < 10000) {
    // Update entry terakhir saja
    last.detail = detail;
    last.time   = time;
    last.ts     = now.toISOString();
  } else {
    log.activities.unshift({ type, detail, time, ts: now.toISOString() });
    if (log.activities.length > 50) log.activities.pop();
  }
  // Tidak perlu saveDB() di sini — saveLog() dipanggil oleh saveProgress/completeDay/saveTimbang
  renderActivityLog();
}

function renderActivityLog() {
  const el = document.getElementById('daily-activity-log');
  if (!el) return;
  const log = getTodayLog();
  const acts = (log && log.activities && log.activities.length > 0)
    ? log.activities : null;

  if (!acts) {
    el.innerHTML = '<div class="activity-history-empty">Belum ada aktivitas hari ini</div>';
    return;
  }

  el.innerHTML = acts.map(a => {
    const def = ACT_TYPES[a.type] || ACT_TYPES.catatan;
    return '<div class="ah-item">' +
      '<div class="ah-icon" style="background:' + def.bg + '">' +
      '<span class="material-icons-round" style="color:' + def.color + '">' + def.icon + '</span></div>' +
      '<div class="ah-body">' +
      '<div class="ah-category">' + def.label + '</div>' +
      '<div class="ah-detail">' + (a.detail || '') + '</div>' +
      '</div>' +
      '<div class="ah-time">' + a.time + '</div>' +
      '</div>';
  }).join('');
}

// ===== CHECK LIST =====
const CL_DEFAULTS = {
  suhu: '', kipas: 'on', kipasQty: '',
  inverter: 'on', inverterQty: '', inverterHz: '',
  pln: 'on', genset: 'off'
};

function clToggle(key, val) {
  const onBtn  = document.getElementById('cl-' + key + '-on');
  const offBtn = document.getElementById('cl-' + key + '-off');
  if (onBtn)  onBtn.classList.toggle('active',  val === 'on');
  if (offBtn) offBtn.classList.toggle('active', val === 'off');

  // Show/hide sub-inputs saat toggle berubah
  const subEl = document.getElementById('cl-' + key + '-sub');
  if (subEl) {
    subEl.style.display = val === 'on' ? 'flex' : 'none';
  }
}

function renderChecklist() {
  const log = getTodayLog();
  // Buat salinan baru dari defaults - tidak pernah share referensi antar log
  const cl = (log && log.checklist)
    ? Object.assign({}, CL_DEFAULTS, log.checklist)
    : Object.assign({}, CL_DEFAULTS);

  const set = (id, val) => { const el = document.getElementById(id); if (el) el.value = val || ''; };

  set('cl-suhu',         cl.suhu);
  set('cl-kipas-qty',    cl.kipasQty);
  set('cl-inverter-qty', cl.inverterQty);
  set('cl-inverter-hz',  cl.inverterHz);

  clToggle('kipas',    cl.kipas    || 'on');
  clToggle('inverter', cl.inverter || 'on');
  clToggle('pln',      cl.pln      || 'on');
  clToggle('genset',   cl.genset   || 'off');
}

function readChecklist() {
  const getToggle = (key) => {
    const onBtn = document.getElementById('cl-' + key + '-on');
    return (onBtn && onBtn.classList.contains('active')) ? 'on' : 'off';
  };
  const get = (id) => document.getElementById(id)?.value || '';
  // Kembalikan objek baru setiap kali - tidak ada referensi bersama
  return {
    suhu:        get('cl-suhu'),
    kipas:       getToggle('kipas'),
    kipasQty:    get('cl-kipas-qty'),
    inverter:    getToggle('inverter'),
    inverterQty: get('cl-inverter-qty'),
    inverterHz:  get('cl-inverter-hz'),
    pln:         getToggle('pln'),
    genset:      getToggle('genset')
  };
}

// ---- TIMBANG BERAT BADAN ----
let timbangData = [];   // [{berat, sample}]
let timbangSampleSize = 5;  // default ekor per timbang

function openTimbang() {
  const log = getTodayLog();
  const day = getCurrentDay();

  // Set header info
  const today = new Date();
  const dateStr = today.toLocaleDateString('id-ID', { day:'2-digit', month:'short', year:'2-digit' })
                       .replace(/ /g, '-');
  document.getElementById('timbang-date-display').textContent = dateStr;
  document.getElementById('timbang-umur-display').textContent = 'Hari ' + day;

  // Load data existing jika ada
  timbangData = (log && log.timbang_rows) ? [...log.timbang_rows] : [];
  renderTimbangTable();
  calcTimbangSummary();

  document.getElementById('modal-timbang').classList.remove('hidden');
  setTimeout(() => document.getElementById('timbang-berat-input').focus(), 200);
}

function addTimbang() {
  const beratInput = document.getElementById('timbang-berat-input');
  const ekorInput  = document.getElementById('timbang-ekor-input');
  const berat  = parseFloat(beratInput.value);
  const sample = parseInt(ekorInput.value) || 5;

  // Validasi
  if (!berat || berat <= 0)    { showToast('⚠️ Berat harus lebih dari 0'); beratInput.focus(); return; }
  if (berat > 99999)           { showToast('⚠️ Berat tidak wajar (maks 99.999 g)'); beratInput.focus(); return; }
  if (sample <= 0)             { showToast('⚠️ Jumlah ekor harus lebih dari 0'); ekorInput.focus(); return; }
  if (sample > 1000)           { showToast('⚠️ Jumlah ekor terlalu besar (maks 1.000)'); ekorInput.focus(); return; }

  timbangData.unshift({ berat: berat, sample: sample });
  beratInput.value = '';
  beratInput.focus();
  renderTimbangTable();
  calcTimbangSummary();
}

function renderTimbangTable() {
  const tbody = document.getElementById('timbang-tbody');
  if (!tbody) return;
  tbody.innerHTML = timbangData.map((row, i) => {
    const no    = timbangData.length - i;
    const rataRata = (row.berat / row.sample).toFixed(2).replace('.', ',');
    const beratFmt = row.berat.toString().replace('.', ',');
    return '<tr>' +
      '<td>' + no + '</td>' +
      '<td>' + beratFmt + '</td>' +
      '<td>' + row.sample + '</td>' +
      '<td>' + rataRata + '</td>' +
      '</tr>';
  }).join('') || '<tr><td colspan="4" style="color:var(--hint);padding:20px">Belum ada data</td></tr>';
}

function calcTimbangSummary() {
  const avgEl = document.getElementById('timbang-avg-display');
  const stdEl = document.getElementById('timbang-std-display');
  const cvEl  = document.getElementById('timbang-cv-display');

  if (timbangData.length === 0) {
    if (avgEl) avgEl.textContent = '0';
    if (stdEl) { stdEl.textContent = '-'; stdEl.className = 'timbang-std-value'; }
    if (cvEl)  cvEl.textContent = '';
    return;
  }

  // Rata-rata per ekor
  const allRata = timbangData.map(r => r.berat / r.sample);
  const avg = allRata.reduce((s, v) => s + v, 0) / allRata.length;

  // Std deviasi & CV
  const variance = allRata.reduce((s, v) => s + Math.pow(v - avg, 2), 0) / allRata.length;
  const std = Math.sqrt(variance);
  const cv  = avg > 0 ? ((std / avg) * 100).toFixed(1) : '0';

  // Target berat hari ini
  const day    = getCurrentDay();
  const breed  = getActiveBreed();
  const target = getTargetWeight(day, breed);

  // Tampilkan rata-rata aktual
  if (avgEl) avgEl.textContent = avg.toFixed(0);

  // Tampilkan std target + selisih
  if (stdEl && target) {
    const diff  = Math.round(avg - target);
    const sign  = diff >= 0 ? '+' : '';
    const color = diff >= 0 ? 'var(--success)' : 'var(--error)';
    stdEl.innerHTML =
      '<span style="color:var(--success);font-weight:700">' + target + '</span>' +
      '<span style="color:' + color + ';font-weight:700;margin-left:6px">(' + sign + diff + ')</span>';
    stdEl.className = 'timbang-std-value';
  } else if (stdEl) {
    stdEl.textContent = '-';
  }

  // CV
  if (cvEl) cvEl.textContent = cv;
}

async function saveTimbang() {
  const log = getTodayLog();
  if (log) {
    const allRata = timbangData.map(r => r.berat / r.sample);
    const avg = allRata.length > 0
      ? allRata.reduce((s, v) => s + v, 0) / allRata.length
      : 0;
    log.timbang_rows = [...timbangData];
    log.weight = Math.round(avg);
  }
  const _tlog = getTodayLog();
  if (_tlog && _tlog.timbang_rows && _tlog.timbang_rows.length > 0) {
    const _avg = Math.round(_tlog.weight || 0);
    logActivity('timbang', _tlog.timbang_rows.length + ' timbangan | Rata-rata: ' + _avg + ' gr');
  }
  await saveLog(getTodayLog());
  updateTimbangCard();
  closeModal('modal-timbang');
  showToast('Data timbang tersimpan');
}

function updateTimbangCard() {
  const log = getTodayLog();
  const card = document.getElementById('timbang-summary-text');
  if (!card) return;

  if (!log || !log.timbang_rows || log.timbang_rows.length === 0) {
    card.innerHTML = 'Belum ada data timbang';
    card.className = 'body-small secondary-text';
    return;
  }

  const rows    = log.timbang_rows;
  const allRata = rows.map(r => r.berat / r.sample);
  const avg     = allRata.reduce((s, v) => s + v, 0) / allRata.length;
  const variance= allRata.reduce((s, v) => s + Math.pow(v - avg, 2), 0) / allRata.length;
  const cv      = avg > 0 ? ((Math.sqrt(variance) / avg) * 100).toFixed(1) : '0';
  const totalEkor = rows.reduce((s, r) => s + r.sample, 0);

  const day    = getCurrentDay();
  const breed  = getActiveBreed();
  const target = getTargetWeight(day, breed);
  const diff   = target ? Math.round(avg - target) : null;
  const sign   = diff !== null ? (diff >= 0 ? '+' : '') : '';
  const diffColor = diff !== null ? (diff >= 0 ? 'var(--success)' : 'var(--error)') : '';

  let html = '<span style="font-weight:700;color:var(--primary-text)">' + Math.round(avg) + ' gr</span>';
  if (target !== null) {
    html += '<span style="color:var(--secondary-text)"> vs target </span>' +
            '<span style="font-weight:700;color:var(--success)">' + target + ' gr</span>' +
            '<span style="font-weight:700;color:' + diffColor + '"> (' + sign + diff + ')</span>';
  }
  html += '<span style="color:var(--secondary-text)"> &bull; CV ' + cv + '%</span>';

  card.innerHTML = html;
  card.className = 'body-small';
}

// ---- MODAL ----
function closeModal(id) {
  document.getElementById(id).classList.add('hidden');
  // Bersihkan peta jika modal kandang ditutup
  if (id === 'modal-add-flock' && _flockMap) {
    _flockMap.remove();
    _flockMap   = null;
    _flockMarker = null;
    _flockMapLat = null;
    _flockMapLng = null;
  }
}

// ---- TOAST ----
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.remove('hidden');
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.classList.add('hidden'), 2800);
}

// ===== LOKASI KANDANG =====
let _flockMap    = null;   // instance Leaflet map
let _flockMarker = null;   // marker aktif di peta
let _flockMapLat = null;   // koordinat terpilih
let _flockMapLng = null;

// ---- OWNER: Inisialisasi peta Leaflet ----
// ── Layer tiles ──────────────────────────────────────────────────────────────
let _mapCurrentLayer = 'street'; // 'street' | 'satellite'
let _streetLayer     = null;
let _satelliteLayer  = null;

function initFlockMap() {
  const el = document.getElementById('flock-map');
  if (!el) return;

  if (typeof L === 'undefined') {
    el.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:var(--secondary-text);font-size:13px;padding:16px;text-align:center">Peta tidak tersedia. Periksa koneksi internet.</div>';
    return;
  }

  // Hancurkan instance lama
  if (_flockMap) {
    try { _flockMap.remove(); } catch(e) {}
    _flockMap    = null;
    _flockMarker = null;
    _streetLayer = null;
    _satelliteLayer = null;
  }

  // Paksa ukuran
  el.style.height    = '340px';
  el.style.minHeight = '340px';
  el.style.display   = 'block';

  try {
    _flockMap = L.map('flock-map', {
      zoomControl:        true,
      attributionControl: true,
      tap:                true,
      tapTolerance:       15
    }).setView([-2.5, 118.0], 5);

    // ── Layer 1: Street (OpenStreetMap) ──────────────────────────────────
    _streetLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19
    });

    // ── Layer 2: Satelit (Esri World Imagery — gratis, tidak perlu API key) ──
    _satelliteLayer = L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      {
        attribution: '© <a href="https://www.esri.com">Esri</a>',
        maxZoom: 19
      }
    );

    // Mulai dengan street layer
    _streetLayer.addTo(_flockMap);
    _mapCurrentLayer = 'street';

    // Update toggle button
    _updateLayerToggleBtn();

    // invalidateSize untuk mobile
    setTimeout(() => { if (_flockMap) _flockMap.invalidateSize(); }, 100);
    setTimeout(() => { if (_flockMap) _flockMap.invalidateSize(); }, 400);
    setTimeout(() => { if (_flockMap) _flockMap.invalidateSize(); }, 800);

    // Klik peta → pin lokasi + auto-save
    _flockMap.on('click', function(e) {
      setFlockMapLocation(e.latlng.lat, e.latlng.lng, true); // true = auto-save
    });

  } catch(err) {
    console.error('[Map] Gagal init Leaflet:', err);
    el.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:var(--error);font-size:13px;padding:16px;text-align:center">Gagal memuat peta: ' + err.message + '</div>';
  }
}

// Toggle antara street dan satelit
function toggleMapLayer() {
  if (!_flockMap) return;
  if (_mapCurrentLayer === 'street') {
    _flockMap.removeLayer(_streetLayer);
    _satelliteLayer.addTo(_flockMap);
    _mapCurrentLayer = 'satellite';
  } else {
    _flockMap.removeLayer(_satelliteLayer);
    _streetLayer.addTo(_flockMap);
    _mapCurrentLayer = 'street';
  }
  _updateLayerToggleBtn();
}

function _updateLayerToggleBtn() {
  const btn = document.getElementById('map-layer-toggle');
  if (!btn) return;
  if (_mapCurrentLayer === 'street') {
    btn.innerHTML = '<span class="material-icons-round" style="font-size:14px">satellite</span> Satelit';
  } else {
    btn.innerHTML = '<span class="material-icons-round" style="font-size:14px">map</span> Peta';
  }
}

// ---- OWNER: Set lokasi dari klik peta ----
function setFlockMapLocation(lat, lng, autoSave = false) {
  _flockMapLat = lat;
  _flockMapLng = lng;

  // Hapus marker lama
  if (_flockMarker) _flockMap.removeLayer(_flockMarker);

  // Marker custom
  const icon = L.divIcon({
    className: '',
    html: `<div style="
      background:#3B82F6;
      width:32px;height:32px;
      border-radius:50% 50% 50% 0;
      transform:rotate(-45deg);
      border:3px solid #fff;
      box-shadow:0 3px 10px rgba(0,0,0,.4)
    "></div>`,
    iconSize:   [32, 32],
    iconAnchor: [16, 32]
  });
  _flockMarker = L.marker([lat, lng], { icon, draggable: true }).addTo(_flockMap);

  // Drag marker → update koordinat
  _flockMarker.on('dragend', function(e) {
    const pos = e.target.getLatLng();
    setFlockMapLocation(pos.lat, pos.lng, true);
  });

  _flockMap.setView([lat, lng], Math.max(_flockMap.getZoom(), 15));

  // Tampilkan koordinat
  const coordsEl   = document.getElementById('map-coords-display');
  const coordsText = document.getElementById('map-coords-text');
  const savedBadge = document.getElementById('map-saved-badge');

  coordsText.textContent = lat.toFixed(6) + ', ' + lng.toFixed(6);
  coordsEl.classList.remove('hidden');

  // Auto-save badge
  if (autoSave && savedBadge) {
    savedBadge.classList.remove('hidden');
    showToast('📍 Lokasi tersimpan');
  }
}

// ---- OWNER: Hapus pin lokasi ----
function clearFlockLocation() {
  _flockMapLat = null;
  _flockMapLng = null;
  if (_flockMarker && _flockMap) { _flockMap.removeLayer(_flockMarker); _flockMarker = null; }
  document.getElementById('map-coords-display').classList.add('hidden');
  const badge = document.getElementById('map-saved-badge');
  if (badge) badge.classList.add('hidden');
}

// ---- OWNER: Gunakan GPS browser → pin di peta ----
function useMyLocationMap() {
  if (!navigator.geolocation) { showToast('⚠️ Browser tidak mendukung GPS'); return; }
  showToast('Mengambil lokasi GPS...');
  navigator.geolocation.getCurrentPosition(
    pos => {
      const { latitude, longitude } = pos.coords;
      setFlockMapLocation(latitude, longitude, true); // auto-save
      showToast('📍 Lokasi GPS tersimpan');
    },
    err => {
      const msg = {
        1: 'Izin lokasi ditolak. Aktifkan di pengaturan browser.',
        2: 'Lokasi tidak tersedia.',
        3: 'Waktu habis saat mengambil lokasi.'
      }[err.code] || 'Gagal mengambil lokasi.';
      showToast('⚠️ ' + msg);
    },
    { enableHighAccuracy: true, timeout: 10000 }
  );
}

// ---- OPERATOR: Input koordinat manual berubah ----
function onManualCoordsChange() {
  const lat = parseFloat(document.getElementById('manual-lat').value);
  const lng = parseFloat(document.getElementById('manual-lng').value);
  const statusEl = document.getElementById('manual-coords-status');
  const mapsBtn  = document.getElementById('btn-open-maps');

  if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
    statusEl.innerHTML =
      '<span class="material-icons-round" style="font-size:14px">check_circle</span>' +
      'Koordinat valid: ' + lat.toFixed(5) + ', ' + lng.toFixed(5);
    statusEl.style.background = 'rgba(16,185,129,.08)';
    statusEl.style.borderColor = 'rgba(16,185,129,.25)';
    statusEl.style.color = 'var(--success)';
    statusEl.classList.remove('hidden');
    mapsBtn.style.display = '';
  } else if (document.getElementById('manual-lat').value || document.getElementById('manual-lng').value) {
    statusEl.innerHTML =
      '<span class="material-icons-round" style="font-size:14px">error_outline</span>' +
      'Koordinat tidak valid';
    statusEl.style.background = 'rgba(239,68,68,.08)';
    statusEl.style.borderColor = 'rgba(239,68,68,.25)';
    statusEl.style.color = 'var(--error)';
    statusEl.classList.remove('hidden');
    mapsBtn.style.display = 'none';
  } else {
    statusEl.classList.add('hidden');
    mapsBtn.style.display = 'none';
  }
}

// ---- OPERATOR: Gunakan GPS browser → isi input manual ----
function useMyLocationManual() {
  if (!navigator.geolocation) { showToast('⚠️ Browser tidak mendukung GPS'); return; }
  showToast('Mengambil lokasi GPS...');
  navigator.geolocation.getCurrentPosition(
    pos => {
      document.getElementById('manual-lat').value = pos.coords.latitude.toFixed(6);
      document.getElementById('manual-lng').value = pos.coords.longitude.toFixed(6);
      onManualCoordsChange();
      showToast('Lokasi GPS berhasil diambil');
    },
    err => {
      const msg = {
        1: 'Izin lokasi ditolak. Aktifkan di pengaturan browser.',
        2: 'Lokasi tidak tersedia.',
        3: 'Waktu habis saat mengambil lokasi.'
      }[err.code] || 'Gagal mengambil lokasi.';
      showToast('⚠️ ' + msg);
    },
    { enableHighAccuracy: true, timeout: 10000 }
  );
}

// ---- OPERATOR: Buka koordinat di Google Maps ----
function openInMaps() {
  const lat = parseFloat(document.getElementById('manual-lat').value);
  const lng = parseFloat(document.getElementById('manual-lng').value);
  if (isNaN(lat) || isNaN(lng)) { showToast('⚠️ Koordinat belum diisi'); return; }
  window.open('https://www.google.com/maps?q=' + lat + ',' + lng, '_blank');
}

// ---- Buka lokasi flock di Google Maps (dari flock card) ----
function openFlockInMaps(lat, lng, name) {
  const label = encodeURIComponent(name || 'Kandang');
  window.open('https://www.google.com/maps?q=' + lat + ',' + lng + '&label=' + label, '_blank');
}

// ---- Edit Kandang ----
function editFlock(flockId) {
  if (!AUTH.can('kandang.edit')) {
    showToast('⚠️ Tidak punya izin untuk edit kandang');
    return;
  }
  
  const flock = DB.flocks.find(f => (f._dbId || f.id) === flockId);
  if (!flock) {
    showToast('⚠️ Kandang tidak ditemukan');
    return;
  }
  
  // TODO: Implementasi modal edit kandang
  // Untuk sementara, tampilkan alert
  showToast('🚧 Fitur edit kandang akan segera hadir');
}

// ---- Hapus Kandang (Hanya Owner) ----
async function deleteFlock(flockId, flockName) {
  // Double check: hanya owner yang bisa hapus
  if (AUTH.role !== 'owner') {
    showToast('⚠️ Hanya Owner yang bisa menghapus kandang');
    return;
  }
  
  const flock = DB.flocks.find(f => (f._dbId || f.id) === flockId);
  if (!flock) {
    showToast('⚠️ Kandang tidak ditemukan');
    return;
  }
  
  // Konfirmasi dengan peringatan keras
  const confirmed = confirm(
    '⚠️ PERINGATAN: HAPUS KANDANG\n\n' +
    'Anda akan menghapus kandang: ' + flockName + '\n\n' +
    'SEMUA DATA TERKAIT AKAN DIHAPUS:\n' +
    '• Laporan harian\n' +
    '• Target periode\n' +
    '• Jadwal obat/vaksin\n' +
    '• Pengiriman\n' +
    '• Biaya produksi\n\n' +
    'Tindakan ini TIDAK BISA DIBATALKAN!\n\n' +
    'Ketik nama kandang untuk konfirmasi.'
  );
  
  if (!confirmed) return;
  
  // Minta konfirmasi kedua dengan input nama kandang
  const inputName = prompt('Ketik nama kandang "' + flockName + '" untuk konfirmasi penghapusan:');
  if (inputName !== flockName) {
    showToast('❌ Nama kandang tidak cocok. Penghapusan dibatalkan.');
    return;
  }
  
  // Proses penghapusan
  showToast('⏳ Menghapus kandang...');
  
  try {
    // Hapus dari Supabase jika ada _dbId
    if (flock._dbId && window._sbClient) {
      const { error } = await window._sbClient
        .from('kandangs')
        .delete()
        .eq('id', flock._dbId);
      
      if (error) throw error;
    }
    
    // Hapus dari local DB
    const index = DB.flocks.findIndex(f => (f._dbId || f.id) === flockId);
    if (index !== -1) {
      DB.flocks.splice(index, 1);
    }
    
    // Hapus log terkait
    DB.dailyLogs = DB.dailyLogs.filter(log => log._kandangId !== flockId);
    
    saveDB();
    showToast('✓ Kandang "' + flockName + '" berhasil dihapus');
    renderFlock();
    
  } catch (error) {
    console.error('[deleteFlock] Error:', error);
    showToast('❌ Gagal menghapus kandang: ' + error.message);
  }
}


// ===== TS VISITS MANAGEMENT =====
let currentVisitsTab = 'upcoming';
let allVisits = [];

async function loadVisits() {
  try {
    allVisits = await TSVisits.getAll();
    return allVisits;
  } catch (e) {
    console.error('[APP] loadVisits error:', e.message);
    return [];
  }
}

async function renderVisits() {
  await loadVisits();
  
  // Update counters
  const today = new Date().toISOString().split('T')[0];
  const todayVisits = allVisits.filter(v => v.tanggal_kunjungan === today && v.status !== 'cancelled');
  const upcomingVisits = allVisits.filter(v => v.tanggal_kunjungan >= today && v.status === 'scheduled');
  
  document.getElementById('visits-today-count').textContent = todayVisits.length;
  document.getElementById('visits-upcoming-count').textContent = upcomingVisits.length;
  
  // Render list
  renderVisitsList();
}

function renderVisitsList() {
  const list = document.getElementById('visits-list');
  if (!list) return;
  
  let filtered = [];
  const today = new Date().toISOString().split('T')[0];
  
  if (currentVisitsTab === 'upcoming') {
    filtered = allVisits.filter(v => v.tanggal_kunjungan >= today && v.status !== 'cancelled' && v.status !== 'completed');
  } else if (currentVisitsTab === 'completed') {
    filtered = allVisits.filter(v => v.status === 'completed');
  } else {
    filtered = allVisits;
  }
  
  // Sort by date
  filtered.sort((a, b) => {
    const dateA = new Date(a.tanggal_kunjungan + ' ' + (a.waktu_mulai || '00:00'));
    const dateB = new Date(b.tanggal_kunjungan + ' ' + (b.waktu_mulai || '00:00'));
    return dateA - dateB;
  });
  
  if (filtered.length === 0) {
    list.innerHTML = '<div class="empty-state">' +
      '<span class="material-icons-round" style="font-size:48px;color:var(--hint)">event_busy</span>' +
      '<p class="body-medium secondary-text">Belum ada jadwal kunjungan</p>' +
      '</div>';
    return;
  }
  
  list.innerHTML = filtered.map(visit => {
    const date = new Date(visit.tanggal_kunjungan);
    const dateStr = date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
    const timeStr = visit.waktu_mulai ? visit.waktu_mulai.substring(0, 5) : '-';
    const kandangName = visit.kandang ? (visit.kandang.name || visit.kandang.nama) : 'Kandang tidak ditemukan';
    const statusColor = TSVisits.getStatusColor(visit.status);
    const statusLabel = TSVisits.formatStatus(visit.status);
    const tujuanIcon = TSVisits.getTujuanIcon(visit.tujuan);
    const tujuanLabel = TSVisits.formatTujuan(visit.tujuan);
    
    return '<div class="visit-card" onclick="showVisitDetail(\'' + visit.id + '\')">' +
      '<div class="visit-card-header">' +
        '<div class="visit-icon" style="background:' + statusColor + '15">' +
          '<span style="font-size:24px">' + tujuanIcon + '</span>' +
        '</div>' +
        '<div class="visit-info">' +
          '<div class="visit-kandang">' + kandangName + '</div>' +
          '<div class="visit-tujuan">' + tujuanLabel + '</div>' +
        '</div>' +
        '<span class="visit-status-badge" style="background:' + statusColor + '15;color:' + statusColor + '">' +
          statusLabel +
        '</span>' +
      '</div>' +
      '<div class="visit-card-body">' +
        '<div class="visit-datetime">' +
          '<span class="material-icons-round" style="font-size:16px;color:var(--secondary-text)">event</span>' +
          '<span>' + dateStr + '</span>' +
          '<span class="material-icons-round" style="font-size:16px;color:var(--secondary-text);margin-left:12px">schedule</span>' +
          '<span>' + timeStr + '</span>' +
        '</div>' +
        (visit.catatan_sebelum ? '<div class="visit-notes">' + visit.catatan_sebelum.substring(0, 80) + (visit.catatan_sebelum.length > 80 ? '...' : '') + '</div>' : '') +
      '</div>' +
      '</div>';
  }).join('');
}

function switchVisitsTab(tab, btn) {
  currentVisitsTab = tab;
  document.querySelectorAll('#page-visits .tab-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderVisitsList();
}

function filterVisits() {
  showToast('Filter akan segera tersedia');
}

async function showAddVisitModal() {
  // Load kandang list
  const kandangs = await loadKandangsForSelect();
  const select = document.getElementById('visit-kandang');
  if (select) {
    select.innerHTML = '<option value="">Pilih kandang...</option>' +
      kandangs.map(k => '<option value="' + k.id + '">' + (k.name || k.nama || k.id) + '</option>').join('');
  }
  
  // Reset form
  document.getElementById('visit-id').value = '';
  document.getElementById('visit-kandang').value = '';
  document.getElementById('visit-tanggal').value = new Date().toISOString().split('T')[0];
  document.getElementById('visit-waktu').value = '09:00';
  document.getElementById('visit-tujuan').value = 'rutin';
  document.getElementById('visit-catatan').value = '';
  document.getElementById('modal-visit-title').textContent = 'Jadwalkan Kunjungan';
  
  // Show modal
  document.getElementById('modal-visit').classList.remove('hidden');
}

async function saveVisit() {
  const visitId = document.getElementById('visit-id').value;
  const kandangId = document.getElementById('visit-kandang').value;
  const tanggal = document.getElementById('visit-tanggal').value;
  const waktu = document.getElementById('visit-waktu').value;
  const tujuan = document.getElementById('visit-tujuan').value;
  const catatan = document.getElementById('visit-catatan').value;
  
  // Validation
  if (!kandangId) {
    showToast('⚠️ Pilih kandang terlebih dahulu');
    return;
  }
  if (!tanggal) {
    showToast('⚠️ Tanggal kunjungan wajib diisi');
    return;
  }
  
  // Check if date is in the past
  const selectedDate = new Date(tanggal);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (selectedDate < today) {
    const confirm = window.confirm('Tanggal kunjungan sudah lewat. Lanjutkan?');
    if (!confirm) return;
  }
  
  const visitData = {
    kandang_id: kandangId,
    tanggal_kunjungan: tanggal,
    waktu_mulai: waktu || null,
    tujuan: tujuan,
    catatan_sebelum: catatan || null,
    checklist_items: [
      { item: 'Cek kondisi kandang', checked: false },
      { item: 'Cek kesehatan ayam', checked: false },
      { item: 'Review target pakan', checked: false },
      { item: 'Cek suhu dan ventilasi', checked: false }
    ]
  };
  
  let result;
  if (visitId) {
    // Update existing
    result = await TSVisits.update(visitId, visitData);
  } else {
    // Create new
    result = await TSVisits.create(visitData);
  }
  
  if (result.success) {
    showToast(visitId ? 'Kunjungan berhasil diperbarui' : 'Kunjungan berhasil dijadwalkan');
    closeModal('modal-visit');
    await renderVisits();
  } else {
    showToast('⚠️ ' + result.error);
  }
}

async function showVisitDetail(visitId) {
  const visit = await TSVisits.getById(visitId);
  if (!visit) {
    showToast('⚠️ Kunjungan tidak ditemukan');
    return;
  }
  
  const date = new Date(visit.tanggal_kunjungan);
  const dateStr = date.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  const timeStr = visit.waktu_mulai ? visit.waktu_mulai.substring(0, 5) : '-';
  const kandangName = visit.kandang ? (visit.kandang.name || visit.kandang.nama || '-') : 'Kandang tidak ditemukan';
  const statusColor = TSVisits.getStatusColor(visit.status);
  const statusLabel = TSVisits.formatStatus(visit.status);
  const tujuanLabel = TSVisits.formatTujuan(visit.tujuan);
  const tsName = visit.ts_user ? visit.ts_user.nama : AUTH.userName;
  
  // Build checklist HTML
  let checklistHtml = '';
  if (visit.checklist_items && visit.checklist_items.length > 0) {
    checklistHtml = '<div class="visit-detail-section">' +
      '<div class="visit-detail-label">Checklist</div>' +
      '<div class="checklist-container">' +
      visit.checklist_items.map(item => {
        return '<div class="checklist-item">' +
          '<input type="checkbox" ' + (item.checked ? 'checked' : '') + ' disabled />' +
          '<label>' + item.item + '</label>' +
          '</div>';
      }).join('') +
      '</div></div>';
  }
  
  const content = document.getElementById('visit-detail-content');
  content.innerHTML = '<div class="visit-detail-header">' +
    '<div class="visit-detail-status" style="background:' + statusColor + '15;color:' + statusColor + '">' +
      statusLabel +
    '</div>' +
    '</div>' +
    '<div class="visit-detail-section">' +
      '<div class="visit-detail-label">Kandang</div>' +
      '<div class="visit-detail-value">' + kandangName + '</div>' +
    '</div>' +
    '<div class="visit-detail-section">' +
      '<div class="visit-detail-label">Technical Service</div>' +
      '<div class="visit-detail-value">' + tsName + '</div>' +
    '</div>' +
    '<div class="visit-detail-section">' +
      '<div class="visit-detail-label">Tanggal & Waktu</div>' +
      '<div class="visit-detail-value">' + dateStr + ' • ' + timeStr + '</div>' +
    '</div>' +
    '<div class="visit-detail-section">' +
      '<div class="visit-detail-label">Tujuan</div>' +
      '<div class="visit-detail-value">' + tujuanLabel + '</div>' +
    '</div>' +
    (visit.catatan_sebelum ? '<div class="visit-detail-section">' +
      '<div class="visit-detail-label">Catatan / Rencana</div>' +
      '<div class="visit-detail-value">' + visit.catatan_sebelum + '</div>' +
    '</div>' : '') +
    checklistHtml +
    (visit.catatan_sesudah ? '<div class="visit-detail-section">' +
      '<div class="visit-detail-label">Catatan Kunjungan</div>' +
      '<div class="visit-detail-value">' + visit.catatan_sesudah + '</div>' +
    '</div>' : '') +
    (visit.findings ? '<div class="visit-detail-section">' +
      '<div class="visit-detail-label">Temuan</div>' +
      '<div class="visit-detail-value">' + visit.findings + '</div>' +
    '</div>' : '') +
    (visit.recommendations ? '<div class="visit-detail-section">' +
      '<div class="visit-detail-label">Rekomendasi</div>' +
      '<div class="visit-detail-value">' + visit.recommendations + '</div>' +
    '</div>' : '');
  
  // Build actions
  const actions = document.getElementById('visit-detail-actions');
  let actionsHtml = '<button class="btn btn-outline" onclick="closeModal(\'modal-visit-detail\')">Tutup</button>';
  
  if (visit.status === 'scheduled' && AUTH.can('visit.edit')) {
    actionsHtml += '<button class="btn btn-secondary" onclick="startVisit(\'' + visit.id + '\')">'+
      '<span class="material-icons-round">play_arrow</span>Mulai Kunjungan</button>';
  }
  
  if (visit.status === 'in_progress' && AUTH.can('visit.complete')) {
    actionsHtml += '<button class="btn btn-primary" onclick="showCompleteVisitModal(\'' + visit.id + '\')">'+
      '<span class="material-icons-round">check_circle</span>Selesaikan</button>';
  }
  
  if ((visit.status === 'scheduled' || visit.status === 'in_progress') && AUTH.can('visit.edit')) {
    actionsHtml += '<button class="btn btn-ghost" onclick="editVisit(\'' + visit.id + '\')">'+
      '<span class="material-icons-round">edit</span>Edit</button>';
  }
  
  if (AUTH.can('visit.delete')) {
    actionsHtml += '<button class="btn btn-ghost" style="color:var(--error)" onclick="deleteVisit(\'' + visit.id + '\')">'+
      '<span class="material-icons-round">delete</span>Hapus</button>';
  }
  
  actions.innerHTML = actionsHtml;
  
  // Show modal
  document.getElementById('modal-visit-detail').classList.remove('hidden');
}

async function startVisit(visitId) {
  const result = await TSVisits.startVisit(visitId);
  if (result.success) {
    showToast('Kunjungan dimulai');
    closeModal('modal-visit-detail');
    await renderVisits();
  } else {
    showToast('⚠️ ' + result.error);
  }
}

async function showCompleteVisitModal(visitId) {
  const visit = await TSVisits.getById(visitId);
  if (!visit) {
    showToast('⚠️ Kunjungan tidak ditemukan');
    return;
  }
  
  document.getElementById('complete-visit-id').value = visitId;
  
  // Populate checklist
  const container = document.getElementById('complete-checklist-container');
  if (visit.checklist_items && visit.checklist_items.length > 0) {
    container.innerHTML = visit.checklist_items.map((item, index) => {
      return '<div class="checklist-item">' +
        '<input type="checkbox" id="complete-check-' + index + '" ' + (item.checked ? 'checked' : '') + ' />' +
        '<label for="complete-check-' + index + '">' + item.item + '</label>' +
        '</div>';
    }).join('');
  }
  
  // Reset form
  document.getElementById('complete-catatan').value = '';
  document.getElementById('complete-findings').value = '';
  document.getElementById('complete-recommendations').value = '';
  
  // Close detail modal and show complete modal
  closeModal('modal-visit-detail');
  document.getElementById('modal-complete-visit').classList.remove('hidden');
}

async function submitCompleteVisit() {
  const visitId = document.getElementById('complete-visit-id').value;
  const catatan = document.getElementById('complete-catatan').value;
  const findings = document.getElementById('complete-findings').value;
  const recommendations = document.getElementById('complete-recommendations').value;
  
  // Get checklist
  const visit = await TSVisits.getById(visitId);
  const checklist = visit.checklist_items.map((item, index) => {
    const checkbox = document.getElementById('complete-check-' + index);
    return {
      item: item.item,
      checked: checkbox ? checkbox.checked : false
    };
  });
  
  const completionData = {
    catatan_sesudah: catatan || null,
    findings: findings || null,
    recommendations: recommendations || null,
    checklist_items: checklist
  };
  
  const result = await TSVisits.completeVisit(visitId, completionData);
  if (result.success) {
    showToast('Kunjungan berhasil diselesaikan');
    closeModal('modal-complete-visit');
    await renderVisits();
  } else {
    showToast('⚠️ ' + result.error);
  }
}

async function editVisit(visitId) {
  const visit = await TSVisits.getById(visitId);
  if (!visit) {
    showToast('⚠️ Kunjungan tidak ditemukan');
    return;
  }
  
  // Load kandang list
  const kandangs = await loadKandangsForSelect();
  const select = document.getElementById('visit-kandang');
  if (select) {
    select.innerHTML = '<option value="">Pilih kandang...</option>' +
      kandangs.map(k => '<option value="' + k.id + '">' + (k.name || k.nama || k.id) + '</option>').join('');
  }
  
  // Populate form
  document.getElementById('visit-id').value = visitId;
  document.getElementById('visit-kandang').value = visit.kandang_id;
  document.getElementById('visit-tanggal').value = visit.tanggal_kunjungan;
  document.getElementById('visit-waktu').value = visit.waktu_mulai || '09:00';
  document.getElementById('visit-tujuan').value = visit.tujuan;
  document.getElementById('visit-catatan').value = visit.catatan_sebelum || '';
  document.getElementById('modal-visit-title').textContent = 'Edit Kunjungan';
  
  // Close detail modal and show edit modal
  closeModal('modal-visit-detail');
  document.getElementById('modal-visit').classList.remove('hidden');
}

async function deleteVisit(visitId) {
  const confirmed = confirm('Hapus jadwal kunjungan ini?');
  if (!confirmed) return;
  
  const result = await TSVisits.delete(visitId);
  if (result.success) {
    showToast('Kunjungan berhasil dihapus');
    closeModal('modal-visit-detail');
    await renderVisits();
  } else {
    showToast('⚠️ ' + result.error);
  }
}

async function loadKandangsForSelect() {
  try {
    const client = AUTH.getSupabase();
    if (!client) return [];

    // Gunakan DB.flocks yang sudah dimuat jika tersedia
    if (DB.flocks && DB.flocks.length > 0) {
      return DB.flocks.map(f => ({ id: f._dbId || f.id, name: f.name || f.nama || f.id }));
    }

    const { data, error } = await client
      .from('kandangs')
      .select('id, name')
      .order('name');

    if (error) throw error;
    return data || [];
  } catch (e) {
    console.error('[APP] loadKandangsForSelect error:', e.message);
    return [];
  }
}

function addChecklistItem() {
  showToast('Fitur tambah checklist item akan segera tersedia');
}

// Simpan referensi ke navigateTo asli — dipakai oleh patch tunggal di akhir file
const originalNavigateTo = navigateTo;

// ============================================================
// ===== PERIOD TARGETS (Sprint 3) =====
// ============================================================
let _currentTargetsTab = 'pakan';
let _currentTargetDetail = null;  // target yang sedang dilihat di modal detail

// ── Render halaman targets ────────────────────────────────────────────────────
async function renderTargets() {
  const list = document.getElementById('targets-list');
  if (!list) return;

  list.innerHTML = '<div style="text-align:center;padding:24px;color:var(--hint)"><span class="material-icons-round spin">refresh</span></div>';

  try {
    const targets = await PeriodTargets.getAll();

    // Filter by tab
    const filtered = targets.filter(t => t.target_type === _currentTargetsTab);

    // Update stat counters
    const totalEl   = document.getElementById('targets-total-count');
    const kandangEl = document.getElementById('targets-kandang-count');
    if (totalEl)   totalEl.textContent   = targets.length;
    if (kandangEl) kandangEl.textContent = new Set(targets.map(t => t.kandang_id)).size;

    // Sembunyikan tombol tambah jika tidak punya permission
    const btnWrap = document.getElementById('btn-add-target-wrap');
    const canCreate = AUTH.can('target.create') || ['ts','owner','manager'].includes(AUTH.role);
    if (btnWrap) btnWrap.style.display = canCreate ? '' : 'none';

    if (!filtered.length) {
      list.innerHTML = `
        <div class="empty-state">
          <span class="material-icons-round" style="font-size:48px;color:var(--hint)">flag</span>
          <p class="body-medium secondary-text">Belum ada ${PeriodTargets.formatType(_currentTargetsTab)}</p>
          ${AUTH.can('target.create') ? '<p class="body-small secondary-text">Klik "Buat Target Baru" untuk mulai</p>' : ''}
        </div>`;
      return;
    }

    list.innerHTML = filtered.map(t => _buildTargetCard(t)).join('');
  } catch (e) {
    list.innerHTML = '<div style="text-align:center;padding:24px;color:var(--error)">Gagal memuat target</div>';
    console.error('[APP] renderTargets error:', e.message);
  }
}

function _buildTargetCard(t) {
  const icon  = PeriodTargets.getTypeIcon(t.target_type);
  const color = PeriodTargets.getTypeColor(t.target_type);
  const label = PeriodTargets.formatType(t.target_type);
  const unit  = PeriodTargets.formatTypeUnit(t.target_type);
  const kandangName = t.kandang?.name || t.kandang_id;
  const days  = Array.isArray(t.target_values) ? t.target_values.length : 0;
  const mulai = t.periode_mulai ? new Date(t.periode_mulai).toLocaleDateString('id-ID', { day:'numeric', month:'short', year:'numeric' }) : '-';
  const selesai = t.periode_selesai ? new Date(t.periode_selesai).toLocaleDateString('id-ID', { day:'numeric', month:'short', year:'numeric' }) : '-';

  return `
    <div class="target-card" onclick="showTargetDetail('${t.id}')">
      <div class="target-card-header">
        <div class="target-card-icon" style="background:${color}20">
          <span class="material-icons-round" style="color:${color}">${icon}</span>
        </div>
        <div class="target-card-info">
          <div class="target-card-name">${t.nama_target || label + ' — ' + kandangName}</div>
          <div class="target-card-sub">${kandangName} &bull; ${t.breed || 'Cobb 500'}</div>
        </div>
        <span class="target-type-badge ${t.target_type}">${label}</span>
      </div>
      <div class="target-card-meta">
        <div class="target-meta-item">
          <span class="material-icons-round">calendar_today</span>
          ${mulai} – ${selesai}
        </div>
        <div class="target-meta-item">
          <span class="material-icons-round">format_list_numbered</span>
          ${days} hari
        </div>
        <div class="target-meta-item">
          <span class="material-icons-round">straighten</span>
          ${unit}
        </div>
      </div>
    </div>`;
}

function switchTargetsTab(tab, btn) {
  _currentTargetsTab = tab;
  document.querySelectorAll('#page-targets .tab-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderTargets();
}

async function refreshTargets() {
  await renderTargets();
  showToast('Data target diperbarui');
}

// ── Modal: Buat / Edit Target ─────────────────────────────────────────────────
async function showAddTargetModal() {
  // Reset form
  document.getElementById('target-edit-id').value    = '';
  document.getElementById('target-nama').value       = '';
  document.getElementById('target-catatan').value    = '';
  document.getElementById('target-hari-mulai').value = '1';
  document.getElementById('target-periode-mulai').value   = new Date().toISOString().split('T')[0];
  document.getElementById('target-periode-selesai').value = '';
  document.getElementById('target-breed').value      = 'Cobb 500';
  document.getElementById('modal-target-title').textContent = 'Buat Target Baru';

  // Set default type sesuai tab aktif
  selectTargetType(_currentTargetsTab, document.querySelector(`.target-type-btn[data-type="${_currentTargetsTab}"]`));

  // Isi dropdown kandang
  await _populateKandangSelect('target-kandang');

  // Reset values grid
  document.getElementById('target-values-grid').innerHTML =
    '<p style="color:var(--hint);font-size:13px">Pilih kandang, tipe, dan periode terlebih dahulu</p>';

  document.getElementById('modal-target').classList.remove('hidden');
}

async function editTarget(targetId) {
  const client = AUTH.getSupabase();
  if (!client) return;

  const { data: t, error } = await client
    .from('period_targets').select('*').eq('id', targetId).single();
  if (error || !t) { showToast('⚠️ Gagal memuat target'); return; }

  document.getElementById('target-edit-id').value          = t.id;
  document.getElementById('target-nama').value             = t.nama_target || '';
  document.getElementById('target-catatan').value          = t.catatan || '';
  document.getElementById('target-hari-mulai').value       = t.hari_mulai || 1;
  document.getElementById('target-periode-mulai').value    = t.periode_mulai || '';
  document.getElementById('target-periode-selesai').value  = t.periode_selesai || '';
  document.getElementById('target-breed').value            = t.breed || 'Cobb 500';
  document.getElementById('modal-target-title').textContent = 'Edit Target';

  selectTargetType(t.target_type, document.querySelector(`.target-type-btn[data-type="${t.target_type}"]`));

  await _populateKandangSelect('target-kandang', t.kandang_id);

  // Render values grid dengan data existing
  _renderValuesGrid(t.target_values || [], t.target_type);

  document.getElementById('modal-target').classList.remove('hidden');
}

function selectTargetType(type, btn) {
  document.querySelectorAll('.target-type-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  // Re-render grid jika periode sudah diisi
  const mulai   = document.getElementById('target-periode-mulai')?.value;
  const selesai = document.getElementById('target-periode-selesai')?.value;
  if (mulai && selesai) onPeriodeChange();
}

function onTargetKandangChange() {
  // Bisa dipakai untuk auto-fill hari mulai dari kandang aktif
}

function onBreedChange() {
  // Re-fill dari template jika user ganti breed
  const mulai   = document.getElementById('target-periode-mulai')?.value;
  const selesai = document.getElementById('target-periode-selesai')?.value;
  if (mulai && selesai) fillFromTemplate();
}

function onPeriodeChange() {
  const mulai   = document.getElementById('target-periode-mulai')?.value;
  const selesai = document.getElementById('target-periode-selesai')?.value;
  const hariMulai = parseInt(document.getElementById('target-hari-mulai')?.value) || 1;
  if (!mulai || !selesai) return;

  const days = Math.round((new Date(selesai) - new Date(mulai)) / 86400000) + 1;
  if (days <= 0 || days > 60) return;

  // Buat array kosong sesuai jumlah hari
  const values = [];
  for (let i = 0; i < days; i++) {
    values.push({ hari: hariMulai + i, nilai: 0 });
  }

  const type = document.querySelector('.target-type-btn.active')?.dataset.type || 'pakan';
  _renderValuesGrid(values, type);
}

function fillFromTemplate() {
  const breed     = document.getElementById('target-breed')?.value || 'Cobb 500';
  const mulai     = document.getElementById('target-periode-mulai')?.value;
  const selesai   = document.getElementById('target-periode-selesai')?.value;
  const hariMulai = parseInt(document.getElementById('target-hari-mulai')?.value) || 1;
  const type      = document.querySelector('.target-type-btn.active')?.dataset.type || 'pakan';

  if (!mulai || !selesai) { showToast('⚠️ Isi periode terlebih dahulu'); return; }
  if (breed === 'custom') { showToast('Template tidak tersedia untuk breed custom'); return; }

  const days = Math.round((new Date(selesai) - new Date(mulai)) / 86400000) + 1;
  const hariSelesai = hariMulai + days - 1;
  const values = PeriodTargets.generateFromTemplate(breed, type, hariMulai, hariSelesai);
  _renderValuesGrid(values, type);
  showToast(`Template ${breed} diterapkan`);
}

function _renderValuesGrid(values, type) {
  const grid = document.getElementById('target-values-grid');
  if (!grid) return;
  const unit = PeriodTargets.formatTypeUnit(type);
  grid.innerHTML = values.map((v, i) =>
    `<div class="target-value-cell">
      <label>H-${v.hari}</label>
      <input type="number" min="0" step="${type === 'fcr' ? '0.01' : '1'}"
             value="${v.nilai || ''}" placeholder="0"
             data-hari="${v.hari}" title="${unit}" />
    </div>`
  ).join('');
}

function _readValuesFromGrid() {
  const inputs = document.querySelectorAll('#target-values-grid input');
  return Array.from(inputs).map(inp => ({
    hari:  parseInt(inp.dataset.hari),
    nilai: parseFloat(inp.value) || 0
  }));
}

async function saveTarget() {
  const editId    = document.getElementById('target-edit-id').value;
  const kandangId = document.getElementById('target-kandang').value;
  const type      = document.querySelector('.target-type-btn.active')?.dataset.type;
  const mulai     = document.getElementById('target-periode-mulai').value;
  const selesai   = document.getElementById('target-periode-selesai').value;
  const hariMulai = parseInt(document.getElementById('target-hari-mulai').value) || 1;
  const breed     = document.getElementById('target-breed').value;
  const nama      = document.getElementById('target-nama').value.trim();
  const catatan   = document.getElementById('target-catatan').value.trim();

  // Validasi
  if (!kandangId) { showToast('⚠️ Pilih kandang terlebih dahulu'); return; }
  if (!type)      { showToast('⚠️ Pilih tipe target'); return; }
  if (!mulai)     { showToast('⚠️ Isi tanggal mulai'); return; }
  if (!selesai)   { showToast('⚠️ Isi tanggal selesai'); return; }
  if (new Date(selesai) <= new Date(mulai)) { showToast('⚠️ Tanggal selesai harus setelah tanggal mulai'); return; }

  const values = _readValuesFromGrid();
  if (!values.length) { showToast('⚠️ Isi nilai target terlebih dahulu'); return; }

  const payload = {
    kandang_id: kandangId, target_type: type,
    periode_mulai: mulai, periode_selesai: selesai,
    hari_mulai: hariMulai, breed,
    target_values: values,
    nama_target: nama || null,
    catatan: catatan || null
  };

  let result;
  if (editId) {
    result = await PeriodTargets.update(editId, payload);
  } else {
    result = await PeriodTargets.create(payload);
  }

  if (result.success) {
    showToast(editId ? 'Target berhasil diperbarui' : 'Target berhasil dibuat');
    closeModal('modal-target');
    await renderTargets();
  } else {
    showToast('⚠️ ' + result.error);
  }
}

// ── Modal: Detail Target ──────────────────────────────────────────────────────
async function showTargetDetail(targetId) {
  const client = AUTH.getSupabase();
  if (!client) return;

  const { data: t, error } = await client
    .from('period_targets')
    .select('*, kandang:kandangs(id, name)')
    .eq('id', targetId).single();

  if (error || !t) { showToast('⚠️ Gagal memuat detail target'); return; }

  _currentTargetDetail = t;

  const icon  = PeriodTargets.getTypeIcon(t.target_type);
  const color = PeriodTargets.getTypeColor(t.target_type);
  const label = PeriodTargets.formatType(t.target_type);
  const unit  = PeriodTargets.formatTypeUnit(t.target_type);
  const kandangName = t.kandang?.name || t.kandang_id;
  const mulai   = t.periode_mulai   ? new Date(t.periode_mulai).toLocaleDateString('id-ID',   { day:'numeric', month:'long', year:'numeric' }) : '-';
  const selesai = t.periode_selesai ? new Date(t.periode_selesai).toLocaleDateString('id-ID', { day:'numeric', month:'long', year:'numeric' }) : '-';
  const values  = Array.isArray(t.target_values) ? t.target_values : [];

  // Hitung min/max/avg
  const nums = values.map(v => v.nilai).filter(n => n > 0);
  const min  = nums.length ? Math.min(...nums) : 0;
  const max  = nums.length ? Math.max(...nums) : 0;
  const avg  = nums.length ? Math.round(nums.reduce((a,b) => a+b, 0) / nums.length) : 0;

  document.getElementById('target-detail-title').textContent = t.nama_target || `${label} — ${kandangName}`;

  document.getElementById('target-detail-body').innerHTML = `
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px">
      <div style="width:44px;height:44px;border-radius:12px;background:${color}20;display:flex;align-items:center;justify-content:center">
        <span class="material-icons-round" style="color:${color}">${icon}</span>
      </div>
      <div>
        <div style="font-weight:600;font-size:15px">${kandangName}</div>
        <div style="font-size:12px;color:var(--secondary-text)">${t.breed || 'Cobb 500'} &bull; ${label}</div>
      </div>
      <span class="target-type-badge ${t.target_type}" style="margin-left:auto">${label}</span>
    </div>

    <div class="kpi-grid" style="margin-bottom:16px">
      <div class="kpi-card" style="--tint:rgba(59,130,246,.1)">
        <div class="kpi-value" style="font-size:18px">${values.length}</div>
        <div class="kpi-label">Hari</div>
      </div>
      <div class="kpi-card" style="--tint:rgba(16,185,129,.1)">
        <div class="kpi-value" style="font-size:18px">${avg}</div>
        <div class="kpi-label">Rata-rata</div>
      </div>
      <div class="kpi-card" style="--tint:rgba(245,158,11,.1)">
        <div class="kpi-value" style="font-size:18px">${min}–${max}</div>
        <div class="kpi-label">Min–Max</div>
      </div>
    </div>

    <div style="display:flex;gap:8px;margin-bottom:16px;flex-wrap:wrap">
      <div style="display:flex;align-items:center;gap:6px;font-size:13px;color:var(--secondary-text)">
        <span class="material-icons-round" style="font-size:16px">calendar_today</span>
        ${mulai} – ${selesai}
      </div>
      <div style="display:flex;align-items:center;gap:6px;font-size:13px;color:var(--secondary-text)">
        <span class="material-icons-round" style="font-size:16px">straighten</span>
        Satuan: ${unit}
      </div>
    </div>

    ${t.catatan ? `<div style="background:var(--surface-variant);border-radius:10px;padding:12px;margin-bottom:16px;font-size:13px;color:var(--secondary-text)">${t.catatan}</div>` : ''}

    <div style="font-size:13px;font-weight:600;margin-bottom:8px">Nilai Target per Hari</div>
    <div class="target-values-grid" style="max-height:200px">
      ${values.map(v => `
        <div class="target-value-cell">
          <label>H-${v.hari}</label>
          <div style="width:100%;padding:6px 4px;text-align:center;background:var(--surface-variant);border-radius:8px;font-size:13px;font-weight:600;color:${color}">${v.nilai}</div>
        </div>`).join('')}
    </div>`;

  // Tampilkan/sembunyikan tombol edit & delete
  const canEdit = AUTH.can('target.edit');
  document.getElementById('btn-edit-target').style.display   = canEdit ? '' : 'none';
  document.getElementById('btn-delete-target').style.display = canEdit ? '' : 'none';

  document.getElementById('modal-target-detail').classList.remove('hidden');
}

function editTargetFromDetail() {
  if (!_currentTargetDetail) return;
  closeModal('modal-target-detail');
  editTarget(_currentTargetDetail.id);
}

async function deleteTargetFromDetail() {
  if (!_currentTargetDetail) return;
  if (!confirm('Hapus target ini? Tindakan ini tidak bisa dibatalkan.')) return;

  const result = await PeriodTargets.delete(_currentTargetDetail.id);
  if (result.success) {
    showToast('Target berhasil dihapus');
    closeModal('modal-target-detail');
    _currentTargetDetail = null;
    await renderTargets();
  } else {
    showToast('⚠️ ' + result.error);
  }
}

// ── Helper: isi dropdown kandang ─────────────────────────────────────────────
async function _populateKandangSelect(selectId, selectedId = null) {
  const sel = document.getElementById(selectId);
  if (!sel) return;

  // Gunakan DB.flocks yang sudah dimuat
  const flocks = DB.flocks.length ? DB.flocks : await (async () => {
    const client = AUTH.getSupabase();
    if (!client) return [];
    const { data } = await client.from('kandangs').select('id, name').order('name');
    return data || [];
  })();

  sel.innerHTML = '<option value="">Pilih kandang...</option>' +
    flocks.map(f => {
      const id   = f._dbId || f.id;
      const name = f.name || f.nama || id;
      const sel  = id === selectedId ? ' selected' : '';
      return `<option value="${id}"${sel}>${name}</option>`;
    }).join('');
}

// (navigateTo sudah di-patch di atas untuk visits & targets)

// ============================================================
// ===== PROGRAM KESEHATAN / MEDICATION (Sprint 4) =====
// ============================================================

let _currentHealthTab    = 'today';
let _currentProgramDetail = null;
let _medItemRows          = [];   // rows di modal buat program

// ── Render halaman health ─────────────────────────────────────────────────────
async function renderHealth() {
  const content = document.getElementById('health-content');
  if (!content) return;

  content.innerHTML = '<div style="text-align:center;padding:24px;color:var(--hint)"><span class="material-icons-round spin">refresh</span></div>';

  // Sembunyikan tombol tambah jika tidak punya permission
  const btnWrap = document.getElementById('btn-add-program-wrap');
  const canCreate = AUTH.can('health.create') || ['ts','owner','manager'].includes(AUTH.role);
  if (btnWrap) btnWrap.style.display = canCreate ? '' : 'none';

  if (_currentHealthTab === 'today') {
    await _renderHealthToday(content);
  } else {
    await _renderHealthPrograms(content);
  }
}

async function _renderHealthToday(container) {
  // Ambil kandang aktif
  const activeFlock = DB.flocks.find(f => f.active);
  if (!activeFlock) {
    container.innerHTML = '<div class="empty-state"><span class="material-icons-round" style="font-size:48px;color:var(--hint)">vaccines</span><p class="body-medium secondary-text">Tidak ada kandang aktif</p></div>';
    return;
  }

  const kandangId = activeFlock._dbId || activeFlock.id;
  const schedule  = await Medication.getTodaySchedule(kandangId);

  // Update counter
  const todayEl = document.getElementById('health-today-count');
  if (todayEl) todayEl.textContent = schedule.length;

  if (!schedule.length) {
    container.innerHTML = `
      <div class="empty-state">
        <span class="material-icons-round" style="font-size:48px;color:var(--hint)">event_available</span>
        <p class="body-medium secondary-text">Tidak ada jadwal obat/vaksin hari ini</p>
        <p class="body-small secondary-text">${activeFlock.name} — Hari ke-${activeFlock.age || getCurrentDay()}</p>
      </div>`;
    return;
  }

  const canInput = AUTH.can('health.log') || AUTH.can('log.create');

  container.innerHTML = `
    <div style="font-size:13px;color:var(--secondary-text);margin-bottom:8px">
      ${activeFlock.name} — Hari ke-${schedule[0]?.hari_ke || getCurrentDay()}
    </div>
    <div class="med-schedule-list">
      ${schedule.map(s => _buildScheduleItem(s, kandangId, canInput)).join('')}
    </div>`;
}

function _buildScheduleItem(s, kandangId, canInput) {
  const typeInfo   = Medication.getTypeInfo(s.medication_type);
  const statusInfo = Medication.getStatusInfo(s.log_status || 'scheduled');
  const isDone     = s.log_status === 'completed' || s.log_status === 'skipped';

  const actionBtn = canInput && !isDone
    ? `<button class="med-action-btn" onclick="openGiveMedModal('${s.item_id}','${kandangId}',${s.hari_ke},'${s.nama_produk}','${s.satuan||''}',${s.dosis||0})">
         <span class="material-icons-round" style="font-size:14px">check</span>Catat
       </button>`
    : `<span class="med-status-badge ${s.log_status || 'scheduled'}">${statusInfo.label}</span>`;

  return `
    <div class="med-schedule-item">
      <div class="med-schedule-icon" style="background:${typeInfo.bg}">
        <span class="material-icons-round" style="color:${typeInfo.color}">${typeInfo.icon}</span>
      </div>
      <div class="med-schedule-info">
        <div class="med-schedule-name">${s.nama_produk}</div>
        <div class="med-schedule-sub">
          ${typeInfo.label}
          ${s.dosis ? ' &bull; ' + s.dosis + ' ' + (s.satuan || '') : ''}
          ${s.cara_pemberian ? ' &bull; ' + s.cara_pemberian : ''}
          &bull; ${s.nama_program}
        </div>
      </div>
      ${actionBtn}
    </div>`;
}

async function _renderHealthPrograms(container) {
  const programs = await Medication.getAllPrograms();

  // Update counter
  const progEl = document.getElementById('health-program-count');
  if (progEl) progEl.textContent = programs.length;

  if (!programs.length) {
    container.innerHTML = `
      <div class="empty-state">
        <span class="material-icons-round" style="font-size:48px;color:var(--hint)">vaccines</span>
        <p class="body-medium secondary-text">Belum ada program kesehatan</p>
        ${AUTH.can('health.create') ? '<p class="body-small secondary-text">Klik "Buat Program Kesehatan" untuk mulai</p>' : ''}
      </div>`;
    return;
  }

  container.innerHTML = programs.map(p => _buildProgramCard(p)).join('');
}

function _buildProgramCard(p) {
  const items     = p.items || [];
  const kandangName = p.kandang?.name || p.kandang_id;
  const typeSet   = [...new Set(items.map(i => i.medication_type))];
  const chips     = typeSet.map(t => {
    const info = Medication.getTypeInfo(t);
    return `<span class="med-type-chip ${t}">${info.label}</span>`;
  }).join('');

  return `
    <div class="program-card" onclick="showProgramDetail('${p.id}')">
      <div class="program-card-header">
        <div class="program-card-icon" style="background:rgba(139,92,246,.12)">
          <span class="material-icons-round" style="color:#8B5CF6">vaccines</span>
        </div>
        <div style="flex:1;min-width:0">
          <div class="program-card-name">${p.nama_program}</div>
          <div class="program-card-sub">${kandangName} &bull; ${items.length} item</div>
        </div>
      </div>
      ${chips ? `<div class="program-item-chips">${chips}</div>` : ''}
    </div>`;
}

function switchHealthTab(tab, btn) {
  _currentHealthTab = tab;
  document.querySelectorAll('#page-health .tab-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderHealth();
}

async function refreshHealth() {
  await renderHealth();
  showToast('Data kesehatan diperbarui');
}

// ── Modal: Buat / Edit Program ────────────────────────────────────────────────
async function showAddProgramModal() {
  document.getElementById('program-edit-id').value  = '';
  document.getElementById('program-nama').value     = '';
  document.getElementById('program-deskripsi').value = '';
  document.getElementById('modal-program-title').textContent = 'Buat Program Kesehatan';
  _medItemRows = [];
  document.getElementById('med-items-list').innerHTML = '';
  await _populateKandangSelect('program-kandang');
  addMedItemRow();  // mulai dengan 1 row kosong
  document.getElementById('modal-program').classList.remove('hidden');
}

async function editProgram(programId) {
  const client = AUTH.getSupabase();
  if (!client) return;
  const { data: p, error } = await client
    .from('medication_programs').select('*').eq('id', programId).single();
  if (error || !p) { showToast('⚠️ Gagal memuat program'); return; }

  document.getElementById('program-edit-id').value   = p.id;
  document.getElementById('program-nama').value      = p.nama_program;
  document.getElementById('program-deskripsi').value = p.deskripsi || '';
  document.getElementById('modal-program-title').textContent = 'Edit Program';

  await _populateKandangSelect('program-kandang', p.kandang_id);

  // Load items
  const items = await Medication.getItemsByProgram(programId);
  _medItemRows = [];
  document.getElementById('med-items-list').innerHTML = '';
  if (items.length) {
    items.forEach(item => addMedItemRow(item));
  } else {
    addMedItemRow();
  }

  document.getElementById('modal-program').classList.remove('hidden');
}

let _medRowCounter = 0;
function addMedItemRow(existingItem = null) {
  const rowId = 'med-row-' + (++_medRowCounter);
  _medItemRows.push(rowId);

  const hari = existingItem
    ? Medication.parseHariPemberian(existingItem.hari_pemberian).join(', ')
    : '';

  const type = existingItem?.medication_type || 'obat';
  const typeInfo = Medication.getTypeInfo(type);

  const typeOptions = Object.entries(Medication.TYPES).map(([k, v]) =>
    `<option value="${k}" ${type === k ? 'selected' : ''}>${v.icon ? '' : ''}${v.label}</option>`
  ).join('');

  const row = document.createElement('div');
  row.className = 'med-item-row';
  row.id = rowId;
  row.dataset.itemId = existingItem?.id || '';
  row.innerHTML = `
    <div class="med-item-row-top">
      <!-- Tipe dengan warna -->
      <div class="med-type-selector">
        <div class="med-type-icon" id="${rowId}-icon"
             style="background:${typeInfo.bg};color:${typeInfo.color}">
          <span class="material-icons-round">${typeInfo.icon}</span>
        </div>
        <select class="form-select" data-field="type"
                onchange="updateMedItemIcon('${rowId}', this.value)"
                style="flex:1;font-size:13px">
          ${typeOptions}
        </select>
      </div>
      <button class="med-item-remove-btn" onclick="removeMedItemRow('${rowId}')" title="Hapus">
        <span class="material-icons-round">delete_outline</span>
      </button>
    </div>

    <!-- Nama produk — paling penting, full width -->
    <div class="auth-field" style="margin-top:10px">
      <label class="auth-label">Nama Produk <span style="color:var(--error)">*</span></label>
      <input type="text" class="form-input full" data-field="nama"
             value="${existingItem?.nama_produk || ''}"
             placeholder="cth: ND Lasota, Vitamin C, Amoxicillin..." />
    </div>

    <!-- Row: dosis + satuan + cara -->
    <div class="med-item-inline-row">
      <div class="auth-field" style="flex:1">
        <label class="auth-label">Dosis</label>
        <input type="number" class="form-input full" data-field="dosis"
               min="0" step="0.1" value="${existingItem?.dosis || ''}" placeholder="0" />
      </div>
      <div class="auth-field" style="flex:1">
        <label class="auth-label">Satuan</label>
        <input type="text" class="form-input full" data-field="satuan"
               value="${existingItem?.satuan || ''}" placeholder="ml / gram / cc" />
      </div>
      <div class="auth-field" style="flex:1.5">
        <label class="auth-label">Cara Pemberian</label>
        <select class="form-select full" data-field="cara">
          ${['air minum','suntik','semprot','pakan','tetes mata'].map(c =>
            `<option ${existingItem?.cara_pemberian === c ? 'selected' : ''}>${c}</option>`
          ).join('')}
        </select>
      </div>
    </div>

    <!-- Hari pemberian dengan chip preview -->
    <div class="auth-field" style="margin-top:8px">
      <label class="auth-label">
        Hari Pemberian
        <span style="color:var(--error)">*</span>
        <span style="color:var(--hint);font-weight:400;font-size:10px;margin-left:4px">pisahkan dengan koma</span>
      </label>
      <div class="med-hari-input-wrap">
        <input type="text" class="med-item-hari-input" data-field="hari"
               value="${hari}" placeholder="cth: 1, 7, 14, 21"
               oninput="updateHariChips('${rowId}', this.value)" />
        <div class="med-hari-chips" id="${rowId}-chips">
          ${hari ? hari.split(',').map(h => h.trim()).filter(Boolean)
              .map(h => `<span class="med-hari-chip">H-${h}</span>`).join('') : ''}
        </div>
      </div>
    </div>`;

  document.getElementById('med-items-list').appendChild(row);
}

// Update icon warna saat tipe berubah
function updateMedItemIcon(rowId, type) {
  const iconEl = document.getElementById(rowId + '-icon');
  if (!iconEl) return;
  const info = Medication.getTypeInfo(type);
  iconEl.style.background = info.bg;
  iconEl.style.color = info.color;
  iconEl.querySelector('.material-icons-round').textContent = info.icon;
}

// Update chip preview hari pemberian
function updateHariChips(rowId, value) {
  const chipsEl = document.getElementById(rowId + '-chips');
  if (!chipsEl) return;
  const hari = value.split(',').map(h => h.trim()).filter(h => h && !isNaN(h));
  chipsEl.innerHTML = hari.map(h => `<span class="med-hari-chip">H-${h}</span>`).join('');
}

function removeMedItemRow(rowId) {
  const el = document.getElementById(rowId);
  if (el) el.remove();
  _medItemRows = _medItemRows.filter(id => id !== rowId);
}

function _readMedItemRows(kandangId) {
  const rows = document.querySelectorAll('.med-item-row');
  const items = [];
  rows.forEach(row => {
    const get = field => row.querySelector(`[data-field="${field}"]`)?.value?.trim() || '';
    const nama = get('nama');
    const hariStr = get('hari');
    if (!nama || !hariStr) return;  // skip baris kosong
    const hari = hariStr.split(',').map(h => parseInt(h.trim())).filter(h => !isNaN(h) && h > 0);
    if (!hari.length) return;
    items.push({
      id:              row.dataset.itemId || null,
      kandang_id:      kandangId,
      medication_type: get('type') || 'obat',
      nama_produk:     nama,
      cara_pemberian:  get('cara') || null,
      dosis:           parseFloat(get('dosis')) || null,
      satuan:          get('satuan') || null,
      hari_pemberian:  hari,
      catatan:         get('catatan') || null
    });
  });
  return items;
}

async function saveProgram() {
  const editId    = document.getElementById('program-edit-id').value;
  const kandangId = document.getElementById('program-kandang').value;
  const nama      = document.getElementById('program-nama').value.trim();
  const deskripsi = document.getElementById('program-deskripsi').value.trim();

  if (!kandangId) { showToast('⚠️ Pilih kandang'); return; }
  if (!nama)      { showToast('⚠️ Nama program wajib diisi'); return; }

  const items = _readMedItemRows(kandangId);
  if (!items.length) { showToast('⚠️ Tambahkan minimal 1 item obat/vaksin'); return; }

  let programId = editId;

  if (editId) {
    // Update program
    const r = await Medication.updateProgram(editId, { nama_program: nama, deskripsi: deskripsi || null });
    if (!r.success) { showToast('⚠️ ' + r.error); return; }
  } else {
    // Create program baru
    const r = await Medication.createProgram({ kandang_id: kandangId, nama_program: nama, deskripsi: deskripsi || null });
    if (!r.success) { showToast('⚠️ ' + r.error); return; }
    programId = r.data.id;
  }

  // Simpan items — hapus yang lama dulu jika edit
  if (editId) {
    const client = AUTH.getSupabase();
    if (client) await client.from('medication_items').delete().eq('program_id', editId);
  }

  for (const item of items) {
    const r = await Medication.createItem({ ...item, program_id: programId });
    if (!r.success) console.warn('[APP] createItem error:', r.error);
  }

  showToast(editId ? 'Program berhasil diperbarui' : 'Program berhasil dibuat');
  closeModal('modal-program');
  await renderHealth();
}

// ── Modal: Detail Program ─────────────────────────────────────────────────────
async function showProgramDetail(programId) {
  const client = AUTH.getSupabase();
  if (!client) return;

  const { data: p, error } = await client
    .from('medication_programs')
    .select('*, kandang:kandangs(id, name)')
    .eq('id', programId).single();
  if (error || !p) { showToast('⚠️ Gagal memuat detail'); return; }

  _currentProgramDetail = p;
  const items = await Medication.getItemsByProgram(programId);
  const stats = await Medication.getComplianceStats(p.kandang_id, programId);
  const kandangName = p.kandang?.name || p.kandang_id;

  document.getElementById('program-detail-title').textContent = p.nama_program;

  const compliance = stats?.compliance_rate || 0;
  document.getElementById('program-detail-body').innerHTML = `
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px">
      <div style="width:44px;height:44px;border-radius:12px;background:rgba(139,92,246,.12);display:flex;align-items:center;justify-content:center">
        <span class="material-icons-round" style="color:#8B5CF6">vaccines</span>
      </div>
      <div>
        <div style="font-weight:600;font-size:15px">${kandangName}</div>
        <div style="font-size:12px;color:var(--secondary-text)">${items.length} item &bull; ${p.deskripsi || 'Tidak ada deskripsi'}</div>
      </div>
    </div>

    ${stats ? `
    <div class="compliance-bar-wrap">
      <div class="compliance-bar-label">
        <span>Kepatuhan Pemberian</span>
        <span style="font-weight:600;color:${compliance >= 80 ? '#10B981' : compliance >= 50 ? '#F59E0B' : '#EF4444'}">${compliance}%</span>
      </div>
      <div class="compliance-bar">
        <div class="compliance-bar-fill" style="width:${compliance}%"></div>
      </div>
      <div style="font-size:11px;color:var(--hint);margin-top:4px">
        ${stats.total_completed} selesai / ${stats.total_scheduled} terjadwal
      </div>
    </div>` : ''}

    <div style="font-size:13px;font-weight:600;margin:16px 0 8px">Daftar Item</div>
    ${items.map(item => {
      const info = Medication.getTypeInfo(item.medication_type);
      const hari = Medication.formatHariPemberian(item.hari_pemberian);
      return `
        <div style="display:flex;align-items:center;gap:10px;padding:10px;background:var(--surface-variant);border-radius:10px;margin-bottom:8px">
          <div style="width:32px;height:32px;border-radius:8px;background:${info.bg};display:flex;align-items:center;justify-content:center;flex-shrink:0">
            <span class="material-icons-round" style="color:${info.color};font-size:16px">${info.icon}</span>
          </div>
          <div style="flex:1;min-width:0">
            <div style="font-size:13px;font-weight:600">${item.nama_produk}</div>
            <div style="font-size:11px;color:var(--secondary-text)">
              ${info.label}
              ${item.dosis ? ' &bull; ' + item.dosis + ' ' + (item.satuan || '') : ''}
              ${item.cara_pemberian ? ' &bull; ' + item.cara_pemberian : ''}
            </div>
            <div style="font-size:11px;color:var(--hint);margin-top:2px">Jadwal: ${hari}</div>
          </div>
        </div>`;
    }).join('')}`;

  const canEdit = AUTH.can('health.edit');
  document.getElementById('btn-edit-program').style.display   = canEdit ? '' : 'none';
  document.getElementById('btn-delete-program').style.display = canEdit ? '' : 'none';

  document.getElementById('modal-program-detail').classList.remove('hidden');
}

function editProgramFromDetail() {
  if (!_currentProgramDetail) return;
  closeModal('modal-program-detail');
  editProgram(_currentProgramDetail.id);
}

async function deleteProgramFromDetail() {
  if (!_currentProgramDetail) return;
  if (!confirm('Hapus program "' + _currentProgramDetail.nama_program + '"?')) return;
  const r = await Medication.deleteProgram(_currentProgramDetail.id);
  if (r.success) {
    showToast('Program berhasil dihapus');
    closeModal('modal-program-detail');
    _currentProgramDetail = null;
    await renderHealth();
  } else {
    showToast('⚠️ ' + r.error);
  }
}

// ── Modal: Catat Pemberian ────────────────────────────────────────────────────
function openGiveMedModal(itemId, kandangId, hariKe, namaProduk, satuan, dosis) {
  document.getElementById('give-item-id').value    = itemId;
  document.getElementById('give-kandang-id').value = kandangId;
  document.getElementById('give-hari-ke').value    = hariKe;
  document.getElementById('give-jumlah').value     = dosis || '';
  document.getElementById('give-catatan').value    = '';
  document.getElementById('give-satuan').textContent = satuan || '';
  document.getElementById('give-med-info').innerHTML = `
    <div style="font-weight:600;font-size:14px">${namaProduk}</div>
    <div style="font-size:12px;color:var(--secondary-text);margin-top:4px">
      Hari ke-${hariKe} &bull; Dosis: ${dosis || '-'} ${satuan || ''}
    </div>`;
  document.getElementById('modal-give-med').classList.remove('hidden');
}

async function markMedCompleted() {
  const itemId    = document.getElementById('give-item-id').value;
  const kandangId = document.getElementById('give-kandang-id').value;
  const hariKe    = parseInt(document.getElementById('give-hari-ke').value);
  const jumlah    = parseFloat(document.getElementById('give-jumlah').value) || null;
  const catatan   = document.getElementById('give-catatan').value.trim();

  const r = await Medication.markCompleted(itemId, kandangId, hariKe, jumlah, catatan || null);
  if (r.success) {
    showToast('✅ Pemberian dicatat');
    closeModal('modal-give-med');
    await renderHealth();
  } else {
    showToast('⚠️ ' + r.error);
  }
}

async function markMedSkipped() {
  const itemId    = document.getElementById('give-item-id').value;
  const kandangId = document.getElementById('give-kandang-id').value;
  const hariKe    = parseInt(document.getElementById('give-hari-ke').value);
  const catatan   = document.getElementById('give-catatan').value.trim();

  const r = await Medication.markSkipped(itemId, kandangId, hariKe, catatan || null);
  if (r.success) {
    showToast('Jadwal dilewati');
    closeModal('modal-give-med');
    await renderHealth();
  } else {
    showToast('⚠️ ' + r.error);
  }
}

// ── (navigateTo di-handle oleh patch tunggal di akhir file) ──────────────────
// Sprint 3 end

// ============================================================
// ===== PENGIRIMAN / DELIVERIES (Sprint 5) =====
// ============================================================

let _currentDeliveryTab    = 'all';
let _currentDeliveryDetail = null;

// ── Render halaman delivery ───────────────────────────────────────────────────
async function renderDelivery() {
  const list = document.getElementById('delivery-list');
  if (!list) return;

  list.innerHTML = '<div style="text-align:center;padding:24px;color:var(--hint)"><span class="material-icons-round spin">refresh</span></div>';

  // Sembunyikan tombol tambah jika tidak punya permission
  const btnWrap = document.getElementById('btn-add-delivery-wrap');
  const canCreate = AUTH.can('delivery.create') || ['staff','owner','manager'].includes(AUTH.role);
  if (btnWrap) btnWrap.style.display = canCreate ? '' : 'none';

  const filters = {};
  if (_currentDeliveryTab !== 'all') filters.status = _currentDeliveryTab;

  const deliveries = await Deliveries.getAll(filters);

  // Update counters
  const allData = await Deliveries.getAll({});
  const pendingEl = document.getElementById('delivery-pending-count');
  const monthEl   = document.getElementById('delivery-month-count');
  if (pendingEl) pendingEl.textContent = allData.filter(d => d.status === 'pending').length;
  if (monthEl) {
    const thisMonth = new Date().toISOString().slice(0, 7);
    monthEl.textContent = allData.filter(d => d.tanggal_kirim?.startsWith(thisMonth)).length;
  }

  if (!deliveries.length) {
    list.innerHTML = `
      <div class="empty-state">
        <span class="material-icons-round" style="font-size:48px;color:var(--hint)">local_shipping</span>
        <p class="body-medium secondary-text">Belum ada data pengiriman</p>
        ${AUTH.can('delivery.create') ? '<p class="body-small secondary-text">Klik "Input Pengiriman Baru" untuk mulai</p>' : ''}
      </div>`;
    return;
  }

  const canSeeCost = AUTH.can('cost.view');
  list.innerHTML = deliveries.map(d => _buildDeliveryCard(d, canSeeCost)).join('');
}

function _buildDeliveryCard(d, canSeeCost) {
  const typeInfo   = Deliveries.getTypeInfo(d.delivery_type);
  const statusInfo = Deliveries.getStatusInfo(d.status);
  const kandangName = d.kandang?.name || d.kandang_id;
  const tglKirim   = Deliveries.formatDate(d.tanggal_kirim);
  const priceHtml  = canSeeCost && d.total_harga
    ? `<span class="delivery-price">${Deliveries.formatCurrency(d.total_harga)}</span>`
    : '';

  return `
    <div class="delivery-card" onclick="showDeliveryDetail('${d.id}')">
      <div class="delivery-card-header">
        <div class="delivery-card-icon" style="background:${typeInfo.bg}">
          <span class="material-icons-round" style="color:${typeInfo.color}">${typeInfo.icon}</span>
        </div>
        <div style="flex:1;min-width:0">
          <div class="delivery-card-name">${d.item_name}</div>
          <div class="delivery-card-sub">${typeInfo.label} &bull; ${kandangName}</div>
        </div>
        <span class="delivery-status-badge ${d.status}">${statusInfo.label}</span>
      </div>
      <div class="delivery-card-meta">
        <div class="delivery-meta-item">
          <span class="material-icons-round">scale</span>
          ${d.jumlah} ${d.satuan}
        </div>
        <div class="delivery-meta-item">
          <span class="material-icons-round">calendar_today</span>
          ${tglKirim}
        </div>
        ${d.supplier ? `<div class="delivery-meta-item"><span class="material-icons-round">store</span>${d.supplier}</div>` : ''}
        ${priceHtml}
      </div>
    </div>`;
}

function switchDeliveryTab(tab, btn) {
  _currentDeliveryTab = tab;
  document.querySelectorAll('#page-delivery .tab-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderDelivery();
}

async function refreshDeliveries() {
  await renderDelivery();
  showToast('Data pengiriman diperbarui');
}

// ── Modal: Input / Edit Pengiriman ────────────────────────────────────────────
async function showAddDeliveryModal() {
  document.getElementById('delivery-edit-id').value    = '';
  document.getElementById('delivery-item-name').value  = '';
  document.getElementById('delivery-jumlah').value     = '';
  document.getElementById('delivery-satuan').value     = '';
  document.getElementById('delivery-harga').value      = '';
  document.getElementById('delivery-supplier').value   = '';
  document.getElementById('delivery-invoice').value    = '';
  document.getElementById('delivery-catatan').value    = '';
  document.getElementById('delivery-tgl-kirim').value  = new Date().toISOString().split('T')[0];
  document.getElementById('delivery-status').value     = 'pending';
  document.getElementById('delivery-total-display').textContent = 'Rp 0';
  document.getElementById('modal-delivery-title').textContent   = 'Input Pengiriman';

  // Sembunyikan harga jika tidak punya permission cost.view
  const priceSection = document.getElementById('delivery-price-section');
  if (priceSection) priceSection.style.display = AUTH.can('cost.view') ? '' : 'none';

  await _populateKandangSelect('delivery-kandang');
  document.getElementById('modal-delivery').classList.remove('hidden');
}

async function editDelivery(deliveryId) {
  const client = AUTH.getSupabase();
  if (!client) return;
  const { data: d, error } = await client
    .from('deliveries').select('*').eq('id', deliveryId).single();
  if (error || !d) { showToast('⚠️ Gagal memuat data'); return; }

  document.getElementById('delivery-edit-id').value    = d.id;
  document.getElementById('delivery-item-name').value  = d.item_name;
  document.getElementById('delivery-jumlah').value     = d.jumlah;
  document.getElementById('delivery-satuan').value     = d.satuan;
  document.getElementById('delivery-harga').value      = d.harga_satuan || '';
  document.getElementById('delivery-supplier').value   = d.supplier || '';
  document.getElementById('delivery-invoice').value    = d.no_invoice || '';
  document.getElementById('delivery-catatan').value    = d.catatan || '';
  document.getElementById('delivery-tgl-kirim').value  = d.tanggal_kirim || '';
  document.getElementById('delivery-status').value     = d.status;
  document.getElementById('delivery-type').value       = d.delivery_type;
  document.getElementById('modal-delivery-title').textContent = 'Edit Pengiriman';

  const priceSection = document.getElementById('delivery-price-section');
  if (priceSection) priceSection.style.display = AUTH.can('cost.view') ? '' : 'none';

  updateDeliveryTotal();
  await _populateKandangSelect('delivery-kandang', d.kandang_id);
  document.getElementById('modal-delivery').classList.remove('hidden');
}

function updateDeliveryTotal() {
  const jumlah = parseFloat(document.getElementById('delivery-jumlah')?.value) || 0;
  const harga  = parseFloat(document.getElementById('delivery-harga')?.value)  || 0;
  const total  = jumlah * harga;
  const el = document.getElementById('delivery-total-display');
  if (el) el.textContent = Deliveries.formatCurrency(total);
}

async function saveDelivery() {
  const editId    = document.getElementById('delivery-edit-id').value;
  const kandangId = document.getElementById('delivery-kandang').value;
  const type      = document.getElementById('delivery-type').value;
  const itemName  = document.getElementById('delivery-item-name').value.trim();
  const jumlah    = parseFloat(document.getElementById('delivery-jumlah').value);
  const satuan    = document.getElementById('delivery-satuan').value.trim();
  const harga     = parseFloat(document.getElementById('delivery-harga').value) || 0;
  const supplier  = document.getElementById('delivery-supplier').value.trim();
  const invoice   = document.getElementById('delivery-invoice').value.trim();
  const tglKirim  = document.getElementById('delivery-tgl-kirim').value;
  const status    = document.getElementById('delivery-status').value;
  const catatan   = document.getElementById('delivery-catatan').value.trim();

  if (!kandangId) { showToast('⚠️ Pilih kandang'); return; }
  if (!itemName)  { showToast('⚠️ Nama item wajib diisi'); return; }
  if (!jumlah || jumlah <= 0) { showToast('⚠️ Jumlah harus lebih dari 0'); return; }
  if (!satuan)    { showToast('⚠️ Satuan wajib diisi'); return; }
  if (!tglKirim)  { showToast('⚠️ Tanggal kirim wajib diisi'); return; }

  const payload = {
    kandang_id: kandangId, delivery_type: type, item_name: itemName,
    jumlah, satuan, harga_satuan: harga,
    supplier: supplier || null, no_invoice: invoice || null,
    tanggal_kirim: tglKirim, status, catatan: catatan || null
  };

  const result = editId
    ? await Deliveries.update(editId, payload)
    : await Deliveries.create(payload);

  if (result.success) {
    showToast(editId ? 'Pengiriman diperbarui' : 'Pengiriman berhasil disimpan');
    closeModal('modal-delivery');
    await renderDelivery();
  } else {
    showToast('⚠️ ' + result.error);
  }
}

// ── Modal: Detail Pengiriman ──────────────────────────────────────────────────
async function showDeliveryDetail(deliveryId) {
  const client = AUTH.getSupabase();
  if (!client) return;

  const { data: d, error } = await client
    .from('deliveries')
    .select('*, kandang:kandangs(id, name), inputter:profiles!deliveries_input_by_fkey(id, nama)')
    .eq('id', deliveryId).single();

  if (error || !d) { showToast('⚠️ Gagal memuat detail'); return; }
  _currentDeliveryDetail = d;

  const typeInfo   = Deliveries.getTypeInfo(d.delivery_type);
  const statusInfo = Deliveries.getStatusInfo(d.status);
  const canSeeCost = AUTH.can('cost.view');
  const kandangName = d.kandang?.name || d.kandang_id;

  document.getElementById('delivery-detail-title').textContent = d.item_name;

  document.getElementById('delivery-detail-body').innerHTML = `
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px">
      <div style="width:44px;height:44px;border-radius:12px;background:${typeInfo.bg};display:flex;align-items:center;justify-content:center">
        <span class="material-icons-round" style="color:${typeInfo.color}">${typeInfo.icon}</span>
      </div>
      <div style="flex:1">
        <div style="font-weight:600;font-size:15px">${d.item_name}</div>
        <div style="font-size:12px;color:var(--secondary-text)">${typeInfo.label} &bull; ${kandangName}</div>
      </div>
      <span class="delivery-status-badge ${d.status}">${statusInfo.label}</span>
    </div>

    <div class="kpi-grid" style="margin-bottom:16px">
      <div class="kpi-card" style="--tint:${typeInfo.bg}">
        <div class="kpi-value" style="font-size:18px">${d.jumlah}</div>
        <div class="kpi-label">${d.satuan}</div>
      </div>
      ${canSeeCost ? `
      <div class="kpi-card" style="--tint:rgba(59,130,246,.1)">
        <div class="kpi-value" style="font-size:14px">${Deliveries.formatCurrency(d.harga_satuan)}</div>
        <div class="kpi-label">Harga/Satuan</div>
      </div>
      <div class="kpi-card" style="--tint:rgba(16,185,129,.1)">
        <div class="kpi-value" style="font-size:14px">${Deliveries.formatCurrency(d.total_harga)}</div>
        <div class="kpi-label">Total</div>
      </div>` : ''}
    </div>

    <div style="display:flex;flex-direction:column;gap:8px;font-size:13px">
      ${_detailRow('calendar_today', 'Tanggal Kirim', Deliveries.formatDate(d.tanggal_kirim))}
      ${d.tanggal_terima ? _detailRow('event_available', 'Tanggal Terima', Deliveries.formatDate(d.tanggal_terima)) : ''}
      ${d.supplier   ? _detailRow('store',         'Supplier',   d.supplier)   : ''}
      ${d.no_invoice ? _detailRow('receipt_long',  'No. Invoice', d.no_invoice) : ''}
      ${d.inputter   ? _detailRow('person',        'Diinput oleh', d.inputter.nama) : ''}
      ${d.catatan    ? _detailRow('notes',         'Catatan',    d.catatan)    : ''}
    </div>`;

  const canEdit    = AUTH.can('delivery.edit');
  const canDelete  = AUTH.can('delivery.delete');
  const canConfirm = AUTH.can('delivery.confirm') && d.status !== 'received' && d.status !== 'cancelled';

  document.getElementById('btn-confirm-delivery').style.display = canConfirm ? '' : 'none';
  document.getElementById('btn-edit-delivery').style.display    = canEdit    ? '' : 'none';
  document.getElementById('btn-delete-delivery').style.display  = canDelete  ? '' : 'none';

  document.getElementById('modal-delivery-detail').classList.remove('hidden');
}

function _detailRow(icon, label, value) {
  return `<div style="display:flex;align-items:flex-start;gap:8px">
    <span class="material-icons-round" style="font-size:16px;color:var(--secondary-text);margin-top:1px">${icon}</span>
    <div><span style="color:var(--secondary-text)">${label}:</span> <strong>${value}</strong></div>
  </div>`;
}

async function confirmDeliveryReceived() {
  if (!_currentDeliveryDetail) return;
  const r = await Deliveries.confirmReceived(_currentDeliveryDetail.id);
  if (r.success) {
    showToast('✅ Pengiriman dikonfirmasi diterima');
    closeModal('modal-delivery-detail');
    await renderDelivery();
  } else {
    showToast('⚠️ ' + r.error);
  }
}

function editDeliveryFromDetail() {
  if (!_currentDeliveryDetail) return;
  closeModal('modal-delivery-detail');
  editDelivery(_currentDeliveryDetail.id);
}

async function deleteDeliveryFromDetail() {
  if (!_currentDeliveryDetail) return;
  if (!confirm('Hapus pengiriman "' + _currentDeliveryDetail.item_name + '"?')) return;
  const r = await Deliveries.delete(_currentDeliveryDetail.id);
  if (r.success) {
    showToast('Pengiriman dihapus');
    closeModal('modal-delivery-detail');
    _currentDeliveryDetail = null;
    await renderDelivery();
  } else {
    showToast('⚠️ ' + r.error);
  }
}

// ── (navigateTo di-handle oleh patch tunggal di akhir file) ──────────────────
// Sprint 5 end

// ============================================================
// ===== COST PRODUKSI (Sprint 6) =====
// ============================================================

let _currentCostTab    = 'list';
let _currentCostDetail = null;

// ── Render halaman cost ───────────────────────────────────────────────────────
async function renderCost() {
  const content = document.getElementById('cost-content');
  if (!content) return;

  // Guard: hanya Staff/Owner/Manager
  if (!AUTH.can('cost.view')) {
    content.innerHTML = `
      <div class="empty-state">
        <span class="material-icons-round" style="font-size:48px;color:var(--hint)">lock</span>
        <p class="body-medium secondary-text">Fitur ini hanya untuk Staff, Owner, dan Manager</p>
      </div>`;
    document.getElementById('btn-add-cost-wrap').style.display = 'none';
    return;
  }

  content.innerHTML = '<div style="text-align:center;padding:24px;color:var(--hint)"><span class="material-icons-round spin">refresh</span></div>';

  const btnWrap = document.getElementById('btn-add-cost-wrap');
  const canCreate = AUTH.can('cost.create') || ['staff','owner','manager'].includes(AUTH.role);
  if (btnWrap) btnWrap.style.display = canCreate ? '' : 'none';

  if (_currentCostTab === 'list') {
    await _renderCostList(content);
  } else {
    await _renderCostSummary(content);
  }
}

async function _renderCostList(container) {
  const costs = await ProductionCosts.getAll();

  // Update header stats
  const batchEl  = document.getElementById('cost-total-batches');
  const marginEl = document.getElementById('cost-avg-margin');
  if (batchEl) batchEl.textContent = costs.length;
  if (marginEl && costs.length) {
    const finals = costs.filter(c => c.is_final && c.revenue > 0);
    if (finals.length) {
      const avgMargin = finals.reduce((sum, c) => {
        return sum + ((c.revenue - c.total_cost) / c.revenue * 100);
      }, 0) / finals.length;
      marginEl.textContent = avgMargin.toFixed(1) + '%';
      marginEl.style.color = avgMargin >= 0 ? '#10B981' : '#EF4444';
    } else {
      marginEl.textContent = '-';
    }
  }

  if (!costs.length) {
    container.innerHTML = `
      <div class="empty-state">
        <span class="material-icons-round" style="font-size:48px;color:var(--hint)">account_balance_wallet</span>
        <p class="body-medium secondary-text">Belum ada laporan cost produksi</p>
        ${AUTH.can('cost.create') ? '<p class="body-small secondary-text">Klik "Buat Laporan Cost Baru" untuk mulai</p>' : ''}
      </div>`;
    return;
  }

  container.innerHTML = costs.map(c => _buildCostCard(c)).join('');
}

function _buildCostCard(c) {
  const kandangName = c.kandang?.name || c.kandang_id;
  const profit      = (c.revenue || 0) - (c.total_cost || 0);
  const margin      = c.revenue > 0 ? ((profit / c.revenue) * 100).toFixed(1) : null;
  const profitColor = ProductionCosts.profitColor(profit);
  const profitIcon  = ProductionCosts.profitIcon(profit);
  const badge       = c.is_final
    ? '<span class="cost-final-badge">Final</span>'
    : '<span class="cost-draft-badge">Draft</span>';

  const mulai   = c.periode_mulai   ? new Date(c.periode_mulai).toLocaleDateString('id-ID',   { day:'numeric', month:'short', year:'numeric' }) : '-';
  const selesai = c.periode_selesai ? new Date(c.periode_selesai).toLocaleDateString('id-ID', { day:'numeric', month:'short', year:'numeric' }) : 'Ongoing';

  return `
    <div class="cost-batch-card" onclick="showCostDetail('${c.id}')">
      <div class="cost-batch-header">
        <div class="cost-batch-icon" style="background:rgba(59,130,246,.12)">
          <span class="material-icons-round" style="color:#3B82F6">account_balance_wallet</span>
        </div>
        <div style="flex:1;min-width:0">
          <div class="cost-batch-name">${c.nama_batch || 'Batch ' + kandangName}</div>
          <div class="cost-batch-sub">${kandangName} &bull; ${mulai} – ${selesai}</div>
        </div>
        ${badge}
      </div>
      <div class="cost-batch-kpis">
        <div class="cost-kpi-mini">
          <div class="val">${ProductionCosts.formatCurrencyShort(c.total_cost)}</div>
          <div class="lbl">Total Cost</div>
        </div>
        <div class="cost-kpi-mini">
          <div class="val">${ProductionCosts.formatCurrencyShort(c.revenue)}</div>
          <div class="lbl">Revenue</div>
        </div>
        <div class="cost-kpi-mini">
          <div class="val" style="color:${profitColor}">
            <span class="material-icons-round" style="font-size:12px;vertical-align:middle">${profitIcon}</span>
            ${margin !== null ? margin + '%' : '-'}
          </div>
          <div class="lbl">Margin</div>
        </div>
      </div>
    </div>`;
}

async function _renderCostSummary(container) {
  const summary = await ProductionCosts.getProfitLoss();

  if (!summary.length) {
    container.innerHTML = `
      <div class="empty-state">
        <span class="material-icons-round" style="font-size:48px;color:var(--hint)">bar_chart</span>
        <p class="body-medium secondary-text">Belum ada data final untuk ringkasan</p>
        <p class="body-small secondary-text">Finalisasi laporan cost untuk melihat ringkasan</p>
      </div>`;
    return;
  }

  const totalRevenue = summary.reduce((s, r) => s + (r.revenue || 0), 0);
  const totalCost    = summary.reduce((s, r) => s + (r.total_cost || 0), 0);
  const totalProfit  = totalRevenue - totalCost;
  const avgMargin    = totalRevenue > 0 ? (totalProfit / totalRevenue * 100).toFixed(1) : 0;
  const profitColor  = ProductionCosts.profitColor(totalProfit);

  container.innerHTML = `
    <div class="cost-summary-grid">
      <div class="cost-summary-card">
        <div class="amount">${ProductionCosts.formatCurrencyShort(totalRevenue)}</div>
        <div class="label">Total Revenue</div>
      </div>
      <div class="cost-summary-card">
        <div class="amount">${ProductionCosts.formatCurrencyShort(totalCost)}</div>
        <div class="label">Total Cost</div>
      </div>
      <div class="cost-summary-card">
        <div class="amount" style="color:${profitColor}">${ProductionCosts.formatCurrencyShort(totalProfit)}</div>
        <div class="label">Total Profit</div>
      </div>
      <div class="cost-summary-card">
        <div class="amount" style="color:${profitColor}">${avgMargin}%</div>
        <div class="label">Avg Margin</div>
      </div>
    </div>

    <div style="font-size:13px;font-weight:600;margin-bottom:10px">Profit/Loss per Batch</div>
    ${summary.map(r => {
      const profit = (r.revenue || 0) - (r.total_cost || 0);
      const color  = ProductionCosts.profitColor(profit);
      const icon   = ProductionCosts.profitIcon(profit);
      const mulai  = r.periode_mulai ? new Date(r.periode_mulai).toLocaleDateString('id-ID', { month:'short', year:'numeric' }) : '-';
      return `
        <div style="background:var(--surface);border-radius:12px;padding:12px 14px;margin-bottom:8px;border:1px solid var(--outline-variant)">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
            <div>
              <div style="font-size:13px;font-weight:600">${r.nama_batch || r.kandang_id}</div>
              <div style="font-size:11px;color:var(--secondary-text)">${mulai}</div>
            </div>
            <div style="text-align:right">
              <div style="font-size:14px;font-weight:700;color:${color}">
                <span class="material-icons-round" style="font-size:14px;vertical-align:middle">${icon}</span>
                ${ProductionCosts.formatCurrencyShort(profit)}
              </div>
              <div style="font-size:11px;color:var(--secondary-text)">
                ${r.margin_pct}% margin &bull; Rp ${Number(r.cost_per_kg).toLocaleString('id-ID')}/kg
              </div>
            </div>
          </div>
          <div class="compliance-bar">
            <div class="compliance-bar-fill" style="width:${Math.min(100, Math.max(0, r.margin_pct))}%;background:${color}"></div>
          </div>
        </div>`;
    }).join('')}`;
}

function switchCostTab(tab, btn) {
  _currentCostTab = tab;
  document.querySelectorAll('#page-cost .tab-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderCost();
}

async function refreshCost() {
  await renderCost();
  showToast('Data cost diperbarui');
}

// ── Modal: Buat / Edit Cost ───────────────────────────────────────────────────
async function showAddCostModal() {
  document.getElementById('cost-edit-id').value        = '';
  document.getElementById('cost-nama-batch').value     = '';
  document.getElementById('cost-catatan').value        = '';
  document.getElementById('cost-panen-ekor').value     = '';
  document.getElementById('cost-panen-kg').value       = '';
  document.getElementById('cost-harga-jual').value     = '';
  document.getElementById('cost-periode-mulai').value  = new Date().toISOString().split('T')[0];
  document.getElementById('cost-periode-selesai').value = '';
  document.getElementById('cost-revenue-display').textContent = 'Rp 0';
  document.getElementById('cost-total-display').textContent   = 'Rp 0';
  document.getElementById('modal-cost-title').textContent     = 'Buat Laporan Cost';

  const profitPreview = document.getElementById('cost-profit-preview');
  if (profitPreview) profitPreview.style.display = 'none';

  _renderCostComponentsGrid({});
  await _populateKandangSelect('cost-kandang');
  document.getElementById('modal-cost').classList.remove('hidden');
}

async function editCost(costId) {
  const c = await ProductionCosts.getById(costId);
  if (!c) { showToast('⚠️ Gagal memuat data'); return; }

  document.getElementById('cost-edit-id').value        = c.id;
  document.getElementById('cost-nama-batch').value     = c.nama_batch || '';
  document.getElementById('cost-catatan').value        = c.catatan || '';
  document.getElementById('cost-panen-ekor').value     = c.total_panen_ekor || '';
  document.getElementById('cost-panen-kg').value       = c.total_panen_kg || '';
  document.getElementById('cost-harga-jual').value     = c.harga_jual_per_kg || '';
  document.getElementById('cost-periode-mulai').value  = c.periode_mulai || '';
  document.getElementById('cost-periode-selesai').value = c.periode_selesai || '';
  document.getElementById('modal-cost-title').textContent = 'Edit Laporan Cost';

  _renderCostComponentsGrid(c);
  updateCostTotal();
  updateCostRevenue();
  await _populateKandangSelect('cost-kandang', c.kandang_id);
  document.getElementById('modal-cost').classList.remove('hidden');
}

function _renderCostComponentsGrid(data) {
  const grid = document.getElementById('cost-components-grid');
  if (!grid) return;
  grid.innerHTML = ProductionCosts.COST_COMPONENTS.map(comp => `
    <div class="cost-component-row">
      <div class="cost-component-icon" style="background:${comp.color}20">
        <span class="material-icons-round" style="color:${comp.color}">${comp.icon}</span>
      </div>
      <span class="cost-component-label">${comp.label}</span>
      <input type="number" class="cost-component-input" min="0" step="1000"
             id="cost-${comp.key}" data-key="${comp.key}"
             value="${data[comp.key] || ''}" placeholder="0"
             oninput="updateCostTotal()" />
    </div>`).join('');
}

function updateCostTotal() {
  let total = 0;
  ProductionCosts.COST_COMPONENTS.forEach(comp => {
    const el = document.getElementById('cost-' + comp.key);
    if (el) total += parseFloat(el.value) || 0;
  });
  const el = document.getElementById('cost-total-display');
  if (el) el.textContent = ProductionCosts.formatCurrency(total);
  updateCostRevenue();
}

function updateCostRevenue() {
  const kg    = parseFloat(document.getElementById('cost-panen-kg')?.value)    || 0;
  const harga = parseFloat(document.getElementById('cost-harga-jual')?.value)  || 0;
  const revenue = kg * harga;

  const revEl = document.getElementById('cost-revenue-display');
  if (revEl) revEl.textContent = ProductionCosts.formatCurrency(revenue);

  // Hitung profit preview
  let totalCost = 0;
  ProductionCosts.COST_COMPONENTS.forEach(comp => {
    const el = document.getElementById('cost-' + comp.key);
    if (el) totalCost += parseFloat(el.value) || 0;
  });

  const profit     = revenue - totalCost;
  const margin     = revenue > 0 ? (profit / revenue * 100).toFixed(1) : null;
  const profitColor = ProductionCosts.profitColor(profit);
  const profitIcon  = ProductionCosts.profitIcon(profit);

  const preview = document.getElementById('cost-profit-preview');
  if (preview && (revenue > 0 || totalCost > 0)) {
    preview.style.display = '';
    preview.style.background = profit >= 0 ? 'rgba(16,185,129,.08)' : 'rgba(239,68,68,.08)';
    preview.style.border = `1px solid ${profit >= 0 ? 'rgba(16,185,129,.2)' : 'rgba(239,68,68,.2)'}`;
    preview.innerHTML = `
      <div class="cost-profit-item">
        <div class="val">${ProductionCosts.formatCurrencyShort(totalCost)}</div>
        <div class="lbl">Total Cost</div>
      </div>
      <div class="cost-profit-item">
        <div class="val">${ProductionCosts.formatCurrencyShort(revenue)}</div>
        <div class="lbl">Revenue</div>
      </div>
      <div class="cost-profit-item">
        <div class="val" style="color:${profitColor}">
          <span class="material-icons-round" style="font-size:14px;vertical-align:middle">${profitIcon}</span>
          ${ProductionCosts.formatCurrencyShort(profit)}
        </div>
        <div class="lbl">Profit</div>
      </div>
      ${margin !== null ? `<div class="cost-profit-item"><div class="val" style="color:${profitColor}">${margin}%</div><div class="lbl">Margin</div></div>` : ''}`;
  } else if (preview) {
    preview.style.display = 'none';
  }
}

function onCostKandangChange() {
  const mulai   = document.getElementById('cost-periode-mulai')?.value;
  const selesai = document.getElementById('cost-periode-selesai')?.value;
  const section = document.getElementById('cost-auto-calc-section');
  if (section) section.style.display = (mulai && selesai) ? '' : 'none';
}

function onCostPeriodeChange() {
  onCostKandangChange();
}

async function autoCalcFromDeliveries() {
  const kandangId = document.getElementById('cost-kandang')?.value;
  const mulai     = document.getElementById('cost-periode-mulai')?.value;
  const selesai   = document.getElementById('cost-periode-selesai')?.value;

  if (!kandangId || !mulai || !selesai) {
    showToast('⚠️ Pilih kandang dan periode terlebih dahulu');
    return;
  }

  showToast('Menghitung dari data pengiriman...');
  const result = await ProductionCosts.calculateFromDeliveries(kandangId, mulai, selesai);

  // Isi input sesuai tipe
  const typeMap = { pakan: 'cost_pakan', obat: 'cost_obat', vitamin: 'cost_vitamin', vaksin: 'cost_vaksin', supplies: 'cost_supplies' };
  Object.entries(typeMap).forEach(([type, key]) => {
    const el = document.getElementById('cost-' + key);
    if (el && result[type]) el.value = Math.round(result[type]);
  });

  updateCostTotal();
  showToast('✅ Cost dihitung dari ' + Object.keys(result).length + ' tipe pengiriman');
}

async function saveCost() {
  const editId    = document.getElementById('cost-edit-id').value;
  const kandangId = document.getElementById('cost-kandang').value;
  const namaBatch = document.getElementById('cost-nama-batch').value.trim();
  const mulai     = document.getElementById('cost-periode-mulai').value;
  const selesai   = document.getElementById('cost-periode-selesai').value;
  const panenEkor = parseInt(document.getElementById('cost-panen-ekor').value) || 0;
  const panenKg   = parseFloat(document.getElementById('cost-panen-kg').value) || 0;
  const hargaJual = parseFloat(document.getElementById('cost-harga-jual').value) || 0;
  const catatan   = document.getElementById('cost-catatan').value.trim();

  if (!kandangId) { showToast('⚠️ Pilih kandang'); return; }
  if (!mulai)     { showToast('⚠️ Isi periode mulai'); return; }

  const payload = {
    kandang_id: kandangId, nama_batch: namaBatch || null,
    periode_mulai: mulai, periode_selesai: selesai || null,
    total_panen_ekor: panenEkor, total_panen_kg: panenKg,
    harga_jual_per_kg: hargaJual, catatan: catatan || null
  };

  // Baca semua komponen cost
  ProductionCosts.COST_COMPONENTS.forEach(comp => {
    const el = document.getElementById('cost-' + comp.key);
    payload[comp.key] = parseFloat(el?.value) || 0;
  });

  const result = editId
    ? await ProductionCosts.update(editId, payload)
    : await ProductionCosts.create(payload);

  if (result.success) {
    showToast(editId ? 'Cost diperbarui' : 'Laporan cost disimpan');
    closeModal('modal-cost');
    await renderCost();
  } else {
    showToast('⚠️ ' + result.error);
  }
}

// ── Modal: Detail Cost ────────────────────────────────────────────────────────
async function showCostDetail(costId) {
  const c = await ProductionCosts.getById(costId);
  if (!c) { showToast('⚠️ Gagal memuat detail'); return; }
  _currentCostDetail = c;

  const kandangName = c.kandang?.name || c.kandang_id;
  const profit      = (c.revenue || 0) - (c.total_cost || 0);
  const margin      = c.revenue > 0 ? (profit / c.revenue * 100).toFixed(1) : 0;
  const profitColor = ProductionCosts.profitColor(profit);
  const profitIcon  = ProductionCosts.profitIcon(profit);
  const mulai       = c.periode_mulai   ? new Date(c.periode_mulai).toLocaleDateString('id-ID',   { day:'numeric', month:'long', year:'numeric' }) : '-';
  const selesai     = c.periode_selesai ? new Date(c.periode_selesai).toLocaleDateString('id-ID', { day:'numeric', month:'long', year:'numeric' }) : 'Ongoing';

  document.getElementById('cost-detail-title').textContent = c.nama_batch || 'Batch ' + kandangName;

  // Breakdown komponen cost
  const totalCost = c.total_cost || 0;
  const breakdownHtml = ProductionCosts.COST_COMPONENTS
    .filter(comp => (c[comp.key] || 0) > 0)
    .map(comp => {
      const val = c[comp.key] || 0;
      const pct = totalCost > 0 ? (val / totalCost * 100).toFixed(1) : 0;
      return `
        <div class="cost-breakdown-item">
          <span class="material-icons-round" style="font-size:14px;color:${comp.color}">${comp.icon}</span>
          <span class="cost-breakdown-label">${comp.label}</span>
          <div class="cost-breakdown-bar-wrap">
            <div class="cost-breakdown-bar" style="width:${pct}%;background:${comp.color}"></div>
          </div>
          <span class="cost-breakdown-pct">${pct}%</span>
          <span class="cost-breakdown-amount">${ProductionCosts.formatCurrencyShort(val)}</span>
        </div>`;
    }).join('');

  document.getElementById('cost-detail-body').innerHTML = `
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px">
      <div style="width:44px;height:44px;border-radius:12px;background:rgba(59,130,246,.12);display:flex;align-items:center;justify-content:center">
        <span class="material-icons-round" style="color:#3B82F6">account_balance_wallet</span>
      </div>
      <div style="flex:1">
        <div style="font-weight:600;font-size:15px">${kandangName}</div>
        <div style="font-size:12px;color:var(--secondary-text)">${mulai} – ${selesai}</div>
      </div>
      ${c.is_final ? '<span class="cost-final-badge">Final</span>' : '<span class="cost-draft-badge">Draft</span>'}
    </div>

    <div class="cost-batch-kpis" style="margin-bottom:16px">
      <div class="cost-kpi-mini">
        <div class="val">${ProductionCosts.formatCurrencyShort(totalCost)}</div>
        <div class="lbl">Total Cost</div>
      </div>
      <div class="cost-kpi-mini">
        <div class="val">${ProductionCosts.formatCurrencyShort(c.revenue)}</div>
        <div class="lbl">Revenue</div>
      </div>
      <div class="cost-kpi-mini">
        <div class="val" style="color:${profitColor}">
          <span class="material-icons-round" style="font-size:12px;vertical-align:middle">${profitIcon}</span>
          ${margin}%
        </div>
        <div class="lbl">Margin</div>
      </div>
    </div>

    <div style="background:${profit >= 0 ? 'rgba(16,185,129,.08)' : 'rgba(239,68,68,.08)'};border:1px solid ${profit >= 0 ? 'rgba(16,185,129,.2)' : 'rgba(239,68,68,.2)'};border-radius:12px;padding:12px 14px;margin-bottom:16px;display:flex;gap:16px;flex-wrap:wrap">
      <div style="flex:1;text-align:center">
        <div style="font-size:16px;font-weight:700;color:${profitColor}">${ProductionCosts.formatCurrencyShort(profit)}</div>
        <div style="font-size:11px;color:var(--secondary-text)">Profit/Loss</div>
      </div>
      ${c.total_panen_kg > 0 ? `
      <div style="flex:1;text-align:center">
        <div style="font-size:16px;font-weight:700">${c.total_panen_kg.toLocaleString('id-ID')} kg</div>
        <div style="font-size:11px;color:var(--secondary-text)">${c.total_panen_ekor?.toLocaleString('id-ID') || 0} ekor</div>
      </div>
      <div style="flex:1;text-align:center">
        <div style="font-size:16px;font-weight:700">Rp ${c.total_panen_kg > 0 ? Math.round(totalCost / c.total_panen_kg).toLocaleString('id-ID') : 0}</div>
        <div style="font-size:11px;color:var(--secondary-text)">Cost/kg</div>
      </div>` : ''}
    </div>

    ${breakdownHtml ? `
    <div style="font-size:13px;font-weight:600;margin-bottom:10px">Breakdown Biaya</div>
    <div class="cost-breakdown-list">${breakdownHtml}</div>` : ''}

    ${c.catatan ? `<div style="background:var(--surface-variant);border-radius:10px;padding:12px;margin-top:12px;font-size:13px;color:var(--secondary-text)">${c.catatan}</div>` : ''}`;

  const canEdit     = AUTH.can('cost.edit') && !c.is_final;
  const canDelete   = AUTH.can('cost.delete');
  const canFinalize = AUTH.can('cost.finalize') && !c.is_final;

  document.getElementById('btn-finalize-cost').style.display = canFinalize ? '' : 'none';
  document.getElementById('btn-edit-cost').style.display     = canEdit     ? '' : 'none';
  document.getElementById('btn-delete-cost').style.display   = canDelete   ? '' : 'none';

  document.getElementById('modal-cost-detail').classList.remove('hidden');
}

async function finalizeCost() {
  if (!_currentCostDetail) return;
  if (!confirm('Finalisasi laporan cost ini?\n\nSetelah difinalisasi, data tidak bisa diedit lagi.')) return;
  const r = await ProductionCosts.finalize(_currentCostDetail.id);
  if (r.success) {
    showToast('✅ Laporan cost difinalisasi');
    closeModal('modal-cost-detail');
    await renderCost();
  } else {
    showToast('⚠️ ' + r.error);
  }
}

function editCostFromDetail() {
  if (!_currentCostDetail) return;
  closeModal('modal-cost-detail');
  editCost(_currentCostDetail.id);
}

async function deleteCostFromDetail() {
  if (!_currentCostDetail) return;
  if (!confirm('Hapus laporan cost ini?')) return;
  const r = await ProductionCosts.delete(_currentCostDetail.id);
  if (r.success) {
    showToast('Laporan cost dihapus');
    closeModal('modal-cost-detail');
    _currentCostDetail = null;
    await renderCost();
  } else {
    showToast('⚠️ ' + r.error);
  }
}

// ── (navigateTo di-handle oleh patch tunggal di akhir file) ──────────────────
// Sprint 6 end

// ============================================================
// ===== SPRINT 7: PATCH NAVIGATETO TUNGGAL =====
// Menggantikan semua patch berantai dari sprint sebelumnya
// ============================================================

// Override navigateTo dengan versi final yang handle semua halaman
navigateTo = function(page) {
  // Jalankan navigasi dasar
  originalNavigateTo(page);

  // Render halaman sesuai page
  const renders = {
    visits:   renderVisits,
    targets:  renderTargets,
    health:   renderHealth,
    delivery: renderDelivery,
    cost:     renderCost
  };
  if (renders[page]) renders[page]();
};

// ============================================================
// ===== TS REPORT HISTORY =====
// Histori laporan harian semua kandang aktif untuk role TS
// ============================================================

// Isi dropdown filter kandang
async function _populateTSKandangFilter() {
  const sel = document.getElementById('ts-filter-kandang');
  if (!sel || sel.options.length > 1) return; // sudah diisi

  const flocks = DB.flocks.filter(f => f.active);
  flocks.forEach(f => {
    const opt = document.createElement('option');
    opt.value = f._dbId || f.id;
    opt.textContent = f.name || f.nama || f.id;
    sel.appendChild(opt);
  });
}

// Render histori laporan untuk TS
async function renderTSReportHistory() {
  const listEl    = document.getElementById('ts-report-list');
  const summaryEl = document.getElementById('ts-report-summary');
  if (!listEl) return;

  listEl.innerHTML = '<div style="text-align:center;padding:24px;color:var(--hint)"><span class="material-icons-round spin">refresh</span></div>';

  const filterKandang = document.getElementById('ts-filter-kandang')?.value || '';
  const filterDays    = parseInt(document.getElementById('ts-filter-days')?.value) || 7;

  // Hitung tanggal range
  const endDate   = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - (filterDays - 1));
  const startStr = startDate.toISOString().split('T')[0];
  const endStr   = endDate.toISOString().split('T')[0];

  try {
    const client = AUTH.getSupabase();
    if (!client) throw new Error('Supabase tidak tersedia');

    // Query data_harian dari semua kandang aktif dalam range
    let q = client
      .from('data_harian')
      .select(`
        id, kandang_id, hari, tanggal,
        mati, culling, pakan_total, feed_am, feed_pm, feed_code,
        berat_rata_rata, is_complete, catatan,
        kandang:kandangs(id, name, kapasitas, usia)
      `)
      .gte('tanggal', startStr)
      .lte('tanggal', endStr)
      .order('tanggal', { ascending: false })
      .order('kandang_id');

    if (filterKandang) q = q.eq('kandang_id', filterKandang);

    const { data, error } = await q;
    if (error) throw error;

    const logs = data || [];

    // ── Summary stats ─────────────────────────────────────────────────────
    const totalLogs     = logs.length;
    const completedLogs = logs.filter(l => l.is_complete).length;
    const totalMati     = logs.reduce((s, l) => s + (l.mati || 0), 0);
    const avgPakan      = logs.length
      ? (logs.reduce((s, l) => s + (l.pakan_total || 0), 0) / logs.length).toFixed(1)
      : 0;

    if (summaryEl) {
      summaryEl.innerHTML = `
        <div class="ts-summary-card">
          <div class="val">${totalLogs}</div>
          <div class="lbl">Total Laporan</div>
        </div>
        <div class="ts-summary-card">
          <div class="val" style="color:${completedLogs === totalLogs && totalLogs > 0 ? '#10B981' : '#F59E0B'}">${completedLogs}/${totalLogs}</div>
          <div class="lbl">Selesai</div>
        </div>
        <div class="ts-summary-card">
          <div class="val" style="color:${totalMati > 0 ? '#EF4444' : '#10B981'}">${totalMati}</div>
          <div class="lbl">Total Mati</div>
        </div>`;
    }

    if (!logs.length) {
      listEl.innerHTML = `
        <div class="empty-state">
          <span class="material-icons-round" style="font-size:48px;color:var(--hint)">history</span>
          <p class="body-medium secondary-text">Tidak ada laporan dalam ${filterDays} hari terakhir</p>
        </div>`;
      return;
    }

    // ── Group by kandang ──────────────────────────────────────────────────
    const grouped = {};
    logs.forEach(l => {
      const kid  = l.kandang_id;
      const name = l.kandang?.name || l.kandang?.nama || kid;
      if (!grouped[kid]) grouped[kid] = { name, logs: [] };
      grouped[kid].logs.push(l);
    });

    // ── Render ────────────────────────────────────────────────────────────
    listEl.innerHTML = Object.entries(grouped).map(([kid, group]) => {
      const logsHtml = group.logs.map(l => _buildTSLogCard(l)).join('');
      const doneCount = group.logs.filter(l => l.is_complete).length;
      return `
        <div class="ts-kandang-group">
          <div class="ts-kandang-header">
            <span class="material-icons-round">home_work</span>
            <span class="ts-kandang-name">${group.name}</span>
            <span class="ts-kandang-badge">${doneCount}/${group.logs.length} selesai</span>
          </div>
          ${logsHtml}
        </div>`;
    }).join('');

  } catch (e) {
    console.error('[TS Report] error:', e.message);
    listEl.innerHTML = `
      <div class="empty-state">
        <span class="material-icons-round" style="font-size:48px;color:var(--error)">error_outline</span>
        <p class="body-medium secondary-text">Gagal memuat laporan: ${e.message}</p>
      </div>`;
  }
}

function _buildTSLogCard(l) {
  const tanggal = l.tanggal
    ? new Date(l.tanggal).toLocaleDateString('id-ID', { weekday:'short', day:'numeric', month:'short' })
    : '-';

  const isDone    = l.is_complete;
  const mati      = l.mati ?? '-';
  const culling   = l.culling ?? '-';
  const pakan     = l.pakan_total ? l.pakan_total.toFixed(1) + ' kg' : '-';
  const berat     = l.berat_rata_rata ? l.berat_rata_rata + ' g' : '-';

  // Warna alert mortalitas
  const kapasitas = l.kandang?.kapasitas || 1000;
  const mortalityPct = l.mati ? (l.mati / kapasitas * 100) : 0;
  const matiClass = mortalityPct >= 2 ? 'alert' : mortalityPct >= 1 ? 'warn' : '';

  // Warna berat vs target
  const targetBerat = getTargetWeight(l.hari, 'Cobb 500');
  let beratClass = '';
  if (l.berat_rata_rata && targetBerat) {
    const dev = Math.abs(l.berat_rata_rata - targetBerat) / targetBerat * 100;
    beratClass = dev > 10 ? 'alert' : dev > 5 ? 'warn' : 'good';
  }

  return `
    <div class="ts-log-card">
      <div class="ts-log-header">
        <div>
          <span class="ts-log-day">Hari ${l.hari || '-'}</span>
          <span class="ts-log-date" style="margin-left:8px">${tanggal}</span>
        </div>
        <span class="ts-log-complete ${isDone ? 'done' : 'pending'}">
          ${isDone ? '✓ Selesai' : '⏳ Belum'}
        </span>
      </div>
      <div class="ts-log-metrics">
        <div class="ts-metric ${matiClass}">
          <div class="val">${mati}</div>
          <div class="lbl">Mati</div>
        </div>
        <div class="ts-metric">
          <div class="val">${culling}</div>
          <div class="lbl">Afkir</div>
        </div>
        <div class="ts-metric">
          <div class="val">${pakan}</div>
          <div class="lbl">Pakan</div>
        </div>
        <div class="ts-metric ${beratClass}">
          <div class="val">${berat}</div>
          <div class="lbl">Berat</div>
        </div>
      </div>
      ${l.catatan ? `<div style="margin-top:8px;font-size:12px;color:var(--secondary-text);padding:6px 8px;background:var(--surface-variant);border-radius:6px">${l.catatan}</div>` : ''}
    </div>`;
}

// ============================================================
// ===== OPERATOR TARGET BANNER =====
// Tampilkan target pakan & berat hari ini dari TS
// ============================================================

async function _loadOperatorTargetBanner() {
  const banner = document.getElementById('operator-target-banner');
  const rowEl  = document.getElementById('op-target-row');
  const nameEl = document.getElementById('op-target-kandang-name');
  if (!banner || !rowEl) return;

  // Ambil kandang operator dari profile
  const kandangId = AUTH.kandangId;
  if (!kandangId) {
    banner.classList.add('hidden');
    return;
  }

  // Tampilkan nama operator
  const flock = DB.flocks.find(f => (f._dbId || f.id) === kandangId);
  if (nameEl) nameEl.textContent = AUTH.userName || '-';

  // Ambil hari ke- saat ini
  const day = getCurrentDay();
  const today = new Date().toISOString().split('T')[0];

  try {
    // Query target pakan & berat untuk hari ini
    const [targetPakan, targetBerat] = await Promise.all([
      PeriodTargets.getForDay(kandangId, 'pakan', today),
      PeriodTargets.getForDay(kandangId, 'berat', today)
    ]);

    // Ambil nilai aktual dari log hari ini
    const log = getTodayLog();
    const aktualPakan = log ? ((log.feed_am || 0) + (log.feed_pm || 0)) : null;
    const aktualBerat = log?.weight || null;

    const items = [];

    // Item target pakan
    if (targetPakan?.nilai_target) {
      const target = parseFloat(targetPakan.nilai_target);
      // Konversi g/ekor ke kg total (target dalam g/ekor, input dalam kg)
      const flock = DB.flocks.find(f => f.active);
      const pop   = flock ? (flock.current_qty || flock.qty || 1000) : 1000;
      const targetKg = Math.round(target * pop / 1000 * 10) / 10;

      let status = 'no-input';
      let aktualText = 'Belum diisi';
      if (aktualPakan !== null && aktualPakan > 0) {
        const pct = aktualPakan / targetKg * 100;
        status = pct >= 90 ? 'on-track' : 'off-track';
        aktualText = aktualPakan.toFixed(1) + ' kg';
      }

      items.push({
        type: 'pakan', icon: 'grain', color: '#F59E0B',
        label: 'Target Pakan',
        value: targetKg, unit: 'kg/hari',
        aktual: aktualText, status,
        hint: target + ' g/ekor'
      });
    }

    // Item target berat
    if (targetBerat?.nilai_target) {
      const target = parseFloat(targetBerat.nilai_target);
      let status = 'no-input';
      let aktualText = 'Belum ditimbang';
      if (aktualBerat) {
        const dev = Math.abs(aktualBerat - target) / target * 100;
        status = dev <= 10 ? 'on-track' : 'off-track';
        aktualText = aktualBerat + ' g';
      }

      items.push({
        type: 'berat', icon: 'monitor_weight', color: '#10B981',
        label: 'Target Berat',
        value: target, unit: 'gram',
        aktual: aktualText, status,
        hint: 'H-' + (targetBerat.hari_ke || day)
      });
    }

    // Fallback ke standar breed jika tidak ada target custom
    if (items.length === 0) {
      const breed = getActiveBreed();
      const stdPakan = getTargetFeed(day, breed);
      const stdBerat = getTargetWeight(day, breed);

      if (stdPakan) items.push({
        type: 'pakan', icon: 'grain', color: '#F59E0B',
        label: 'Std Pakan', value: stdPakan, unit: 'kg/hari',
        aktual: aktualPakan ? aktualPakan.toFixed(1) + ' kg' : 'Belum diisi',
        status: aktualPakan ? (aktualPakan >= stdPakan * 0.9 ? 'on-track' : 'off-track') : 'no-input',
        hint: 'Standar ' + breed
      });

      if (stdBerat) items.push({
        type: 'berat', icon: 'monitor_weight', color: '#10B981',
        label: 'Std Berat', value: stdBerat, unit: 'gram',
        aktual: aktualBerat ? aktualBerat + ' g' : 'Belum ditimbang',
        status: aktualBerat ? (Math.abs(aktualBerat - stdBerat) / stdBerat <= 0.1 ? 'on-track' : 'off-track') : 'no-input',
        hint: 'Standar ' + breed
      });
    }

    if (items.length === 0) {
      banner.classList.add('hidden');
      return;
    }

    // Render items
    rowEl.innerHTML = items.map(item => `
      <div class="op-target-item ${item.status}">
        <div class="op-target-type">
          <span class="material-icons-round" style="color:${item.color}">${item.icon}</span>
          ${item.label}
        </div>
        <div class="op-target-value">${item.value}</div>
        <div class="op-target-unit">${item.unit} &bull; ${item.hint}</div>
        <div class="op-target-actual ${item.status}">
          <span class="material-icons-round">
            ${item.status === 'on-track' ? 'check_circle' : item.status === 'off-track' ? 'warning' : 'radio_button_unchecked'}
          </span>
          ${item.aktual}
        </div>
      </div>`).join('');

    banner.classList.remove('hidden');

  } catch (e) {
    console.warn('[Operator] loadTargetBanner error:', e.message);
    banner.classList.add('hidden');
  }
}

// Jadwal obat hari ini untuk operator
async function _loadOperatorMedBanner() {
  // Cek apakah sudah ada banner, jika belum buat
  let medBanner = document.getElementById('operator-med-banner');

  const kandangId = AUTH.kandangId;
  if (!kandangId) return;

  try {
    const schedule = await Medication.getTodaySchedule(kandangId);
    if (!schedule.length) {
      if (medBanner) medBanner.remove();
      return;
    }

    // Buat banner jika belum ada
    if (!medBanner) {
      medBanner = document.createElement('div');
      medBanner.id = 'operator-med-banner';
      medBanner.className = 'op-med-banner';

      // Insert setelah target banner
      const targetBanner = document.getElementById('operator-target-banner');
      if (targetBanner && targetBanner.parentNode) {
        targetBanner.parentNode.insertBefore(medBanner, targetBanner.nextSibling);
      }
    }

    medBanner.innerHTML = `
      <div class="op-med-header">
        <span class="material-icons-round">vaccines</span>
        Jadwal Obat/Vaksin Hari Ini
      </div>
      <div class="op-med-list">
        ${schedule.map(s => {
          const info = Medication.getTypeInfo(s.medication_type);
          const isDone = s.log_status === 'completed' || s.log_status === 'skipped';
          return `
            <div class="op-med-item">
              <span class="material-icons-round" style="color:${info.color}">${info.icon}</span>
              <div style="flex:1;min-width:0">
                <div class="op-med-item-name">${s.nama_produk}</div>
                <div class="op-med-item-dose">
                  ${s.dosis ? s.dosis + ' ' + (s.satuan || '') + ' &bull; ' : ''}
                  ${s.cara_pemberian || ''} &bull; H-${s.hari_ke}
                </div>
              </div>
              ${isDone
                ? `<span class="op-med-item-status done">✓ Selesai</span>`
                : `<button class="op-med-item-status pending" style="border:none;cursor:pointer"
                     onclick="openGiveMedModal('${s.item_id}','${kandangId}',${s.hari_ke},'${s.nama_produk}','${s.satuan||''}',${s.dosis||0})">
                     Catat
                   </button>`
              }
            </div>`;
        }).join('')}
      </div>`;

  } catch (e) {
    console.warn('[Operator] loadMedBanner error:', e.message);
  }
}

// Re-load target banner saat input pakan berubah (real-time feedback)
const _origCalcFeedTotal = calcFeedTotal;
calcFeedTotal = function() {
  _origCalcFeedTotal();
  if (AUTH.role === 'operator') {
    clearTimeout(window._targetBannerTimer);
    window._targetBannerTimer = setTimeout(_loadOperatorTargetBanner, 600);
  }
};

// ============================================================
// ===== FEED CODE LOADER =====
// Ambil kode pakan dari data pengiriman, fallback ke list default
// ============================================================

// Default feed codes jika belum ada pengiriman
const FEED_CODE_DEFAULTS = ['BR-1','BR-2','BR-3','511','512','594','BR-1P','BR-2P'];

async function _loadFeedCodes() {
  const sel = document.getElementById('input-feed-code');
  if (!sel) return;

  const currentVal = sel.value; // simpan nilai yang sedang dipilih

  try {
    const client = AUTH.getSupabase();
    if (!client) throw new Error('no client');

    // Ambil kandang aktif
    const activeFlock = DB.flocks.find(f => f.active);
    const kandangId   = activeFlock ? (activeFlock._dbId || activeFlock.id) : null;

    // Query item_name dari deliveries tipe pakan
    let q = client
      .from('deliveries')
      .select('item_name')
      .eq('delivery_type', 'pakan')
      .order('tanggal_kirim', { ascending: false });

    // Filter per kandang jika operator
    if (AUTH.role === 'operator' && kandangId) {
      q = q.eq('kandang_id', kandangId);
    }

    const { data, error } = await q;

    let codes = [];

    if (!error && data && data.length > 0) {
      // Ambil nama unik dari pengiriman
      codes = [...new Set(data.map(d => d.item_name).filter(Boolean))];
    }

    // Fallback ke default jika tidak ada data pengiriman
    if (codes.length === 0) {
      codes = FEED_CODE_DEFAULTS;
    }

    // Rebuild options
    const prevVal = currentVal || sel.value;
    sel.innerHTML = codes.map(code =>
      `<option value="${code}" ${code === prevVal ? 'selected' : ''}>${code}</option>`
    ).join('');

    // Jika nilai sebelumnya tidak ada di list baru, tambahkan
    if (prevVal && !codes.includes(prevVal)) {
      sel.innerHTML = `<option value="${prevVal}" selected>${prevVal}</option>` + sel.innerHTML;
    }

  } catch (e) {
    // Fallback ke default tanpa error
    const prevVal = sel.value;
    sel.innerHTML = FEED_CODE_DEFAULTS.map(code =>
      `<option value="${code}" ${code === prevVal ? 'selected' : ''}>${code}</option>`
    ).join('');
  }
}


// ===== PANEN MANAGEMENT =====
let currentPanenTab = 'all';
let allPanen = [];
let currentPanenId = null;
let currentTimbangRows = [];

async function loadPanen() {
  try {
    allPanen = await Panen.getAll();
    return allPanen;
  } catch (e) {
    console.error('[APP] loadPanen error:', e.message);
    return [];
  }
}

function renderPanen() {
  const list = document.getElementById('panen-list');
  if (!list) return;

  // Filter by tab
  let filtered = allPanen;
  if (currentPanenTab !== 'all') {
    filtered = allPanen.filter(p => p.status === currentPanenTab);
  }

  // Update stats
  document.getElementById('panen-total-count').textContent = allPanen.length;
  const thisMonth = allPanen.filter(p => {
    const date = new Date(p.tanggal_panen);
    const now = new Date();
    return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
  }).length;
  document.getElementById('panen-bulan-ini').textContent = thisMonth;

  if (!filtered.length) {
    list.innerHTML = '<div class="empty-state">' +
      '<span class="material-icons-round" style="font-size:48px;color:var(--hint)">agriculture</span>' +
      '<p class="body-medium secondary-text">Belum ada data panen</p>' +
      '</div>';
    return;
  }

  list.innerHTML = filtered.map(p => {
    const statusColor = Panen.getStatusColor(p.status);
    const statusLabel = Panen.formatStatus(p.status);
    const kandangName = p.kandang ? p.kandang.name : 'Kandang tidak diketahui';
    const tanggal = Panen.formatDate(p.tanggal_panen);

    return '<div class="panen-card" onclick="openPanenDetail(\'' + p.id + '\')">' +
      '<div class="panen-card-header">' +
        '<div>' +
          '<div class="panen-card-title">' + kandangName + '</div>' +
          '<div class="panen-card-subtitle">' + tanggal + ' • Umur ' + p.umur_hari + ' hari</div>' +
        '</div>' +
        '<span class="panen-status-badge ' + p.status + '">' + statusLabel + '</span>' +
      '</div>' +
      '<div class="panen-card-stats">' +
        '<div class="panen-stat">' +
          '<div class="panen-stat-val">' + (p.total_ekor || 0) + '</div>' +
          '<div class="panen-stat-lbl">Ekor</div>' +
        '</div>' +
        '<div class="panen-stat">' +
          '<div class="panen-stat-val">' + (p.total_berat || 0) + '</div>' +
          '<div class="panen-stat-lbl">Total (kg)</div>' +
        '</div>' +
        '<div class="panen-stat">' +
          '<div class="panen-stat-val">' + (p.berat_rata_rata || 0) + '</div>' +
          '<div class="panen-stat-lbl">Rata-rata (kg)</div>' +
        '</div>' +
      '</div>' +
      '</div>';
  }).join('');
}

function switchPanenTab(tab, btn) {
  currentPanenTab = tab;
  document.querySelectorAll('#page-panen .tab-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderPanen();
}

function filterPanen() {
  // TODO: Implement advanced filter
  showToast('🚧 Fitur filter akan segera hadir');
}

function showAddPanenModal() {
  // Populate kandang dropdown
  const select = document.getElementById('panen-kandang');
  const activeFlocks = DB.flocks.filter(f => f.active);
  
  select.innerHTML = '<option value="">Pilih kandang...</option>' +
    activeFlocks.map(f => '<option value="' + (f._dbId || f.id) + '">' + f.name + '</option>').join('');

  // Set default date to today
  document.getElementById('panen-tanggal').value = new Date().toISOString().split('T')[0];
  
  // Set penimbang to current user
  document.getElementById('panen-penimbang').value = AUTH.userName || '';

  document.getElementById('modal-add-panen').classList.remove('hidden');
}

function onPanenKandangChange() {
  const kandangId = document.getElementById('panen-kandang').value;
  const tanggal = document.getElementById('panen-tanggal').value;
  
  if (!kandangId || !tanggal) return;

  // Calculate umur
  const flock = DB.flocks.find(f => (f._dbId || f.id) === kandangId);
  if (flock && flock.startDate) {
    const start = new Date(flock.startDate);
    const panen = new Date(tanggal);
    const diffDays = Math.floor((panen - start) / (1000 * 60 * 60 * 24));
    document.getElementById('panen-umur').value = diffDays;
  }
}

async function createPanen() {
  const kandangId = document.getElementById('panen-kandang').value;
  const tanggal = document.getElementById('panen-tanggal').value;
  const umur = parseInt(document.getElementById('panen-umur').value);
  const penimbang = document.getElementById('panen-penimbang').value.trim();

  if (!kandangId) { showToast('⚠️ Pilih kandang'); return; }
  if (!tanggal) { showToast('⚠️ Pilih tanggal panen'); return; }
  if (!umur || umur <= 0) { showToast('⚠️ Umur tidak valid'); return; }

  showToast('⏳ Membuat panen...');

  const result = await Panen.create({
    kandang_id: kandangId,
    tanggal_panen: tanggal,
    umur_hari: umur,
    penimbang_id: AUTH.userId
  });

  if (result.error) {
    showToast('❌ Gagal: ' + result.error);
    return;
  }

  closeModal('modal-add-panen');
  showToast('✓ Panen berhasil dibuat');
  
  // Reload and open detail
  await loadPanen();
  renderPanen();
  openPanenDetail(result.data.id);
}

async function openPanenDetail(panenId) {
  currentPanenId = panenId;
  const panen = await Panen.getById(panenId);
  
  if (!panen) {
    showToast('⚠️ Data panen tidak ditemukan');
    return;
  }

  // Set title
  document.getElementById('panen-detail-title').textContent = 'Panen ' + (panen.kandang ? panen.kandang.name : '');
  document.getElementById('panen-detail-subtitle').textContent = Panen.formatDate(panen.tanggal_panen) + ' • ' + Panen.formatStatus(panen.status);

  // Set info
  document.getElementById('panen-info-kandang').textContent = panen.kandang ? panen.kandang.name : '-';
  document.getElementById('panen-info-tanggal').textContent = Panen.formatDate(panen.tanggal_panen);
  document.getElementById('panen-info-umur').textContent = panen.umur_hari + ' hari';
  document.getElementById('panen-info-penimbang').textContent = panen.penimbang ? panen.penimbang.nama : AUTH.userName;

  // Load timbang rows
  currentTimbangRows = panen.timbang_rows || [];
  renderTimbangTable();
  updatePanenSummary();

  // Show/hide form based on status
  const isCompleted = panen.status === 'completed';
  document.getElementById('panen-timbang-form').style.display = isCompleted ? 'none' : 'block';
  document.getElementById('btn-complete-panen').style.display = isCompleted ? 'none' : 'block';

  document.getElementById('modal-panen-detail').classList.remove('hidden');
}

function renderTimbangTable() {
  const tbody = document.getElementById('timbang-table-body');
  
  if (!currentTimbangRows.length) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--hint)">Belum ada data timbang</td></tr>';
    return;
  }

  tbody.innerHTML = currentTimbangRows.map((row, idx) => {
    const totalBerat = row.berat * (row.jumlah_ekor || 1);
    return '<tr>' +
      '<td>' + (idx + 1) + '</td>' +
      '<td>' + row.berat.toFixed(2) + '</td>' +
      '<td>' + (row.jumlah_ekor || 1) + '</td>' +
      '<td>' + totalBerat.toFixed(2) + '</td>' +
      '<td>' + (row.catatan || '-') + '</td>' +
      '<td>' +
        '<button class="table-action-btn" onclick="deleteTimbangRow(\'' + row.id + '\')" title="Hapus">' +
          '<span class="material-icons-round" style="font-size:18px">delete</span>' +
        '</button>' +
      '</td>' +
      '</tr>';
  }).join('');
}

function updatePanenSummary() {
  const summary = Panen.calculateSummary(currentTimbangRows);
  
  document.getElementById('panen-summary-ekor').textContent = summary.total_ekor;
  document.getElementById('panen-summary-berat').textContent = summary.total_berat.toFixed(2) + ' kg';
  document.getElementById('panen-summary-rata').textContent = summary.berat_rata_rata.toFixed(2) + ' kg';
  document.getElementById('panen-summary-minmax').textContent = summary.berat_min.toFixed(2) + ' - ' + summary.berat_max.toFixed(2) + ' kg';
}

async function addTimbangRow() {
  const berat = parseFloat(document.getElementById('timbang-berat').value);
  const jumlah = parseInt(document.getElementById('timbang-jumlah').value) || 1;
  const catatan = document.getElementById('timbang-catatan').value.trim();

  if (!berat || berat <= 0) { showToast('⚠️ Masukkan berat yang valid'); return; }
  if (jumlah <= 0) { showToast('⚠️ Jumlah ekor minimal 1'); return; }

  showToast('⏳ Menambah data timbang...');

  const result = await Panen.addTimbang(currentPanenId, {
    berat: berat,
    jumlah_ekor: jumlah,
    catatan: catatan || null
  });

  if (result.error) {
    showToast('❌ Gagal: ' + result.error);
    return;
  }

  // Clear form
  document.getElementById('timbang-berat').value = '';
  document.getElementById('timbang-jumlah').value = '1';
  document.getElementById('timbang-catatan').value = '';

  // Reload timbang rows
  currentTimbangRows.push(result.data);
  renderTimbangTable();
  updatePanenSummary();
  
  showToast('✓ Data timbang ditambahkan');
}

async function deleteTimbangRow(timbangId) {
  if (!confirm('Hapus data timbang ini?')) return;

  showToast('⏳ Menghapus...');

  const result = await Panen.deleteTimbang(timbangId);
  
  if (result.error) {
    showToast('❌ Gagal: ' + result.error);
    return;
  }

  // Remove from array
  currentTimbangRows = currentTimbangRows.filter(r => r.id !== timbangId);
  renderTimbangTable();
  updatePanenSummary();
  
  showToast('✓ Data timbang dihapus');
}

async function completePanen() {
  if (!currentTimbangRows.length) {
    showToast('⚠️ Tambahkan minimal 1 data timbang');
    return;
  }

  const confirmed = confirm(
    'Selesaikan panen ini?\n\n' +
    'Setelah diselesaikan, data tidak bisa diubah lagi.'
  );
  
  if (!confirmed) return;

  showToast('⏳ Menyelesaikan panen...');

  const summary = Panen.calculateSummary(currentTimbangRows);
  const result = await Panen.complete(currentPanenId, summary);

  if (result.error) {
    showToast('❌ Gagal: ' + result.error);
    return;
  }

  closeModal('modal-panen-detail');
  showToast('✓ Panen berhasil diselesaikan');
  
  // Reload
  await loadPanen();
  renderPanen();
}

async function exportPanenPDF() {
  showToast('⏳ Generating PDF...');

  const result = await Panen.generatePDF(currentPanenId);
  
  if (result.error) {
    showToast('❌ Gagal: ' + result.error);
    return;
  }

  // TODO: Implement actual PDF generation
  showToast('🚧 Fitur export PDF akan segera hadir');
}

function closeModal(modalId) {
  document.getElementById(modalId).classList.add('hidden');
}
