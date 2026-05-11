# 🐔 BroilerTrack PWA

Aplikasi manajemen peternakan ayam broiler berbasis Progressive Web App (PWA).

## 🚀 Live Demo
```
https://broilertrack.vercel.app
```

## 📋 Fitur

| Fitur | Role | Status |
|-------|------|--------|
| Dashboard & KPI | Semua | ✅ |
| Laporan Harian (deplesi, pakan, berat) | Operator | ✅ |
| Manajemen Kandang | Owner/Manager | ✅ |
| Grafik Pertumbuhan | Semua | ✅ |
| Jadwal Kunjungan TS | TS/Owner/Manager | ✅ |
| Target Custom per Periode | TS/Owner/Manager | ✅ |
| Program Kesehatan (Obat/Vaksin) | TS/Operator | ✅ |
| Manajemen Pengiriman | Staff/Owner/Manager | ✅ |
| Cost Produksi & Profit/Loss | Staff/Owner/Manager | ✅ |
| Role & Permission System | Admin | ✅ |

## 👥 Role & Akses

| Role | Deskripsi | Akses Cost |
|------|-----------|------------|
| Owner | Akses penuh | ✅ |
| Manager | Akses penuh | ✅ |
| TS | Technical Service — target & kunjungan | ❌ |
| Staff | Input pengiriman & cost | ✅ |
| Operator | Input laporan harian | ❌ |
| Viewer | Read-only | ❌ |

## 🛠️ Tech Stack

- **Frontend:** Vanilla JS, PWA (Service Worker)
- **Backend:** Supabase (PostgreSQL + Auth + RLS)
- **Hosting:** Vercel
- **Maps:** Leaflet.js
- **Charts:** Chart.js

## 📁 Struktur Project

```
broilertrack-pwa/
├── index.html              # Main app (semua halaman)
├── sw.js                   # Service Worker
├── manifest.json           # PWA manifest
├── vercel.json             # Vercel config
├── auth/                   # Halaman login & register
├── css/                    # Stylesheet
├── js/
│   ├── app.js              # Main app logic
│   ├── data.js             # Data store & Supabase sync
│   ├── ts-visits.js        # Modul kunjungan TS
│   ├── period-targets.js   # Modul target periode
│   ├── medication.js       # Modul program kesehatan
│   ├── deliveries.js       # Modul pengiriman
│   ├── production-costs.js # Modul cost produksi
│   ├── supabase-client.js  # Supabase client
│   ├── permission-guards.js# UI permission guards
│   └── auth/               # Auth service & store
├── supabase/
│   └── migrations/         # Database migrations
└── icons/                  # App icons
```

## ⚙️ Setup Development

### 1. Clone repo
```bash
git clone https://github.com/barotech-26/broiler-track-pwa.git
cd broiler-track-pwa
```

### 2. Jalankan local server
```bash
python -m http.server 8080
```
Buka: `http://localhost:8080`

### 3. Register user pertama
Buka `http://localhost:8080/auth/register.html` dan daftar dengan role **Owner**.

> **Catatan:** Pastikan email confirmation dinonaktifkan di Supabase Dashboard sebelum register.

## 🗄️ Database

Lihat `DATABASE_SCHEMA.md` untuk detail schema lengkap.

Migrations tersedia di `supabase/migrations/` — sudah diapply ke production.

## 📊 Progress Implementasi

Lihat `IMPLEMENTATION_CHECKLIST.md` untuk status lengkap.

**Overall: 100% Complete (Sprint 1–7)**
