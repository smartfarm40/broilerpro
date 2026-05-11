# BroilerTrack - Supabase Setup Documentation

## 📋 Overview

BroilerTrack menggunakan Supabase sebagai backend dengan fitur:
- PostgreSQL Database dengan RLS (Row Level Security)
- Edge Functions untuk business logic
- Real-time subscriptions
- Authentication & Authorization

---

## 🗄️ Database Schema

### Tables (14 total)

#### 1. **kandangs** - Data Kandang
Menyimpan informasi kandang ayam broiler.

**Kolom Utama:**
- `id` (TEXT, PK) - ID kandang
- `name` (TEXT) - Nama kandang
- `kapasitas` (INTEGER) - Kapasitas maksimal ekor
- `doc` (INTEGER) - Jumlah DOC saat ini
- `usia` (INTEGER) - Usia ayam (hari)
- `breed` (VARCHAR) - Jenis ayam (CP707, Cobb500, Ross308, dll)
- `tanggal_chick_in` (DATE) - Tanggal DOC masuk
- `tanggal_target_panen` (DATE) - Target tanggal panen
- `status` (TEXT) - Status kandang (aktif/nonaktif)
- `lat`, `lng` (FLOAT) - Koordinat lokasi
- `pj_user_id`, `ts_user_id` (TEXT) - User ID penanggung jawab

#### 2. **data_harian** - Catatan Harian
Recording harian untuk setiap kandang.

**Kolom Utama:**
- `id` (UUID, PK)
- `kandang_id` (TEXT, FK → kandangs)
- `tanggal` (DATE) - Tanggal recording
- `hari` (INTEGER) - Hari ke-
- `mati`, `culling` (INTEGER) - Mortalitas
- `pakan_total` (NUMERIC) - Total pakan (kg)
- `berat_rata_rata` (NUMERIC) - Berat rata-rata (gram)
- `timbang_rows` (JSONB) - Data penimbangan detail
- `checklist` (JSONB) - Checklist harian
- `activities` (JSONB) - Aktivitas harian
- `is_complete` (BOOLEAN) - Status kelengkapan data

#### 3. **panen** - Data Panen/Harvest
Tracking hasil panen ayam.

**Kolom Utama:**
- `id` (UUID, PK)
- `kandang_id` (TEXT, FK → kandangs)
- `tanggal_panen` (DATE)
- `hari_ke` (INTEGER)
- `jumlah_ekor` (INTEGER)
- `berat_total_kg` (NUMERIC)
- `berat_rata_rata` (NUMERIC, GENERATED) - Auto-calculated
- `harga_per_kg` (NUMERIC)
- `total_pendapatan` (NUMERIC, GENERATED) - Auto-calculated
- `pembeli`, `kendaraan`, `penimbang` (TEXT)
- `grade` (VARCHAR) - Kualitas (A/B/C)

#### 4. **users** - User Management
Manajemen pengguna sistem.

**Kolom Utama:**
- `id` (TEXT, PK)
- `username` (TEXT, UNIQUE)
- `password` (TEXT)
- `nama` (TEXT)
- `role` (TEXT) - owner/kandang/ts/staff
- `kandang_id` (TEXT, FK → kandangs)

**Roles:**
- `owner` - Pemilik, akses penuh
- `ts` - Technical Support/Dokter hewan
- `kandang` - Petugas kandang
- `staff` - Staff kantor

#### 5. **keuangan_kandang** - Keuangan
Tracking biaya dan pendapatan per kandang.

**Kolom Utama:**
- DOC: `doc_ekor`, `doc_harga`, `doc_supplier`
- Pakan: `pakan_kg`, `pakan_harga`, `pakan_jenis`
- Biaya: `biaya_obat`, `biaya_vaksin`, `biaya_listrik`, `biaya_solar`, `biaya_sekam`
- Tenaga Kerja: `tk_jumlah`, `tk_upah`
- Penjualan: `jual_kg`, `jual_harga`, `jual_pembeli`
- **Calculated:** `total_biaya`, `pendapatan`, `laba_rugi`

#### 6. **stock_pakan** - Stock Pakan
Tracking stock pakan per kandang (1:1 dengan kandang).

#### 7. **penyakit** - Riwayat Penyakit
Recording penyakit dan treatment.

#### 8. **vaksinasi** - Jadwal Vaksinasi
Tracking vaksinasi yang sudah dilakukan.

#### 9. **target_periode** - Target Harian
Target berat, pakan, obat, vitamin per hari.

#### 10. **harga_referensi** - Harga Referensi
Harga standar untuk kalkulasi (DOC, pakan, jual, dll).

#### 11. **growth_targets** - Target Pertumbuhan
Target berat per hari berdasarkan breed.

#### 12. **feed_targets** - Target Pakan
Target konsumsi pakan per 1000 ekor per hari.

#### 13. **profiles** - User Profiles
Extended user information (linked to Supabase Auth).

#### 14. **notifikasi** - Notifications
Sistem notifikasi untuk users.

---

## 🔐 Row Level Security (RLS)

Semua tabel menggunakan RLS untuk keamanan data.

### Helper Functions

```sql
-- Get user's assigned kandang_id
public.get_user_kandang_id() RETURNS TEXT

-- Check if user is owner or TS
public.is_owner_or_ts() RETURNS BOOLEAN
```

### Policy Rules

**Owner & TS:**
- Full access ke semua data
- Bisa create, read, update, delete

**Petugas Kandang:**
- Hanya bisa akses data kandang mereka sendiri
- Bisa create & update data harian, panen, dll
- Tidak bisa delete (kecuali notifikasi sendiri)

