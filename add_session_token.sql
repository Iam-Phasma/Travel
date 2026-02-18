-- Add session_token column to profiles table for single-session enforcement
-- Run this SQL in your Supabase SQL Editor

-- Step 1: Add the column
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS session_token TEXT DEFAULT NULL;

-- Step 2: Allow users to update their own session_token
-- Create or replace the policy to allow users to update their own session token
DROP POLICY IF EXISTS allow_user_update_session_token ON profiles;
CREATE POLICY allow_user_update_session_token ON profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Step 3: Optional - Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_session_token 
ON profiles(session_token) WHERE session_token IS NOT NULL;
