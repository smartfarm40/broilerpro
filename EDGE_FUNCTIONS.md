# BroilerTrack Edge Functions

## 📋 Overview

Edge Functions adalah serverless functions yang berjalan di Deno runtime. Digunakan untuk business logic yang kompleks, kalkulasi, dan operasi yang membutuhkan server-side processing.

**Base URL:** `https://rsqbxzhrainejnbxnvfw.supabase.co/functions/v1`

---

## 🔐 Authentication

Semua Edge Functions memerlukan JWT authentication. Kirim token di header:

```javascript
const { data, error } = await supabase.functions.invoke('function-name', {
  body: { /* your data */ }
})
```

Atau dengan fetch API:

```javascript
const response = await fetch(`${SUPABASE_URL}/functions/v1/function-name`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ /* your data */ })
})
```

---

## 📊 1. calculate-fcr

Menghitung Feed Conversion Ratio (FCR) untuk evaluasi efisiensi pakan.

### Endpoint
```
POST /functions/v1/calculate-fcr
```

### Request Body
```typescript
interface FcrRequest {
  kandang_id: string          // Required
  tanggal_mulai?: string      // Optional, format: YYYY-MM-DD
  tanggal_akhir?: string      // Optional, format: YYYY-MM-DD
}
```

### Response
```typescript
interface FcrResult {
  kandang_id: string
  total_pakan_kg: number
  total_berat_panen_kg: number
  fcr: number
  jumlah_hari: number
  status: 'excellent' | 'good' | 'fair' | 'poor' | 'very_poor' | 'no_data'
  message: string
}
```

### Status Interpretation

| Status | FCR Range | Meaning |
|--------|-----------|---------|
| `excellent` | ≤ 1.5 | FCR sangat baik! Efisiensi pakan optimal |
| `good` | ≤ 1.6 | FCR baik. Efisiensi pakan di atas rata-rata |
| `fair` | ≤ 1.7 | FCR cukup. Masih dalam batas normal |
| `poor` | ≤ 1.8 | FCR kurang baik. Perlu evaluasi manajemen pakan |
| `very_poor` | > 1.8 | FCR buruk. Segera evaluasi kualitas pakan dan kesehatan ayam |
| `no_data` | - | Belum ada data panen |

### Example Usage

```javascript
// Calculate FCR for entire period
const { data } = await supabase.functions.invoke('calculate-fcr', {
  body: {
    kandang_id: 'K1'
  }
})

console.log(data)
// {
//   kandang_id: "K1",
//   total_pakan_kg: 8500.50,
//   total_berat_panen_kg: 5200.00,
//   fcr: 1.635,
//   jumlah_hari: 35,
//   status: "good",
//   message: "FCR baik. Efisiensi pakan di atas rata-rata."
// }

// Calculate FCR for specific date range
const { data: fcrRange } = await supabase.functions.invoke('calculate-fcr', {
  body: {
    kandang_id: 'K1',
    tanggal_mulai: '2026-04-01',
    tanggal_akhir: '2026-04-30'
  }
})
```

### Error Responses

```javascript
// Missing kandang_id
{
  "error": "kandang_id is required"
}

// Internal error
{
  "error": "Internal server error",
  "details": "Error message here"
}
```

---

## 📈 2. daily-report

Generate laporan harian lengkap dengan summary dan statistik.

### Endpoint
```
POST /functions/v1/daily-report
```

### Request Body
```typescript
interface ReportRequest {
  kandang_id: string    // Required
  tanggal: string       // Required, format: YYYY-MM-DD
}
```

### Response
```typescript
interface DailyReport {
  kandang: {
    id: string
    name: string
    kapasitas: number
    doc: number
    usia: number
    breed: string
    status: string
    // ... other kandang fields
  }
  data_harian: {
    id: string
    hari: number
    tanggal: string
    mati: number
    culling: number
    pakan_total: number
    berat_rata_rata: number
    // ... other data_harian fields
  } | null
  stock_pakan: {
    jumlah_kg: number
    updated_at: string
  } | null
  summary: {
    populasi_saat_ini: number
    mortalitas_hari_ini: number
    mortalitas_kumulatif: number
    deplesi_rate: number          // Percentage
    pakan_konsumsi: number
    berat_rata_rata: number       // Gram
    fcr_estimasi: number
  }
}
```

### Summary Calculations

- **populasi_saat_ini** = DOC awal - total mati - total culling
- **mortalitas_kumulatif** = Sum of all `mati` up to date
- **deplesi_rate** = ((total mati + total culling) / DOC awal) × 100
- **fcr_estimasi** = total pakan / (populasi × berat rata-rata)

### Example Usage

```javascript
const { data: report } = await supabase.functions.invoke('daily-report', {
  body: {
    kandang_id: 'K1',
    tanggal: '2026-05-10'
  }
})

console.log(report.summary)
// {
//   populasi_saat_ini: 4850,
//   mortalitas_hari_ini: 5,
//   mortalitas_kumulatif: 150,
//   deplesi_rate: 3.00,
//   pakan_konsumsi: 245.5,
//   berat_rata_rata: 1850,
//   fcr_estimasi: 1.620
// }

// Display in UI
const { summary } = report
console.log(`Populasi: ${summary.populasi_saat_ini} ekor`)
console.log(`Deplesi Rate: ${summary.deplesi_rate}%`)
console.log(`FCR Estimasi: ${summary.fcr_estimasi}`)
```

