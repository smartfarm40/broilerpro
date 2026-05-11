-- =====================================================
-- MIGRATION: Role & Permission System
-- Date: 2026-05-10
-- Description: Implementasi role-based access control (RBAC)
-- =====================================================

-- =====================================================
-- 1. UPDATE USERS & PROFILES: Tambah role baru
-- =====================================================

-- Update constraint role di tabel users
ALTER TABLE users 
  DROP CONSTRAINT IF EXISTS users_role_check;

ALTER TABLE users
  ADD CONSTRAINT users_role_check 
  CHECK (role IN ('owner', 'manager', 'ts', 'staff', 'operator', 'viewer'));

COMMENT ON COLUMN users.role IS 'Role: owner, manager, ts (Technical Service), staff (Staff Kantor), operator (Petugas Kandang), viewer';

-- Update constraint role di tabel profiles
ALTER TABLE profiles 
  DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE profiles
  ADD CONSTRAINT profiles_role_check 
  CHECK (role IN ('owner', 'manager', 'ts', 'staff', 'operator', 'viewer'));

COMMENT ON COLUMN profiles.role IS 'Role: owner, manager, ts (Technical Service), staff (Staff Kantor), operator (Petugas Kandang), viewer';

-- =====================================================
-- 2. TABEL PERMISSIONS: Daftar semua permission
-- =====================================================

CREATE TABLE IF NOT EXISTS permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(100) UNIQUE NOT NULL,
  name VARCHAR(200) NOT NULL,
  description TEXT,
  category VARCHAR(50) NOT NULL, -- kandang, laporan, cost, target, jadwal, team, inventory
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE permissions IS 'Daftar semua permission yang tersedia di sistem';

-- Index untuk query cepat
CREATE INDEX idx_permissions_category ON permissions(category);
CREATE INDEX idx_permissions_code ON permissions(code);

-- =====================================================
-- 3. TABEL ROLE_PERMISSIONS: Mapping role ke permission
-- =====================================================

CREATE TABLE IF NOT EXISTS role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role VARCHAR(50) NOT NULL,
  permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(role, permission_id)
);

COMMENT ON TABLE role_permissions IS 'Mapping role ke permissions';

-- Index untuk query cepat
CREATE INDEX idx_role_permissions_role ON role_permissions(role);
CREATE INDEX idx_role_permissions_permission ON role_permissions(permission_id);

-- =====================================================
-- 4. SEED DATA: Permissions
-- =====================================================

