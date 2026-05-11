# BroilerTrack - Implementation Guide

## 📋 Overview

Panduan lengkap implementasi fitur-fitur BroilerTrack menggunakan Supabase.

---

## 🚀 Quick Start

### 1. Setup Environment

Pastikan file `.env.local` sudah dikonfigurasi:

```env
SUPABASE_URL=https://rsqbxzhrainejnbxnvfw.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 2. Include Supabase Client

Tambahkan di HTML:

```html
<!-- Supabase JS SDK -->
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>

<!-- BroilerTrack Supabase Client Helper -->
<script src="js/supabase-client.js"></script>
```

### 3. Initialize

```javascript
const { supabase, EdgeFunctions, DB, Realtime } = window.SupabaseClient;
```

---

## 📊 Edge Functions

### 1. Calculate FCR

Menghitung Feed Conversion Ratio untuk evaluasi efisiensi pakan.

**Usage:**

```javascript
// Calculate FCR for entire period
const fcrData = await EdgeFunctions.calculateFCR('K1');

// Calculate FCR for specific date range
const fcrRange = await EdgeFunctions.calculateFCR(
  'K1',
  '2026-04-01',  // tanggal_mulai
  '2026-04-30'   // tanggal_akhir
);

console.log(fcrData);
// {
//   kandang_id: "K1",
//   total_pakan_kg: 8500.50,
//   total_berat_panen_kg: 5200.00,
//   fcr: 1.635,
//   jumlah_hari: 35,
//   status: "good",
//   message: "FCR baik. Efisiensi pakan di atas rata-rata."
// }
```

**Status Values:**
- `excellent` - FCR ≤ 1.5
- `good` - FCR ≤ 1.6
- `fair` - FCR ≤ 1.7
- `poor` - FCR ≤ 1.8
- `very_poor` - FCR > 1.8
- `no_data` - Belum ada data panen

**Example UI:** `examples/fcr-calculator.html`

---

### 2. Daily Report

Generate laporan harian lengkap dengan summary dan statistik.

**Usage:**

```javascript
const report = await EdgeFunctions.getDailyReport('K1', '2026-05-10');

console.log(report.summary);
// {
//   populasi_saat_ini: 4850,
//   mortalitas_hari_ini: 5,
//   mortalitas_kumulatif: 150,
//   deplesi_rate: 3.00,
//   pakan_konsumsi: 245.5,
//   berat_rata_rata: 1850,
//   fcr_estimasi: 1.620
// }
```

**Display in UI:**

```javascript
const { summary } = report;

document.getElementById('populasi').textContent = summary.populasi_saat_ini;
document.getElementById('deplesi').textContent = `${summary.deplesi_rate}%`;
document.getElementById('fcr').textContent = summary.fcr_estimasi.toFixed(3);
```

---

### 3. Auto Notifications

Generate notifikasi otomatis berdasarkan kondisi kandang.

**Usage:**

```javascript
// Call after saving data_harian
const { data, error } = await supabase.functions.invoke('auto-notifications', {
  body: {
    kandang_id: 'K1',
    data_harian_id: 'uuid-data-harian'
  }
});

console.log(data);
// {
//   success: true,
//   notifications_created: 2,
//   notifications: [
//     { type: "warning", text: "⚠️ Mortalitas tinggi..." },
//     { type: "info", text: "ℹ️ Stock pakan menipis..." }
//   ]
// }
```

**Notification Triggers:**
- Mortalitas harian > 1% populasi
- Deplesi rate kumulatif > 5%
- Konsumsi pakan < 80% target
- Stock pakan < 500kg
- Suhu > 35°C

---

### 4. Predict Harvest

Prediksi berat panen dan kebutuhan pakan.

**Usage:**

```javascript
const { data, error } = await supabase.functions.invoke('predict-harvest', {
  body: {
    kandang_id: 'K1',
    target_hari: 35  // Optional, default 35
  }
});

console.log(data);
// {
//   kandang_id: "K1",
//   kandang_name: "Kandang A",
//   breed: "CP707",
//   current_day: 28,
//   target_day: 35,
//   current_population: 4850,
//   current_avg_weight: 1650,
//   predicted_avg_weight: 2100,
//   predicted_total_weight: 10185,
//   predicted_fcr: 1.650,
//   total_feed_needed: 1250,
//   days_remaining: 7,
//   status: "good",
//   recommendations: [
//     "👍 FCR prediksi baik. Terus monitor perkembangan.",
//     "🌾 Perkiraan kebutuhan pakan: 1250kg untuk 7 hari ke depan."
//   ]
// }
```

**Example UI:** `examples/harvest-prediction.html`

---

## 🗄️ Database Operations

### Get Active Kandangs

```javascript
const kandangs = await DB.getActiveKandangs();

