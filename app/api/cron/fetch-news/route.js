import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';

/**
 * GET & POST /api/cron/fetch-news
 *
 * Daily cron job that fetches articles from 3 free news APIs:
 *   1. NewsData.io  — 200 credits/day
 *   2. Currents API  — 1,000 req/day
 *   3. The Guardian  — 500 req/day
 *
 * All articles are normalized to a unified schema and upserted to Supabase.
 * Schedule: Daily at 06:00 UTC (configured in vercel.json)
 */

/* ═══════════════════════════════════════════════════════════
   Category Mappings
   ═══════════════════════════════════════════════════════════ */

const UNIFIED_CATEGORIES = [
  'top', 'business', 'technology', 'science', 'health',
  'sports', 'entertainment', 'politics', 'world',
  'environment', 'food', 'tourism',
];

// NewsData.io categories match ours directly
const NEWSDATA_CATEGORIES = {
  top: 'top', business: 'business', technology: 'technology',
  science: 'science', health: 'health', sports: 'sports',
  entertainment: 'entertainment', politics: 'politics', world: 'world',
  environment: 'environment', food: 'food', tourism: 'tourism',
};

// Currents API category mapping
const CURRENTS_CATEGORIES = {
  top: 'general', business: 'business', technology: 'technology',
  science: 'science', health: 'health', sports: 'sports',
  entertainment: 'entertainment', politics: 'politics', world: 'world',
  environment: 'environment', food: 'food', tourism: 'travel',
};

// Guardian section mapping
const GUARDIAN_SECTIONS = {
  top: 'news', business: 'business', technology: 'technology',
  science: 'science', health: 'society', sports: 'sport',
  entertainment: 'culture', politics: 'politics', world: 'world',
  environment: 'environment', food: 'food', tourism: 'travel',
};

/* ═══════════════════════════════════════════════════════════
   1. NewsData.io Fetcher
   ═══════════════════════════════════════════════════════════ */

const NEWSDATA_CREDITS = {
  top: 22, technology: 20, business: 20, world: 20,
  politics: 18, sports: 18, health: 16, science: 16,
  entertainment: 16, environment: 12, food: 12, tourism: 10,
};

async function fetchNewsData() {
  const API_KEY = process.env.NEWSDATA_API_KEY;
  if (!API_KEY) { console.warn('[NewsData] No API key, skipping.'); return []; }

  const allArticles = [];

  for (const [unified, ndCategory] of Object.entries(NEWSDATA_CATEGORIES)) {
    const maxCredits = NEWSDATA_CREDITS[unified] || 10;
    let nextPage = null;
    let creditsUsed = 0;

    while (creditsUsed < maxCredits) {
      try {
        const params = new URLSearchParams({
          apikey: API_KEY, category: ndCategory, language: 'en', size: '10',
        });
        if (nextPage) params.set('page', nextPage);

        const res = await fetch(`https://newsdata.io/api/1/latest?${params}`);
        creditsUsed++;
        if (!res.ok) break;

        const data = await res.json();
        if (data.status !== 'success' || !data.results?.length) break;

        for (const a of data.results) {
          if (!a.link) continue;
          allArticles.push(normalizeArticle(a, 'newsdata', unified));
        }

        nextPage = data.nextPage || null;
        if (!nextPage) break;
        await delay(150);
      } catch (err) {
        console.error(`[NewsData:${unified}] Error:`, err.message);
        break;
      }
    }
  }

  console.log(`[NewsData] Fetched ${allArticles.length} articles`);
  return allArticles;
}

/* ═══════════════════════════════════════════════════════════
   2. Currents API Fetcher
   ═══════════════════════════════════════════════════════════ */

async function fetchCurrents() {
  const API_KEY = process.env.CURRENTS_API_KEY;
  if (!API_KEY) { console.warn('[Currents] No API key, skipping.'); return []; }

  const allArticles = [];

  for (const [unified, currCategory] of Object.entries(CURRENTS_CATEGORIES)) {
    try {
      const params = new URLSearchParams({
        language: 'en', category: currCategory,
      });

      const res = await fetch(`https://api.currentsapi.services/v1/latest-news?${params}`, {
        headers: { Authorization: API_KEY },
      });

      if (!res.ok) {
        console.warn(`[Currents:${unified}] API error ${res.status}`);
        continue;
      }

      const data = await res.json();
      const news = data.news || [];

      for (const a of news) {
        if (!a.url) continue;
        allArticles.push(normalizeArticle(a, 'currents', unified));
      }

      await delay(100);
    } catch (err) {
      console.error(`[Currents:${unified}] Error:`, err.message);
    }
  }

  console.log(`[Currents] Fetched ${allArticles.length} articles`);
  return allArticles;
}

/* ═══════════════════════════════════════════════════════════
   3. The Guardian Fetcher
   ═══════════════════════════════════════════════════════════ */

