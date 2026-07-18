import { NextResponse } from 'next/server';
import { createPublicClient } from '@/lib/supabase';

/**
 * GET /api/ai/sentiment-overview
 * Returns aggregated sentiment counts for the Sentiment Pulse widget
 */
export async function GET() {
  const supabase = createPublicClient();

  // Get overall counts
  const { data: allArticles } = await supabase
    .from('articles')
    .select('ai_sentiment, category')
    .not('ai_sentiment', 'is', null);

  if (!allArticles || allArticles.length === 0) {
    return NextResponse.json({
      total: 0,
      positive: 0,
      negative: 0,
      neutral: 0,
      percentages: { positive: 33, negative: 33, neutral: 34 },
      byCategory: {},
    });
  }

  const counts = { positive: 0, negative: 0, neutral: 0 };
  const byCategory = {};

  for (const a of allArticles) {
    const s = a.ai_sentiment || 'neutral';
    counts[s] = (counts[s] || 0) + 1;

    if (!byCategory[a.category]) {
      byCategory[a.category] = { positive: 0, negative: 0, neutral: 0 };
    }
    byCategory[a.category][s] = (byCategory[a.category][s] || 0) + 1;
  }

  const total = allArticles.length;

  return NextResponse.json({
    total,
    ...counts,
    percentages: {
      positive: Math.round((counts.positive / total) * 100),
      negative: Math.round((counts.negative / total) * 100),
      neutral: Math.round((counts.neutral / total) * 100),
    },
    byCategory,
  });
}
