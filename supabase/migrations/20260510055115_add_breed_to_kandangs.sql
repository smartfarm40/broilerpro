-- Add breed column to kandangs table
ALTER TABLE kandangs 
ADD COLUMN breed VARCHAR(50) DEFAULT 'CP707';

-- Add comment
COMMENT ON COLUMN kandangs.breed IS 'Jenis/breed ayam broiler (CP707, Cobb500, Ross308, dll)';
