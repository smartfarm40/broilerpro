-- =====================================================
-- MIGRATION: Create TS Visits Table
-- Description: Tabel untuk tracking jadwal kunjungan TS ke kandang
-- Date: 2026-05-10
-- =====================================================

-- 1. Create ts_visits table
CREATE TABLE IF NOT EXISTS ts_visits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Relations (using TEXT to match kandangs.id and users.id)
  kandang_id TEXT NOT NULL REFERENCES kandangs(id) ON DELETE CASCADE,
  ts_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tenant_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Jadwal
  tanggal_kunjungan DATE NOT NULL,
  waktu_mulai TIME,
  waktu_selesai TIME,
  
  -- Tujuan kunjungan
  tujuan VARCHAR(50) NOT NULL CHECK (tujuan IN ('rutin', 'emergency', 'konsultasi', 'monitoring', 'training')),
  
  -- Status
  status VARCHAR(50) NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled', 'rescheduled')),
  
  -- Catatan
  catatan_sebelum TEXT, -- Catatan sebelum kunjungan (rencana)
  catatan_sesudah TEXT, -- Catatan setelah kunjungan (hasil)
  
  -- Checklist items (JSONB)
  checklist_items JSONB DEFAULT '[]'::jsonb,
  -- Format: [
  --   {"item": "Cek kondisi kandang", "checked": true},
  --   {"item": "Cek kesehatan ayam", "checked": false},
  --   {"item": "Review target pakan", "checked": true}
  -- ]
  
  -- Findings & recommendations
  findings TEXT, -- Temuan selama kunjungan
  recommendations TEXT, -- Rekomendasi untuk operator/owner
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by TEXT REFERENCES users(id),
  completed_at TIMESTAMPTZ, -- Waktu kunjungan selesai
  cancelled_reason TEXT -- Alasan jika dibatalkan
);

-- 2. Create indexes for performance
CREATE INDEX idx_ts_visits_kandang ON ts_visits(kandang_id);
CREATE INDEX idx_ts_visits_ts_user ON ts_visits(ts_user_id);
CREATE INDEX idx_ts_visits_tenant ON ts_visits(tenant_id);
CREATE INDEX idx_ts_visits_tanggal ON ts_visits(tanggal_kunjungan);
CREATE INDEX idx_ts_visits_status ON ts_visits(status);
CREATE INDEX idx_ts_visits_tanggal_status ON ts_visits(tanggal_kunjungan, status);

-- 3. Create updated_at trigger
CREATE OR REPLACE FUNCTION update_ts_visits_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_ts_visits_updated_at
  BEFORE UPDATE ON ts_visits
  FOR EACH ROW
  EXECUTE FUNCTION update_ts_visits_updated_at();

-- 4. Enable RLS
ALTER TABLE ts_visits ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies

-- Policy: Owner/Manager dapat melihat semua visits di tenant mereka
CREATE POLICY "Owner/Manager can view all visits"
  ON ts_visits FOR SELECT
  USING (
    tenant_id IN (
      SELECT id FROM users 
      WHERE id = auth.uid() 
      AND role IN ('owner', 'manager')
    )
  );

-- Policy: TS dapat melihat visits yang mereka buat atau assigned ke mereka
CREATE POLICY "TS can view their visits"
  ON ts_visits FOR SELECT
  USING (
    ts_user_id = auth.uid()
    OR tenant_id IN (
      SELECT id FROM users 
      WHERE id = auth.uid() 
      AND role = 'ts'
    )
  );

-- Policy: Staff dapat melihat semua visits di tenant mereka
CREATE POLICY "Staff can view all visits"
  ON ts_visits FOR SELECT
  USING (
    tenant_id IN (
      SELECT id FROM users 
      WHERE id = auth.uid() 
      AND role = 'staff'
    )
  );

-- Policy: Operator dapat melihat visits untuk kandang mereka
CREATE POLICY "Operator can view visits for their kandang"
  ON ts_visits FOR SELECT
  USING (
    kandang_id IN (
      SELECT k.id FROM kandangs k
      JOIN users u ON u.id = auth.uid()
      WHERE k.pj_user_id = u.id
      AND u.role = 'operator'
    )
  );

-- Policy: Viewer dapat melihat semua visits di tenant mereka
CREATE POLICY "Viewer can view all visits"
  ON ts_visits FOR SELECT
  USING (
    tenant_id IN (
      SELECT id FROM users 
      WHERE id = auth.uid() 
      AND role = 'viewer'
    )
  );

-- Policy: TS dapat membuat visit baru
CREATE POLICY "TS can create visits"
  ON ts_visits FOR INSERT
  WITH CHECK (
    auth.uid() IN (
      SELECT id FROM users 
      WHERE role IN ('ts', 'owner', 'manager')
    )
  );

-- Policy: TS dapat update visit mereka sendiri
CREATE POLICY "TS can update their visits"
  ON ts_visits FOR UPDATE
  USING (
    ts_user_id = auth.uid()
    OR auth.uid() IN (
      SELECT id FROM users 
      WHERE id = tenant_id 
      AND role IN ('owner', 'manager')
    )
  );

