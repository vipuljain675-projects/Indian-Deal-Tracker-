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
  // ── Auth check ──
  // Allow if:
  // 1. Bearer token matches CRON_SECRET (manual trigger from AdminPanel)
  // 2. Request comes from Vercel Cron (has x-vercel-cron-signature header)
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET || 'dev-secret';
  const isVercelCron = req.headers.get('x-vercel-cron-signature') !== null;
  const isValidToken = authHeader === `Bearer ${cronSecret}`;
  const isDev = process.env.NODE_ENV === 'development';

  if (!isValidToken && !isVercelCron && !isDev) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const client = await clientPromise;
  const db = client.db('finbank');
  const dealsCollection = db.collection('deals');

  let totalAdded = 0;
  let totalSkipped = 0;
  let quotaExhausted = false;
  const errors: string[] = [];

  // Collect articles from all queries
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

  console.log(`Fetched ${uniqueArticles.length} articles, processing...`);

  for (const article of uniqueArticles) {
    if (quotaExhausted) {
      totalSkipped++;
      continue;
    }

    // Skip if already in DB
    const existing = await dealsCollection.findOne({ sourceUrl: article.url });
    if (existing) {
      totalSkipped++;
      continue;
    }

    const articleText = [article.title, article.description, article.content]
      .filter(Boolean)
      .join('\n\n');

    // 8 second delay between Groq calls — within free tier limits
    await sleep(8000);

    const deal = await extractDealFromText(articleText, article.url);

    if (!deal) {
      totalSkipped++;
      continue;
    }

    if ((deal as any).quotaExhausted) {
      quotaExhausted = true;
      errors.push('Groq quota exhausted — try again later');
      break;
    }

    try {
      await dealsCollection.insertOne({
        ...deal,
        reviewStatus: 'pending',   // ← ALWAYS pending — never goes live without approval
        sourceUrl: article.url,
        sourceTitle: article.title,
        fetchedAt: new Date(),
        createdAt: new Date(),
      });
      totalAdded++;
      console.log(`✅ Added to queue: ${deal.title}`);
    } catch (err: any) {
      if (err.code === 11000) {
        // Duplicate key — already exists
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