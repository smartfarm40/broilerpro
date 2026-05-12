# 🗄️ Database Connection - BroilerPro

Dokumentasi lengkap tentang koneksi database aplikasi BroilerPro.

---

## 📊 **Database yang Digunakan**

Aplikasi BroilerPro terhubung ke **Supabase PostgreSQL** (cloud database).

### **Detail Koneksi:**

| Item | Value |
|------|-------|
| **Provider** | Supabase (PostgreSQL) |
| **Project Name** | broilerpro |
| **Project Ref** | rsqbxzhrainejnbxnvfw |
| **Database URL** | https://rsqbxzhrainejnbxnvfw.supabase.co |
| **Region** | Southeast Asia (Singapore) |
| **Database Type** | PostgreSQL 15.x |

---

## 🔌 **Koneksi di Aplikasi**

### **File Konfigurasi:**

**1. `js/supabase-client.js`** (Main Configuration)
```javascript
const SUPABASE_URL = 'https://rsqbxzhrainejnbxnvfw.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGc...'; // Public anon key

window._sbClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
```

**2. `.env.local`** (Environment Variables)
```env
SUPABASE_URL=https://rsqbxzhrainejnbxnvfw.supabase.co
SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_PUBLISHABLE_KEY=sb_publishable_t9et6v_jL5BI7OANraz7GA_53HcvolD
```

---

## 🏗️ **Struktur Database**

### **Tabel Utama:**

1. **kandangs** - Data kandang ayam
2. **profiles** - User profiles (linked to auth.users)
3. **data_harian** - Laporan harian (deplesi, pakan, timbang)
4. **ts_visits** - Jadwal kunjungan Technical Service
5. **period_targets** - Target pakan/berat per periode
6. **medication_programs** - Program kesehatan (obat/vaksin)
7. **medication_items** - Item obat dalam program
8. **medication_logs** - Log pemberian obat
9. **deliveries** - Pengiriman pakan/obat
10. **production_costs** - Biaya produksi per batch
11. **panen** - Data panen (harvest)
12. **panen_timbang** - Data timbang per panen

### **Tabel Referensi:**

- **growth_targets** - Target berat standar per breed
- **feed_targets** - Target pakan standar per breed
- **permissions** - Daftar permission
- **role_permissions** - Permission per role
- **harga_referensi** - Harga referensi (DOC, pakan, dll)

### **Tabel Legacy:**

- **users** - User lama (deprecated, diganti profiles)
- **target_periode** - Target lama (deprecated, diganti period_targets)
- **keuangan_kandang** - Keuangan lama (deprecated, diganti production_costs)
- **stock_pakan** - Stock lama (deprecated)
- **penyakit** - Penyakit lama (deprecated)
- **vaksinasi** - Vaksinasi lama (deprecated)
- **notifikasi** - Notifikasi lama (deprecated)

---

## 🔐 **Keamanan Database**

### **Row Level Security (RLS):**

Semua tabel menggunakan RLS untuk isolasi data:

```sql
-- Contoh: User hanya bisa akses data di tenant mereka
CREATE POLICY "profiles_select" ON profiles
  FOR SELECT
  TO authenticated
  USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()));
```

### **Authentication:**

- **Provider**: Supabase Auth (built-in)
- **Method**: Email + Password
- **Session**: JWT token (auto-refresh)
- **Storage**: localStorage (encrypted)

### **API Keys:**

1. **Anon Key** (Public) - Digunakan di frontend
   - Aman untuk di-expose
   - Hanya bisa akses data sesuai RLS policies
   
2. **Service Role Key** (Secret) - Digunakan di Edge Functions
   - **JANGAN** di-expose di frontend
   - Bypass RLS policies
   - Hanya untuk server-side operations

---

## 🌐 **Akses Database**

### **1. Via Aplikasi Web**

```
URL: https://broilerpro.vercel.app
Koneksi: Otomatis via Supabase Client
```

### **2. Via Supabase Dashboard**

```
URL: https://supabase.com/dashboard/project/rsqbxzhrainejnbxnvfw
Login: Gunakan akun Supabase Anda
```

**Fitur Dashboard:**
- ✅ Table Editor (CRUD data)
- ✅ SQL Editor (run queries)
- ✅ Database Logs
- ✅ API Docs
- ✅ Auth Management

### **3. Via Supabase CLI**

```bash
# Login
supabase login

# Link project
supabase link --project-ref rsqbxzhrainejnbxnvfw

# Run migrations
supabase db push

# Reset database
supabase db reset
```

### **4. Via PostgreSQL Client (Direct)**

