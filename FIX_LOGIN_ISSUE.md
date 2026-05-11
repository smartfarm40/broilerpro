# 🔧 Fix Login Issue - BroilerTrack

**Problem:** Tidak bisa login karena tidak ada user di Supabase Auth

**Root Cause:** Aplikasi sudah upgrade ke Supabase Auth, tapi belum ada user yang terdaftar.

---

## 🎯 Quick Fix (5 menit)

### Step 1: Disable Email Confirmation

1. **Buka Supabase Dashboard:**
   ```
   https://supabase.com/dashboard/project/rsqbxzhrainejnbxnvfw/auth/settings
   ```

2. **Go to: Authentication > Settings > Email Auth**

3. **Disable "Enable email confirmations":**
   - Toggle OFF: "Enable email confirmations"
   - Click "Save"

### Step 2: Register Test User

1. **Buka register page:**
   ```
   http://localhost:8080/auth/register.html
   ```

2. **Register dengan data:**
   ```
   Email: drts@test.com
   Password: password123
   Nama: Drh. Rahmat S
   Role: TS (Technical Service)
   ```

3. **Klik "Daftar"**

4. **Setelah berhasil, akan auto-redirect ke login**

### Step 3: Login

1. **Login dengan credentials:**
   ```
   Email: drts@test.com
   Password: password123
   ```

2. **Klik "Masuk"**

3. **✅ Seharusnya berhasil login dan redirect ke dashboard**

---

## 🧪 Test Sprint 2 Features

Setelah login sebagai TS:

### 1. Test Permission System
- ✅ Cek apakah menu "Cost Produksi" HIDDEN (TS tidak boleh lihat cost)
- ✅ Cek apakah menu "Kunjungan" VISIBLE
- ✅ Cek apakah bisa create kandang (seharusnya TIDAK bisa)

### 2. Test TS Visits
1. **Klik menu "Kunjungan"** (icon calendar di bottom nav)
2. **Klik "Jadwalkan Kunjungan Baru"**
3. **Isi form:**
   - Kandang: Pilih "Kandang A"
   - Tanggal: Besok
   - Waktu: 09:00
   - Tujuan: Rutin
   - Catatan: "Test kunjungan rutin"
4. **Klik "Simpan"**
5. **✅ Visit card muncul di list**

### 3. Test Visit Detail
1. **Klik visit card yang baru dibuat**
2. **✅ Modal detail muncul dengan:**
   - Kandang name
   - TS name
   - Tanggal & waktu
   - Tujuan
   - Catatan
   - Checklist (4 items)
   - Button "Mulai Kunjungan"

### 4. Test Start Visit
1. **Klik "Mulai Kunjungan"**
2. **✅ Status berubah ke "Sedang Berlangsung"**
3. **✅ Button berubah jadi "Selesaikan"**

### 5. Test Complete Visit
1. **Klik "Selesaikan"**
2. **✅ Modal complete muncul dengan:**
   - Checklist (interactive)
   - Catatan Kunjungan (textarea)
   - Temuan (textarea)
   - Rekomendasi (textarea)
3. **Isi semua field:**
   - Check semua checklist
   - Catatan: "Kunjungan berjalan lancar"
   - Temuan: "Ayam sehat, suhu stabil"
   - Rekomendasi: "Pertahankan pakan sesuai jadwal"
4. **Klik "Selesaikan"**
5. **✅ Visit status berubah ke "Selesai"**
6. **✅ Visit pindah ke tab "Selesai"**

---

## 📊 Expected Results

### Permission System (Sprint 1)
- ✅ TS tidak bisa lihat cost/harga
- ✅ TS bisa create/edit visits
- ✅ TS bisa view all kandang
- ✅ TS tidak bisa create kandang

### TS Visits (Sprint 2)
- ✅ Create visit working
- ✅ View visit detail working
- ✅ Start visit working
- ✅ Complete visit working
- ✅ Checklist working
- ✅ Findings & recommendations working
- ✅ Tab filtering working

---

## 🐛 Troubleshooting

### Issue: "Email atau password salah"
**Solution:** 
- Pastikan sudah register user dulu
- Pastikan email dan password benar
- Cek di Supabase Dashboard > Authentication > Users

### Issue: "Email belum dikonfirmasi"
**Solution:** 
- Disable email confirmation di Supabase Dashboard
- Atau cek email inbox untuk confirmation link

### Issue: "Supabase tidak tersedia"
**Solution:** 
- Cek koneksi internet
- Cek Supabase project masih aktif
- Cek API key di `js/auth/auth-store.js`

### Issue: Menu "Kunjungan" tidak muncul
**Solution:** 
- Refresh browser (Ctrl+F5)
- Clear cache
- Cek console untuk errors

### Issue: Permission guards tidak bekerja
**Solution:** 
- Cek console untuk errors
- Verify permissions loaded: `AUTH.getPermissions()`
- Reload permissions: `await AUTH.reloadPermissions()`

---

## 🔍 Debug Commands

Buka browser console dan run:

```javascript
// Check if logged in
console.log('Logged in:', AUTH.isLoggedIn);
console.log('User:', AUTH.userName);
console.log('Role:', AUTH.role);

// Check permissions
console.log('Permissions:', AUTH.getPermissions());
console.log('Can create visit:', AUTH.can('visit.create'));
console.log('Can view cost:', AUTH.can('cost.view'));

// Check visits
const visits = await TSVisits.getAll();
console.log('Visits:', visits);

// Check statistics
const stats = await TSVisits.getStatistics();
console.log('Statistics:', stats);
```

---

## ✅ Success Criteria

Login berhasil jika:
- ✅ Redirect ke dashboard setelah login
- ✅ Nama user muncul di header
- ✅ Menu sesuai role (TS tidak lihat cost)
- ✅ Menu "Kunjungan" muncul di bottom nav
- ✅ Bisa create visit
- ✅ Bisa complete visit

---

## 📝 Alternative: Create User via SQL

Jika register page tidak bekerja, buat user via Supabase Dashboard SQL Editor:

**Note:** Tidak bisa create auth user via SQL, harus via Dashboard UI atau API.

1. **Go to Supabase Dashboard > Authentication > Users**
2. **Click "Add User"**
3. **Fill:**
   - Email: drts@test.com
   - Password: password123
   - Auto Confirm: YES
4. **Click "Create User"**
5. **Copy user ID**
6. **Run SQL:**
   ```sql
   INSERT INTO profiles (id, nama, role, kandang_id)
   VALUES (
     'PASTE_USER_ID_HERE',
     'Drh. Rahmat S',
     'ts',
     NULL
   );
   ```

---

**Created:** 2026-05-10  
**Status:** Ready to fix  
**Estimated Time:** 5 minutes
