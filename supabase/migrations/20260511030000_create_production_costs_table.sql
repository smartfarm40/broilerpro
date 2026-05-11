-- =====================================================
-- MIGRATION: Create Production Costs Table + Permissions
-- Sprint 6: Cost Produksi (Staff/Owner/Manager only)
-- Date: 2026-05-11
-- =====================================================

CREATE TABLE IF NOT EXISTS production_costs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kandang_id  TEXT NOT NULL REFERENCES kandangs(id) ON DELETE CASCADE,
  input_by    UUID REFERENCES profiles(id),
  periode_mulai   DATE NOT NULL,
  periode_selesai DATE,
  nama_batch      VARCHAR(100),
  cost_pakan    NUMERIC DEFAULT 0, cost_obat     NUMERIC DEFAULT 0,
  cost_vitamin  NUMERIC DEFAULT 0, cost_vaksin   NUMERIC DEFAULT 0,
  cost_supplies NUMERIC DEFAULT 0, cost_listrik  NUMERIC DEFAULT 0,
  cost_gas      NUMERIC DEFAULT 0, cost_tenaga_kerja NUMERIC DEFAULT 0,
  cost_doc      NUMERIC DEFAULT 0, cost_lainnya  NUMERIC DEFAULT 0,
  total_cost NUMERIC GENERATED ALWAYS AS (
    COALESCE(cost_pakan,0)+COALESCE(cost_obat,0)+COALESCE(cost_vitamin,0)+
    COALESCE(cost_vaksin,0)+COALESCE(cost_supplies,0)+COALESCE(cost_listrik,0)+
    COALESCE(cost_gas,0)+COALESCE(cost_tenaga_kerja,0)+COALESCE(cost_doc,0)+COALESCE(cost_lainnya,0)
  ) STORED,
  total_panen_ekor  INT     DEFAULT 0,
  total_panen_kg    NUMERIC DEFAULT 0,
  harga_jual_per_kg NUMERIC DEFAULT 0,
  revenue NUMERIC GENERATED ALWAYS AS (COALESCE(total_panen_kg,0)*COALESCE(harga_jual_per_kg,0)) STORED,
  catatan    TEXT,
  is_final   BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_prod_costs_kandang ON production_costs(kandang_id);
CREATE INDEX IF NOT EXISTS idx_prod_costs_periode ON production_costs(periode_mulai);

CREATE OR REPLACE FUNCTION update_production_costs_updated_at()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$ LANGUAGE plpgsql;

CREATE TRIGGER trg_production_costs_updated_at
  BEFORE UPDATE ON production_costs FOR EACH ROW EXECUTE FUNCTION update_production_costs_updated_at();

ALTER TABLE production_costs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "view_prod_costs"   ON production_costs FOR SELECT USING (auth.uid() IN (SELECT id FROM profiles WHERE role IN ('staff','owner','manager')));
CREATE POLICY "create_prod_costs" ON production_costs FOR INSERT WITH CHECK (auth.uid() IN (SELECT id FROM profiles WHERE role IN ('staff','owner','manager')));
CREATE POLICY "update_prod_costs" ON production_costs FOR UPDATE USING (NOT is_final AND auth.uid() IN (SELECT id FROM profiles WHERE role IN ('staff','owner','manager')));
CREATE POLICY "delete_prod_costs" ON production_costs FOR DELETE USING (auth.uid() IN (SELECT id FROM profiles WHERE role IN ('owner','manager')));

CREATE OR REPLACE FUNCTION calculate_cost_from_deliveries(p_kandang_id TEXT, p_start_date DATE, p_end_date DATE)
RETURNS TABLE (delivery_type VARCHAR, total_cost NUMERIC) AS $$
BEGIN
  RETURN QUERY SELECT d.delivery_type, SUM(d.total_harga) FROM deliveries d
  WHERE d.kandang_id = p_kandang_id AND d.tanggal_kirim BETWEEN p_start_date AND p_end_date AND d.status = 'received'
  GROUP BY d.delivery_type;
END; $$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_profit_loss_summary(p_kandang_id TEXT DEFAULT NULL)
RETURNS TABLE (kandang_id TEXT, nama_batch VARCHAR, periode_mulai DATE, total_cost NUMERIC, revenue NUMERIC, profit NUMERIC, margin_pct NUMERIC, cost_per_kg NUMERIC) AS $$
BEGIN
  RETURN QUERY SELECT pc.kandang_id, pc.nama_batch, pc.periode_mulai, pc.total_cost, pc.revenue,
    (pc.revenue - pc.total_cost),
    CASE WHEN pc.revenue > 0 THEN ROUND((pc.revenue-pc.total_cost)/pc.revenue*100,1) ELSE 0 END,
    CASE WHEN pc.total_panen_kg > 0 THEN ROUND(pc.total_cost/pc.total_panen_kg,0) ELSE 0 END
  FROM production_costs pc WHERE (p_kandang_id IS NULL OR pc.kandang_id = p_kandang_id) AND pc.is_final = true
  ORDER BY pc.periode_mulai DESC;
END; $$ LANGUAGE plpgsql SECURITY DEFINER;

INSERT INTO permissions (code, name, category) VALUES
  ('cost.view','Lihat Cost Produksi','cost'),('cost.create','Buat Cost Produksi','cost'),
  ('cost.edit','Edit Cost Produksi','cost'),('cost.delete','Hapus Cost Produksi','cost'),
  ('cost.finalize','Finalisasi Cost','cost')
ON CONFLICT (code) DO NOTHING;

INSERT INTO role_permissions (role, permission_id) SELECT 'staff',   id FROM permissions WHERE code IN ('cost.view','cost.create','cost.edit','cost.delete','cost.finalize') ON CONFLICT DO NOTHING;
INSERT INTO role_permissions (role, permission_id) SELECT 'owner',   id FROM permissions WHERE code IN ('cost.view','cost.create','cost.edit','cost.delete','cost.finalize') ON CONFLICT DO NOTHING;
INSERT INTO role_permissions (role, permission_id) SELECT 'manager', id FROM permissions WHERE code IN ('cost.view','cost.create','cost.edit','cost.delete','cost.finalize') ON CONFLICT DO NOTHING;
-- TS, Operator, Viewer: TIDAK dapat akses cost (sesuai requirement)
