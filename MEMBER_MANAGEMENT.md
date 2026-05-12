# 👥 Member Management: Hapus Anggota

## 📅 Status: ✅ Sudah Berfungsi

## ✨ Fitur yang Tersedia

### 1. **Hapus Anggota dari Organisasi**
- ✅ Tombol hapus (ikon 🗑️ merah) di setiap anggota
- ✅ Hanya Owner & Manager yang bisa hapus
- ✅ Tidak bisa hapus diri sendiri
- ✅ Konfirmasi dengan peringatan lengkap

### 2. **Cara Kerja**

#### **UI Flow:**
```
1. Owner/Manager buka halaman Pengaturan
2. Scroll ke section "Tim & Anggota"
3. Lihat daftar anggota
4. Klik tombol 🗑️ di anggota yang ingin dihapus
5. Konfirmasi dialog muncul
6. Klik OK → Anggota dihapus
```

#### **Backend Process:**
```javascript
// 1. Validasi permission
if (!AUTH.can('member.remove')) return { error: 'Tidak punya izin' };

// 2. Validasi tidak hapus diri sendiri
if (userId === AUTH.userId) return { error: 'Tidak bisa hapus diri sendiri' };

// 3. Update database - lepas dari organisasi
UPDATE profiles SET
  tenant_id = NULL,    -- Lepas dari organisasi
  role = 'viewer',     -- Reset role
  kandang_id = NULL    -- Lepas dari kandang
WHERE id = userId
  AND tenant_id = AUTH.tenantId;

// 4. Anggota tidak bisa login lagi ke organisasi ini
```

## 🎯 Preview UI

### **Daftar Anggota (Owner/Manager View)**
```
┌─────────────────────────────────────────┐
│ Tim & Anggota                           │
├─────────────────────────────────────────┤
│ [S] Staff Kantor                        │
│     staff@example.com        [Staff][🗑️]│
├─────────────────────────────────────────┤
│ [B] Budi Santoso                        │
│     budi@example.com      [Operator][🗑️]│
├─────────────────────────────────────────┤
│ [A] Agus Winarto (Anda)                 │
│     agus@example.com        [Pemilik]   │
└─────────────────────────────────────────┘
```

**Keterangan:**
- [🗑️] = Tombol hapus (hanya muncul untuk Owner & Manager)
- "(Anda)" = User yang sedang login (tidak ada tombol hapus)

### **Dialog Konfirmasi**
```
⚠️ HAPUS ANGGOTA

Anda akan menghapus: Budi Santoso

Anggota ini akan:
• Dikeluarkan dari organisasi
• Kehilangan akses ke semua data
• Tidak bisa login ke aplikasi ini

Lanjutkan?

[Batal]  [OK]
```

## 🔒 Permission & Security

### **Permission Matrix**

| Role     | View | Invite | Edit | **Remove** |
|----------|------|--------|------|------------|
| Owner    | ✅   | ✅     | ✅   | **✅**     |
| Manager  | ✅   | ✅     | ✅   | **✅**     |
| TS       | ✅   | ❌     | ❌   | **❌**     |
| Staff    | ✅   | ❌     | ❌   | **❌**     |
| Operator | ❌   | ❌     | ❌   | **❌**     |
| Viewer   | ✅   | ❌     | ❌   | **❌**     |

### **Security Rules**

1. **Permission Check**
   ```javascript
   if (!AUTH.can('member.remove')) {
     return { error: 'Tidak punya izin' };
   }
   ```

2. **Self-Delete Prevention**
   ```javascript
   if (userId === AUTH.userId) {
     return { error: 'Tidak bisa hapus diri sendiri' };
   }
   ```

3. **Tenant Isolation**
   ```sql
   WHERE id = userId 
     AND tenant_id = AUTH.tenantId
   ```
   Memastikan hanya bisa hapus anggota dari organisasi sendiri.

## 📝 Implementation Details

