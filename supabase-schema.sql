-- ═══════════════════════════════════════════════════════════
-- NovaPulse — Supabase Database Schema
-- Run this in the Supabase SQL Editor (supabase.com → Project → SQL Editor)
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
  fetched_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for fast querying
CREATE INDEX IF NOT EXISTS idx_articles_category ON articles(category);
CREATE INDEX IF NOT EXISTS idx_articles_pub_date ON articles(pub_date DESC);
CREATE INDEX IF NOT EXISTS idx_articles_fetched_at ON articles(fetched_at DESC);

-- Full-text search index on title + description
ALTER TABLE articles ADD COLUMN IF NOT EXISTS fts tsvector
  GENERATED ALWAYS AS (to_tsvector('english', coalesce(title, '') || ' ' || coalesce(description, ''))) STORED;
CREATE INDEX IF NOT EXISTS idx_articles_fts ON articles USING GIN(fts);

-- Fetch metadata table (tracks cron job runs)
CREATE TABLE IF NOT EXISTS fetch_metadata (
  id              BIGSERIAL PRIMARY KEY,
  last_updated    TIMESTAMPTZ DEFAULT NOW(),
  total_articles  INTEGER DEFAULT 0,
  total_credits   INTEGER DEFAULT 0,
  categories      JSONB DEFAULT '{}'::jsonb
);

-- Row Level Security (RLS) — allow public read, restrict write to service role
ALTER TABLE articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE fetch_metadata ENABLE ROW LEVEL SECURITY;

-- Public read access for articles
CREATE POLICY "Allow public read on articles"
  ON articles FOR SELECT
  USING (true);

-- Public read access for metadata
CREATE POLICY "Allow public read on fetch_metadata"
  ON fetch_metadata FOR SELECT
  USING (true);

-- Service role can do everything (used by serverless functions)
CREATE POLICY "Allow service role full access on articles"
  ON articles FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Allow service role full access on fetch_metadata"
  ON fetch_metadata FOR ALL
  USING (auth.role() = 'service_role');