kandangs.forEach(k => {
  console.log(`${k.name}: ${k.doc} ekor, Hari ${k.usia}`);
});
```

### Get Data Harian

```javascript
const dataHarian = await DB.getDataHarian('K1', '2026-05-10');

if (dataHarian) {
  console.log(`Mati: ${dataHarian.mati}, Pakan: ${dataHarian.pakan_total}kg`);
}
```

### Insert/Update Data Harian

```javascript
const dataHarian = {
  kandang_id: 'K1',
  tanggal: '2026-05-10',
  hari: 28,
  mati: 5,
  culling: 2,
  pakan_total: 245.5,
  berat_rata_rata: 1650,
  suhu_pagi: 28,
  suhu_sore: 32,
  is_complete: true
};

const saved = await DB.upsertDataHarian(dataHarian);
console.log('Data saved:', saved.id);
```

### Insert Panen

```javascript
const panenData = {
  kandang_id: 'K1',
  tanggal_panen: '2026-05-10',
  hari_ke: 35,
  jumlah_ekor: 4800,
  berat_total_kg: 10080,  // 4800 × 2.1kg
  harga_per_kg: 21500,
  pembeli: 'PT Maju Jaya',
  kendaraan: 'B 1234 XY',
  penimbang: 'Pak Budi',
  grade: 'A',
  catatan: 'Panen berjalan lancar'
};

const panen = await DB.insertPanen(panenData);
console.log('Panen saved:', panen.id);
// berat_rata_rata dan total_pendapatan auto-calculated
```

### Update Stock Pakan

```javascript
// Update stock pakan
await DB.updateStockPakan('K1', 1500);  // 1500 kg

// Get current stock
const stock = await DB.getStockPakan('K1');
console.log(`Stock: ${stock.jumlah_kg}kg`);
```

### Get Harga Referensi

```javascript
const harga = await DB.getHargaReferensi();

console.log(`DOC: Rp ${harga.harga_doc}`);
console.log(`Pakan: Rp ${harga.harga_pakan}/kg`);
console.log(`Jual: Rp ${harga.harga_jual}/kg`);
console.log(`Target FCR: ${harga.target_fcr}`);
```

---

## 🔄 Realtime Subscriptions

### Subscribe to Data Harian Changes

```javascript
const subscription = Realtime.subscribeDataHarian('K1', (payload) => {
  console.log('Data harian changed:', payload);
  
  if (payload.eventType === 'INSERT') {
    console.log('New data:', payload.new);
    // Update UI
  } else if (payload.eventType === 'UPDATE') {
    console.log('Updated data:', payload.new);
    // Update UI
  }
});

// Unsubscribe when done
Realtime.unsubscribe(subscription);
```

### Subscribe to Stock Pakan Changes

```javascript
const stockSub = Realtime.subscribeStockPakan('K1', (payload) => {
  const newStock = payload.new.jumlah_kg;
  document.getElementById('stock').textContent = `${newStock} kg`;
  
  // Show alert if stock low
  if (newStock < 500) {
    alert('⚠️ Stock pakan menipis!');
  }
});
```

---

## 🎨 UI Examples

### 1. FCR Calculator

File: `examples/fcr-calculator.html`

**Features:**
- Select kandang
- Optional date range
- Display FCR with status badge
- Show total pakan, berat, and days
- Responsive design

**Screenshot:**
```
┌─────────────────────────────┐
│  🐔 FCR Calculator          │
│                             │
│  Pilih Kandang: [Kandang A] │
│  Tanggal Mulai: [optional]  │
│  Tanggal Akhir: [optional]  │
│                             │
│  [Hitung FCR]               │
│                             │
│  ┌───────────────────────┐  │
│  │  Hasil Perhitungan    │  │
│  │  Status: GOOD         │  │
│  │                       │  │
│  │      1.635            │  │
│  │  Feed Conversion Ratio│  │
│  │                       │  │
│  │  Total Pakan: 8500kg  │  │
│  │  Total Berat: 5200kg  │  │
│  │  Jumlah Hari: 35 hari │  │
│  └───────────────────────┘  │
└─────────────────────────────┘
```

### 2. Harvest Prediction

File: `examples/harvest-prediction.html`

**Features:**
- Select kandang
- Set target harvest day
- Display predicted weight and FCR
- Show feed requirements
- List recommendations

---

## 🔐 Authentication & Authorization

### Check User Role

```javascript
const { data: { user } } = await supabase.auth.getUser();

