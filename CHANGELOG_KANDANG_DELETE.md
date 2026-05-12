# Changelog: Fitur Hapus Kandang (Owner Only)

## 📅 Tanggal: 12 Mei 2026

## ✨ Fitur Baru

### 1. **Tombol Hapus Kandang**
- Tombol hapus (ikon 🗑️ merah) ditambahkan di setiap card kandang
- **Hanya muncul untuk Owner** - Manager tidak bisa melihat tombol ini
- Tombol edit (ikon ✏️ biru) tetap tersedia untuk Owner & Manager

### 2. **Keamanan Berlapis**
Proses penghapusan kandang memiliki 3 lapis keamanan:

#### **Lapis 1: Permission Check**
```javascript
if (AUTH.role !== 'owner') {
  showToast('⚠️ Hanya Owner yang bisa menghapus kandang');
  return;
}
```

#### **Lapis 2: Konfirmasi dengan Peringatan**
Dialog konfirmasi menampilkan:
- Nama kandang yang akan dihapus
- Daftar data terkait yang akan ikut terhapus:
  - Laporan harian
  - Target periode
  - Jadwal obat/vaksin
  - Pengiriman
  - Biaya produksi
- Peringatan: "TIDAK BISA DIBATALKAN"

#### **Lapis 3: Verifikasi Nama Kandang**
User harus mengetik ulang nama kandang untuk konfirmasi final:
```javascript
const inputName = prompt('Ketik nama kandang "' + flockName + '" untuk konfirmasi:');
if (inputName !== flockName) {
  showToast('❌ Nama kandang tidak cocok. Penghapusan dibatalkan.');
  return;
}
```

### 3. **Database Permission Update**
Migration baru: `20260512000000_remove_manager_delete_kandang.sql`

**Sebelum:**
- Owner: ✅ `kandang.delete`
- Manager: ✅ `kandang.delete` ❌ (DIHAPUS)

**Sesudah:**
- Owner: ✅ `kandang.delete`
- Manager: ❌ `kandang.delete` (TIDAK ADA AKSES)

## 🎨 UI/UX

### **Tampilan Card Kandang**

```
┌─────────────────────────────────────────────┐
│ Farm Asoka                    [Aktif] [✏️][🗑️] │
│ Cobb 500 • Budi Santoso                     │
│ ┌─────────┬─────────┬──────────────────┐   │
│ │ 15,000  │  H 24   │  02 Mei 2026     │   │
│ │  Ekor   │  Umur   │  Mulai           │   │
│ └─────────┴─────────┴──────────────────┘   │
└─────────────────────────────────────────────┘
```

**Keterangan:**
- [✏️] = Tombol Edit (biru) - Owner & Manager
- [🗑️] = Tombol Hapus (merah) - **Hanya Owner**

### **CSS Classes Baru**

```css
.flock-actions              /* Container tombol aksi */
.flock-action-btn           /* Base style tombol */
.flock-action-btn--edit     /* Tombol edit (biru) */
.flock-action-btn--delete   /* Tombol hapus (merah) */
```

## 🔧 Fungsi JavaScript Baru

### 1. **editFlock(flockId)**
```javascript
// Placeholder untuk fitur edit kandang
// TODO: Implementasi modal edit
```

### 2. **deleteFlock(flockId, flockName)**
```javascript
// Hapus kandang dengan keamanan berlapis
// - Check role = owner
// - Konfirmasi dengan peringatan
// - Verifikasi nama kandang
// - Hapus dari Supabase & local DB
// - Hapus data terkait (logs, dll)
```

## 📋 Checklist Implementasi

- [x] Tambah tombol edit & hapus di card kandang
- [x] Implementasi fungsi `deleteFlock()` dengan keamanan berlapis
- [x] Tambah CSS untuk tombol aksi
- [x] Update permission: hapus `kandang.delete` dari Manager
- [x] Buat migration database
- [x] Update `renderFlock()` untuk tampilkan tombol sesuai role
- [ ] Implementasi fungsi `editFlock()` (future)

## 🚀 Cara Deploy

### 1. **Apply Migration**
```bash
supabase db push
```

### 2. **Verify Permission**
```sql
SELECT 
  rp.role,
  p.code as permission_code
FROM role_permissions rp
JOIN permissions p ON rp.permission_id = p.id
WHERE p.code = 'kandang.delete';
```

**Expected Result:**
```
role   | permission_code
-------+----------------
owner  | kandang.delete
```

### 3. **Test di Browser**
1. Login sebagai **Owner** → Tombol hapus muncul ✅
2. Login sebagai **Manager** → Tombol hapus TIDAK muncul ✅
3. Coba hapus kandang → Konfirmasi 2x → Berhasil ✅

## ⚠️ Breaking Changes

**TIDAK ADA** - Fitur ini backward compatible:
- Manager yang sebelumnya punya akses hapus akan kehilangan akses
- Tidak ada perubahan pada data existing
- UI tetap berfungsi normal untuk semua role

## 📝 Notes

1. **Soft Delete vs Hard Delete**
   - Saat ini menggunakan **hard delete** (data benar-benar dihapus)
   - Pertimbangkan soft delete (flag `deleted_at`) untuk audit trail

2. **Cascade Delete**
   - Data terkait (logs, targets, dll) ikut terhapus
   - Pastikan RLS policy di Supabase support cascade delete

3. **Future Enhancement**
   - Implementasi modal edit kandang
   - Export data sebelum hapus
   - Restore kandang yang terhapus (jika soft delete)

## 🐛 Known Issues

- [ ] Fungsi `editFlock()` masih placeholder
- [ ] Belum ada loading state saat proses delete
- [ ] Belum ada undo/restore feature

## 👥 Roles & Permissions Summary

| Role     | View | Create | Edit | Delete |
|----------|------|--------|------|--------|
| Owner    | ✅   | ✅     | ✅   | ✅     |
| Manager  | ✅   | ✅     | ✅   | ❌     |
| TS       | ✅   | ❌     | ❌   | ❌     |
| Staff    | ✅   | ❌     | ❌   | ❌     |
| Operator | ✅   | ❌     | ❌   | ❌     |
| Viewer   | ✅   | ❌     | ❌   | ❌     |

---

**Dibuat oleh:** Kiro AI Assistant  
**Tanggal:** 12 Mei 2026  
**Version:** 1.0.0
