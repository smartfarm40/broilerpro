# 📱 Panduan Halaman Operator — Broiler Monitor

> Dokumen ini adalah referensi teknis untuk halaman operator (mobile-first).
> Gunakan sebagai panduan debugging jika terjadi error di kemudian hari.

---

## 1. ARSITEKTUR & ROUTING

### Route Group
```
app/(operator)/
├── layout.tsx              → OperatorShell (sidebar + header)
├── components/
│   └── operator-shell.tsx  → Layout wrapper (gradient sidebar, hamburger menu)
└── operator/
    ├── page.tsx            → Home (action cards + status kandang)
    ├── deplesi/page.tsx    → Form input kematian & afkir
    ├── pakan/page.tsx      → Form input pakan + stok pakan datang
    ├── jadwal/page.tsx     → Pelaksanaan obat/vaksin dari jadwal manager
    ├── timbang/page.tsx    → Multi-entry penimbangan sampling
    └── panen/page.tsx      → Multi-entry timbangan panen + faktur virtual
```

### Aturan Akses (Konsisten)
| Role | Akses `/operator/*` | Akses `/dashboard/*` |
|------|:---:|:---:|
| Operator | ✅ | ❌ redirect ke `/operator` |
| Owner/Manager/Supervisor/Viewer | ❌ redirect ke `/dashboard` | ✅ |

**File yang mengatur:**
- `app/(operator)/layout.tsx` → cek `org.role !== "operator"` → redirect `/dashboard`
- `app/(dashboard)/layout.tsx` → cek `org.role === "operator"` → redirect `/operator`
- `app/page.tsx` → root redirect berdasarkan role

---

## 2. PENEMPATAN KANDANG (Coop Assignment)

### Tabel: `coop_assignments`
```sql
id, user_id, coop_id, organization_id, assigned_at
```

### Logika Filter
- **Ada assignment** → operator hanya melihat kandang yang di-assign
- **Tidak ada assignment** → tampilkan array kosong (operator harus ditempatkan dulu)
- Tidak ada fallback "tampilkan semua"

### File terkait:
- `app/api/operator/active-flocks/route.ts` → query filter `inArray(flocks.coopId, assignedCoopIds)`
- `app/(operator)/operator/page.tsx` → server-side juga filter dengan logika yang sama
- `app/(dashboard)/members/invite-form.tsx` → form undangan + pilih kandang
- `app/api/members/assign-coops/route.ts` → API ubah penempatan

---

## 3. HALAMAN HOME (`/operator`)

### Data yang di-fetch (server-side):
1. `coopAssignments` → filter kandang
2. `flocks` (active, filtered by assignment)
3. `dailyRecords` (today) → cek status recording
4. `medicationSchedules` + `medicationExecutions` → hitung jadwal pending

### Action Cards (5 item, grid 2 kolom):
| Card | Warna | Badge |
|------|-------|-------|
| Deplesi | red→rose | - |
| Pakan | amber→orange | - |
| Jadwal | blue→indigo | 🔴 jumlah jadwal pending |
| Timbang | emerald→green | - |
| Panen | purple→violet | - |

### Badge Jadwal:
- Query `medicationSchedules` where `dayNumber = hari_ke_N_flock`
- Minus yang sudah ada di `medicationExecutions` hari ini
- Jika > 0 → tampilkan badge merah + nama obat di deskripsi

---

## 4. HALAMAN DEPLESI (`/operator/deplesi`)

### Flow:
1. Load flocks dari `/api/operator/active-flocks` (include `lastPopulation`)
2. Tampilkan populasi saat ini (banner biru)
3. Input: jumlah mati + jumlah afkir
4. Auto-kalkulasi: sisa ayam = populasi - mati - afkir (+ persentase)
5. Simpan → POST `/api/operator/deplesi`

