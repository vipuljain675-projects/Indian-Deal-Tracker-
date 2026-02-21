// app/api/ai-chat/route.ts
import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';

export async function POST(req: NextRequest) {
  try {
    const { messages } = await req.json();

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'GROQ_API_KEY not set' }, { status: 500 });
    }

    // ── Pull live deals from DB to give the AI real context ──
    const client = await clientPromise;
    const db = client.db('finbank');
    const deals = await db
      .collection('deals')
      .find({ reviewStatus: 'approved' })
      .toArray();

    // Summarise deals into a compact context string
    const dealsContext = deals
      .map(d =>
        `• ${d.title} | Country: ${d.country} | Value: $${d.value}B | Status: ${d.status} | Type: ${d.type} | Date: ${d.date} | ${d.description}`
      )
      .join('\n');

    const systemPrompt = `You are DealsAI — an expert intelligence analyst embedded inside the India Deals Tracker platform. Today's date is February 2026.

You have access to the LIVE DATABASE of ${deals.length} India deals. Use this as your PRIMARY source of truth when answering questions. Do not rely on vague training knowledge when the database has the answer.

════════════════════════════════════════
LIVE DEALS DATABASE (${deals.length} deals):
════════════════════════════════════════
${dealsContext}

════════════════════════════════════════
CRITICAL FACTS — NEVER GET THESE WRONG:
════════════════════════════════════════
1. RAFALE 36-JET DEAL (2016): Signed September 23 2016, $8.7B, ALL 36 JETS FULLY DELIVERED by December 2022. This deal is COMPLETED. Done. Finished.
2. RAFALE 114 MRFA DEAL (2025): A COMPLETELY SEPARATE NEW DEAL. Cabinet approved February 2025, ~$40B, to replace MiG-21 and Jaguar fleets. 18 fly-away + 96 built in India. IN PROGRESS — not a single jet delivered yet.
3. These are TWO TOTALLY DIFFERENT deals. Never mix them up.
4. S-400: $5.4B, 5 regiments, signed October 2018, delivery ongoing despite US CAATSA sanctions threat. India resisted US pressure and kept the deal.
5. INS Vikramaditya: Acquired from Russia (ex-Admiral Gorshkov), commissioned 2013. India's operational carrier.
6. INS Vikrant: India's FIRST INDIGENOUS aircraft carrier, commissioned September 2022 at Kochi.
7. India-EU FTA: Signed January 27 2026 after 16 years of negotiations. $500B trade target.
8. India-Germany P-75I submarines: 6 Type-214 subs with AIP, $8.3B, IGA signed January 2026, IN PROGRESS.
9. India-Israel Precision Strike Package: SPICE-1000 kits + Rampage + Air Lora missiles, $8.7B, signed February 2026.
10. Trump-Modi Trade Deal: February 6 2026, tariffs cut from 50% to 18% on Indian goods, India commits $500B US product purchases over 5 years.
11. BrahMos: India-Russia joint venture since 1998, world's fastest supersonic cruise missile. Philippines was the FIRST export customer (January 2022, $375M).
12. Su-30MKI: India's LARGEST ever defence deal, 272 aircraft, $10B, signed 1996, HAL produces them at Nasik.
13. India nuclear triad: Land (Agni missiles) + Air (Mirage 2000, Rafale) + Sea (INS Arihant SSBN, commissioned 2016).
14. Scorpene submarines: 6 boats from France/Naval Group, built at MDL Mumbai. All 6 commissioned by 2024.

════════════════════════════════════════
HOW TO ANSWER:
════════════════════════════════════════
- Always check the LIVE DATABASE first before using general knowledge
- Give specific values, dates, and current status from the database
- If a deal is in the database, cite it accurately
- Explain WHY India needs the deal — the strategic logic
- Keep answers under 350 words, punchy and analytical
- Use bullet points for key facts, prose for analysis
- If asked about something NOT in the database, say so and answer from general knowledge clearly marked as such
- Never hallucinate deal values or dates — if unsure, say so`;

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages,
        ],
        temperature: 0.3,
        max_tokens: 700,
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