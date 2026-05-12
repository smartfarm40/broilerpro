# 🔄 Sistem Update Aplikasi - BroilerPro

Dokumentasi lengkap sistem update otomatis untuk PWA BroilerPro.

---

## ✨ **Fitur Update System**

1. ✅ **Auto-detect update** - Cek update otomatis setiap 30 detik
2. ✅ **Notifikasi visual** - Banner cantik dengan animasi
3. ✅ **One-click install** - Klik "Install Update" untuk update
4. ✅ **Auto clear cache** - Hapus cache lama otomatis
5. ✅ **Auto reload** - Reload aplikasi setelah update selesai
6. ✅ **Version tracking** - Track versi aplikasi

---

## 🎯 **Cara Kerja**

### **1. Developer Push Update**

```bash
# 1. Update versi di sw.js
const CACHE_VERSION = 'broilerpro-v2.1';
const APP_VERSION = '2.1';

# 2. Commit & push ke GitHub
git add .
git commit -m "feat: Update to v2.1"
git push origin main

# 3. Vercel auto-deploy (1-2 menit)
```

### **2. User Mendapat Notifikasi**

Saat user buka aplikasi:
1. ✅ Service Worker detect ada update baru
2. ✅ Download & install SW baru di background
3. ✅ Tampilkan notifikasi: **"Update Tersedia v2.1"**
4. ✅ User klik **"Install Update"**

### **3. Proses Install Update**

```javascript
// 1. Clear semua cache lama
await caches.keys().then(keys =>
  Promise.all(keys.map(k => caches.delete(k)))
);

// 2. Activate service worker baru
newWorker.postMessage({ type: 'SKIP_WAITING' });

// 3. Reload aplikasi
window.location.reload();
```

### **4. Aplikasi Terupdate**

- ✅ Cache lama terhapus
- ✅ Aplikasi versi baru aktif
- ✅ Toast: "Update berhasil! Aplikasi sekarang versi 2.1"

---

## 📝 **Cara Update Versi Aplikasi**

### **Step 1: Update Versi di sw.js**

```javascript
// File: sw.js
const CACHE_VERSION = 'broilerpro-v2.1';  // ← Ubah ini
const APP_VERSION = '2.1';                 // ← Ubah ini
```

### **Step 2: Update Versi di manifest.json**

```json
{
  "name": "BroilerPro",
  "version": "2.1",  // ← Ubah ini
  ...
}
```

### **Step 3: Update Versi di update-manager.js**

```javascript
// File: js/update-manager.js
const UpdateManager = {
  currentVersion: '2.1',  // ← Ubah ini
  ...
}
```

### **Step 4: Commit & Push**

```bash
git add sw.js manifest.json js/update-manager.js
git commit -m "chore: Bump version to 2.1"
git push origin main
```

### **Step 5: Vercel Auto-Deploy**

- ✅ Vercel detect push baru
- ✅ Build & deploy otomatis (1-2 menit)
- ✅ Aplikasi live di https://broilerpro.vercel.app

---

## 🎨 **Tampilan Notifikasi**

### **Desktop:**
```
┌─────────────────────────────────────────────────┐
│  🔄  Update Tersedia                            │
│      Versi 2.1 siap diinstall                   │
│                                                  │
│                    [📥 Install Update]    [✕]   │
└─────────────────────────────────────────────────┘
```

### **Mobile:**
```
┌──────────────────────────────────┐
│ 🔄 Update Tersedia               │
│    Versi 2.1 siap diinstall      │
│                                   │
│        [📥 Install Update]  [✕]  │
└──────────────────────────────────┘
```

---

## 🔧 **Konfigurasi**

### **Update Check Interval**

Default: 30 detik

```javascript
// File: js/update-manager.js
setInterval(() => {
  registration.update();
}, 30000);  // ← Ubah ini (dalam milliseconds)
```

### **Auto-Dismiss Notification**

Tambahkan auto-dismiss setelah X detik:

```javascript
// File: js/update-manager.js
showUpdateNotification() {
  // ... existing code ...
  
  // Auto-dismiss setelah 60 detik
  setTimeout(() => {
    this.dismissNotification();
  }, 60000);
}
```

---

## 🧪 **Testing Update System**

### **Test di Local:**

1. **Jalankan local server:**
   ```bash
   npx http-server -p 8080
   ```

2. **Buka di browser:**
   ```
   http://localhost:8080
   ```

3. **Update versi:**
   - Edit `sw.js`: ubah `CACHE_VERSION` dan `APP_VERSION`
   - Refresh browser (Ctrl+R)
   - Notifikasi update akan muncul

4. **Klik "Install Update":**
   - Cache lama terhapus
   - Aplikasi reload
   - Versi baru aktif

