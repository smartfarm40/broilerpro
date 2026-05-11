-- =====================================================
-- MIGRATION: Create Period Targets Table
-- Sprint 3: Target Custom per Periode untuk TS
-- Date: 2026-05-11
-- =====================================================

-- 1. Tabel period_targets
CREATE TABLE IF NOT EXISTS period_targets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Relasi (kandangs.id = TEXT, profiles.id = UUID)
  kandang_id  TEXT NOT NULL REFERENCES kandangs(id) ON DELETE CASCADE,
  created_by  UUID REFERENCES profiles(id),

  -- Periode
  periode_mulai   DATE NOT NULL,
  periode_selesai DATE NOT NULL,
  hari_mulai      INT  NOT NULL DEFAULT 1,

  -- Tipe target
  target_type VARCHAR(20) NOT NULL CHECK (target_type IN ('pakan','berat','fcr')),

  -- Breed referensi
  breed VARCHAR(50) DEFAULT 'Cobb 500',

  -- Nilai target per hari (JSONB array)
  -- Format: [{"hari": 1, "nilai": 42}, {"hari": 2, "nilai": 57}, ...]
  target_values JSONB NOT NULL DEFAULT '[]'::jsonb,

  -- Metadata
  nama_target VARCHAR(100),
  catatan     TEXT,
  is_active   BOOLEAN DEFAULT true,

  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Indexes
CREATE INDEX IF NOT EXISTS idx_period_targets_kandang ON period_targets(kandang_id);
CREATE INDEX IF NOT EXISTS idx_period_targets_type    ON period_targets(target_type);
CREATE INDEX IF NOT EXISTS idx_period_targets_periode ON period_targets(periode_mulai, periode_selesai);
CREATE INDEX IF NOT EXISTS idx_period_targets_active  ON period_targets(kandang_id, target_type, is_active);

-- 3. Trigger updated_at
CREATE OR REPLACE FUNCTION update_period_targets_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_period_targets_updated_at
  BEFORE UPDATE ON period_targets
  FOR EACH ROW EXECUTE FUNCTION update_period_targets_updated_at();

-- 4. RLS
ALTER TABLE period_targets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view period targets"
  ON period_targets FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "TS/Owner/Manager can create period targets"
  ON period_targets FOR INSERT
  WITH CHECK (
    auth.uid() IN (
      SELECT id FROM profiles WHERE role IN ('ts','owner','manager')
    )
  );

CREATE POLICY "TS/Owner/Manager can update period targets"
  ON period_targets FOR UPDATE
  USING (
    auth.uid() IN (
      SELECT id FROM profiles WHERE role IN ('ts','owner','manager')
    )
  );

CREATE POLICY "Owner/Manager/Creator can delete period targets"
  ON period_targets FOR DELETE
  USING (
    created_by = auth.uid()
    OR auth.uid() IN (
      SELECT id FROM profiles WHERE role IN ('owner','manager')
    )
  );

-- 5. Helper function: ambil target aktif untuk kandang + hari tertentu
CREATE OR REPLACE FUNCTION get_target_for_day(
  p_kandang_id  TEXT,
  p_target_type VARCHAR,
  p_tanggal     DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  target_id    UUID,
  nama_target  VARCHAR,
  breed        VARCHAR,
  hari_ke      INT,
  nilai_target NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    pt.id,
    pt.nama_target,
    pt.breed,
    (p_tanggal - pt.periode_mulai + pt.hari_mulai)::INT AS hari_ke,
    (
      SELECT (elem->>'nilai')::NUMERIC
      FROM jsonb_array_elements(pt.target_values) AS elem
      WHERE (elem->>'hari')::INT = (p_tanggal - pt.periode_mulai + pt.hari_mulai)
      LIMIT 1
    ) AS nilai_target
  FROM period_targets pt
  WHERE pt.kandang_id  = p_kandang_id
    AND pt.target_type = p_target_type
    AND pt.is_active   = true
    AND p_tanggal BETWEEN pt.periode_mulai AND pt.periode_selesai
  ORDER BY pt.created_at DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Helper function: ambil semua target values untuk satu periode
CREATE OR REPLACE FUNCTION get_period_target_values(
  p_kandang_id  TEXT,
  p_target_type VARCHAR
)
RETURNS TABLE (
  target_id       UUID,
  nama_target     VARCHAR,
  breed           VARCHAR,
  hari_mulai      INT,
  target_values   JSONB,
  periode_mulai   DATE,
  periode_selesai DATE
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    pt.id,
    pt.nama_target,
    pt.breed,
    pt.hari_mulai,
    pt.target_values,
    pt.periode_mulai,
    pt.periode_selesai
  FROM period_targets pt
  WHERE pt.kandang_id  = p_kandang_id
    AND pt.target_type = p_target_type
    AND pt.is_active   = true
  ORDER BY pt.periode_mulai DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON TABLE period_targets IS 'Target custom per periode yang dibuat oleh TS untuk kandang tertentu';
COMMENT ON COLUMN period_targets.target_type IS 'Tipe: pakan (g/ekor/hari), berat (gram), fcr';
COMMENT ON COLUMN period_targets.target_values IS 'Array JSONB: [{"hari":1,"nilai":42},{"hari":2,"nilai":57}]';
