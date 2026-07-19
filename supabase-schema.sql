-- ═══════════════════════════════════════════════════════════
-- NovaPulse — Supabase Database Schema (AI-First)
-- Run this in: Supabase Dashboard → SQL Editor
-- ═══════════════════════════════════════════════════════════

-- Articles table
CREATE TABLE IF NOT EXISTS articles (
  id          BIGSERIAL PRIMARY KEY,
  title       TEXT NOT NULL,
  link        TEXT UNIQUE NOT NULL,
  description TEXT,
  content     TEXT,
  image_url   TEXT,
  source_name TEXT,
  source_icon TEXT,
  source_id   TEXT,
  pub_date    TIMESTAMPTZ,
  category    TEXT NOT NULL DEFAULT 'top',
  country     TEXT[],
  language    TEXT DEFAULT 'en',
  fetched_at  TIMESTAMPTZ DEFAULT NOW(),
  -- AI fields (pre-computed during cron)
  ai_summary        TEXT,
  ai_sentiment      TEXT,            -- 'positive','negative','neutral'
  ai_sentiment_score REAL,           -- 0.0 to 1.0
  ai_tags           TEXT[],          -- ['topic1','topic2','topic3']
  ai_processed      BOOLEAN DEFAULT FALSE,
  ai_importance_score INTEGER         -- 1 to 10 rating the news value/significance
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_articles_category ON articles(category);
CREATE INDEX IF NOT EXISTS idx_articles_pub_date ON articles(pub_date DESC);
CREATE INDEX IF NOT EXISTS idx_articles_fetched_at ON articles(fetched_at DESC);
CREATE INDEX IF NOT EXISTS idx_articles_ai_processed ON articles(ai_processed);
CREATE INDEX IF NOT EXISTS idx_articles_ai_sentiment ON articles(ai_sentiment);
CREATE INDEX IF NOT EXISTS idx_articles_ai_importance ON articles(ai_importance_score DESC NULLS LAST);

-- Full-text search
ALTER TABLE articles ADD COLUMN IF NOT EXISTS fts tsvector
  GENERATED ALWAYS AS (to_tsvector('english', coalesce(title, '') || ' ' || coalesce(description, ''))) STORED;
CREATE INDEX IF NOT EXISTS idx_articles_fts ON articles USING GIN(fts);

-- Fetch metadata
CREATE TABLE IF NOT EXISTS fetch_metadata (
  id              BIGSERIAL PRIMARY KEY,
  last_updated    TIMESTAMPTZ DEFAULT NOW(),
  total_articles  INTEGER DEFAULT 0,
  total_credits   INTEGER DEFAULT 0,
  categories      JSONB
);

-- AI Briefings (pre-generated per category)
CREATE TABLE IF NOT EXISTS briefings (
  id             BIGSERIAL PRIMARY KEY,
  category       TEXT NOT NULL UNIQUE,
  briefing_text  TEXT NOT NULL,
  key_points     TEXT[],
  mood           TEXT,
  generated_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Trending Topics
CREATE TABLE IF NOT EXISTS trending_topics (
  id             BIGSERIAL PRIMARY KEY,
  topic          TEXT NOT NULL,
  description    TEXT,
  article_count  INTEGER DEFAULT 0,
  generated_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════
-- Row Level Security (RLS)
-- ═══════════════════════════════════════════════════════════

ALTER TABLE articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE fetch_metadata ENABLE ROW LEVEL SECURITY;
ALTER TABLE briefings ENABLE ROW LEVEL SECURITY;
ALTER TABLE trending_topics ENABLE ROW LEVEL SECURITY;

-- Public read access
CREATE POLICY IF NOT EXISTS "Public read articles" ON articles FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS "Public read metadata" ON fetch_metadata FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS "Public read briefings" ON briefings FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS "Public read trending" ON trending_topics FOR SELECT USING (true);

-- Service role full access
CREATE POLICY IF NOT EXISTS "Service full articles" ON articles FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY IF NOT EXISTS "Service full metadata" ON fetch_metadata FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY IF NOT EXISTS "Service full briefings" ON briefings FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY IF NOT EXISTS "Service full trending" ON trending_topics FOR ALL USING (true) WITH CHECK (true);

-- ═══════════════════════════════════════════════════════════
-- AI Daily Digest (synthesized intelligence — one row per day)
-- ═══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS daily_digest (
  id                  BIGSERIAL PRIMARY KEY,
  date                DATE NOT NULL UNIQUE,
  hot_narratives      JSONB,    -- [{title, summary, categories[], strength}]
  political_leaning   JSONB,    -- {lean, score, evidence[], breakdown:{left,center,right}, analysis}
  geo_focus           JSONB,    -- [{region, story_count, top_story, emoji}]
  underreported       JSONB,    -- [{title, why_important, category}]
  conflicting_reports JSONB,    -- [{topic, perspective_a, perspective_b}]
  key_quotes          JSONB,    -- [{quote, speaker, context, category}]
  global_sentiment    JSONB,    -- {positive, negative, neutral, mood, summary}
  generated_at        TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE daily_digest ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "Public read digest"  ON daily_digest FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS "Service full digest" ON daily_digest FOR ALL   USING (true) WITH CHECK (true);

-- ═══════════════════════════════════════════════════════════
-- Migration: Add AI columns if upgrading from old schema
-- ═══════════════════════════════════════════════════════════
-- Run these if you already have the articles table:
--
-- ALTER TABLE articles ADD COLUMN IF NOT EXISTS ai_summary TEXT;
-- ALTER TABLE articles ADD COLUMN IF NOT EXISTS ai_sentiment TEXT;
-- ALTER TABLE articles ADD COLUMN IF NOT EXISTS ai_sentiment_score REAL;
-- ALTER TABLE articles ADD COLUMN IF NOT EXISTS ai_tags TEXT[];
-- ALTER TABLE articles ADD COLUMN IF NOT EXISTS ai_processed BOOLEAN DEFAULT FALSE;
-- CREATE INDEX IF NOT EXISTS idx_articles_ai_processed ON articles(ai_processed);
-- CREATE INDEX IF NOT EXISTS idx_articles_ai_sentiment ON articles(ai_sentiment);
-- ALTER TABLE articles ADD COLUMN IF NOT EXISTS ai_importance_score INTEGER;
-- CREATE INDEX IF NOT EXISTS idx_articles_ai_importance ON articles(ai_importance_score DESC NULLS LAST);
--
-- New daily_digest table:
-- (Run the CREATE TABLE IF NOT EXISTS daily_digest block above)
