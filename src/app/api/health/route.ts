import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';

export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db('finbank');
    const count = await db.collection('deals').countDocuments({ reviewStatus: 'approved' });

    return NextResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      approvedDeals: count,
    });
  } catch (err) {
    return NextResponse.json({ status: 'unhealthy', error: String(err) }, { status: 500 });
  }
}