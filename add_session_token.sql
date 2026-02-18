-- Add session_token column to profiles table for single-session enforcement
-- Run this SQL in your Supabase SQL Editor

ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS session_token TEXT;

-- Optional: Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_session_token 
ON profiles(session_token);
