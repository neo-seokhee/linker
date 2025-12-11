-- Live Explore Tab Migration
-- Run this in Supabase SQL Editor

-- 1. Add public/featured columns to links table
ALTER TABLE links ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT TRUE;
ALTER TABLE links ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT FALSE;

-- 2. Create favorite_history table (for 7-day increment tracking)
CREATE TABLE IF NOT EXISTS favorite_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    link_id UUID REFERENCES links(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    favorited_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(link_id, user_id)
);

-- 3. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_links_is_public ON links(is_public);
CREATE INDEX IF NOT EXISTS idx_links_is_featured ON links(is_featured);
CREATE INDEX IF NOT EXISTS idx_favorite_history_link_id ON favorite_history(link_id);
CREATE INDEX IF NOT EXISTS idx_favorite_history_favorited_at ON favorite_history(favorited_at);

-- 4. Enable RLS for favorite_history
ALTER TABLE favorite_history ENABLE ROW LEVEL SECURITY;

-- 5. RLS policies for favorite_history
DROP POLICY IF EXISTS "Anyone can read favorite_history" ON favorite_history;
DROP POLICY IF EXISTS "Users can insert own favorites" ON favorite_history;
DROP POLICY IF EXISTS "Users can delete own favorites" ON favorite_history;

CREATE POLICY "Anyone can read favorite_history" ON favorite_history 
    FOR SELECT USING (true);
    
CREATE POLICY "Users can insert own favorites" ON favorite_history 
    FOR INSERT WITH CHECK (auth.uid() = user_id);
    
CREATE POLICY "Users can delete own favorites" ON favorite_history 
    FOR DELETE USING (auth.uid() = user_id);

-- 6. Update existing RLS for links to allow public read
DROP POLICY IF EXISTS "Anyone can read public links" ON links;
CREATE POLICY "Anyone can read public links" ON links 
    FOR SELECT USING (is_public = TRUE OR auth.uid() = user_id);