INSERT INTO permissions (code, name, description, category) VALUES
  -- KANDANG
  ('kandang.view', 'Lihat Kandang', 'Melihat daftar dan detail kandang', 'kandang'),
  ('kandang.view_all', 'Lihat Semua Kandang', 'Melihat semua kandang (tidak terbatas assigned)', 'kandang'),
  ('kandang.create', 'Tambah Kandang', 'Membuat kandang baru', 'kandang'),
  ('kandang.edit', 'Edit Kandang', 'Mengubah data kandang', 'kandang'),
  ('kandang.delete', 'Hapus Kandang', 'Menghapus kandang', 'kandang'),
  
  -- LAPORAN HARIAN
  ('log.view', 'Lihat Laporan Harian', 'Melihat laporan harian kandang', 'laporan'),
  ('log.create', 'Input Laporan Harian', 'Menginput data harian (deplesi, pakan, dll)', 'laporan'),
  ('log.edit', 'Edit Laporan Harian', 'Mengubah laporan harian', 'laporan'),
  ('log.delete', 'Hapus Laporan Harian', 'Menghapus laporan harian', 'laporan'),
  ('log.complete', 'Selesaikan Hari', 'Menandai hari sebagai selesai', 'laporan'),
  
  -- COST & HARGA
  ('cost.view', 'Lihat Cost/Harga', 'Melihat informasi harga dan biaya produksi', 'cost'),
  ('cost.edit', 'Edit Harga', 'Mengubah harga referensi', 'cost'),
  ('cost.report', 'Laporan Cost', 'Melihat laporan cost produksi dan profit/loss', 'cost'),
  
  -- PENGIRIMAN
  ('delivery.view', 'Lihat Pengiriman', 'Melihat daftar pengiriman', 'delivery'),
  ('delivery.create', 'Input Pengiriman', 'Menginput pengiriman baru dengan harga', 'delivery'),
  ('delivery.edit', 'Edit Pengiriman', 'Mengubah data pengiriman', 'delivery'),
  ('delivery.delete', 'Hapus Pengiriman', 'Menghapus pengiriman', 'delivery'),
  
  -- TARGET
  ('target.view', 'Lihat Target', 'Melihat target pakan, berat, FCR', 'target'),
  ('target.create', 'Buat Target', 'Membuat target custom per periode', 'target'),
  ('target.edit', 'Edit Target', 'Mengubah target', 'target'),
  ('target.delete', 'Hapus Target', 'Menghapus target', 'target'),
  
  -- JADWAL KUNJUNGAN TS
  ('visit.view', 'Lihat Jadwal Kunjungan', 'Melihat jadwal kunjungan TS', 'jadwal'),
  ('visit.create', 'Buat Jadwal Kunjungan', 'Membuat jadwal kunjungan baru', 'jadwal'),
  ('visit.edit', 'Edit Jadwal Kunjungan', 'Mengubah jadwal kunjungan', 'jadwal'),
  ('visit.delete', 'Hapus Jadwal Kunjungan', 'Menghapus jadwal kunjungan', 'jadwal'),
  ('visit.complete', 'Selesaikan Kunjungan', 'Menandai kunjungan selesai dan input catatan', 'jadwal'),
  
  -- OBAT/VITAMIN/VAKSIN
  ('medication.view', 'Lihat Program Kesehatan', 'Melihat program obat/vitamin/vaksin', 'medication'),
  ('medication.create', 'Buat Program Kesehatan', 'Membuat program obat/vitamin/vaksin', 'medication'),
  ('medication.edit', 'Edit Program Kesehatan', 'Mengubah program kesehatan', 'medication'),
  ('medication.delete', 'Hapus Program Kesehatan', 'Menghapus program kesehatan', 'medication'),
  ('medication.execute', 'Eksekusi Pemberian Obat', 'Menandai obat sudah diberikan', 'medication'),
  
  -- INVENTORY
  ('inventory.view', 'Lihat Inventory', 'Melihat stok inventory', 'inventory'),
  ('inventory.view_cost', 'Lihat Harga Inventory', 'Melihat nilai/harga inventory', 'inventory'),
  ('inventory.edit', 'Edit Inventory', 'Mengubah stok inventory', 'inventory'),
  
  -- TEAM MANAGEMENT
  ('member.view', 'Lihat Anggota Tim', 'Melihat daftar anggota tim', 'team'),
  ('member.invite', 'Undang Anggota', 'Mengundang anggota baru', 'team'),
  ('member.edit', 'Edit Anggota', 'Mengubah role anggota', 'team'),
  ('member.remove', 'Hapus Anggota', 'Menghapus anggota dari tim', 'team'),
  
  -- SETTINGS
  ('settings.view', 'Lihat Settings', 'Melihat pengaturan', 'settings'),
  ('settings.edit', 'Edit Settings', 'Mengubah pengaturan', 'settings'),
  
  -- REPORTS
  ('report.view', 'Lihat Laporan', 'Melihat laporan dan grafik', 'report'),
  ('report.export', 'Export Laporan', 'Export laporan ke Excel/PDF', 'report'),
  ('report.cost', 'Laporan dengan Cost', 'Melihat laporan yang include cost/harga', 'report')
ON CONFLICT (code) DO NOTHING;

-- =====================================================
-- 5. SEED DATA: Role Permissions Mapping
-- =====================================================

-- Helper function untuk assign permissions ke role
CREATE OR REPLACE FUNCTION assign_permissions_to_role(
  p_role VARCHAR,
  p_permission_codes TEXT[]
)
RETURNS VOID AS $$
DECLARE
  perm_code TEXT;
  perm_id UUID;
BEGIN
  FOREACH perm_code IN ARRAY p_permission_codes
  LOOP
    SELECT id INTO perm_id FROM permissions WHERE code = perm_code;
    IF perm_id IS NOT NULL THEN
      INSERT INTO role_permissions (role, permission_id)
      VALUES (p_role, perm_id)
      ON CONFLICT (role, permission_id) DO NOTHING;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- OWNER: Full Access (semua permission)
-- =====================================================
SELECT assign_permissions_to_role('owner', ARRAY[
  'kandang.view', 'kandang.view_all', 'kandang.create', 'kandang.edit', 'kandang.delete',
  'log.view', 'log.create', 'log.edit', 'log.delete', 'log.complete',
  'cost.view', 'cost.edit', 'cost.report',
  'delivery.view', 'delivery.create', 'delivery.edit', 'delivery.delete',
  'target.view', 'target.create', 'target.edit', 'target.delete',
  'visit.view', 'visit.create', 'visit.edit', 'visit.delete', 'visit.complete',
  'medication.view', 'medication.create', 'medication.edit', 'medication.delete', 'medication.execute',
  'inventory.view', 'inventory.view_cost', 'inventory.edit',
  'member.view', 'member.invite', 'member.edit', 'member.remove',
  'settings.view', 'settings.edit',
  'report.view', 'report.export', 'report.cost'
]);

