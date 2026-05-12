-- =====================================================
-- CREATE PANEN (HARVEST) TABLES
-- =====================================================

-- Table: panen (harvest records)
CREATE TABLE IF NOT EXISTS panen (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kandang_id UUID NOT NULL REFERENCES kandangs(id) ON DELETE CASCADE,
  tanggal_panen DATE NOT NULL,
  umur_hari INTEGER NOT NULL,
  penimbang_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  
  -- Summary (calculated after timbang)
  total_ekor INTEGER DEFAULT 0,
  total_berat DECIMAL(10,2) DEFAULT 0,
  berat_rata_rata DECIMAL(10,2) DEFAULT 0,
  berat_min DECIMAL(10,2) DEFAULT 0,
  berat_max DECIMAL(10,2) DEFAULT 0,
  
  -- Status
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'completed', 'cancelled')),
  
  -- Metadata
  catatan TEXT,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: panen_timbang (harvest weighing records)
CREATE TABLE IF NOT EXISTS panen_timbang (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  panen_id UUID NOT NULL REFERENCES panen(id) ON DELETE CASCADE,
  berat DECIMAL(10,2) NOT NULL,
  jumlah_ekor INTEGER DEFAULT 1,
  catatan TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_panen_kandang ON panen(kandang_id);
CREATE INDEX IF NOT EXISTS idx_panen_tanggal ON panen(tanggal_panen);
CREATE INDEX IF NOT EXISTS idx_panen_status ON panen(status);
CREATE INDEX IF NOT EXISTS idx_panen_penimbang ON panen(penimbang_id);
CREATE INDEX IF NOT EXISTS idx_panen_timbang_panen ON panen_timbang(panen_id);

-- Trigger: Update updated_at
CREATE OR REPLACE FUNCTION update_panen_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER panen_updated_at
  BEFORE UPDATE ON panen
  FOR EACH ROW
  EXECUTE FUNCTION update_panen_updated_at();

-- =====================================================
-- RLS POLICIES
-- =====================================================

ALTER TABLE panen ENABLE ROW LEVEL SECURITY;
ALTER TABLE panen_timbang ENABLE ROW LEVEL SECURITY;

-- Policy: panen - SELECT (all authenticated users in same tenant)
CREATE POLICY panen_select ON panen
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM kandangs k
      WHERE k.id = panen.kandang_id
        AND k.tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
    )
  );

-- Policy: panen - INSERT (owner, manager, operator)
CREATE POLICY panen_insert ON panen
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('owner', 'manager', 'operator')
        AND EXISTS (
          SELECT 1 FROM kandangs k
          WHERE k.id = panen.kandang_id
            AND k.tenant_id = p.tenant_id
        )
    )
  );

-- Policy: panen - UPDATE (owner, manager, operator)
CREATE POLICY panen_update ON panen
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('owner', 'manager', 'operator')
        AND EXISTS (
          SELECT 1 FROM kandangs k
          WHERE k.id = panen.kandang_id
            AND k.tenant_id = p.tenant_id
        )
    )
  );

-- Policy: panen - DELETE (owner, manager only)
CREATE POLICY panen_delete ON panen
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('owner', 'manager')
        AND EXISTS (
          SELECT 1 FROM kandangs k
          WHERE k.id = panen.kandang_id
            AND k.tenant_id = p.tenant_id
        )
    )
  );

-- Policy: panen_timbang - SELECT
CREATE POLICY panen_timbang_select ON panen_timbang
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM panen p
      JOIN kandangs k ON k.id = p.kandang_id
      WHERE p.id = panen_timbang.panen_id
        AND k.tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
    )
  );

-- Policy: panen_timbang - INSERT
CREATE POLICY panen_timbang_insert ON panen_timbang
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM panen p
      JOIN kandangs k ON k.id = p.kandang_id
      JOIN profiles pr ON pr.id = auth.uid()
      WHERE p.id = panen_timbang.panen_id
        AND k.tenant_id = pr.tenant_id
        AND pr.role IN ('owner', 'manager', 'operator')
    )
  );

