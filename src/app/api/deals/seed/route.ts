// app/api/deals/seed/route.ts
import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { seedDeals } from '@/lib/seed';

export async function POST() {
  try {
    const client = await clientPromise;
    const db = client.db('finbank');
    const col = db.collection('deals');

    let added = 0;
    let skipped = 0;

    for (const deal of seedDeals) {
      const exists = await col.findOne({ title: deal.title });
      if (exists) {
        skipped++;
        continue;
      }
      await col.insertOne({
        ...deal,
        reviewStatus: 'approved',
        createdAt: new Date(),
        fetchedAt: new Date(),
      });
      added++;
    }

    return NextResponse.json({
      success: true,
      added,
      skipped,
      total: seedDeals.length,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}