if (user) {
  const { data: userData } = await supabase
    .from('users')
    .select('role, kandang_id')
    .eq('id', user.id)
    .single();
  
  if (userData.role === 'owner' || userData.role === 'ts') {
    // Full access
  } else if (userData.role === 'kandang') {
    // Only access their kandang
    const kandangId = userData.kandang_id;
  }
}
```

### RLS Policies

Semua tabel sudah dilindungi dengan RLS:

- **Owner & TS**: Full access ke semua data
- **Petugas Kandang**: Hanya akses kandang mereka
- **Staff**: Read-only access

---

## 📱 Progressive Web App

### Service Worker

File: `sw.js`

**Cache Strategy:**
- Cache-first untuk static assets
- Network-first untuk API calls
- Offline fallback page

### Manifest

File: `manifest.json`

**Features:**
- Installable PWA
- Custom icons
- Standalone display mode
- Theme color

---

## 🧪 Testing

### Test Edge Functions Locally

```bash
# Start Supabase locally
supabase start

# Serve function
supabase functions serve calculate-fcr --env-file .env.local

# Test with curl
curl -i --location --request POST 'http://localhost:54321/functions/v1/calculate-fcr' \
  --header 'Authorization: Bearer YOUR_ANON_KEY' \
  --header 'Content-Type: application/json' \
  --data '{"kandang_id":"K1"}'
```

### Test Database Queries

```javascript
// Test in browser console
const { supabase, DB } = window.SupabaseClient;

// Test get kandangs
const kandangs = await DB.getActiveKandangs();
console.log('Kandangs:', kandangs);

// Test get data harian
const data = await DB.getDataHarian('K1', '2026-05-10');
console.log('Data harian:', data);
```

---

## 🐛 Troubleshooting

### Common Issues

**1. "Function not found"**
```
Solution: Function belum di-deploy atau nama salah
Check: supabase functions list
```

**2. "Unauthorized"**
```
Solution: User belum login atau token expired
Check: await supabase.auth.getUser()
```

**3. "RLS policy violation"**
```
Solution: User tidak punya akses ke data
Check: User role dan kandang_id
```

**4. "CORS error"**
```
Solution: Edge function sudah handle CORS
Check: Request headers lengkap
```

---

## 📚 Additional Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Edge Functions Guide](https://supabase.com/docs/guides/functions)
- [RLS Guide](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Realtime Guide](https://supabase.com/docs/guides/realtime)

---

## 🎯 Best Practices

### 1. Error Handling

Always wrap async calls in try-catch:

```javascript
try {
  const data = await EdgeFunctions.calculateFCR('K1');
  // Use data
} catch (error) {
  console.error('Error:', error);
  // Show user-friendly message
  alert('Gagal menghitung FCR. Silakan coba lagi.');
}
```

### 2. Loading States

Show loading indicators:

```javascript
button.disabled = true;
loadingSpinner.style.display = 'block';

try {
  const data = await EdgeFunctions.calculateFCR('K1');
  displayResult(data);
} finally {
  button.disabled = false;
  loadingSpinner.style.display = 'none';
}
```

### 3. Caching

Cache frequently accessed data:

```javascript
// Cache for 5 minutes
const CACHE_DURATION = 5 * 60 * 1000;
let cachedKandangs = null;
let cacheTime = 0;

async function getKandangs() {
  if (cachedKandangs && Date.now() - cacheTime < CACHE_DURATION) {
    return cachedKandangs;
  }
  
  cachedKandangs = await DB.getActiveKandangs();
  cacheTime = Date.now();
  return cachedKandangs;
}
```

### 4. Optimistic Updates

Update UI immediately, sync later:

```javascript
// Update UI immediately
updateStockDisplay(newStock);

// Sync to database
DB.updateStockPakan(kandangId, newStock)
  .catch(error => {
    // Revert on error
    updateStockDisplay(oldStock);
    alert('Gagal update stock');
  });
```

---

**Last Updated:** May 10, 2026
**Version:** 1.0.0
