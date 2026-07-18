import { NextResponse } from 'next/server';
import { createPublicClient } from '@/lib/supabase';

/**
 * GET /api/ai/trending
 * Returns pre-generated trending topics
 */
export async function GET() {
  const supabase = createPublicClient();

  const { data, error } = await supabase
    .from('trending_topics')
    .select('*')
    .order('article_count', { ascending: false })
    .limit(10);

  if (error) {
    return NextResponse.json({ topics: [] });
  }

  return NextResponse.json({ topics: data || [] });
}
