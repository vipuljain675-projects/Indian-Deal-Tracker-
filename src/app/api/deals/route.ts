import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { seedDeals } from '@/lib/seed'; // Import your seed data

// 1. GET: Fetch all deals from DB
export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db("finbank");
    const deals = await db.collection("deals").find({}).sort({ _id: -1 }).toArray();
    return NextResponse.json(deals);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch deals" }, { status: 500 });
  }
}

// 2. POST: Create a new deal (or trigger seed)
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const client = await clientPromise;
    const db = client.db("finbank");

    // Special case: If body is empty or specific trigger, we seed the DB
    if (body.action === 'seed') {
      await db.collection("deals").deleteMany({}); // Optional: clear old data
      const result = await db.collection("deals").insertMany(seedDeals);
      return NextResponse.json({ message: `Seeded ${result.insertedCount} deals` });
    }

    const result = await db.collection("deals").insertOne(body);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: "Failed to create deal" }, { status: 500 });
  }
}

// 3. DELETE: Remove a deal by ID
export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) return NextResponse.json({ error: 'No ID provided' }, { status: 400 });

    const client = await clientPromise;
    const db = client.db("finbank");
    await db.collection("deals").deleteOne({ _id: new ObjectId(id) });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }
}

// 4. PUT: Update an existing deal
export async function PUT(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const body = await req.json();

    if (!id) return NextResponse.json({ error: 'No ID provided' }, { status: 400 });

    const { _id, ...updateData } = body; // Remove _id from update body
    const client = await clientPromise;
    const db = client.db("finbank");

    await db.collection("deals").updateOne(
      { _id: new ObjectId(id) },
      { $set: updateData }
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}