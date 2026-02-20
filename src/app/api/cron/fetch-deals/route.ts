// app/api/cron/fetch-deals/route.ts
import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { extractDealFromText } from '@/lib/dealExtractor';

const NEWS_QUERIES = [
  'India defence deal signed 2025',
  'India trade agreement bilateral 2025',
  'India strategic partnership signed',
  'India arms deal fighter jet submarine',
];

async function fetchNewsArticles(query: string): Promise<any[]> {
  const apiKey = process.env.NEWS_API_KEY;
  if (!apiKey) return [];

  const url =
    `https://newsapi.org/v2/everything?` +
    `q=${encodeURIComponent(query)}&` +
    `language=en&sortBy=publishedAt&pageSize=2&` +
    `apiKey=${apiKey}`;

  try {
    const res = await fetch(url);
    const data = await res.json();
    return data.articles || [];
  } catch (err) {
    console.error('NewsAPI error:', err);
    return [];
  }
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET || 'dev-secret';

  if (
    authHeader !== `Bearer ${cronSecret}` &&
    req.headers.get('x-vercel-cron-signature') === null &&
    process.env.NODE_ENV !== 'development'
  ) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const client = await clientPromise;
  const db = client.db('finbank');
  const dealsCollection = db.collection('deals');

  let totalAdded = 0;
  let totalSkipped = 0;
  let quotaExhausted = false;
  const errors: string[] = [];

  // Collect articles
  const allArticles: any[] = [];
  for (const query of NEWS_QUERIES) {
    const articles = await fetchNewsArticles(query);
    allArticles.push(...articles.filter((a: any) => a.url && a.title));
    await sleep(300);
  }

  console.log(`Fetched ${allArticles.length} articles, processing...`);

  for (const article of allArticles) {
    // Stop if Gemini quota is exhausted — no point continuing
    if (quotaExhausted) {
      totalSkipped++;
      continue;
    }

    // Skip duplicates
    const existing = await dealsCollection.findOne({ sourceUrl: article.url });
    if (existing) {
      totalSkipped++;
      continue;
    }

    const articleText = [article.title, article.description, article.content]
      .filter(Boolean)
      .join('\n\n');

    // 8 second delay between Gemini calls — well within 15 req/min limit
    await sleep(8000);

    const deal = await extractDealFromText(articleText, article.url);
    if (!deal) {
      totalSkipped++;
      continue;
    }

    // Check if extraction returned a quota error signal
    if ((deal as any).quotaExhausted) {
      quotaExhausted = true;
      errors.push('Gemini daily quota exhausted — try again tomorrow');
      break;
    }

    try {
      await dealsCollection.insertOne({
        ...deal,
        reviewStatus: 'pending',
        sourceUrl: article.url,
        sourceTitle: article.title,
        fetchedAt: new Date(),
        createdAt: new Date(),
      });
      totalAdded++;
      console.log(`✅ Added: ${deal.title}`);
    } catch (err: any) {
      if (err.code === 11000) {
        totalSkipped++;
      } else {
        errors.push(`${article.title}: ${err.message}`);
      }
    }
  }

  return NextResponse.json({
    success: true,
    added: totalAdded,
    skipped: totalSkipped,
    quotaExhausted,
    errors,
    timestamp: new Date().toISOString(),
  });
}