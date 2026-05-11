# 🎯 REGISTER USER SEKARANG - 2 Cara Mudah

**Problem:** Email `drts@test.com` tidak valid (domain @test.com tidak diterima Supabase)

**Solution:** Gunakan email `drts@example.com` dengan domain yang valid

---

## ⚡ Cara 1: Auto Register (PALING MUDAH - 1 KLIK!)

### Step 1: Disable Email Confirmation
1. Buka: https://supabase.com/dashboard/project/rsqbxzhrainejnbxnvfw/auth/settings
2. Scroll ke "Email Auth"
3. **UNCHECK** "Enable email confirmations"
4. Klik "Save"

### Step 2: Buka Auto Register Page
```
http://localhost:8080/auto-register-ts.html
```

### Step 3: Klik Button "Register User Sekarang"
- Tunggu beberapa detik
- ✅ User akan otomatis terdaftar
- ✅ Auto redirect ke login page

### Step 4: Login
```
Email: drts@example.com
Password: password123
```

**✅ SELESAI! Total waktu: 2 menit**

---

## 🔧 Cara 2: Manual via Browser Console

### Step 1: Disable Email Confirmation (sama seperti Cara 1)

### Step 2: Buka Register Page
```
http://localhost:8080/auth/register.html
```

### Step 3: Buka Browser Console
- Press `F12` atau `Ctrl+Shift+I`
- Klik tab "Console"

### Step 4: Copy-Paste Script Ini
```javascript
const result = await AuthService.register({
  email: 'drts@example.com',
  password: 'password123',
  nama: 'Drh. Rahmat S',
  role: 'ts',
  kandangId: null
});

if (result.success) {
  alert('✅ User berhasil dibuat! Login dengan:\nEmail: drts@example.com\nPassword: password123');
  window.location.href = 'login.html';
} else {
  alert('❌ Error: ' + result.error);
}
```

### Step 5: Press Enter dan Tunggu
- ✅ Alert muncul "User berhasil dibuat"
- ✅ Auto redirect ke login page

### Step 6: Login
```
Email: drts@example.com
Password: password123
```

**✅ SELESAI! Total waktu: 3 menit**

---

## 🔑 Login Credentials

Setelah register berhasil, gunakan:

```
Email: drts@example.com
Password: password123
Role: TS (Technical Service)
Nama: Drh. Rahmat S
```

---

## ✅ Verification Checklist

Setelah login berhasil, verify:

- ✅ Redirect ke dashboard
- ✅ Nama muncul di header: "Drh. Rahmat S"
- ✅ Role: "ts"
- ✅ Menu "Kunjungan" muncul di bottom nav
- ✅ Menu "Cost Produksi" TIDAK muncul (TS tidak boleh lihat cost)
- ✅ Bisa create visit baru
- ✅ Bisa start dan complete visit

---

## 🧪 Test Sprint 2 Features

Setelah login, test fitur Kunjungan TS:

### 1. Create Visit
1. Klik menu "Kunjungan"
2. Klik "Jadwalkan Kunjungan Baru"
3. Isi form:
   - Kandang: Kandang A
   - Tanggal: Besok
   - Waktu: 09:00
   - Tujuan: Rutin
   - Catatan: "Test kunjungan"
4. Klik "Simpan"
5. ✅ Visit card muncul

### 2. Start Visit
1. Klik visit card
2. Klik "Mulai Kunjungan"
3. ✅ Status berubah "Sedang Berlangsung"

### 3. Complete Visit
1. Klik "Selesaikan"
2. Check semua checklist
3. Isi catatan, temuan, rekomendasi
4. Klik "Selesaikan"
5. ✅ Status berubah "Selesai"

---

## ⚠️ Troubleshooting

### Error: "Email address is invalid"
**Cause:** Domain @test.com tidak valid  
**Fix:** Gunakan @example.com (sudah diupdate di script)

### Error: "Email not confirmed"
**Cause:** Email confirmation masih enabled  
**Fix:** Disable di Supabase Dashboard (Step 1)

### Error: "Email already registered"
**Cause:** User sudah ada  
**Fix:** Langsung login saja

### Error: "AuthService is not defined"
**Cause:** Page belum fully loaded  
**Fix:** Refresh page (F5) dan tunggu beberapa detik

---

## 📁 Files Created

1. **auto-register-ts.html** - Auto register page (1-click solution)
2. **QUICK_REGISTER_TS.md** - Detailed guide
3. **REGISTER_NOW.md** - This file (quick reference)

---

## 🚀 Recommended: Use Auto Register Page

**Paling mudah dan cepat:**
```
http://localhost:8080/auto-register-ts.html
```

1. Disable email confirmation
2. Klik 1 button
3. Login
4. Test features

**Total waktu: 2 menit**

---

## 📞 Next Steps

Setelah login berhasil:

1. ✅ Test permission system (Sprint 1)
2. ✅ Test TS visits (Sprint 2)
3. ✅ Report hasil test
4. ✅ Lanjut ke Sprint 3 (jika semua OK)

---

**Created:** 2026-05-10  
**Status:** Ready to execute  
**Estimated Time:** 2-3 menit

