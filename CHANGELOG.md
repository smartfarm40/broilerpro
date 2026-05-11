# Changelog

All notable changes to BroilerTrack PWA will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.0.0] - 2026-05-10

### 🎉 Initial Release

First production-ready release of BroilerTrack PWA with complete Supabase integration.

### ✨ Added

#### Database
- **14 tables** with complete schema
  - `kandangs` - Kandang master data with breed tracking
  - `data_harian` - Daily records with JSONB fields
  - `panen` - Harvest records with auto-calculated fields
  - `users` - User management with role-based access
  - `keuangan_kandang` - Financial tracking with computed columns
  - `stock_pakan` - Feed stock management
  - `penyakit` - Disease records
  - `vaksinasi` - Vaccination schedule
  - `target_periode` - Daily targets
  - `harga_referensi` - Reference prices
  - `growth_targets` - Growth standards (70 records)
  - `feed_targets` - Feed standards (70 records)
  - `profiles` - User profiles
  - `notifikasi` - Notification system

#### Migrations
- `add_breed_to_kandangs` - Added breed column for chicken type tracking
- `create_panen_table` - New harvest tracking table
- `add_periode_tracking_to_kandangs` - Added chick-in and target harvest dates
- `add_missing_foreign_key_indexes` - Performance optimization (7 indexes)
- `fix_permissive_rls_policies_v2` - Security enhancement with role-based RLS

#### Edge Functions
- **calculate-fcr** - Calculate Feed Conversion Ratio
  - Support for date range filtering
  - Status classification (excellent/good/fair/poor)
  - Detailed metrics (total feed, weight, days)
  
- **daily-report** - Generate comprehensive daily reports
  - Population tracking
  - Mortality statistics
  - Deplesi rate calculation
  - FCR estimation
  
- **auto-notifications** - Intelligent alert system
  - High mortality detection (> 1% daily)
  - Deplesi rate monitoring (> 5%)
  - Low feed consumption alerts
  - Stock level warnings (< 500kg)
  - Temperature alerts (> 35°C)
  
- **predict-harvest** - Harvest prediction engine
  - Weight prediction based on growth targets
  - FCR forecasting
  - Feed requirement calculation
  - Smart recommendations
  
- **invite-member** - User invitation system
  - Role-based invitations
  - Email notifications

#### Security
- **Row Level Security (RLS)** on all tables
  - Owner & TS: Full access
  - Kandang staff: Own kandang only
  - Staff: Read-only access
  
- **Helper Functions**
  - `get_user_kandang_id()` - Get user's assigned kandang
  - `is_owner_or_ts()` - Check admin privileges

#### Performance
- **7 Foreign Key Indexes** added
  - `idx_keuangan_kandang_kandang_id`
  - `idx_notifikasi_kandang_id`
  - `idx_notifikasi_user_id`
  - `idx_penyakit_kandang_id`
  - `idx_profiles_kandang_id`
  - `idx_users_kandang_id`
  - `idx_vaksinasi_kandang_id`

#### Client Library
- **Supabase Client Helper** (`js/supabase-client.js`)
  - EdgeFunctions wrapper
  - DB operations helper
  - Realtime subscriptions
  - Error handling

#### Examples
- **FCR Calculator** (`examples/fcr-calculator.html`)
  - Interactive UI
  - Date range selection
  - Status visualization
  
- **Harvest Prediction** (`examples/harvest-prediction.html`)
  - Prediction dashboard
  - Recommendations display
  - Metrics visualization

#### Documentation
- **README.md** - Complete project overview
- **DATABASE_SCHEMA.md** - Database documentation (removed, consolidated)
- **SUPABASE_SETUP.md** - Supabase configuration guide
- **EDGE_FUNCTIONS.md** - Edge Functions API reference
- **IMPLEMENTATION_GUIDE.md** - Step-by-step implementation guide
- **CHANGELOG.md** - This file

#### TypeScript
- **database.types.ts** - Auto-generated TypeScript types
  - All 14 tables
  - Insert/Update/Row types
  - Relationships
  - Helper functions

### 🔧 Changed

- Updated `.env.local` with production credentials
- Enhanced RLS policies for better security
- Optimized database queries with indexes

### 🐛 Fixed

- Fixed overly permissive RLS policies (6 tables)
- Fixed missing foreign key indexes (7 indexes)
- Fixed auth function performance in RLS policies

### 📊 Metrics

- **Database Tables:** 14
- **Migrations:** 24 total (5 new)
- **Edge Functions:** 5
- **Indexes:** 9+
- **RLS Policies:** Secured
- **Lines of Code:** ~5,000+

---

## [0.9.0] - 2026-05-08

### 🚧 Beta Release

Initial beta release with core features.

### Added

- Basic kandang management
- Data harian recording
- User authentication
- Dashboard UI
- Charts and visualizations
- PWA capabilities

### Known Issues

- RLS policies too permissive
- Missing foreign key indexes
- No harvest tracking
- Limited reporting

---

## [0.5.0] - 2026-04-16

### 🎯 Alpha Release

First working prototype.

### Added

- Database schema v1
- Basic CRUD operations
- Login/Register pages
- Map integration (Leaflet)

---

## Future Releases

### [1.1.0] - Planned Q3 2026

#### Planned Features
- [ ] Export reports to PDF/Excel
- [ ] WhatsApp notifications
- [ ] Offline mode improvements
- [ ] Batch data entry
- [ ] Photo upload for records
- [ ] Advanced filtering

#### Planned Improvements
- [ ] Optimize RLS policies (wrap auth functions)
- [ ] Merge multiple permissive policies
- [ ] Add more indexes for common queries
- [ ] Implement data archiving
- [ ] Add audit logging

### [1.2.0] - Planned Q4 2026

#### Planned Features
- [ ] AI-powered predictions
- [ ] IoT sensor integration
- [ ] Multi-language support (EN, ID)
- [ ] Advanced analytics dashboard
- [ ] Mobile app (React Native)

### [2.0.0] - Planned 2027

#### Planned Features
- [ ] Marketplace integration
- [ ] Supply chain management
- [ ] Financial planning tools
- [ ] Mobile payment integration
- [ ] Multi-farm management

---

## Version History

| Version | Date | Status | Notes |
|---------|------|--------|-------|
| 1.0.0 | 2026-05-10 | ✅ Released | Production ready |
| 0.9.0 | 2026-05-08 | ✅ Released | Beta |
| 0.5.0 | 2026-04-16 | ✅ Released | Alpha |

---

## Migration Guide

### From 0.9.0 to 1.0.0

**Database Changes:**
1. Run new migrations:
   ```bash
   supabase db push
   ```

2. Update TypeScript types:
   ```bash
   supabase gen types typescript --linked > types/database.types.ts
   ```

3. Update client code to use new helper functions

**Breaking Changes:**
- RLS policies changed - users may need to re-login
- `panen` table added - update queries if needed
- Edge Functions require authentication

**New Features:**
- Use `EdgeFunctions.calculateFCR()` for FCR calculation
- Use `EdgeFunctions.getDailyReport()` for reports
- Use `Realtime.subscribeDataHarian()` for live updates

---

## Contributors

- **Blackbox Bro** - Initial development and Supabase integration
- **Kiro AI** - Implementation assistance and documentation

---

## Support

For questions or issues:
- 📧 Email: support@broilertrack.com
- 🐛 Issues: [GitHub Issues](https://github.com/yourusername/broilertrack-pwa/issues)
- 📖 Docs: [Documentation](./README.md)

---

**Last Updated:** May 10, 2026