### **Test di Production:**

1. **Push update ke GitHub**
2. **Tunggu Vercel deploy** (1-2 menit)
3. **Buka aplikasi di HP/browser**
4. **Tunggu 30 detik** (auto-check update)
5. **Notifikasi muncul**
6. **Klik "Install Update"**

---

## 📊 **Monitoring Update**

### **Check Current Version:**

```javascript
// Di browser console
UpdateManager.getCurrentVersion().then(v => console.log('Version:', v));
```

### **Check Cache:**

```javascript
// Di browser console
caches.keys().then(keys => console.log('Caches:', keys));
```

### **Force Update Check:**

```javascript
// Di browser console
navigator.serviceWorker.getRegistration().then(reg => reg.update());
```

---

## 🐛 **Troubleshooting**

### **Problem: Notifikasi tidak muncul**

**Solusi:**
1. Cek console browser (F12)
2. Pastikan Service Worker aktif:
   ```javascript
   navigator.serviceWorker.getRegistration()
   ```
3. Force update:
   ```javascript
   navigator.serviceWorker.getRegistration().then(reg => reg.update())
   ```

### **Problem: Update tidak terinstall**

**Solusi:**
1. Hard refresh: `Ctrl + Shift + R`
2. Clear cache manual: Settings → Privacy → Clear cache
3. Unregister SW:
   ```javascript
   navigator.serviceWorker.getRegistration().then(reg => reg.unregister())
   ```
4. Reload halaman

### **Problem: Cache tidak terhapus**

**Solusi:**
1. Cek cache di DevTools: Application → Cache Storage
2. Hapus manual semua cache
3. Reload aplikasi

---

## 📱 **User Experience Flow**

### **Scenario 1: User Aktif (Aplikasi Terbuka)**

```
1. User buka aplikasi
2. SW detect update (30 detik)
3. Notifikasi muncul: "Update Tersedia v2.1"
4. User klik "Install Update"
5. Loading: "Menginstall update..."
6. Cache lama terhapus
7. Aplikasi reload otomatis
8. Toast: "Update berhasil! Versi 2.1"
```

### **Scenario 2: User Pasif (Aplikasi Tertutup)**

```
1. User tutup aplikasi
2. Developer push update v2.1
3. User buka aplikasi lagi (besok)
4. SW detect update langsung
5. Notifikasi muncul
6. User klik "Install Update"
7. Update terinstall
```

### **Scenario 3: User Dismiss Notifikasi**

```
1. Notifikasi muncul
2. User klik [X] (dismiss)
3. Notifikasi hilang
4. Update tetap di-download di background
5. Next time buka app, notifikasi muncul lagi
```

---

## 🎯 **Best Practices**

### **1. Semantic Versioning**

```
v2.0.0 → Major (breaking changes)
v2.1.0 → Minor (new features)
v2.1.1 → Patch (bug fixes)
```

### **2. Update Frequency**

- ✅ **Bug fixes**: Update segera (v2.0.1)
- ✅ **New features**: Update mingguan (v2.1.0)
- ✅ **Major changes**: Update bulanan (v3.0.0)

### **3. Testing**

- ✅ Test di local dulu
- ✅ Test di staging (jika ada)
- ✅ Test di production dengan 1-2 user
- ✅ Rollout ke semua user

### **4. Rollback**

Jika ada masalah:
```bash
# Revert commit
git revert HEAD

# Push
git push origin main

# Vercel auto-deploy versi lama
```

---

## 📚 **File yang Terlibat**

| File | Fungsi |
|------|--------|
| `sw.js` | Service Worker (cache & update logic) |
| `js/update-manager.js` | Update notification & install logic |
| `css/style.css` | Styling notifikasi update |
| `manifest.json` | App metadata & version |
| `index.html` | Load update-manager.js |

---

## ✅ **Checklist Update**

Sebelum push update:

- [ ] Update `CACHE_VERSION` di `sw.js`
- [ ] Update `APP_VERSION` di `sw.js`
- [ ] Update `version` di `manifest.json`
- [ ] Update `currentVersion` di `update-manager.js`
- [ ] Test di local
- [ ] Commit dengan message jelas
- [ ] Push ke GitHub
- [ ] Tunggu Vercel deploy
- [ ] Test di production

---

## 🎉 **Summary**

Sistem update BroilerPro:
- ✅ **Otomatis** - Detect & download update di background
- ✅ **User-friendly** - Notifikasi cantik & simple
- ✅ **One-click** - Klik "Install Update" selesai
- ✅ **Clean** - Auto clear cache lama
- ✅ **Fast** - Reload & aktif dalam 2 detik

**User tidak perlu uninstall/reinstall manual!** 🚀
