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

  // Get top 5 deals by value for featured section
  const featuredDeals = [...serializedDeals]
    .sort((a: any, b: any) => {
      const valA = parseFloat((a.value || '0').toString().replace(/[^0-9.]/g, '')) || 0;
      const valB = parseFloat((b.value || '0').toString().replace(/[^0-9.]/g, '')) || 0;
      return valB - valA;
    })
    .slice(0, 5);

  return (
    <div className="container dashboard-layout">
      <div className="main-content">
        <header className="hero-section">
          <h1>🇮🇳 India Deals Tracker</h1>
          <p>Defence, Trade & Strategic deals — all in one place</p>
          <div style={{ marginTop: '1rem', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <a href="/analytics" style={{ padding: '0.5rem 1rem', background: 'var(--primary)', color: 'white', textDecoration: 'none', borderRadius: '8px', fontSize: '0.875rem', fontWeight: 600 }}>📊 View Analytics</a>
            <a href="/compare" style={{ padding: '0.5rem 1rem', background: 'white', color: 'var(--primary)', textDecoration: 'none', borderRadius: '8px', fontSize: '0.875rem', fontWeight: 600, border: '1.5px solid var(--primary)' }}>⚖️ Compare Deals</a>
          </div>
        </header>

        <div className="stats-grid">
          <StatCard label="Total Deals" value={total} icon="📊" />
          <StatCard label="Defence Deals" value={typeCounts['Defense Acquisition'] || 0} icon="🛡️" />
          <StatCard label="Total Value" value={`$${totalValue.toFixed(1)}B`} icon="💰" description="Estimated USD" />
          <StatCard label="Partner Nations" value={uniqueCountries} icon="🌐" description={`${total} deals signed`} />
        </div>

        {/* Featured Deals Section */}
        {featuredDeals.length > 0 && (
          <div style={{ marginBottom: '2rem', background: 'white', padding: '1.5rem', borderRadius: '16px', border: '1px solid var(--border)' }}>
            <h2 style={{ margin: '0 0 1rem 0', color: 'var(--primary)', fontSize: '1.3rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              ⭐ Top 5 Deals by Value
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
              {featuredDeals.map((deal: any, idx: number) => {
                const value = parseFloat((deal.value || '0').toString().replace(/[^0-9.]/g, '')) || 0;
                const year = deal.date?.toString().match(/\b(19|20)\d{2}\b/)?.[0] || '';
                return (
                  <div
                    key={deal._id}
                    style={{
                      padding: '1rem',
                      background: '#f8fafc',
                      border: '1px solid var(--border)',
                      borderRadius: '10px',
                      borderLeft: '4px solid var(--primary)',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                      <span style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--primary)' }}>#{idx + 1}</span>
                      {value > 0 && (
                        <span style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--primary)' }}>${value.toFixed(1)}B</span>
                      )}
                    </div>
                    <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-main)', lineHeight: 1.3 }}>
                      {deal.title}
                    </h3>
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      <span>{deal.country}</span>
                      {year && <span>• {year}</span>}
                      <span>• {deal.type}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

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