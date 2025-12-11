-- Curated Links & Boost Score Migration
-- Run this in Supabase Dashboard > SQL Editor

-- 1. Create curated_links table for admin-managed links
CREATE TABLE IF NOT EXISTS curated_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    url TEXT NOT NULL,
    title TEXT NOT NULL,
    thumbnail TEXT,
    description TEXT,
    
    -- Display settings
    show_in_feed BOOLEAN DEFAULT TRUE,
    show_in_featured BOOLEAN DEFAULT FALSE,
    show_in_top10 BOOLEAN DEFAULT FALSE,
    
    -- Boost score for Top 10 ranking
    boost_score INTEGER DEFAULT 0,
    
    -- Category for feed filtering
    category TEXT DEFAULT '일반',
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);

-- 2. Add boost_score to existing links table
ALTER TABLE links ADD COLUMN IF NOT EXISTS boost_score INTEGER DEFAULT 0;

-- 3. Enable RLS for curated_links
ALTER TABLE curated_links ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies for curated_links
-- Anyone can read curated links (they're meant to be public)
DROP POLICY IF EXISTS "Anyone can read curated_links" ON curated_links;
CREATE POLICY "Anyone can read curated_links" ON curated_links 
    FOR SELECT USING (true);

-- Only admins can insert/update/delete curated links
DROP POLICY IF EXISTS "Admins can manage curated_links" ON curated_links;
CREATE POLICY "Admins can manage curated_links" ON curated_links 
    FOR ALL USING (
        EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid())
    );

-- 5. Create index for efficient queries
CREATE INDEX IF NOT EXISTS idx_curated_links_feed ON curated_links(show_in_feed) WHERE show_in_feed = TRUE;
CREATE INDEX IF NOT EXISTS idx_curated_links_featured ON curated_links(show_in_featured) WHERE show_in_featured = TRUE;
CREATE INDEX IF NOT EXISTS idx_curated_links_top10 ON curated_links(show_in_top10) WHERE show_in_top10 = TRUE;
CREATE INDEX IF NOT EXISTS idx_links_boost_score ON links(boost_score) WHERE boost_score > 0;

-- 6. Grant permissions (if needed)
-- GRANT SELECT ON curated_links TO authenticated;
-- GRANT SELECT ON curated_links TO anon;
