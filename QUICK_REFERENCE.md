# 🚀 Quick Reference Guide

Panduan cepat untuk menggunakan BroilerTrack dengan Supabase.

---

## 📦 Installation

```html
<!-- Include Supabase SDK -->
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>

<!-- Include BroilerTrack Helper -->
<script src="js/supabase-client.js"></script>
```

---

## ⚡ Edge Functions

### Calculate FCR

```javascript
const fcr = await EdgeFunctions.calculateFCR('K1');
// { fcr: 1.635, status: "good", total_pakan_kg: 8500, ... }

// With date range
const fcr = await EdgeFunctions.calculateFCR('K1', '2026-04-01', '2026-04-30');
```

### Daily Report

```javascript
const report = await EdgeFunctions.getDailyReport('K1', '2026-05-10');
// { kandang: {...}, data_harian: {...}, summary: {...} }

console.log(report.summary.populasi_saat_ini);  // 4850
console.log(report.summary.fcr_estimasi);       // 1.620
```

### Auto Notifications

```javascript
const result = await supabase.functions.invoke('auto-notifications', {
  body: { kandang_id: 'K1', data_harian_id: 'uuid' }
});
// { success: true, notifications_created: 2 }
```

### Predict Harvest

```javascript
const prediction = await supabase.functions.invoke('predict-harvest', {
  body: { kandang_id: 'K1', target_hari: 35 }
});
// { predicted_total_weight: 10185, predicted_fcr: 1.650, ... }
```

---

## 🗄️ Database Operations

### Kandangs

```javascript
// Get all active kandangs
const kandangs = await DB.getActiveKandangs();

// Get specific kandang
const { data } = await supabase
  .from('kandangs')
  .select('*')
  .eq('id', 'K1')
  .single();
```

### Data Harian

```javascript
// Get data harian
const data = await DB.getDataHarian('K1', '2026-05-10');

// Insert/Update
const saved = await DB.upsertDataHarian({
  kandang_id: 'K1',
  tanggal: '2026-05-10',
  hari: 28,
  mati: 5,
  pakan_total: 245.5,
  berat_rata_rata: 1650
});
```

### Panen

```javascript
// Get panen records
const panen = await DB.getPanenByKandang('K1');

// Insert panen
const saved = await DB.insertPanen({
  kandang_id: 'K1',
  tanggal_panen: '2026-05-10',
  hari_ke: 35,
  jumlah_ekor: 4800,
  berat_total_kg: 10080,
  harga_per_kg: 21500,
  pembeli: 'PT Maju Jaya'
});
```

### Stock Pakan

```javascript
// Get stock
const stock = await DB.getStockPakan('K1');

// Update stock
await DB.updateStockPakan('K1', 1500);  // 1500 kg
```

---

## 🔄 Realtime

### Subscribe to Changes

```javascript
// Data harian
const sub = Realtime.subscribeDataHarian('K1', (payload) => {
  console.log('Changed:', payload.new);
});

// Stock pakan
const stockSub = Realtime.subscribeStockPakan('K1', (payload) => {
  console.log('Stock:', payload.new.jumlah_kg);
});

// Unsubscribe
Realtime.unsubscribe(sub);
```

---

## 🔐 Authentication

### Check User

```javascript
const { data: { user } } = await supabase.auth.getUser();

if (user) {
  const { data: userData } = await supabase
    .from('users')
    .select('role, kandang_id')
    .eq('id', user.id)
    .single();
  
  console.log('Role:', userData.role);
}
```

---

## 📊 Common Queries

### Get Latest Data Harian

```javascript
const { data } = await supabase
  .from('data_harian')
  .select('*')
  .eq('kandang_id', 'K1')
  .order('tanggal', { ascending: false })
  .limit(1)
  .single();
```

### Get Data Harian Range

```javascript
const { data } = await supabase
  .from('data_harian')
  .select('*')
  .eq('kandang_id', 'K1')
  .gte('tanggal', '2026-04-01')
  .lte('tanggal', '2026-04-30')
  .order('tanggal');
```

### Calculate Total Pakan

```javascript
const { data } = await supabase
  .from('data_harian')
  .select('pakan_total')
  .eq('kandang_id', 'K1');

const total = data.reduce((sum, row) => sum + (row.pakan_total || 0), 0);
```

### Get Harga Referensi