-- Policy: TS/Owner/Manager dapat delete visit
CREATE POLICY "TS/Owner/Manager can delete visits"
  ON ts_visits FOR DELETE
  USING (
    ts_user_id = auth.uid()
    OR auth.uid() IN (
      SELECT id FROM users 
      WHERE id = tenant_id 
      AND role IN ('owner', 'manager')
    )
  );

-- 6. Create helper function: Get upcoming visits for TS
CREATE OR REPLACE FUNCTION get_upcoming_visits_for_ts(
  p_ts_user_id TEXT,
  p_days_ahead INT DEFAULT 7
)
RETURNS TABLE (
  visit_id UUID,
  kandang_id TEXT,
  kandang_name VARCHAR,
  tanggal_kunjungan DATE,
  waktu_mulai TIME,
  tujuan VARCHAR,
  status VARCHAR,
  catatan_sebelum TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    v.id,
    v.kandang_id,
    k.name,
    v.tanggal_kunjungan,
    v.waktu_mulai,
    v.tujuan,
    v.status,
    v.catatan_sebelum
  FROM ts_visits v
  JOIN kandangs k ON k.id = v.kandang_id
  WHERE v.ts_user_id = p_ts_user_id
    AND v.tanggal_kunjungan BETWEEN CURRENT_DATE AND (CURRENT_DATE + p_days_ahead)
    AND v.status IN ('scheduled', 'in_progress')
  ORDER BY v.tanggal_kunjungan ASC, v.waktu_mulai ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Create helper function: Get visit statistics
CREATE OR REPLACE FUNCTION get_visit_statistics(
  p_tenant_id TEXT,
  p_start_date DATE DEFAULT NULL,
  p_end_date DATE DEFAULT NULL
)
RETURNS TABLE (
  total_visits BIGINT,
  completed_visits BIGINT,
  cancelled_visits BIGINT,
  scheduled_visits BIGINT,
  completion_rate NUMERIC
) AS $$
DECLARE
  v_start_date DATE;
  v_end_date DATE;
BEGIN
  v_start_date := COALESCE(p_start_date, CURRENT_DATE - INTERVAL '30 days');
  v_end_date := COALESCE(p_end_date, CURRENT_DATE);
  
  RETURN QUERY
  SELECT 
    COUNT(*)::BIGINT as total_visits,
    COUNT(*) FILTER (WHERE status = 'completed')::BIGINT as completed_visits,
    COUNT(*) FILTER (WHERE status = 'cancelled')::BIGINT as cancelled_visits,
    COUNT(*) FILTER (WHERE status = 'scheduled')::BIGINT as scheduled_visits,
    CASE 
      WHEN COUNT(*) > 0 THEN 
        ROUND((COUNT(*) FILTER (WHERE status = 'completed')::NUMERIC / COUNT(*)::NUMERIC) * 100, 2)
      ELSE 0
    END as completion_rate
  FROM ts_visits
  WHERE tenant_id = p_tenant_id
    AND tanggal_kunjungan BETWEEN v_start_date AND v_end_date;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Create helper function: Check if TS has visit today
CREATE OR REPLACE FUNCTION has_visit_today(p_ts_user_id TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM ts_visits
    WHERE ts_user_id = p_ts_user_id
      AND tanggal_kunjungan = CURRENT_DATE
      AND status IN ('scheduled', 'in_progress')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. Insert sample data (optional - for testing)
-- Uncomment jika ingin insert sample data

/*
INSERT INTO ts_visits (
  kandang_id, 
  ts_user_id, 
  tenant_id, 
  tanggal_kunjungan, 
  waktu_mulai,
  tujuan, 
  status, 
  catatan_sebelum,
  checklist_items
) VALUES (
  (SELECT id FROM kandangs LIMIT 1),
  (SELECT id FROM users WHERE role = 'ts' LIMIT 1),
  (SELECT id FROM users WHERE role = 'owner' LIMIT 1),
  CURRENT_DATE + INTERVAL '1 day',
  '09:00:00',
  'rutin',
  'scheduled',
  'Kunjungan rutin untuk monitoring pertumbuhan dan kesehatan ayam',
  '[
    {"item": "Cek kondisi kandang", "checked": false},
    {"item": "Cek kesehatan ayam", "checked": false},
    {"item": "Review target pakan", "checked": false},
    {"item": "Cek suhu dan ventilasi", "checked": false}
  ]'::jsonb
);
*/

-- 10. Comments
COMMENT ON TABLE ts_visits IS 'Tabel untuk tracking jadwal kunjungan Technical Service (TS) ke kandang';
COMMENT ON COLUMN ts_visits.tujuan IS 'Tujuan kunjungan: rutin, emergency, konsultasi, monitoring, training';
COMMENT ON COLUMN ts_visits.status IS 'Status: scheduled, in_progress, completed, cancelled, rescheduled';
COMMENT ON COLUMN ts_visits.checklist_items IS 'Checklist items dalam format JSONB array';
COMMENT ON COLUMN ts_visits.findings IS 'Temuan selama kunjungan (diisi setelah kunjungan)';
COMMENT ON COLUMN ts_visits.recommendations IS 'Rekomendasi untuk operator/owner (diisi setelah kunjungan)';

-- =====================================================
-- END OF MIGRATION
-- =====================================================
