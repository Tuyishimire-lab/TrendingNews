import { NextResponse } from 'next/server';
import { createPublicClient } from '@/lib/supabase';

/**
 * GET /api/ai/briefing?category=top
 * Returns pre-generated AI briefing for a category
 */
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get('category') || 'top';

  const supabase = createPublicClient();

  const { data, error } = await supabase
    .from('briefings')
    .select('*')
    .eq('category', category)
    .single();

  if (error || !data) {
    return NextResponse.json({ briefing: null });
  }

  return NextResponse.json({
    briefing: data.briefing_text,
    keyPoints: data.key_points || [],
    mood: data.mood || 'Neutral',
    generatedAt: data.generated_at,
  });
}
