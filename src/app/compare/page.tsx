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
  description: string;
  strategicIntent: string;
  whyIndiaNeedsThis: string;
  keyItems: string[];
  date: string;
  reviewStatus?: 'approved' | 'pending' | 'rejected';
}

const STATUS_COLORS: Record<string, string> = {
  'Completed': '#10b981',
  'In Progress': '#3b82f6',
  'Ongoing': '#6366f1',
  'Proposed': '#f97316',
  'Signed': '#0f172a',
};

const TYPE_COLORS: Record<string, string> = {
  'Defense Acquisition': '#0f172a',
  'Trade': '#f97316',
  'Technology': '#6366f1',
  'Energy': '#10b981',
  'Diplomatic': '#3b82f6',
};

export default function ComparePage() {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDeals, setSelectedDeals] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('All');

  useEffect(() => {
    fetch('/api/deals')
      .then(res => res.json())
      .then(data => {
        setDeals((data as Deal[]).filter(d => d.reviewStatus === 'approved'));
        setLoading(false);
      });
  }, []);

  const parseValue = (value: string): number => {
    if (!value || value === '0') return 0;
    return parseFloat(value.toString().replace(/[^0-9.]/g, '')) || 0;
  };

  const extractYear = (dateStr: string): string => {
    if (!dateStr) return 'N/A';
    const match = dateStr.toString().match(/\b(19|20)\d{2}\b/);
    return match ? match[0] : dateStr;
  };

  const toggleDeal = (id: string) => {
    if (selectedDeals.includes(id)) {
      setSelectedDeals(selectedDeals.filter(d => d !== id));
    } else if (selectedDeals.length < 3) {
      setSelectedDeals([...selectedDeals, id]);
    }
  };

  const selectedDealObjects = selectedDeals
    .map(id => deals.find(d => d._id === id))
    .filter(Boolean) as Deal[];

  const filteredDeals = deals.filter(d => {
    const matchSearch = d.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.country.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.type.toLowerCase().includes(searchTerm.toLowerCase());
    const matchType = filterType === 'All' || d.type === filterType;
    return matchSearch && matchType;
  });

  const dealTypes = ['All', ...Array.from(new Set(deals.map(d => d.type)))];

  // Find highest value deal among selected
  const maxValueId = selectedDealObjects.length > 1
    ? selectedDealObjects.reduce((max, d) => parseValue(d.value) > parseValue(max.value) ? d : max, selectedDealObjects[0])?._id
    : null;

  const mostRecentId = selectedDealObjects.length > 1
    ? selectedDealObjects.reduce((max, d) => parseInt(extractYear(d.date)) > parseInt(extractYear(max.date)) ? d : max, selectedDealObjects[0])?._id
    : null;

  if (loading) {
    return (
      <div style={{ padding: '4rem', textAlign: 'center' }}>
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⚖️</div>
        <p style={{ color: '#64748b' }}>Loading deals...</p>
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
          <Link href="/analytics" style={{ textDecoration: 'none', color: 'var(--text-main)', fontSize: '0.95rem' }}>Analytics</Link>
          <Link href="/compare" style={{ textDecoration: 'none', color: 'var(--primary)', fontWeight: 700, fontSize: '0.95rem' }}>Compare</Link>
          <Link href="/admin" style={{ textDecoration: 'none', color: 'var(--accent)', fontSize: '0.95rem' }}>Admin</Link>
        </div>
      </nav>

      <div style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto' }}>

        {/* Header */}
        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '2.2rem', color: 'var(--primary)', margin: '0 0 0.4rem 0' }}>⚖️ Compare Deals</h1>
          <p style={{ color: 'var(--text-muted)', margin: 0 }}>Select up to 3 deals to compare side by side</p>
        </div>

        {/* Search + Filter row */}
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
          <input
            type="text"
            placeholder="Search deals..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            style={{
              flex: 1,
              minWidth: '200px',
              padding: '0.75rem 1rem',
              border: '1.5px solid #e2e8f0',
              borderRadius: '10px',
              fontSize: '0.95rem',
              outline: 'none',
            }}
          />
          <select
            value={filterType}
            onChange={e => setFilterType(e.target.value)}
            style={{
              padding: '0.75rem 1rem',
              border: '1.5px solid #e2e8f0',
              borderRadius: '10px',
              fontSize: '0.95rem',
              outline: 'none',
              background: 'white',
              cursor: 'pointer',
            }}
          >
            {dealTypes.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>

        {/* Selected chips */}
        {selectedDealObjects.length > 0 && (
          <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>
              Comparing ({selectedDealObjects.length}/3):
            </span>
            {selectedDealObjects.map(deal => (
              <div key={deal._id} style={{
                padding: '0.4rem 0.9rem',
                background: '#f0f4ff',
                border: '2px solid var(--primary)',
                borderRadius: '20px',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontSize: '0.85rem',
                fontWeight: 600,
                color: 'var(--primary)',
              }}>
                {deal.title.length > 40 ? deal.title.slice(0, 40) + '…' : deal.title}
                <button
                  onClick={() => toggleDeal(deal._id)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--primary)', fontWeight: 800, padding: '0', lineHeight: 1 }}
                >
                  ✕
                </button>
              </div>
            ))}
            {selectedDealObjects.length > 1 && (
              <button
                onClick={() => setSelectedDeals([])}
                style={{ padding: '0.4rem 0.9rem', background: '#fee2e2', border: 'none', borderRadius: '20px', cursor: 'pointer', color: '#dc2626', fontSize: '0.85rem', fontWeight: 600 }}
              >
                Clear all
              </button>
            )}
          </div>
        )}

        {/* ── COMPARISON TABLE ── */}
        {selectedDealObjects.length >= 2 ? (
          <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #e2e8f0', marginBottom: '2rem', overflowX: 'auto' }}>
            <div style={{ padding: '1.5rem 2rem', borderBottom: '1px solid #f1f5f9' }}>
              <h2 style={{ margin: 0, color: 'var(--primary)', fontSize: '1.2rem' }}>Side-by-Side Comparison</h2>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #f1f5f9' }}>
                  <th style={{ padding: '1rem 1.5rem', textAlign: 'left', color: '#94a3b8', fontWeight: 600, fontSize: '0.85rem', width: '150px' }}>
                    ATTRIBUTE
                  </th>
                  {selectedDealObjects.map(deal => (
                    <th key={deal._id} style={{
                      padding: '1rem 1.5rem',
                      textAlign: 'left',
                      minWidth: '280px',
                      background: deal._id === maxValueId ? '#f0f9ff' : 'white',
                    }}>
                      <div style={{ color: 'var(--primary)', fontWeight: 700, fontSize: '0.95rem', marginBottom: '0.25rem' }}>
                        {deal._id === maxValueId && <span style={{ fontSize: '0.75rem', background: '#0f172a', color: 'white', padding: '2px 6px', borderRadius: '4px', marginRight: '6px' }}>💰 Highest Value</span>}
                        {deal._id === mostRecentId && deal._id !== maxValueId && <span style={{ fontSize: '0.75rem', background: '#6366f1', color: 'white', padding: '2px 6px', borderRadius: '4px', marginRight: '6px' }}>🆕 Most Recent</span>}
                      </div>
                      <div style={{ color: 'var(--text-main)', fontWeight: 700 }}>{deal.title}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {/* Country */}
                <tr style={{ borderBottom: '1px solid #f8fafc' }}>
                  <td style={{ padding: '0.9rem 1.5rem', fontWeight: 600, color: '#64748b', fontSize: '0.85rem' }}>COUNTRY</td>
                  {selectedDealObjects.map(deal => (
                    <td key={deal._id} style={{ padding: '0.9rem 1.5rem', background: deal._id === maxValueId ? '#fafcff' : 'white' }}>
                      <span style={{ fontWeight: 600 }}>{deal.country}</span>
                    </td>
                  ))}
                </tr>
                {/* Value */}
                <tr style={{ borderBottom: '1px solid #f8fafc', background: '#fafafa' }}>
                  <td style={{ padding: '0.9rem 1.5rem', fontWeight: 600, color: '#64748b', fontSize: '0.85rem' }}>VALUE</td>
                  {selectedDealObjects.map(deal => {
                    const val = parseValue(deal.value);
                    const isHighest = deal._id === maxValueId;
                    return (
                      <td key={deal._id} style={{ padding: '0.9rem 1.5rem', background: deal._id === maxValueId ? '#fafcff' : '#fafafa' }}>
                        <span style={{
                          fontWeight: 800,
                          fontSize: '1.1rem',
                          color: isHighest ? '#0f172a' : 'var(--text-main)',
                        }}>
                          {val > 0 ? `$${val.toFixed(1)}B` : 'N/A'}
                        </span>
                        {isHighest && selectedDealObjects.length > 1 && <span style={{ fontSize: '0.7rem', color: '#10b981', marginLeft: '6px', fontWeight: 700 }}>▲ Highest</span>}
                      </td>
                    );
                  })}
                </tr>
                {/* Status */}
                <tr style={{ borderBottom: '1px solid #f8fafc' }}>
                  <td style={{ padding: '0.9rem 1.5rem', fontWeight: 600, color: '#64748b', fontSize: '0.85rem' }}>STATUS</td>
                  {selectedDealObjects.map(deal => (
                    <td key={deal._id} style={{ padding: '0.9rem 1.5rem', background: deal._id === maxValueId ? '#fafcff' : 'white' }}>
                      <span style={{
                        padding: '4px 10px',
                        borderRadius: '6px',
                        fontSize: '0.82rem',
                        fontWeight: 700,
                        background: `${STATUS_COLORS[deal.status]}18`,
                        color: STATUS_COLORS[deal.status] || '#64748b',
                        border: `1px solid ${STATUS_COLORS[deal.status]}33`,
                      }}>
                        {deal.status}
                      </span>
                    </td>
                  ))}
                </tr>
                {/* Type */}
                <tr style={{ borderBottom: '1px solid #f8fafc', background: '#fafafa' }}>
                  <td style={{ padding: '0.9rem 1.5rem', fontWeight: 600, color: '#64748b', fontSize: '0.85rem' }}>TYPE</td>
                  {selectedDealObjects.map(deal => (
                    <td key={deal._id} style={{ padding: '0.9rem 1.5rem', background: deal._id === maxValueId ? '#fafcff' : '#fafafa' }}>
                      <span style={{
                        padding: '4px 10px',
                        borderRadius: '6px',
                        fontSize: '0.82rem',
                        fontWeight: 600,
                        background: `${TYPE_COLORS[deal.type] || '#64748b'}15`,
                        color: TYPE_COLORS[deal.type] || '#64748b',
                      }}>
                        {deal.type}
                      </span>
                    </td>
                  ))}
                </tr>
                {/* Impact */}
                <tr style={{ borderBottom: '1px solid #f8fafc' }}>
                  <td style={{ padding: '0.9rem 1.5rem', fontWeight: 600, color: '#64748b', fontSize: '0.85rem' }}>IMPACT</td>
                  {selectedDealObjects.map(deal => (
                    <td key={deal._id} style={{ padding: '0.9rem 1.5rem', background: deal._id === maxValueId ? '#fafcff' : 'white' }}>
                      <span style={{
                        fontWeight: 700,
                        color: deal.impact === 'High Impact' ? '#dc2626' : deal.impact === 'Medium Impact' ? '#f97316' : '#64748b',
                      }}>
                        {deal.impact === 'High Impact' ? '🔴' : deal.impact === 'Medium Impact' ? '🟡' : '🟢'} {deal.impact}
                      </span>
                    </td>
                  ))}
                </tr>
                {/* Year */}
                <tr style={{ borderBottom: '1px solid #f8fafc', background: '#fafafa' }}>
                  <td style={{ padding: '0.9rem 1.5rem', fontWeight: 600, color: '#64748b', fontSize: '0.85rem' }}>YEAR</td>
                  {selectedDealObjects.map(deal => (
                    <td key={deal._id} style={{ padding: '0.9rem 1.5rem', background: deal._id === maxValueId ? '#fafcff' : '#fafafa' }}>
                      <span style={{ fontWeight: 600 }}>
                        {extractYear(deal.date)}
                        {deal._id === mostRecentId && selectedDealObjects.length > 1 && <span style={{ fontSize: '0.7rem', color: '#6366f1', marginLeft: '6px', fontWeight: 700 }}>▲ Newest</span>}
                      </span>
                    </td>
                  ))}
                </tr>
                {/* Description */}
                <tr style={{ borderBottom: '1px solid #f8fafc' }}>
                  <td style={{ padding: '0.9rem 1.5rem', fontWeight: 600, color: '#64748b', fontSize: '0.85rem', verticalAlign: 'top' }}>DESCRIPTION</td>
                  {selectedDealObjects.map(deal => (
                    <td key={deal._id} style={{ padding: '0.9rem 1.5rem', color: '#475569', lineHeight: 1.6, fontSize: '0.9rem', verticalAlign: 'top', background: deal._id === maxValueId ? '#fafcff' : 'white' }}>
                      {deal.description || '—'}
                    </td>
                  ))}
                </tr>
                {/* Strategic Intent */}
                <tr style={{ borderBottom: '1px solid #f8fafc', background: '#fafafa' }}>
                  <td style={{ padding: '0.9rem 1.5rem', fontWeight: 600, color: '#64748b', fontSize: '0.85rem', verticalAlign: 'top' }}>STRATEGIC INTENT</td>
                  {selectedDealObjects.map(deal => (
                    <td key={deal._id} style={{ padding: '0.9rem 1.5rem', color: '#475569', lineHeight: 1.6, fontSize: '0.9rem', verticalAlign: 'top', background: deal._id === maxValueId ? '#fafcff' : '#fafafa' }}>
                      {deal.strategicIntent || '—'}
                    </td>
                  ))}
                </tr>
                {/* Why India needs this */}
                <tr style={{ borderBottom: '1px solid #f8fafc' }}>
                  <td style={{ padding: '0.9rem 1.5rem', fontWeight: 600, color: '#64748b', fontSize: '0.85rem', verticalAlign: 'top' }}>WHY INDIA NEEDS THIS</td>
                  {selectedDealObjects.map(deal => (
                    <td key={deal._id} style={{ padding: '0.9rem 1.5rem', color: '#475569', lineHeight: 1.6, fontSize: '0.9rem', verticalAlign: 'top', background: deal._id === maxValueId ? '#fafcff' : 'white' }}>
                      {deal.whyIndiaNeedsThis || '—'}
                    </td>
                  ))}
                </tr>
                {/* Key Items */}
                <tr>
                  <td style={{ padding: '0.9rem 1.5rem', fontWeight: 600, color: '#64748b', fontSize: '0.85rem', verticalAlign: 'top' }}>KEY ITEMS</td>
                  {selectedDealObjects.map(deal => (
                    <td key={deal._id} style={{ padding: '0.9rem 1.5rem', verticalAlign: 'top', background: deal._id === maxValueId ? '#fafcff' : 'white' }}>
                      {deal.keyItems?.length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                          {deal.keyItems.map((item, i) => (
                            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', fontSize: '0.875rem', color: '#475569' }}>
                              <span style={{ color: 'var(--primary)', marginTop: '2px', flexShrink: 0 }}>▸</span>
                              {item}
                            </div>
                          ))}
                        </div>
                      ) : '—'}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        ) : selectedDealObjects.length === 1 ? (
          // One selected — prompt for more
          <div style={{ background: 'white', borderRadius: '16px', border: '2px dashed #e2e8f0', padding: '3rem', textAlign: 'center', marginBottom: '2rem' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>👆</div>
            <h3 style={{ color: 'var(--primary)', margin: '0 0 0.5rem 0' }}>Select one more deal to compare</h3>
            <p style={{ color: '#94a3b8', margin: 0 }}>You need at least 2 deals for a side-by-side comparison. You can select up to 3.</p>
          </div>
        ) : (
          // Empty state
          <div style={{ background: 'white', borderRadius: '16px', border: '2px dashed #e2e8f0', padding: '4rem', textAlign: 'center', marginBottom: '2rem' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⚖️</div>
            <h3 style={{ color: 'var(--primary)', margin: '0 0 0.5rem 0' }}>Pick any 2–3 deals below</h3>
            <p style={{ color: '#94a3b8', margin: '0 0 1.5rem 0' }}>Compare Rafale vs S-400, or MMRCA vs BrahMos — see the full breakdown side by side</p>
            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', flexWrap: 'wrap' }}>
              {['Rafale', 'S-400', 'BrahMos', 'Scorpene', 'Su-30MKI'].map(term => (
                <button
                  key={term}
                  onClick={() => setSearchTerm(term)}
                  style={{ padding: '0.4rem 0.9rem', background: '#f0f4ff', border: '1.5px solid var(--primary)', borderRadius: '20px', cursor: 'pointer', color: 'var(--primary)', fontSize: '0.85rem', fontWeight: 600 }}
                >
                  {term}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── DEAL SELECTION GRID ── */}
        <div style={{ background: 'white', padding: '1.5rem', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <h2 style={{ margin: 0, color: 'var(--primary)', fontSize: '1.1rem' }}>
              {filteredDeals.length} deals — click to select
            </h2>
            {selectedDeals.length === 3 && (
              <span style={{ fontSize: '0.8rem', color: '#f97316', fontWeight: 600 }}>Max 3 selected</span>
            )}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '0.75rem' }}>
            {filteredDeals.map(deal => {
              const isSelected = selectedDeals.includes(deal._id);
              const isDisabled = !isSelected && selectedDeals.length >= 3;
              return (
                <div
                  key={deal._id}
                  onClick={() => !isDisabled && toggleDeal(deal._id)}
                  style={{
                    padding: '1rem',
                    background: isSelected ? '#f0f4ff' : isDisabled ? '#f8fafc' : 'white',
                    border: isSelected ? '2px solid var(--primary)' : '1.5px solid #e2e8f0',
                    borderRadius: '10px',
                    cursor: isDisabled ? 'not-allowed' : 'pointer',
                    opacity: isDisabled ? 0.5 : 1,
                    transition: 'all 0.15s',
                    position: 'relative',
                  }}
                >
                  {isSelected && (
                    <div style={{
                      position: 'absolute', top: '10px', right: '10px',
                      width: '20px', height: '20px', background: 'var(--primary)',
                      borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: 'white', fontSize: '0.7rem', fontWeight: 800,
                    }}>✓</div>
                  )}
                  <div style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.4rem', paddingRight: '1.5rem' }}>
                    {deal.title}
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.4rem' }}>
                    <span style={{ fontSize: '0.75rem', color: '#64748b' }}>{deal.country}</span>
                    <span style={{ fontSize: '0.75rem', color: '#cbd5e1' }}>·</span>
                    <span style={{ fontSize: '0.75rem', color: TYPE_COLORS[deal.type] || '#64748b', fontWeight: 600 }}>{deal.type}</span>
                    {deal.value && deal.value !== '0' && (
                      <>
                        <span style={{ fontSize: '0.75rem', color: '#cbd5e1' }}>·</span>
                        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--primary)' }}>
                          ${parseValue(deal.value).toFixed(1)}B
                        </span>
                      </>
                    )}
                  </div>
                  <p style={{
                    margin: 0, fontSize: '0.8rem', color: '#94a3b8', lineHeight: 1.5,
                    display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                  }}>
                    {deal.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}