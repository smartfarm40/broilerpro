-- =====================================================
-- MIGRATION: Create Deliveries Table + Permissions
-- Sprint 5: Manajemen Pengiriman (Staff Kantor)
-- Date: 2026-05-11
-- =====================================================

CREATE TABLE IF NOT EXISTS deliveries (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kandang_id  TEXT NOT NULL REFERENCES kandangs(id) ON DELETE CASCADE,
  input_by    UUID REFERENCES profiles(id),
  delivery_type  VARCHAR(20) NOT NULL CHECK (delivery_type IN ('pakan','obat','vitamin','vaksin','supplies','lainnya')),
  item_name      VARCHAR(100) NOT NULL,
  jumlah         NUMERIC NOT NULL CHECK (jumlah > 0),
  satuan         VARCHAR(30) NOT NULL,
  harga_satuan   NUMERIC DEFAULT 0,
  total_harga    NUMERIC GENERATED ALWAYS AS (jumlah * harga_satuan) STORED,
  supplier       VARCHAR(100),
  no_invoice     VARCHAR(50),
  tanggal_kirim  DATE NOT NULL,
  tanggal_terima DATE,
  status  VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','delivered','received','cancelled')),
  catatan    TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_deliveries_kandang     ON deliveries(kandang_id);
CREATE INDEX IF NOT EXISTS idx_deliveries_type        ON deliveries(delivery_type);
CREATE INDEX IF NOT EXISTS idx_deliveries_status      ON deliveries(status);
CREATE INDEX IF NOT EXISTS idx_deliveries_kandang_tgl ON deliveries(kandang_id, tanggal_kirim);

CREATE OR REPLACE FUNCTION update_deliveries_updated_at()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$ LANGUAGE plpgsql;

CREATE TRIGGER trg_deliveries_updated_at
  BEFORE UPDATE ON deliveries FOR EACH ROW EXECUTE FUNCTION update_deliveries_updated_at();

ALTER TABLE deliveries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "view_deliveries"   ON deliveries FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "create_deliveries" ON deliveries FOR INSERT WITH CHECK (auth.uid() IN (SELECT id FROM profiles WHERE role IN ('staff','owner','manager')));
CREATE POLICY "update_deliveries" ON deliveries FOR UPDATE USING (auth.uid() IN (SELECT id FROM profiles WHERE role IN ('staff','owner','manager')));
CREATE POLICY "delete_deliveries" ON deliveries FOR DELETE USING (input_by = auth.uid() OR auth.uid() IN (SELECT id FROM profiles WHERE role IN ('owner','manager')));

CREATE OR REPLACE FUNCTION get_delivery_summary(p_kandang_id TEXT, p_start_date DATE DEFAULT NULL, p_end_date DATE DEFAULT NULL)
RETURNS TABLE (delivery_type VARCHAR, total_item BIGINT, total_jumlah NUMERIC, total_harga NUMERIC, pending_count BIGINT, received_count BIGINT) AS $$
DECLARE v_start DATE := COALESCE(p_start_date, DATE_TRUNC('month', CURRENT_DATE)::DATE); v_end DATE := COALESCE(p_end_date, CURRENT_DATE);
BEGIN
  RETURN QUERY
  SELECT d.delivery_type, COUNT(*)::BIGINT, SUM(d.jumlah), SUM(d.total_harga),
    COUNT(*) FILTER (WHERE d.status='pending')::BIGINT, COUNT(*) FILTER (WHERE d.status='received')::BIGINT
  FROM deliveries d WHERE d.kandang_id = p_kandang_id AND d.tanggal_kirim BETWEEN v_start AND v_end AND d.status != 'cancelled'
  GROUP BY d.delivery_type ORDER BY SUM(d.total_harga) DESC;
END; $$ LANGUAGE plpgsql SECURITY DEFINER;

INSERT INTO permissions (code, name, category) VALUES
  ('delivery.view','Lihat Pengiriman','delivery'),('delivery.create','Input Pengiriman','delivery'),
  ('delivery.edit','Edit Pengiriman','delivery'),('delivery.delete','Hapus Pengiriman','delivery'),
  ('delivery.confirm','Konfirmasi Terima','delivery')
ON CONFLICT (code) DO NOTHING;

INSERT INTO role_permissions (role, permission_id) SELECT 'staff',    id FROM permissions WHERE code IN ('delivery.view','delivery.create','delivery.edit','delivery.delete','delivery.confirm') ON CONFLICT DO NOTHING;
INSERT INTO role_permissions (role, permission_id) SELECT 'owner',    id FROM permissions WHERE code IN ('delivery.view','delivery.create','delivery.edit','delivery.delete','delivery.confirm') ON CONFLICT DO NOTHING;
INSERT INTO role_permissions (role, permission_id) SELECT 'manager',  id FROM permissions WHERE code IN ('delivery.view','delivery.create','delivery.edit','delivery.delete','delivery.confirm') ON CONFLICT DO NOTHING;
INSERT INTO role_permissions (role, permission_id) SELECT 'operator', id FROM permissions WHERE code IN ('delivery.view','delivery.confirm') ON CONFLICT DO NOTHING;
INSERT INTO role_permissions (role, permission_id) SELECT 'ts',       id FROM permissions WHERE code = 'delivery.view' ON CONFLICT DO NOTHING;
INSERT INTO role_permissions (role, permission_id) SELECT 'viewer',   id FROM permissions WHERE code = 'delivery.view' ON CONFLICT DO NOTHING;