### **1. AuthService.removeMember()**
**File:** `js/auth/auth-service.js`

```javascript
async removeMember({ userId }) {
  const sb = this._sb();
  if (!sb) return { error: 'Supabase tidak tersedia' };
  if (!AUTH.can('member.remove')) return { error: 'Tidak punya izin' };
  if (userId === AUTH.userId) return { error: 'Tidak bisa hapus diri sendiri' };

  // Lepas anggota dari organisasi
  const { error } = await sb
    .from('profiles')
    .update({ 
      tenant_id: null,  // Lepas dari organisasi
      role: 'viewer',   // Reset role
      kandang_id: null  // Lepas dari kandang
    })
    .eq('id', userId)
    .eq('tenant_id', AUTH.tenantId);

  if (error) return { error: error.message };
  return { success: true };
}
```

### **2. removeMember() UI Function**
**File:** `js/app.js`

```javascript
async function removeMember(userId) {
  // Cari info anggota
  const members = await AuthService.getMembers();
  const member = members.find(m => m.user_id === userId);
  const memberName = member ? (member.full_name || member.email) : 'anggota ini';
  
  // Konfirmasi dengan peringatan
  const confirmed = confirm(
    '⚠️ HAPUS ANGGOTA\n\n' +
    'Anda akan menghapus: ' + memberName + '\n\n' +
    'Anggota ini akan:\n' +
    '• Dikeluarkan dari organisasi\n' +
    '• Kehilangan akses ke semua data\n' +
    '• Tidak bisa login ke aplikasi ini\n\n' +
    'Lanjutkan?'
  );
  
  if (!confirmed) return;
  
  showToast('⏳ Menghapus anggota...');
  const result = await AuthService.removeMember({ userId });
  
  if (result.error) { 
    showToast('❌ Gagal: ' + result.error); 
    return; 
  }
  
  renderTeamMembers();
  showToast('✓ ' + memberName + ' berhasil dihapus dari organisasi');
}
```

### **3. Render Team Members**
**File:** `js/app.js`

```javascript
async function renderTeamMembers() {
  const members = await AuthService.getMembers();
  
  el.innerHTML = members.map(m => {
    const isMe = m.user_id === AUTH.userId;
    const canEdit = AUTH.can('member.edit') && !isMe;
    
    return `
      <div class="team-member-item">
        <div class="team-member-avatar">${initials}</div>
        <div class="team-member-info">
          <div class="team-member-name">
            ${m.full_name || '-'}
            ${isMe ? '<span>(Anda)</span>' : ''}
          </div>
          <div class="team-member-email">${m.email || ''}</div>
        </div>
        <span class="team-role-badge">${roleLabel[m.role]}</span>
        ${canEdit ? `
          <button onclick="removeMember('${m.user_id}')" title="Hapus anggota">
            <span class="material-icons-round">person_remove</span>
          </button>
        ` : ''}
      </div>
    `;
  }).join('');
}
```

## 🔄 What Happens After Delete?

### **Immediate Effects:**
1. ✅ `tenant_id` set ke `NULL` → Anggota keluar dari organisasi
2. ✅ `role` set ke `viewer` → Tidak punya akses apapun
3. ✅ `kandang_id` set ke `NULL` → Lepas dari kandang
4. ✅ Anggota hilang dari daftar tim
5. ✅ Anggota tidak bisa login ke organisasi ini lagi

### **Data Retention:**
- ✅ Akun Supabase Auth **TIDAK DIHAPUS** (soft delete)
- ✅ Profile masih ada di database (untuk audit trail)
- ✅ Anggota bisa diundang lagi ke organisasi lain
- ✅ Anggota bisa membuat organisasi baru

### **Access Control:**
```javascript
// Setelah dihapus, saat anggota coba login:
if (!profile.tenant_id) {
  // Redirect ke halaman "Tidak punya organisasi"
  // atau "Buat organisasi baru"
}
```

## 🧪 Testing Guide

