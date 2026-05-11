# 📋 BroilerTrack - Implementation Checklist

> **Tujuan:** Membangun sistem manajemen peternakan ayam broiler dengan pemisahan role yang jelas antara TS (Technical Service), Staff Kantor, dan Operator Kandang.

---

## 🎯 Ringkasan Status

| Sprint | Kategori | Progress | Status |
|--------|----------|----------|--------|
| Sprint 1 | Role & Permission System | 18/18 | ✅ 100% |
| Sprint 2 | Jadwal Kunjungan TS | 8/8 | ✅ 100% |
| Sprint 2.5 | Login & Auth Fix | 5/5 | ✅ 100% |
| Sprint 3 | Target Custom per Periode | 10/10 | ✅ 100% |
| Sprint 4 | Obat / Vaksin / Vitamin | 8/8 | ✅ 100% |
| Sprint 5 | Pengiriman (Staff) | 8/8 | ✅ 100% |
| Sprint 6 | Cost Produksi (Staff) | 8/8 | ✅ 100% |
| Sprint 7 | Laporan & Polish | 10/10 | ✅ 100% |
| **TOTAL** | | **31/75** | **41%** |

---

## ✅ SPRINT 1 — Role & Permission System `COMPLETE`

### Database Layer ✅
- [x] Tabel `permissions` (43 permissions, 11 kategori)
- [x] Tabel `role_permissions` (150 mappings)
- [x] Function `user_has_permission()`
- [x] Function `get_user_permissions()`
- [x] RLS policies untuk semua tabel
- [x] Index untuk performance

### Role Configuration ✅
- [x] `owner` — 43 permissions (full access)
- [x] `manager` — 43 permissions (full access)
- [x] `ts` — 22 permissions (NO cost/harga)
- [x] `staff` — 21 permissions (WITH cost, NO target edit)
- [x] `operator` — 11 permissions (kandang assigned only)
- [x] `viewer` — 10 permissions (read-only)

### Frontend Integration ✅
- [x] `js/auth/auth-store.js` — `AUTH.can()` dengan cache
- [x] `js/permission-guards.js` — UI guards
- [x] `js/app.js` — permission checks di semua actions
- [x] Hide/show elemen berdasarkan role

---

## ✅ SPRINT 2 — Jadwal Kunjungan TS `COMPLETE`

### Database Layer ✅
- [x] Tabel `ts_visits` (18 kolom + JSONB checklist)
- [x] 6 indexes untuk performance
- [x] Trigger `update_ts_visits_updated_at()`
- [x] RLS policies (8 policies)
- [x] Function `get_upcoming_visits_for_ts()`
- [x] Function `get_visit_statistics()`
- [x] Function `has_visit_today()`

### Backend Module ✅
- [x] `js/ts-visits.js` — 15+ methods
- [x] CRUD: create, update, delete, getById, getAll
- [x] Status: startVisit, completeVisit, cancelVisit, rescheduleVisit
- [x] Checklist: updateChecklistItem
- [x] Helpers: formatTujuan, formatStatus, getStatusColor

### Frontend ✅
- [x] Halaman `#page-visits` dengan tab filter (Mendatang/Selesai/Semua)
- [x] Modal create/edit visit
- [x] Modal detail visit
- [x] Modal complete visit (checklist + findings + recommendations)
- [x] Visit cards dengan status badges
- [x] Navigasi bottom nav "Kunjungan"

---

## ✅ SPRINT 2.5 — Login & Auth Fix `COMPLETE`

- [x] Fix konflik variabel `supabase` di `supabase-client.js`
- [x] Shared client `window._sbClient` — cegah duplikasi instance
- [x] Alias global `sb` untuk console/debug
- [x] Tambah `supabase-client.js` ke `index.html`
- [x] Update cache version SW ke `v5`
- [x] Buat `debug.html` — halaman diagnostik (clear cache, test koneksi, register, login)
- [x] Register page `auth/register.html` berfungsi normal
- [x] Login page `auth/login.html` berfungsi normal
- [x] Auth guard di `index.html` redirect ke login jika belum login

---

## 🔴 SPRINT 3 — Target Custom per Periode `COMPLETE ✅`

### Database ✅
- [x] Tabel `period_targets` (kandang_id, target_type, target_values JSONB, breed, periode)
- [x] RLS policies (TS/Owner/Manager create/edit/delete, semua bisa view)
- [x] Index pada `kandang_id`, `target_type`, `periode_mulai`
- [x] Trigger `update_period_targets_updated_at()`
- [x] Function `get_target_for_day()` — ambil target aktif untuk hari tertentu
- [x] Function `get_period_target_values()` — ambil semua values satu periode

### Backend ✅
- [x] Module `js/period-targets.js`
- [x] CRUD: create, update, delete (soft), getByKandang, getAll, getForDay
- [x] Template generator dari breed (Cobb 500, Ross 308)
- [x] Copy dari periode sebelumnya
- [x] Format helpers: formatType, formatTypeUnit, getTypeIcon, getTypeColor

