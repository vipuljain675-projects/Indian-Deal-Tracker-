// app/api/ai-chat/route.ts
// Uses the same FREE Groq API key already in your .env.local
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { messages } = await req.json();

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'GROQ_API_KEY not set' }, { status: 500 });
    }

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          {
            role: 'system',
            content: `You are an expert intelligence analyst specializing in India's foreign policy, defence acquisitions, trade agreements, and strategic partnerships. You have deep knowledge of:

- All major India defence deals (Rafale, S-400, MiG series, submarines, helicopters, artillery)
- India's trade agreements (FTAs with UAE, Japan, ASEAN, EU negotiations, CEPA deals)
- India's strategic partnerships with USA (QUAD, GSOMIA, DefTech), Russia, France, Israel, UK
- India's nuclear deals (Indo-US Civil Nuclear Deal, NSG waiver)
- India's infrastructure deals (BRI alternatives, connectivity projects)
- Historical context from 1947 to present

When answering:
- Be specific with deal values, dates, and key items
- Explain the strategic importance to India
- Mention current status (proposed/signed/in progress/completed)
- Keep responses clear and well-structured with key points
- Use Indian context (mention Indian agencies like DRDO, HAL, BrahMos, etc. where relevant)
- Be concise but comprehensive — no more than 400 words per response`,
          },
          ...messages,
        ],
        temperature: 0.4,
        max_tokens: 600,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error('Groq error:', err);
      return NextResponse.json({ error: 'AI service error' }, { status: 500 });
    }

    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content || 'No response generated.';

    return NextResponse.json({ reply });
  } catch (err: any) {
    console.error('ai-chat error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}