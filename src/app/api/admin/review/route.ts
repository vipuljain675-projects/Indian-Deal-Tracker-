// app/api/admin/review/route.ts
// Approve or reject a pending deal

import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export async function POST(req: NextRequest) {
  try {
    const { id, action } = await req.json(); // action: 'approve' | 'reject'
    if (!id || !action) {
      return NextResponse.json({ error: 'id and action required' }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db('finbank');

    await db.collection('deals').updateOne(
      { _id: new ObjectId(id) },
      { $set: { reviewStatus: action === 'approve' ? 'approved' : 'rejected' } }
    );

    return NextResponse.json({ success: true, action });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}