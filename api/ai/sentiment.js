/**
 * POST /api/ai/sentiment
 * 
 * Uses Groq AI (Llama 3.3 70B) to analyze the sentiment
 * of a news article.
 * 
 * Request body: { title, description, content }
 * Response: { sentiment, confidence, reasoning }
 */

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_API_KEY = process.env.GROQ_API_KEY;
const MODEL = 'llama-3.3-70b-versatile';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!GROQ_API_KEY) {
    return res.status(500).json({ error: 'GROQ_API_KEY not configured' });
  }

  const { title, description, content } = req.body;

  if (!title && !description && !content) {
    return res.status(400).json({ error: 'At least title, description, or content is required' });
  }

  const articleText = [
    title ? `Title: ${title}` : '',
    description ? `Description: ${description}` : '',
    content ? `Content: ${content}` : '',
  ].filter(Boolean).join('\n');

  try {
    const response = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          {
            role: 'system',
            content: `You are a sentiment analysis AI specialized in news articles. Analyze the overall sentiment and tone of news articles.

Respond ONLY with a valid JSON object in this exact format (no markdown, no code fences):
{
  "sentiment": "positive" | "negative" | "neutral",
  "confidence": 0.85,
  "reasoning": "A brief 1-2 sentence explanation of why this sentiment was determined, citing specific elements from the article."
}

The confidence should be a number between 0 and 1. Be precise and objective in your analysis.`,
          },
          {
            role: 'user',
            content: `Analyze the sentiment of this news article:\n\n${articleText}`,
          },
        ],
        temperature: 0.2,
        max_tokens: 300,
      }),
    });

    if (!response.ok) {
      const errData = await response.text();
      console.error('[AI Sentiment] Groq API error:', response.status, errData);
      return res.status(502).json({ error: 'AI service unavailable' });
    }

    const data = await response.json();
    const rawContent = data.choices?.[0]?.message?.content || '';

    // Parse the JSON response
    let parsed;
    try {
      const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
      parsed = JSON.parse(jsonMatch ? jsonMatch[0] : rawContent);
    } catch (parseErr) {
      console.warn('[AI Sentiment] JSON parse failed, defaulting to neutral');
      parsed = {
        sentiment: 'neutral',
        confidence: 0.5,
        reasoning: 'Unable to determine sentiment from the provided content.',
      };
    }

    // Validate sentiment value
    const validSentiments = ['positive', 'negative', 'neutral'];
    const sentiment = validSentiments.includes(parsed.sentiment) ? parsed.sentiment : 'neutral';
    const confidence = typeof parsed.confidence === 'number'
      ? Math.min(1, Math.max(0, parsed.confidence))
      : 0.5;

    return res.status(200).json({
      sentiment,
      confidence,
      reasoning: parsed.reasoning || '',
    });

  } catch (err) {
    console.error('[AI Sentiment] Error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
