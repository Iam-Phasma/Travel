-- ============================================
-- Complete Setup for Online/Offline Status
-- ============================================
-- Run this entire script in your Supabase SQL Editor
-- This combines all necessary changes for the online status feature

-- Step 1: Add last_seen column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = 'last_seen'
    ) THEN
        ALTER TABLE profiles 
        ADD COLUMN last_seen TIMESTAMPTZ DEFAULT NOW();
        
        -- Create index for faster queries
        CREATE INDEX IF NOT EXISTS idx_profiles_last_seen ON profiles(last_seen);
        
        RAISE NOTICE '✓ Added last_seen column to profiles table';
    ELSE
        RAISE NOTICE '✓ Column last_seen already exists';
    END IF;
END $$;

-- Step 2: Create or replace the update_last_seen function
CREATE OR REPLACE FUNCTION update_last_seen()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    calling_user_id UUID;
    result JSON;
BEGIN
    -- Get the ID of the user making this request
    calling_user_id := auth.uid();
    
    -- Security Check: Ensure user is authenticated
    IF calling_user_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required';
    END IF;
    
    -- Update last_seen for the current user
    UPDATE profiles
    SET last_seen = NOW()
    WHERE id = calling_user_id;
    
    -- Return success response
    result := json_build_object(
        'success', true,
        'last_seen', NOW()
    );
    
    RETURN result;
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Failed to update last_seen: %', SQLERRM;
END;
$$;

GRANT EXECUTE ON FUNCTION update_last_seen() TO authenticated;

RAISE NOTICE '✓ Created/updated update_last_seen function';

-- Step 3: Update the get_all_users_with_emails function to include online status
CREATE OR REPLACE FUNCTION get_all_users_with_emails()
RETURNS TABLE (
    id UUID,
    email TEXT,
    role TEXT,
    access_enabled BOOLEAN,
    is_online BOOLEAN,
    last_seen TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    calling_user_role TEXT;
BEGIN
    -- Security Check: Only super users can view all users
    SELECT p.role INTO calling_user_role
    FROM profiles p
    WHERE p.id = auth.uid();
    
    IF calling_user_role != 'super' THEN
        RAISE EXCEPTION 'Permission denied: Only super users can view all users';
    END IF;
    
    -- Return all users with their emails, roles, and online status
    -- A user is considered online if they were active in the last 5 minutes
    RETURN QUERY
    SELECT 
        au.id::UUID,
        au.email::TEXT,
        COALESCE(p.role, 'user')::TEXT as role,
        COALESCE(p.access_enabled, true)::BOOLEAN as access_enabled,
        (p.last_seen IS NOT NULL AND p.last_seen > NOW() - INTERVAL '5 minutes')::BOOLEAN as is_online,
        p.last_seen::TIMESTAMPTZ
    FROM auth.users au
    LEFT JOIN profiles p ON p.id = au.id
    ORDER BY au.email;
    
END;
$$;

GRANT EXECUTE ON FUNCTION get_all_users_with_emails() TO authenticated;

RAISE NOTICE '✓ Updated get_all_users_with_emails function';

-- Step 4: Test the setup
DO $$
DECLARE
    test_result JSON;
BEGIN
    -- Test update_last_seen
    SELECT update_last_seen() INTO test_result;
    RAISE NOTICE '✓ Test: update_last_seen works!';
    
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'SETUP COMPLETE!';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'All functions are ready.';
    RAISE NOTICE 'Refresh your admin panel to see online status.';
    RAISE NOTICE '';
END $$;
