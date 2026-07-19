import { NextResponse } from 'next/server';
import { createPublicClient, createServiceClient } from '@/lib/supabase';

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

/**
 * GET /api/ai/briefing?category=top
 *
 * Returns cached AI briefing for a category, or generates it on-demand
 * using Groq and caches it if it's missing or stale (> 12 hours).
 */
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get('category') || 'top';

  const publicSupabase = createPublicClient();
  const serviceSupabase = createServiceClient();
  const GROQ_API_KEY = process.env.GROQ_API_KEY;

  try {
    // 1. Check database for existing briefing
    const { data: cached } = await supabaseQuery(publicSupabase, category);

    const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000);
    const isFresh = cached && new Date(cached.generated_at) > twelveHoursAgo;

    if (isFresh) {
      return NextResponse.json({
        briefing: cached.briefing_text,
        keyPoints: cached.key_points || [],
        mood: cached.mood || 'Neutral',
        generatedAt: cached.generated_at,
      });
    }

    // 2. Stale or missing briefing — fetch articles to generate a new one
    const { data: topArticles } = await serviceSupabase
      .from('articles')
      .select('title, ai_summary, description')
      .eq('category', category)
      .order('pub_date', { ascending: false })
      .limit(15);

    if (!topArticles || topArticles.length === 0) {
      // If we have a stale briefing, fall back to it rather than returning null
      if (cached) {
        return NextResponse.json({
          briefing: cached.briefing_text,
          keyPoints: cached.key_points || [],
          mood: cached.mood || 'Neutral',
          generatedAt: cached.generated_at,
        });
      }
      return NextResponse.json({ briefing: null });
    }

    // 3. Call Groq to generate briefing if API key is configured
    if (!GROQ_API_KEY) {
      if (cached) {
        return NextResponse.json({
          briefing: cached.briefing_text,
          keyPoints: cached.key_points || [],
          mood: cached.mood || 'Neutral',
          generatedAt: cached.generated_at,
        });
      }
      return NextResponse.json({ briefing: null });
    }

    const headlines = topArticles.map((a, i) =>
      `${i + 1}. ${a.title}${a.ai_summary ? ` — ${a.ai_summary}` : a.description ? ` — ${a.description}` : ''}`
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
            content: `You are a professional news anchor. Generate a concise, engaging, and professional news briefing for the "${category}" category.
Summarize the main events and trends in 3-4 sentences.
Also provide 3 key bullet points (takeaways) and a single-word "mood" descriptor of the news (e.g., Optimistic, Tense, Calm, Volatile, Progressive).

Respond ONLY with a valid JSON object:
{
  "briefing": "The briefing paragraph...",
  "key_points": ["Takeaway 1", "Takeaway 2", "Takeaway 3"],
  "mood": "Tense"
}
Return ONLY the JSON. No markdown formatting or extra text.`,
          },
          { role: 'user', content: `Generate today's ${category} news briefing from these headlines:\n\n${headlines}` },
        ],
        temperature: 0.3,
        max_tokens: 500,
      }),
    });

    if (!res.ok) {
      throw new Error(`Groq returned status ${res.status}`);
    }

    const data = await res.json();
    const raw = data.choices?.[0]?.message?.content || '';
    
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : raw);

    const briefingData = {
      category,
      briefing_text: parsed.briefing || raw,
      key_points: parsed.key_points || [],
      mood: parsed.mood || 'Neutral',
      generated_at: new Date().toISOString(),
    };

    // 4. Cache it in the database
    await serviceSupabase
      .from('briefings')
      .upsert(briefingData, { onConflict: 'category' });

    return NextResponse.json({
      briefing: briefingData.briefing_text,
      keyPoints: briefingData.key_points,
      mood: briefingData.mood,
      generatedAt: briefingData.generated_at,
    });

  } catch (err) {
    console.error('[On-Demand Briefing Error]:', err);
    // Return cached briefing if available even if generation failed
    try {
      const { data: cached } = await supabaseQuery(publicSupabase, category);
      if (cached) {
        return NextResponse.json({
          briefing: cached.briefing_text,
          keyPoints: cached.key_points || [],
          mood: cached.mood || 'Neutral',
          generatedAt: cached.generated_at,
        });
      }
    } catch {}
    return NextResponse.json({ briefing: null });
  }
}

async function supabaseQuery(supabase, category) {
  return await supabase
    .from('briefings')
    .select('*')
    .eq('category', category)
    .maybeSingle();
}

