import { NextResponse } from 'next/server';
import { createPublicClient } from '@/lib/supabase';

/**
 * POST /api/ai/chat
 * AI Chat — answers user questions grounded in real articles
 */

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const MODEL = 'llama-3.3-70b-versatile';

export async function POST(request) {
  const GROQ_API_KEY = process.env.GROQ_API_KEY;
  if (!GROQ_API_KEY) {
    return NextResponse.json({ error: 'AI not configured' }, { status: 500 });
  }

  const { message, category } = await request.json();
  if (!message?.trim()) {
    return NextResponse.json({ error: 'No message provided' }, { status: 400 });
  }

  const supabase = createPublicClient();

  // Fetch recent articles for context
  let query = supabase
    .from('articles')
    .select('title, description, source_name, pub_date, category, ai_summary, link')
    .order('pub_date', { ascending: false })
    .limit(30);

  if (category && category !== 'all') {
    query = query.eq('category', category);
  }

  const { data: articles } = await query;

  const context = (articles || []).map((a, i) =>
    `[${i + 1}] "${a.title}" (${a.source_name}, ${a.category})${a.ai_summary ? `\nSummary: ${a.ai_summary}` : ''}\nLink: ${a.link}`
  ).join('\n\n');

  try {
    const response = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          {
            role: 'system',
            content: `You are NovaPulse AI, an intelligent news assistant. You answer questions about today's news based on real articles from our database.

Rules:
- Answer based ONLY on the articles provided below. Do not make up information.
- Be concise but informative (3-5 sentences max).
- Cite sources by referencing the article number and source name, e.g., "According to The Guardian [3]..."
- If the articles don't contain relevant information, say so honestly.
- Use a professional, engaging tone.

TODAY'S ARTICLES:
${context}`,
          },
          { role: 'user', content: message },
        ],
        temperature: 0.4,
        max_tokens: 600,
      }),
    });

    if (!response.ok) {
      return NextResponse.json({ error: 'AI service unavailable' }, { status: 502 });
    }

    const data = await response.json();
    const answer = data.choices?.[0]?.message?.content || 'I couldn\'t generate an answer.';

    // Extract referenced article numbers
    const refs = [...answer.matchAll(/\[(\d+)\]/g)].map((m) => parseInt(m[1], 10));
    const citedArticles = refs
      .filter((n) => n >= 1 && n <= (articles || []).length)
      .map((n) => {
        const a = articles[n - 1];
        return { title: a.title, source: a.source_name, link: a.link };
      });

    return NextResponse.json({ answer, citations: citedArticles });
  } catch (err) {
    console.error('[AI Chat] Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
