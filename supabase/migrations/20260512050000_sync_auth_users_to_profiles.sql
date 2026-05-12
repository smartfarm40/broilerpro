-- =====================================================
-- SYNC AUTH.USERS TO PROFILES
-- Auto-sync all confirmed users to profiles table
-- =====================================================

-- 1. Sync existing users from auth.users to profiles
INSERT INTO profiles (id, nama, email, role, created_at, updated_at, tenant_id)
SELECT 
  u.id,
  COALESCE(u.raw_user_meta_data->>'nama', u.email) as nama,
  u.email,
  COALESCE(u.raw_user_meta_data->>'role', 'viewer') as role,
  u.created_at,
  NOW() as updated_at,
  -- Set tenant_id to first owner's id
  (SELECT id FROM auth.users WHERE raw_user_meta_data->>'role' = 'owner' ORDER BY created_at ASC LIMIT 1) as tenant_id
FROM auth.users u
WHERE u.email != 'barotech26@gmail.com'  -- Skip administrator
  AND u.email_confirmed_at IS NOT NULL   -- Only confirmed users
ON CONFLICT (id) DO UPDATE
SET 
  nama = EXCLUDED.nama,
  email = EXCLUDED.email,
  role = EXCLUDED.role,
  tenant_id = EXCLUDED.tenant_id,
  updated_at = NOW();

-- 2. Create trigger function to auto-sync new users
CREATE OR REPLACE FUNCTION sync_auth_user_to_profile()
RETURNS TRIGGER AS $$
BEGIN
  -- Only sync if email is confirmed and not administrator
  IF NEW.email_confirmed_at IS NOT NULL AND NEW.email != 'barotech26@gmail.com' THEN
    INSERT INTO profiles (id, nama, email, role, created_at, updated_at, tenant_id)
    VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data->>'nama', NEW.email),
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'role', 'viewer'),
      NEW.created_at,
      NOW(),
      -- Set tenant_id to first owner's id
      (SELECT id FROM auth.users WHERE raw_user_meta_data->>'role' = 'owner' ORDER BY created_at ASC LIMIT 1)
    )
    ON CONFLICT (id) DO UPDATE
    SET 
      nama = EXCLUDED.nama,
      email = EXCLUDED.email,
      role = EXCLUDED.role,
      tenant_id = EXCLUDED.tenant_id,
      updated_at = NOW();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Create trigger on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT OR UPDATE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION sync_auth_user_to_profile();

-- 4. Verify sync
SELECT 
  '=== SYNC RESULT ===' as status;

SELECT 
  'auth.users (confirmed)' as tabel,
  COUNT(*) as jumlah,
  STRING_AGG(email, ', ') as emails
FROM auth.users
WHERE email_confirmed_at IS NOT NULL
  AND email != 'barotech26@gmail.com'
GROUP BY tabel
UNION ALL
SELECT 
  'profiles',
  COUNT(*),
  STRING_AGG(email, ', ')
FROM profiles
GROUP BY tabel;

-- 5. Show all profiles
SELECT 
  '=== ALL PROFILES ===' as info,
  id,
  nama,
  email,
  role,
  tenant_id,
  created_at
FROM profiles
ORDER BY 
  CASE role
    WHEN 'owner' THEN 1
    WHEN 'manager' THEN 2
    WHEN 'ts' THEN 3
    WHEN 'staff' THEN 4
    WHEN 'operator' THEN 5
    ELSE 6
  END,
  created_at;
