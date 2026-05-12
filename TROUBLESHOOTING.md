# 🐛 Troubleshooting Guide

## Issue: Gagal Menghapus Kandang dan Anggota

### **Gejala:**
```
Error: supabase is not defined
TypeError: Cannot read property 'from' of undefined
```

### **Penyebab:**
1. Fungsi `deleteFlock()` menggunakan `supabase` langsung tanpa mengambil dari global client
2. Fungsi `getMembers()` tidak mengambil email dan tidak filter by tenant_id

### **Solusi:**

#### **1. Fix deleteFlock() - Gunakan window._sbClient**

**Before:**
```javascript
const { error } = await supabase
  .from('kandangs')
  .delete()
  .eq('id', flock._dbId);
```

**After:**
```javascript
if (flock._dbId && window._sbClient) {
  const { error } = await window._sbClient
    .from('kandangs')
    .delete()
    .eq('id', flock._dbId);
  
  if (error) throw error;
}
```

#### **2. Fix getMembers() - Tambah Email & Tenant Filter**

**Before:**
```javascript
async getMembers() {
  const { data, error } = await sb
    .from('profiles')
    .select('id, nama, role, kandang_id, created_at');
  
  return (data || []).map(p => ({
    user_id: p.id,
    full_name: p.nama,
    email: '',  // ❌ Email kosong
    role: p.role
  }));
}
```

**After:**
```javascript
async getMembers() {
  const { data, error } = await sb
    .from('profiles')
    .select('id, nama, email, role, kandang_id, created_at, tenant_id')
    .eq('tenant_id', AUTH.tenantId)  // ✅ Filter by tenant
    .order('created_at', { ascending: true });
  
  return (data || []).map(p => ({
    user_id: p.id,
    full_name: p.nama || '',
    email: p.email || '',  // ✅ Email dari profiles
    role: p.role || 'viewer'
  }));
}
```

### **Testing:**

#### **Test Hapus Kandang:**
```javascript
// 1. Login sebagai Owner
// 2. Buka halaman Kandang
// 3. Klik tombol 🗑️ di kandang
// 4. Konfirmasi → Ketik nama kandang
// 5. ✅ Kandang terhapus tanpa error
```

#### **Test Hapus Anggota:**
```javascript
// 1. Login sebagai Owner/Manager
// 2. Buka Pengaturan → Tim & Anggota
// 3. Klik tombol 🗑️ di anggota
// 4. Konfirmasi
// 5. ✅ Anggota terhapus tanpa error
```

---

## Common Issues

### **1. "supabase is not defined"**

**Cause:** Menggunakan `supabase` langsung tanpa mengambil dari global client

**Solution:** Gunakan `window._sbClient` atau `sb` (dari supabase-client.js)

```javascript
// ❌ Wrong
const { data } = await supabase.from('table').select();

// ✅ Correct
const { data } = await window._sbClient.from('table').select();
// atau
const { data } = await sb.from('table').select();
```

### **2. "Cannot read property 'from' of undefined"**

**Cause:** Supabase client belum diinisialisasi

**Solution:** Check apakah `window._sbClient` ada sebelum digunakan

```javascript
if (window._sbClient) {
  const { data } = await window._sbClient.from('table').select();
}
```

### **3. Email Anggota Kosong**

**Cause:** Query `getMembers()` tidak mengambil field `email`

**Solution:** Tambahkan `email` di SELECT query

```javascript
.select('id, nama, email, role, kandang_id, created_at')
```

### **4. Anggota dari Organisasi Lain Muncul**

**Cause:** Query tidak filter by `tenant_id`

**Solution:** Tambahkan filter `.eq('tenant_id', AUTH.tenantId)`

```javascript
const { data } = await sb
  .from('profiles')
  .select('*')
  .eq('tenant_id', AUTH.tenantId);  // ✅ Tenant isolation
```

### **5. Permission Denied**

**Cause:** User tidak punya permission yang diperlukan

**Solution:** Check permission sebelum operasi

```javascript
if (!AUTH.can('member.remove')) {
  showToast('⚠️ Tidak punya izin');
  return;
}
```

---

## Debug Checklist

### **Sebelum Hapus Kandang:**
- [ ] User role = 'owner'?
- [ ] `window._sbClient` tersedia?
- [ ] `flock._dbId` ada?
- [ ] Konfirmasi nama kandang cocok?

### **Sebelum Hapus Anggota:**
- [ ] User role = 'owner' atau 'manager'?
- [ ] `AUTH.can('member.remove')` = true?
- [ ] `userId !== AUTH.userId`?
- [ ] `getMembers()` return data?

---

## Browser Console Commands

### **Check Supabase Client:**
```javascript
console.log('Supabase Client:', window._sbClient);
console.log('SB Alias:', sb);
```

### **Check Auth State:**
```javascript
console.log('User ID:', AUTH.userId);
console.log('Role:', AUTH.role);
console.log('Tenant ID:', AUTH.tenantId);
console.log('Permissions:', AUTH.permissions);
```

### **Test getMembers:**
```javascript
AuthService.getMembers().then(members => {
  console.log('Members:', members);
});
```

### **Test Permission:**
```javascript
console.log('Can remove member?', AUTH.can('member.remove'));
console.log('Can delete kandang?', AUTH.can('kandang.delete'));
```

---

## Error Messages Reference

| Error | Cause | Solution |
|-------|-------|----------|
| `supabase is not defined` | Direct use of `supabase` | Use `window._sbClient` |
| `Cannot read property 'from'` | Client not initialized | Check `window._sbClient` exists |
| `Tidak punya izin` | Permission denied | Check user role & permissions |
| `Tidak bisa hapus diri sendiri` | Self-delete attempt | Use different user |
| `Nama kandang tidak cocok` | Wrong confirmation | Type exact name |
| `tenant_id is null` | Not in organization | User needs to join org |

---

## Quick Fixes

### **Force Reload Supabase Client:**
```javascript
// Reload page
location.reload();

// Or reinitialize
window._sbClient = window.supabase.createClient(
  SUPABASE_URL, 
  SUPABASE_ANON_KEY
);
```

### **Clear Cache & Reload:**
```javascript
// Clear service worker cache
navigator.serviceWorker.getRegistrations()
  .then(regs => regs.forEach(r => r.unregister()));

// Clear localStorage
localStorage.clear();

// Reload
location.reload();
```

### **Reset Auth State:**
```javascript
// Logout
await AuthService.logout();

// Clear session
await window._sbClient.auth.signOut();

// Reload
location.href = 'auth/login.html';
```

---

## Contact Support

Jika masalah masih berlanjut:

1. **Check Console:** Buka DevTools → Console untuk error detail
2. **Check Network:** Tab Network untuk melihat API calls
3. **Check Database:** Verify data di Supabase Dashboard
4. **Report Issue:** Buat issue di GitHub dengan:
   - Error message lengkap
   - Steps to reproduce
   - Browser & OS info
   - Screenshot console

---

**Last Updated:** 12 Mei 2026  
**Version:** 1.0.0
