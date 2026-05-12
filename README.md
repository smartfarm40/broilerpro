# 🐔 BroilerTrack PWA

Aplikasi manajemen peternakan ayam broiler berbasis Progressive Web App (PWA).

## 🚀 Live Demo
```
https://broilerpro.vercel.app
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
├── panen.html              # Halaman panen
├── sw.js                   # Service Worker
├── manifest.json           # PWA manifest
├── vercel.json             # Vercel config
├── .env.local              # Environment variables
├── auth/                   # Halaman auth (login, register, invite)
│   ├── login.html
│   ├── register.html
│   ├── invite.html
│   ├── invite-confirm.html
│   └── auth.css
├── css/                    # Stylesheets
│   ├── style.css
│   └── leaflet.min.css
├── js/                     # JavaScript modules
│   ├── app.js              # Main app logic
│   ├── data.js             # Data store & Supabase sync
│   ├── charts.js           # Chart.js wrapper
│   ├── panen.js            # Panen module
│   ├── ts-visits.js        # Kunjungan TS module
│   ├── period-targets.js   # Target periode module
│   ├── medication.js       # Program kesehatan module
│   ├── deliveries.js       # Pengiriman module
│   ├── production-costs.js # Cost produksi module
│   ├── supabase-client.js  # Supabase client
│   ├── permission-guards.js# UI permission guards
│   ├── update-manager.js   # PWA update manager
│   ├── leaflet.min.js      # Leaflet maps
│   └── auth/               # Auth services
│       ├── auth-service.js
│       └── auth-store.js
├── supabase/               # Database
│   ├── config.toml         # Supabase config
│   └── migrations/         # Database migrations
├── types/                  # TypeScript types
│   └── database.types.ts
├── icons/                  # PWA icons
│   ├── icon-192.png
│   ├── icon-512.png
│   ├── ayam.svg
│   └── karung-pakan.svg
└── *.md                    # Documentation files
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
Hubungi Administrator di **barotech26@gmail.com** untuk mendapatkan akun.

## 🗄️ Database

Lihat `DATABASE_SCHEMA.md` untuk detail schema lengkap.

Migrations tersedia di `supabase/migrations/` — sudah diapply ke production.

## 📊 Progress Implementasi

Lihat `IMPLEMENTATION_CHECKLIST.md` untuk status lengkap.

**Overall: 100% Complete (Sprint 1–7)**