-- Policy: panen_timbang - UPDATE
CREATE POLICY panen_timbang_update ON panen_timbang
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM panen p
      JOIN kandangs k ON k.id = p.kandang_id
      JOIN profiles pr ON pr.id = auth.uid()
      WHERE p.id = panen_timbang.panen_id
        AND k.tenant_id = pr.tenant_id
        AND pr.role IN ('owner', 'manager', 'operator')
    )
  );

-- Policy: panen_timbang - DELETE
CREATE POLICY panen_timbang_delete ON panen_timbang
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM panen p
      JOIN kandangs k ON k.id = p.kandang_id
      JOIN profiles pr ON pr.id = auth.uid()
      WHERE p.id = panen_timbang.panen_id
        AND k.tenant_id = pr.tenant_id
        AND pr.role IN ('owner', 'manager', 'operator')
    )
  );

-- =====================================================
-- PERMISSIONS
-- =====================================================

-- Add panen permissions to permissions table
INSERT INTO permissions (code, name, description, category) VALUES
  ('panen.view', 'Lihat Panen', 'Melihat data panen', 'panen'),
  ('panen.create', 'Buat Panen', 'Membuat data panen baru', 'panen'),
  ('panen.edit', 'Edit Panen', 'Mengubah data panen', 'panen'),
  ('panen.delete', 'Hapus Panen', 'Menghapus data panen', 'panen'),
  ('panen.complete', 'Selesaikan Panen', 'Menyelesaikan proses panen', 'panen'),
  ('panen.export', 'Export Panen', 'Export laporan panen ke PDF', 'panen')
ON CONFLICT (code) DO NOTHING;

-- Assign permissions to roles
DO $$
DECLARE
  perm_id UUID;
BEGIN
  -- OWNER: Full access
  FOR perm_id IN 
    SELECT id FROM permissions WHERE code LIKE 'panen.%'
  LOOP
    INSERT INTO role_permissions (role, permission_id)
    VALUES ('owner', perm_id)
    ON CONFLICT (role, permission_id) DO NOTHING;
  END LOOP;

  -- MANAGER: Full access
  FOR perm_id IN 
    SELECT id FROM permissions WHERE code LIKE 'panen.%'
  LOOP
    INSERT INTO role_permissions (role, permission_id)
    VALUES ('manager', perm_id)
    ON CONFLICT (role, permission_id) DO NOTHING;
  END LOOP;

  -- OPERATOR: View, Create, Edit, Complete
  FOR perm_id IN 
    SELECT id FROM permissions WHERE code IN ('panen.view', 'panen.create', 'panen.edit', 'panen.complete')
  LOOP
    INSERT INTO role_permissions (role, permission_id)
    VALUES ('operator', perm_id)
    ON CONFLICT (role, permission_id) DO NOTHING;
  END LOOP;

  -- STAFF: View, Export
  FOR perm_id IN 
    SELECT id FROM permissions WHERE code IN ('panen.view', 'panen.export')
  LOOP
    INSERT INTO role_permissions (role, permission_id)
    VALUES ('staff', perm_id)
    ON CONFLICT (role, permission_id) DO NOTHING;
  END LOOP;

  -- TS: View only
  FOR perm_id IN 
    SELECT id FROM permissions WHERE code = 'panen.view'
  LOOP
    INSERT INTO role_permissions (role, permission_id)
    VALUES ('ts', perm_id)
    ON CONFLICT (role, permission_id) DO NOTHING;
  END LOOP;
END $$;

-- Verify
SELECT 
  rp.role,
  p.code,
  p.name
FROM role_permissions rp
JOIN permissions p ON rp.permission_id = p.id
WHERE p.code LIKE 'panen.%'
ORDER BY rp.role, p.code;
