# 🔐 Create Test Users - BroilerTrack

**Problem:** Tidak ada user di Supabase Auth, sehingga tidak bisa login.

**Solution:** Buat test users menggunakan Supabase Dashboard atau register page.

---

## Option 1: Register via Web UI (RECOMMENDED)

1. **Buka halaman register:**
   ```
   http://localhost:8080/auth/register.html
   ```

2. **Buat test users dengan data berikut:**

### User 1: Owner
```
Email: owner@broilertrack.com
Password: password123
Nama: Pak Hendra (Owner)
Role: Owner
```

### User 2: TS (Technical Service)
```
Email: drts@broilertrack.com
Password: password123
Nama: Drh. Rahmat S
Role: TS
```

### User 3: Staff
```
Email: staff@broilertrack.com
Password: password123
Nama: Staff Kantor
Role: Staff
```

### User 4: Operator
```
Email: operator@broilertrack.com
Password: password123
Nama: Budi Santoso
Role: Operator
Kandang: K1 (Kandang A)
```

---

## Option 2: Create via Supabase Dashboard

1. **Buka Supabase Dashboard:**
   ```
   https://supabase.com/dashboard/project/rsqbxzhrainejnbxnvfw
   ```

2. **Go to Authentication > Users**

3. **Click "Add User" dan isi:**
   - Email: `owner@broilertrack.com`
   - Password: `password123`
   - Auto Confirm User: ✅ YES

4. **Setelah user dibuat, buat profile di database:**
   ```sql
   INSERT INTO profiles (id, nama, role, kandang_id)
   VALUES (
     'USER_ID_FROM_AUTH',
     'Pak Hendra',
     'owner',
     NULL
   );
   ```

---

## Option 3: Disable Email Confirmation (Quick Fix)

Jika email confirmation menyulitkan testing, disable di Supabase Dashboard:

1. **Go to Authentication > Settings**
2. **Email Auth > Enable email confirmations: OFF**
3. **Save**

Setelah itu, register user baru akan langsung bisa login tanpa konfirmasi email.

---

## Test Login Credentials

Setelah membuat users, gunakan credentials ini untuk test:

| Role | Email | Password | Purpose |
|------|-------|----------|---------|
| Owner | owner@broilertrack.com | password123 | Full access testing |
| TS | drts@broilertrack.com | password123 | TS features testing |
| Staff | staff@broilertrack.com | password123 | Cost/delivery testing |
| Operator | operator@broilertrack.com | password123 | Limited access testing |

---

## Verification

Setelah register, verify user ada di database:

```sql
-- Check auth users
SELECT id, email, created_at, email_confirmed_at
FROM auth.users;

-- Check profiles
SELECT id, nama, role, kandang_id
FROM profiles;
```

---

## Quick Start Script

Jika ingin cepat, buka browser console di register page dan run:

```javascript
// Register Owner
await AuthService.register({
  email: 'owner@broilertrack.com',
  password: 'password123',
  nama: 'Pak Hendra',
  role: 'owner'
});

// Register TS
await AuthService.register({
  email: 'drts@broilertrack.com',
  password: 'password123',
  nama: 'Drh. Rahmat S',
  role: 'ts'
});

// Register Staff
await AuthService.register({
  email: 'staff@broilertrack.com',
  password: 'password123',
  nama: 'Staff Kantor',
  role: 'staff'
});

// Register Operator
await AuthService.register({
  email: 'operator@broilertrack.com',
  password: 'password123',
  nama: 'Budi Santoso',
  role: 'operator',
  kandangId: 'K1'
});
```

---

## Troubleshooting

### Error: "Email not confirmed"
**Solution:** 
1. Check email inbox untuk confirmation link
2. Atau disable email confirmation di Supabase Dashboard

### Error: "Email already registered"
**Solution:** User sudah ada, langsung login saja

### Error: "Invalid login credentials"
**Solution:** 
1. Pastikan email dan password benar
2. Pastikan user sudah confirmed (jika email confirmation enabled)

---

## Next Steps

Setelah users dibuat:
1. ✅ Login dengan salah satu user
2. ✅ Test Sprint 1 features (permissions)
3. ✅ Test Sprint 2 features (TS visits)
4. ✅ Verify UI elements hidden/shown correctly

---

**Created:** 2026-05-10  
**Status:** Ready for testing