```bash
# Connection string (dari Supabase Dashboard → Settings → Database)
postgresql://postgres:[PASSWORD]@db.rsqbxzhrainejnbxnvfw.supabase.co:5432/postgres

# Contoh dengan psql
psql "postgresql://postgres:[PASSWORD]@db.rsqbxzhrainejnbxnvfw.supabase.co:5432/postgres"
```

---

## 📈 **Monitoring Database**

### **1. Via Supabase Dashboard**

- **Database Health**: Dashboard → Database → Health
- **Query Performance**: Dashboard → Database → Query Performance
- **Storage Usage**: Dashboard → Settings → Usage

### **2. Via SQL Queries**

```sql
-- Cek ukuran database
SELECT 
  pg_size_pretty(pg_database_size('postgres')) as database_size;

-- Cek ukuran per tabel
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Cek jumlah rows per tabel
SELECT 
  schemaname,
  tablename,
  n_live_tup as row_count
FROM pg_stat_user_tables
WHERE schemaname = 'public'
ORDER BY n_live_tup DESC;
```

---

## 🔄 **Backup & Restore**

### **Automatic Backups (Supabase):**

- ✅ **Daily backups** (retained for 7 days)
- ✅ **Point-in-time recovery** (PITR) available
- ✅ **Managed by Supabase** (no manual action needed)

### **Manual Backup:**

```bash
# Via Supabase CLI
supabase db dump -f backup.sql

# Via pg_dump
pg_dump "postgresql://postgres:[PASSWORD]@db.rsqbxzhrainejnbxnvfw.supabase.co:5432/postgres" > backup.sql
```

### **Restore:**

```bash
# Via Supabase CLI
supabase db reset
supabase db push

# Via psql
psql "postgresql://postgres:[PASSWORD]@db.rsqbxzhrainejnbxnvfw.supabase.co:5432/postgres" < backup.sql
```

---

## 🚀 **Performance Tips**

### **1. Indexing**

Semua foreign keys sudah di-index:
```sql
CREATE INDEX idx_data_harian_kandang ON data_harian(kandang_id);
CREATE INDEX idx_profiles_tenant ON profiles(tenant_id);
```

### **2. Query Optimization**

```javascript
// ❌ Bad: N+1 queries
for (const kandang of kandangs) {
  const data = await sb.from('data_harian').select('*').eq('kandang_id', kandang.id);
}

// ✅ Good: Single query with join
const { data } = await sb
  .from('kandangs')
  .select('*, data_harian(*)')
  .eq('status', 'aktif');
```

### **3. Caching**

```javascript
// Cache reference data (jarang berubah)
let cachedGrowthTargets = null;

async function getGrowthTargets() {
  if (!cachedGrowthTargets) {
    const { data } = await sb.from('growth_targets').select('*');
    cachedGrowthTargets = data;
  }
  return cachedGrowthTargets;
}
```

---

## 🔧 **Troubleshooting**

### **Problem: Connection timeout**

**Solusi:**
1. Cek koneksi internet
2. Cek status Supabase: https://status.supabase.com
3. Cek firewall/proxy settings

### **Problem: RLS policy error**

**Solusi:**
1. Pastikan user sudah login (`auth.uid()` tidak null)
2. Cek tenant_id user cocok dengan data
3. Review RLS policies di Supabase Dashboard

### **Problem: Slow queries**

**Solusi:**
1. Tambah index pada kolom yang sering di-query
2. Gunakan `.select()` dengan kolom spesifik (jangan `*`)
3. Limit hasil query dengan `.limit()`

---

## 📞 **Support**

**Supabase Support:**
- Dashboard: https://supabase.com/dashboard
- Docs: https://supabase.com/docs
- Discord: https://discord.supabase.com

**Database Admin:**
- Email: barotech26@gmail.com (Administrator)
- Dashboard: https://supabase.com/dashboard/project/rsqbxzhrainejnbxnvfw

---

## ✅ **Summary**

| Item | Value |
|------|-------|
| **Database** | Supabase PostgreSQL |
| **Project** | broilerpro (rsqbxzhrainejnbxnvfw) |
| **URL** | https://rsqbxzhrainejnbxnvfw.supabase.co |
| **Region** | Southeast Asia (Singapore) |
| **RLS** | ✅ Enabled (all tables) |
| **Backups** | ✅ Daily (7 days retention) |
| **Auth** | ✅ Supabase Auth (Email + Password) |
| **Real-time** | ✅ Supported (via Supabase Realtime) |

**Database sudah production-ready dan aman!** 🎉
