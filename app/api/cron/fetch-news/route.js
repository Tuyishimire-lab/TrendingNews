import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';

/**
 * GET & POST /api/cron/fetch-news
 *
 * Daily cron job that fetches articles from 3 free news APIs,
 * then runs AI analysis on the newest articles.
 *
 * Optimized to complete within Vercel's 60s timeout.
 */

export const maxDuration = 60;

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

function correctCategory(title, description, currentCategory) {
  const text = `${title || ''} ${description || ''}`.toLowerCase();

  // 1. Sports Indicators
  const sportsWords = [
    'wnba', 'nba', 'nfl', 'mlb', 'nhl', 'premier league', 'champions league', 
    'olympics', 'olympic', 'wimbledon', 'athlete', 'stadium', 'football', 
    'soccer', 'basketball', 'baseball', 'tennis', 'hockey', 'golf', 'boxing', 
    'ufc', 'formula 1', 'grand prix', 'medalist', 'championship', 'tournament',
    'quarterback', 'striker', 'touchdown', 'slam dunk', 'home run'
  ];
  const sportsPatterns = [
    /\b(beat|beats|defeat|defeats|scores|score|won|wins|lost|loses|victory|draw|match|game|vs)\b/i,
    /\b\d{1,3}-\d{1,3}\b/ // matches scores like "101-93" or "2-1"
  ];

  const hasSportsWord = sportsWords.some(w => text.includes(w));
  const hasSportsPattern = sportsPatterns.some(p => p.test(text));

  // If it has sports words, or sports patterns + names/teams, classify as sports
  if (hasSportsWord || (hasSportsPattern && currentCategory !== 'politics' && currentCategory !== 'business')) {
    return 'sports';
  }

  // 2. Business / Finance Indicators
  const businessWords = [
    'stocks', 'stock market', 'nasdaq', 'dow jones', 'wall street', 'merger', 
    'acquisition', 'revenue', 'profits', 'q1 profit', 'q2 profit', 'q3 profit', 'q4 profit',
    'interest rates', 'inflation', 'gdp', 'recession', 'startup', 'vc funding',
    'layoffs', 'ceo', 'cfo', 'fed rate', 'federal reserve'
  ];
  if (businessWords.some(w => text.includes(w)) && currentCategory !== 'politics') {
    return 'business';
  }

  // 3. Tech Indicators
  const techWords = [
    'artificial intelligence', 'chatgpt', 'openai', 'nvidia', 'semiconductor', 
    'microchip', 'cybersecurity', 'ransomware', 'cryptocurrency', 'bitcoin', 
    'ethereum', 'blockchain', 'metaverse', 'virtual reality', 'augmented reality',
    'software update', 'macos', 'windows 11', 'ios 18', 'android 15'
  ];
  const techPatterns = [
    /\b(ai|gpt-4|gpt-5|claude|gemini|llm|vr|ar|crypto)\b/i
  ];
  if (techWords.some(w => text.includes(w)) || techPatterns.some(p => p.test(text))) {
    return 'technology';
  }

  return currentCategory;
}

function normalizeArticle(raw, source, category) {
  const title = source === 'guardian' ? (raw.fields?.headline || raw.webTitle) : raw.title;
  const desc = source === 'guardian' ? raw.fields?.trailText : raw.description;
  const finalCategory = correctCategory(title, desc, category);

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
        category: finalCategory,
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
        category: finalCategory,
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
        category: finalCategory,
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

function getTitleCleanedWords(title) {
  if (!title) return [];
  const stopwords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'is', 'are', 'was', 'were', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'about', 'as', 'that', 'this', 'these', 'those', 'it', 'its', 'us', 'new', 'says', 'after', 'first', 'over', 'from', 'out', 'up', 'more', 'how', 'who', 'why', 'what']);
  return title
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .split(/\s+/)
    .filter(w => w.length > 2 && !stopwords.has(w));
}

function areTitlesSimilar(title1, title2) {
  const w1 = getTitleCleanedWords(title1);
  const w2 = getTitleCleanedWords(title2);
  if (w1.length === 0 || w2.length === 0) return false;

  const set1 = new Set(w1);
  const set2 = new Set(w2);

  let matchCount = 0;
  for (const word of set1) {
    for (const otherWord of set2) {
      if (word === otherWord || word.startsWith(otherWord) || otherWord.startsWith(word)) {
        matchCount++;
        break;
      }
    }
  }

  const unionSize = set1.size + set2.size - matchCount;
  const similarity = matchCount / (unionSize || 1);
  return similarity > 0.4 || matchCount >= 4;
}

