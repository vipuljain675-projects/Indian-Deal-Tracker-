// src/app/api/scan/reddit/route.ts
//
// Scanner 4: Reddit
// Reddit has a free JSON API — no key needed, just append .json to any URL.
// Subreddits like r/india and r/geopolitics discuss deals before they hit mainstream news.
// Great for catching early signals on upcoming or rumoured deals.

import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { extractDealFromText } from '@/lib/dealExtractor';

// Subreddits to scan — all publicly accessible
const SUBREDDITS = [
  'india',
  'geopolitics',
  'IndiaInvestments',
  'worldnews',
];

// Search terms for each subreddit
// Reddit search: /r/subreddit/search.json?q=query&sort=new&limit=10
const SEARCH_QUERIES = [
  'India deal signed',
  'India defence agreement',
  'India trade billion',
  'India MoU signed',
];

// Must-have keywords for a post to be considered deal-related
const DEAL_KEYWORDS = [
  'deal', 'agreement', 'signed', 'mou', 'memorandum',
  'billion', 'crore', 'defence', 'defense', 'military',
  'trade', 'contract', 'purchase', 'import', 'export',
  'partnership', 'cooperation', 'treaty',
];

interface RedditPost {
  title: string;
  selftext: string;
  url: string;
  permalink: string;
  score: number;
  subreddit: string;
}

async function fetchRedditPosts(subreddit: string, query: string): Promise<RedditPost[]> {
  try {
    // Reddit's free JSON API — no auth needed for public subreddits
    const url = `https://www.reddit.com/r/${subreddit}/search.json?` +
      `q=${encodeURIComponent(query)}&sort=new&limit=5&restrict_sr=1`;

    const res = await fetch(url, {
      headers: {
        // Reddit requires a User-Agent
        'User-Agent': 'IndiaDealsBot/1.0 (deals tracker for research purposes)',
      },
      next: { revalidate: 0 },
    });

    if (!res.ok) {
      console.warn(`[Reddit] r/${subreddit} returned ${res.status}`);
      return [];
    }

    const data = await res.json();
    const posts = data?.data?.children || [];

    return posts.map((child: any) => ({
      title: child.data.title || '',
      selftext: child.data.selftext || '',
      url: child.data.url || '',
      permalink: `https://reddit.com${child.data.permalink}`,
      score: child.data.score || 0,
      subreddit: child.data.subreddit || subreddit,
    }));
  } catch (err) {
    console.error(`[Reddit] Error fetching r/${subreddit}:`, err);
    return [];
  }
}

function isDealRelated(title: string, text: string): boolean {
  const combined = `${title} ${text}`.toLowerCase();
  return DEAL_KEYWORDS.some(k => combined.includes(k));
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

  // Fetch from all subreddits + queries
  // Stagger requests to avoid Reddit rate limiting (1 req/sec recommended)
  const allPosts: RedditPost[] = [];
  for (const subreddit of SUBREDDITS) {
    for (const query of SEARCH_QUERIES) {
      const posts = await fetchRedditPosts(subreddit, query);
      allPosts.push(...posts);
      await sleep(1100); // Reddit rate limit: 1 request per second
    }
  }

  // Filter and deduplicate
  const dealPosts = allPosts.filter(post =>
    isDealRelated(post.title, post.selftext) && post.score > 5 // min 5 upvotes — filters spam
  );

  const seen = new Set<string>();
  const uniquePosts = dealPosts.filter(post => {
    // Use permalink as the canonical URL for Reddit posts
    if (seen.has(post.permalink)) return false;
    seen.add(post.permalink);
    return true;
  });

  console.log(`[Reddit] Found ${uniquePosts.length} deal posts from ${allPosts.length} total`);

  for (const post of uniquePosts) {
    const existing = await dealsCollection.findOne({ sourceUrl: post.permalink });
    if (existing) { totalSkipped++; continue; }

    // Combine title + post text for better extraction
    const articleText = [
      post.title,
      post.selftext || `Reddit discussion about: ${post.title}`,
    ].filter(Boolean).join('\n\n');

    await sleep(8000);

    const deal = await extractDealFromText(articleText, post.permalink);
    if (!deal) { totalSkipped++; continue; }
    if ((deal as any).quotaExhausted) {
      errors.push('Groq quota exhausted');
      break;
    }

    try {
      await dealsCollection.insertOne({
        ...deal,
        reviewStatus: 'pending',
        sourceUrl: post.permalink,
        sourceTitle: post.title,
        sourceName: `Reddit r/${post.subreddit}`,
        fetchedAt: new Date(),
        createdAt: new Date(),
      });
      totalAdded++;
      console.log(`[Reddit] ✅ Added: ${deal.title}`);
    } catch (err: any) {
      if (err.code !== 11000) errors.push(err.message);
      else totalSkipped++;
    }
  }

  return NextResponse.json({
    source: 'Reddit',
    subreddits: SUBREDDITS,
    total: allPosts.length,
    dealRelated: uniquePosts.length,
    added: totalAdded,
    skipped: totalSkipped,
    errors,
  });
}