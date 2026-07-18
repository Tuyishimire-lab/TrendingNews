import { NextResponse } from 'next/server';
import { createPublicClient } from '@/lib/supabase';

/**
 * GET /api/articles
 *
 * Serves articles from Supabase with category filtering,
 * full-text search, and server-side pagination.
 */

const VALID_CATEGORIES = [
  'top', 'business', 'technology', 'science', 'health',
  'sports', 'entertainment', 'politics', 'world',
  'environment', 'food', 'tourism',
];

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get('category') || 'top';
  const q = searchParams.get('q');
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
  const pageSize = Math.min(50, Math.max(1, parseInt(searchParams.get('pageSize') || '20', 10)));
  const offset = (page - 1) * pageSize;

  const supabase = createPublicClient();

  // Get last updated timestamp
  const { data: metaData } = await supabase
    .from('fetch_metadata')
    .select('last_updated')
    .order('last_updated', { ascending: false })
    .limit(1);

  const lastUpdated = metaData?.[0]?.last_updated || null;

  try {
    // Search mode
    if (q?.trim()) {
      const query = q.trim();
      const { data: articles, count, error } = await supabase
        .from('articles')
        .select('*', { count: 'exact' })
        .or(`title.ilike.%${query}%,description.ilike.%${query}%`)
        .order('pub_date', { ascending: false })
        .range(offset, offset + pageSize - 1);

      if (error) {
        return NextResponse.json({ error: 'Search failed' }, { status: 500 });
      }

      return NextResponse.json({
        articles: articles || [],
        total: count || 0,
        page,
        pageSize,
        hasMore: offset + pageSize < (count || 0),
        nextPage: offset + pageSize < (count || 0) ? page + 1 : null,
        lastUpdated,
      });
    }

    // Category mode
    const cat = VALID_CATEGORIES.includes(category) ? category : 'top';
    const { data: articles, count, error } = await supabase
      .from('articles')
      .select('*', { count: 'exact' })
      .eq('category', cat)
      .order('pub_date', { ascending: false })
      .range(offset, offset + pageSize - 1);

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch articles' }, { status: 500 });
    }

    return NextResponse.json({
      articles: articles || [],
      total: count || 0,
      page,
      pageSize,
      hasMore: offset + pageSize < (count || 0),
      nextPage: offset + pageSize < (count || 0) ? page + 1 : null,
      lastUpdated,
    });

  } catch (err) {
    console.error('[Articles API] Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