**Staff:**
- Read-only access ke semua data

---

## ⚡ Edge Functions

### 1. **calculate-fcr**
Menghitung FCR (Feed Conversion Ratio) untuk kandang.

**Endpoint:** `https://rsqbxzhrainejnbxnvfw.supabase.co/functions/v1/calculate-fcr`

**Request:**
```json
{
  "kandang_id": "K1",
  "tanggal_mulai": "2026-01-01",  // optional
  "tanggal_akhir": "2026-05-10"   // optional
}
```

**Response:**
```json
{
  "kandang_id": "K1",
  "total_pakan_kg": 8500.50,
  "total_berat_panen_kg": 5200.00,
  "fcr": 1.635,
  "jumlah_hari": 35,
  "status": "good",
  "message": "FCR baik. Efisiensi pakan di atas rata-rata."
}
```

**Status Values:**
- `excellent` - FCR ≤ 1.5
- `good` - FCR ≤ 1.6
- `fair` - FCR ≤ 1.7
- `poor` - FCR ≤ 1.8
- `very_poor` - FCR > 1.8
- `no_data` - Belum ada data panen

### 2. **daily-report**
Generate laporan harian lengkap untuk kandang.

**Endpoint:** `https://rsqbxzhrainejnbxnvfw.supabase.co/functions/v1/daily-report`

**Request:**
```json
{
  "kandang_id": "K1",
  "tanggal": "2026-05-10"
}
```

**Response:**
```json
{
  "kandang": { /* data kandang */ },
  "data_harian": { /* data harian tanggal tersebut */ },
  "stock_pakan": { /* stock pakan saat ini */ },
  "summary": {
    "populasi_saat_ini": 4850,
    "mortalitas_hari_ini": 5,
    "mortalitas_kumulatif": 150,
    "deplesi_rate": 3.00,
    "pakan_konsumsi": 245.5,
    "berat_rata_rata": 1850,
    "fcr_estimasi": 1.620
  }
}
```

### 3. **invite-member** (Existing)
Invite user baru ke sistem.

---

## 📊 Migrations Applied

### Migration History

1. **add_breed_to_kandangs** - Tambah kolom `breed` ke tabel kandangs
2. **create_panen_table** - Buat tabel panen untuk tracking harvest
3. **add_periode_tracking_to_kandangs** - Tambah `tanggal_chick_in` dan `tanggal_target_panen`
4. **add_missing_foreign_key_indexes** - Tambah 7 index untuk foreign keys
5. **fix_permissive_rls_policies_v2** - Perbaiki RLS policies dengan role-based access

---

## 🔧 Performance Optimizations

### Indexes Added
- `idx_keuangan_kandang_kandang_id`
- `idx_notifikasi_kandang_id`
- `idx_notifikasi_user_id`
- `idx_penyakit_kandang_id`
- `idx_profiles_kandang_id`
- `idx_users_kandang_id`
- `idx_vaksinasi_kandang_id`
- `idx_panen_kandang_id`
- `idx_panen_tanggal`

### Generated Columns
- `panen.berat_rata_rata` = `berat_total_kg / jumlah_ekor`
- `panen.total_pendapatan` = `berat_total_kg * harga_per_kg`
- `keuangan_kandang.total_biaya` = sum of all costs
- `keuangan_kandang.pendapatan` = `jual_kg * jual_harga`
- `keuangan_kandang.laba_rugi` = `pendapatan - total_biaya`

---

## 🚀 Usage Examples

### Query Data dengan TypeScript

```typescript
import { createClient } from '@supabase/supabase-js'
import type { Database } from './types/database.types'

const supabase = createClient<Database>(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
)

// Get all active kandangs
const { data: kandangs } = await supabase
  .from('kandangs')
  .select('*')
  .eq('status', 'aktif')

// Get data harian with kandang info
const { data: dataHarian } = await supabase
  .from('data_harian')
  .select(`
    *,
    kandangs (
      name,
      kapasitas,
      breed
    )
  `)
  .eq('tanggal', '2026-05-10')

// Insert panen data
const { data, error } = await supabase
  .from('panen')
  .insert({
    kandang_id: 'K1',
    tanggal_panen: '2026-05-10',
    hari_ke: 35,
    jumlah_ekor: 4800,
    berat_total_kg: 8640,
    harga_per_kg: 21500,
    pembeli: 'PT Maju Jaya',
    grade: 'A'
  })

// Call Edge Function
const { data: fcrData } = await supabase.functions.invoke('calculate-fcr', {
  body: {
    kandang_id: 'K1',
    tanggal_mulai: '2026-04-01',
    tanggal_akhir: '2026-05-10'
  }
})
```

---

## 📝 Environment Variables

```env
SUPABASE_URL=https://rsqbxzhrainejnbxnvfw.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## 🔍 Monitoring & Advisors

Gunakan Supabase Advisors untuk monitoring:

```bash
# Check security issues
supabase db lint --level security

# Check performance issues
supabase db lint --level performance
```

**Current Status:**
- ✅ RLS policies secured dengan role-based access
- ✅ Foreign key indexes added
- ⚠️ Beberapa RLS policies perlu auth function optimization (minor)

---

## 📚 Resources

- [Supabase Documentation](https://supabase.com/docs)
- [PostgreSQL RLS Guide](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Edge Functions Guide](https://supabase.com/docs/guides/functions)
- [Database Linter](https://supabase.com/docs/guides/database/database-linter)

---

**Last Updated:** May 10, 2026
**Database Version:** PostgreSQL 17.6.1.104
**Project ID:** rsqbxzhrainejnbxnvfw
