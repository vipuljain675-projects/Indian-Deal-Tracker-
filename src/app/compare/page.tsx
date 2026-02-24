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

export default function ComparePage() {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [selectedDeals, setSelectedDeals] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetch('/api/deals')
      .then(res => res.json())
      .then(data => {
        setDeals((data as Deal[]).filter(d => d.reviewStatus === 'approved'));
      });
  }, []);

  const filteredDeals = deals.filter(d =>
    d.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    d.country.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedDealObjects = selectedDeals
    .map(id => deals.find(d => d._id === id))
    .filter(Boolean) as Deal[];

  const toggleDeal = (id: string) => {
    if (selectedDeals.includes(id)) {
      setSelectedDeals(selectedDeals.filter(d => d !== id));
    } else if (selectedDeals.length < 3) {
      setSelectedDeals([...selectedDeals, id]);
    } else {
      alert('You can compare up to 3 deals at a time');
    }
  };

  const parseValue = (value: string): number => {
    if (!value || value === '0') return 0;
    return parseFloat(value.toString().replace(/[^0-9.]/g, '')) || 0;
  };

  const extractYear = (dateStr: string): string => {
    if (!dateStr) return 'N/A';
    const match = dateStr.toString().match(/\b(19|20)\d{2}\b/);
    return match ? match[0] : dateStr;
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <nav style={{ background: 'white', padding: '1rem 2rem', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Link href="/" style={{ fontWeight: 'bold', fontSize: '1.2rem', textDecoration: 'none', color: 'var(--primary)' }}>🇮🇳 DealTracker</Link>
        <div>
          <Link href="/" style={{ marginRight: '1rem', textDecoration: 'none', color: 'var(--text-main)' }}>Dashboard</Link>
          <Link href="/analytics" style={{ marginRight: '1rem', textDecoration: 'none', color: 'var(--text-main)' }}>Analytics</Link>
          <Link href="/compare" style={{ marginRight: '1rem', textDecoration: 'none', color: 'var(--primary)', fontWeight: 600 }}>Compare</Link>
          <Link href="/admin" style={{ textDecoration: 'none', color: 'var(--accent)' }}>Admin</Link>
        </div>
      </nav>

      <div className="container" style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto' }}>
        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '2.5rem', color: 'var(--primary)', margin: '0 0 0.5rem 0' }}>⚖️ Compare Deals</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem' }}>Select up to 3 deals to compare side-by-side</p>
        </div>

        {/* Search Bar */}
        <div style={{ marginBottom: '2rem' }}>
          <input
            type="text"
            placeholder="Search deals to compare..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              padding: '12px 16px',
              border: '1.5px solid var(--border)',
              borderRadius: '10px',
              fontSize: '1rem',
              outline: 'none',
            }}
          />
        </div>

        {/* Selected Deals Preview */}
        {selectedDealObjects.length > 0 && (
          <div style={{ marginBottom: '2rem', background: 'white', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--border)' }}>
            <h2 style={{ margin: '0 0 1rem 0', color: 'var(--primary)', fontSize: '1.2rem' }}>Selected for Comparison ({selectedDealObjects.length}/3)</h2>
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              {selectedDealObjects.map(deal => (
                <div
                  key={deal._id}
                  style={{
                    padding: '0.75rem 1rem',
                    background: '#f0f4ff',
                    border: '2px solid var(--primary)',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                  }}
                >
                  <span style={{ fontWeight: 600, color: 'var(--primary)' }}>{deal.title}</span>
                  <button
                    onClick={() => toggleDeal(deal._id)}
                    style={{
                      background: 'var(--primary)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '50%',
                      width: '24px',
                      height: '24px',
                      cursor: 'pointer',
                      fontSize: '0.8rem',
                    }}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Comparison Table */}
        {selectedDealObjects.length > 0 && (
          <div style={{ background: 'white', padding: '2rem', borderRadius: '16px', border: '1px solid var(--border)', marginBottom: '2rem', overflowX: 'auto' }}>
            <h2 style={{ margin: '0 0 1.5rem 0', color: 'var(--primary)' }}>Side-by-Side Comparison</h2>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border)' }}>
                  <th style={{ padding: '1rem', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 600 }}>Attribute</th>
                  {selectedDealObjects.map(deal => (
                    <th key={deal._id} style={{ padding: '1rem', textAlign: 'left', color: 'var(--primary)', fontWeight: 700, minWidth: '300px' }}>
                      {deal.title}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '1rem', fontWeight: 600, color: 'var(--text-main)' }}>Country</td>
                  {selectedDealObjects.map(deal => (
                    <td key={deal._id} style={{ padding: '1rem' }}>{deal.country}</td>
                  ))}
                </tr>
                <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '1rem', fontWeight: 600, color: 'var(--text-main)' }}>Value</td>
                  {selectedDealObjects.map(deal => (
                    <td key={deal._id} style={{ padding: '1rem' }}>
                      {deal.value && deal.value !== '0' ? `$${parseValue(deal.value).toFixed(1)}B` : 'N/A'}
                    </td>
                  ))}
                </tr>
                <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '1rem', fontWeight: 600, color: 'var(--text-main)' }}>Status</td>
                  {selectedDealObjects.map(deal => (
                    <td key={deal._id} style={{ padding: '1rem' }}>
                      <span className={`badge status-${deal.status.toLowerCase().replace(/\s+/g, '-')}`}>
                        {deal.status}
                      </span>
                    </td>
                  ))}
                </tr>
                <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '1rem', fontWeight: 600, color: 'var(--text-main)' }}>Type</td>
                  {selectedDealObjects.map(deal => (
                    <td key={deal._id} style={{ padding: '1rem' }}>{deal.type}</td>
                  ))}
                </tr>
                <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '1rem', fontWeight: 600, color: 'var(--text-main)' }}>Impact</td>
                  {selectedDealObjects.map(deal => (
                    <td key={deal._id} style={{ padding: '1rem' }}>{deal.impact}</td>
                  ))}
                </tr>
                <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '1rem', fontWeight: 600, color: 'var(--text-main)' }}>Date</td>
                  {selectedDealObjects.map(deal => (
                    <td key={deal._id} style={{ padding: '1rem' }}>{extractYear(deal.date)}</td>
                  ))}
                </tr>
                <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '1rem', fontWeight: 600, color: 'var(--text-main)', verticalAlign: 'top' }}>Description</td>
                  {selectedDealObjects.map(deal => (
                    <td key={deal._id} style={{ padding: '1rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
                      {deal.description || 'N/A'}
                    </td>
                  ))}
                </tr>
                <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '1rem', fontWeight: 600, color: 'var(--text-main)', verticalAlign: 'top' }}>Strategic Intent</td>
                  {selectedDealObjects.map(deal => (
                    <td key={deal._id} style={{ padding: '1rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
                      {deal.strategicIntent || 'N/A'}
                    </td>
                  ))}
                </tr>
                <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '1rem', fontWeight: 600, color: 'var(--text-main)', verticalAlign: 'top' }}>Key Items</td>
                  {selectedDealObjects.map(deal => (
                    <td key={deal._id} style={{ padding: '1rem' }}>
                      {deal.keyItems && deal.keyItems.length > 0 ? (
                        <ul style={{ margin: 0, paddingLeft: '1.2rem', color: 'var(--text-muted)' }}>
                          {deal.keyItems.map((item, i) => (
                            <li key={i} style={{ marginBottom: '0.25rem' }}>{item}</li>
                          ))}
                        </ul>
                      ) : (
                        <span style={{ color: 'var(--text-muted)' }}>N/A</span>
                      )}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {/* Deal Selection List */}
        <div style={{ background: 'white', padding: '2rem', borderRadius: '16px', border: '1px solid var(--border)' }}>
          <h2 style={{ margin: '0 0 1.5rem 0', color: 'var(--primary)' }}>Select Deals to Compare</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
            {filteredDeals.map(deal => {
              const isSelected = selectedDeals.includes(deal._id);
              return (
                <div
                  key={deal._id}
                  onClick={() => toggleDeal(deal._id)}
                  style={{
                    padding: '1.25rem',
                    background: isSelected ? '#f0f4ff' : 'white',
                    border: isSelected ? '2px solid var(--primary)' : '1px solid var(--border)',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={e => {
                    if (!isSelected) {
                      e.currentTarget.style.borderColor = 'var(--primary)';
                      e.currentTarget.style.transform = 'translateY(-2px)';
                    }
                  }}
                  onMouseLeave={e => {
                    if (!isSelected) {
                      e.currentTarget.style.borderColor = 'var(--border)';
                      e.currentTarget.style.transform = 'translateY(0)';
                    }
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                    <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: 'var(--text-main)' }}>{deal.title}</h3>
                    {isSelected && (
                      <span style={{ fontSize: '1.2rem' }}>✓</span>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{deal.country}</span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>•</span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{deal.type}</span>
                    {deal.value && deal.value !== '0' && (
                      <>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>•</span>
                        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--primary)' }}>
                          ${parseValue(deal.value).toFixed(1)}B
                        </span>
                      </>
                    )}
                  </div>
                  <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
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
