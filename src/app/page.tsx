import clientPromise from "@/lib/mongodb";
import DealsList from "@/components/DealsList";
import StatCard from "@/components/StatCard";

export default async function Home() {
  const client = await clientPromise;
  const db = client.db("finbank");
  const deals = await db.collection("deals").find({}).toArray();
  const serializedDeals = JSON.parse(JSON.stringify(deals));

  // --- DYNAMIC CALCULATIONS ---
  const total = serializedDeals.length;
  
  // Dynamic Partner Nations count
  const uniqueCountries = new Set(serializedDeals.map((d: any) => d.country)).size;
  
  // Dynamic Total Value calculation
  const totalValue = serializedDeals.reduce((sum: number, deal: any) => {
    // Regex to extract numbers from strings like "$40B" or "23b dol"
    const val = parseFloat(deal.value.replace(/[^0-9.]/g, '')) || 0;
    return sum + val;
  }, 0);

  // Top Partners calculation
  const partnerCounts = serializedDeals.reduce((acc: any, deal: any) => {
    acc[deal.country] = (acc[deal.country] || 0) + 1;
    return acc;
  }, {});
  const topPartners = Object.entries(partnerCounts)
    .sort(([, a]: any, [, b]: any) => b - a)
    .slice(0, 5);

  const typeCounts = serializedDeals.reduce((acc: any, deal: any) => {
    acc[deal.type] = (acc[deal.type] || 0) + 1;
    return acc;
  }, {});

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

        <DealsList initialDeals={serializedDeals} />
      </div>

      <aside className="sidebar-right">
        {/* Deal Types Breakdown */}
        <div className="sidebar-card">
          <h3>Deal Types</h3>
          {Object.entries(typeCounts).map(([type, count]: [string, any]) => (
            <div key={type} className="percentage-item">
              <div className="percentage-label">
                <span>{type}</span>
                <span>{Math.round((count / total) * 100)}%</span>
              </div>
              <div className="progress-bar"><div className="progress-fill" style={{ width: `${(count / total) * 100}%` }}></div></div>
            </div>
          ))}
        </div>

        {/* NEW: Top Partners Sidebar Section */}
        <div className="sidebar-card" style={{marginTop: '1.5rem'}}>
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