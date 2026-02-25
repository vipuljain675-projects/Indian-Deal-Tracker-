'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Deal {
  _id: string;
  title: string;
  country: string;
  value: string;
  status: string;
  type: string;
  impact: string;
  date: string;
  reviewStatus?: 'approved' | 'pending' | 'rejected';
}

const TYPE_COLORS: Record<string, string> = {
  'Defense Acquisition': '#0f172a',
  'Trade': '#f97316',
  'Technology': '#6366f1',
  'Energy': '#10b981',
  'Diplomatic': '#3b82f6',
};

export default function AnalyticsPage() {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedView, setSelectedView] = useState<'timeline' | 'country' | 'value' | 'type'>('timeline');
  const [hoveredBar, setHoveredBar] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/deals')
      .then(res => res.json())
      .then(data => {
        setDeals((data as Deal[]).filter(d => d.reviewStatus === 'approved'));
        setLoading(false);
      });
  }, []);

  const extractYear = (dateStr: string): number => {
    if (!dateStr) return 0;
    const match = dateStr.toString().match(/\b(19|20)\d{2}\b/);
    return match ? parseInt(match[0]) : 0;
  };

  const parseValue = (value: string): number => {
    if (!value || value === '0') return 0;
    return parseFloat(value.toString().replace(/[^0-9.]/g, '')) || 0;
  };

  const formatB = (val: number) => val >= 100 ? `$${val.toFixed(0)}B` : val >= 10 ? `$${val.toFixed(0)}B` : `$${val.toFixed(1)}B`;

  // Timeline: deals by decade
  const timelineData = deals.reduce((acc: any, deal) => {
    const year = extractYear(deal.date);
    if (year === 0) return acc;
    const decade = Math.floor(year / 10) * 10;
    if (!acc[decade]) acc[decade] = { count: 0, value: 0 };
    acc[decade].count++;
    acc[decade].value += parseValue(deal.value);
    return acc;
  }, {});

  const timelineEntries = Object.entries(timelineData)
    .map(([decade, data]: [string, any]) => ({ decade: parseInt(decade), count: data.count, value: data.value }))
    .sort((a, b) => a.decade - b.decade);

  // Country distribution
  const countryData = deals.reduce((acc: any, deal) => {
    const country = deal.country || 'Unknown';
    if (!acc[country]) acc[country] = { count: 0, value: 0 };
    acc[country].count++;
    acc[country].value += parseValue(deal.value);
    return acc;
  }, {});

  const topCountries = Object.entries(countryData)
    .map(([country, data]: [string, any]) => ({ country, count: data.count, value: data.value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 10);

  // Value trends by year (2000+)
  const valueTrends = deals.reduce((acc: any, deal) => {
    const year = extractYear(deal.date);
    if (year < 2000) return acc;
    if (!acc[year]) acc[year] = { value: 0, count: 0, deals: [] };
    acc[year].value += parseValue(deal.value);
    acc[year].count++;
    acc[year].deals.push(deal.title);
    return acc;
  }, {});

  const trendEntries = Object.entries(valueTrends)
    .map(([year, data]: [string, any]) => ({ year: parseInt(year), ...data }))
    .sort((a, b) => a.year - b.year);

  const maxTrendValue = Math.max(...trendEntries.map(t => t.value), 1);

  // Type distribution
  const typeData = deals.reduce((acc: any, deal) => {
    const type = deal.type || 'Unknown';
    if (!acc[type]) acc[type] = { count: 0, value: 0 };
    acc[type].count++;
    acc[type].value += parseValue(deal.value);
    return acc;
  }, {});

  const typeEntries = Object.entries(typeData)
    .map(([type, data]: [string, any]) => ({ type, count: data.count, value: data.value }))
    .sort((a, b) => b.value - a.value);

  const totalDealsValue = deals.reduce((sum, d) => sum + parseValue(d.value), 0);
  const defenceDeals = deals.filter(d => d.type === 'Defense Acquisition');
  const defenceValue = defenceDeals.reduce((sum, d) => sum + parseValue(d.value), 0);

  if (loading) {
    return (
      <div style={{ padding: '4rem', textAlign: 'center' }}>
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📊</div>
        <p style={{ color: '#64748b' }}>Loading analytics...</p>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      {/* Navbar */}
      <nav style={{ background: 'white', padding: '1rem 2rem', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Link href="/" style={{ fontWeight: 'bold', fontSize: '1.2rem', textDecoration: 'none', color: 'var(--primary)' }}>🇮🇳 DealTracker</Link>
        <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
          <Link href="/" style={{ textDecoration: 'none', color: 'var(--text-main)', fontSize: '0.95rem' }}>Dashboard</Link>
          <Link href="/analytics" style={{ textDecoration: 'none', color: 'var(--primary)', fontWeight: 700, fontSize: '0.95rem' }}>Analytics</Link>
          <Link href="/compare" style={{ textDecoration: 'none', color: 'var(--text-main)', fontSize: '0.95rem' }}>Compare</Link>
          <Link href="/admin" style={{ textDecoration: 'none', color: 'var(--accent)', fontSize: '0.95rem' }}>Admin</Link>
        </div>
      </nav>

      <div style={{ padding: '2rem', maxWidth: '1300px', margin: '0 auto' }}>

        {/* Header */}
        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '2.2rem', color: 'var(--primary)', margin: '0 0 0.4rem 0' }}>📊 Analytics</h1>
          <p style={{ color: 'var(--text-muted)', margin: 0 }}>Deep insights into India's {deals.length} strategic deals since 1947</p>
        </div>

        {/* Top KPI Strip */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
          {[
            { icon: '📋', label: 'Total Deals', value: deals.length.toString(), sub: 'since 1947' },
            { icon: '💰', label: 'Total Value', value: formatB(totalDealsValue), sub: 'estimated USD' },
            { icon: '🛡️', label: 'Defence Value', value: formatB(defenceValue), sub: `${defenceDeals.length} deals` },
            { icon: '🌍', label: 'Partners', value: new Set(deals.map(d => d.country)).size.toString(), sub: 'nations' },
            { icon: '📈', label: 'Avg Value', value: formatB(totalDealsValue / deals.length), sub: 'per deal' },
            { icon: '✅', label: 'Completed', value: deals.filter(d => d.status === 'Completed').length.toString(), sub: 'deals done' },
          ].map(kpi => (
            <div key={kpi.label} style={{ background: 'white', padding: '1.25rem', borderRadius: '12px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
              <div style={{ fontSize: '1.5rem', marginBottom: '0.4rem' }}>{kpi.icon}</div>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--primary)', lineHeight: 1 }}>{kpi.value}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.3rem', fontWeight: 600 }}>{kpi.label}</div>
              <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>{kpi.sub}</div>
            </div>
          ))}
        </div>

        {/* View Tabs */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
          {([
            { key: 'timeline', label: '📅 By Decade' },
            { key: 'country', label: '🌍 Countries' },
            { key: 'value', label: '💰 Value Trends' },
            { key: 'type', label: '📦 Deal Types' },
          ] as const).map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setSelectedView(key)}
              style={{
                padding: '0.65rem 1.25rem',
                borderRadius: '10px',
                background: selectedView === key ? 'var(--primary)' : 'white',
                color: selectedView === key ? 'white' : 'var(--text-main)',
                fontWeight: 600,
                cursor: 'pointer',
                border: selectedView === key ? 'none' : '1.5px solid #e2e8f0',
                fontSize: '0.9rem',
                transition: 'all 0.2s',
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {/* ── TIMELINE VIEW ── */}
        {selectedView === 'timeline' && (
          <div style={{ background: 'white', padding: '2rem', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ margin: 0, color: 'var(--primary)', fontSize: '1.3rem' }}>Deals by Decade</h2>
              <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.8rem' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <span style={{ width: '12px', height: '12px', borderRadius: '2px', background: 'var(--primary)', display: 'inline-block' }} />
                  Total Value ($B)
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <span style={{ width: '12px', height: '12px', borderRadius: '2px', background: '#f97316', display: 'inline-block' }} />
                  Deal Count
                </span>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {timelineEntries.map(({ decade, count, value }) => {
                const maxVal = Math.max(...timelineEntries.map(t => t.value), 1);
                const maxCnt = Math.max(...timelineEntries.map(t => t.count), 1);
                return (
                  <div key={decade}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                      <span style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '1rem' }}>{decade}s</span>
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                        {count} deals · <strong style={{ color: 'var(--primary)' }}>{formatB(value)}</strong>
                      </span>
                    </div>
                    {/* Value bar */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.35rem' }}>
                      <span style={{ fontSize: '0.72rem', color: '#94a3b8', width: '50px', textAlign: 'right' }}>Value</span>
                      <div style={{ flex: 1, background: '#f1f5f9', borderRadius: '6px', height: '22px', overflow: 'hidden' }}>
                        <div style={{
                          height: '100%',
                          width: `${(value / maxVal) * 100}%`,
                          background: 'linear-gradient(90deg, #0f172a 0%, #1e40af 100%)',
                          borderRadius: '6px',
                          display: 'flex',
                          alignItems: 'center',
                          paddingLeft: '8px',
                          minWidth: value > 0 ? '40px' : '0',
                          transition: 'width 0.6s ease',
                        }}>
                          {value > 0 && <span style={{ fontSize: '0.7rem', color: 'white', fontWeight: 600 }}>{formatB(value)}</span>}
                        </div>
                      </div>
                    </div>
                    {/* Count bar */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <span style={{ fontSize: '0.72rem', color: '#94a3b8', width: '50px', textAlign: 'right' }}>Deals</span>
                      <div style={{ flex: 1, background: '#f1f5f9', borderRadius: '6px', height: '22px', overflow: 'hidden' }}>
                        <div style={{
                          height: '100%',
                          width: `${(count / maxCnt) * 100}%`,
                          background: 'linear-gradient(90deg, #f97316 0%, #fb923c 100%)',
                          borderRadius: '6px',
                          display: 'flex',
                          alignItems: 'center',
                          paddingLeft: '8px',
                          minWidth: count > 0 ? '30px' : '0',
                          transition: 'width 0.6s ease',
                        }}>
                          {count > 0 && <span style={{ fontSize: '0.7rem', color: 'white', fontWeight: 600 }}>{count}</span>}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── COUNTRY VIEW ── */}
        {selectedView === 'country' && (
          <div style={{ background: 'white', padding: '2rem', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
            <h2 style={{ margin: '0 0 1.5rem 0', color: 'var(--primary)', fontSize: '1.3rem' }}>Top 10 Partner Countries by Deal Value</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {topCountries.map(({ country, count, value }, idx) => {
                const maxV = topCountries[0].value;
                const medals = ['🥇', '🥈', '🥉'];
                return (
                  <div key={country}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <span style={{ fontSize: '1.2rem', width: '28px' }}>{medals[idx] || `#${idx + 1}`}</span>
                        <span style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '1rem' }}>{country}</span>
                        <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>{count} deals</span>
                      </div>
                      <span style={{ fontWeight: 800, color: 'var(--primary)', fontSize: '1.1rem' }}>{formatB(value)}</span>
                    </div>
                    <div style={{ background: '#f1f5f9', borderRadius: '8px', height: '14px', overflow: 'hidden' }}>
                      <div style={{
                        height: '100%',
                        width: `${(value / maxV) * 100}%`,
                        background: idx === 0 ? 'linear-gradient(90deg, #0f172a, #1e40af)' :
                          idx === 1 ? 'linear-gradient(90deg, #374151, #6b7280)' :
                            'linear-gradient(90deg, #92400e, #d97706)',
                        borderRadius: '8px',
                        transition: 'width 0.8s ease',
                      }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── VALUE TRENDS VIEW ── */}
        {selectedView === 'value' && (
          <div style={{ background: 'white', padding: '2rem', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <h2 style={{ margin: '0 0 0.25rem 0', color: 'var(--primary)', fontSize: '1.3rem' }}>Deal Value by Year (2000–2026)</h2>
                <p style={{ margin: 0, color: '#94a3b8', fontSize: '0.85rem' }}>Hover over bars to see details</p>
              </div>
              <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                <span>Total (2000+): <strong style={{ color: 'var(--primary)' }}>{formatB(trendEntries.reduce((s, t) => s + t.value, 0))}</strong></span>
                <span>Peak: <strong style={{ color: 'var(--primary)' }}>{trendEntries.sort((a, b) => b.value - a.value)[0]?.year}</strong></span>
              </div>
            </div>

            {/* Y-axis + bars */}
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              {/* Y-axis labels */}
              <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '280px', paddingBottom: '28px' }}>
                {[maxTrendValue, maxTrendValue * 0.75, maxTrendValue * 0.5, maxTrendValue * 0.25, 0].map((v, i) => (
                  <span key={i} style={{ fontSize: '0.7rem', color: '#94a3b8', textAlign: 'right', width: '40px' }}>
                    {formatB(v)}
                  </span>
                ))}
              </div>

              {/* Chart area */}
              <div style={{ flex: 1, position: 'relative' }}>
                {/* Grid lines */}
                {[0.25, 0.5, 0.75, 1].map(frac => (
                  <div key={frac} style={{
                    position: 'absolute',
                    left: 0, right: 0,
                    bottom: `calc(28px + ${frac * 252}px)`,
                    borderTop: '1px dashed #f1f5f9',
                    zIndex: 0,
                  }} />
                ))}

                <div style={{ display: 'flex', alignItems: 'flex-end', gap: '3px', height: '280px', paddingBottom: '28px', position: 'relative', zIndex: 1 }}>
                  {trendEntries.map(({ year, value, count, deals: dealNames }) => {
                    const barH = Math.max((value / maxTrendValue) * 252, value > 0 ? 4 : 0);
                    const isHovered = hoveredBar === String(year);
                    return (
                      <div
                        key={year}
                        style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', position: 'relative' }}
                        onMouseEnter={() => setHoveredBar(String(year))}
                        onMouseLeave={() => setHoveredBar(null)}
                      >
                        {/* Tooltip */}
                        {isHovered && (
                          <div style={{
                            position: 'absolute',
                            bottom: '100%',
                            left: '50%',
                            transform: 'translateX(-50%)',
                            background: '#0f172a',
                            color: 'white',
                            padding: '0.6rem 0.8rem',
                            borderRadius: '8px',
                            fontSize: '0.75rem',
                            whiteSpace: 'nowrap',
                            zIndex: 100,
                            marginBottom: '6px',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                          }}>
                            <div style={{ fontWeight: 700, marginBottom: '0.25rem' }}>{year}</div>
                            <div>{formatB(value)} total</div>
                            <div>{count} deal{count !== 1 ? 's' : ''}</div>
                          </div>
                        )}
                        <div style={{
                          width: '100%',
                          height: `${barH}px`,
                          background: isHovered
                            ? 'linear-gradient(180deg, #f97316 0%, #ea580c 100%)'
                            : 'linear-gradient(180deg, #0f172a 0%, #1e40af 100%)',
                          borderRadius: '4px 4px 0 0',
                          transition: 'background 0.15s, height 0.4s ease',
                          cursor: 'pointer',
                          alignSelf: 'flex-end',
                        }} />
                        <span style={{ fontSize: '0.65rem', color: '#94a3b8', writingMode: 'vertical-rl', transform: 'rotate(180deg)', height: '24px' }}>
                          {year}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── TYPE DISTRIBUTION VIEW ── */}
        {selectedView === 'type' && (
          <div style={{ background: 'white', padding: '2rem', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
            <h2 style={{ margin: '0 0 1.5rem 0', color: 'var(--primary)', fontSize: '1.3rem' }}>Deal Type Breakdown</h2>

            {/* Big donut-style cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
              {typeEntries.map(({ type, count, value }) => {
                const totalV = typeEntries.reduce((s, t) => s + t.value, 0);
                const pct = totalV > 0 ? (value / totalV) * 100 : 0;
                const color = TYPE_COLORS[type] || '#64748b';
                return (
                  <div key={type} style={{
                    padding: '1.5rem',
                    background: '#f8fafc',
                    borderRadius: '12px',
                    border: `2px solid ${color}22`,
                    borderLeft: `4px solid ${color}`,
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                      <h3 style={{ margin: 0, color, fontSize: '1rem', fontWeight: 700 }}>{type}</h3>
                      <span style={{ fontSize: '1.8rem', fontWeight: 900, color }}>
                        {pct.toFixed(0)}%
                      </span>
                    </div>
                    <div style={{ background: '#e2e8f0', borderRadius: '6px', height: '8px', overflow: 'hidden', marginBottom: '0.75rem' }}>
                      <div style={{
                        height: '100%',
                        width: `${pct}%`,
                        background: color,
                        borderRadius: '6px',
                        transition: 'width 0.6s ease',
                      }} />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                      <span style={{ color: '#64748b' }}>{count} deals</span>
                      <span style={{ fontWeight: 700, color }}>{formatB(value)}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Status breakdown */}
            <h3 style={{ color: 'var(--primary)', marginBottom: '1rem', fontSize: '1.1rem' }}>Deal Status Overview</h3>
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              {(['Completed', 'In Progress', 'Ongoing', 'Proposed', 'Signed'] as const).map(status => {
                const count = deals.filter(d => d.status === status).length;
                const pct = ((count / deals.length) * 100).toFixed(0);
                const colors: Record<string, string> = {
                  'Completed': '#10b981',
                  'In Progress': '#3b82f6',
                  'Ongoing': '#6366f1',
                  'Proposed': '#f97316',
                  'Signed': '#0f172a',
                };
                return (
                  <div key={status} style={{
                    padding: '1rem 1.5rem',
                    background: 'white',
                    borderRadius: '10px',
                    border: `2px solid ${colors[status]}33`,
                    borderTop: `3px solid ${colors[status]}`,
                    textAlign: 'center',
                    minWidth: '120px',
                  }}>
                    <div style={{ fontSize: '1.5rem', fontWeight: 800, color: colors[status] }}>{count}</div>
                    <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>{status}</div>
                    <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{pct}%</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}