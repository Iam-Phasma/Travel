-- ============================================
-- Update RLS Policies for Super User Role
-- table: travel_authorities
-- ============================================
-- This makes `super` users have the same CRUD rights as `admin` on travel_authorities.
-- Run this in your Supabase SQL editor or include it in your migration pipeline.

-- DROP existing policies (if they exist)
DROP POLICY IF EXISTS "Delete" ON public.travel_authorities;
DROP POLICY IF EXISTS "Insert" ON public.travel_authorities;
DROP POLICY IF EXISTS "Update" ON public.travel_authorities;
DROP POLICY IF EXISTS "Select" ON public.travel_authorities;

-- RECREATE DELETE policy to allow admin OR super
CREATE POLICY "Delete" ON public.travel_authorities
FOR DELETE
TO public
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'super')
  )
);

-- RECREATE INSERT policy to allow admin OR super
CREATE POLICY "Insert" ON public.travel_authorities
FOR INSERT
TO public
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'super')
  )
);

-- RECREATE UPDATE policy to allow admin OR super
CREATE POLICY "Update" ON public.travel_authorities
FOR UPDATE
TO public
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'super')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'super')
  )
);

-- Allow only admin OR super users to SELECT (so RETURNING works for those roles).
-- NOTE: SELECT policies use `USING` only — do NOT include `WITH CHECK` for SELECT.
CREATE POLICY "Select" ON public.travel_authorities
FOR SELECT
TO public
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'super')
  )
);

-- Verification helpers (run in Supabase SQL editor):
-- SELECT * FROM pg_policies WHERE tablename = 'travel_authorities';
-- SELECT id, role FROM profiles WHERE role IN ('super','admin');
