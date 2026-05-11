// ===== PERMISSION GUARDS =====
// Helper functions untuk hide/show UI berdasarkan permissions

const PermissionGuards = {

  // ---- Apply guards ke seluruh halaman ----
  applyAll() {
    this.hideCostElements();
    this.hideDeliveryElements();
    this.filterKandangForOperator();
    this.disableButtonsByPermission();
    this.applyRoleSpecificUI();
  },

  // ---- Hide cost/harga dari UI (untuk TS, Operator, Viewer) ----
  hideCostElements() {
    if (AUTH.can('cost.view')) return; // Jika bisa lihat cost, skip

    // Hide semua elemen dengan class atau attribute cost
    const selectors = [
      '.cost-only',
      '.price-only',
      '[data-cost]',
      '[data-price]',
      '.harga-column',
      '.biaya-column',
      '.total-cost',
      '.profit-column'
    ];

    selectors.forEach(selector => {
      document.querySelectorAll(selector).forEach(el => {
        el.style.display = 'none';
      });
    });

    // Hide menu cost produksi
    const costMenuItems = document.querySelectorAll('[data-page="cost"], [href*="cost"]');
    costMenuItems.forEach(el => el.style.display = 'none');

    // Hide kolom harga di inventory
    if (!AUTH.can('inventory.view_cost')) {
      document.querySelectorAll('.inv-item-price, .inventory-price').forEach(el => {
        el.style.display = 'none';
      });
    }

    // Hide laporan cost
    if (!AUTH.can('report.cost')) {
      document.querySelectorAll('[data-report="cost"], .report-cost').forEach(el => {
        el.style.display = 'none';
      });
    }
  },

  // ---- Hide delivery/pengiriman (untuk TS, Operator, Viewer) ----
  hideDeliveryElements() {
    if (AUTH.can('delivery.view')) return; // Jika bisa lihat delivery, skip

    // Hide menu pengiriman
    const deliveryMenuItems = document.querySelectorAll('[data-page="delivery"], [href*="delivery"], [href*="pengiriman"]');
    deliveryMenuItems.forEach(el => el.style.display = 'none');

    // Hide tombol input pengiriman
    document.querySelectorAll('[onclick*="showDeliveryModal"], [onclick*="addDelivery"]').forEach(el => {
      el.style.display = 'none';
    });
  },

  // ---- Filter kandang untuk operator (hanya assigned) ----
  filterKandangForOperator() {
    if (AUTH.can('kandang.view_all')) return; // Jika bisa lihat semua, skip

    // Operator hanya bisa lihat kandang assigned
    // Filter akan diterapkan di query level (data.js)
    // Di sini kita hide tombol "Tambah Kandang"
    if (!AUTH.can('kandang.create')) {
      document.querySelectorAll('[onclick*="showAddFlockModal"], [onclick*="addKandang"]').forEach(el => {
        el.style.display = 'none';
      });
    }
  },

  // ---- Disable buttons berdasarkan permission ----
  disableButtonsByPermission() {
    // Mapping button action ke permission
    const buttonPermissions = {
      'showAddFlockModal':     'kandang.create',
      'addFlock':              'kandang.create',
      'editFlock':             'kandang.edit',
      'deleteFlock':           'kandang.delete',
      'completeDay':           'log.complete',
      'saveProgress':          'log.create',
      'editLog':               'log.edit',
      'deleteLog':             'log.delete',
      'showAddTargetModal':    'target.create',
      'editTarget':            'target.edit',
      'deleteTarget':          'target.delete',
      'showVisitModal':        'visit.create',
      'editVisit':             'visit.edit',
      'deleteVisit':           'visit.delete',
      'completeVisit':         'visit.complete',
      'showMedicationModal':   'medication.create',
      'editMedication':        'medication.edit',
      'deleteMedication':      'medication.delete',
      'executeMedication':     'medication.execute',
      'updateStock':           'inventory.edit',
      'editInventory':         'inventory.edit',
      'showInviteMemberModal': 'member.invite',
      'editMember':            'member.edit',
      'removeMember':          'member.remove',
      'editSettings':          'settings.edit',
      'exportReport':          'report.export'
    };

    // Iterate semua buttons dan check permission
    Object.entries(buttonPermissions).forEach(([action, permission]) => {
      if (!AUTH.can(permission)) {
        // Hide atau disable button
        document.querySelectorAll(`[onclick*="${action}"]`).forEach(el => {
          el.style.display = 'none';
          // Atau bisa disable saja:
          // el.disabled = true;
          // el.style.opacity = '0.5';
          // el.style.cursor = 'not-allowed';
        });
      }
    });
  },

  // ---- Apply UI khusus per role ----
  applyRoleSpecificUI() {
    const role = AUTH.role;

    // TS: Hide cost, show target & visit
    if (role === 'ts') {
      // Highlight menu target & jadwal kunjungan
      document.querySelectorAll('[data-page="target"], [data-page="visit"]').forEach(el => {
        el.classList.add('role-highlight');
      });
    }

    // Staff: Hide target edit, show cost & delivery
    if (role === 'staff') {
      // Highlight menu cost & delivery
      document.querySelectorAll('[data-page="cost"], [data-page="delivery"]').forEach(el => {
        el.classList.add('role-highlight');
      });
      // Disable edit target
      document.querySelectorAll('[onclick*="editTarget"], [onclick*="deleteTarget"]').forEach(el => {
        el.style.display = 'none';
      });
    }

    // Operator: Minimal UI
    if (role === 'operator') {
      // Hide semua menu kecuali dashboard, daily, settings
      const allowedPages = ['dashboard', 'daily', 'settings'];
      document.querySelectorAll('.nav-item').forEach(el => {
        const page = el.getAttribute('data-page');
        if (page && !allowedPages.includes(page)) {
          el.style.display = 'none';
        }
      });
    }

    // Viewer: Read-only mode
    if (role === 'viewer') {
      // Disable semua form inputs
      document.querySelectorAll('input, textarea, select, button[type="submit"]').forEach(el => {
        if (!el.classList.contains('nav-item') && !el.classList.contains('tab-btn')) {
          el.disabled = true;
          el.style.opacity = '0.6';
        }
      });
      // Show read-only badge
      const header = document.querySelector('.page-header .header-text');
      if (header && !document.getElementById('readonly-badge')) {
        const badge = document.createElement('span');
        badge.id = 'readonly-badge';
        badge.className = 'badge-pill';
        badge.style.cssText = 'background:rgba(239,68,68,0.1);color:#EF4444;font-size:11px;padding:4px 8px;margin-left:8px';
        badge.textContent = 'Read-Only';
        header.appendChild(badge);
      }
    }
  },

  // ---- Show permission denied message ----
  showPermissionDenied(action) {
    if (typeof showToast === 'function') {
      showToast('⚠️ Anda tidak punya izin untuk ' + action);
    } else {
      alert('Anda tidak punya izin untuk ' + action);
    }
  },

  // ---- Check permission before action ----
  checkPermission(permission, action) {
    if (!AUTH.can(permission)) {
      this.showPermissionDenied(action);
      return false;
    }
    return true;
  },

  // ---- Wrap function dengan permission check ----
  guard(permission, action, fn) {
    return function(...args) {
      if (!AUTH.can(permission)) {
        PermissionGuards.showPermissionDenied(action);
        return;
      }
      return fn.apply(this, args);
    };
  }
};

// ---- checkPerm: didefinisikan di app.js, tidak perlu duplikat di sini ----

// ---- Apply guards saat halaman load ----
window.addEventListener('load', () => {
  // Tunggu AUTH init selesai
  setTimeout(() => {
    if (AUTH.isLoggedIn) {
      PermissionGuards.applyAll();
    }
  }, 500);
});

// ---- Re-apply guards saat navigasi ----
// navigateTo di-patch oleh app.js — permission guards di-apply via applyRoleUI()
// Tidak perlu patch lagi di sini untuk menghindari konflik variabel
