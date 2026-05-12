-- =====================================================
-- RESET DATA FOR PRODUCTION USE
-- =====================================================
-- PERINGATAN: Script ini akan menghapus SEMUA data transaksional
-- Tapi tetap mempertahankan:
-- - Struktur tabel
-- - RLS policies
-- - Permissions & role_permissions
-- - Reference data (growth_targets, feed_targets, harga_referensi)
-- =====================================================

-- BACKUP DULU SEBELUM MENJALANKAN!
-- Jalankan script ini HANYA jika Anda yakin ingin reset semua data

-- 1. Hapus semua data transaksional
TRUNCATE TABLE 
  production_costs,
  deliveries,
  medication_logs,
  medication_items,
  medication_programs,
  period_targets,
  ts_visits,
  data_harian,
  target_periode,
  keuangan_kandang,
  stock_pakan,
  penyakit,
  vaksinasi,
  notifikasi
CASCADE;

-- 2. Hapus profiles (kecuali owner pertama)
-- Simpan owner pertama untuk bisa login
DELETE FROM profiles 
WHERE role != 'owner' 
   OR id NOT IN (
     SELECT id FROM profiles 
     WHERE role = 'owner' 
     ORDER BY created_at ASC 
     LIMIT 1
   );

-- 3. Hapus kandangs (semua kandang akan dihapus)
TRUNCATE TABLE kandangs CASCADE;

-- 4. Hapus users lama (kecuali yang masih ada di profiles)
DELETE FROM users 
WHERE id NOT IN (SELECT id FROM profiles);

-- 5. Verifikasi data yang tersisa
SELECT 'kandangs' as table_name, COUNT(*) as row_count FROM kandangs
UNION ALL
SELECT 'profiles', COUNT(*) FROM profiles
UNION ALL
SELECT 'users', COUNT(*) FROM users
UNION ALL
SELECT 'data_harian', COUNT(*) FROM data_harian
UNION ALL
SELECT 'ts_visits', COUNT(*) FROM ts_visits
UNION ALL
SELECT 'period_targets', COUNT(*) FROM period_targets
UNION ALL
SELECT 'medication_programs', COUNT(*) FROM medication_programs
UNION ALL
SELECT 'deliveries', COUNT(*) FROM deliveries
UNION ALL
SELECT 'production_costs', COUNT(*) FROM production_costs
ORDER BY table_name;

-- 6. Tampilkan owner yang tersisa
SELECT 
  id,
  nama,
  email,
  role,
  created_at
FROM profiles
WHERE role = 'owner'
ORDER BY created_at ASC;