-- =====================================================
-- MANAGER: Full Access (sama seperti owner)
-- =====================================================
SELECT assign_permissions_to_role('manager', ARRAY[
  'kandang.view', 'kandang.view_all', 'kandang.create', 'kandang.edit', 'kandang.delete',
  'log.view', 'log.create', 'log.edit', 'log.delete', 'log.complete',
  'cost.view', 'cost.edit', 'cost.report',
  'delivery.view', 'delivery.create', 'delivery.edit', 'delivery.delete',
  'target.view', 'target.create', 'target.edit', 'target.delete',
  'visit.view', 'visit.create', 'visit.edit', 'visit.delete', 'visit.complete',
  'medication.view', 'medication.create', 'medication.edit', 'medication.delete', 'medication.execute',
  'inventory.view', 'inventory.view_cost', 'inventory.edit',
  'member.view', 'member.invite', 'member.edit', 'member.remove',
  'settings.view', 'settings.edit',
  'report.view', 'report.export', 'report.cost'
]);

-- =====================================================
-- TS (Technical Service): Monitoring + Target, TANPA COST
-- =====================================================
SELECT assign_permissions_to_role('ts', ARRAY[
  'kandang.view', 'kandang.view_all',
  'log.view',
  -- TIDAK ADA: cost.view, cost.edit, cost.report
  -- TIDAK ADA: delivery permissions
  'target.view', 'target.create', 'target.edit', 'target.delete',
  'visit.view', 'visit.create', 'visit.edit', 'visit.delete', 'visit.complete',
  'medication.view', 'medication.create', 'medication.edit', 'medication.delete', 'medication.execute',
  'inventory.view', -- TIDAK ADA: inventory.view_cost
  'member.view',
  'settings.view',
  'report.view', 'report.export'
  -- TIDAK ADA: report.cost
]);

-- =====================================================
-- STAFF (Staff Kantor): Input Pengiriman + Cost
-- =====================================================
SELECT assign_permissions_to_role('staff', ARRAY[
  'kandang.view', 'kandang.view_all',
  'log.view',
  'cost.view', 'cost.edit', 'cost.report',
  'delivery.view', 'delivery.create', 'delivery.edit', 'delivery.delete',
  'target.view', -- TIDAK bisa create/edit target (hanya TS)
  'visit.view',
  'medication.view',
  'inventory.view', 'inventory.view_cost', 'inventory.edit',
  'member.view',
  'settings.view',
  'report.view', 'report.export', 'report.cost'
]);

-- =====================================================
-- OPERATOR (Petugas Kandang): Input Harian Saja
-- =====================================================
SELECT assign_permissions_to_role('operator', ARRAY[
  'kandang.view', -- HANYA kandang yang assigned
  'log.view', 'log.create', 'log.complete',
  -- TIDAK ADA: cost permissions
  -- TIDAK ADA: delivery permissions
  'target.view',
  'visit.view',
  'medication.view', 'medication.execute',
  'inventory.view',
  'settings.view',
  'report.view'
]);

-- =====================================================
-- VIEWER: Read-Only
-- =====================================================
SELECT assign_permissions_to_role('viewer', ARRAY[
  'kandang.view', 'kandang.view_all',
  'log.view',
  -- TIDAK ADA: cost permissions
  'target.view',
  'visit.view',
  'medication.view',
  'inventory.view',
  'member.view',
  'settings.view',
  'report.view'
]);

-- =====================================================
-- 6. FUNCTION: Check User Permission
-- =====================================================

CREATE OR REPLACE FUNCTION user_has_permission(
  p_user_id TEXT,
  p_permission_code VARCHAR
)
RETURNS BOOLEAN AS $$
DECLARE
  user_role VARCHAR;
  has_perm BOOLEAN;
BEGIN
  -- Get user role from users table
  SELECT role INTO user_role
  FROM users
  WHERE id = p_user_id;
  
  IF user_role IS NULL THEN
    -- Try from profiles table
    SELECT role INTO user_role
    FROM profiles
    WHERE id::text = p_user_id;
  END IF;
  
  IF user_role IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Check if role has permission
  SELECT EXISTS(
    SELECT 1
    FROM role_permissions rp
    JOIN permissions p ON p.id = rp.permission_id
    WHERE rp.role = user_role AND p.code = p_permission_code
  ) INTO has_perm;
  
  RETURN has_perm;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION user_has_permission IS 'Check apakah user punya permission tertentu';

