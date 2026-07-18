import { createClient } from '@supabase/supabase-js';

/**
 * GET /api/articles
 *
 * Serves articles from Supabase PostgreSQL.
 * Supports category browsing, full-text search, and pagination.
 *
 * Query params:
 *   - category: Article category (default: 'top')
 *   - q: Search query (uses PostgreSQL full-text search)
 *   - page: Page number (default: 1)
 *   - pageSize: Articles per page (default: 20, max: 50)
 */

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const VALID_CATEGORIES = [
  'top', 'business', 'technology', 'science', 'health',
  'sports', 'entertainment', 'politics', 'world',
  'environment', 'food', 'tourism'
];

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 50;

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const {
      category = 'top',
      q,
      page = '1',
      pageSize = String(DEFAULT_PAGE_SIZE),
    } = req.query;

    const pg = Math.max(1, parseInt(page, 10) || 1);
    const ps = Math.min(MAX_PAGE_SIZE, Math.max(1, parseInt(pageSize, 10) || DEFAULT_PAGE_SIZE));
    const offset = (pg - 1) * ps;

    // Get last updated timestamp
    const { data: metaData } = await supabase
      .from('fetch_metadata')
      .select('last_updated')
      .order('last_updated', { ascending: false })
      .limit(1);

    const lastUpdated = metaData?.[0]?.last_updated || null;

    // ── Search Mode ──
    if (q && q.trim()) {
      const query = q.trim();

      // Use PostgreSQL full-text search with websearch_to_tsquery for natural language
      // Fall back to ILIKE if the FTS query is too complex
      let searchQuery = supabase
        .from('articles')
        .select('*', { count: 'exact' })
        .or(`title.ilike.%${query}%,description.ilike.%${query}%`)
        .order('pub_date', { ascending: false })
        .range(offset, offset + ps - 1);

      const { data: articles, count, error } = await searchQuery;

      if (error) {
        console.error('[Articles API] Search error:', error.message);
        return res.status(500).json({ error: 'Search failed' });
      }

      return res.status(200).json({
        articles: articles || [],
        total: count || 0,
        page: pg,
        pageSize: ps,
        hasMore: offset + ps < (count || 0),
        nextPage: offset + ps < (count || 0) ? pg + 1 : null,
        lastUpdated,
      });
    }

    // ── Category Mode ──
    const cat = VALID_CATEGORIES.includes(category) ? category : 'top';

    const { data: articles, count, error } = await supabase
      .from('articles')
      .select('*', { count: 'exact' })
      .eq('category', cat)
      .order('pub_date', { ascending: false })
      .range(offset, offset + ps - 1);

    if (error) {
      console.error('[Articles API] Query error:', error.message);
      return res.status(500).json({ error: 'Failed to fetch articles' });
    }

    return res.status(200).json({
      articles: articles || [],
      total: count || 0,
      page: pg,
      pageSize: ps,
      hasMore: offset + ps < (count || 0),
      nextPage: offset + ps < (count || 0) ? pg + 1 : null,
      lastUpdated,
    });

  } catch (err) {
    console.error('[Articles API] Error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