### API Logic (`app/api/operator/deplesi/route.ts`):
- Jika record hari ini sudah ada → UPDATE (tambahkan ke existing deadCount/cullCount)
- Jika belum ada → INSERT record baru
- `remainingPopulation` = previous population - dead - cull
- Activity log dicatat

---

## 5. HALAMAN PAKAN (`/operator/pakan`)

### Flow:
1. Input: Nama pakan (manual), Pakan Pagi (kg), Pakan Siang (kg)
2. Auto-kalkulasi: Total = pagi + siang
3. Simpan → POST `/api/operator/pakan`
4. Section "Pakan Datang": input karung → POST `/api/operator/pakan/incoming`
5. Tabel riwayat: GET `/api/operator/pakan/logs?flockId=xxx`

### Tabel: `feed_stock`
```sql
id, flock_id, organization_id, date, type("incoming"|"used"), amount_kg, bags, note, created_by
```

### Kalkulasi Sisa Pakan:
```
sisa (kg) = Σ(incoming × 50kg) - Σ(used kg)
Format: "X sak + Y kg" (1 sak = 50 kg)
```

### Edit:
- PATCH `/api/operator/pakan/edit` → update feed_stock entry
- DELETE `/api/operator/pakan/edit?id=xxx` → hapus entry
- Semua edit tercatat di `activity_logs`

---

## 6. HALAMAN JADWAL (`/operator/jadwal`)

### Flow:
1. Load jadwal hari ini: GET `/api/operator/jadwal?flockId=xxx`
2. API menghitung `dayNumber` dari flock, query `medicationSchedules` untuk hari itu
3. Jika tidak ada jadwal → tampilkan default "Air Biasa"
4. Operator klik item → input jumlah → Simpan
5. POST `/api/operator/jadwal` → insert ke `medicationExecutions`

### Tabel: `medication_schedules` (dibuat oleh Manager/Supervisor)
```sql
id, flock_id, organization_id, day_number, name, dosage, method, notes, created_by
```

### Tabel: `medication_executions` (dicatat oleh Operator)
```sql
id, schedule_id, flock_id, organization_id, date, name, amount, executed_by
```

### Halaman Manager untuk buat jadwal:
- `/coops/[id]/schedules` → form tambah jadwal per hari ke-N

---

## 7. HALAMAN TIMBANG (`/operator/timbang`)

### Flow:
1. Input jumlah ekor per timbang (sekali saja, lalu terkunci)
2. Input berat (gram) → Tambah → masuk tabel
3. Bisa tambah berkali-kali (multi-entry)
4. Tabel: data terbaru di atas, max 10 baris visible (scroll)
5. Summary: total sampel, total berat, rata-rata
6. Simpan → POST `/api/operator/timbang` (kirim avgWeight + totalSamples)

### Validasi Input:
- Max 50000 gram per entry
- Spinner number dihapus (`[appearance:textfield]`)
- Placeholder warna sangat tipis (`placeholder:text-muted-foreground/30`)
- Enter key = auto tambah

### Ekor Lock:
- Setelah entry pertama, jumlah ekor terkunci
- Klik "Ubah" → reset semua entry + unlock

---

## 8. HALAMAN PANEN (`/operator/panen`)

### Flow:
1. Input per baris: jumlah ekor + berat (kg) → Tambah
2. Ekor TIDAK di-lock (bisa beda per baris)
3. Tabel: data terbaru di atas, max 10 baris visible
4. Info pengiriman: Nama pelanggan, No kendaraan, Sopir
5. Simpan → POST `/api/operator/panen` → mark flock as "harvest"
6. Setelah simpan → tampilkan **Faktur Virtual**

### Faktur Virtual:
- Full-screen putih (cocok screenshot)
- Isi: header, info pelanggan, tabel timbangan, summary, tanda tangan
- Tombol: "Kembali" + "📤 Bagikan" (Web Share API)
- Desain compact agar muat 1 layar HP

### API (`app/api/operator/panen/route.ts`):
- Update `flocks.status` → "harvest"
- Update `coops.status` → "empty"

