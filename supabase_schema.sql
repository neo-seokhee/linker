-- Supabase Schema for Linker App
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor → New Query)

-- Categories table
CREATE TABLE IF NOT EXISTS categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    icon TEXT NOT NULL DEFAULT '📁',
    keywords TEXT[] DEFAULT '{}',
    is_default BOOLEAN DEFAULT FALSE,
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Links table
CREATE TABLE IF NOT EXISTS links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    url TEXT NOT NULL,
    og_title TEXT NOT NULL,
    custom_title TEXT,
    og_image TEXT,
    og_description TEXT,
    category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    is_favorite BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default categories
INSERT INTO categories (id, name, icon, keywords, is_default, order_index) VALUES
    ('00000000-0000-0000-0000-000000000001', '즐겨찾기', '⭐', '{}', TRUE, 0),
    ('00000000-0000-0000-0000-000000000002', '뉴스', '📰', ARRAY['news', '뉴스', '속보', '기사', 'breaking', 'headline', '연합', 'yonhap', 'reuters'], TRUE, 1),
    ('00000000-0000-0000-0000-000000000003', '쇼핑', '🛒', ARRAY['shop', '쇼핑', '구매', 'buy', 'store', '마켓', 'market', 'sale', '할인', 'coupang', '쿠팡', '11번가'], TRUE, 2),
    ('00000000-0000-0000-0000-000000000004', '읽어볼 글', '📖', ARRAY['blog', '블로그', 'article', 'post', 'medium', 'velog', 'tistory', 'brunch'], TRUE, 3)
ON CONFLICT (id) DO NOTHING;

-- Enable Row Level Security (RLS) - Optional but recommended
-- For now, we'll allow public access since there's no auth yet
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE links ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (anonymous users)
CREATE POLICY "Allow public read categories" ON categories FOR SELECT USING (true);
CREATE POLICY "Allow public insert categories" ON categories FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update categories" ON categories FOR UPDATE USING (true);
CREATE POLICY "Allow public delete categories" ON categories FOR DELETE USING (true);

CREATE POLICY "Allow public read links" ON links FOR SELECT USING (true);
CREATE POLICY "Allow public insert links" ON links FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update links" ON links FOR UPDATE USING (true);
CREATE POLICY "Allow public delete links" ON links FOR DELETE USING (true);
