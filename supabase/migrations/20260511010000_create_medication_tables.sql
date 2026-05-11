-- =====================================================
-- MIGRATION: Create Medication Tables + Health Permissions
-- Sprint 4: Program Kesehatan (Obat/Vaksin/Vitamin)
-- Date: 2026-05-11
-- =====================================================

-- 1. medication_programs
CREATE TABLE IF NOT EXISTS medication_programs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kandang_id  TEXT NOT NULL REFERENCES kandangs(id) ON DELETE CASCADE,
  created_by  UUID REFERENCES profiles(id),
  nama_program  VARCHAR(100) NOT NULL,
  deskripsi     TEXT,
  is_active     BOOLEAN DEFAULT true,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 2. medication_items
CREATE TABLE IF NOT EXISTS medication_items (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id  UUID NOT NULL REFERENCES medication_programs(id) ON DELETE CASCADE,
  kandang_id  TEXT NOT NULL REFERENCES kandangs(id) ON DELETE CASCADE,
  medication_type  VARCHAR(20) NOT NULL CHECK (medication_type IN ('obat','vaksin','vitamin','suplemen')),
  nama_produk      VARCHAR(100) NOT NULL,
  dosis            NUMERIC,
  satuan           VARCHAR(30),
  hari_pemberian   JSONB NOT NULL DEFAULT '[]'::jsonb,
  cara_pemberian   VARCHAR(50),
  catatan          TEXT,
  urutan           INT DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 3. medication_logs
CREATE TABLE IF NOT EXISTS medication_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id     UUID NOT NULL REFERENCES medication_items(id) ON DELETE CASCADE,
  kandang_id  TEXT NOT NULL REFERENCES kandangs(id) ON DELETE CASCADE,
  tanggal     DATE NOT NULL,
  hari_ke     INT  NOT NULL,
  status      VARCHAR(20) NOT NULL DEFAULT 'scheduled'
              CHECK (status IN ('scheduled','completed','skipped','partial')),
  jumlah_diberikan  NUMERIC,
  catatan_realisasi TEXT,
  input_by          UUID REFERENCES profiles(id),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Indexes
CREATE INDEX IF NOT EXISTS idx_med_programs_kandang  ON medication_programs(kandang_id);
CREATE INDEX IF NOT EXISTS idx_med_programs_active   ON medication_programs(kandang_id, is_active);
CREATE INDEX IF NOT EXISTS idx_med_items_program     ON medication_items(program_id);
CREATE INDEX IF NOT EXISTS idx_med_items_kandang     ON medication_items(kandang_id);
CREATE INDEX IF NOT EXISTS idx_med_logs_item         ON medication_logs(item_id);
CREATE INDEX IF NOT EXISTS idx_med_logs_kandang_tgl  ON medication_logs(kandang_id, tanggal);

-- 5. Triggers
CREATE OR REPLACE FUNCTION update_medication_updated_at()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$ LANGUAGE plpgsql;

CREATE TRIGGER trg_med_programs_updated_at BEFORE UPDATE ON medication_programs FOR EACH ROW EXECUTE FUNCTION update_medication_updated_at();
CREATE TRIGGER trg_med_items_updated_at    BEFORE UPDATE ON medication_items    FOR EACH ROW EXECUTE FUNCTION update_medication_updated_at();

-- 6. RLS
ALTER TABLE medication_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE medication_items    ENABLE ROW LEVEL SECURITY;
ALTER TABLE medication_logs     ENABLE ROW LEVEL SECURITY;

CREATE POLICY "view_med_programs"   ON medication_programs FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "create_med_programs" ON medication_programs FOR INSERT WITH CHECK (auth.uid() IN (SELECT id FROM profiles WHERE role IN ('ts','owner','manager')));
CREATE POLICY "update_med_programs" ON medication_programs FOR UPDATE USING (auth.uid() IN (SELECT id FROM profiles WHERE role IN ('ts','owner','manager')));
CREATE POLICY "delete_med_programs" ON medication_programs FOR DELETE USING (created_by = auth.uid() OR auth.uid() IN (SELECT id FROM profiles WHERE role IN ('owner','manager')));

CREATE POLICY "view_med_items"   ON medication_items FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "manage_med_items" ON medication_items FOR INSERT WITH CHECK (auth.uid() IN (SELECT id FROM profiles WHERE role IN ('ts','owner','manager')));
CREATE POLICY "update_med_items" ON medication_items FOR UPDATE USING (auth.uid() IN (SELECT id FROM profiles WHERE role IN ('ts','owner','manager')));
CREATE POLICY "delete_med_items" ON medication_items FOR DELETE USING (auth.uid() IN (SELECT id FROM profiles WHERE role IN ('ts','owner','manager')));

CREATE POLICY "view_med_logs"   ON medication_logs FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "create_med_logs" ON medication_logs FOR INSERT WITH CHECK (auth.uid() IN (SELECT id FROM profiles WHERE role IN ('operator','ts','owner','manager')));
CREATE POLICY "update_med_logs" ON medication_logs FOR UPDATE USING (input_by = auth.uid() OR auth.uid() IN (SELECT id FROM profiles WHERE role IN ('owner','manager')));

-- 7. Helper functions
CREATE OR REPLACE FUNCTION get_medication_schedule_today(p_kandang_id TEXT, p_tanggal DATE DEFAULT CURRENT_DATE)
RETURNS TABLE (item_id UUID, program_id UUID, nama_program VARCHAR, medication_type VARCHAR, nama_produk VARCHAR, dosis NUMERIC, satuan VARCHAR, cara_pemberian VARCHAR, hari_ke INT, log_status VARCHAR, log_id UUID) AS $$
DECLARE v_hari_ke INT;
BEGIN
  SELECT COALESCE((p_tanggal - DATE(k.created_at))::INT + 1, 1) INTO v_hari_ke FROM kandangs k WHERE k.id = p_kandang_id;
  RETURN QUERY
  SELECT mi.id, mp.id, mp.nama_program, mi.medication_type, mi.nama_produk, mi.dosis, mi.satuan, mi.cara_pemberian, v_hari_ke, COALESCE(ml.status, 'scheduled'), ml.id
  FROM medication_items mi
  JOIN medication_programs mp ON mp.id = mi.program_id
  LEFT JOIN medication_logs ml ON ml.item_id = mi.id AND ml.tanggal = p_tanggal
  WHERE mi.kandang_id = p_kandang_id AND mp.is_active = true AND mi.hari_pemberian @> to_jsonb(v_hari_ke)
  ORDER BY mi.urutan, mi.medication_type;
END; $$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_medication_compliance(p_kandang_id TEXT, p_program_id UUID DEFAULT NULL)
RETURNS TABLE (total_scheduled BIGINT, total_completed BIGINT, total_skipped BIGINT, compliance_rate NUMERIC) AS $$
BEGIN
  RETURN QUERY
  SELECT COUNT(*)::BIGINT, COUNT(*) FILTER (WHERE ml.status='completed')::BIGINT, COUNT(*) FILTER (WHERE ml.status='skipped')::BIGINT,
    CASE WHEN COUNT(*) > 0 THEN ROUND(COUNT(*) FILTER (WHERE ml.status='completed')::NUMERIC / COUNT(*)::NUMERIC * 100, 1) ELSE 0 END
  FROM medication_logs ml JOIN medication_items mi ON mi.id = ml.item_id
  WHERE mi.kandang_id = p_kandang_id AND (p_program_id IS NULL OR mi.program_id = p_program_id);
END; $$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Health permissions
INSERT INTO permissions (code, name, category) VALUES
  ('health.view','Lihat Program Kesehatan','health'),('health.create','Buat Program Kesehatan','health'),
  ('health.edit','Edit Program Kesehatan','health'),('health.delete','Hapus Program Kesehatan','health'),
  ('health.log','Catat Pemberian Obat','health')
ON CONFLICT (code) DO NOTHING;

INSERT INTO role_permissions (role, permission_id) SELECT 'ts',       id FROM permissions WHERE code IN ('health.view','health.create','health.edit','health.delete','health.log') ON CONFLICT DO NOTHING;
INSERT INTO role_permissions (role, permission_id) SELECT 'owner',    id FROM permissions WHERE code IN ('health.view','health.create','health.edit','health.delete','health.log') ON CONFLICT DO NOTHING;
INSERT INTO role_permissions (role, permission_id) SELECT 'manager',  id FROM permissions WHERE code IN ('health.view','health.create','health.edit','health.delete','health.log') ON CONFLICT DO NOTHING;
INSERT INTO role_permissions (role, permission_id) SELECT 'operator', id FROM permissions WHERE code IN ('health.view','health.log') ON CONFLICT DO NOTHING;
INSERT INTO role_permissions (role, permission_id) SELECT 'staff',    id FROM permissions WHERE code IN ('health.view') ON CONFLICT DO NOTHING;
INSERT INTO role_permissions (role, permission_id) SELECT 'viewer',   id FROM permissions WHERE code IN ('health.view') ON CONFLICT DO NOTHING;
