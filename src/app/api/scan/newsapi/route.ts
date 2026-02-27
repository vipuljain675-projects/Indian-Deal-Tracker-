// src/app/api/scan/newsapi/route.ts
//
// Scanner 1: NewsAPI
// Called by QStash in parallel with 3 other scanners.
// Same source as before but now runs independently — doesn't block other scanners.

import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { extractDealFromText } from '@/lib/dealExtractor';

const NEWS_QUERIES = [
  'India defence deal signed 2026',
  'India trade agreement bilateral 2026',
  'India strategic partnership signed',
  'India arms deal fighter jet submarine missile',
  'India MoU agreement ministry signed',
];

async function fetchNewsArticles(query: string): Promise<any[]> {
  const apiKey = process.env.NEWS_API_KEY;
  if (!apiKey) return [];

  const url =
    `https://newsapi.org/v2/everything?` +
    `q=${encodeURIComponent(query)}&` +
    `language=en&sortBy=publishedAt&pageSize=3&` +
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

export async function POST(req: NextRequest) {
  // Verify this came from QStash or is a valid cron call
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET || 'dev-secret';
  const isDev = process.env.NODE_ENV === 'development';

  if (!isDev && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const client = await clientPromise;
  const db = client.db('finbank');
  const dealsCollection = db.collection('deals');

  let totalAdded = 0;
  let totalSkipped = 0;
  const errors: string[] = [];

  // Fetch from all 5 queries
  const allArticles: any[] = [];
  for (const query of NEWS_QUERIES) {
    const articles = await fetchNewsArticles(query);
    allArticles.push(...articles.filter((a: any) => a.url && a.title));
    await sleep(300);
  }

  // Deduplicate by URL
  const seen = new Set<string>();
  const uniqueArticles = allArticles.filter(a => {
    if (seen.has(a.url)) return false;
    seen.add(a.url);
    return true;
  });

  console.log(`[NewsAPI] Fetched ${uniqueArticles.length} unique articles`);

  for (const article of uniqueArticles) {
    // Skip if already in DB
    const existing = await dealsCollection.findOne({ sourceUrl: article.url });
    if (existing) { totalSkipped++; continue; }

    const articleText = [article.title, article.description, article.content]
      .filter(Boolean).join('\n\n');

    await sleep(8000); // Stay within Groq free tier

    const deal = await extractDealFromText(articleText, article.url);
    if (!deal) { totalSkipped++; continue; }
    if ((deal as any).quotaExhausted) {
      errors.push('Groq quota exhausted');
      break;
    }

    try {
      await dealsCollection.insertOne({
        ...deal,
        reviewStatus: 'pending',
        sourceUrl: article.url,
        sourceTitle: article.title,
        sourceName: 'NewsAPI',
        fetchedAt: new Date(),
        createdAt: new Date(),
      });
      totalAdded++;
      console.log(`[NewsAPI] ✅ Added: ${deal.title}`);
    } catch (err: any) {
      if (err.code !== 11000) errors.push(err.message);
      else totalSkipped++;
    }
  }

  return NextResponse.json({
    source: 'NewsAPI',
    added: totalAdded,
    skipped: totalSkipped,
    errors,
  });
}