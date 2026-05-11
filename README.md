# 🐔 BroilerTrack PWA

Progressive Web App untuk manajemen peternakan ayam broiler dengan Supabase backend.

## 📋 Features

### ✅ Core Features
- 📊 **Dashboard** - Overview kandang dan statistik real-time
- 📝 **Data Harian** - Recording harian (mortalitas, pakan, berat, suhu, dll)
- 🏭 **Manajemen Kandang** - Multi-kandang management
- 💰 **Keuangan** - Tracking biaya dan pendapatan
- 📈 **Laporan** - Generate laporan harian dan periode
- 🔔 **Notifikasi** - Alert otomatis untuk kondisi kritis

### 🚀 Advanced Features
- 🧮 **FCR Calculator** - Hitung Feed Conversion Ratio
- 🔮 **Prediksi Panen** - Prediksi berat dan kebutuhan pakan
- 📊 **Growth Tracking** - Monitor pertumbuhan vs target
- 🏥 **Kesehatan** - Tracking penyakit dan vaksinasi
- 📦 **Stock Management** - Monitor stock pakan
- 👥 **Multi-User** - Role-based access (Owner, TS, Kandang, Staff)

### 💻 Technical Features
- ⚡ **Edge Functions** - Serverless business logic
- 🔐 **Row Level Security** - Secure data access
- 🔄 **Real-time Updates** - Live data synchronization
- 📱 **PWA** - Installable, offline-capable
- 🎨 **Responsive Design** - Mobile-first UI

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────┐
│                   Frontend (PWA)                    │
│  HTML + CSS + Vanilla JavaScript + Leaflet Maps    │
└─────────────────┬───────────────────────────────────┘
                  │
                  │ Supabase JS SDK
                  │
