import { NextResponse } from 'next/server';

/**
 * POST /api/ai/summarize
 * Groq AI proxy — generates article summary + key takeaways
 */

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const MODEL = 'llama-3.3-70b-versatile';

export async function POST(request) {
  const GROQ_API_KEY = process.env.GROQ_API_KEY;
  if (!GROQ_API_KEY) {
    return NextResponse.json({ error: 'GROQ_API_KEY not configured' }, { status: 500 });
  }

  const { title, description, content, source } = await request.json();

  if (!title && !description && !content) {
    return NextResponse.json({ error: 'No article content provided' }, { status: 400 });
  }

  const articleText = [
    title && `Title: ${title}`,
    source && `Source: ${source}`,
    description && `Description: ${description}`,
    content && `Content: ${content}`,
  ].filter(Boolean).join('\n');

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
            content: `You are a news analyst AI. Provide clear, accurate summaries.

Respond ONLY with valid JSON (no markdown, no code fences):
{
  "summary": "A comprehensive and detailed 3-5 sentence summary capturing key facts, background context, and overall significance.",
  "keyTakeaways": [
    "First key takeaway",
    "Second key takeaway",
    "Third key takeaway"
  ]
}`,
          },
          { role: 'user', content: `Summarize this news article:\n\n${articleText}` },
        ],
        temperature: 0.3,
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      return NextResponse.json({ error: 'AI service unavailable' }, { status: 502 });
    }

    const data = await response.json();
    const rawContent = data.choices?.[0]?.message?.content || '';

    let parsed;
    try {
      const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
      parsed = JSON.parse(jsonMatch ? jsonMatch[0] : rawContent);
    } catch {
      parsed = { summary: rawContent.trim(), keyTakeaways: [] };
    }

    return NextResponse.json({
      summary: parsed.summary || rawContent.trim(),
      keyTakeaways: parsed.keyTakeaways || [],
    });
  } catch (err) {
    console.error('[AI Summarize] Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
