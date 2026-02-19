-- ============================================
-- Add last_seen Column to Profiles Table
-- ============================================
-- This column tracks when users were last active for online/offline status

-- Add last_seen column if it doesn't exist
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
        
        RAISE NOTICE 'Added last_seen column to profiles table';
    ELSE
        RAISE NOTICE 'Column last_seen already exists';
    END IF;
END $$;

COMMENT ON COLUMN profiles.last_seen IS 'Timestamp of when the user was last active. Used for online/offline status.';