┌─────────────────▼───────────────────────────────────┐
│              Supabase Backend                       │
│                                                     │
│  ┌─────────────────────────────────────────────┐  │
│  │  PostgreSQL Database (14 tables)            │  │
│  │  - kandangs, data_harian, panen, users      │  │
│  │  - keuangan, stock_pakan, penyakit, etc     │  │
│  └─────────────────────────────────────────────┘  │
│                                                     │
│  ┌─────────────────────────────────────────────┐  │
│  │  Edge Functions (Deno Runtime)              │  │
│  │  - calculate-fcr                            │  │
│  │  - daily-report                             │  │
│  │  - auto-notifications                       │  │
│  │  - predict-harvest                          │  │
│  │  - invite-member                            │  │
│  └─────────────────────────────────────────────┘  │
│                                                     │
│  ┌─────────────────────────────────────────────┐  │
│  │  Row Level Security (RLS)                   │  │
│  │  - Role-based access control                │  │
│  │  - Data isolation per kandang               │  │
│  └─────────────────────────────────────────────┘  │
│                                                     │
│  ┌─────────────────────────────────────────────┐  │
│  │  Realtime Subscriptions                     │  │
│  │  - Live data updates                        │  │
│  │  - Broadcast changes                        │  │
│  └─────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
```

---

## 🗄️ Database Schema

### Main Tables

| Table | Description | Rows |
|-------|-------------|------|
| `kandangs` | Kandang master data | 3 |
| `users` | User management | 7 |
| `data_harian` | Daily records | 0 |
| `panen` | Harvest records | 0 |
| `keuangan_kandang` | Financial tracking | 0 |
| `stock_pakan` | Feed stock | 0 |
| `penyakit` | Disease records | 0 |
| `vaksinasi` | Vaccination schedule | 0 |
| `target_periode` | Daily targets | 0 |
| `harga_referensi` | Reference prices | 1 |
| `growth_targets` | Growth standards | 70 |
| `feed_targets` | Feed standards | 70 |
| `profiles` | User profiles | 0 |
| `notifikasi` | Notifications | 0 |

**Total: 14 tables**

See [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md) for detailed schema.

---

## ⚡ Edge Functions

| Function | Description | Status |
|----------|-------------|--------|
| `calculate-fcr` | Calculate Feed Conversion Ratio | ✅ Active |
| `daily-report` | Generate daily report with summary | ✅ Active |
| `auto-notifications` | Auto-generate alerts | ✅ Active |
| `predict-harvest` | Predict harvest weight & FCR | ✅ Active |
| `invite-member` | Invite new users | ✅ Active |

See [EDGE_FUNCTIONS.md](./EDGE_FUNCTIONS.md) for API documentation.

---

## 🚀 Getting Started

### Prerequisites

- Modern web browser (Chrome, Firefox, Safari, Edge)
- Internet connection
- Supabase account (for backend)

### Installation

1. **Clone repository**
   ```bash
   git clone https://github.com/yourusername/broilertrack-pwa.git
   cd broilertrack-pwa
   ```

2. **Configure environment**
   
   Create `.env.local`:
   ```env
   SUPABASE_URL=https://rsqbxzhrainejnbxnvfw.supabase.co
   SUPABASE_ANON_KEY=your_anon_key_here
   ```

3. **Serve locally**
   ```bash
   # Using Python
   python -m http.server 8000
   
   # Using Node.js
   npx http-server -p 8000
   
   # Using PHP
   php -S localhost:8000
   ```

4. **Open in browser**
   ```
   http://localhost:8000
   ```

### First Time Setup

1. **Login** with your credentials
2. **Select Kandang** from dashboard
3. **Input Data Harian** for today
4. **View Reports** and analytics

---

## 📱 Usage

### Daily Workflow

1. **Morning Check**
   - Open app
   - Select kandang
   - Input morning data (suhu, kondisi)

2. **Recording**
   - Input mortalitas
   - Record pakan consumption
   - Update stock pakan

3. **Weighing** (if scheduled)
   - Input sample weights
   - Calculate average

4. **Evening Check**
   - Input evening temperature
   - Complete checklist
   - Add notes

5. **Review**
   - Check notifications
   - View daily report
   - Monitor FCR

### Weekly Tasks

- Review FCR trends
- Check stock levels
- Plan feed orders
- Review growth vs targets

### Monthly Tasks

- Generate financial reports
- Analyze performance
- Plan next period
- Update targets

---

## 🎯 Key Metrics

### FCR (Feed Conversion Ratio)

```
FCR = Total Pakan (kg) / Total Berat Panen (kg)
```

**Target:** ≤ 1.65

**Status:**
- ≤ 1.5 = Excellent ⭐⭐⭐
- ≤ 1.6 = Good ⭐⭐
- ≤ 1.7 = Fair ⭐
- > 1.7 = Needs Improvement ⚠️

### Deplesi Rate

```
Deplesi Rate = (Total Mati + Culling) / DOC Awal × 100%
```

**Target:** ≤ 5%

### Average Daily Gain (ADG)

```
ADG = Berat Akhir / Hari
```

**Target:** 50-60 g/day

---

## 👥 User Roles

| Role | Access | Permissions |
|------|--------|-------------|
| **Owner** | All kandangs | Full access (CRUD) |
| **TS** (Technical Support) | All kandangs | Full access, manage health |
| **Kandang** | Assigned kandang only | Create/Update daily data |
| **Staff** | All kandangs | Read-only |

---

## 📊 Reports

### Daily Report

- Populasi saat ini
- Mortalitas (harian & kumulatif)
- Deplesi rate
- Konsumsi pakan
- Berat rata-rata
- FCR estimasi

### Period Report

- Total pakan consumed
- Total berat panen
- Actual FCR
- Financial summary
- Performance vs targets

### Financial Report

- Total biaya (DOC, pakan, obat, dll)
- Total pendapatan
- Laba/rugi
- ROI

---

## 🔧 Development

### Project Structure

```
broilertrack-pwa/
├── index.html              # Main dashboard
├── auth/                   # Authentication pages
│   ├── login.html
│   ├── register.html
│   └── invite.html
├── js/                     # JavaScript files
│   ├── app.js              # Main app logic
│   ├── data.js             # Data management
│   ├── charts.js           # Chart rendering
│   ├── supabase-client.js  # Supabase helper
│   └── auth/               # Auth services
├── css/                    # Stylesheets
│   └── style.css
├── icons/                  # App icons
├── examples/               # Example implementations
│   ├── fcr-calculator.html
│   └── harvest-prediction.html
├── supabase/               # Supabase config
│   ├── config.toml
│   └── migrations/         # Database migrations
├── types/                  # TypeScript types
│   └── database.types.ts
├── sw.js                   # Service Worker
├── manifest.json           # PWA manifest
├── .env.local              # Environment variables
├── DATABASE_SCHEMA.md      # Database documentation
├── EDGE_FUNCTIONS.md       # Edge Functions API docs
├── IMPLEMENTATION_GUIDE.md # Implementation guide
└── README.md               # This file
```

### Tech Stack

**Frontend:**
- HTML5, CSS3, JavaScript (ES6+)
- Leaflet.js (Maps)
- Chart.js (Charts)
- Service Worker (PWA)

**Backend:**
- Supabase (PostgreSQL + Edge Functions)
- Deno Runtime (Edge Functions)
- Row Level Security (RLS)

**Tools:**
- Git (Version control)
- VS Code (IDE)
- Chrome DevTools (Debugging)

### Local Development

```bash
# Install Supabase CLI
npm install -g supabase

