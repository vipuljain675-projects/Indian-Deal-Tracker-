// lib/dealExtractor.ts
// Uses FREE Groq API (llama-3.3-70b) — get key at https://console.groq.com
// Free tier: 14,400 requests/day, no credit card needed, very fast

export interface ExtractedDeal {
  title: string;
  country: string;
  value: string;
  status: string;
  type: string;
  impact: string;
  description: string;
  strategicIntent: string;
  whyIndiaNeedsThis: string;
  keyItems: string[];
  date: string;
}

export async function extractDealFromText(
  articleText: string,
  sourceUrl: string = ''
): Promise<ExtractedDeal | null> {
  try {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      console.warn('GROQ_API_KEY not set');
      return null;
    }

    const prompt = `You are an expert analyst of Indian foreign policy, defence, and trade deals.

Read this news article and extract information about an India deal/agreement. Return ONLY valid JSON, no markdown, no explanation, no code fences.

Article:
"""
${articleText.slice(0, 3000)}
"""

Return this exact JSON structure:
{
  "title": "Short official-style title of the deal (max 80 chars)",
  "country": "Partner country name e.g. France, USA, European Union. Use India if internal.",
  "value": "Deal value in billions USD as plain number string e.g. 5.4 or 0 if unknown",
  "status": "One of: Proposed | Signed | In Progress | Ongoing | Completed",
  "type": "One of: Defense Acquisition | Trade | Technology | Energy | Diplomatic",
  "impact": "One of: High Impact | Medium Impact | Low Impact",
  "description": "2-3 sentence factual summary",
  "strategicIntent": "1-2 sentences on India strategic goal",
  "whyIndiaNeedsThis": "1-2 sentences on specific Indian need",
  "keyItems": ["item 1", "item 2", "item 3"],
  "date": "Month and year e.g. February 2026"
}

If this is NOT about an India deal or agreement, return: {"error": "not_a_deal"}`;

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1,
        max_tokens: 1024,
      }),
    });

    if (response.status === 429) {
      console.error('Groq rate limit hit');
      return { quotaExhausted: true } as any;
    }

    if (!response.ok) {
      console.error('Groq API error:', response.status, await response.text());
      return null;
    }

    const data = await response.json();
    const raw = data.choices?.[0]?.message?.content || '';

    // Strip any accidental markdown code fences
    const cleaned = raw.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(cleaned);

    if (parsed.error === 'not_a_deal') return null;

    return parsed as ExtractedDeal;
  } catch (err) {
    console.error('extractDealFromText error:', err);
    return null;
  }
}

// Fetch full article text from a URL
export async function fetchArticleText(url: string): Promise<string> {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; DealTrackerBot/1.0)' },
    });
    const html = await res.text();

    return html
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s{2,}/g, ' ')
      .trim()
      .slice(0, 4000);
  } catch (err) {
    console.error('fetchArticleText error:', err);
    return '';
  }
}