function delay(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function handleFetch() {
  const supabase = createServiceClient();
  const GROQ_API_KEY = process.env.GROQ_API_KEY;

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

  // Fetch existing article titles from database to prevent inserting duplicates of existing articles
  const { data: existingArticles } = await supabase
    .from('articles')
    .select('title')
    .order('pub_date', { ascending: false })
    .limit(300);

  const dbTitles = (existingArticles || []).map(a => a.title).filter(Boolean);

  // Deduplicate by link, ensure image exists, and remove semantically similar articles
  const seenLinks = new Set();
  const acceptedTitles = [...dbTitles]; // Keep track of all titles we've accepted so far

  const unique = allArticles.filter((a) => {
    if (!a || !a.link || seenLinks.has(a.link)) return false;
    
    // Require image URL
    if (!a.image_url || a.image_url.trim() === '') return false;

    // Check if title is semantically similar to any accepted or DB article
    const isDuplicate = acceptedTitles.some((existingTitle) => 
      areTitlesSimilar(a.title, existingTitle)
    );

    if (isDuplicate) {
      console.log(`[Deduplicate] Skipping similar article: "${a.title}"`);
      return false;
    }

    seenLinks.add(a.link);
    acceptedTitles.push(a.title);
    return true;
  });

  console.log(`[Cron] Total: ${allArticles.length} raw → ${unique.length} unique, image-enabled, non-duplicate articles`);

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

  await supabase.from('fetch_metadata').insert({
    last_updated: new Date().toISOString(),
    total_articles: upsertedCount,
    total_credits: 0,
    categories: {
      newsdata: newsDataArticles.length,
      currents: currentsArticles.length,
      guardian: guardianArticles.length,
    },
  });

  console.log(`[Cron] Upserted ${upsertedCount} articles. Starting AI processing...`);

  // ═══════════════════════════════════════════════════════════
  // PHASE 2: AI Processing (Groq)
  // ═══════════════════════════════════════════════════════════

  let aiProcessed = 0;

  if (GROQ_API_KEY) {
    // 2a. Batch-process unprocessed articles (up to 15 for speed)
    const { data: unprocessed } = await supabase
      .from('articles')
      .select('id, title, description, content, category')
      .eq('ai_processed', false)
      .order('pub_date', { ascending: false })
      .limit(15);

    if (unprocessed?.length > 0) {
      console.log(`[AI] Processing ${unprocessed.length} articles...`);

      // Process in batches of 5 (fewer API calls = faster)
      for (let i = 0; i < unprocessed.length; i += 5) {
        const batch = unprocessed.slice(i, i + 5);
        try {
          const articlesBlock = batch.map((a, idx) =>
            `ARTICLE_${idx + 1}:\nTitle: ${a.title}\nDescription: ${(a.description || '').substring(0, 200)}`
          ).join('\n\n');

          const res = await fetch(GROQ_API_URL, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${GROQ_API_KEY}`,
            },
            body: JSON.stringify({
              model: 'llama-3.3-70b-versatile',
              messages: [
                {
                  role: 'system',
                  content: `You are a news analysis AI. For each article, provide a summary, sentiment, tags, and category.

Respond ONLY with a valid JSON array (no markdown, no code fences). Each element must have:
{
  "index": 1,
  "summary": "A detailed 3-4 sentence paragraph highlighting key facts, background context, and overall significance.",
  "sentiment": "positive" | "negative" | "neutral",
  "confidence": 0.85,
  "tags": ["tag1", "tag2", "tag3"],
  "importance": 8,
  "category": "sports"
}
Note: "importance" is an integer from 1 to 10 rating the news value/impact.
Note: "category" must be one of: top, business, technology, science, health, sports, entertainment, politics, world, environment, food, tourism. Use this to correct category classification if the input article is in the wrong category.
Respond ONLY with the JSON array.`,
                },
                { role: 'user', content: `Analyze these ${batch.length} articles:\n\n${articlesBlock}` },
              ],
              temperature: 0.2,
              max_tokens: 1500,
            }),
          });

          if (res.ok) {
            const data = await res.json();
            const raw = data.choices?.[0]?.message?.content || '';
            try {
              const jsonMatch = raw.match(/\[[\s\S]*\]/);
              const results = JSON.parse(jsonMatch ? jsonMatch[0] : raw);

              for (const r of results) {
                const idx = (r.index || 1) - 1;
                if (idx >= 0 && idx < batch.length) {
                  const validCats = ['top', 'business', 'technology', 'science', 'health', 'sports', 'entertainment', 'politics', 'world', 'environment', 'food', 'tourism'];
                  const finalCat = r.category && validCats.includes(r.category) ? r.category : batch[idx].category;
                  
                  await supabase
                    .from('articles')
                    .update({
                      ai_summary: r.summary || null,
                      ai_sentiment: r.sentiment || 'neutral',
                      ai_sentiment_score: typeof r.confidence === 'number' ? r.confidence : 0.5,
                      ai_tags: Array.isArray(r.tags) ? r.tags.slice(0, 5) : [],
                      ai_processed: true,
                      ai_importance_score: typeof r.importance === 'number' ? r.importance : 5,
                      category: finalCat,
                    })
                    .eq('id', batch[idx].id);
                  aiProcessed++;
                }
              }
            } catch { /* parse error, skip batch */ }
          }
          await delay(200); // Rate limit
        } catch (err) {
          console.error(`[AI] Batch error:`, err.message);
        }
      }

      // Mark remaining as processed to avoid re-trying
      const processedIds = unprocessed.map((a) => a.id);
      await supabase
        .from('articles')
        .update({ ai_processed: true })
        .in('id', processedIds)
        .eq('ai_processed', false);
    }

    // 2b. Generate category briefings (top 3 categories for speed)
    console.log('[AI] Generating category briefings...');
    const KEY_CATEGORIES = ['top', 'technology', 'world'];
    for (const cat of KEY_CATEGORIES) {
      try {
        const { data: topArticles } = await supabase
          .from('articles')
          .select('title, ai_summary')
          .eq('category', cat)
          .order('pub_date', { ascending: false })
          .limit(15);

        if (!topArticles?.length) continue;

        const headlines = topArticles.map((a, i) =>
          `${i + 1}. ${a.title}${a.ai_summary ? ` — ${a.ai_summary}` : ''}`
        ).join('\n');

        const res = await fetch(GROQ_API_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${GROQ_API_KEY}`,
          },
          body: JSON.stringify({
            model: 'llama-3.3-70b-versatile',
            messages: [
              {
                role: 'system',
                content: `You are a news briefing AI. Generate a concise daily briefing.

Respond ONLY with valid JSON (no markdown, no code fences):
{
  "briefing": "3-4 sentence overview of the most important stories.",
  "key_points": ["Key point 1", "Key point 2", "Key point 3"],
  "mood": "A 2-3 word mood descriptor like 'Cautiously Optimistic' or 'Tense & Fast-Moving'"
}`,
              },
              { role: 'user', content: `Generate today's ${cat} news briefing from these headlines:\n\n${headlines}` },
            ],
            temperature: 0.3,
            max_tokens: 400,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          const raw = data.choices?.[0]?.message?.content || '';
          try {
            const jsonMatch = raw.match(/\{[\s\S]*\}/);
            const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : raw);

            await supabase
              .from('briefings')
              .upsert({
                category: cat,
                briefing_text: parsed.briefing || raw,
                key_points: parsed.key_points || [],
                mood: parsed.mood || 'Neutral',
                generated_at: new Date().toISOString(),
              }, { onConflict: 'category' });
          } catch { /* skip */ }
        }
        await delay(200);
      } catch (err) {
        console.error(`[AI] Briefing error for ${cat}:`, err.message);
      }
    }

    // 2c. Generate trending topics
    console.log('[AI] Detecting trending topics...');
    try {
      const { data: recentArticles } = await supabase
        .from('articles')
        .select('title')
        .order('pub_date', { ascending: false })
        .limit(60);

      if (recentArticles?.length > 0) {
        const titles = recentArticles.map((a, i) => `${i + 1}. ${a.title}`).join('\n');

        const res = await fetch(GROQ_API_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${GROQ_API_KEY}`,
          },
          body: JSON.stringify({
            model: 'llama-3.3-70b-versatile',
            messages: [
              {
                role: 'system',
                content: `You are a trend analyst. Identify the top trending topics from news headlines.

Respond ONLY with a valid JSON array (no markdown, no code fences):
[
  { "topic": "Short Topic Name", "description": "One sentence explaining the trend.", "article_count": 5 }
]
Return 8-10 topics, ordered by relevance/frequency.`,
              },
              { role: 'user', content: `Identify trending topics from these headlines:\n\n${titles}` },
            ],
            temperature: 0.3,
            max_tokens: 600,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          const raw = data.choices?.[0]?.message?.content || '';
          try {
            const jsonMatch = raw.match(/\[[\s\S]*\]/);
            const topics = JSON.parse(jsonMatch ? jsonMatch[0] : raw);

            // Clear old and insert new
            await supabase.from('trending_topics').delete().gte('id', 0);
            for (const t of topics) {
              await supabase.from('trending_topics').insert({
                topic: t.topic,
                description: t.description || '',
                article_count: t.article_count || 0,
                generated_at: new Date().toISOString(),
              });
            }
          } catch { /* skip */ }
        }
      }
    } catch (err) {
      console.error('[AI] Trending error:', err.message);
    }

    // ═══════════════════════════════════════════════════════════
    // PHASE 3: Global AI Synthesis (daily_digest)
    // ═══════════════════════════════════════════════════════════
    console.log('[AI] Running global intelligence synthesis...');
    try {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
      await fetch(`${baseUrl}/api/ai/synthesize`, { method: 'POST' });
      console.log('[AI] Synthesis triggered.');
    } catch (err) {
      console.error('[AI] Synthesis error:', err.message);
    }

    console.log(`[AI] Complete! Processed ${aiProcessed} articles.`);
  } else {
    console.warn('[AI] No GROQ_API_KEY, skipping AI processing.');
  }

  return NextResponse.json({
    success: true,
    message: `Fetched ${upsertedCount} articles, AI-processed ${aiProcessed}`,
    breakdown: {
      newsdata: newsDataArticles.length,
      currents: currentsArticles.length,
      guardian: guardianArticles.length,
    },
    totalUpserted: upsertedCount,
    aiProcessed,
  });
}

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

export async function GET() { return handleFetch(); }
export async function POST() { return handleFetch(); }
