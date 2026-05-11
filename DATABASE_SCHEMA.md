# BroilerTrack — Database Schema v2.0

> Diperbarui: 2026-05-09
> Versi ini mencerminkan semua perubahan yang telah diimplementasikan di aplikasi PWA.

---

## Daftar Isi

1. [Ringkasan Perubahan dari v1.0](#1-ringkasan-perubahan)
2. [Struktur Data Lengkap](#2-struktur-data)
3. [Schema SQL Lengkap](#3-schema-sql)
4. [API Routes & Query](#4-api-routes--query)
5. [Migrasi dari localStorage v2](#5-migrasi-localstorage-v2)
6. [Checklist Implementasi v2](#6-checklist-implementasi-v2)

---

## 1. Ringkasan Perubahan

| Tabel / Entitas | Perubahan |
|---|---|
| `flocks` | Tambah kolom `officer` (nama petugas) |
| `daily_logs` | Tambah: `culling`, `feed_code`, `feed_am`, `feed_pm`, `timbang_rows` (JSONB), `checklist` (JSONB), `activities` (JSONB) |
| `timbang_rows` | Entitas baru — detail timbang berat per sesi (embedded di daily_log) |
| `daily_checklist` | Entitas baru — suhu, kipas, inverter, PLN, genset |
| `activity_log` | Entitas baru — histori aktivitas input per hari dengan timestamp |
| `growth_targets` | Seed data ditambah: Cobb 500 & Ross 308 hari 1-35 (berat + pakan) |
| `feed_targets` | Entitas baru — standar konsumsi pakan per 1000 ekor per hari |

---

## 2. Struktur Data

### 2.1 Flock (Kandang)

```javascript
{
  id:        UUID,
  tenant_id: UUID,
  farm_id:   UUID,
  name:      "Kandang Utara A",
  breed:     "Cobb 500",           // Cobb 500 | Ross 308 | Hubbard | Lainnya
  initial_qty: 5000,
  current_qty: 4985,               // dihitung: initial - sum(mortality+culling)
  start_date:  "2023-10-12",
  end_date:    null,               // null = masih aktif
  status:      "active",           // active | harvested | terminated
  officer:     "Budi Santoso",     // ← BARU: nama petugas kandang
  batch_code:  "Batch #402",
  notes:       "",
  created_by:  UUID
}
```

### 2.2 Daily Log (Laporan Harian)

```javascript
{
  id:         UUID,
  tenant_id:  UUID,
  flock_id:   UUID,
  log_date:   "2023-11-05",
  day_number: 24,

  // --- Deplesi ---
  mortality:  1,                   // jumlah mati
  culling:    0,                   // ← BARU: jumlah afkir

  // --- Pakan ---
  feed_code:  "BR-2",              // ← BARU: kode pakan (BR-1/BR-2/BR-3/511/512/594)
  feed_am:    9.5,                 // ← BARU: pakan pagi (kg)
  feed_pm:    9.5,                 // ← BARU: pakan sore (kg)
  feed:       19.0,                // total pakan (feed_am + feed_pm)

  // --- Air ---
  water:      335,                 // liter

  // --- Berat ---
  weight:     950,                 // gram, rata-rata dari timbang
  timbang_rows: [                  // ← BARU: detail sesi timbang
    { berat: 5.7, sample: 5 },     // berat total (kg), jumlah ekor sample
    { berat: 6.2, sample: 5 }
  ],

  // --- Check List ---
  checklist: {                     // ← BARU
    suhu:        "32",             // °C
    kipas:       "on",             // on | off
    kipasQty:    "6",              // jumlah kipas menyala
    inverter:    "on",             // on | off
    inverterQty: "2",              // jumlah inverter aktif
    inverterHz:  "45",             // frekuensi Hz
    pln:         "on",             // on | off
    genset:      "off"             // on | off
  },

  // --- Histori Aktivitas ---
  activities: [                    // ← BARU: max 50 entri, urutan terbaru di atas
    {
      type:   "timbang",           // deplesi|pakan|air|timbang|checklist|catatan|selesai
      detail: "6 timbangan | Rata-rata: 1147 gr",
      time:   "22:15",
      ts:     "2023-11-05T22:15:00.000Z"
    }
  ],

  notes:       "Normal",
  is_complete: true,
  created_by:  UUID
}
```

### 2.3 Growth Targets (Standar Berat)

```javascript
// Tersedia untuk Cobb 500 & Ross 308, hari 1-35
{ breed: "Cobb 500", day: 24, target_weight: 1431 }  // gram/ekor
{ breed: "Ross 308", day: 24, target_weight: 1391 }
```

### 2.4 Feed Targets (Standar Pakan)

```javascript
// kg per 1000 ekor per hari — dikalikan populasi aktif untuk dapat total
{ breed: "Cobb 500", day: 24, feed_per_thousand: 0.506 }
{ breed: "Ross 308", day: 24, feed_per_thousand: 0.487 }
```

---

## 3. Schema SQL

### 3.1 Tabel flocks (update)

```sql
ALTER TABLE flocks
  ADD COLUMN officer VARCHAR(100);  -- nama petugas kandang

-- Index untuk query petugas
CREATE INDEX idx_flocks_officer ON flocks(tenant_id, officer);
```

### 3.2 Tabel daily_logs (update lengkap)

```sql
-- Kolom baru
ALTER TABLE daily_logs
  ADD COLUMN culling        INT          DEFAULT 0,
  ADD COLUMN feed_code      VARCHAR(20),
  ADD COLUMN feed_am        DECIMAL(8,2) DEFAULT 0,
  ADD COLUMN feed_pm        DECIMAL(8,2) DEFAULT 0,
  ADD COLUMN timbang_rows   JSONB        DEFAULT '[]'::jsonb,
  ADD COLUMN checklist      JSONB        DEFAULT '{}'::jsonb,
  ADD COLUMN activities     JSONB        DEFAULT '[]'::jsonb;

-- Kolom yang sudah ada (referensi)
-- mortality, feed (total), water, weight, notes, is_complete, log_date, day_number

-- Index untuk query JSONB
CREATE INDEX idx_daily_checklist  ON daily_logs USING gin(checklist);
CREATE INDEX idx_daily_activities ON daily_logs USING gin(activities);
CREATE INDEX idx_daily_timbang    ON daily_logs USING gin(timbang_rows);
```

### 3.3 Tabel feed_targets (baru)

```sql
CREATE TABLE feed_targets (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  breed           VARCHAR(50)   NOT NULL,
  day_number      INT           NOT NULL,
  feed_per_thousand DECIMAL(8,4) NOT NULL,  -- kg per 1000 ekor
  created_at      TIMESTAMPTZ   DEFAULT now(),
  UNIQUE(breed, day_number)
);

-- Seed data Cobb 500
INSERT INTO feed_targets (breed, day_number, feed_per_thousand) VALUES
  ('Cobb 500',  1, 0.013), ('Cobb 500',  2, 0.020), ('Cobb 500',  3, 0.029),
  ('Cobb 500',  4, 0.040), ('Cobb 500',  5, 0.053), ('Cobb 500',  6, 0.068),
  ('Cobb 500',  7, 0.085), ('Cobb 500',  8, 0.104), ('Cobb 500',  9, 0.124),
  ('Cobb 500', 10, 0.146), ('Cobb 500', 11, 0.169), ('Cobb 500', 12, 0.193),
  ('Cobb 500', 13, 0.218), ('Cobb 500', 14, 0.244), ('Cobb 500', 15, 0.270),
  ('Cobb 500', 16, 0.297), ('Cobb 500', 17, 0.324), ('Cobb 500', 18, 0.351),
  ('Cobb 500', 19, 0.378), ('Cobb 500', 20, 0.405), ('Cobb 500', 21, 0.431),
  ('Cobb 500', 22, 0.457), ('Cobb 500', 23, 0.482), ('Cobb 500', 24, 0.506),
  ('Cobb 500', 25, 0.529), ('Cobb 500', 26, 0.551), ('Cobb 500', 27, 0.572),
  ('Cobb 500', 28, 0.592), ('Cobb 500', 29, 0.611), ('Cobb 500', 30, 0.629),
  ('Cobb 500', 31, 0.645), ('Cobb 500', 32, 0.661), ('Cobb 500', 33, 0.675),
  ('Cobb 500', 34, 0.688), ('Cobb 500', 35, 0.700);

-- Seed data Ross 308
INSERT INTO feed_targets (breed, day_number, feed_per_thousand) VALUES
  ('Ross 308',  1, 0.012), ('Ross 308',  2, 0.019), ('Ross 308',  3, 0.027),
  ('Ross 308',  4, 0.038), ('Ross 308',  5, 0.050), ('Ross 308',  6, 0.065),
  ('Ross 308',  7, 0.082), ('Ross 308',  8, 0.100), ('Ross 308',  9, 0.120),
  ('Ross 308', 10, 0.141), ('Ross 308', 11, 0.163), ('Ross 308', 12, 0.186),
  ('Ross 308', 13, 0.210), ('Ross 308', 14, 0.235), ('Ross 308', 15, 0.260),
  ('Ross 308', 16, 0.286), ('Ross 308', 17, 0.312), ('Ross 308', 18, 0.338),
  ('Ross 308', 19, 0.364), ('Ross 308', 20, 0.390), ('Ross 308', 21, 0.415),
  ('Ross 308', 22, 0.440), ('Ross 308', 23, 0.464), ('Ross 308', 24, 0.487),
  ('Ross 308', 25, 0.509), ('Ross 308', 26, 0.530), ('Ross 308', 27, 0.550),
  ('Ross 308', 28, 0.569), ('Ross 308', 29, 0.587), ('Ross 308', 30, 0.604),
  ('Ross 308', 31, 0.620), ('Ross 308', 32, 0.635), ('Ross 308', 33, 0.649),
  ('Ross 308', 34, 0.662), ('Ross 308', 35, 0.674);
```

### 3.4 Update growth_targets (seed lengkap)

```sql
INSERT INTO growth_targets (tenant_id, breed, day_number, target_weight) VALUES
-- Cobb 500 (tenant_id NULL = global default)
  (NULL, 'Cobb 500',  1,   42), (NULL, 'Cobb 500',  2,   57), (NULL, 'Cobb 500',  3,   76),
  (NULL, 'Cobb 500',  4,  100), (NULL, 'Cobb 500',  5,  129), (NULL, 'Cobb 500',  6,  162),
  (NULL, 'Cobb 500',  7,  200), (NULL, 'Cobb 500',  8,  243), (NULL, 'Cobb 500',  9,  291),
  (NULL, 'Cobb 500', 10,  344), (NULL, 'Cobb 500', 11,  401), (NULL, 'Cobb 500', 12,  463),
  (NULL, 'Cobb 500', 13,  529), (NULL, 'Cobb 500', 14,  598), (NULL, 'Cobb 500', 15,  671),
  (NULL, 'Cobb 500', 16,  747), (NULL, 'Cobb 500', 17,  826), (NULL, 'Cobb 500', 18,  907),
  (NULL, 'Cobb 500', 19,  990), (NULL, 'Cobb 500', 20, 1075), (NULL, 'Cobb 500', 21, 1162),
  (NULL, 'Cobb 500', 22, 1250), (NULL, 'Cobb 500', 23, 1340), (NULL, 'Cobb 500', 24, 1431),
  (NULL, 'Cobb 500', 25, 1523), (NULL, 'Cobb 500', 26, 1616), (NULL, 'Cobb 500', 27, 1709),
  (NULL, 'Cobb 500', 28, 1803), (NULL, 'Cobb 500', 29, 1897), (NULL, 'Cobb 500', 30, 1991),
  (NULL, 'Cobb 500', 31, 2084), (NULL, 'Cobb 500', 32, 2177), (NULL, 'Cobb 500', 33, 2268),
  (NULL, 'Cobb 500', 34, 2358), (NULL, 'Cobb 500', 35, 2446),
-- Ross 308
  (NULL, 'Ross 308',  1,   40), (NULL, 'Ross 308',  7,  194), (NULL, 'Ross 308', 14,  589),
  (NULL, 'Ross 308', 21, 1133), (NULL, 'Ross 308', 24, 1391), (NULL, 'Ross 308', 28, 1747),
  (NULL, 'Ross 308', 35, 2365)
ON CONFLICT (tenant_id, breed, day_number) DO NOTHING;
```

---

## 4. API Routes & Query

### 4.1 Auth

```
POST   /auth/register          Daftar tenant baru + user owner
POST   /auth/login             Login, return JWT + refresh token
POST   /auth/logout
POST   /auth/refresh           Refresh JWT
POST   /auth/invite            Undang anggota ke tenant
```

```sql
-- Query: login user
SELECT u.id, u.email, u.full_name, tm.tenant_id, tm.role
FROM users u
JOIN tenant_members tm ON tm.user_id = u.id
WHERE u.email =  AND u.password_hash = crypt(, u.password_hash);
```

---

### 4.2 Flocks

```
GET    /flocks                 Daftar kandang (filter: ?status=active|harvested)
POST   /flocks                 Tambah kandang baru
GET    /flocks/:id             Detail kandang + KPI ringkasan
PATCH  /flocks/:id             Update kandang (nama, officer, status, dll)
DELETE /flocks/:id             Hapus kandang (soft delete)
```

```sql
-- GET /flocks?status=active
SELECT
  f.id, f.name, f.breed, f.officer, f.start_date,
  f.initial_qty, f.current_qty, f.status, f.batch_code,
  CURRENT_DATE - f.start_date AS age_days
FROM flocks f
WHERE f.tenant_id = 
  AND (::text IS NULL OR f.status = )
ORDER BY f.start_date DESC;

-- POST /flocks
INSERT INTO flocks
  (tenant_id, farm_id, name, breed, initial_qty, current_qty,
   start_date, status, officer, batch_code, created_by)
VALUES (,,,,,,,'active',,,)
RETURNING *;

-- PATCH /flocks/:id — update officer
UPDATE flocks
SET officer = , updated_at = now()
WHERE id =  AND tenant_id = ;
```

---

### 4.3 Daily Logs

```
GET    /flocks/:id/logs              Semua log kandang (filter: ?from=&to=)
POST   /flocks/:id/logs              Buat/update log hari ini
GET    /flocks/:id/logs/:date        Log tanggal tertentu (YYYY-MM-DD)
PATCH  /flocks/:id/logs/:date        Update log (partial)
GET    /flocks/:id/logs/:date/activities  Histori aktivitas hari itu
```

```sql
-- GET /flocks/:id/logs
SELECT
  id, log_date, day_number,
  mortality, culling,
  feed_code, feed_am, feed_pm, feed,
  water, weight,
  timbang_rows, checklist, activities,
  notes, is_complete
FROM daily_logs
WHERE flock_id = 
  AND tenant_id = 
  AND (::date IS NULL OR log_date >= )
  AND (::date IS NULL OR log_date <= )
ORDER BY log_date DESC;

-- POST /flocks/:id/logs — upsert log harian
INSERT INTO daily_logs (
  tenant_id, flock_id, log_date, day_number,
  mortality, culling,
  feed_code, feed_am, feed_pm, feed,
  water, weight,
  timbang_rows, checklist, activities,
  notes, is_complete, created_by
) VALUES (
  ,,,,,,,,,,,,
  ::jsonb, ::jsonb, ::jsonb,
  ,,
)
ON CONFLICT (flock_id, log_date) DO UPDATE SET
  mortality    = EXCLUDED.mortality,
  culling      = EXCLUDED.culling,
  feed_code    = EXCLUDED.feed_code,
  feed_am      = EXCLUDED.feed_am,
  feed_pm      = EXCLUDED.feed_pm,
  feed         = EXCLUDED.feed,
  water        = EXCLUDED.water,
  weight       = EXCLUDED.weight,
  timbang_rows = EXCLUDED.timbang_rows,
  checklist    = EXCLUDED.checklist,
  activities   = EXCLUDED.activities,
  notes        = EXCLUDED.notes,
  is_complete  = EXCLUDED.is_complete,
  updated_at   = now()
RETURNING *;

-- GET /flocks/:id/logs/:date/activities
SELECT
  activities,
  log_date,
  day_number
FROM daily_logs
WHERE flock_id = 
  AND log_date = ::date
  AND tenant_id = ;
-- Kembalikan field activities (JSONB array) langsung ke client

-- Query: update current_qty flock setelah log disimpan
UPDATE flocks
SET current_qty = initial_qty - (
  SELECT COALESCE(SUM(mortality + culling), 0)
  FROM daily_logs
  WHERE flock_id = 
),
updated_at = now()
WHERE id = ;
```

---

### 4.4 Timbang Berat

```
-- Timbang disimpan sebagai JSONB di dalam daily_logs.timbang_rows
-- Tidak ada endpoint terpisah, diakses via PATCH /flocks/:id/logs/:date

-- Contoh payload PATCH untuk update timbang:
{
  "weight": 1147,
  "timbang_rows": [
    { "berat": 5.7, "sample": 5 },
    { "berat": 6.2, "sample": 5 },
    { "berat": 5.1, "sample": 5 }
  ]
}
```

```sql
-- Query: ambil ringkasan timbang untuk dashboard
SELECT
  log_date,
  day_number,
  weight AS avg_weight_gram,
  jsonb_array_length(timbang_rows) AS jumlah_timbangan,
  (
    SELECT SUM((r->>'sample')::int)
    FROM jsonb_array_elements(timbang_rows) r
  ) AS total_ekor_sample
FROM daily_logs
WHERE flock_id = 
  AND timbang_rows != '[]'::jsonb
ORDER BY log_date DESC
LIMIT 10;
```

---

### 4.5 Check List Harian

```
-- Checklist disimpan sebagai JSONB di daily_logs.checklist
-- Diakses via PATCH /flocks/:id/logs/:date

-- Contoh payload:
{
  "checklist": {
    "suhu": "32",
    "kipas": "on",
    "kipasQty": "6",
    "inverter": "on",
    "inverterQty": "2",
    "inverterHz": "45",
    "pln": "on",
    "genset": "off"
  }
}
```

```sql
-- Query: cek kondisi PLN/genset minggu ini
SELECT
  log_date,
  day_number,
  checklist->>'suhu'       AS suhu,
  checklist->>'kipas'      AS kipas,
  checklist->>'kipasQty'   AS kipas_qty,
  checklist->>'inverter'   AS inverter,
  checklist->>'inverterHz' AS inverter_hz,
  checklist->>'pln'        AS pln,
  checklist->>'genset'     AS genset
FROM daily_logs
WHERE flock_id = 
  AND log_date >= CURRENT_DATE - INTERVAL '7 days'
ORDER BY log_date DESC;

-- Query: hari-hari dengan genset menyala
SELECT log_date, day_number, checklist->>'genset' AS genset
FROM daily_logs
WHERE flock_id = 
  AND checklist->>'genset' = 'on'
ORDER BY log_date DESC;
```

---

### 4.6 Histori Aktivitas

```
GET  /flocks/:id/logs/:date/activities   Aktivitas hari tertentu
GET  /flocks/:id/activities              Semua aktivitas (semua hari)
```

```sql
-- GET /flocks/:id/logs/:date/activities
-- Expand JSONB array jadi rows
SELECT
  act->>'type'   AS type,
  act->>'detail' AS detail,
  act->>'time'   AS time,
  act->>'ts'     AS timestamp
FROM daily_logs,
     jsonb_array_elements(activities) AS act
WHERE flock_id = 
  AND log_date  = ::date
  AND tenant_id = 
ORDER BY (act->>'ts') DESC;

-- GET /flocks/:id/activities — semua hari, semua aktivitas
SELECT
  dl.log_date,
  dl.day_number,
  act->>'type'   AS type,
  act->>'detail' AS detail,
  act->>'time'   AS time,
  act->>'ts'     AS timestamp
FROM daily_logs dl,
     jsonb_array_elements(dl.activities) AS act
WHERE dl.flock_id  = 
  AND dl.tenant_id = 
ORDER BY (act->>'ts') DESC
LIMIT 100;
```

---

### 4.7 Growth & Feed Targets

```
GET  /targets/weight?breed=Cobb+500&day=24    Standar berat hari tertentu
GET  /targets/weight?breed=Cobb+500           Semua hari (array)
GET  /targets/feed?breed=Cobb+500&day=24&qty=5000  Standar pakan (dikalikan populasi)
```

```sql
-- GET /targets/weight?breed=Cobb+500&day=24
SELECT day_number, target_weight
FROM growth_targets
WHERE breed = 
  AND (tenant_id =  OR tenant_id IS NULL)  -- tenant override dulu, fallback global
  AND (::int IS NULL OR day_number = )
ORDER BY tenant_id NULLS LAST, day_number;

-- GET /targets/feed?breed=Cobb+500&day=24&qty=5000
SELECT
  ft.day_number,
  ft.feed_per_thousand,
  ROUND((ft.feed_per_thousand *  / 1000.0)::numeric, 1) AS target_kg
FROM feed_targets ft
WHERE ft.breed = 
  AND (::int IS NULL OR ft.day_number = )
ORDER BY ft.day_number;
```

---

### 4.8 Inventory

```
GET    /inventory                    Semua item (filter: ?category=feed|medication|supplies)
POST   /inventory                    Tambah item baru
PATCH  /inventory/:id                Update item
POST   /inventory/:id/stock          Tambah/kurangi stok (buat transaksi)
GET    /inventory/:id/transactions   Riwayat transaksi item
GET    /inventory/alerts             Item dengan status reorder/empty
```

```sql
-- GET /inventory?category=feed
SELECT
  i.id, i.name, i.unit, i.current_qty, i.min_qty,
  i.icon, i.icon_color,
  c.name AS category_name,
  CASE
    WHEN i.current_qty = 0          THEN 'empty'
    WHEN i.current_qty < i.min_qty  THEN 'reorder'
    ELSE 'ok'
  END AS status
FROM inventory_items i
LEFT JOIN inventory_categories c ON c.id = i.category_id
WHERE i.tenant_id = 
  AND i.is_active = true
  AND (::text IS NULL OR c.name ILIKE )
ORDER BY c.sort_order, i.name;

-- POST /inventory/:id/stock — tambah stok
WITH updated AS (
  UPDATE inventory_items
  SET current_qty = current_qty + ,
      updated_at  = now()
  WHERE id =  AND tenant_id = 
  RETURNING id, current_qty -  AS qty_before, current_qty AS qty_after
)
INSERT INTO inventory_transactions
  (tenant_id, item_id, type, qty, qty_before, qty_after, notes, created_by)
SELECT , id, , , qty_before, qty_after, , 
FROM updated
RETURNING *;

-- GET /inventory/alerts
SELECT i.name, i.current_qty, i.min_qty, i.unit,
  CASE WHEN i.current_qty = 0 THEN 'empty' ELSE 'reorder' END AS status
FROM inventory_items i
WHERE i.tenant_id = 
  AND i.current_qty <= i.min_qty
  AND i.is_active = true
ORDER BY i.current_qty ASC;
```

---

### 4.9 Reports

```
GET  /reports/daily-summary/:flock_id?date=   Ringkasan satu hari
GET  /reports/growth/:flock_id                Data grafik pertumbuhan
GET  /reports/mortality/:flock_id             Tren mortalitas + culling
GET  /reports/feed/:flock_id                  Konsumsi pakan vs standar
GET  /reports/weekly/:flock_id                Laporan mingguan
```

```sql
-- GET /reports/growth/:flock_id — data grafik berat aktual vs target
SELECT
  dl.log_date,
  dl.day_number,
  dl.weight          AS actual_weight,
  gt.target_weight,
  dl.weight - gt.target_weight AS diff_gram
FROM daily_logs dl
LEFT JOIN growth_targets gt
  ON gt.breed = (SELECT breed FROM flocks WHERE id = dl.flock_id)
  AND gt.day_number = dl.day_number
  AND (gt.tenant_id = dl.tenant_id OR gt.tenant_id IS NULL)
WHERE dl.flock_id  = 
  AND dl.tenant_id = 
  AND dl.weight IS NOT NULL
ORDER BY dl.day_number;

-- GET /reports/feed/:flock_id — pakan aktual vs standar
SELECT
  dl.log_date,
  dl.day_number,
  dl.feed_code,
  dl.feed_am,
  dl.feed_pm,
  dl.feed            AS actual_kg,
  ROUND((ft.feed_per_thousand * f.current_qty / 1000.0)::numeric, 1) AS target_kg,
  dl.feed - ROUND((ft.feed_per_thousand * f.current_qty / 1000.0)::numeric, 1) AS diff_kg
FROM daily_logs dl
JOIN flocks f ON f.id = dl.flock_id
LEFT JOIN feed_targets ft
  ON ft.breed = f.breed
  AND ft.day_number = dl.day_number
WHERE dl.flock_id  = 
  AND dl.tenant_id = 
ORDER BY dl.day_number;

-- GET /reports/mortality/:flock_id — mortalitas + culling per hari
SELECT
  log_date,
  day_number,
  mortality,
  culling,
  mortality + culling AS total_deplesi,
  ROUND(
    (SUM(mortality + culling) OVER (ORDER BY day_number))::numeric
    / NULLIF((SELECT initial_qty FROM flocks WHERE id = ), 0) * 100,
    2
  ) AS cumulative_pct
FROM daily_logs
WHERE flock_id  = 
  AND tenant_id = 
ORDER BY day_number;

-- GET /reports/weekly/:flock_id
SELECT
  DATE_TRUNC('week', log_date) AS week_start,
  SUM(mortality)               AS total_mati,
  SUM(culling)                 AS total_afkir,
  SUM(feed)                    AS total_pakan_kg,
  SUM(water)                   AS total_air_liter,
  AVG(weight)                  AS avg_berat_gram,
  COUNT(*)                     AS hari_tercatat
FROM daily_logs
WHERE flock_id  = 
  AND tenant_id = 
GROUP BY DATE_TRUNC('week', log_date)
ORDER BY week_start DESC;
```

---

## 5. Migrasi localStorage v2

```javascript
async function migrateV2(supabase, tenantId, userId) {
  const localLogs  = JSON.parse(localStorage.getItem('bt_logs')    || '[]');
  const localFlocks= JSON.parse(localStorage.getItem('bt_flocks')  || '[]');
  const localInv   = JSON.parse(localStorage.getItem('bt_inventory')|| '[]');

  // 1. Flocks — tambah officer
  for (const f of localFlocks) {
    await supabase.from('flocks').upsert({
      tenant_id:   tenantId,
      name:        f.name,
      breed:       f.breed,
      initial_qty: f.qty,
      current_qty: f.qty,
      start_date:  f.startDate,
      status:      f.active ? 'active' : 'harvested',
      officer:     f.officer || null,          // ← field baru
      created_by:  userId
    });
  }

  // 2. Daily logs — semua field baru
  for (const log of localLogs) {
    if (!log.date) continue;
    await supabase.from('daily_logs').upsert({
      tenant_id:    tenantId,
      log_date:     log.date,
      day_number:   log.day,
      mortality:    log.mortality,
      culling:      log.culling    || 0,        // ← field baru
      feed_code:    log.feed_code  || null,     // ← field baru
      feed_am:      log.feed_am    || null,     // ← field baru
      feed_pm:      log.feed_pm    || null,     // ← field baru
      feed:         log.feed,
      water:        log.water,
      weight:       log.weight,
      timbang_rows: log.timbang_rows || [],     // ← field baru
      checklist:    log.checklist    || {},     // ← field baru
      activities:   log.activities   || [],     // ← field baru
      notes:        log.notes,
      is_complete:  log.mortality !== null
    });
  }

  // 3. Inventory
  for (const item of localInv) {
    await supabase.from('inventory_items').upsert({
      tenant_id:   tenantId,
      name:        item.name,
      unit:        item.unit,
      current_qty: item.qty,
      min_qty:     5,
      icon:        item.icon,
      icon_color:  item.iconColor
    });
  }

  localStorage.clear();
  console.log('Migrasi v2 selesai');
}
```

---

## 6. Checklist Implementasi v2

### Fase 1 — Database Migration
- [ ] Jalankan `ALTER TABLE flocks ADD COLUMN officer`
- [ ] Jalankan `ALTER TABLE daily_logs ADD COLUMN culling, feed_code, feed_am, feed_pm, timbang_rows, checklist, activities`
- [ ] Buat tabel `feed_targets` dan insert seed data
- [ ] Insert seed data `growth_targets` (Cobb 500 & Ross 308 hari 1-35)
- [ ] Buat GIN index untuk kolom JSONB
- [ ] Update RLS policy untuk tabel baru

### Fase 2 — Backend API
- [ ] Endpoint `POST /flocks` — include field `officer`
- [ ] Endpoint `POST/PATCH /flocks/:id/logs/:date` — upsert dengan semua field baru
- [ ] Endpoint `GET /flocks/:id/logs/:date/activities` — expand JSONB activities
- [ ] Endpoint `GET /targets/weight` dan `GET /targets/feed`
- [ ] Endpoint `GET /reports/feed` — pakan aktual vs standar
- [ ] Endpoint `GET /reports/mortality` — mortalitas + culling kumulatif

### Fase 3 — Koneksi PWA
- [ ] Ganti `localStorage` di `data.js` dengan Supabase client calls
- [ ] Jalankan fungsi `migrateV2()` saat user pertama login
- [ ] Test semua form: deplesi, pakan (feed_am/pm/code), timbang, checklist
- [ ] Test histori aktivitas tersimpan dan terbaca dari DB
- [ ] Test standar berat & pakan dari `growth_targets` / `feed_targets`

---

*Schema v2.0 — Sinkron dengan implementasi PWA BroilerTrack per 2026-05-09*
