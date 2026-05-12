-- =====================================================
-- FIX TS_VISITS RLS POLICIES
-- Issue: Old policies referenced 'users' table instead of 'profiles'
-- Solution: Simplified policies that work with current schema
-- =====================================================

-- Drop old policies that reference non-existent users table
DROP POLICY IF EXISTS "TS can create visits" ON ts_visits;
DROP POLICY IF EXISTS "TS can update their visits" ON ts_visits;
DROP POLICY IF EXISTS "TS/Owner/Manager can delete visits" ON ts_visits;
DROP POLICY IF EXISTS "Owner/Manager can view all visits" ON ts_visits;
DROP POLICY IF EXISTS "TS can view their visits" ON ts_visits;
DROP POLICY IF EXISTS "Staff can view all visits" ON ts_visits;
DROP POLICY IF EXISTS "Operator can view visits for their kandang" ON ts_visits;
DROP POLICY IF EXISTS "Viewer can view all visits" ON ts_visits;

-- Create new simplified policies using profiles table
-- Policy: SELECT - All authenticated users can view visits
CREATE POLICY "ts_visits_select" ON ts_visits
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy: INSERT - All authenticated users can create visits
CREATE POLICY "ts_visits_insert" ON ts_visits
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Policy: UPDATE - All authenticated users can update visits
CREATE POLICY "ts_visits_update" ON ts_visits
  FOR UPDATE
  TO authenticated
  USING (true);

-- Policy: DELETE - Owner, Manager can delete visits
CREATE POLICY "ts_visits_delete" ON ts_visits
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('owner', 'manager')
    )
  );

-- Verify policies
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE tablename = 'ts_visits'
ORDER BY policyname;