-- =====================================================
-- 7. FUNCTION: Get User Permissions
-- =====================================================

CREATE OR REPLACE FUNCTION get_user_permissions(
  p_user_id TEXT
)
RETURNS TABLE(
  permission_code VARCHAR,
  permission_name VARCHAR,
  category VARCHAR
) AS $$
DECLARE
  user_role VARCHAR;
BEGIN
  -- Get user role from users table
  SELECT role INTO user_role
  FROM users
  WHERE id = p_user_id;
  
  IF user_role IS NULL THEN
    -- Try from profiles table
    SELECT role INTO user_role
    FROM profiles
    WHERE id::text = p_user_id;
  END IF;
  
  IF user_role IS NULL THEN
    RETURN;
  END IF;
  
  -- Return all permissions for this role
  RETURN QUERY
  SELECT p.code, p.name, p.category
  FROM role_permissions rp
  JOIN permissions p ON p.id = rp.permission_id
  WHERE rp.role = user_role
  ORDER BY p.category, p.code;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_user_permissions IS 'Get semua permissions untuk user';

-- =====================================================
-- 8. RLS POLICIES: Update untuk permission-based access
-- =====================================================

-- Policy untuk kandangs: operator hanya bisa lihat kandang assigned
DROP POLICY IF EXISTS kandangs_select_policy ON kandangs;
CREATE POLICY kandangs_select_policy ON kandangs
  FOR SELECT
  USING (
    -- Owner/Manager/TS/Staff/Viewer bisa lihat semua
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()::text
        AND u.role IN ('owner', 'manager', 'ts', 'staff', 'viewer')
    )
    OR
    -- Operator hanya bisa lihat kandang yang assigned
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()::text
        AND u.role = 'operator'
        AND kandangs.pj_user_id = auth.uid()::text
    )
  );

-- Policy untuk data_harian: operator hanya bisa edit kandang assigned
DROP POLICY IF EXISTS data_harian_insert_policy ON data_harian;
CREATE POLICY data_harian_insert_policy ON data_harian
  FOR INSERT
  WITH CHECK (
    -- Owner/Manager/TS bisa insert semua
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()::text
        AND u.role IN ('owner', 'manager', 'ts')
    )
    OR
    -- Operator hanya bisa insert untuk kandang assigned
    EXISTS (
      SELECT 1 FROM users u
      JOIN kandangs k ON k.id = data_harian.kandang_id
      WHERE u.id = auth.uid()::text
        AND u.role = 'operator'
        AND k.pj_user_id = auth.uid()::text
    )
  );

DROP POLICY IF EXISTS data_harian_update_policy ON data_harian;
CREATE POLICY data_harian_update_policy ON data_harian
  FOR UPDATE
  USING (
    -- Owner/Manager/TS bisa update semua
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()::text
        AND u.role IN ('owner', 'manager', 'ts')
    )
    OR
    -- Operator hanya bisa update untuk kandang assigned
    EXISTS (
      SELECT 1 FROM users u
      JOIN kandangs k ON k.id = data_harian.kandang_id
      WHERE u.id = auth.uid()::text
        AND u.role = 'operator'
        AND k.pj_user_id = auth.uid()::text
    )
  );

-- =====================================================
-- 9. INDEXES untuk Performance
-- =====================================================

-- Index untuk users.role (sering di-query)
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- Index untuk profiles.role (sering di-query)
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);

-- Index untuk kandangs.pj_user_id (untuk filter operator)
CREATE INDEX IF NOT EXISTS idx_kandangs_pj_user ON kandangs(pj_user_id);

-- Index untuk kandangs.ts_user_id (untuk filter TS)
CREATE INDEX IF NOT EXISTS idx_kandangs_ts_user ON kandangs(ts_user_id);

-- =====================================================
-- 10. CLEANUP: Drop helper function
-- =====================================================

DROP FUNCTION IF EXISTS assign_permissions_to_role(VARCHAR, TEXT[]);

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================

-- Verify migration
DO $$
DECLARE
  perm_count INT;
  role_perm_count INT;
BEGIN
  SELECT COUNT(*) INTO perm_count FROM permissions;
  SELECT COUNT(*) INTO role_perm_count FROM role_permissions;
  
  RAISE NOTICE '✅ Migration completed successfully!';
  RAISE NOTICE '   - Permissions created: %', perm_count;
  RAISE NOTICE '   - Role-Permission mappings: %', role_perm_count;
  RAISE NOTICE '   - Roles: owner, manager, ts, staff, operator, viewer';
END $$;
