-- Create panen (harvest) table
CREATE TABLE panen (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kandang_id TEXT NOT NULL REFERENCES kandangs(id),
  tanggal_panen DATE NOT NULL,
  hari_ke INTEGER NOT NULL,
  
  -- Jumlah ayam
  jumlah_ekor INTEGER NOT NULL DEFAULT 0,
  berat_total_kg NUMERIC(10,2) NOT NULL DEFAULT 0,
  berat_rata_rata NUMERIC(10,2) GENERATED ALWAYS AS (
    CASE 
      WHEN jumlah_ekor > 0 THEN berat_total_kg / jumlah_ekor 
      ELSE 0 
    END
  ) STORED,
  
  -- Harga
  harga_per_kg NUMERIC(10,2) NOT NULL DEFAULT 0,
  total_pendapatan NUMERIC(15,2) GENERATED ALWAYS AS (berat_total_kg * harga_per_kg) STORED,
  
  -- Pembeli & logistik
  pembeli TEXT DEFAULT '',
  kendaraan TEXT DEFAULT '',
  penimbang TEXT DEFAULT '',
  
  -- Kualitas
  grade VARCHAR(10) DEFAULT 'A',
  catatan TEXT DEFAULT '',
  
  -- Metadata
  input_oleh TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Add indexes
CREATE INDEX idx_panen_kandang_id ON panen(kandang_id);
CREATE INDEX idx_panen_tanggal ON panen(tanggal_panen);

-- Enable RLS
ALTER TABLE panen ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY panen_select_authenticated 
  ON panen FOR SELECT 
  TO authenticated 
  USING (true);

CREATE POLICY panen_write_authenticated 
  ON panen FOR ALL 
  TO authenticated 
  USING (true) 
  WITH CHECK (true);

-- Add comment
COMMENT ON TABLE panen IS 'Data panen/harvest ayam broiler';