### Error Responses

```javascript
// Missing parameters
{
  "error": "kandang_id and tanggal are required"
}

// Kandang not found
{
  "error": "Kandang not found"
}

// Internal error
{
  "error": "Internal server error",
  "details": "Error message here"
}
```

---

## 👥 3. invite-member

Invite user baru ke sistem (existing function).

### Endpoint
```
POST /functions/v1/invite-member
```

### Request Body
```typescript
interface InviteRequest {
  email: string
  role: 'owner' | 'kandang' | 'ts' | 'staff'
  kandang_id?: string    // Required for role 'kandang'
  nama: string
}
```

### Response
```typescript
interface InviteResponse {
  success: boolean
  user_id: string
  message: string
}
```

### Example Usage

```javascript
// Invite petugas kandang
const { data } = await supabase.functions.invoke('invite-member', {
  body: {
    email: 'budi@example.com',
    role: 'kandang',
    kandang_id: 'K1',
    nama: 'Budi Santoso'
  }
})

// Invite technical support
const { data: tsInvite } = await supabase.functions.invoke('invite-member', {
  body: {
    email: 'dokter@example.com',
    role: 'ts',
    nama: 'Dr. Rahmat'
  }
})
```

---

## 🔧 Development

### Local Testing

```bash
# Start Supabase locally
supabase start

# Serve function locally
supabase functions serve calculate-fcr --env-file .env.local

# Test with curl
curl -i --location --request POST 'http://localhost:54321/functions/v1/calculate-fcr' \
  --header 'Authorization: Bearer YOUR_ANON_KEY' \
  --header 'Content-Type: application/json' \
  --data '{"kandang_id":"K1"}'
```

### Deploy Function

```bash
# Deploy single function
supabase functions deploy calculate-fcr

# Deploy all functions
supabase functions deploy
```

### View Logs

```bash
# View function logs
supabase functions logs calculate-fcr

# Follow logs in real-time
supabase functions logs calculate-fcr --follow
```

---

## 🎯 Best Practices

### 1. Error Handling

Always handle errors gracefully:

```javascript
try {
  const { data, error } = await supabase.functions.invoke('calculate-fcr', {
    body: { kandang_id: 'K1' }
  })
  
  if (error) {
    console.error('Function error:', error)
    return
  }
  
  // Use data
  console.log('FCR:', data.fcr)
} catch (err) {
  console.error('Network error:', err)
}
```

### 2. Loading States

Show loading indicators:

```javascript
const [loading, setLoading] = useState(false)
const [fcr, setFcr] = useState(null)

const calculateFcr = async () => {
  setLoading(true)
  try {
    const { data } = await supabase.functions.invoke('calculate-fcr', {
      body: { kandang_id: 'K1' }
    })
    setFcr(data)
  } finally {
    setLoading(false)
  }
}
```

### 3. Caching

Cache results when appropriate:

```javascript
// Cache FCR for 5 minutes
const cachedFcr = localStorage.getItem('fcr_K1')
const cacheTime = localStorage.getItem('fcr_K1_time')

if (cachedFcr && Date.now() - cacheTime < 5 * 60 * 1000) {
  return JSON.parse(cachedFcr)
}

// Fetch new data
const { data } = await supabase.functions.invoke('calculate-fcr', {
  body: { kandang_id: 'K1' }
})

localStorage.setItem('fcr_K1', JSON.stringify(data))
localStorage.setItem('fcr_K1_time', Date.now())
```

---

## 📊 Performance

### Response Times

| Function | Avg Response Time | Max Response Time |
|----------|-------------------|-------------------|
| calculate-fcr | ~200ms | ~500ms |
| daily-report | ~150ms | ~400ms |
| invite-member | ~300ms | ~800ms |

### Rate Limits

- **Free tier:** 500,000 invocations/month
- **Pro tier:** 2,000,000 invocations/month
- **Rate limit:** 100 requests/second per function

---

## 🐛 Troubleshooting

### Common Issues

**1. "Function not found"**
```
Solution: Pastikan function sudah di-deploy
$ supabase functions deploy calculate-fcr
```

**2. "Unauthorized"**
```
Solution: Pastikan JWT token valid
- Check token expiration
- Verify user is authenticated
```

**3. "Timeout"**
```
Solution: Function execution > 60 seconds
- Optimize query
- Add indexes
- Reduce data processing
```

**4. "CORS error"**
```
Solution: Function sudah handle CORS, pastikan:
- Request dari domain yang benar
- Headers lengkap
```

---

## 📚 Resources

- [Supabase Edge Functions Docs](https://supabase.com/docs/guides/functions)
- [Deno Runtime](https://deno.land/)
- [Edge Functions Examples](https://github.com/supabase/supabase/tree/master/examples/edge-functions)

---

**Last Updated:** May 10, 2026
**Functions Version:** v1
**Runtime:** Deno 1.x
