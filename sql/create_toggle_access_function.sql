-- ============================================
-- RPC Function: toggle_user_access
-- ============================================
-- This function allows ONLY super users to enable/disable user access.
-- CRITICAL SECURITY: Server-side validation ensures only 'super' role can execute this.

CREATE OR REPLACE FUNCTION toggle_user_access(
    target_user_id UUID,
    new_access_enabled BOOLEAN
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    calling_user_id UUID;
    calling_user_role TEXT;
    target_user_role TEXT;
    super_user_count INTEGER;
    result JSON;
BEGIN
    -- Get the ID of the user making this request
    calling_user_id := auth.uid();
    
    -- Security Check 1: Ensure user is authenticated
    IF calling_user_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required'
            USING HINT = 'You must be logged in to perform this action';
    END IF;
    
    -- Security Check 2: Get the calling user's role from the database
    SELECT role INTO calling_user_role
    FROM profiles
    WHERE id = calling_user_id;
    
    -- Security Check 3: Only 'super' users can toggle access
    IF calling_user_role != 'super' THEN
        RAISE EXCEPTION 'Permission denied'
            USING HINT = 'Only super users can enable/disable user access';
    END IF;
    
    -- Get the target user's role
    SELECT role INTO target_user_role
    FROM profiles
    WHERE id = target_user_id;
    
    -- Security Check 4: Prevent the last super user from disabling themselves
    IF target_user_id = calling_user_id AND new_access_enabled = false THEN
        -- If the user is a super user, check how many super users exist
        IF target_user_role = 'super' THEN
            -- Count total super users with access enabled
            SELECT COUNT(*) INTO super_user_count
            FROM profiles
            WHERE role = 'super' AND access_enabled = true;
            
            -- If this is the only super user, prevent the change
            IF super_user_count <= 1 THEN
                RAISE EXCEPTION 'Cannot disable your access'
                    USING HINT = 'You are the last super user. There must be at least one super user with access.';
            END IF;
        ELSE
            -- For non-super users, still prevent self-disable
            RAISE EXCEPTION 'Cannot disable your own access'
                USING HINT = 'You cannot disable access for your own account';
        END IF;
    END IF;
    
    -- Validation: Ensure target user exists
    IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = target_user_id) THEN
        RAISE EXCEPTION 'User not found'
            USING HINT = 'The specified user does not exist';
    END IF;
    
    -- Perform the access toggle
    UPDATE profiles
    SET access_enabled = new_access_enabled
    WHERE id = target_user_id;
    
    -- Return success response
    result := json_build_object(
        'success', true,
        'message', 'Access updated successfully',
        'access_enabled', new_access_enabled
    );
    
    RETURN result;
    
EXCEPTION
    WHEN OTHERS THEN
        -- Log error and re-raise with details
        RAISE EXCEPTION 'Failed to toggle user access: %', SQLERRM;
END;
$$;

-- Grant execute permission to authenticated users
-- (The function itself will check if they're super users)
GRANT EXECUTE ON FUNCTION toggle_user_access(UUID, BOOLEAN) TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION toggle_user_access IS 'Allows super users to enable/disable user access. Validates permissions server-side.';
