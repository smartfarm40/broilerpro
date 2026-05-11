# 🚀 Quick Register TS User - 3 Menit

**Email yang VALID:** `drts@example.com` (bukan @test.com!)

---

## 🎯 Cara Tercepat: Via Browser Console

### Step 1: Disable Email Confirmation (WAJIB!)

1. **Buka Supabase Dashboard:**
   ```
   https://supabase.com/dashboard/project/rsqbxzhrainejnbxnvfw/auth/settings
   ```

2. **Scroll ke "Email Auth"**

3. **UNCHECK "Enable email confirmations"**

4. **Klik "Save"**

   ✅ Sekarang user baru bisa langsung login tanpa konfirmasi email

---

### Step 2: Register User via Browser Console

1. **Buka register page:**
   ```
   http://localhost:8080/auth/register.html
   ```

2. **Buka Browser Console:**
   - Press `F12` atau `Ctrl+Shift+I`
   - Klik tab "Console"

3. **Copy-paste script ini dan tekan Enter:**

```javascript
// Register TS User - Drh. Rahmat S
const result = await AuthService.register({
  email: 'drts@example.com',
  password: 'password123',
  nama: 'Drh. Rahmat S',
  role: 'ts',
  kandangId: null
});

console.log('Registration result:', result);

if (result.success) {
  console.log('✅ SUCCESS! User ID:', result.user.id);
  console.log('✅ Email:', result.user.email);
  console.log('✅ Role:', result.user.user_metadata.role);
  alert('✅ User berhasil dibuat! Silakan login dengan:\nEmail: drts@example.com\nPassword: password123');
} else {
  console.error('❌ ERROR:', result.error);
  alert('❌ Error: ' + result.error);
}
```

4. **Tunggu beberapa detik...**

5. **✅ Jika berhasil, akan muncul alert "User berhasil dibuat!"**

---

### Step 3: Login

1. **Buka login page:**
   ```
   http://localhost:8080/auth/login.html
   ```

2. **Login dengan:**
   ```
   Email: drts@example.com
   Password: password123
   ```

3. **Klik "Masuk"**

4. **✅ Seharusnya redirect ke dashboard!**

---

## 🧪 Verify Registration

Buka browser console dan run:

```javascript
// Check if user exists in Supabase
const { data, error } = await sb.auth.getUser();
console.log('Current user:', data);
console.log('Error:', error);
```

Atau cek di Supabase Dashboard:
```
Dashboard > Authentication > Users
```

Seharusnya ada user dengan email `drts@example.com`

---

## 🎯 Alternative: Register via UI Form

Jika prefer pakai form:

1. **Buka:** http://localhost:8080/auth/register.html

2. **Isi form:**
   - Email: `drts@example.com`
   - Password: `password123`
   - Nama: `Drh. Rahmat S`
   - Role: `TS (Technical Service)`

3. **Klik "Daftar"**

4. **✅ Akan auto-redirect ke login page**

---

## ⚠️ Troubleshooting

### Error: "Email address is invalid"
**Cause:** Domain `@test.com` tidak valid  
**Solution:** Gunakan `@example.com` atau `@gmail.com`

### Error: "Email not confirmed"
**Cause:** Email confirmation masih enabled  
**Solution:** Disable di Supabase Dashboard (Step 1)

### Error: "Email already registered"
**Cause:** User sudah ada  
**Solution:** Langsung login saja dengan credentials di atas

### Error: "AuthService is not defined"
**Cause:** Script belum load  
**Solution:** 
1. Refresh page (F5)
2. Tunggu page fully loaded
3. Coba lagi

### Error: "Failed to create user"
**Cause:** Koneksi atau API issue  
**Solution:**
1. Cek koneksi internet
2. Cek Supabase project status
3. Cek browser console untuk error details

---

## 🔍 Debug Commands

Jika ada masalah, run di console:

```javascript
// Check if Supabase client loaded
console.log('Supabase client:', typeof sb);
console.log('AuthService:', typeof AuthService);

// Check Supabase connection
const { data, error } = await sb.from('profiles').select('count');
console.log('DB connection:', error ? '❌ Error' : '✅ OK');

// Check current session
const session = await sb.auth.getSession();
console.log('Current session:', session);
```

---

## ✅ Success Checklist

Setelah register berhasil:

- ✅ User muncul di Supabase Dashboard > Authentication > Users
- ✅ Profile muncul di Supabase Dashboard > Table Editor > profiles
- ✅ Bisa login dengan email dan password
- ✅ Redirect ke dashboard setelah login
- ✅ Nama user muncul di header: "Drh. Rahmat S"
- ✅ Role: "ts"
- ✅ Menu "Kunjungan" muncul di bottom nav
- ✅ Menu "Cost Produksi" TIDAK muncul (TS tidak boleh lihat cost)

---

## 🚀 Next Steps

Setelah login berhasil:

1. **Test Permission System (Sprint 1):**
   - Verify menu cost HIDDEN
   - Verify menu kunjungan VISIBLE
   - Verify tidak bisa create kandang

2. **Test TS Visits (Sprint 2):**
   - Create visit baru
   - Start visit
   - Complete visit dengan checklist
   - Verify findings & recommendations

3. **Report hasil test:**
   - Screenshot dashboard
   - Screenshot visits page
   - Screenshot completed visit

---

**Estimated Time:** 3 menit  
**Difficulty:** Easy  
**Status:** Ready to execute

---

## 📞 Need Help?

Jika masih ada masalah:
1. Screenshot error message
2. Copy console errors
3. Check Supabase Dashboard untuk verify user
4. Try alternative method (UI form atau Dashboard)

