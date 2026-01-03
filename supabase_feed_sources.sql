-- Feed Sources Management Table
-- Run this in Supabase Dashboard > SQL Editor

-- 1. Create feed_sources table for admin-managed RSS/Newsletter sources
CREATE TABLE IF NOT EXISTS feed_sources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Source info
    name TEXT NOT NULL, -- 소스 이름 (e.g., "TechCrunch", "GeekNews")
    source_type TEXT NOT NULL CHECK (source_type IN ('rss', 'newsletter', 'api', 'scraper')), -- 소스 타입
    url TEXT NOT NULL, -- RSS URL 또는 API 엔드포인트

    -- Email newsletter settings (for newsletter type)
    email_address TEXT, -- 뉴스레터 수신 이메일
    email_parser_config JSONB, -- 이메일 파싱 설정

    -- Display settings
    editor_nickname TEXT NOT NULL, -- 에디터 표시 이름 (e.g., "TechCrunch Bot")
    editor_profile_image TEXT, -- 에디터 프로필 이미지
    category TEXT DEFAULT '일반', -- 카테고리

    -- Feed settings
    show_in_feed BOOLEAN DEFAULT TRUE, -- 피드에 표시
    show_in_featured BOOLEAN DEFAULT FALSE, -- Featured 섹션 표시
    boost_score INTEGER DEFAULT 0, -- Top 10 부스트 점수

    -- Collection settings
    is_active BOOLEAN DEFAULT TRUE, -- 활성화 여부
    collection_interval_hours INTEGER DEFAULT 6, -- 수집 주기 (시간)
    max_items_per_collection INTEGER DEFAULT 10, -- 한 번에 수집할 최대 아이템 수

    -- Filtering settings
    keywords_include TEXT[], -- 포함할 키워드 (OR 조건)
    keywords_exclude TEXT[], -- 제외할 키워드

    -- Metadata
    last_collected_at TIMESTAMPTZ, -- 마지막 수집 시간
    total_items_collected INTEGER DEFAULT 0, -- 총 수집 아이템 수
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create index for efficient queries
CREATE INDEX IF NOT EXISTS idx_feed_sources_active ON feed_sources(is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_feed_sources_collection ON feed_sources(last_collected_at, collection_interval_hours);

-- 3. Enable RLS for feed_sources
ALTER TABLE feed_sources ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies for feed_sources
-- Anyone can read active feed sources
DROP POLICY IF EXISTS "Anyone can read active feed_sources" ON feed_sources;
CREATE POLICY "Anyone can read active feed_sources" ON feed_sources
    FOR SELECT USING (is_active = TRUE);

-- Authenticated users can manage feed sources (admin page is password protected)
DROP POLICY IF EXISTS "Authenticated users can insert feed_sources" ON feed_sources;
CREATE POLICY "Authenticated users can insert feed_sources" ON feed_sources
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Authenticated users can update feed_sources" ON feed_sources;
CREATE POLICY "Authenticated users can update feed_sources" ON feed_sources
    FOR UPDATE USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Authenticated users can delete feed_sources" ON feed_sources;
CREATE POLICY "Authenticated users can delete feed_sources" ON feed_sources
    FOR DELETE USING (auth.uid() IS NOT NULL);

-- 5. Add updated_at trigger
CREATE OR REPLACE FUNCTION update_feed_sources_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS feed_sources_updated_at ON feed_sources;
CREATE TRIGGER feed_sources_updated_at
    BEFORE UPDATE ON feed_sources
    FOR EACH ROW
    EXECUTE FUNCTION update_feed_sources_updated_at();

-- 6. Create collection logs table for monitoring
CREATE TABLE IF NOT EXISTS feed_collection_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    feed_source_id UUID REFERENCES feed_sources(id) ON DELETE CASCADE,

    status TEXT NOT NULL CHECK (status IN ('success', 'error', 'partial')),
    items_collected INTEGER DEFAULT 0,
    items_skipped INTEGER DEFAULT 0, -- 중복으로 스킵된 아이템
    error_message TEXT,

    collected_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_feed_collection_logs_source ON feed_collection_logs(feed_source_id, collected_at DESC);

-- Enable RLS for logs
ALTER TABLE feed_collection_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can read logs" ON feed_collection_logs;
CREATE POLICY "Authenticated users can read logs" ON feed_collection_logs
    FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Service role can insert logs" ON feed_collection_logs;
CREATE POLICY "Service role can insert logs" ON feed_collection_logs
    FOR INSERT WITH CHECK (true); -- Edge Function will use service role
