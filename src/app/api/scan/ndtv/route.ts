// src/app/api/scan/ndtv/route.ts
//
// Scanner 2: NDTV RSS Feed
// No API key needed — NDTV publishes free RSS feeds.
// Covers Indian news that NewsAPI often misses.

import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { extractDealFromText } from '@/lib/dealExtractor';

// NDTV RSS feeds — all free, no auth needed
const NDTV_RSS_FEEDS = [
  'https://feeds.feedburner.com/ndtvnews-india-news',
  'https://feeds.feedburner.com/ndtvnews-world-news',
  'https://feeds.feedburner.com/ndtvnews-business',
];

// Keywords that indicate this article might be about a deal
const DEAL_KEYWORDS = [
  'deal', 'agreement', 'treaty', 'mou', 'memorandum',
  'signed', 'billion', 'defence', 'defense', 'military',
  'trade', 'partnership', 'cooperation', 'contract',
  'purchase', 'acquisition', 'import', 'export',
];

interface RSSItem {
  title: string;
  description: string;
  link: string;
  pubDate: string;
}

async function fetchRSSFeed(url: string): Promise<RSSItem[]> {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; IndiaDealsBot/1.0)' },
      next: { revalidate: 0 },
    });

    if (!res.ok) return [];
    const xml = await res.text();

    // Parse RSS XML manually — no library needed
    const items: RSSItem[] = [];
    const itemMatches = xml.matchAll(/<item>([\s\S]*?)<\/item>/g);

    for (const match of itemMatches) {
      const item = match[1];

      const title = item.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/)?.[1] ||
        item.match(/<title>(.*?)<\/title>/)?.[1] || '';

      const description = item.match(/<description><!\[CDATA\[(.*?)\]\]><\/description>/)?.[1] ||
        item.match(/<description>(.*?)<\/description>/)?.[1] || '';

      const link = item.match(/<link>(.*?)<\/link>/)?.[1] ||
        item.match(/<guid>(.*?)<\/guid>/)?.[1] || '';

      const pubDate = item.match(/<pubDate>(.*?)<\/pubDate>/)?.[1] || '';

      if (title && link) {
        items.push({ title, description, link, pubDate });
      }
    }

    return items;
  } catch (err) {
    console.error(`[NDTV] RSS fetch error for ${url}:`, err);
    return [];
  }
}

function isDealRelated(title: string, description: string): boolean {
  const text = `${title} ${description}`.toLowerCase();
  return DEAL_KEYWORDS.some(keyword => text.includes(keyword));
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function POST(req: NextRequest) {
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

  // Fetch all RSS feeds
  const allItems: RSSItem[] = [];
  for (const feed of NDTV_RSS_FEEDS) {
    const items = await fetchRSSFeed(feed);
    allItems.push(...items);
  }

  // Filter to only deal-related articles
  const dealItems = allItems.filter(item =>
    isDealRelated(item.title, item.description)
  );

  // Deduplicate by URL
  const seen = new Set<string>();
  const uniqueItems = dealItems.filter(item => {
    if (seen.has(item.link)) return false;
    seen.add(item.link);
    return true;
  });

  console.log(`[NDTV] Found ${uniqueItems.length} deal-related articles from ${allItems.length} total`);

  for (const item of uniqueItems) {
    // Skip if already in DB
    const existing = await dealsCollection.findOne({ sourceUrl: item.link });
    if (existing) { totalSkipped++; continue; }

    const articleText = [item.title, item.description].filter(Boolean).join('\n\n');

    await sleep(8000); // Groq rate limit

    const deal = await extractDealFromText(articleText, item.link);
    if (!deal) { totalSkipped++; continue; }
    if ((deal as any).quotaExhausted) {
      errors.push('Groq quota exhausted');
      break;
    }

    try {
      await dealsCollection.insertOne({
        ...deal,
        reviewStatus: 'pending',
        sourceUrl: item.link,
        sourceTitle: item.title,
        sourceName: 'NDTV',
        fetchedAt: new Date(),
        createdAt: new Date(),
      });
      totalAdded++;
      console.log(`[NDTV] ✅ Added: ${deal.title}`);
    } catch (err: any) {
      if (err.code !== 11000) errors.push(err.message);
      else totalSkipped++;
    }
  }

  return NextResponse.json({
    source: 'NDTV RSS',
    total: allItems.length,
    dealRelated: uniqueItems.length,
    added: totalAdded,
    skipped: totalSkipped,
    errors,
  });
}