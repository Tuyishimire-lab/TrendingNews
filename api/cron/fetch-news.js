import { createClient } from '@supabase/supabase-js';

/**
 * Daily Cron Job — Fetches all articles from NewsData.io
 * across all categories using the full daily credit allocation.
 *
 * Stores results in Supabase PostgreSQL with upsert (dedup by link).
 *
 * Schedule: Once daily at 06:00 UTC (configured in vercel.json)
 * Credits: 200/day, 10 results/request = up to 2000 articles
 */

const NEWSDATA_BASE = 'https://newsdata.io/api/1/latest';
const API_KEY = process.env.NEWSDATA_API_KEY;

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

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

function mapArticleToRow(article, category) {
  return {
    title:       article.title || 'Untitled',
    link:        article.link,
    description: article.description || null,
    content:     article.content || null,
    image_url:   article.image_url || null,
    source_name: article.source_name || article.source_id || null,
    source_icon: article.source_icon || null,
    source_id:   article.source_id || null,
    pub_date:    article.pubDate || null,
    category:    category,
    country:     Array.isArray(article.country) ? article.country : null,
    language:    article.language || 'en',
    fetched_at:  new Date().toISOString(),
  };
}

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!API_KEY) {
    return res.status(500).json({ error: 'NEWSDATA_API_KEY not configured' });
  }

  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return res.status(500).json({ error: 'Supabase credentials not configured' });
  }

  console.log(`[Cron] Starting daily news fetch at ${new Date().toISOString()}`);

  // Clean up articles older than 3 days
  const threeDaysAgo = new Date(Date.now() - 3 * 86400 * 1000).toISOString();
  const { error: deleteErr } = await supabase
    .from('articles')
    .delete()
    .lt('fetched_at', threeDaysAgo);

  if (deleteErr) {
    console.warn('[Cron] Cleanup error:', deleteErr.message);
  }

  const results = {};
  let totalArticles = 0;
  let totalCredits = 0;

  for (const category of CATEGORIES) {
    const maxCredits = CATEGORY_CREDITS[category];
    console.log(`[Cron] Fetching ${category} (max ${maxCredits} credits)...`);

    const { articles, creditsUsed } = await fetchCategoryArticles(category, maxCredits);

    // Filter out articles without a link (required for dedup)
    const valid = articles.filter((a) => a.link);

    // Map to DB rows
    const rows = valid.map((a) => mapArticleToRow(a, category));

    if (rows.length > 0) {
      // Upsert in batches of 50
      for (let i = 0; i < rows.length; i += 50) {
        const batch = rows.slice(i, i + 50);
        const { error } = await supabase
          .from('articles')
          .upsert(batch, {
            onConflict: 'link',
            ignoreDuplicates: false,
          });

        if (error) {
          console.error(`[Cron] Upsert error for ${category}:`, error.message);
        }
      }
    }

    results[category] = { count: rows.length, creditsUsed };
    totalArticles += rows.length;
    totalCredits += creditsUsed;

    console.log(`[Cron] ${category}: ${rows.length} articles (${creditsUsed} credits)`);
  }

  // Store fetch metadata
  const { error: metaErr } = await supabase
    .from('fetch_metadata')
    .insert({
      last_updated: new Date().toISOString(),
      total_articles: totalArticles,
      total_credits: totalCredits,
      categories: results,
    });

  if (metaErr) {
    console.warn('[Cron] Metadata insert error:', metaErr.message);
  }

  console.log(`[Cron] Complete! ${totalArticles} articles fetched using ${totalCredits} credits.`);

  return res.status(200).json({
    success: true,
    message: `Fetched ${totalArticles} articles using ${totalCredits} credits`,
    totalArticles,
    totalCredits,
    categories: results,
  });
}
