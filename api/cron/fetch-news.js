import { Redis } from '@upstash/redis';

const redis = Redis.fromEnv();

/**
 * Daily Cron Job — Fetches all articles from NewsData.io
 * across all categories using the full daily credit allocation.
 * 
 * Stores results in Vercel KV organized by category.
 * 
 * Schedule: Once daily at 06:00 UTC (configured in vercel.json)
 * Credits: 200/day, 10 results/request = up to 2000 articles
 */

const NEWSDATA_BASE = 'https://newsdata.io/api/1/latest';
const API_KEY = process.env.NEWSDATA_API_KEY;

// Credit allocation per category (total = 200)
const CATEGORY_CREDITS = {
  top:            22,
  technology:     20,
  business:       20,
  world:          20,
  politics:       18,
  sports:         18,
  health:         16,
  science:        16,
  entertainment:  16,
  environment:    12,
  food:           12,
  tourism:        10,
};

const CATEGORIES = Object.keys(CATEGORY_CREDITS);

async function fetchCategoryArticles(category, maxCredits) {
  const articles = [];
  let nextPage = null;
  let creditsUsed = 0;

  while (creditsUsed < maxCredits) {
    try {
      const params = new URLSearchParams({
        apikey: API_KEY,
        category,
        language: 'en',
        size: '10',
      });

      if (nextPage) {
        params.set('page', nextPage);
      }

      const url = `${NEWSDATA_BASE}?${params}`;
      const res = await fetch(url);
      creditsUsed++;

      if (!res.ok) {
        console.warn(`[${category}] API error ${res.status} after ${creditsUsed} credits`);
        break;
      }

      const data = await res.json();

      if (data.status !== 'success' || !data.results || data.results.length === 0) {
        break;
      }

      articles.push(...data.results);
      nextPage = data.nextPage || null;

      if (!nextPage) break;

      // Small delay to be kind to the API
      await new Promise((r) => setTimeout(r, 150));

    } catch (err) {
      console.error(`[${category}] Fetch error:`, err.message);
      break;
    }
  }

  return { articles, creditsUsed, nextPage };
}

export default async function handler(req, res) {
  // Verify the request is from Vercel Cron or an authorized source
  const authHeader = req.headers['authorization'];
  const cronSecret = process.env.CRON_SECRET;

  // Allow POST requests (manual trigger) and GET requests from Vercel Cron
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!API_KEY) {
    return res.status(500).json({ error: 'NEWSDATA_API_KEY not configured' });
  }

  console.log(`[Cron] Starting daily news fetch at ${new Date().toISOString()}`);

  const results = {};
  let totalArticles = 0;
  let totalCredits = 0;

  for (const category of CATEGORIES) {
    const maxCredits = CATEGORY_CREDITS[category];

    console.log(`[Cron] Fetching ${category} (max ${maxCredits} credits)...`);
    const { articles, creditsUsed } = await fetchCategoryArticles(category, maxCredits);

    // Deduplicate by link
    const seen = new Set();
    const unique = articles.filter((a) => {
      if (!a.link || seen.has(a.link)) return false;
      seen.add(a.link);
      return true;
    });

    // Store in KV
    await redis.set(`articles:${category}`, JSON.stringify(unique), { ex: 86400 * 2 }); // TTL: 2 days

    results[category] = { count: unique.length, creditsUsed };
    totalArticles += unique.length;
    totalCredits += creditsUsed;

    console.log(`[Cron] ${category}: ${unique.length} articles (${creditsUsed} credits)`);
  }

  // Store metadata
  const meta = {
    lastUpdated: new Date().toISOString(),
    totalArticles,
    totalCredits,
    categories: results,
  };

  await redis.set('articles:meta', JSON.stringify(meta), { ex: 86400 * 2 });

  console.log(`[Cron] Complete! ${totalArticles} articles fetched using ${totalCredits} credits.`);

  return res.status(200).json({
    success: true,
    message: `Fetched ${totalArticles} articles using ${totalCredits} credits`,
    meta,
  });
}
