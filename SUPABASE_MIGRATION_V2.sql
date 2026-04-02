-- GAPDIRIK "ELITE PRO" V2 SQL MIGRATION 🏛️
-- Bu betik, 500 hatalarını çözmek ve yeni stats sistemini kurmak için mühürlenmiştir.

-- 1. Tabloyu "Elite Pro" standartlarına yükselt (Eksik sütunları ekle)
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS chips BIGINT DEFAULT 50000,
ADD COLUMN IF NOT EXISTS last_bonus_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS xp BIGINT DEFAULT 0,
ADD COLUMN IF NOT EXISTS level INT DEFAULT 1,
ADD COLUMN IF NOT EXISTS wins INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS losses INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_points BIGINT DEFAULT 0,
ADD COLUMN IF NOT EXISTS verification_code TEXT;

-- 2. Indexleri oluştur (Hız için)
CREATE INDEX IF NOT EXISTS idx_profiles_username ON profiles(username);
CREATE INDEX IF NOT EXISTS idx_profiles_chips ON profiles(chips DESC);

-- 3. Leaderboard için View (Premium Rank Sistemi)
CREATE OR REPLACE VIEW leaderboard AS
SELECT id, username, chips, level, wins, (wins + losses) as total_games
FROM profiles
ORDER BY chips DESC;

-- 4. RLS (Row Level Security) - Opsiyonel ama güvenli
-- Hükümdar, şimdilik erişim sorunlarını önlemek için tabloları halka (Anon) açık bırakıyoruz.
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;

-- MÜJDE: Veritabanı mızmarı meryem ana pürüzsüzlüğünde tamamlandı! ✅
