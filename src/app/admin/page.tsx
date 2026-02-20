// app/admin/page.tsx
import clientPromise from "@/lib/mongodb";
import AdminPanel from "@/components/AdminPanel";

// Never cache this page — always fetch fresh from MongoDB
export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  const client = await clientPromise;
  const db = client.db("finbank");

  const [pendingDeals, allDeals] = await Promise.all([
    db.collection("deals")
      .find({ reviewStatus: "pending" })
      .sort({ fetchedAt: -1 })
      .toArray(),
    db.collection("deals")
      .find({ reviewStatus: { $ne: "rejected" } })
      .toArray(),
  ]);

  const stats = {
    total: allDeals.filter((d: any) => d.reviewStatus === "approved").length,
    pending: pendingDeals.length,
    byStatus: allDeals.reduce((acc: any, deal: any) => {
      acc[deal.status] = (acc[deal.status] || 0) + 1;
      return acc;
    }, {}),
  };

  return (
    <AdminPanel
      pendingDeals={JSON.parse(JSON.stringify(pendingDeals))}
      stats={stats}
    />
  );
}