### Frontend ✅
- [x] Halaman `#page-targets` dengan tab filter (Pakan/Berat/FCR)
- [x] Target cards dengan info kandang, breed, periode, jumlah hari
- [x] Modal create/edit target (kandang, tipe, breed, periode, bulk input per hari)
- [x] Modal detail target (stats min/max/avg, grid nilai per hari)
- [x] Tombol "Isi dari Template" — auto-fill dari standar breed
- [x] Nav item "Target" di bottom nav
- [x] Permission guard (hanya TS/Owner/Manager bisa create/edit/delete)

---

## 🔴 SPRINT 4 — Program Kesehatan (Obat/Vaksin) `COMPLETE ✅`

### Database ✅
- [x] Tabel `medication_programs` (program per kandang, dibuat TS)
- [x] Tabel `medication_items` (item obat/vaksin/vitamin + jadwal hari)
- [x] Tabel `medication_logs` (realisasi pemberian oleh operator)
- [x] RLS policies untuk 3 tabel (TS/Owner/Manager create/edit, Operator log)
- [x] Function `get_medication_schedule_today()` — jadwal hari ini per kandang
- [x] Function `get_medication_compliance()` — statistik kepatuhan
- [x] 5 health permissions + 19 role mappings

### Backend ✅
- [x] Module `js/medication.js`
- [x] CRUD programs: create, update, delete (soft), getAllPrograms
- [x] CRUD items: create, update, delete, getItemsByProgram
- [x] Logs: markCompleted, markSkipped, getTodaySchedule, getComplianceStats
- [x] Format helpers: getTypeInfo, getStatusInfo, formatHariPemberian

### Frontend ✅
- [x] Halaman `#page-health` dengan tab Hari Ini / Program
- [x] Tab "Hari Ini" — jadwal obat/vaksin kandang aktif hari ini
- [x] Tab "Program" — daftar semua program aktif
- [x] Modal buat/edit program (nama, kandang, deskripsi + item rows)
- [x] Dynamic item rows — tambah/hapus item dalam program
- [x] Modal detail program (compliance bar, daftar item)
- [x] Modal catat pemberian (jumlah, catatan, selesai/lewati)
- [x] Nav item "Kesehatan" di bottom nav
- [x] Permission guard (TS/Owner/Manager create/edit, Operator catat)

---

## 🔴 SPRINT 5 — Pengiriman (Staff Kantor) `COMPLETE ✅`

### Database ✅
- [x] Tabel `deliveries` (kandang, tipe, item, jumlah, harga, supplier, status)
- [x] Generated column `total_harga = jumlah * harga_satuan`
- [x] RLS policies (Staff/Owner/Manager CRUD, Operator konfirmasi, TS/Viewer view)
- [x] Function `get_delivery_summary()` — ringkasan per tipe per periode
- [x] 5 delivery permissions + 19 role mappings

### Backend ✅
- [x] Module `js/deliveries.js`
- [x] CRUD: create, update, delete, getAll (dengan filters)
- [x] `confirmReceived()` — update status + tanggal_terima
- [x] `getSummary()` — ringkasan per kandang per bulan
- [x] Format helpers: formatCurrency, formatDate, getTypeInfo, getStatusInfo

### Frontend ✅
- [x] Halaman `#page-delivery` dengan tab Semua/Menunggu/Diterima
- [x] Delivery cards dengan icon tipe, status badge, harga (hanya jika punya cost.view)
- [x] Modal input pengiriman (kandang, tipe, item, jumlah, harga, supplier, invoice)
- [x] Harga tersembunyi untuk TS/Operator (hanya Staff/Owner/Manager)
- [x] Modal detail pengiriman (KPI cards, info lengkap)
- [x] Tombol "Konfirmasi Terima" untuk Operator/Staff
- [x] Nav item "Kirim" di bottom nav
- [x] Permission guard per aksi

---

## 🔴 SPRINT 6 — Cost Produksi (Staff Kantor) `COMPLETE ✅`

### Database ✅
- [x] Tabel `production_costs` — 10 komponen cost + 2 generated columns (total_cost, revenue)
- [x] RLS: hanya Staff/Owner/Manager bisa akses (TS/Operator/Viewer tidak bisa lihat)
- [x] Function `calculate_cost_from_deliveries()` — auto-hitung dari data pengiriman received
- [x] Function `get_profit_loss_summary()` — ringkasan profit/loss semua batch final
- [x] 5 cost permissions + 18 role mappings

### Backend ✅
- [x] Module `js/production-costs.js`
- [x] CRUD: create, update, delete, getAll, getById
- [x] `finalize()` — kunci laporan agar tidak bisa diedit
- [x] `calculateFromDeliveries()` — auto-fill dari pengiriman received
- [x] `getProfitLoss()` — summary semua batch final
- [x] Format helpers: formatCurrency, formatCurrencyShort, profitColor, profitIcon

