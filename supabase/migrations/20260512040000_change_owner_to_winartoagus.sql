-- =====================================================
-- CHANGE OWNER TO winartoagus5757@gmail.com
-- Remove barotech26@gmail.com (administrator, not shown in app)
-- =====================================================

-- 1. Delete barotech26@gmail.com from profiles
DELETE FROM profiles WHERE email = 'barotech26@gmail.com';

-- 2. Delete barotech26@gmail.com from users table
DELETE FROM users WHERE id IN (
  SELECT id::text FROM auth.users WHERE email = 'barotech26@gmail.com'
);

-- 3. Create profile for winartoagus5757@gmail.com as owner
INSERT INTO profiles (id, nama, email, role, created_at, updated_at, tenant_id)
SELECT 
  id,
  COALESCE(raw_user_meta_data->>'nama', 'Agus Winarto') as nama,
  email,
  'owner' as role,
  created_at,
  NOW() as updated_at,
  id as tenant_id
FROM auth.users
WHERE email = 'winartoagus5757@gmail.com'
ON CONFLICT (id) DO UPDATE
SET 
  nama = EXCLUDED.nama,
  email = EXCLUDED.email,
  role = 'owner',
  tenant_id = EXCLUDED.tenant_id;

-- 4. Verify
SELECT 
  '=== OWNER AKTIF ===' as info,
  id,
  nama,
  email,
  role,
  created_at
FROM profiles
WHERE role = 'owner';
