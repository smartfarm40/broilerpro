# 🚀 Production Setup Guide - BroilerPro

Panduan lengkap untuk setup aplikasi BroilerPro dengan **data real** (bukan mock data).

---

## ✅ **Status Saat Ini**

Aplikasi **SUDAH menggunakan data real** dari Supabase PostgreSQL:
- ✅ Semua data disimpan di database cloud
- ✅ Tidak ada mock data atau localStorage
- ✅ Real-time sync antar device
- ✅ RLS (Row Level Security) aktif

---

## 📊 **Data yang Ada Saat Ini**

Berdasarkan database production:
- **4 Kandang** (Farm Anita, Kandang A, Kandang B, dll)
- **6 Profiles** (users yang sudah terdaftar)
- **7 Users** (di tabel users lama)
- **1 Data harian**
- **1 TS Visit**
- **3 Period targets**
- **1 Medication program**

---

## 🔄 **Cara Reset Database untuk Mulai Fresh**

### **Opsi 1: Reset via Supabase Dashboard (Recommended)**

1. Login ke [Supabase Dashboard](https://supabase.com/dashboard)
2. Pilih project: `broilerpro`
3. Buka **SQL Editor**
4. Copy-paste script dari file: `supabase/migrations/99999999999999_reset_data_for_production.sql`
5. Klik **Run**

**Script ini akan:**
- ✅ Hapus semua data transaksional
- ✅ Simpan 1 owner pertama (agar bisa login)
- ✅ Hapus semua kandang
- ✅ Tetap pertahankan struktur tabel & permissions

### **Opsi 2: Reset via Supabase CLI**

```bash
# 1. Pastikan sudah login
supabase login

# 2. Link ke project
supabase link --project-ref rsqbxzhrainejnbxnvfw

# 3. Reset database (HATI-HATI: Ini akan hapus SEMUA data!)
supabase db reset

# 4. Apply semua migrations
supabase db push
```

### **Opsi 3: Selective Delete (Manual)**

Jika hanya ingin hapus data tertentu:

```sql
-- Hapus semua kandang
DELETE FROM kandangs;

-- Hapus semua data harian
DELETE FROM data_harian;

-- Hapus semua jadwal kunjungan
DELETE FROM ts_visits;

-- Hapus semua anggota kecuali owner
DELETE FROM profiles WHERE role != 'owner';
```

---

## 🎯 **Workflow Penggunaan Data Real**

### **1. Setup Awal (First Time)**

1. **Register sebagai Owner**
   - Buka: `https://broilerpro.vercel.app/auth/register.html`
   - Daftar dengan email & password
   - Role otomatis: `owner`

2. **Buat Kandang Pertama**
   - Login ke aplikasi
   - Klik "Tambah Kandang Baru"
   - Isi: Nama, Kapasitas, Breed, Tanggal Chick-In
   - Data tersimpan di `kandangs` table

3. **Undang Anggota Tim**
   - Buka menu "Pengaturan" → "Kelola Tim"
   - Klik "Undang Anggota Baru"
   - Masukkan email & pilih role (Manager, TS, Operator, Staff)
   - Anggota akan menerima email invite

### **2. Input Data Harian (Daily Operations)**

1. **Operator Login**
   - Operator masuk dengan akun mereka
   - Pilih kandang yang di-assign

2. **Input Laporan Harian**
   - Buka menu "Laporan Harian"
   - Input:
     - Deplesi (mati, afkir)
     - Pakan (pagi, sore)
     - Air
     - Timbang berat
     - Checklist (suhu, kipas, inverter, dll)
   - Klik "Selesaikan"
   - Data tersimpan di `data_harian` table

3. **TS Buat Target**
   - TS login dan pilih kandang
   - Buka "Target Periode"
   - Buat target pakan/berat per hari
   - Data tersimpan di `period_targets` table

4. **TS Jadwalkan Kunjungan**
   - Buka "Jadwal Kunjungan"
   - Klik "Jadwalkan Kunjungan Baru"
   - Pilih kandang, tanggal, tujuan
   - Data tersimpan di `ts_visits` table

### **3. Monitoring & Reporting**

1. **Dashboard Real-time**
   - Owner/Manager bisa lihat semua kandang
   - KPI otomatis dihitung (FCR, mortalitas, berat rata-rata)
   - Grafik pertumbuhan real-time

2. **Export Laporan**
   - Buka "Grafik Pertumbuhan"
   - Klik "Ekspor Laporan"
   - Download PDF/Excel

### **4. Panen (Harvest)**

1. **Buat Panen Baru**
   - Buka menu "Panen"
   - Klik "Buat Panen Baru"
   - Pilih kandang, tanggal, penimbang

2. **Input Data Timbang**
   - Tambah data timbang per ekor/batch
   - Sistem otomatis hitung total, rata-rata, min-max

3. **Selesaikan Panen**
   - Klik "Selesaikan Panen"
   - Status berubah dari `draft` → `completed`
   - Data tersimpan di `panen` & `panen_timbang` tables

---

## 🔐 **Security & Permissions**

### **Role-Based Access Control (RBAC)**

| Role | Permissions |
|------|-------------|
| **Owner** | Full access - semua fitur |
| **Manager** | Hampir full access - tidak bisa hapus kandang |
| **TS** | Buat target, jadwal kunjungan, lihat semua data |
| **Operator** | Input data harian, lihat kandang assigned |
| **Staff** | Input deliveries, production costs, lihat laporan |
| **Viewer** | Read-only - hanya lihat data |

### **Row Level Security (RLS)**

Semua tabel menggunakan RLS:
- ✅ User hanya bisa akses data di tenant mereka
- ✅ Operator hanya bisa edit kandang yang di-assign
- ✅ Data antar tenant terisolasi

---

## 📱 **Multi-Device Sync**

Data **otomatis sync** antar device:
- ✅ Operator input di HP → Owner lihat di laptop (real-time)
- ✅ TS buat target di tablet → Operator lihat di HP
- ✅ Tidak perlu refresh manual

---

## 🐛 **Troubleshooting**

### **Problem: Data tidak muncul**

**Solusi:**
1. Cek koneksi internet
2. Refresh halaman (F5)
3. Logout & login ulang
4. Cek RLS policies di Supabase Dashboard

### **Problem: Tidak bisa input data**

**Solusi:**
1. Cek role user (apakah punya permission?)
2. Cek apakah kandang sudah di-assign ke user
3. Lihat console browser (F12) untuk error message

### **Problem: Error "violates row-level security policy"**

**Solusi:**
1. Pastikan user sudah login
2. Cek tenant_id user cocok dengan data
3. Jalankan migration terbaru:
   ```bash
   supabase db push
   ```

---

## 📊 **Monitoring Database**

### **Check Data Count**

```sql
-- Lihat jumlah data per tabel
SELECT 
  'kandangs' as table_name, COUNT(*) as rows FROM kandangs
UNION ALL
SELECT 'profiles', COUNT(*) FROM profiles
UNION ALL
SELECT 'data_harian', COUNT(*) FROM data_harian
UNION ALL
SELECT 'ts_visits', COUNT(*) FROM ts_visits
UNION ALL
SELECT 'period_targets', COUNT(*) FROM period_targets
ORDER BY table_name;
```

### **Check Active Users**

```sql
-- Lihat user yang aktif
SELECT 
  p.nama,
  p.email,
  p.role,
  p.created_at,
  k.name as kandang_name
FROM profiles p
LEFT JOIN kandangs k ON k.id = p.kandang_id
ORDER BY p.created_at DESC;
```

### **Check Recent Activities**

```sql
-- Lihat aktivitas terbaru
SELECT 
  dh.tanggal,
  dh.hari,
  k.name as kandang,
  dh.mati,
  dh.pakan_total,
  dh.berat_rata_rata
FROM data_harian dh
JOIN kandangs k ON k.id = dh.kandang_id
ORDER BY dh.created_at DESC
LIMIT 10;
```

---

## 🚀 **Next Steps**

1. ✅ **Reset database** (jika perlu) dengan script di atas
2. ✅ **Register owner** pertama
3. ✅ **Buat kandang** pertama
4. ✅ **Undang anggota** tim
5. ✅ **Mulai input data** harian
6. ✅ **Monitor dashboard** real-time

---

## 📞 **Support**

Jika ada masalah:
1. Cek file `TROUBLESHOOTING.md`
2. Lihat console browser (F12)
3. Cek Supabase logs di Dashboard

---

**Aplikasi sudah siap untuk production dengan data real!** 🎉
