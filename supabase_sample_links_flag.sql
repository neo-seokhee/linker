-- Sample Links Flag Migration
-- Run this in Supabase Dashboard > SQL Editor
-- This flag ensures sample links are only added once per user

-- Add sample_links_added flag to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS sample_links_added BOOLEAN DEFAULT FALSE;

-- Set flag to TRUE for all existing users (they already have or had links)
-- This prevents existing users from getting sample links again
UPDATE profiles SET sample_links_added = TRUE WHERE sample_links_added = FALSE;
