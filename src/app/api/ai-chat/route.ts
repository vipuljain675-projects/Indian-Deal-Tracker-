// app/api/ai-chat/route.ts
import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';

// Smart relevance filter — only injects deals related to the question
function getRelevantDeals(deals: any[], question: string): any[] {
  const q = question.toLowerCase();
  const words = q.split(/\s+/).filter(w => w.length > 3);

  const scored = deals.map(deal => {
    let score = 0;
    const haystack = `${deal.title} ${deal.country} ${deal.type} ${deal.description}`.toLowerCase();

    for (const word of words) {
      if (haystack.includes(word)) score += 3;
    }

    // Type boosting
    if ((q.includes('defence') || q.includes('defense') || q.includes('military') || q.includes('jet') || q.includes('fighter') || q.includes('missile') || q.includes('submarine') || q.includes('helicopter') || q.includes('drone') || q.includes('tank') || q.includes('weapon') || q.includes('gun') || q.includes('rifle')) && deal.type === 'Defense Acquisition') score += 2;
    if ((q.includes('trade') || q.includes('fta') || q.includes('tariff') || q.includes('export') || q.includes('import') || q.includes('cepa')) && deal.type === 'Trade') score += 2;
    if ((q.includes('nuclear') || q.includes('reactor') || q.includes('uranium') || q.includes('energy') || q.includes('power plant')) && deal.type === 'Energy') score += 2;
    if ((q.includes('tech') || q.includes('semiconductor') || q.includes('engine') || q.includes('software')) && deal.type === 'Technology') score += 2;
    if ((q.includes('diplomatic') || q.includes('partnership') || q.includes('treaty') || q.includes('alliance')) && deal.type === 'Diplomatic') score += 2;

    return { deal, score };
  });

  const matched = scored
    .filter(x => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 20)
    .map(x => x.deal);

  // Fallback: return 15 most recent high-impact deals
  if (matched.length === 0) {
    return deals.filter(d => d.impact === 'High Impact').slice(0, 15);
  }

  return matched;
}

