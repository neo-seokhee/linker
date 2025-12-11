-- Admin RLS bypass for link management
-- Run this in Supabase Dashboard > SQL Editor

-- Create a function to check if current user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    -- Check if user has admin role or email matches admin list
    -- For now, we'll use a simple email-based check
    -- You can customize this based on your needs
    RETURN (
        auth.jwt() ->> 'email' IN (
            'neo@example.com',  -- Add admin emails here
            'admin@linker.app'
        )
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Alternative: Create admin users table
CREATE TABLE IF NOT EXISTS admin_users (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- RLS for admin_users - only admins can see
CREATE POLICY "Only admins can view admin_users"
ON admin_users FOR SELECT USING (auth.uid() = user_id);

-- Create better is_admin function using table
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM admin_users WHERE user_id = auth.uid()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update links RLS to allow admin operations
DROP POLICY IF EXISTS "Admins can manage all links" ON links;
CREATE POLICY "Admins can manage all links"
ON links FOR ALL USING (is_admin());

-- Or simpler approach: allow delete on own links only
DROP POLICY IF EXISTS "Users can delete own links" ON links;
CREATE POLICY "Users can delete own links"
ON links FOR DELETE USING (auth.uid() = user_id);

-- Allow admins to update any link
DROP POLICY IF EXISTS "Users can update own links" ON links;
CREATE POLICY "Users can update own links"
ON links FOR UPDATE USING (auth.uid() = user_id OR is_admin());

-- Add yourself as admin (replace with your user ID from auth.users)
-- INSERT INTO admin_users (user_id) VALUES ('your-user-id-here');
