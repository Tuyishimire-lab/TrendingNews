import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';

/**
 * GET & POST /api/cron/fetch-news
 *
 * Daily cron job that fetches articles from NewsData.io
 * across all categories using the full 200 daily credits.
 * Upserts into Supabase PostgreSQL with dedup by link.
 */

const NEWSDATA_BASE = 'https://newsdata.io/api/1/latest';
const API_KEY = process.env.NEWSDATA_API_KEY;

const CATEGORY_CREDITS = {
  top: 22, technology: 20, business: 20, world: 20,
  politics: 18, sports: 18, health: 16, science: 16,
  entertainment: 16, environment: 12, food: 12, tourism: 10,
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
      if (nextPage) params.set('page', nextPage);

      const res = await fetch(`${NEWSDATA_BASE}?${params}`);
      creditsUsed++;

      if (!res.ok) break;

      const data = await res.json();
      if (data.status !== 'success' || !data.results?.length) break;

      articles.push(...data.results);
      nextPage = data.nextPage || null;
      if (!nextPage) break;

      await new Promise((r) => setTimeout(r, 150));
    } catch (err) {
      console.error(`[${category}] Fetch error:`, err.message);
      break;
    }
  }

  return { articles, creditsUsed };
}

function mapArticleToRow(article, category) {
  return {
    title: article.title || 'Untitled',
    link: article.link,
    description: article.description || null,
    content: article.content || null,
    image_url: article.image_url || null,
    source_name: article.source_name || article.source_id || null,
    source_icon: article.source_icon || null,
    source_id: article.source_id || null,
    pub_date: article.pubDate || null,
    category,
    country: Array.isArray(article.country) ? article.country : null,
    language: article.language || 'en',
    fetched_at: new Date().toISOString(),
  };
}

async function handleFetch() {
  if (!API_KEY) {
    return NextResponse.json({ error: 'NEWSDATA_API_KEY not configured' }, { status: 500 });
  }

  const supabase = createServiceClient();

  // Clean up articles older than 3 days
  const threeDaysAgo = new Date(Date.now() - 3 * 86400 * 1000).toISOString();
  await supabase.from('articles').delete().lt('fetched_at', threeDaysAgo);

  const results = {};
  let totalArticles = 0;
  let totalCredits = 0;

  for (const category of CATEGORIES) {
    const maxCredits = CATEGORY_CREDITS[category];
    const { articles, creditsUsed } = await fetchCategoryArticles(category, maxCredits);

    const rows = articles.filter((a) => a.link).map((a) => mapArticleToRow(a, category));

    if (rows.length > 0) {
      for (let i = 0; i < rows.length; i += 50) {
        const batch = rows.slice(i, i + 50);
        const { error } = await supabase
          .from('articles')
          .upsert(batch, { onConflict: 'link', ignoreDuplicates: false });
        if (error) console.error(`[Cron] Upsert error for ${category}:`, error.message);
      }
    }

    results[category] = { count: rows.length, creditsUsed };
    totalArticles += rows.length;
    totalCredits += creditsUsed;
  }

  await supabase.from('fetch_metadata').insert({
    last_updated: new Date().toISOString(),
    total_articles: totalArticles,
    total_credits: totalCredits,
    categories: results,
  });

  return NextResponse.json({
    success: true,
    message: `Fetched ${totalArticles} articles using ${totalCredits} credits`,
    totalArticles,
    totalCredits,
    categories: results,
  });
}

export async function GET() { return handleFetch(); }
export async function POST() { return handleFetch(); }
