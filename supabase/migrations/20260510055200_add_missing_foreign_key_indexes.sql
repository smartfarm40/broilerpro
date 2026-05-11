-- Add indexes for foreign keys to improve query performance

-- keuangan_kandang
CREATE INDEX IF NOT EXISTS idx_keuangan_kandang_kandang_id ON keuangan_kandang(kandang_id);

-- notifikasi
CREATE INDEX IF NOT EXISTS idx_notifikasi_kandang_id ON notifikasi(kandang_id);
CREATE INDEX IF NOT EXISTS idx_notifikasi_user_id ON notifikasi(user_id);

-- penyakit
CREATE INDEX IF NOT EXISTS idx_penyakit_kandang_id ON penyakit(kandang_id);

-- profiles
CREATE INDEX IF NOT EXISTS idx_profiles_kandang_id ON profiles(kandang_id);

-- users
CREATE INDEX IF NOT EXISTS idx_users_kandang_id ON users(kandang_id);

-- vaksinasi
CREATE INDEX IF NOT EXISTS idx_vaksinasi_kandang_id ON vaksinasi(kandang_id);

COMMENT ON INDEX idx_keuangan_kandang_kandang_id IS 'Index untuk foreign key keuangan_kandang -> kandangs';
COMMENT ON INDEX idx_notifikasi_kandang_id IS 'Index untuk foreign key notifikasi -> kandangs';
COMMENT ON INDEX idx_notifikasi_user_id IS 'Index untuk foreign key notifikasi -> users';
COMMENT ON INDEX idx_penyakit_kandang_id IS 'Index untuk foreign key penyakit -> kandangs';
COMMENT ON INDEX idx_profiles_kandang_id IS 'Index untuk foreign key profiles -> kandangs';
COMMENT ON INDEX idx_users_kandang_id IS 'Index untuk foreign key users -> kandangs';
COMMENT ON INDEX idx_vaksinasi_kandang_id IS 'Index untuk foreign key vaksinasi -> kandangs';
