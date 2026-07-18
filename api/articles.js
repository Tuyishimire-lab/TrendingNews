import { Redis } from '@upstash/redis';

const redis = Redis.fromEnv();

/**
 * GET /api/articles
 * 
 * Serves stored articles from Vercel KV.
 * 
 * Query params:
 *   - category: Article category (default: 'top')
 *   - q: Search query (filters stored articles by title/description)
 *   - page: Page number for client-side pagination (default: 1)
 *   - pageSize: Articles per page (default: 20)
 */

const VALID_CATEGORIES = [
  'top', 'business', 'technology', 'science', 'health',
  'sports', 'entertainment', 'politics', 'world',
  'environment', 'food', 'tourism'
];

const DEFAULT_PAGE_SIZE = 20;

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

    // Get metadata
    const metaRaw = await redis.get('articles:meta');
    const meta = typeof metaRaw === 'string' ? JSON.parse(metaRaw) : metaRaw;

    // Search mode: search across all categories
    if (q && q.trim()) {
      const query = q.trim().toLowerCase();
      let allArticles = [];

      for (const cat of VALID_CATEGORIES) {
        const raw = await redis.get(`articles:${cat}`);
        if (!raw) continue;
        const articles = typeof raw === 'string' ? JSON.parse(raw) : raw;
        if (Array.isArray(articles)) {
          allArticles.push(...articles);
        }
      }

      // Deduplicate by link
      const seen = new Set();
      allArticles = allArticles.filter((a) => {
        if (!a.link || seen.has(a.link)) return false;
        seen.add(a.link);
        return true;
      });

      // Filter by search query
      const filtered = allArticles.filter((a) => {
        const title = (a.title || '').toLowerCase();
        const desc = (a.description || '').toLowerCase();
        const content = (a.content || '').toLowerCase();
        return title.includes(query) || desc.includes(query) || content.includes(query);
      });

      // Sort by date (newest first)
      filtered.sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));

      // Paginate
      const pg = Math.max(1, parseInt(page, 10));
      const ps = Math.min(50, Math.max(1, parseInt(pageSize, 10)));
      const start = (pg - 1) * ps;
      const paged = filtered.slice(start, start + ps);

      return res.status(200).json({
        articles: paged,
        total: filtered.length,
        page: pg,
        pageSize: ps,
        hasMore: start + ps < filtered.length,
        lastUpdated: meta?.lastUpdated || null,
      });
    }

    // Category mode
    const cat = VALID_CATEGORIES.includes(category) ? category : 'top';
    const raw = await redis.get(`articles:${cat}`);

    if (!raw) {
      return res.status(200).json({
        articles: [],
        total: 0,
        page: 1,
        pageSize: parseInt(pageSize, 10),
        hasMore: false,
        lastUpdated: meta?.lastUpdated || null,
        message: 'No articles available. The daily fetch may not have run yet.',
      });
    }

    const articles = typeof raw === 'string' ? JSON.parse(raw) : raw;

    // Sort by date
    if (Array.isArray(articles)) {
      articles.sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));
    }

    // Paginate
    const pg = Math.max(1, parseInt(page, 10));
    const ps = Math.min(50, Math.max(1, parseInt(pageSize, 10)));
    const start = (pg - 1) * ps;
    const paged = Array.isArray(articles) ? articles.slice(start, start + ps) : [];

    return res.status(200).json({
      articles: paged,
      total: Array.isArray(articles) ? articles.length : 0,
      page: pg,
      pageSize: ps,
      hasMore: start + ps < (Array.isArray(articles) ? articles.length : 0),
      nextPage: start + ps < (Array.isArray(articles) ? articles.length : 0) ? pg + 1 : null,
      lastUpdated: meta?.lastUpdated || null,
    });

  } catch (err) {
    console.error('[Articles API] Error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
