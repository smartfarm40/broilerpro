-- ============================================================
-- BROILER MONITOR — Supabase PostgreSQL Schema
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor → New Query)
-- ============================================================
-- ⚠️ WARNING: This will DROP all existing tables and recreate them
-- ============================================================

-- Drop old tables (from previous project)
DROP TABLE IF EXISTS ts_visits CASCADE;
DROP TABLE IF EXISTS target_periode CASCADE;
DROP TABLE IF EXISTS stock_movements CASCADE;
DROP TABLE IF EXISTS stock_pakan CASCADE;
DROP TABLE IF EXISTS role_permissions CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;
DROP TABLE IF EXISTS permissions CASCADE;
DROP TABLE IF EXISTS production_costs CASCADE;
DROP TABLE IF EXISTS period_targets CASCADE;
DROP TABLE IF EXISTS penyakit CASCADE;
DROP TABLE IF EXISTS panen_timbang CASCADE;
DROP TABLE IF EXISTS panen CASCADE;
DROP TABLE IF EXISTS notifikasi CASCADE;
DROP TABLE IF EXISTS medication_programs CASCADE;
DROP TABLE IF EXISTS medication_logs CASCADE;
DROP TABLE IF EXISTS medication_items CASCADE;
DROP TABLE IF EXISTS keuangan_kandang CASCADE;
DROP TABLE IF EXISTS kandangs CASCADE;
DROP TABLE IF EXISTS inventory_items CASCADE;
DROP TABLE IF EXISTS harga_referensi CASCADE;
DROP TABLE IF EXISTS growth_targets CASCADE;
DROP TABLE IF EXISTS feed_targets CASCADE;
DROP TABLE IF EXISTS farm_settings CASCADE;
DROP TABLE IF EXISTS deliveries CASCADE;
DROP TABLE IF EXISTS data_harian CASCADE;

-- Drop new tables if they exist (for re-run safety)
DROP TABLE IF EXISTS visit_checkins CASCADE;
DROP TABLE IF EXISTS medication_executions CASCADE;
DROP TABLE IF EXISTS medication_schedules CASCADE;
DROP TABLE IF EXISTS activity_logs CASCADE;
DROP TABLE IF EXISTS feed_stock CASCADE;
DROP TABLE IF EXISTS coop_assignments CASCADE;
DROP TABLE IF EXISTS invitations CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS daily_records CASCADE;
DROP TABLE IF EXISTS flocks CASCADE;
DROP TABLE IF EXISTS coops CASCADE;
DROP TABLE IF EXISTS organization_members CASCADE;
DROP TABLE IF EXISTS organizations CASCADE;
DROP TABLE IF EXISTS verifications CASCADE;
DROP TABLE IF EXISTS accounts CASCADE;
DROP TABLE IF EXISTS sessions CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- ==================== AUTH & ORGANIZATION ====================

CREATE TABLE users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  email_verified BOOLEAN DEFAULT FALSE,
  image TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  expires_at TIMESTAMP NOT NULL,
  token TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  ip_address TEXT,
  user_agent TEXT,
  user_id TEXT NOT NULL REFERENCES users(id)
);

