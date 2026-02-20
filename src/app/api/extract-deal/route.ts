// app/api/extract-deal/route.ts
// Admin pastes a news URL → AI reads it → extracts deal → saves as pending

import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { extractDealFromText, fetchArticleText } from '@/lib/dealExtractor';

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json();
    if (!url) return NextResponse.json({ error: 'URL required' }, { status: 400 });

    // Fetch article text
    const articleText = await fetchArticleText(url);
    if (!articleText) {
      return NextResponse.json({ error: 'Could not fetch article' }, { status: 400 });
    }

    // AI extraction
    const deal = await extractDealFromText(articleText, url);
    if (!deal) {
      return NextResponse.json({ error: 'Not a deal article or extraction failed' }, { status: 422 });
    }

    // Save to DB as pending
    const client = await clientPromise;
    const db = client.db('finbank');

    const result = await db.collection('deals').insertOne({
      ...deal,
      reviewStatus: 'pending',
      sourceUrl: url,
      sourceTitle: deal.title,
      fetchedAt: new Date(),
      createdAt: new Date(),
    });

    return NextResponse.json({ success: true, deal, id: result.insertedId });
  } catch (err: any) {
    if (err.code === 11000) {
      return NextResponse.json({ error: 'Deal already exists in database' }, { status: 409 });
    }
    console.error('extract-deal error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}