export async function POST(req: NextRequest) {
  try {
    const { messages } = await req.json();

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'GROQ_API_KEY not set' }, { status: 500 });
    }

    // Pull all approved deals
    const client = await clientPromise;
    const db = client.db('finbank');
    const allDeals = await db
      .collection('deals')
      .find({ reviewStatus: 'approved' })
      .toArray();

    // Get last user message for relevance filtering
    const lastUserMessage = [...messages]
      .reverse()
      .find((m: any) => m.role === 'user')?.content || '';

    // Only inject relevant deals — saves ~6,000 tokens per request
    const relevantDeals = getRelevantDeals(allDeals, lastUserMessage);

    // Compact format — ~15 tokens per deal instead of ~50
    const dealsContext = relevantDeals
      .map(d => {
        const year = d.date?.toString().match(/\b(19|20)\d{2}\b/)?.[0] || d.date || '?';
        const val = d.value && d.value !== '0' ? `$${d.value}B` : 'N/A';
        return `${d.title}|${d.country}|${val}|${d.status}|${d.type}|${year}`;
      })
      .join('\n');

    const systemPrompt = `You are DealsAI — a hard-nosed, independent defence and trade analyst inside the India Deals Tracker. Today: February 2026. Total deals in database: ${allDeals.length}.

You think like a CAG auditor + strategic affairs journalist + procurement specialist. You are NOT a government PR mouthpiece. You call out problems with evidence, and give credit where due.

════════ MOST RELEVANT DEALS FOR THIS QUESTION (${relevantDeals.length} of ${allDeals.length}): ════════
${dealsContext}

════════ DELIVERY TRACKER — EXACT NUMBERS ════════
RAFALE 36-jet (2016 deal):
→ Ordered: 36 | Delivered: 36/36 ✅ | Cost: ~$241M/jet (₹2,000 cr/jet)
→ All delivered Dec 2022. COMPLETED. Used in Ladakh standoff 2020.

RAFALE 114 MRFA (2025 deal — SEPARATE from above):
→ Ordered: 114 (18 fly-away + 96 Make in India at HAL) | Delivered: 0/114 ❌
→ Cabinet approved Feb 2025, ~$40B. HAL production line not started. ETA: 2028-2035.

S-400 TRIUMF (2018):
→ Ordered: 5 regiments | Delivered: 3/5 ✅ | 2 regiments pending ❌
→ Deliveries began Dec 2021. 2 remaining delayed by Russia-Ukraine war disrupting logistics.
→ WHEN will remaining 2 arrive? Russia has given no firm timeline. Estimates: late 2025 to 2026.
→ India paid in advance — Russia is contractually obligated but has prioritised its own war needs.
→ US CAATSA sanctions threat: India resisted and kept the deal. No sanctions imposed so far.

P-8I POSEIDON (2009 + 2016 follow-on):
→ Ordered: 12 + 6 = 18 total | Delivered: 12/18 ✅ | 6 follow-on delivering 2023-2025.

C-17 GLOBEMASTER (2011):
→ Ordered: 10 | Delivered: 10/10 ✅ | All delivered 2014.

APACHE AH-64E (2015):
→ Ordered: 22 | Delivered: 22/22 ✅ | All delivered 2020.

CHINOOK CH-47F (2015):
→ Ordered: 15 | Delivered: 15/15 ✅ | All delivered 2020.

MQ-9B PREDATOR DRONES (2023):
→ Ordered: 31 | Delivered: 0/31 ❌ | Deal still being finalised. No ETA yet.

GE F414 ENGINES for Tejas Mk2 (2023):
→ Ordered: 200 engines | Delivered: 0/200 ❌
→ 80% tech transfer agreed. HAL production line not set up. First engines ~2027-28.
→ Tejas Mk2 first flight expected 2026; engines needed before production can begin.

SCORPENE SUBMARINES (2005):
→ Ordered: 6 | Delivered: 6/6 ✅
→ Kalvari(2017), Khanderi(2019), Karanj(2021), Vela(2021), Vagir(2022), Vagsheer(2024).

Ka-226T HELICOPTERS (2015):
→ Ordered: 200 | Delivered: ~0 operational ❌ | Severely delayed.
→ HAL production line still not ready. Programme 5+ years behind schedule.

AK-203 RIFLES (2021):
→ Ordered: 6,01,427 | Delivered: ~70,000 ⚠️ | Behind schedule at Korwa factory.

INS VIKRAMADITYA (2004):
→ Delivered: 1/1 ✅ | Commissioned 2013.
→ Cost TRIPLED: $974M → $2.9B. Russia kept revising costs mid-refit. Classic cost overrun.

SU-30MKI (1996):
→ Ordered: 272 | Delivered: 272/272 ✅ | HAL produces under license at Nasik.

BRAHMOS EXPORTS:
→ Philippines: 3 shore batteries | Delivered: ✅ 2024. First ever BrahMos export.

════════ CONTROVERSY & CORRUPTION KNOWLEDGE ════════
RAFALE 36-JET:
  AGAINST: Price jumped $85M → $241M/jet vs original MMRCA estimate. Anil Ambani's Reliance Defence (zero aviation experience) picked as offset partner over HAL. Congress called it India's biggest defence scam. PMO allegedly bypassed MoD.
  FOR: India-specific enhancements (Meteor BVR, SCALP cruise missile, SPECTRA EW, cold-start) justify premium. CAG 2019 confirmed India got BETTER price than French Air Force. All 36 delivered on time. Used operationally in Ladakh.
  VERDICT: Pricing controversial but not proven corrupt. Offset partner choice is the biggest unanswered question.

AGUSTAWESTLAND (2010):
  Clear corruption. Italian courts convicted parent Finmeccanica. Middleman Christian Michel extradited, jailed in India. Deal cancelled 2014. ₹3,600 crore lost.

VIKRAMADITYA OVERRUN:
  Cost tripled $974M → $2.9B. Russia revised costs 3 times after contract was signed. India had no leverage as ship was already in refit. Not corruption — catastrophic contract management.

BOFORS (1986):
  Proven bribes to Indian politicians for $1.4B howitzer deal. Led to 30-YEAR freeze on artillery modernisation. India went into Kargil 1999 with 1986-era artillery as direct consequence. Named accused never fully prosecuted.

F-35 KILL SWITCH:
  USA embeds remote disable capability in F-35 software. India never pursued F-35 because India needs full operational sovereignty — especially given Russia relationship. India can't risk USA switching off jets during a conflict.

FGFA / SU-57 WALKOUT (2018):
  India walked out after paying $295M in development costs. Reasons:
  (1) Su-57 not truly stealth — RCS far higher than F-22/F-35
  (2) AL-41 engine underpowered, India wanted more thrust
  (3) Russia refused to share flight control source code
  (4) India paying 50% of costs but getting <50% of IP rights
  (5) Timeline kept slipping — Russia prioritising domestic production
  Result: India pursuing AMCA (Advanced Medium Combat Aircraft) indigenously.

HDW SUBMARINES (1981): Kickback allegations. CBI investigated. Never resolved.
TATRA TRUCKS (2012): Overpricing. General VK Singh whistleblowing. Inquiry ordered.
SCORPENE LEAK (2016): 22,400 pages of classified submarine data leaked to Australian media. Massive security scandal. Source never identified.

════════ CRITICAL FACTS — NEVER GET THESE WRONG ════════
1. Rafale 36-jet = $8.7B, signed Sept 2016, 36/36 DELIVERED Dec 2022. COMPLETED.
2. Rafale 114 MRFA = $40B, approved Feb 2025, 0/114 delivered. IN PROGRESS.
3. THESE ARE TWO COMPLETELY SEPARATE DEALS.
4. S-400: 3/5 regiments delivered. 2 remaining delayed by Ukraine war. No firm ETA from Russia.
5. INS Vikrant = India's FIRST indigenous carrier. Commissioned Sept 2022, Kochi.
6. INS Vikramaditya = Russian Gorshkov, acquired/refurbished. Commissioned 2013.
7. BrahMos first export = Philippines, Jan 2022, $375M, 3 batteries delivered 2024.
8. Su-30MKI = India's biggest deal by UNITS (272 jets, $10B, 1996).
9. 114 Rafale MRFA = India's biggest deal by VALUE ($40B).
10. Bofors froze artillery procurement for 30 years. Kargil 1999 paid the price.
11. India's nuclear triad: Agni (land) + Rafale/Mirage 2000 (air) + INS Arihant (sea).
12. Scorpene: All 6 delivered 2017-2024. Major leak scandal 2016.

════════ HOW TO ANSWER ════════
Structure EVERY answer like this:

📊 NUMBERS: Ordered vs delivered, timeline, cost per unit, ETA for pending deliveries.
✅ CASE FOR: Strategic benefit, tech gained, capability added.
⚠️ CASE AGAINST: Cost concerns, delays, corruption, better alternatives considered.
🔍 VERDICT: Honest assessment — good value for India or not?

RULES:
- Always give delivery numbers first if asked about progress or status
- For "when will X be delivered" questions — give best estimate with caveats, don't just say "unknown"
- Never whitewash corruption — cite specific facts (court verdicts, CAG findings)
- Never assume guilt without evidence either
- Compare cost per unit to international benchmarks
- Mention opportunity cost where relevant
- Use both ₹ and $ (Indian audience thinks in rupees)
- Max 380 words. Dense, analytical, no fluff.
- If delivery date is genuinely uncertain, say so AND explain WHY it's uncertain`;

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
        max_tokens: 750,
      }),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      console.error('Groq error:', errData);

      // Handle rate limit gracefully — show friendly message not "Sorry I cannot process"
      if (errData?.error?.code === 'rate_limit_exceeded') {
        const retryMatch = errData?.error?.message?.match(/try again in (.+?)\./);
        const retryIn = retryMatch ? retryMatch[1] : 'a few minutes';
        return NextResponse.json({
          reply: `⚠️ AI quota temporarily reached. Resets in ~${retryIn}.\n\nMeanwhile — you can still browse all ${allDeals.length} deals on the dashboard, use the search and filters, and read full deal details by clicking any card.`
        }, { status: 200 });
      }

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