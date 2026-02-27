// src/app/api/scan/reuters/route.ts
//
// Scanner 3: Reuters India RSS
// Reuters publishes free RSS feeds covering India business and world news.
// International perspective on Indian deals — different angle from NDTV.

import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { extractDealFromText } from '@/lib/dealExtractor';

// Reuters RSS feeds — free, no auth needed
const REUTERS_RSS_FEEDS = [
  'https://feeds.reuters.com/reuters/INtopNews',     // India top news
  'https://feeds.reuters.com/reuters/businessNews',  // Global business
  'https://feeds.reuters.com/reuters/worldNews',     // World news
];

// India-specific keywords to filter Reuters articles
const INDIA_DEAL_KEYWORDS = [
  'india', 'indian', 'modi', 'new delhi',
  'deal', 'agreement', 'signed', 'billion',
  'defence', 'defense', 'military', 'trade',
  'partnership', 'contract', 'purchase', 'mou',
  'weapon', 'fighter', 'submarine', 'missile',
  'rafale', 's-400', 'brahmos',
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

    if (!res.ok) {
      // Try alternative Reuters feed format
      console.warn(`[Reuters] Feed ${url} returned ${res.status}`);
      return [];
    }

    const xml = await res.text();
    const items: RSSItem[] = [];
    const itemMatches = xml.matchAll(/<item>([\s\S]*?)<\/item>/g);

    for (const match of itemMatches) {
      const item = match[1];

      const title = item.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/)?.[1] ||
        item.match(/<title>(.*?)<\/title>/)?.[1] || '';

      const description = item.match(/<description><!\[CDATA\[(.*?)\]\]><\/description>/)?.[1] ||
        item.match(/<description>(.*?)<\/description>/)?.[1] || '';

      const link = item.match(/<link>(.*?)<\/link>/)?.[1] ||
        item.match(/<guid isPermaLink="true">(.*?)<\/guid>/)?.[1] || '';

      const pubDate = item.match(/<pubDate>(.*?)<\/pubDate>/)?.[1] || '';

      if (title && link) {
        items.push({ title, description, link, pubDate });
      }
    }

    return items;
  } catch (err) {
    console.error(`[Reuters] Error fetching ${url}:`, err);
    return [];
  }
}

function isIndiaDealRelated(title: string, description: string): boolean {
  const text = `${title} ${description}`.toLowerCase();
  // Must mention India AND a deal keyword
  const hasIndia = ['india', 'indian', 'modi', 'new delhi'].some(k => text.includes(k));
  const hasDeal = ['deal', 'agreement', 'signed', 'billion', 'defence',
    'defense', 'military', 'trade', 'contract', 'mou', 'purchase'].some(k => text.includes(k));
  return hasIndia && hasDeal;
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

  // Fetch all Reuters feeds
  const allItems: RSSItem[] = [];
  for (const feed of REUTERS_RSS_FEEDS) {
    const items = await fetchRSSFeed(feed);
    allItems.push(...items);
  }

  // Filter to India deal articles only
  const dealItems = allItems.filter(item =>
    isIndiaDealRelated(item.title, item.description)
  );

  // Deduplicate
  const seen = new Set<string>();
  const uniqueItems = dealItems.filter(item => {
    if (seen.has(item.link)) return false;
    seen.add(item.link);
    return true;
  });

  console.log(`[Reuters] Found ${uniqueItems.length} India deal articles from ${allItems.length} total`);

  for (const item of uniqueItems) {
    const existing = await dealsCollection.findOne({ sourceUrl: item.link });
    if (existing) { totalSkipped++; continue; }

    const articleText = [item.title, item.description].filter(Boolean).join('\n\n');

    await sleep(8000);

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
        sourceName: 'Reuters',
        fetchedAt: new Date(),
        createdAt: new Date(),
      });
      totalAdded++;
      console.log(`[Reuters] ✅ Added: ${deal.title}`);
    } catch (err: any) {
      if (err.code !== 11000) errors.push(err.message);
      else totalSkipped++;
    }
  }

  return NextResponse.json({
    source: 'Reuters RSS',
    total: allItems.length,
    dealRelated: uniqueItems.length,
    added: totalAdded,
    skipped: totalSkipped,
    errors,
  });
}