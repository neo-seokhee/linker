-- IMPORTANT: Run this if you haven't already!
-- This updates RLS policies for user-specific data access

-- Add user_id column to links table
ALTER TABLE links ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Add user_id column to categories table  
ALTER TABLE categories ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Create index for faster queries by user
CREATE INDEX IF NOT EXISTS idx_links_user_id ON links(user_id);
CREATE INDEX IF NOT EXISTS idx_categories_user_id ON categories(user_id);

-- First, drop all existing policies
DROP POLICY IF EXISTS "Allow public read links" ON links;
DROP POLICY IF EXISTS "Allow public insert links" ON links;
DROP POLICY IF EXISTS "Allow public update links" ON links;
DROP POLICY IF EXISTS "Allow public delete links" ON links;
DROP POLICY IF EXISTS "Users can read own links" ON links;
DROP POLICY IF EXISTS "Users can insert own links" ON links;
DROP POLICY IF EXISTS "Users can update own links" ON links;
DROP POLICY IF EXISTS "Users can delete own links" ON links;

DROP POLICY IF EXISTS "Allow public read categories" ON categories;
DROP POLICY IF EXISTS "Allow public insert categories" ON categories;
DROP POLICY IF EXISTS "Allow public update categories" ON categories;
DROP POLICY IF EXISTS "Allow public delete categories" ON categories;
DROP POLICY IF EXISTS "Users can read own categories" ON categories;
DROP POLICY IF EXISTS "Users can insert own categories" ON categories;
DROP POLICY IF EXISTS "Users can update own categories" ON categories;
DROP POLICY IF EXISTS "Users can delete own categories" ON categories;

-- New RLS policies for LINKS: Users can only access their own links
CREATE POLICY "Users can read own links" ON links 
    FOR SELECT USING (auth.uid() = user_id);
    
CREATE POLICY "Users can insert own links" ON links 
    FOR INSERT WITH CHECK (auth.uid() = user_id);
    
CREATE POLICY "Users can update own links" ON links 
    FOR UPDATE USING (auth.uid() = user_id);
    
CREATE POLICY "Users can delete own links" ON links 
    FOR DELETE USING (auth.uid() = user_id);

-- New RLS policies for CATEGORIES: Users can read default categories + their own
CREATE POLICY "Users can read categories" ON categories 
    FOR SELECT USING (is_default = TRUE OR auth.uid() = user_id);
    
CREATE POLICY "Users can insert own categories" ON categories 
    FOR INSERT WITH CHECK (auth.uid() = user_id);
    
CREATE POLICY "Users can update own categories" ON categories 
    FOR UPDATE USING (auth.uid() = user_id AND is_default = FALSE);
    
CREATE POLICY "Users can delete own categories" ON categories 
    FOR DELETE USING (auth.uid() = user_id AND is_default = FALSE);