# Login to Supabase
supabase login

# Link project
supabase link --project-ref rsqbxzhrainejnbxnvfw

# Pull latest schema
supabase db pull

# Generate types
supabase gen types typescript --linked > types/database.types.ts

# Serve Edge Function locally
supabase functions serve calculate-fcr --env-file .env.local
```

### Deploy Edge Function

```bash
# Deploy single function
supabase functions deploy calculate-fcr

# Deploy all functions
supabase functions deploy

# View logs
supabase functions logs calculate-fcr --follow
```

---

## 🧪 Testing

### Manual Testing

1. **FCR Calculator**
   - Open `examples/fcr-calculator.html`
   - Select kandang
   - Calculate FCR
   - Verify results

2. **Harvest Prediction**
   - Open `examples/harvest-prediction.html`
   - Select kandang
   - Set target day
   - Check predictions

3. **Database Operations**
   - Open browser console
   - Test CRUD operations
   - Verify RLS policies

### Automated Testing

```javascript
// Test in browser console
const { DB } = window.SupabaseClient;

// Test get kandangs
const kandangs = await DB.getActiveKandangs();
console.assert(kandangs.length > 0, 'Should have kandangs');

// Test get data harian
const data = await DB.getDataHarian('K1', '2026-05-10');
console.log('Data harian:', data);
```

---

## 📚 Documentation

- [Database Schema](./DATABASE_SCHEMA.md) - Complete database documentation
- [Edge Functions](./EDGE_FUNCTIONS.md) - API reference for Edge Functions
- [Implementation Guide](./IMPLEMENTATION_GUIDE.md) - Step-by-step implementation
- [Supabase Setup](./SUPABASE_SETUP.md) - Supabase configuration guide

---

## 🐛 Troubleshooting

### Common Issues

**App not loading?**
- Check internet connection
- Clear browser cache
- Check console for errors

**Can't login?**
- Verify credentials
- Check Supabase status
- Try password reset

**Data not saving?**
- Check user permissions
- Verify RLS policies
- Check network tab

**Edge Function error?**
- Check function logs
- Verify request payload
- Check authentication

See [IMPLEMENTATION_GUIDE.md](./IMPLEMENTATION_GUIDE.md#troubleshooting) for more.

---

## 🤝 Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Open Pull Request

---

## 📄 License

This project is licensed under the MIT License.

---

## 👨‍💻 Authors

- **Your Name** - Initial work

---

## 🙏 Acknowledgments

- Supabase team for amazing backend platform
- Leaflet.js for mapping capabilities
- Chart.js for data visualization
- All contributors and testers

---

## 📞 Support

For support, email support@broilertrack.com or open an issue on GitHub.

---

## 🗺️ Roadmap

### v1.1 (Q3 2026)
- [ ] Mobile app (React Native)
- [ ] Offline mode improvements
- [ ] Export to PDF/Excel
- [ ] WhatsApp notifications

### v1.2 (Q4 2026)
- [ ] AI-powered predictions
- [ ] IoT sensor integration
- [ ] Multi-language support
- [ ] Advanced analytics

### v2.0 (2027)
- [ ] Marketplace integration
- [ ] Supply chain management
- [ ] Financial planning tools
- [ ] Mobile payment integration

---

**Version:** 1.0.0  
**Last Updated:** May 10, 2026  
**Status:** Production Ready ✅
