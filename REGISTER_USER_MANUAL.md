# 📝 Manual User Registration - Step by Step

Karena tidak bisa auto-register via API, ikuti langkah ini:

---

## 🎯 Method 1: Via Supabase Dashboard (PALING MUDAH)

### Step 1: Buka Supabase Dashboard
```
https://supabase.com/dashboard/project/rsqbxzhrainejnbxnvfw/auth/users
```

### Step 2: Disable Email Confirmation (PENTING!)
1. Klik tab **"Settings"** di sidebar kiri
2. Scroll ke **"Email Auth"**
3. **UNCHECK** "Enable email confirmations"
4. Klik **"Save"**

### Step 3: Create User
1. Kembali ke tab **"Users"**
2. Klik button **"Add User"** (hijau, pojok kanan atas)
3. Isi form:
   ```
   Email: drts@example.com
   Password: password123
   ```
   ⚠️ **PENTING:** Gunakan `@example.com` bukan `@test.com` (domain test.com tidak valid)
4. **CENTANG** "Auto Confirm User" (PENTING!)
5. Klik **"Create User"**

### Step 4: Copy User ID
1. User baru muncul di list
2. **Copy UUID** user (contoh: `a1b2c3d4-...`)

### Step 5: Create Profile
1. Klik tab **"SQL Editor"** di sidebar
2. Paste dan run SQL ini (ganti USER_ID):
   ```sql
   INSERT INTO profiles (id, nama, role, kandang_id)
   VALUES (
     'PASTE_USER_ID_HERE',
     'Drh. Rahmat S',
     'ts',
     NULL
   );
   ```
3. Klik **"Run"**

### Step 6: Test Login
1. Buka: http://localhost:8080/auth/login.html
2. Login dengan:
   ```
   Email: drts@example.com
   Password: password123
   ```
3. ✅ Seharusnya berhasil!

---

## 🎯 Method 2: Via Browser Console (ALTERNATIF)

### Step 1: Disable Email Confirmation
Sama seperti Method 1 Step 2

### Step 2: Buka Register Page
```
http://localhost:8080/auth/register.html
```

### Step 3: Buka Browser Console
- Chrome/Edge: Press `F12` atau `Ctrl+Shift+I`
- Firefox: Press `F12`

### Step 4: Run Registration Script
Paste script ini di console dan tekan Enter:

```javascript
// Register TS User
const result = await AuthService.register({
  email: 'drts@example.com',
  password: 'password123',
  nama: 'Drh. Rahmat S',
  role: 'ts',
  kandangId: null
});

console.log('Registration result:', result);

if (result.success) {
  alert('✅ User berhasil dibuat! Silakan login.');
} else {
  alert('❌ Error: ' + result.error);
}
```

### Step 5: Login
Jika berhasil, login dengan credentials di atas.

---

## 🎯 Method 3: Multiple Users at Once

Jika ingin create beberapa user sekaligus via console:

```javascript
// Array of test users
const testUsers = [
  { email: 'owner@example.com', password: 'password123', nama: 'Pak Hendra', role: 'owner' },
  { email: 'ts@example.com', password: 'password123', nama: 'Drh. Rahmat S', role: 'ts' },
  { email: 'staff@example.com', password: 'password123', nama: 'Staff Kantor', role: 'staff' },
  { email: 'operator@example.com', password: 'password123', nama: 'Budi Santoso', role: 'operator', kandangId: 'K1' }
];

// Register all users
for (const user of testUsers) {
  console.log('Creating user:', user.email);
  const result = await AuthService.register(user);
  console.log('Result:', result.success ? '✅' : '❌', result.error || 'Success');
  await new Promise(r => setTimeout(r, 1000)); // Wait 1 second between requests
}

console.log('✅ All users created!');
```

---

## ⚠️ Troubleshooting

### Error: "Email already registered"
**Solution:** User sudah ada, langsung login saja

### Error: "Email not confirmed"
**Solution:** 
1. Pastikan sudah disable email confirmation
2. Atau centang "Auto Confirm User" saat create

### Error: "Unable to validate email address"
**Solution:** Gunakan email dengan domain valid:
- ✅ test@example.com
- ✅ user@gmail.com
- ✅ admin@outlook.com
- ❌ test@test.com (mungkin invalid)

### Error: "Failed to create user"
**Solution:** 
1. Cek koneksi internet
2. Cek Supabase project masih aktif
3. Cek API key masih valid

---

## ✅ Verification

Setelah create user, verify di Supabase Dashboard:

### Check Auth Users:
```
Dashboard > Authentication > Users
```
Seharusnya ada user baru dengan email yang dibuat.

### Check Profiles:
```
Dashboard > Table Editor > profiles
```
Seharusnya ada profile dengan nama dan role yang sesuai.

---

## 🚀 Quick Start

**Cara tercepat (5 menit):**

1. ✅ Disable email confirmation di Supabase Dashboard
2. ✅ Buka register page: http://localhost:8080/auth/register.html
3. ✅ Register dengan: drts@example.com / password123
4. ✅ Login
5. ✅ Test Sprint 2 features!

---

**Pilih method mana yang paling mudah untuk Anda?**
- Method 1: Via Dashboard (paling reliable)
- Method 2: Via Browser Console (paling cepat)
- Method 3: Multiple users (untuk testing lengkap)
