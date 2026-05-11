# 🔐 Permission System - Quick Reference Guide

## 📋 Role Overview

| Role | Permissions | Use Case |
|------|-------------|----------|
| **Owner** | 43 (Full) | Pemilik peternakan, akses penuh |
| **Manager** | 43 (Full) | Manajer operasional, akses penuh |
| **TS** | 22 (No Cost) | Technical Service, monitoring + target |
| **Staff** | 21 (With Cost) | Staff kantor, input pengiriman + cost |
| **Operator** | 11 (Limited) | Petugas kandang, input harian saja |
| **Viewer** | 10 (Read-only) | Viewer, lihat saja |

---

## 🎯 Permission Categories

### 1. Kandang (5 permissions)
```
kandang.view          - Lihat kandang assigned
kandang.view_all      - Lihat semua kandang
kandang.create        - Tambah kandang baru
kandang.edit          - Edit data kandang
kandang.delete        - Hapus kandang
```

**Who has:**
- `view`: All roles
- `view_all`: Owner, Manager, TS, Staff, Viewer
- `create/edit/delete`: Owner, Manager only

---

### 2. Laporan Harian (5 permissions)
```
log.view              - Lihat laporan harian
log.create            - Input laporan harian
log.edit              - Edit laporan harian
log.delete            - Hapus laporan harian
log.complete          - Selesaikan hari
```

**Who has:**
- `view`: All roles
- `create/complete`: Owner, Manager, TS, Operator
- `edit/delete`: Owner, Manager, TS only

---

### 3. Cost & Harga (3 permissions) 🚫 TS TIDAK PUNYA
```
cost.view             - Lihat harga/biaya
cost.edit             - Edit harga referensi
cost.report           - Laporan cost produksi
```

**Who has:**
- Owner, Manager, Staff **ONLY**
- ❌ **TS, Operator, Viewer TIDAK PUNYA**

---

### 4. Pengiriman (4 permissions) 🚫 TS TIDAK PUNYA
```
delivery.view         - Lihat pengiriman
delivery.create       - Input pengiriman + harga
delivery.edit         - Edit pengiriman
delivery.delete       - Hapus pengiriman
```

**Who has:**
- Owner, Manager, Staff **ONLY**
- ❌ **TS, Operator, Viewer TIDAK PUNYA**

---

### 5. Target (4 permissions)
```
target.view           - Lihat target
target.create         - Buat target custom
target.edit           - Edit target
target.delete         - Hapus target
```

**Who has:**
- `view`: All roles
- `create/edit/delete`: Owner, Manager, TS **ONLY**
- ❌ Staff, Operator, Viewer TIDAK bisa edit target

---

### 6. Jadwal Kunjungan TS (5 permissions)
```
visit.view            - Lihat jadwal kunjungan
visit.create          - Buat jadwal kunjungan
visit.edit            - Edit jadwal kunjungan
visit.delete          - Hapus jadwal kunjungan
visit.complete        - Selesaikan kunjungan + catatan
```

**Who has:**
- `view`: All roles
- `create/edit/delete/complete`: Owner, Manager, TS **ONLY**

---

### 7. Obat/Vitamin/Vaksin (5 permissions)
```
medication.view       - Lihat program kesehatan
medication.create     - Buat program kesehatan
medication.edit       - Edit program kesehatan
medication.delete     - Hapus program kesehatan
medication.execute    - Tandai obat sudah diberikan
```

**Who has:**
- `view`: All roles
- `create/edit/delete`: Owner, Manager, TS **ONLY**
- `execute`: Owner, Manager, TS, Operator

---

### 8. Inventory (3 permissions)
```
inventory.view        - Lihat stok inventory
inventory.view_cost   - Lihat harga inventory 🚫 TS TIDAK PUNYA
inventory.edit        - Edit stok inventory
```

**Who has:**
- `view`: All roles
- `view_cost`: Owner, Manager, Staff **ONLY**
- `edit`: Owner, Manager, Staff

---

### 9. Team Management (4 permissions)
```
member.view           - Lihat anggota tim
member.invite         - Undang anggota baru
member.edit           - Edit role anggota
member.remove         - Hapus anggota
```

**Who has:**
- `view`: All roles
- `invite/edit/remove`: Owner, Manager **ONLY**

---

### 10. Settings (2 permissions)
```
settings.view         - Lihat pengaturan
settings.edit         - Edit pengaturan
```

**Who has:**
- `view`: All roles
- `edit`: Owner, Manager **ONLY**

---

### 11. Reports (3 permissions)
```
report.view           - Lihat laporan & grafik
report.export         - Export laporan (Excel/PDF)
report.cost           - Laporan dengan cost 🚫 TS TIDAK PUNYA
```

**Who has:**
- `view/export`: All roles
- `cost`: Owner, Manager, Staff **ONLY**

---

## 💻 How to Use in Code

### Backend (SQL)