```javascript
const harga = await DB.getHargaReferensi();

console.log('DOC:', harga.harga_doc);
console.log('Pakan:', harga.harga_pakan);
console.log('Jual:', harga.harga_jual);
```

---

## 🎨 UI Patterns

### Loading State

```javascript
button.disabled = true;
spinner.style.display = 'block';

try {
  const data = await EdgeFunctions.calculateFCR('K1');
  displayResult(data);
} catch (error) {
  showError(error.message);
} finally {
  button.disabled = false;
  spinner.style.display = 'none';
}
```

### Error Handling

```javascript
try {
  const data = await DB.getDataHarian('K1', '2026-05-10');
  if (!data) {
    console.log('No data for this date');
  }
} catch (error) {
  console.error('Error:', error);
  alert('Gagal memuat data');
}
```

### Display FCR Status

```javascript
function getFcrStatus(fcr) {
  if (fcr <= 1.5) return { status: 'excellent', color: '#10b981' };
  if (fcr <= 1.6) return { status: 'good', color: '#3b82f6' };
  if (fcr <= 1.7) return { status: 'fair', color: '#f59e0b' };
  if (fcr <= 1.8) return { status: 'poor', color: '#ef4444' };
  return { status: 'very_poor', color: '#dc2626' };
}

const { status, color } = getFcrStatus(1.635);
badge.textContent = status;
badge.style.backgroundColor = color;
```

---

## 🔧 Debugging

### Check Supabase Connection

```javascript
const { data, error } = await supabase
  .from('kandangs')
  .select('count');

if (error) {
  console.error('Connection error:', error);
} else {
  console.log('Connected! Kandangs:', data);
}
```

### Test Edge Function

```javascript
const { data, error } = await supabase.functions.invoke('calculate-fcr', {
  body: { kandang_id: 'K1' }
});

if (error) {
  console.error('Function error:', error);
} else {
  console.log('Function result:', data);
}
```

### Check RLS Policies

```javascript
// This should work for owner/TS
const { data, error } = await supabase
  .from('data_harian')
  .select('*');

if (error) {
  console.error('RLS error:', error.message);
  // "new row violates row-level security policy"
}
```

---

## 📱 PWA

### Check if Installed

```javascript
if (window.matchMedia('(display-mode: standalone)').matches) {
  console.log('Running as PWA');
}
```

### Service Worker Status

```javascript
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.ready.then(registration => {
    console.log('SW active:', registration.active);
  });
}
```

---

## 🎯 Best Practices

### 1. Always Handle Errors

```javascript
✅ Good:
try {
  const data = await DB.getActiveKandangs();
} catch (error) {
  console.error(error);
  showError('Gagal memuat kandang');
}

❌ Bad:
const data = await DB.getActiveKandangs();  // No error handling
```

### 2. Use Loading States

```javascript
✅ Good:
setLoading(true);
const data = await fetchData();
setLoading(false);

❌ Bad:
const data = await fetchData();  // No loading indicator
```

### 3. Cache When Appropriate

```javascript
✅ Good:
if (cache && Date.now() - cacheTime < 5 * 60 * 1000) {
  return cache;
}
const data = await fetchData();
cache = data;
cacheTime = Date.now();

❌ Bad:
const data = await fetchData();  // Always fetch
```

### 4. Validate Input

```javascript
✅ Good:
if (!kandangId) {
  alert('Pilih kandang terlebih dahulu');
  return;
}
const data = await fetchData(kandangId);

❌ Bad:
const data = await fetchData(kandangId);  // No validation
```

---

## 📚 Resources

- **Examples:** `examples/fcr-calculator.html`, `examples/harvest-prediction.html`
- **Docs:** `README.md`, `IMPLEMENTATION_GUIDE.md`, `EDGE_FUNCTIONS.md`
- **Types:** `types/database.types.ts`
- **Helper:** `js/supabase-client.js`

---

## 🆘 Common Issues

| Issue | Solution |
|-------|----------|
| Function not found | Check function name and deployment |
| Unauthorized | Check user authentication |
| RLS violation | Check user role and permissions |
| CORS error | Edge functions handle CORS automatically |
| No data returned | Check if data exists in database |

---

## 📞 Support

- 📧 Email: support@broilertrack.com
- 📖 Docs: [README.md](./README.md)
- 🐛 Issues: GitHub Issues

---

**Last Updated:** May 10, 2026  
**Version:** 1.0.0
