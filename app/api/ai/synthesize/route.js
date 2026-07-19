import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';

/**
 * GET  /api/ai/synthesize          — returns cached digest, generates if stale
 * GET  /api/ai/synthesize?refresh=true — forces regeneration
 * POST /api/ai/synthesize          — forces regeneration
 *
 * Runs 7 parallel Groq calls to synthesize all articles into AI intelligence layers.
 * Results are cached in daily_digest (one row per date, 12-hour TTL).
 */

export const maxDuration = 60;

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

async function groqCall(apiKey, systemPrompt, userContent, maxTokens = 800) {
  const res = await fetch(GROQ_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userContent },
      ],
      temperature: 0.3,
      max_tokens: maxTokens,
    }),
  });
  if (!res.ok) throw new Error(`Groq error ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data.choices?.[0]?.message?.content || '';
}

function parseJSON(raw, fallback) {
  try {
    const match = raw.match(/(\[[\s\S]*\]|\{[\s\S]*\})/);
    return JSON.parse(match ? match[0] : raw);
  } catch {
    return fallback;
  }
}

export async function GET(request) {
  const forceRefresh = new URL(request.url).searchParams.get('refresh') === 'true';
  return handleSynthesize(forceRefresh);
}

export async function POST() {
  return handleSynthesize(true);
}

async function handleSynthesize(forceRefresh = false) {
  const supabase = createServiceClient();
  const GROQ_API_KEY = process.env.GROQ_API_KEY;

  const today = new Date().toISOString().split('T')[0];
  const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString();

  // 1. Return cached digest if fresh enough
  if (!forceRefresh) {
    const { data: cached } = await supabase
      .from('daily_digest')
      .select('*')
      .eq('date', today)
      .gte('generated_at', twelveHoursAgo)
      .maybeSingle();

    if (cached) {
      return NextResponse.json({ success: true, digest: cached, cached: true });
    }
  }

  // 2. No API key — return stale data if available
  if (!GROQ_API_KEY) {
    const { data: stale } = await supabase
      .from('daily_digest')
      .select('*')
      .eq('date', today)
      .maybeSingle();
    if (stale) return NextResponse.json({ success: true, digest: stale, cached: true });
    return NextResponse.json({ success: false, digest: null, error: 'No Groq API key configured' });
  }

  // 3. Fetch articles for synthesis (titles + summaries only — no raw content)
  const { data: articles } = await supabase
    .from('articles')
    .select('title, ai_summary, ai_sentiment, category, ai_importance_score, description')
    .order('pub_date', { ascending: false })
    .limit(80);

  if (!articles?.length) {
    return NextResponse.json({ success: false, error: 'No articles available for synthesis' });
  }

  // Prepare article sets for different prompts
  const allTitles = articles
    .map((a, i) => `${i + 1}. [${a.category}] ${a.title}`)
    .join('\n');

  const detailedArticles = articles
    .slice(0, 50)
    .map((a, i) => {
      const summary = a.ai_summary || a.description?.substring(0, 150) || '';
      return `${i + 1}. [${a.category?.toUpperCase()}] ${a.title}${summary ? ` — ${summary}` : ''}`;
    })
    .join('\n');

  const sentimentLines = articles
    .map((a) => `${a.ai_sentiment || 'neutral'} | [${a.category}] ${a.title}`)
    .join('\n');

  const lowImportanceArticles = [...articles]
    .sort((a, b) => (a.ai_importance_score || 5) - (b.ai_importance_score || 5))
    .slice(0, 25)
    .map((a, i) => `${i + 1}. [${a.category}] ${a.title}`)
    .join('\n');

  // 4. Run all 7 intelligence layers in parallel
  const [
    narrativesResult,
    politicalResult,
    geoResult,
    underreportedResult,
    conflictingResult,
    quotesResult,
    sentimentResult,
  ] = await Promise.allSettled([

    // Intelligence Layer 1: Hot Narratives
    groqCall(
      GROQ_API_KEY,
      `You are a news intelligence analyst. Identify the 5 most dominant story narratives of the day.
Each narrative should group related headlines under one umbrella story thread.
Respond ONLY with a valid JSON array — no markdown, no code fences:
[{"title":"Short narrative title (4-6 words)","summary":"Two-sentence synthesis describing the key developments and why this thread matters.","categories":["technology","business"],"strength":85}]
"strength" is 1-100 representing how dominant this thread is. Return exactly 5 objects.`,
      `Identify the 5 dominant story narratives from these news headlines:\n\n${detailedArticles}`,
      1000
    ),

    // Intelligence Layer 2: Political Leaning
    groqCall(
      GROQ_API_KEY,
      `You are a non-partisan political media analyst. Analyze the overall political lean of today's news coverage.
Respond ONLY with valid JSON — no markdown, no code fences:
{"lean":"Left","score":0.65,"evidence":["First evidence from headlines","Second evidence","Third evidence"],"breakdown":{"left":40,"center":35,"right":25},"analysis":"One objective sentence explaining the lean."}
"breakdown" percentages must sum to exactly 100. "lean" must be "Left", "Center", or "Right". "score" is 0-1 (how strong the lean is).`,
      `Analyze the political lean of today's global news coverage:\n\n${detailedArticles}`,
      600
    ),

    // Intelligence Layer 3: Geo Focus
    groqCall(
      GROQ_API_KEY,
      `You are a global news analyst. Identify which world regions dominate today's news coverage.
Respond ONLY with a valid JSON array of exactly 6 regions — no markdown, no code fences:
[{"region":"North America","story_count":24,"top_story":"Brief one-sentence description of the main story from this region","emoji":"🌎"}]
Always include these 6 regions: North America, Europe, Asia Pacific, Middle East, Africa, Latin America.
"story_count" is your estimate based on the coverage you see. Use appropriate emoji flags per region.`,
      `Determine geographic news focus from these headlines:\n\n${allTitles}`,
      700
    ),

    // Intelligence Layer 4: Underreported Stories
    groqCall(
      GROQ_API_KEY,
      `You are an investigative journalist spotting overlooked stories. Identify 3 stories that deserve more attention than they appear to be receiving.
Respond ONLY with a valid JSON array of exactly 3 stories — no markdown, no code fences:
[{"title":"Story title","why_important":"One compelling sentence on why this story has bigger implications than it seems.","category":"technology"}]`,
      `Find underreported but important stories from this lower-coverage news list:\n\n${lowImportanceArticles}`,
      500
    ),

    // Intelligence Layer 5: Conflicting Reports
    groqCall(
      GROQ_API_KEY,
      `You are a fact-checking analyst. Find 2-3 news topics where different sources appear to present conflicting or opposing narratives.
Respond ONLY with a valid JSON array — no markdown, no code fences:
[{"topic":"Brief topic name (3-5 words)","perspective_a":"One perspective presented in today's coverage","perspective_b":"A contrasting or opposing perspective also present in today's coverage"}]
If no genuine conflicts exist, identify topics where bias or framing differences are apparent. Return 2 or 3 objects.`,
      `Find conflicting narratives in today's news:\n\n${detailedArticles}`,
      600
    ),

    // Intelligence Layer 6: Key Quotes
    groqCall(
      GROQ_API_KEY,
      `You are a news editor selecting the most impactful statements from today's news.
Extract or synthesize 5 key quotes or statements from today's articles that capture the essence of major developments.
Respond ONLY with a valid JSON array — no markdown, no code fences:
[{"quote":"The actual quote or key statement","speaker":"Name or organization","context":"Brief context in 5-8 words","category":"politics"}]
Make each quote punchy and meaningful. Return exactly 5 objects.`,
      `Extract the 5 most impactful quotes or statements from today's news:\n\n${detailedArticles}`,
      700
    ),

    // Intelligence Layer 7: Global Sentiment
    groqCall(
      GROQ_API_KEY,
      `You are a news sentiment analyst. Assess the overall emotional tone of today's global news.
Respond ONLY with valid JSON — no markdown, no code fences:
{"positive":30,"negative":45,"neutral":25,"mood":"Tense & Uncertain","summary":"One sentence capturing today's overall news atmosphere and prevailing tone."}
"positive", "negative", and "neutral" must sum to exactly 100. "mood" should be 2-4 evocative words.`,
      `Analyze the overall sentiment of today's global news:\n\n${sentimentLines}`,
      400
    ),
  ]);

  // 5. Parse each result with fallbacks
  const hot_narratives = narrativesResult.status === 'fulfilled'
    ? parseJSON(narrativesResult.value, []) : [];

  const political_leaning = politicalResult.status === 'fulfilled'
    ? parseJSON(politicalResult.value, { lean: 'Center', score: 0.1, breakdown: { left: 33, center: 34, right: 33 }, evidence: [], analysis: 'Coverage appears balanced today.' })
    : { lean: 'Center', score: 0.1, breakdown: { left: 33, center: 34, right: 33 }, evidence: [], analysis: 'Coverage appears balanced today.' };

  const geo_focus = geoResult.status === 'fulfilled'
    ? parseJSON(geoResult.value, []) : [];

  const underreported = underreportedResult.status === 'fulfilled'
    ? parseJSON(underreportedResult.value, []) : [];

  const conflicting_reports = conflictingResult.status === 'fulfilled'
    ? parseJSON(conflictingResult.value, []) : [];

  const key_quotes = quotesResult.status === 'fulfilled'
    ? parseJSON(quotesResult.value, []) : [];

  const global_sentiment = sentimentResult.status === 'fulfilled'
    ? parseJSON(sentimentResult.value, { positive: 33, negative: 33, neutral: 34, mood: 'Balanced', summary: "Today's news presents a balanced mix of developments." })
    : { positive: 33, negative: 33, neutral: 34, mood: 'Balanced', summary: "Today's news presents a balanced mix of developments." };

  const digest = {
    date: today,
    hot_narratives,
    political_leaning,
    geo_focus,
    underreported,
    conflicting_reports,
    key_quotes,
    global_sentiment,
    generated_at: new Date().toISOString(),
  };

  // 6. Cache in daily_digest (upsert by date)
  const { error: upsertError } = await supabase
    .from('daily_digest')
    .upsert(digest, { onConflict: 'date' });

  if (upsertError) {
    console.error('[Synthesize] Upsert error:', upsertError.message);
  }

  console.log('[Synthesize] Complete — generated all 7 intelligence layers for', today);

  return NextResponse.json({ success: true, digest, cached: false });
}
