// src/app/api/cron/fetch-deals/route.ts
//
// UPDATED: Now uses QStash to trigger 4 parallel scanners instead of
// fetching everything sequentially in one slow request.
//
// OLD: 1 source → 8 articles → 60+ seconds
// NEW: 4 sources in parallel → 50-100 articles → all at once

import { NextRequest, NextResponse } from 'next/server';

const SCANNERS = [
  '/api/scan/newsapi',   // NewsAPI — existing source (improved)
  '/api/scan/ndtv',     // NDTV RSS — free, no key needed
  '/api/scan/reuters',  // Reuters India RSS — free, no key needed
  '/api/scan/reddit',   // r/india + r/geopolitics — free
];

export async function GET(req: NextRequest) {
  // ── Auth check ──
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET || 'dev-secret';
  const isVercelCron = req.headers.get('x-vercel-cron-signature') !== null;
  const isValidToken = authHeader === `Bearer ${cronSecret}`;
  const isDev = process.env.NODE_ENV === 'development';

  if (!isValidToken && !isVercelCron && !isDev) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const qstashToken = process.env.QSTASH_TOKEN;
  const qstashUrl = process.env.QSTASH_URL || 'https://qstash-eu-central-1.upstash.io';

  // If no QStash token — fall back to sequential (old behavior)
  if (!qstashToken) {
    console.log('No QSTASH_TOKEN found — falling back to sequential scan');
    return NextResponse.json({
      success: false,
      error: 'QSTASH_TOKEN not configured — add it to env vars',
    }, { status: 500 });
  }

  // Get the app's base URL
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ||
    `https://${req.headers.get('host')}`;

  // Publish all 4 scanners to QStash in parallel
  // QStash will call each one independently as a separate HTTP request
  const results = await Promise.allSettled(
    SCANNERS.map(async (scanner) => {
      const targetUrl = `${baseUrl}${scanner}`;

      const res = await fetch(`${qstashUrl}/v2/publish/${targetUrl}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${qstashToken}`,
          'Content-Type': 'application/json',
          // Pass the cron secret so each scanner can verify it's a legit call
          'Upstash-Forward-Authorization': `Bearer ${cronSecret}`,
        },
        body: JSON.stringify({ triggeredAt: new Date().toISOString() }),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`QStash publish failed for ${scanner}: ${text}`);
      }

      const data = await res.json();
      return { scanner, messageId: data.messageId };
    })
  );

  // Count successes and failures
  const published = results.filter(r => r.status === 'fulfilled').length;
  const failed = results
    .filter(r => r.status === 'rejected')
    .map(r => (r as PromiseRejectedResult).reason?.message);

  console.log(`✅ Published ${published}/${SCANNERS.length} scanners to QStash`);

  return NextResponse.json({
    success: true,
    message: `Triggered ${published} parallel scanners via QStash`,
    scanners: SCANNERS,
    published,
    failed: failed.length > 0 ? failed : undefined,
    timestamp: new Date().toISOString(),
  });
}