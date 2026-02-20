-- Ensure `super` users have the same CRUD rights as `admin` on travel_authorities
-- Run this in Supabase SQL editor (or include in your migration pipeline)

-- NOTE: INSERT policies only accept a WITH CHECK expression (no USING clause allowed)

ALTER POLICY IF EXISTS "Insert" ON public.travel_authorities
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin','super')
    )
  );

ALTER POLICY IF EXISTS "Update" ON public.travel_authorities
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin','super')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin','super')
    )
  );

ALTER POLICY IF EXISTS "Delete" ON public.travel_authorities
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin','super')
    )
  );

-- Verification:
-- SELECT policyname, roles, qual, with_check FROM pg_policies WHERE tablename = 'travel_authorities';
