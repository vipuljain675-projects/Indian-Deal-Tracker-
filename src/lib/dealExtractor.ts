// lib/dealExtractor.ts
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
    if (!apiKey) { console.warn('GROQ_API_KEY not set'); return null; }

    const prompt = `You are an expert analyst of Indian foreign policy, defence, and trade deals.

Read this news article and extract deal information. Be GENEROUS — if the article mentions ANY agreement, MoU, contract, purchase, trade deal, partnership, or cooperation between India and another country, extract it.

Article:
"""
${articleText.slice(0, 3000)}
"""

Return ONLY valid JSON, no markdown, no explanation:
{
  "title": "Short official-style title (max 80 chars)",
  "country": "Partner country name. Use 'Multiple' if several countries. Use 'India' if internal.",
  "value": "Deal value in billions USD as plain number e.g. 5.4 — use 0 if not mentioned",
  "status": "One of: Proposed | Signed | In Progress | Ongoing | Completed",
  "type": "One of: Defense Acquisition | Trade | Technology | Energy | Diplomatic",
  "impact": "One of: High Impact | Medium Impact | Low Impact",
  "description": "2-3 sentence factual summary of the deal",
  "strategicIntent": "1-2 sentences on India's strategic goal",
  "whyIndiaNeedsThis": "1-2 sentences on the specific need this fulfills",
  "keyItems": ["item 1", "item 2", "item 3"],
  "date": "Month and year e.g. February 2026"
}

ONLY return {"error": "not_a_deal"} if the article has absolutely nothing to do with India OR has no agreement/deal/contract of any kind.`;

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
    const cleaned = raw.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(cleaned);

    if (parsed.error === 'not_a_deal') return null;

    // Validate required fields exist
    if (!parsed.title || !parsed.country) return null;

    return parsed as ExtractedDeal;
  } catch (err) {
    console.error('extractDealFromText error:', err);
    return null;
  }
}

export async function fetchArticleText(url: string): Promise<string> {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; DealTrackerBot/1.0)' },
      signal: AbortSignal.timeout(5000), // 5 second timeout
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
    return ''; // Silently fail — paywalled or blocked sites
  }
}