import { NextResponse } from 'next/server';

/**
 * POST /api/ai/sentiment
 * Groq AI proxy — analyzes article sentiment
 */

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const MODEL = 'llama-3.3-70b-versatile';

export async function POST(request) {
  const GROQ_API_KEY = process.env.GROQ_API_KEY;
  if (!GROQ_API_KEY) {
    return NextResponse.json({ error: 'GROQ_API_KEY not configured' }, { status: 500 });
  }

  const { title, description, content } = await request.json();

  if (!title && !description && !content) {
    return NextResponse.json({ error: 'No article content provided' }, { status: 400 });
  }

  const articleText = [
    title && `Title: ${title}`,
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
            content: `You are a sentiment analysis AI for news articles.

Respond ONLY with valid JSON (no markdown, no code fences):
{
  "sentiment": "positive" | "negative" | "neutral",
  "confidence": 0.85,
  "reasoning": "Brief 1-2 sentence explanation citing specific elements."
}`,
          },
          { role: 'user', content: `Analyze the sentiment:\n\n${articleText}` },
        ],
        temperature: 0.2,
        max_tokens: 300,
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
      parsed = { sentiment: 'neutral', confidence: 0.5, reasoning: 'Unable to determine.' };
    }

    const validSentiments = ['positive', 'negative', 'neutral'];
    return NextResponse.json({
      sentiment: validSentiments.includes(parsed.sentiment) ? parsed.sentiment : 'neutral',
      confidence: typeof parsed.confidence === 'number' ? Math.min(1, Math.max(0, parsed.confidence)) : 0.5,
      reasoning: parsed.reasoning || '',
    });
  } catch (err) {
    console.error('[AI Sentiment] Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
