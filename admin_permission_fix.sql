-- =============================================
-- Admin Delete Permission Fix
-- Run this in Supabase Dashboard > SQL Editor
-- =============================================

-- 1. curated_links 테이블: RLS 비활성화 & 권한 부여
ALTER TABLE curated_links DISABLE ROW LEVEL SECURITY;
GRANT ALL ON curated_links TO anon;
GRANT ALL ON curated_links TO authenticated;

-- 2. links 테이블: anon 역할에 DELETE 권한 추가
DROP POLICY IF EXISTS "Anon can delete any link" ON links;
CREATE POLICY "Anon can delete any link" ON links
    FOR DELETE USING (true);

-- 3. curated_editors 테이블
ALTER TABLE curated_editors DISABLE ROW LEVEL SECURITY;
GRANT ALL ON curated_editors TO anon;
GRANT ALL ON curated_editors TO authenticated;

-- 4. default_avatars 테이블
ALTER TABLE default_avatars DISABLE ROW LEVEL SECURITY;
GRANT ALL ON default_avatars TO anon;
GRANT ALL ON default_avatars TO authenticated;

-- 5. feed_sources 테이블
ALTER TABLE feed_sources DISABLE ROW LEVEL SECURITY;
GRANT ALL ON feed_sources TO anon;
GRANT ALL ON feed_sources TO authenticated;