### **Test Case 1: Owner Hapus Anggota**
```
1. Login sebagai Owner
2. Buka Pengaturan → Tim & Anggota
3. Klik tombol 🗑️ di anggota "Budi Santoso"
4. Konfirmasi dialog muncul ✅
5. Klik OK
6. Toast: "✓ Budi Santoso berhasil dihapus" ✅
7. Anggota hilang dari daftar ✅
8. Logout → Login sebagai Budi
9. Error: "Tidak punya akses ke organisasi" ✅
```

### **Test Case 2: Manager Hapus Anggota**
```
1. Login sebagai Manager
2. Buka Pengaturan → Tim & Anggota
3. Tombol 🗑️ muncul ✅
4. Hapus anggota → Berhasil ✅
```

### **Test Case 3: TS Coba Hapus (Tidak Boleh)**
```
1. Login sebagai TS
2. Buka Pengaturan → Tim & Anggota
3. Tombol 🗑️ TIDAK muncul ✅
4. Jika force call API:
   → Error: "Tidak punya izin" ✅
```

### **Test Case 4: Owner Coba Hapus Diri Sendiri**
```
1. Login sebagai Owner
2. Buka Pengaturan → Tim & Anggota
3. Tombol 🗑️ TIDAK muncul di "(Anda)" ✅
4. Jika force call API:
   → Error: "Tidak bisa hapus diri sendiri" ✅
```

## 🐛 Known Issues & Limitations

### **1. Soft Delete Only**
- ❌ Tidak ada hard delete (hapus permanen dari database)
- ✅ Anggota masih ada di `profiles` table dengan `tenant_id = NULL`
- 💡 **Solusi**: Implementasi hard delete jika diperlukan

### **2. No Undo/Restore**
- ❌ Tidak ada fitur restore anggota yang sudah dihapus
- 💡 **Solusi**: Undang ulang dengan email yang sama

### **3. Data Ownership**
- ❌ Data yang dibuat anggota (logs, dll) tidak dihapus
- ✅ Data tetap ada dengan `created_by` = userId anggota
- 💡 **Solusi**: Implementasi cascade delete atau transfer ownership

## 🚀 Future Enhancements

### **1. Bulk Delete**
```javascript
async function removeMembersBulk(userIds) {
  // Hapus multiple anggota sekaligus
}
```

### **2. Restore Member**
```javascript
async function restoreMember(userId) {
  // Restore anggota yang sudah dihapus
  // Set tenant_id kembali
}
```

### **3. Transfer Ownership**
```javascript
async function transferData(fromUserId, toUserId) {
  // Transfer data dari anggota yang dihapus ke anggota lain
}
```

### **4. Audit Log**
```sql
CREATE TABLE member_audit_log (
  id UUID PRIMARY KEY,
  action VARCHAR(50),  -- 'removed', 'invited', 'role_changed'
  target_user_id UUID,
  performed_by UUID,
  timestamp TIMESTAMPTZ,
  details JSONB
);
```

## 📊 Summary

| Feature              | Status | Notes                          |
|----------------------|--------|--------------------------------|
| Hapus Anggota        | ✅     | Soft delete (tenant_id = NULL) |
| Permission Check     | ✅     | Owner & Manager only           |
| Self-Delete Block    | ✅     | Tidak bisa hapus diri sendiri  |
| Konfirmasi Dialog    | ✅     | Dengan peringatan lengkap      |
| UI Tombol Hapus      | ✅     | Icon person_remove (merah)     |
| Tenant Isolation     | ✅     | Hanya hapus dari org sendiri   |
| Restore Feature      | ❌     | Belum ada (future)             |
| Hard Delete          | ❌     | Belum ada (future)             |
| Audit Log            | ❌     | Belum ada (future)             |

---

**Status:** ✅ **READY FOR PRODUCTION**  
**Created by:** Kiro AI Assistant  
**Date:** 12 Mei 2026  
**Version:** 1.0.0
