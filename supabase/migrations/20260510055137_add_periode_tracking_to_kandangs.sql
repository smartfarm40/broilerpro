-- Add periode tracking columns
ALTER TABLE kandangs 
ADD COLUMN tanggal_chick_in DATE,
ADD COLUMN tanggal_target_panen DATE;

-- Add comments
COMMENT ON COLUMN kandangs.tanggal_chick_in IS 'Tanggal DOC masuk kandang';
COMMENT ON COLUMN kandangs.tanggal_target_panen IS 'Target tanggal panen';
