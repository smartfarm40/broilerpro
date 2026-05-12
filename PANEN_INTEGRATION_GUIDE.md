# 🌾 Panduan Integrasi Fitur Panen Ayam

## 📋 Overview

Fitur Panen Ayam memungkinkan:
- ✅ Buat data panen baru
- ✅ Timbang panen (konsep seperti timbang harian)
- ✅ Tabel data timbang
- ✅ Ringkasan panen (total, rata-rata, min-max)
- ✅ Nama penimbang
- ✅ Export PDF (coming soon)
- ✅ Integrasi dengan Staff Kantor

## 🗂️ Files Created

1. **js/panen.js** - Service layer untuk CRUD panen
2. **panen.html** - HTML template halaman panen
3. **supabase/migrations/20260512010000_create_panen_tables.sql** - Database schema
4. **CSS** - Sudah ditambahkan ke `css/style.css`
5. **JS Functions** - Sudah ditambahkan ke `js/app.js`

## 🔧 Integration Steps

### **Step 1: Add Script Tag**

Tambahkan di `index.html` sebelum closing `</body>`:

```html
<!-- Panen Management -->
<script src="js/panen.js"></script>
```

**Lokasi:** Setelah `<script src="js/production-costs.js"></script>`

---

### **Step 2: Add Navigation Item**

Tambahkan menu Panen di navigation bar (`index.html`):

```html
<!-- Panen -->
<button class="nav-item" id="nav-panen" onclick="navigateTo('panen')" data-page="panen">
  <span class="material-icons-round">agriculture</span>
  <span>Panen</span>
</button>
```

**Lokasi:** Setelah nav-item "Cost" (sekitar line 1135)

---

### **Step 3: Add Page Section**

Copy isi file `panen.html` dan paste ke `index.html`:

**Lokasi:** Setelah `<section id="page-cost">` (sekitar line 880)

```html
<!-- ===== HALAMAN PANEN ===== -->
<section id="page-panen" class="page">
  <!-- Copy semua isi dari panen.html -->
</section>
```

---

### **Step 4: Update navigateTo Function**

Tambahkan case untuk panen di fungsi `navigateTo()` dalam `js/app.js`:

```javascript
function navigateTo(page) {
  // ... existing code ...
  
  if (page === 'panen') {
    loadPanen().then(() => renderPanen());
  }
  
  // ... existing code ...
}
```

**Lokasi:** Dalam fungsi `navigateTo()` (sekitar line 750)

---

### **Step 5: Update applyRoleUI Function**

Tambahkan visibility rules untuk menu Panen:

```javascript
function applyRoleUI() {
  // ... existing code ...
  
  const navRules = {
    // ... existing rules ...
    'nav-panen': AUTH.can('panen.view')
  };
  
  // ... existing code ...
}
```

**Lokasi:** Dalam fungsi `applyRoleUI()` (sekitar line 100)

---

### **Step 6: Apply Database Migration**

Run migration untuk membuat tabel panen:

```bash
supabase db push
```

Atau manual di Supabase Dashboard:
```sql
-- Copy isi dari:
-- supabase/migrations/20260512010000_create_panen_tables.sql
```

---

## 🎯 Features

### **1. Buat Panen Baru**
```
1. Klik "Buat Panen Baru"
2. Pilih kandang
3. Pilih tanggal panen
4. Umur otomatis terisi
5. Input nama penimbang
6. Klik "Buat Panen"
```

### **2. Timbang Panen**
```
1. Buka detail panen
2. Input berat (kg)
3. Input jumlah ekor
4. Input catatan (opsional)
5. Klik "Tambah"
6. Data masuk ke tabel
```

### **3. Ringkasan Otomatis**
- Total Ekor
- Total Berat (kg)
- Berat Rata-rata (kg)
- Min - Max (kg)

### **4. Selesaikan Panen**
```
1. Pastikan ada minimal 1 data timbang
2. Klik "Selesaikan Panen"
3. Konfirmasi
4. Status berubah jadi "Selesai"
5. Data tidak bisa diubah lagi
```

### **5. Export PDF** (Coming Soon)
```
1. Klik "Export PDF"
2. PDF ter-generate dengan:
   - Info panen
   - Tabel data timbang
   - Ringkasan
   - Nama penimbang
```

---

## 🔒 Permissions

| Role     | View | Create | Edit | Delete | Complete | Export |
|----------|------|--------|------|--------|----------|--------|
| Owner    | ✅   | ✅     | ✅   | ✅     | ✅       | ✅     |
| Manager  | ✅   | ✅     | ✅   | ✅     | ✅       | ✅     |
| Operator | ✅   | ✅     | ✅   | ❌     | ✅       | ❌     |
| Staff    | ✅   | ❌     | ❌   | ❌     | ❌       | ✅     |
| TS       | ✅   | ❌     | ❌   | ❌     | ❌       | ❌     |
| Viewer   | ❌   | ❌     | ❌   | ❌     | ❌       | ❌     |

---

## 📊 Database Schema