async function fetchGuardian() {
  const API_KEY = process.env.GUARDIAN_API_KEY;
  if (!API_KEY) { console.warn('[Guardian] No API key, skipping.'); return []; }

  const allArticles = [];

  for (const [unified, section] of Object.entries(GUARDIAN_SECTIONS)) {
    // Fetch up to 3 pages of 50 results per section = 150 articles/section
    for (let page = 1; page <= 3; page++) {
      try {
        const params = new URLSearchParams({
          'api-key': API_KEY,
          section,
          'page-size': '50',
          page: String(page),
          'show-fields': 'headline,trailText,thumbnail,byline,bodyText',
          'order-by': 'newest',
        });

        const res = await fetch(`https://content.guardianapis.com/search?${params}`);

        if (!res.ok) {
          console.warn(`[Guardian:${unified}] API error ${res.status}`);
          break;
        }

        const data = await res.json();
        const results = data.response?.results || [];

        if (results.length === 0) break;

        for (const a of results) {
          if (!a.webUrl) continue;
          allArticles.push(normalizeArticle(a, 'guardian', unified));
        }

        // Stop if we've reached the last page
        const totalPages = data.response?.pages || 1;
        if (page >= totalPages) break;

        await delay(200); // Respect 1 req/sec rate limit
      } catch (err) {
        console.error(`[Guardian:${unified}] Error:`, err.message);
        break;
      }
    }
  }

  console.log(`[Guardian] Fetched ${allArticles.length} articles`);
  return allArticles;
}

/* ═══════════════════════════════════════════════════════════
   Normalizer — Unified article schema
   ═══════════════════════════════════════════════════════════ */

function normalizeArticle(raw, source, category) {
  switch (source) {
    case 'newsdata':
      return {
        title: raw.title || 'Untitled',
        link: raw.link,
        description: raw.description || null,
        content: raw.content || null,
        image_url: raw.image_url || null,
        source_name: raw.source_name || raw.source_id || 'NewsData',
        source_icon: raw.source_icon || null,
        source_id: raw.source_id || null,
        pub_date: raw.pubDate || null,
        category,
        country: Array.isArray(raw.country) ? raw.country : null,
        language: raw.language || 'en',
        fetched_at: new Date().toISOString(),
      };

    case 'currents':
      return {
        title: raw.title || 'Untitled',
        link: raw.url,
        description: raw.description || null,
        content: null,
        image_url: raw.image && raw.image !== 'None' ? raw.image : null,
        source_name: raw.author || 'Currents',
        source_icon: null,
        source_id: null,
        pub_date: raw.published ? new Date(raw.published).toISOString() : null,
        category,
        country: null,
        language: raw.language || 'en',
        fetched_at: new Date().toISOString(),
      };

    case 'guardian':
      return {
        title: raw.fields?.headline || raw.webTitle || 'Untitled',
        link: raw.webUrl,
        description: raw.fields?.trailText || null,
        content: raw.fields?.bodyText ? raw.fields.bodyText.substring(0, 500) : null,
        image_url: raw.fields?.thumbnail || null,
        source_name: 'The Guardian',
        source_icon: 'https://assets.guim.co.uk/images/favicons/451963ac2e23633472bf48e2856d3f04/favicon-32x32.png',
        source_id: 'the-guardian',
        pub_date: raw.webPublicationDate || null,
        category,
        country: ['gb'],
        language: 'en',
        fetched_at: new Date().toISOString(),
      };

    default:
      return null;
  }
}

/* ═══════════════════════════════════════════════════════════
   Handler
   ═══════════════════════════════════════════════════════════ */

function delay(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function handleFetch() {
  const supabase = createServiceClient();

  console.log(`[Cron] Starting multi-API news fetch at ${new Date().toISOString()}`);

  // Clean up articles older than 3 days
  const threeDaysAgo = new Date(Date.now() - 3 * 86400 * 1000).toISOString();
  await supabase.from('articles').delete().lt('fetched_at', threeDaysAgo);

  // Fetch from all 3 APIs in parallel
  const [newsDataArticles, currentsArticles, guardianArticles] = await Promise.all([
    fetchNewsData(),
    fetchCurrents(),
    fetchGuardian(),
  ]);

  const allArticles = [...newsDataArticles, ...currentsArticles, ...guardianArticles];

  // Deduplicate by link
  const seen = new Set();
  const unique = allArticles.filter((a) => {
    if (!a || !a.link || seen.has(a.link)) return false;
    seen.add(a.link);
    return true;
  });

  console.log(`[Cron] Total: ${allArticles.length} raw → ${unique.length} unique articles`);

  // Upsert in batches of 100
  let upsertedCount = 0;
  for (let i = 0; i < unique.length; i += 100) {
    const batch = unique.slice(i, i + 100);
    const { error } = await supabase
      .from('articles')
      .upsert(batch, { onConflict: 'link', ignoreDuplicates: false });

    if (error) {
      console.error(`[Cron] Upsert error at batch ${i}:`, error.message);
    } else {
      upsertedCount += batch.length;
    }
  }

  // Store fetch metadata
  const meta = {
    last_updated: new Date().toISOString(),
    total_articles: upsertedCount,
    total_credits: 0,
    categories: {
      newsdata: newsDataArticles.length,
      currents: currentsArticles.length,
      guardian: guardianArticles.length,
    },
  };

  await supabase.from('fetch_metadata').insert(meta);

  console.log(`[Cron] Complete! Upserted ${upsertedCount} articles.`);
  console.log(`[Cron] Breakdown — NewsData: ${newsDataArticles.length}, Currents: ${currentsArticles.length}, Guardian: ${guardianArticles.length}`);

  return NextResponse.json({
    success: true,
    message: `Fetched ${upsertedCount} unique articles from 3 APIs`,
    breakdown: {
      newsdata: newsDataArticles.length,
      currents: currentsArticles.length,
      guardian: guardianArticles.length,
    },
    totalRaw: allArticles.length,
    totalUnique: unique.length,
    totalUpserted: upsertedCount,
  });
}

export async function GET() { return handleFetch(); }
export async function POST() { return handleFetch(); }
