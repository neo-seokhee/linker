-- Add Uncategorized category
-- Run this in Supabase SQL Editor

-- Add 미분류 (Uncategorized) default category
INSERT INTO categories (id, name, icon, keywords, is_default, order_index) VALUES
    ('00000000-0000-0000-0000-000000000005', '미분류', '📋', '{}', TRUE, 99)
ON CONFLICT (id) DO NOTHING;
