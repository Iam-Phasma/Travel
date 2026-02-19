-- ============================================
-- Update RLS Policies for Super User Role
-- ============================================
-- This updates existing policies to allow 'super' users the same permissions as 'admin' users
-- Run this in your Supabase SQL Editor

-- ============================================
-- UPDATE EMPLOYEE_LIST POLICIES
-- ============================================

-- Drop the old policy
DROP POLICY IF EXISTS "Allow admin users to manage employee list" ON employee_list;

-- Recreate policy to allow both admin and super users
CREATE POLICY "Allow admin and super users to manage employee list"
ON employee_list
FOR ALL
TO authenticated
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

-- ============================================
-- UPDATE PROFILES TABLE POLICIES (if exists)
-- ============================================

-- Allow super users to read all profiles (needed for user management)
CREATE POLICY IF NOT EXISTS "Allow super users to read all profiles"
ON profiles
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM profiles p
        WHERE p.id = auth.uid()
        AND p.role = 'super'
    )
);

-- Note: Role changes are handled by the change_user_role RPC function
-- which has its own security checks built-in (SECURITY DEFINER)

-- ============================================
-- VERIFY POLICIES
-- ============================================

-- Query to view all policies on employee_list table
-- SELECT * FROM pg_policies WHERE tablename = 'employee_list';

-- Query to view all policies on profiles table
-- SELECT * FROM pg_policies WHERE tablename = 'profiles';
