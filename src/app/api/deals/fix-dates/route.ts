import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';

export async function POST() {
  const client = await clientPromise;
  const db = client.db('finbank');
  
  const deals = await db.collection('deals').find({}).toArray();
  let updated = 0;

  for (const deal of deals) {
    // Extract year from date string like "February 2026" or "1962"
    const match = deal.date?.toString().match(/\b(19|20)\d{2}\b/);
    const year = match ? parseInt(match[0]) : 2000;
    
    await db.collection('deals').updateOne(
      { _id: deal._id },
      { $set: { createdAt: new Date(year, 0, 1) } }
    );
    updated++;
  }

  return NextResponse.json({ updated });
}