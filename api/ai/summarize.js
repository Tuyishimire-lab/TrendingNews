/**
 * POST /api/ai/summarize
 * 
 * Uses Groq AI (Llama 3.3 70B) to generate a concise summary
 * and key takeaways from an article.
 * 
 * Request body: { title, description, content, source }
 * Response: { summary, keyTakeaways }
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

  const { title, description, content, source } = req.body;

  if (!title && !description && !content) {
    return res.status(400).json({ error: 'At least title, description, or content is required' });
  }

  const articleText = [
    title ? `Title: ${title}` : '',
    source ? `Source: ${source}` : '',
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
            content: `You are a news analyst AI. Your job is to provide clear, accurate summaries of news articles.

Respond ONLY with a valid JSON object in this exact format (no markdown, no code fences):
{
  "summary": "A concise 2-3 sentence summary of the article capturing the key facts and significance.",
  "keyTakeaways": [
    "First key takeaway or insight",
    "Second key takeaway or insight",
    "Third key takeaway or insight"
  ]
}`,
          },
          {
            role: 'user',
            content: `Summarize this news article:\n\n${articleText}`,
          },
        ],
        temperature: 0.3,
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      const errData = await response.text();
      console.error('[AI Summarize] Groq API error:', response.status, errData);
      return res.status(502).json({ error: 'AI service unavailable' });
    }

    const data = await response.json();
    const rawContent = data.choices?.[0]?.message?.content || '';

    // Parse the JSON response
    let parsed;
    try {
      // Try to extract JSON from the response (handle potential markdown wrapping)
      const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
      parsed = JSON.parse(jsonMatch ? jsonMatch[0] : rawContent);
    } catch (parseErr) {
      console.warn('[AI Summarize] JSON parse failed, using raw text');
      parsed = {
        summary: rawContent.trim(),
        keyTakeaways: [],
      };
    }

    return res.status(200).json({
      summary: parsed.summary || rawContent.trim(),
      keyTakeaways: parsed.keyTakeaways || [],
    });

  } catch (err) {
    console.error('[AI Summarize] Error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
