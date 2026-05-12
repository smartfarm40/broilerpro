// ===== UPDATE MANAGER =====
// Mengelola notifikasi update aplikasi PWA

const UpdateManager = {
  newWorker: null,
  currentVersion: '2.1',

  // ---- Initialize update checker ----
  init() {
    if (!('serviceWorker' in navigator)) {
      console.warn('[UpdateManager] Service Worker tidak didukung');
      return;
    }

    // Listen untuk update dari service worker
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      console.log('[UpdateManager] Controller changed, reloading...');
      // Reload halaman setelah SW baru aktif
      window.location.reload();
    });

    // Listen untuk message dari service worker
    navigator.serviceWorker.addEventListener('message', event => {
      if (event.data && event.data.type === 'UPDATE_COMPLETE') {
        console.log('[UpdateManager] Update complete:', event.data.version);
        this.showUpdateCompleteToast(event.data.version);
      }
    });

    // Check untuk update
    this.checkForUpdates();
  },

  // ---- Check for updates ----
  async checkForUpdates() {
    try {
      const registration = await navigator.serviceWorker.getRegistration();
      if (!registration) return;

      // Check for updates setiap 30 detik
      setInterval(() => {
        registration.update();
      }, 30000);

      // Listen untuk SW baru yang waiting
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        console.log('[UpdateManager] Update found, installing...');

        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            // Ada SW baru yang waiting
            console.log('[UpdateManager] New SW waiting');
            this.newWorker = newWorker;
            this.showUpdateNotification();
          }
        });
      });

      // Check jika sudah ada SW yang waiting
      if (registration.waiting) {
        this.newWorker = registration.waiting;
        this.showUpdateNotification();
      }
    } catch (error) {
      console.error('[UpdateManager] Error checking updates:', error);
    }
  },

  // ---- Show update notification ----
  showUpdateNotification() {
    // Buat notifikasi update
    const notification = document.createElement('div');
    notification.id = 'update-notification';
    notification.className = 'update-notification';
    notification.innerHTML = `
      <div class="update-notification-content">
        <div class="update-notification-icon">
          <span class="material-icons-round">system_update</span>
        </div>
        <div class="update-notification-text">
          <div class="update-notification-title">Update Tersedia</div>
          <div class="update-notification-subtitle">Versi ${this.currentVersion} siap diinstall</div>
        </div>
        <button class="update-notification-btn" onclick="UpdateManager.installUpdate()">
          <span class="material-icons-round">download</span>
          Install Update
        </button>
        <button class="update-notification-close" onclick="UpdateManager.dismissNotification()">
          <span class="material-icons-round">close</span>
        </button>
      </div>
    `;

    // Hapus notifikasi lama jika ada
    const oldNotification = document.getElementById('update-notification');
    if (oldNotification) {
      oldNotification.remove();
    }

    // Tambahkan ke body
    document.body.appendChild(notification);

    // Animate in
    setTimeout(() => {
      notification.classList.add('show');
    }, 100);

    // Auto show toast
    this.showToast('🔔 Update aplikasi tersedia! Klik "Install Update" untuk memperbarui.');
  },

  // ---- Install update ----
  async installUpdate() {
    if (!this.newWorker) {
      console.warn('[UpdateManager] No new worker available');
      return;
    }

    // Show loading
    this.showToast('⏳ Menginstall update...');

    // Hapus notifikasi
    this.dismissNotification();

    try {
      // 1. Clear all caches (hapus cache lama)
      console.log('[UpdateManager] Clearing old caches...');
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames.map(cacheName => {
          console.log('[UpdateManager] Deleting cache:', cacheName);
          return caches.delete(cacheName);
        })
      );

      // 2. Tell SW to skip waiting
      console.log('[UpdateManager] Telling SW to skip waiting...');
      this.newWorker.postMessage({ type: 'SKIP_WAITING' });

      // 3. Reload akan terjadi otomatis via controllerchange event
      // Tapi kita tambahkan fallback timeout
      setTimeout(() => {
        console.log('[UpdateManager] Force reload...');
        window.location.reload();
      }, 2000);

    } catch (error) {
      console.error('[UpdateManager] Error installing update:', error);
      this.showToast('❌ Gagal install update. Silakan refresh manual.');
    }
  },

  // ---- Dismiss notification ----
  dismissNotification() {
    const notification = document.getElementById('update-notification');
    if (notification) {
      notification.classList.remove('show');
      setTimeout(() => {
        notification.remove();
      }, 300);
    }
  },

  // ---- Show update complete toast ----
  showUpdateCompleteToast(version) {
    this.showToast(`✅ Update berhasil! Aplikasi sekarang versi ${version}`);
  },

  // ---- Show toast helper ----
  showToast(message) {
    // Gunakan toast yang sudah ada di app.js jika tersedia
    if (typeof showToast === 'function') {
      showToast(message);
    } else {
      // Fallback: console log
      console.log('[UpdateManager]', message);
    }
  },

  // ---- Get current version ----
  async getCurrentVersion() {
    try {
      const registration = await navigator.serviceWorker.getRegistration();
      if (!registration || !registration.active) return 'unknown';

      return new Promise((resolve) => {
        const messageChannel = new MessageChannel();
        messageChannel.port1.onmessage = (event) => {
          resolve(event.data.version || 'unknown');
        };
        registration.active.postMessage(
          { type: 'GET_VERSION' },
          [messageChannel.port2]
        );
      });
    } catch (error) {
      console.error('[UpdateManager] Error getting version:', error);
      return 'unknown';
    }
  }
};

// Auto-initialize saat DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    UpdateManager.init();
  });
} else {
  UpdateManager.init();
}

// Export untuk digunakan di tempat lain
window.UpdateManager = UpdateManager;

console.log('✅ Update Manager initialized');
