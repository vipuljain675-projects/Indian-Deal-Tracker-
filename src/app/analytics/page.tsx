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

export default function AnalyticsPage() {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedView, setSelectedView] = useState<'timeline' | 'country' | 'value' | 'type'>('timeline');

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

  // Timeline data: deals by decade
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
    .map(([decade, data]: [string, any]) => ({
      decade: parseInt(decade),
      count: data.count,
      value: data.value,
    }))
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
    .map(([country, data]: [string, any]) => ({
      country,
      count: data.count,
      value: data.value,
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 10);

  // Value trends by year
  const valueTrends = deals.reduce((acc: any, deal) => {
    const year = extractYear(deal.date);
    if (year === 0) return acc;
    if (!acc[year]) acc[year] = 0;
    acc[year] += parseValue(deal.value);
    return acc;
  }, {});

  const trendEntries = Object.entries(valueTrends)
    .map(([year, value]: [string, any]) => ({
      year: parseInt(year),
      value,
    }))
    .sort((a, b) => a.year - b.year)
    .filter(d => d.year >= 2000); // Show last 25 years

  // Type distribution
  const typeData = deals.reduce((acc: any, deal) => {
    const type = deal.type || 'Unknown';
    if (!acc[type]) acc[type] = { count: 0, value: 0 };
    acc[type].count++;
    acc[type].value += parseValue(deal.value);
    return acc;
  }, {});

  const typeEntries = Object.entries(typeData)
    .map(([type, data]: [string, any]) => ({
      type,
      count: data.count,
      value: data.value,
    }))
    .sort((a, b) => b.value - a.value);

  const maxValue = Math.max(...timelineEntries.map(d => d.value), 1);
  const maxCount = Math.max(...timelineEntries.map(d => d.count), 1);

  if (loading) {
    return (
      <div style={{ padding: '4rem', textAlign: 'center' }}>
        <div style={{ fontSize: '2rem' }}>📊</div>
        <p>Loading analytics...</p>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <nav style={{ background: 'white', padding: '1rem 2rem', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Link href="/" style={{ fontWeight: 'bold', fontSize: '1.2rem', textDecoration: 'none', color: 'var(--primary)' }}>🇮🇳 DealTracker</Link>
        <div>
          <Link href="/" style={{ marginRight: '1rem', textDecoration: 'none', color: 'var(--text-main)' }}>Dashboard</Link>
          <Link href="/analytics" style={{ marginRight: '1rem', textDecoration: 'none', color: 'var(--primary)', fontWeight: 600 }}>Analytics</Link>
          <Link href="/admin" style={{ textDecoration: 'none', color: 'var(--accent)' }}>Admin</Link>
        </div>
      </nav>

      <div className="container" style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto' }}>
        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '2.5rem', color: 'var(--primary)', margin: '0 0 0.5rem 0' }}>📊 Analytics Dashboard</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem' }}>Deep insights into India's strategic deals</p>
        </div>

        {/* View Selector */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
          {(['timeline', 'country', 'value', 'type'] as const).map(view => (
            <button
              key={view}
              onClick={() => setSelectedView(view)}
              style={{
                padding: '0.75rem 1.5rem',
                // border: 'none',
                borderRadius: '10px',
                background: selectedView === view ? 'var(--primary)' : 'white',
                color: selectedView === view ? 'white' : 'var(--text-main)',
                fontWeight: 600,
                cursor: 'pointer',
                border: selectedView === view ? 'none' : '1.5px solid var(--border)',
                transition: 'all 0.2s',
              }}
            >
              {view === 'timeline' && '📅 Timeline'}
              {view === 'country' && '🌍 Countries'}
               {view === 'value' && '💰 Value Trends'}
              {view === 'type' && '📦 Deal Types'}
            </button>
          ))}
        </div>

        {/* Timeline View */}
        {selectedView === 'timeline' && (
          <div style={{ background: 'white', padding: '2rem', borderRadius: '16px', border: '1px solid var(--border)' }}>
            <h2 style={{ margin: '0 0 2rem 0', color: 'var(--primary)' }}>Deals Over Time (by Decade)</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {timelineEntries.map(({ decade, count, value }) => (
                <div key={decade}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <span style={{ fontWeight: 700, color: 'var(--text-main)' }}>{decade}s</span>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                      {count} deals • ${value.toFixed(1)}B
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-end' }}>
                    <div style={{ flex: 1, background: '#f1f5f9', borderRadius: '8px', height: '60px', position: 'relative', overflow: 'hidden' }}>
                      <div
                        style={{
                          position: 'absolute',
                          bottom: 0,
                          left: 0,
                          right: 0,
                          height: `${(value / maxValue) * 100}%`,
                          background: 'linear-gradient(180deg, var(--primary) 0%, #004488 100%)',
                          borderRadius: '8px 8px 0 0',
                          transition: 'height 0.5s ease',
                        }}
                      />
                    </div>
                    <div style={{ flex: 1, background: '#f1f5f9', borderRadius: '8px', height: '60px', position: 'relative', overflow: 'hidden' }}>
                      <div
                        style={{
                          position: 'absolute',
                          bottom: 0,
                          left: 0,
                          right: 0,
                          height: `${(count / maxCount) * 100}%`,
                          background: 'linear-gradient(180deg, var(--accent) 0%, #ff8800 100%)',
                          borderRadius: '8px 8px 0 0',
                          transition: 'height 0.5s ease',
                        }}
                      />
                    </div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.25rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    <span>Value</span>
                    <span>Count</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Country View */}
        {selectedView === 'country' && (
          <div style={{ background: 'white', padding: '2rem', borderRadius: '16px', border: '1px solid var(--border)' }}>
            <h2 style={{ margin: '0 0 2rem 0', color: 'var(--primary)' }}>Top 10 Partner Countries</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {topCountries.map(({ country, count, value }, idx) => {
                const maxCountryValue = Math.max(...topCountries.map(c => c.value));
                return (
                  <div key={country}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <span style={{ fontSize: '1.5rem' }}>#{idx + 1}</span>
                        <span style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '1.1rem' }}>{country}</span>
                      </div>
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                        {count} deals • <strong style={{ color: 'var(--primary)' }}>${value.toFixed(1)}B</strong>
                      </span>
                    </div>
                    <div style={{ background: '#f1f5f9', borderRadius: '10px', height: '12px', overflow: 'hidden' }}>
                      <div
                        style={{
                          height: '100%',
                          width: `${(value / maxCountryValue) * 100}%`,
                          background: `linear-gradient(90deg, var(--primary) 0%, var(--accent) 100%)`,
                          borderRadius: '10px',
                          transition: 'width 0.8s ease',
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Value Trends View */}
        {selectedView === 'value' && (
          <div style={{ background: 'white', padding: '2rem', borderRadius: '16px', border: '1px solid var(--border)' }}>
            <h2 style={{ margin: '0 0 2rem 0', color: 'var(--primary)' }}>Deal Values Over Time (2000-2026)</h2>
            <div style={{ position: 'relative', height: '400px', display: 'flex', alignItems: 'flex-end', gap: '0.5rem', padding: '1rem 0' }}>
              {trendEntries.map(({ year, value }) => {
                const maxTrendValue = Math.max(...trendEntries.map(t => t.value), 1);
                return (
                  <div key={year} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{ position: 'relative', width: '100%', height: '300px', display: 'flex', alignItems: 'flex-end' }}>
                      <div
                        style={{
                          width: '100%',
                          height: `${(value / maxTrendValue) * 100}%`,
                          background: 'linear-gradient(180deg, var(--primary) 0%, var(--accent) 100%)',
                          borderRadius: '8px 8px 0 0',
                          minHeight: '4px',
                          transition: 'height 0.5s ease',
                          position: 'relative',
                        }}
                        title={`${year}: $${value.toFixed(1)}B`}
                      />
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', writingMode: 'vertical-rl', textOrientation: 'mixed', transform: 'rotate(180deg)' }}>
                      {year}
                    </div>
                  </div>
                );
              })}
            </div>
            <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              <span>Total: ${trendEntries.reduce((sum, d) => sum + d.value, 0).toFixed(1)}B</span>
              <span>Average per year: ${(trendEntries.reduce((sum, d) => sum + d.value, 0) / trendEntries.length).toFixed(1)}B</span>
            </div>
          </div>
        )}

        {/* Type Distribution View */}
        {selectedView === 'type' && (
          <div style={{ background: 'white', padding: '2rem', borderRadius: '16px', border: '1px solid var(--border)' }}>
            <h2 style={{ margin: '0 0 2rem 0', color: 'var(--primary)' }}>Deal Type Distribution</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
              {typeEntries.map(({ type, count, value }) => {
                const totalValue = typeEntries.reduce((sum, t) => sum + t.value, 0);
                const percentage = (value / totalValue) * 100;
                return (
                  <div key={type} style={{ padding: '1.5rem', background: '#f8fafc', borderRadius: '12px', border: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                      <h3 style={{ margin: 0, color: 'var(--primary)', fontSize: '1.1rem' }}>{type}</h3>
                      <span style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--primary)' }}>{percentage.toFixed(0)}%</span>
                    </div>
                    <div style={{ background: '#e2e8f0', borderRadius: '10px', height: '8px', overflow: 'hidden', marginBottom: '0.75rem' }}>
                      <div
                        style={{
                          height: '100%',
                          width: `${percentage}%`,
                          background: 'linear-gradient(90deg, var(--primary) 0%, var(--accent) 100%)',
                          transition: 'width 0.5s ease',
                        }}
                      />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                      <span>{count} deals</span>
                      <span><strong>${value.toFixed(1)}B</strong></span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Summary Stats */}
        <div style={{ marginTop: '2rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
          <div style={{ background: 'white', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--border)', textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📊</div>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--primary)' }}>{deals.length}</div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Total Deals</div>
          </div>
          <div style={{ background: 'white', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--border)', textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>💰</div>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--primary)' }}>
              ${deals.reduce((sum, d) => sum + parseValue(d.value), 0).toFixed(1)}B
            </div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Total Value</div>
          </div>
          <div style={{ background: 'white', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--border)', textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🌍</div>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--primary)' }}>
              {new Set(deals.map(d => d.country)).size}
            </div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Partner Nations</div>
          </div>
          <div style={{ background: 'white', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--border)', textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📈</div>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--primary)' }}>
              ${(deals.reduce((sum, d) => sum + parseValue(d.value), 0) / deals.length).toFixed(1)}B
            </div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Avg Deal Value</div>
          </div>
        </div>
      </div>
    </div>
  );
}
