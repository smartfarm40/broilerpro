-- =====================================================
-- FIX PROFILES DELETE MEMBER
-- Issue: Owner cannot delete members
-- Solution: Add DELETE policy and missing columns
-- =====================================================

-- 1. Add missing columns to profiles table
ALTER TABLE profiles 
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS tenant_id UUID;

-- Create index for tenant_id
CREATE INDEX IF NOT EXISTS idx_profiles_tenant_id ON profiles(tenant_id);

-- 2. Update existing profiles to set email from auth.users
UPDATE profiles p
SET email = u.email
FROM auth.users u
WHERE p.id = u.id
  AND p.email IS NULL;

-- 3. For now, set tenant_id to the first owner's id (temporary solution)
UPDATE profiles
SET tenant_id = (
  SELECT id FROM profiles 
  WHERE role = 'owner' 
  LIMIT 1
)
WHERE tenant_id IS NULL;

-- 4. Add DELETE policy for profiles table
-- Only owner and manager can delete other profiles
DROP POLICY IF EXISTS "profiles_delete_by_owner_manager" ON profiles;

CREATE POLICY "profiles_delete_by_owner_manager" ON profiles
  FOR DELETE
  TO authenticated
  USING (
    -- Owner and Manager can delete any profile
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('owner', 'manager')
    )
    -- But cannot delete themselves (prevent accidental self-deletion)
    AND id != auth.uid()
  );

-- 5. Update foreign key constraints to use ON DELETE SET NULL
-- This allows deleting profiles without deleting related records

ALTER TABLE period_targets 
  DROP CONSTRAINT IF EXISTS period_targets_created_by_fkey,
  ADD CONSTRAINT period_targets_created_by_fkey 
    FOREIGN KEY (created_by) 
    REFERENCES profiles(id) 
    ON DELETE SET NULL;

ALTER TABLE medication_programs 
  DROP CONSTRAINT IF EXISTS medication_programs_created_by_fkey,
  ADD CONSTRAINT medication_programs_created_by_fkey 
    FOREIGN KEY (created_by) 
    REFERENCES profiles(id) 
    ON DELETE SET NULL;

ALTER TABLE medication_logs 
  DROP CONSTRAINT IF EXISTS medication_logs_input_by_fkey,
  ADD CONSTRAINT medication_logs_input_by_fkey 
    FOREIGN KEY (input_by) 
    REFERENCES profiles(id) 
    ON DELETE SET NULL;

ALTER TABLE deliveries 
  DROP CONSTRAINT IF EXISTS deliveries_input_by_fkey,
  ADD CONSTRAINT deliveries_input_by_fkey 
    FOREIGN KEY (input_by) 
    REFERENCES profiles(id) 
    ON DELETE SET NULL;

ALTER TABLE production_costs 
  DROP CONSTRAINT IF EXISTS production_costs_input_by_fkey,
  ADD CONSTRAINT production_costs_input_by_fkey 
    FOREIGN KEY (input_by) 
    REFERENCES profiles(id) 
    ON DELETE SET NULL;

-- 6. Verify policies
SELECT 
  schemaname,
  tablename,
  policyname,
  cmd
FROM pg_policies
WHERE tablename = 'profiles'
ORDER BY cmd, policyname;