---

## 9. API ENDPOINTS OPERATOR

| Method | Endpoint | Fungsi |
|--------|----------|--------|
| GET | `/api/operator/active-flocks` | Daftar flock aktif (filtered by assignment, include lastPopulation) |
| POST | `/api/operator/deplesi` | Input kematian & afkir |
| GET | `/api/operator/jadwal?flockId=` | Jadwal hari ini + executions |
| POST | `/api/operator/jadwal` | Catat pelaksanaan obat/vaksin |
| POST | `/api/operator/pakan` | Input konsumsi pakan harian |
| POST | `/api/operator/pakan/incoming` | Catat pakan datang (karung) |
| GET | `/api/operator/pakan/logs?flockId=` | Riwayat pakan (tabel) |
| PATCH | `/api/operator/pakan/edit` | Edit entry feed_stock |
| DELETE | `/api/operator/pakan/edit?id=` | Hapus entry feed_stock |
| POST | `/api/operator/timbang` | Simpan data penimbangan |
| POST | `/api/operator/panen` | Simpan data panen + tutup flock |

---

## 10. TABEL DATABASE TERKAIT

```
users
organizations
organization_members (role: operator)
coop_assignments (user ↔ kandang)
coops
flocks
daily_records
feed_stock (stok pakan: incoming/used)
medication_schedules (jadwal dari manager)
medication_executions (pelaksanaan oleh operator)
activity_logs (semua aktivitas edit/create/delete)
```

---

## 11. LAYOUT & UI PATTERN

### Header Konsisten (semua form page):
```
[← Back] [Judul + Deskripsi] [Badge Kandang]
```
- Back button: rounded-lg border, icon chevron-left
- Badge kandang: rounded-xl, border-primary, bg-primary/5
- Selector grid hanya muncul jika operator punya > 1 kandang

### Sidebar (hamburger only):
```
[Logo + Nama Organisasi]
─── Gradient vertical (indigo → purple) ───
icon  Deplesi
icon  Pakan
icon  Jadwal
icon  Timbang
icon  Panen
───
[Nama User]
[Keluar] → bg-white/10, backdrop-blur, rounded-xl
```

### Styling Global:
- Card: `rounded-xl`, `bg-white/80`, `backdrop-blur-sm`, `shadow-md`
- Button: `rounded-xl`
- Input: `rounded-xl`, `h-12` (touch-friendly)
- Badge: `rounded-full`
- Gradient: `bg-gradient-primary` (#667eea → #764ba2)

---

## 12. TROUBLESHOOTING

### Operator melihat semua kandang (bukan hanya yang di-assign):
- Cek tabel `coop_assignments` → pastikan ada entry untuk user tersebut
- Jika kosong → operator tidak akan melihat kandang apapun (by design)
- Fix: Owner/Manager assign via halaman Anggota

### Jadwal tidak muncul:
- Cek `medication_schedules` → pastikan `day_number` sesuai hari ke-N flock
- Hitung manual: `dayNumber = floor((today - flock.startDate) / 86400000)`
- Jika tidak ada jadwal → default "Air Biasa" tetap muncul

### Sisa pakan 0 padahal sudah input pakan datang:
- Cek tabel `feed_stock` → pastikan ada entry type="incoming"
- Kalkulasi: `Σ(incoming.bags × 50) - Σ(used.amount_kg)`
- Pastikan `flock_id` sama antara incoming dan used

### Build error "Variable implicitly has type 'any[]'":
- Gunakan ternary expression (`const x = condition ? await query : []`) bukan `let`
- TypeScript tidak bisa infer type dari conditional assignment dengan `let`

### Operator bisa akses /dashboard:
- Cek `app/(dashboard)/layout.tsx` → harus ada redirect jika `org.role === "operator"`
- Cek middleware → session cookie harus ada

---

*Dokumen ini di-update terakhir: 30 Mei 2026*
