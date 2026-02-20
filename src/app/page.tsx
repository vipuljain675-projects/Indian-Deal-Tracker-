import clientPromise from "@/lib/mongodb";
import DealsList from "@/components/DealsList";
import StatCard from "@/components/StatCard";

export const dynamic = 'force-dynamic';

// Extract year from strings like "February 2026", "2016", "March 2019"
function extractYear(dateStr: string): number {
  if (!dateStr) return 0;
  const match = dateStr.toString().match(/\b(19|20)\d{2}\b/);
  return match ? parseInt(match[0]) : 0;
}

export default async function Home() {
  const client = await clientPromise;
  const db = client.db("finbank");

  // Only fetch approved deals
  const deals = await db
    .collection("deals")
    .find({ reviewStatus: "approved" })
    .toArray();

  const serializedDeals = JSON.parse(JSON.stringify(deals));

  // Sort by year descending (2026 first, 1947 last)
  // For same year, newer createdAt comes first
  const sortedDeals = serializedDeals.sort((a: any, b: any) => {
    const yearA = extractYear(a.date);
    const yearB = extractYear(b.date);
    if (yearB !== yearA) return yearB - yearA;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  // --- DYNAMIC CALCULATIONS ---
  const total = sortedDeals.length;

  const uniqueCountries = new Set(sortedDeals.map((d: any) => d.country)).size;

  const totalValue = sortedDeals.reduce((sum: number, deal: any) => {
    const val = parseFloat((deal.value || '0').toString().replace(/[^0-9.]/g, '')) || 0;
    return sum + val;
  }, 0);

  const partnerCounts = sortedDeals.reduce((acc: any, deal: any) => {
    if (deal.country) acc[deal.country] = (acc[deal.country] || 0) + 1;
    return acc;
  }, {});

  const topPartners = Object.entries(partnerCounts)
    .sort(([, a]: any, [, b]: any) => b - a)
    .slice(0, 5);

  const typeCounts = sortedDeals.reduce((acc: any, deal: any) => {
    if (deal.type) acc[deal.type] = (acc[deal.type] || 0) + 1;
    return acc;
  }, {});

  const sortedTypes = Object.entries(typeCounts).sort(
    ([, a]: any, [, b]: any) => b - a
  );

  return (
    <div className="container dashboard-layout">
      <div className="main-content">
        <header className="hero-section">
          <h1>🇮🇳 India Deals Tracker</h1>
          <p>Defence, Trade & Strategic deals — all in one place</p>
        </header>

        <div className="stats-grid">
          <StatCard label="Total Deals" value={total} icon="📊" />
          <StatCard label="Defence Deals" value={typeCounts['Defense Acquisition'] || 0} icon="🛡️" />
          <StatCard label="Total Value" value={`$${totalValue.toFixed(1)}B`} icon="💰" description="Estimated USD" />
          <StatCard label="Partner Nations" value={uniqueCountries} icon="🌐" description={`${total} deals signed`} />
        </div>

        <DealsList initialDeals={sortedDeals} />
      </div>

      <aside className="sidebar-right">
        <div className="sidebar-card">
          <h3>Deal Types</h3>
          {sortedTypes.map(([type, count]: [string, any]) => (
            <div key={type} className="percentage-item">
              <div className="percentage-label">
                <span>{type}</span>
                <span>{Math.round((count / total) * 100)}%</span>
              </div>
              <div className="progress-bar">
                <div
                  className="progress-fill"
                  style={{ width: `${(count / total) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>

        <div className="sidebar-card" style={{ marginTop: '1.5rem' }}>
          <h3>Top Partners</h3>
          {topPartners.map(([country, count]: any) => (
            <div key={country} className="partner-row">
              <span>{country}</span>
              <span className="partner-badge">{count} deals</span>
            </div>
          ))}
        </div>
      </aside>
    </div>
  );
}