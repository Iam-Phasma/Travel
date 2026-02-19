-- ============================================
-- Add Access Control Column to Profiles
-- ============================================
-- This allows super users to enable/disable user access to the system
-- Even if users have valid credentials, they can't login if access is disabled

-- Step 1: Add the column
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS access_enabled BOOLEAN DEFAULT true;

-- Step 2: Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_profiles_access_enabled 
ON profiles(access_enabled);

-- Step 3: Update existing users to have access enabled (if they don't already)
UPDATE profiles 
SET access_enabled = true 
WHERE access_enabled IS NULL;

-- Step 4: Add comment for documentation
COMMENT ON COLUMN profiles.access_enabled IS 'Controls whether user can login. Only super users can modify this.';

-- Note: This column can be checked during login to prevent disabled users from accessing the system
