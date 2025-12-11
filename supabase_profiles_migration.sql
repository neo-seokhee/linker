-- Profiles table for user nicknames
-- Run this in Supabase Dashboard > SQL Editor

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    nickname TEXT NOT NULL,
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Public profiles are viewable by everyone"
ON profiles FOR SELECT USING (true);

CREATE POLICY "Users can update own profile"
ON profiles FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Auto-create profile on signup via trigger
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    nickname_base TEXT;
    random_suffix TEXT;
BEGIN
    -- Try to get name from Kakao metadata
    nickname_base := NEW.raw_user_meta_data->>'full_name';
    
    -- Also try 'name' field
    IF nickname_base IS NULL OR nickname_base = '' THEN
        nickname_base := NEW.raw_user_meta_data->>'name';
    END IF;
    
    -- Try kakao profile nickname
    IF nickname_base IS NULL OR nickname_base = '' THEN
        nickname_base := NEW.raw_user_meta_data->'kakao_account'->'profile'->>'nickname';
    END IF;
    
    -- If no name, try email prefix
    IF nickname_base IS NULL OR nickname_base = '' THEN
        nickname_base := split_part(NEW.email, '@', 1);
    END IF;
    
    -- If still empty, use 'user'
    IF nickname_base IS NULL OR nickname_base = '' THEN
        nickname_base := 'user';
    END IF;
    
    -- Add random suffix for uniqueness
    random_suffix := substr(md5(random()::text), 1, 4);
    
    INSERT INTO profiles (id, nickname)
    VALUES (NEW.id, nickname_base || '_' || random_suffix);
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if exists, then create
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Create profiles for existing users who don't have one
INSERT INTO profiles (id, nickname)
SELECT 
    id,
    COALESCE(
        raw_user_meta_data->>'full_name',
        raw_user_meta_data->>'name',
        split_part(email, '@', 1),
        'user'
    ) || '_' || substr(md5(random()::text), 1, 4)
FROM auth.users
WHERE id NOT IN (SELECT id FROM profiles)
ON CONFLICT (id) DO NOTHING;
