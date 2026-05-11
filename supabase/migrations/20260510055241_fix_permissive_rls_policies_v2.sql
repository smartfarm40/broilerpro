-- Fix overly permissive RLS policies
-- Create helper functions in public schema

-- Helper function to get user's kandang_id
CREATE OR REPLACE FUNCTION public.get_user_kandang_id() 
RETURNS TEXT AS $$
  SELECT kandang_id FROM public.users WHERE id = auth.uid()::text;
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- Helper function to check if user is owner or TS
CREATE OR REPLACE FUNCTION public.is_owner_or_ts() 
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid()::text 
    AND role IN ('owner', 'ts')
  );
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- 1. Fix data_harian policies
DROP POLICY IF EXISTS data_harian_update_authenticated ON data_harian;

CREATE POLICY data_harian_insert_authenticated 
  ON data_harian FOR INSERT 
  TO authenticated 
  WITH CHECK (
    public.is_owner_or_ts() OR 
    kandang_id = public.get_user_kandang_id()
  );

CREATE POLICY data_harian_update_authenticated 
  ON data_harian FOR UPDATE 
  TO authenticated 
  USING (
    public.is_owner_or_ts() OR 
    kandang_id = public.get_user_kandang_id()
  )
  WITH CHECK (
    public.is_owner_or_ts() OR 
    kandang_id = public.get_user_kandang_id()
  );

CREATE POLICY data_harian_delete_owner_only 
  ON data_harian FOR DELETE 
  TO authenticated 
  USING (public.is_owner_or_ts());

-- 2. Fix panen policies
DROP POLICY IF EXISTS panen_write_authenticated ON panen;

CREATE POLICY panen_insert_authenticated 
  ON panen FOR INSERT 
  TO authenticated 
  WITH CHECK (
    public.is_owner_or_ts() OR 
    kandang_id = public.get_user_kandang_id()
  );

CREATE POLICY panen_update_authenticated 
  ON panen FOR UPDATE 
  TO authenticated 
  USING (
    public.is_owner_or_ts() OR 
    kandang_id = public.get_user_kandang_id()
  )
  WITH CHECK (
    public.is_owner_or_ts() OR 
    kandang_id = public.get_user_kandang_id()
  );

CREATE POLICY panen_delete_owner_only 
  ON panen FOR DELETE 
  TO authenticated 
  USING (public.is_owner_or_ts());

-- 3. Fix penyakit policies
DROP POLICY IF EXISTS penyakit_write_authenticated ON penyakit;

CREATE POLICY penyakit_insert_authenticated 
  ON penyakit FOR INSERT 
  TO authenticated 
  WITH CHECK (
    public.is_owner_or_ts() OR 
    kandang_id = public.get_user_kandang_id()
  );

CREATE POLICY penyakit_update_ts_only 
  ON penyakit FOR UPDATE 
  TO authenticated 
  USING (public.is_owner_or_ts())
  WITH CHECK (public.is_owner_or_ts());

CREATE POLICY penyakit_delete_ts_only 
  ON penyakit FOR DELETE 
  TO authenticated 
  USING (public.is_owner_or_ts());

-- 4. Fix stock_pakan policies
DROP POLICY IF EXISTS stock_pakan_write_authenticated ON stock_pakan;

CREATE POLICY stock_pakan_insert_authenticated 
  ON stock_pakan FOR INSERT 
  TO authenticated 
  WITH CHECK (
    public.is_owner_or_ts() OR 
    kandang_id = public.get_user_kandang_id()
  );

CREATE POLICY stock_pakan_update_authenticated 
  ON stock_pakan FOR UPDATE 
  TO authenticated 
  USING (
    public.is_owner_or_ts() OR 
    kandang_id = public.get_user_kandang_id()
  )
  WITH CHECK (
    public.is_owner_or_ts() OR 
    kandang_id = public.get_user_kandang_id()
  );

CREATE POLICY stock_pakan_delete_owner_only 
  ON stock_pakan FOR DELETE 
  TO authenticated 
  USING (public.is_owner_or_ts());

-- 5. Fix vaksinasi policies
DROP POLICY IF EXISTS vaksinasi_write_authenticated ON vaksinasi;

CREATE POLICY vaksinasi_insert_authenticated 
  ON vaksinasi FOR INSERT 
  TO authenticated 
  WITH CHECK (
    public.is_owner_or_ts() OR 
    kandang_id = public.get_user_kandang_id()
  );

CREATE POLICY vaksinasi_update_ts_only 
  ON vaksinasi FOR UPDATE 
  TO authenticated 
  USING (public.is_owner_or_ts())
  WITH CHECK (public.is_owner_or_ts());

CREATE POLICY vaksinasi_delete_ts_only 
  ON vaksinasi FOR DELETE 
  TO authenticated 
  USING (public.is_owner_or_ts());

-- 6. Fix notifikasi policies
DROP POLICY IF EXISTS notifikasi_write_authenticated ON notifikasi;

CREATE POLICY notifikasi_insert_system 
  ON notifikasi FOR INSERT 
  TO authenticated 
  WITH CHECK (public.is_owner_or_ts());

CREATE POLICY notifikasi_update_own 
  ON notifikasi FOR UPDATE 
  TO authenticated 
  USING (user_id = auth.uid()::text)
  WITH CHECK (user_id = auth.uid()::text);

CREATE POLICY notifikasi_delete_own 
  ON notifikasi FOR DELETE 
  TO authenticated 
  USING (user_id = auth.uid()::text OR public.is_owner_or_ts());