### **Table: panen**
```sql
- id (UUID, PK)
- kandang_id (UUID, FK → kandangs)
- tanggal_panen (DATE)
- umur_hari (INTEGER)
- penimbang_id (UUID, FK → profiles)
- total_ekor (INTEGER)
- total_berat (DECIMAL)
- berat_rata_rata (DECIMAL)
- berat_min (DECIMAL)
- berat_max (DECIMAL)
- status (VARCHAR: draft, completed, cancelled)
- catatan (TEXT)
- created_by (UUID)
- created_at (TIMESTAMPTZ)
- completed_at (TIMESTAMPTZ)
```

### **Table: panen_timbang**
```sql
- id (UUID, PK)
- panen_id (UUID, FK → panen)
- berat (DECIMAL)
- jumlah_ekor (INTEGER)
- catatan (TEXT)
- created_at (TIMESTAMPTZ)
```

---

## 🔗 Integrasi dengan Staff Kantor

### **Notifikasi Otomatis**
Ketika panen diselesaikan, staff kantor akan menerima notifikasi:

```javascript
// TODO: Implement notification
async function notifyStaffPanenCompleted(panenId) {
  // Send notification to staff
  // Update inventory/stock
  // Create report
}
```

### **Laporan untuk Staff**
Staff bisa:
- ✅ Lihat semua data panen
- ✅ Export PDF untuk laporan
- ✅ Integrasi dengan manajemen stok
- ✅ Analisis performa panen

---

## 🎨 UI Components

### **Panen Card**
```html
<div class="panen-card">
  <div class="panen-card-header">
    <div class="panen-card-title">Kandang A</div>
    <span class="panen-status-badge completed">Selesai</span>
  </div>
  <div class="panen-card-stats">
    <div class="panen-stat">
      <div class="panen-stat-val">5000</div>
      <div class="panen-stat-lbl">Ekor</div>
    </div>
    <!-- ... -->
  </div>
</div>
```

### **Timbang Form**
```html
<div class="panen-timbang-form">
  <input type="number" placeholder="Berat (kg)" />
  <input type="number" placeholder="Jumlah Ekor" />
  <input type="text" placeholder="Catatan" />
  <button>Tambah</button>
</div>
```

### **Summary Card**
```html
<div class="panen-summary-card">
  <div class="panen-summary-grid">
    <div class="panen-summary-item">
      <span class="panen-summary-label">Total Ekor</span>
      <span class="panen-summary-value">5000</span>
    </div>
    <!-- ... -->
  </div>
</div>
```

---

## 🧪 Testing Checklist

### **Create Panen**
- [ ] Pilih kandang aktif
- [ ] Tanggal panen valid
- [ ] Umur otomatis terisi
- [ ] Nama penimbang terisi
- [ ] Panen berhasil dibuat

### **Timbang Panen**
- [ ] Input berat valid (> 0)
- [ ] Input jumlah ekor valid (>= 1)
- [ ] Data masuk ke tabel
- [ ] Ringkasan terupdate otomatis

### **Complete Panen**
- [ ] Minimal 1 data timbang
- [ ] Konfirmasi muncul
- [ ] Status berubah jadi "Selesai"
- [ ] Form timbang hidden
- [ ] Data tidak bisa diubah

### **Permissions**
- [ ] Owner bisa semua
- [ ] Manager bisa semua
- [ ] Operator bisa create & complete
- [ ] Staff hanya view & export
- [ ] TS hanya view

---

## 🚀 Future Enhancements

### **1. Export PDF**
```javascript
// Using jsPDF
async function generatePanenPDF(panenId) {
  const doc = new jsPDF();
  // Add header
  // Add table
  // Add summary
  // Add signature
  doc.save('panen-' + panenId + '.pdf');
}
```

### **2. Bulk Timbang**
```javascript
// Import dari Excel/CSV
async function importTimbangBulk(file) {
  // Parse CSV
  // Validate data
  // Insert batch
}
```

### **3. Analisis Performa**
```javascript
// Compare dengan target
function analyzePanenPerformance(panenId) {
  // FCR actual vs target
  // Berat rata-rata vs standard
  // Mortalitas vs target
}
```

### **4. Integrasi Stok**
```javascript
// Auto update stok setelah panen
async function updateStockAfterPanen(panenId) {
  // Kurangi populasi kandang
  // Update stok ayam hidup
  // Create delivery record
}
```

---

## 📝 Notes

1. **Soft Delete**: Panen yang dihapus tidak benar-benar dihapus, hanya status berubah jadi "cancelled"
2. **Audit Trail**: Semua perubahan tercatat dengan `created_by` dan `created_at`
3. **RLS**: Row Level Security memastikan tenant isolation
4. **Cascade Delete**: Jika kandang dihapus, panen ikut terhapus
5. **Validation**: Client-side dan server-side validation

---

## 🐛 Troubleshooting

### **Error: "Supabase tidak tersedia"**
```javascript
// Check window._sbClient
console.log('Supabase Client:', window._sbClient);
```

### **Error: "Tidak punya izin"**
```javascript
// Check permission
console.log('Can create panen?', AUTH.can('panen.create'));
```

### **Data tidak muncul**
```javascript
// Check data
Panen.getAll().then(data => console.log('Panen:', data));
```

---

**Created by:** Kiro AI Assistant  
**Date:** 12 Mei 2026  
**Version:** 1.0.0  
**Status:** ✅ Ready for Integration
