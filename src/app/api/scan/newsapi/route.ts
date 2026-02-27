// src/app/api/scan/newsapi/route.ts
import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { extractDealFromText, fetchArticleText } from '@/lib/dealExtractor';

const NEWS_QUERIES = [
  'India defence deal signed 2026',
  'India trade agreement bilateral 2026',
  'India strategic partnership signed 2026',
  'India arms deal fighter jet submarine missile',
  'India MoU agreement signed billion',
  'India defence ministry contract 2025',
];

async function fetchNewsArticles(query: string): Promise<any[]> {
  const apiKey = process.env.NEWS_API_KEY;
  if (!apiKey) return [];
  const url = `https://newsapi.org/v2/everything?q=${encodeURIComponent(query)}&language=en&sortBy=publishedAt&pageSize=3&apiKey=${apiKey}`;
  try {
    const res = await fetch(url);
    const data = await res.json();
    if (data.status === 'error') { console.log(`[NewsAPI] Error: ${data.message}`); return []; }
    console.log(`[NewsAPI] "${query}" → ${data.articles?.length || 0} articles`);
    return data.articles || [];
  } catch (err) { console.error('[NewsAPI] fetch error:', err); return []; }
}

function sleep(ms: number) { return new Promise(resolve => setTimeout(resolve, ms)); }

export async function GET(req: NextRequest) { return handle(req); }
export async function POST(req: NextRequest) { return handle(req); }

async function handle(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET || 'dev-secret';
  const isDev = process.env.NODE_ENV === 'development';
  if (!isDev && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const client = await clientPromise;
  const db = client.db('finbank');
  const dealsCollection = db.collection('deals');
  let totalAdded = 0, totalSkipped = 0;
  const errors: string[] = [];

  const allArticles: any[] = [];
  for (const query of NEWS_QUERIES) {
    const articles = await fetchNewsArticles(query);
    allArticles.push(...articles.filter((a: any) => a.url && a.title));
    await sleep(300);
  }

  const seen = new Set<string>();
  const uniqueArticles = allArticles.filter(a => {
    if (seen.has(a.url)) return false;
    seen.add(a.url); return true;
  });

  console.log(`[NewsAPI] ${uniqueArticles.length} unique articles`);

  for (const article of uniqueArticles) {
    const existing = await dealsCollection.findOne({ sourceUrl: article.url });
    if (existing) { totalSkipped++; continue; }

    // Try to fetch full article text — gives Groq much more context
    let articleText = [article.title, article.description, article.content].filter(Boolean).join('\n\n');
    try {
      const fullText = await fetchArticleText(article.url);
      if (fullText && fullText.length > articleText.length) articleText = fullText;
    } catch (_) {}

    console.log(`[NewsAPI] Extracting: ${article.title}`);
    await sleep(8000);

    const deal = await extractDealFromText(articleText, article.url);
    if (!deal) { totalSkipped++; console.log(`[NewsAPI] Not a deal: ${article.title}`); continue; }
    if ((deal as any).quotaExhausted) { errors.push('Groq quota exhausted'); break; }

    try {
      await dealsCollection.insertOne({
        ...deal, reviewStatus: 'pending',
        sourceUrl: article.url, sourceTitle: article.title,
        sourceName: 'NewsAPI', fetchedAt: new Date(), createdAt: new Date(),
      });
      totalAdded++;
      console.log(`[NewsAPI] ✅ Added: ${deal.title}`);
    } catch (err: any) {
      if (err.code !== 11000) errors.push(err.message); else totalSkipped++;
    }
  }

  return NextResponse.json({ source: 'NewsAPI', fetched: uniqueArticles.length, added: totalAdded, skipped: totalSkipped, errors });
}