```sql
-- Check single permission
SELECT user_has_permission('user_id', 'cost.view');

-- Get all permissions for user
SELECT * FROM get_user_permissions('user_id');

-- Example: Check if user can create kandang
SELECT user_has_permission(auth.uid()::text, 'kandang.create');
```

### Frontend (JavaScript) - Coming Soon

```javascript
// Check permission
if (AUTH.can('cost.view')) {
  // Show cost information
}

// Hide element based on permission
<button v-if="AUTH.can('kandang.create')">
  Tambah Kandang
</button>

// Get all permissions
const permissions = AUTH.getPermissions();
console.log(permissions);
```

---

## 🚨 Important Rules

### 1. TS TIDAK BOLEH LIHAT COST
```javascript
// ❌ WRONG - TS bisa lihat harga
if (role === 'ts') {
  showInventory(); // includes price
}

// ✅ CORRECT - Hide price dari TS
if (AUTH.can('inventory.view_cost')) {
  showInventoryWithPrice();
} else {
  showInventoryWithoutPrice();
}
```

### 2. Operator Hanya Lihat Kandang Assigned
```sql
-- ❌ WRONG - Operator lihat semua kandang
SELECT * FROM kandangs;

-- ✅ CORRECT - Filter by pj_user_id
SELECT * FROM kandangs 
WHERE pj_user_id = auth.uid()::text;
```

### 3. Staff Tidak Bisa Edit Target
```javascript
// ❌ WRONG - Staff bisa edit target
if (role === 'staff') {
  showEditTargetButton();
}

// ✅ CORRECT - Check permission
if (AUTH.can('target.edit')) {
  showEditTargetButton();
}
```

---

## 🔍 Permission Check Examples

### Example 1: Hide Cost dari TS
```javascript
// Dashboard KPI
if (AUTH.can('cost.view')) {
  showKPI('Total Cost', totalCost);
  showKPI('Profit', profit);
}

// Inventory
if (AUTH.can('inventory.view_cost')) {
  showColumn('Harga Satuan');
  showColumn('Total Nilai');
}

// Reports
if (AUTH.can('report.cost')) {
  showReport('Cost Produksi');
  showReport('Profit/Loss');
}
```

### Example 2: Operator Limited Access
```javascript
// Kandang List
if (AUTH.can('kandang.view_all')) {
  loadAllKandangs();
} else {
  loadAssignedKandangs(AUTH.userId);
}

// Add Kandang Button
if (AUTH.can('kandang.create')) {
  showButton('Tambah Kandang');
}

// Edit Laporan
if (AUTH.can('log.edit')) {
  enableEditMode();
} else {
  disableEditMode();
}
```

### Example 3: TS Can Create Target
```javascript
// Target Page
if (AUTH.can('target.create')) {
  showButton('Buat Target Baru');
}

if (AUTH.can('target.edit')) {
  enableEditMode();
}

// Jadwal Kunjungan
if (AUTH.can('visit.create')) {
  showButton('Jadwalkan Kunjungan');
}
```

---

## 📊 Permission Matrix Table

| Permission | Owner | Manager | TS | Staff | Operator | Viewer |
|------------|-------|---------|----|----|----------|--------|
| **Kandang** |
| view | ✅ | ✅ | ✅ | ✅ | ✅ (assigned) | ✅ |
| view_all | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ |
| create | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| edit | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| delete | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Laporan** |
| view | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| create | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ |
| edit | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| complete | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ |
| **Cost** |
| view | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ |
| edit | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ |
| report | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ |
| **Delivery** |
| view | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ |
| create | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ |
| edit | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ |
| **Target** |
| view | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| create | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| edit | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Visit** |
| view | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| create | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| complete | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Medication** |
| view | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| create | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| execute | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ |
| **Inventory** |
| view | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| view_cost | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ |
| edit | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ |

---

## 🛠️ Troubleshooting

### Problem: User tidak punya permission yang seharusnya ada
```sql
-- Check user role
SELECT id, username, role FROM users WHERE id = 'user_id';

-- Check permissions for role
SELECT p.code, p.name 
FROM role_permissions rp
JOIN permissions p ON p.id = rp.permission_id
WHERE rp.role = 'ts';

-- Re-assign permissions if needed
-- (See migration file for commands)
```

### Problem: Permission check selalu return FALSE
```sql
-- Verify function exists
SELECT proname FROM pg_proc WHERE proname = 'user_has_permission';

-- Test function directly
SELECT user_has_permission('u5', 'target.create');

-- Check if permission exists
SELECT * FROM permissions WHERE code = 'target.create';
```

---

## 📚 Related Files

- `IMPLEMENTATION_CHECKLIST.md` - Full implementation checklist
- `SPRINT1_SUMMARY.md` - Sprint 1 summary & results
- `supabase/migrations/20260510_role_permission_system.sql` - Main migration
- `DATABASE_SCHEMA.md` - Database schema documentation

---

**Last Updated:** 2026-05-10  
**Version:** 1.0