CREATE TABLE accounts (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL,
  provider_id TEXT NOT NULL,
  user_id TEXT NOT NULL REFERENCES users(id),
  access_token TEXT,
  refresh_token TEXT,
  id_token TEXT,
  access_token_expires_at TIMESTAMP,
  refresh_token_expires_at TIMESTAMP,
  scope TEXT,
  password TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE verifications (
  id TEXT PRIMARY KEY,
  identifier TEXT NOT NULL,
  value TEXT NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ==================== ORGANIZATIONS ====================

CREATE TABLE organizations (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  logo_url TEXT,
  primary_color TEXT DEFAULT '#16a34a',
  secondary_color TEXT DEFAULT '#15803d',
  owner_id TEXT NOT NULL REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE organization_members (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  organization_id TEXT NOT NULL REFERENCES organizations(id),
  role TEXT NOT NULL,
  joined_at TIMESTAMP DEFAULT NOW()
);

-- ==================== COOPS (KANDANG) ====================

CREATE TABLE coops (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations(id),
  name TEXT NOT NULL,
  capacity INTEGER NOT NULL,
  location TEXT,
  status TEXT DEFAULT 'empty',
  created_at TIMESTAMP DEFAULT NOW()
);

-- ==================== FLOCKS (PERIODE PEMELIHARAAN) ====================

CREATE TABLE flocks (
  id TEXT PRIMARY KEY,
  coop_id TEXT NOT NULL REFERENCES coops(id),
  organization_id TEXT NOT NULL REFERENCES organizations(id),
  start_date TEXT NOT NULL,
  doc_count INTEGER NOT NULL,
  strain TEXT NOT NULL,
  target_weight INTEGER NOT NULL,
  target_days INTEGER NOT NULL,
  status TEXT DEFAULT 'active',
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ==================== DAILY RECORDS ====================

CREATE TABLE daily_records (
  id TEXT PRIMARY KEY,
  flock_id TEXT NOT NULL REFERENCES flocks(id),
  organization_id TEXT NOT NULL REFERENCES organizations(id),
  date TEXT NOT NULL,
  day_number INTEGER NOT NULL,
  dead_count INTEGER DEFAULT 0,
  cull_count INTEGER DEFAULT 0,
  remaining_population INTEGER NOT NULL,
  avg_weight REAL,
  sample_count INTEGER,
  feed_type TEXT,
  feed_in REAL DEFAULT 0,
  feed_remaining REAL DEFAULT 0,
  feed_consumed REAL DEFAULT 0,
  cumulative_feed REAL DEFAULT 0,
  health_condition TEXT DEFAULT 'normal',
  medication TEXT,
  symptoms TEXT,
  temp_morning REAL,
  temp_afternoon REAL,
  temp_evening REAL,
  humidity REAL,
  fcr REAL,
  adg REAL,
  depletion REAL,
  ip_score REAL,
  notes TEXT,
  created_by TEXT REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW()
);

-- ==================== NOTIFICATIONS ====================

CREATE TABLE notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  organization_id TEXT NOT NULL REFERENCES organizations(id),
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ==================== INVITATIONS ====================

CREATE TABLE invitations (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations(id),
  email TEXT NOT NULL,
  role TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE,
  status TEXT DEFAULT 'pending',
  assigned_coop_ids TEXT,
  invited_by TEXT NOT NULL REFERENCES users(id),
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ==================== COOP ASSIGNMENTS ====================

CREATE TABLE coop_assignments (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  coop_id TEXT NOT NULL REFERENCES coops(id),
  organization_id TEXT NOT NULL REFERENCES organizations(id),
  assigned_at TIMESTAMP DEFAULT NOW()
);

-- ==================== FEED STOCK ====================

CREATE TABLE feed_stock (
  id TEXT PRIMARY KEY,
  flock_id TEXT NOT NULL REFERENCES flocks(id),
  organization_id TEXT NOT NULL REFERENCES organizations(id),
  date TEXT NOT NULL,
  type TEXT NOT NULL,
  amount_kg REAL NOT NULL,
  bags INTEGER,
  note TEXT,
  created_by TEXT REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW()
);

-- ==================== ACTIVITY LOG ====================

CREATE TABLE activity_logs (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  organization_id TEXT NOT NULL REFERENCES organizations(id),
  action TEXT NOT NULL,
  entity TEXT NOT NULL,
  entity_id TEXT,
  description TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ==================== MEDICATION SCHEDULES ====================

CREATE TABLE medication_schedules (
  id TEXT PRIMARY KEY,
  flock_id TEXT NOT NULL REFERENCES flocks(id),
  organization_id TEXT NOT NULL REFERENCES organizations(id),
  day_number INTEGER NOT NULL,
  name TEXT NOT NULL,
  dosage TEXT,
  method TEXT,
  notes TEXT,
  created_by TEXT REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW()
);

-- ==================== MEDICATION EXECUTIONS ====================

CREATE TABLE medication_executions (
  id TEXT PRIMARY KEY,
  schedule_id TEXT REFERENCES medication_schedules(id),
  flock_id TEXT NOT NULL REFERENCES flocks(id),
  organization_id TEXT NOT NULL REFERENCES organizations(id),
  date TEXT NOT NULL,
  name TEXT NOT NULL,
  amount TEXT,
  executed_by TEXT REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW()
);

-- ==================== VISIT CHECK-INS ====================

CREATE TABLE visit_checkins (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  coop_id TEXT NOT NULL REFERENCES coops(id),
  organization_id TEXT NOT NULL REFERENCES organizations(id),
  date TEXT NOT NULL,
  check_in_time TEXT NOT NULL,
  check_out_time TEXT,
  condition TEXT DEFAULT 'baik',
  notes TEXT,
  photo_url TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ==================== INDEXES ====================

CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_token ON sessions(token);
CREATE INDEX idx_accounts_user_id ON accounts(user_id);
CREATE INDEX idx_org_members_user_id ON organization_members(user_id);
CREATE INDEX idx_org_members_org_id ON organization_members(organization_id);
CREATE INDEX idx_coops_org_id ON coops(organization_id);
CREATE INDEX idx_flocks_coop_id ON flocks(coop_id);
CREATE INDEX idx_flocks_org_id ON flocks(organization_id);
CREATE INDEX idx_flocks_status ON flocks(status);
CREATE INDEX idx_daily_records_flock_id ON daily_records(flock_id);
CREATE INDEX idx_daily_records_date ON daily_records(date);
CREATE INDEX idx_daily_records_org_id ON daily_records(organization_id);
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_coop_assignments_user_id ON coop_assignments(user_id);
CREATE INDEX idx_coop_assignments_coop_id ON coop_assignments(coop_id);
CREATE INDEX idx_feed_stock_flock_id ON feed_stock(flock_id);
CREATE INDEX idx_feed_stock_date ON feed_stock(date);
CREATE INDEX idx_activity_logs_org_id ON activity_logs(organization_id);
CREATE INDEX idx_activity_logs_user_id ON activity_logs(user_id);
CREATE INDEX idx_medication_schedules_flock_id ON medication_schedules(flock_id);
CREATE INDEX idx_medication_executions_flock_id ON medication_executions(flock_id);
CREATE INDEX idx_medication_executions_date ON medication_executions(date);
CREATE INDEX idx_visit_checkins_user_id ON visit_checkins(user_id);
CREATE INDEX idx_visit_checkins_date ON visit_checkins(date);
CREATE INDEX idx_invitations_email ON invitations(email);
CREATE INDEX idx_invitations_token ON invitations(token);
