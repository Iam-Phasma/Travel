-- ============================================
-- RPC Function: get_all_users_with_emails
-- ============================================
-- This function retrieves all users with their emails from auth.users
-- and combines them with their roles from the profiles table.
-- Only accessible by super users.
--
-- WHY THIS IS NEEDED:
-- - Emails are stored in auth.users (Supabase's authentication table)
-- - Roles are stored in profiles (your custom table)
-- - We need to join them together to display user emails with their roles
-- - Client-side code cannot access auth.users directly for security reasons

CREATE OR REPLACE FUNCTION get_all_users_with_emails()
RETURNS TABLE (
    id UUID,
    email TEXT,
    role TEXT,
    access_enabled BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER -- This allows the function to access auth.users
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
    
    -- Return all users with their emails and roles
    -- Joins auth.users (for email) with profiles (for role and access_enabled)
    RETURN QUERY
    SELECT 
        au.id::UUID,
        au.email::TEXT,
        COALESCE(p.role, 'user')::TEXT as role,
        COALESCE(p.access_enabled, true)::BOOLEAN as access_enabled
    FROM auth.users au
    LEFT JOIN profiles p ON p.id = au.id
    ORDER BY au.email;
    
END;
$$;

-- Grant execute permission to authenticated users
-- (The function itself checks if they're super users)
GRANT EXECUTE ON FUNCTION get_all_users_with_emails() TO authenticated;

COMMENT ON FUNCTION get_all_users_with_emails IS 'Returns all users with emails from auth.users and roles from profiles. Only accessible by super users.';