### Frontend ✅
- [x] Halaman `#page-cost` dengan tab Daftar Batch / Ringkasan
- [x] Batch cards dengan KPI (total cost, revenue, margin %)
- [x] Modal buat/edit cost — 10 komponen cost + tombol "Hitung dari Pengiriman"
- [x] Auto-calculate dari deliveries received (1 klik)
- [x] Profit preview real-time saat input
- [x] Modal detail — breakdown biaya per komponen (bar chart)
- [x] Tab Ringkasan — total revenue/cost/profit + profit/loss per batch
- [x] Tombol Finalisasi — kunci laporan
- [x] Nav item "Cost" di bottom nav
- [x] Guard: halaman terkunci untuk TS/Operator/Viewer

---

## 🔴 SPRINT 7 — Laporan & Polish `COMPLETE ✅`

### Dashboard per Role ✅
- [x] Widget "Jadwal Kunjungan Hari Ini" untuk TS/Owner/Manager
- [x] Widget "Jadwal Obat/Vaksin Hari Ini" untuk semua role
- [x] Widget "Pengiriman Pending" untuk Staff/Owner/Manager
- [x] Alert mortalitas tinggi (>2%/hari) — banner merah di dashboard
- [x] Alert berat jauh dari target (>10% deviasi) — banner kuning

### Nav & Role UI ✅
- [x] Nav items disembunyikan per role (TS tidak lihat Cost, Operator tidak lihat Delivery)
- [x] Role label di header (nama + jabatan)
- [x] Role icon di avatar header (berbeda per role)
- [x] Tombol Logout di halaman Settings
- [x] `checkPerm()` helper untuk onclick HTML

### UX Polish ✅
- [x] Loading spinner `.spin` animation
- [x] Smooth page transition (fadeIn)
- [x] Toast notification styling improvement
- [x] Empty state component standar
- [x] Bottom nav scroll horizontal (untuk banyak item)
- [x] `btn-error`, `btn-secondary`, `btn-success` CSS classes
- [x] `form-textarea` CSS class standar

### Performance ✅
- [x] Service Worker cache v6 — include semua JS modules baru
- [x] navigateTo patch dikonsolidasikan menjadi 1 fungsi (tidak berantai)
- [x] Dashboard widgets load async (tidak block render)

---

## 📁 File Reference

### Migrations (Supabase)
| File | Deskripsi | Status |
|------|-----------|--------|
| `20260510_role_permission_system.sql` | Tabel permissions & role_permissions | ✅ Applied |
| `20260510_assign_role_permissions.sql` | Seed 150 role-permission mappings | ✅ Applied |
| `20260510060000_create_ts_visits_table.sql` | Tabel ts_visits + RLS + functions | ✅ Applied |

### JavaScript Modules
| File | Deskripsi | Status |
|------|-----------|--------|
| `js/supabase-client.js` | Shared Supabase client (`sb`, `window._sbClient`) | ✅ Fixed |
| `js/auth/auth-store.js` | AUTH object + permission cache | ✅ Complete |
| `js/auth/auth-service.js` | Login, register, logout | ✅ Complete |
| `js/permission-guards.js` | UI guards berdasarkan permission | ✅ Complete |
| `js/ts-visits.js` | TS Visits CRUD module | ✅ Complete |
| `js/data.js` | In-memory DB + Supabase sync | ✅ Complete |
| `js/app.js` | Main app logic + routing | ✅ Complete |

### HTML Pages
| File | Deskripsi | Status |
|------|-----------|--------|
| `index.html` | Main app (semua halaman) | ✅ Complete |
| `auth/login.html` | Halaman login | ✅ Working |
| `auth/register.html` | Halaman register | ✅ Working |
| `debug.html` | Diagnostik & fix tool | ✅ New |

---

## 🚀 Rekomendasi Sprint Selanjutnya

### Sprint 6 — Cost Produksi (Staff Kantor) — NEXT
**Kenapa duluan?**
- Data pengiriman sudah ada → bisa auto-calculate cost pakan/obat
- Staff butuh dashboard cost untuk laporan ke owner
- Owner butuh profit/loss per batch

**Estimasi:** 1 minggu

---

## 📊 Progress Visual

```
Sprint 1  [████████████████████] 100% ✅ Role & Permission
Sprint 2  [████████████████████] 100% ✅ Jadwal Kunjungan TS
Sprint 2.5[████████████████████] 100% ✅ Login & Auth Fix
Sprint 3  [████████████████████] 100% ✅ Target Custom
Sprint 4  [████████████████████] 100% ✅ Obat/Vaksin
Sprint 5  [████████████████████] 100% ✅ Pengiriman
Sprint 6  [████████████████████] 100% ✅ Cost Produksi
Sprint 7  [████████████████████] 100% ✅ Laporan & Polish

Overall   [████████████████████] 100% 🟢 COMPLETE!
```

---

**Last Updated:** 2026-05-11  
**Version:** 3.0  
**Status:** 🟢 COMPLETE — Semua Sprint Selesai!
