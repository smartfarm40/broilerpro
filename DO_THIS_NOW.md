# ✅ DO THIS NOW - Simple Checklist

**Goal:** Register user dan test Sprint 1 & 2

---

## 📋 CHECKLIST (5 Menit Total)

### ☐ Step 1: Disable Email Confirmation (1 menit)
1. Buka: https://supabase.com/dashboard/project/rsqbxzhrainejnbxnvfw/auth/settings
2. Scroll ke "Email Auth"
3. **UNCHECK** "Enable email confirmations"
4. Klik "Save"

### ☐ Step 2: Register User (1 menit)
1. Buka: **http://localhost:8080/auto-register-ts.html**
2. Klik button **"Register User Sekarang"**
3. Tunggu sampai muncul "✅ Registrasi Berhasil!"
4. Auto redirect ke login page

### ☐ Step 3: Login (30 detik)
1. Login dengan:
   - Email: **drts@example.com**
   - Password: **password123**
2. Klik "Masuk"
3. Verify redirect ke dashboard

### ☐ Step 4: Test Permission System (1 menit)
1. Check nama di header: **"Drh. Rahmat S"**
2. Check menu "Kunjungan" **VISIBLE** ✅
3. Check menu "Cost Produksi" **HIDDEN** ✅
4. Buka console (F12) dan run:
   ```javascript
   console.log('Can view cost:', AUTH.can('cost.view')); // Should be false
   console.log('Can create visit:', AUTH.can('visit.create')); // Should be true
   ```

### ☐ Step 5: Test TS Visits (2 menit)
1. Klik menu **"Kunjungan"**
2. Klik **"Jadwalkan Kunjungan Baru"**
3. Isi form:
   - Kandang: **Kandang A**
   - Tanggal: **Besok**
   - Waktu: **09:00**
   - Tujuan: **Rutin**
   - Catatan: **"Test kunjungan"**
4. Klik **"Simpan"**
5. Verify visit card muncul ✅

### ☐ Step 6: Test Start Visit (30 detik)
1. Klik visit card yang baru dibuat
2. Klik **"Mulai Kunjungan"**
3. Verify status berubah **"Sedang Berlangsung"** ✅

### ☐ Step 7: Test Complete Visit (1 menit)
1. Klik **"Selesaikan"**
2. Check semua checklist items
3. Isi:
   - Catatan: **"Kunjungan lancar"**
   - Temuan: **"Ayam sehat"**
   - Rekomendasi: **"Pertahankan pakan"**
4. Klik **"Selesaikan"**
5. Verify status berubah **"Selesai"** ✅
6. Verify visit pindah ke tab **"Selesai"** ✅

---

## ✅ SUCCESS CRITERIA

Semua ini harus ✅:
- ☐ User berhasil register
- ☐ Berhasil login
- ☐ Nama muncul di header
- ☐ Menu "Kunjungan" visible
- ☐ Menu "Cost" hidden
- ☐ Bisa create visit
- ☐ Bisa start visit
- ☐ Bisa complete visit
- ☐ Checklist working
- ☐ Findings & recommendations working

---

## 🚀 QUICK LINKS

- **Auto Register:** http://localhost:8080/auto-register-ts.html
- **Login:** http://localhost:8080/auth/login.html
- **Dashboard:** http://localhost:8080/
- **Supabase Dashboard:** https://supabase.com/dashboard/project/rsqbxzhrainejnbxnvfw

---

## 🔑 CREDENTIALS

```
Email: drts@example.com
Password: password123
```

---

## ⚠️ IF ERROR

### "Email address is invalid"
→ Sudah fixed! Sekarang pakai @example.com

### "Email not confirmed"
→ Disable email confirmation (Step 1)

### "Email already registered"
→ Langsung login saja

### "AuthService is not defined"
→ Refresh page (F5) dan tunggu

---

## 📊 AFTER SUCCESS

Jika semua test ✅, report:
1. Screenshot dashboard
2. Screenshot visits page
3. Screenshot completed visit
4. Console output dari permission check

Then ready for **Sprint 3!**

---

**START HERE:** http://localhost:8080/auto-register-ts.html

**Total Time:** 5 menit  
**Difficulty:** ⭐ Easy

