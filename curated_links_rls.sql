-- RLS Policies for curated_links table
-- Run this in Supabase Dashboard > SQL Editor

-- OPTION 1: Disable RLS completely (simplest for admin-only table)
ALTER TABLE curated_links DISABLE ROW LEVEL SECURITY;

-- OPTION 2: If you want to keep RLS enabled, use permissive policies
-- Uncomment the lines below and comment out the DISABLE line above

-- ALTER TABLE curated_links ENABLE ROW LEVEL SECURITY;

-- -- Allow everyone to read curated_links
-- DROP POLICY IF EXISTS "Anyone can read curated_links" ON curated_links;
-- CREATE POLICY "Anyone can read curated_links" ON curated_links
--     FOR SELECT USING (true);

-- -- Allow anyone to delete curated_links (admin panel uses password auth, not Supabase auth)
-- DROP POLICY IF EXISTS "Anyone can delete curated_links" ON curated_links;
-- CREATE POLICY "Anyone can delete curated_links" ON curated_links
--     FOR DELETE USING (true);

-- -- Allow service role to insert curated_links (for Edge Function)
-- DROP POLICY IF EXISTS "Service role can insert curated_links" ON curated_links;
-- CREATE POLICY "Service role can insert curated_links" ON curated_links
--     FOR INSERT WITH CHECK (true);

-- -- Allow anyone to update curated_links
-- DROP POLICY IF EXISTS "Anyone can update curated_links" ON curated_links;
-- CREATE POLICY "Anyone can update curated_links" ON curated_links
--     FOR UPDATE USING (true);
