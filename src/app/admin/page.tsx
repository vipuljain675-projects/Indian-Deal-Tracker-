// app/admin/page.tsx
import clientPromise from '@/lib/mongodb';
import AdminPanel from '@/components/AdminPanel';

export default async function AdminPage() {
  const client = await clientPromise;
  const db = client.db('finbank');

  const [pendingDeals, allDeals] = await Promise.all([
    db.collection('deals').find({ reviewStatus: 'pending' }).sort({ fetchedAt: -1 }).toArray(),
    db.collection('deals').find({ reviewStatus: 'approved' }).toArray(),
  ]);

  const stats = {
    total: allDeals.length,
    pending: pendingDeals.length,
    byStatus: allDeals.reduce((acc: any, d: any) => {
      acc[d.status] = (acc[d.status] || 0) + 1;
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
