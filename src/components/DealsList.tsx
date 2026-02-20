"use client";
import { useState } from 'react';
import DealCard from './DealCard';

const countryFlags: Record<string, string> = {
  'USA': '🇺🇸',
  'United States': '🇺🇸',
  'Russia': '🇷🇺',
  'France': '🇫🇷',
  'United Kingdom': '🇬🇧',
  'UK': '🇬🇧',
  'Israel': '🇮🇱',
  'Japan': '🇯🇵',
  'Germany': '🇩🇪',
  'China': '🇨🇳',
  'Pakistan': '🇵🇰',
  'Afghanistan': '🇦🇫',
  'Iran': '🇮🇷',
  'UAE': '🇦🇪',
  'Saudi Arabia': '🇸🇦',
  'Australia': '🇦🇺',
  'Canada': '🇨🇦',
  'South Korea': '🇰🇷',
  'Italy': '🇮🇹',
  'Greece': '🇬🇷',
  'Nepal': '🇳🇵',
  'Bangladesh': '🇧🇩',
  'Sri Lanka': '🇱🇰',
  'Maldives': '🇲🇻',
  'Egypt': '🇪🇬',
  'Philippines': '🇵🇭',
  'Switzerland': '🇨🇭',
  'European Union': '🇪🇺',
  'EU': '🇪🇺',
  'ASEAN': '🌏',
  'Multilateral': '🌐',
  'African Union': '🌍',
  'India': '🇮🇳',
};

function getFlag(country: string): string {
  return countryFlags[country] || '🌐';
}

export default function DealsList({ initialDeals }: { initialDeals: any[] }) {
  const [deals, setDeals] = useState(initialDeals);
  const [selectedDeal, setSelectedDeal] = useState<any>(null);
  const [isEditing, setIsEditing] = useState(false);

  const [filter, setFilter] = useState({
    search: '',
    type: 'All Types',
    status: 'All Status',
    country: 'All Countries',
    impact: 'All Impact',
  });

  const uniqueCountries = Array.from(new Set(deals.map(d => d.country))).sort();

  const filteredDeals = deals.filter(d => {
    const matchesSearch = d.title.toLowerCase().includes(filter.search.toLowerCase());
    const matchesType = filter.type === 'All Types' || d.type === filter.type;
    const matchesStatus = filter.status === 'All Status' || d.status === filter.status;
    const matchesCountry = filter.country === 'All Countries' || d.country === filter.country;
    const matchesImpact = filter.impact === 'All Impact' || d.impact === filter.impact;
    return matchesSearch && matchesType && matchesStatus && matchesCountry && matchesImpact;
  });

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Delete this strategic deal?')) return;
    const res = await fetch(`/api/deals?id=${id}`, { method: 'DELETE' });
    if (res.ok) {
      setDeals(deals.filter(d => d._id !== id));
      setSelectedDeal(null);
    }
  };

  const handleUpdate = async () => {
    const res = await fetch(`/api/deals?id=${selectedDeal._id}`, {
      method: 'PUT',
      body: JSON.stringify(selectedDeal),
    });
    if (res.ok) {
      setDeals(deals.map(d => d._id === selectedDeal._id ? selectedDeal : d));
      setIsEditing(false);
      alert('Deal Updated!');
    }
  };

  // Extract year from date string
  const getYear = (date: string) =>
    date ? date.toString().match(/\d{4}/)?.[0] || date : '';

  return (
    <>
      {/* ── Filter Bar ── */}
      <div className="filter-bar">
        <input
          className="search-input"
          placeholder="Search deals..."
          onChange={e => setFilter({ ...filter, search: e.target.value })}
        />
        <div className="dropdowns">
          <select onChange={e => setFilter({ ...filter, type: e.target.value })}>
            <option>All Types</option>
            <option>Defense Acquisition</option>
            <option>Trade</option>
            <option>Technology</option>
            <option>Energy</option>
            <option>Diplomatic</option>
          </select>
          <select onChange={e => setFilter({ ...filter, status: e.target.value })}>
            <option>All Status</option>
            <option>Proposed</option>
            <option>Signed</option>
            <option>In Progress</option>
            <option>Ongoing</option>
            <option>Completed</option>
          </select>
          <select onChange={e => setFilter({ ...filter, country: e.target.value })}>
            <option>All Countries</option>
            {uniqueCountries.map(c => <option key={c} value={c}>{getFlag(c)} {c}</option>)}
          </select>
          <select onChange={e => setFilter({ ...filter, impact: e.target.value })}>
            <option>All Impact</option>
            <option>High Impact</option>
            <option>Medium Impact</option>
            <option>Low Impact</option>
          </select>
        </div>
      </div>

      <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
        Showing <strong>{filteredDeals.length}</strong> of {deals.length} deals
      </p>

      {/* ── Deals Grid ── */}
      <div className="deals-grid">
        {filteredDeals.map(deal => (
          <div
            key={deal._id}
            className="card-wrapper"
            onClick={() => { setSelectedDeal(deal); setIsEditing(false); }}
          >
            <button className="delete-btn" onClick={e => handleDelete(deal._id, e)}>🗑️</button>
            <DealCard deal={deal} />
          </div>
        ))}
      </div>

      {/* ── Side Panel ── */}
      {selectedDeal && (
        <div className="side-panel-overlay" onClick={() => setSelectedDeal(null)}>
          <div className="side-panel" onClick={e => e.stopPropagation()}>
            <div className="side-header">
              <button className="edit-toggle-btn" onClick={() => setIsEditing(!isEditing)}>
                {isEditing ? 'Cancel' : 'Edit Deal'}
              </button>
              <button className="close-btn" onClick={() => setSelectedDeal(null)}>✕</button>
            </div>

            {isEditing ? (
              <div className="edit-form">
                <label>Status</label>
                <select
                  value={selectedDeal.status}
                  onChange={e => setSelectedDeal({ ...selectedDeal, status: e.target.value })}
                >
                  <option>Proposed</option>
                  <option>Signed</option>
                  <option>In Progress</option>
                  <option>Ongoing</option>
                  <option>Completed</option>
                </select>
                <label>Value ($B)</label>
                <input
                  value={selectedDeal.value}
                  onChange={e => setSelectedDeal({ ...selectedDeal, value: e.target.value })}
                />
                <label>Summary</label>
                <textarea
                  rows={3}
                  value={selectedDeal.description}
                  onChange={e => setSelectedDeal({ ...selectedDeal, description: e.target.value })}
                />
                <button className="btn-primary" onClick={handleUpdate}>Save Changes</button>
              </div>
            ) : (
              <div className="side-content">
                {/* Flag + Country + Year */}
                <p className="side-meta">
                  <span style={{ fontSize: '1.3rem' }}>{getFlag(selectedDeal.country)}</span>
                  {selectedDeal.country.toUpperCase()}
                  {selectedDeal.date && (
                    <span style={{ color: '#94a3b8', fontWeight: 400 }}>
                      • {getYear(selectedDeal.date)}
                    </span>
                  )}
                </p>

                <h2 className="side-title">{selectedDeal.title}</h2>

                {/* Badges row */}
                <div className="side-badges">
                  <span className={`badge status-${selectedDeal.status.toLowerCase().replace(/\s+/g, '-')}`}>
                    {selectedDeal.status}
                  </span>
                  {selectedDeal.impact && (
                    <span className="badge impact-badge">{selectedDeal.impact}</span>
                  )}
                  {selectedDeal.value && selectedDeal.value !== '0' && (
                    <span className="badge value-badge">
                      ${parseFloat(selectedDeal.value.replace(/[^0-9.]/g, ''))}B USD
                    </span>
                  )}
                </div>

                {/* Description */}
                {selectedDeal.description && (
                  <p style={{ color: '#475569', lineHeight: 1.65, fontSize: '0.9rem' }}>
                    {selectedDeal.description}
                  </p>
                )}

                <div className="side-section">
                  <h3>🎯 Strategic Intent</h3>
                  <p>{selectedDeal.strategicIntent || 'No intent provided.'}</p>
                </div>

                <div className="side-section">
                  <h3>💡 Why India Needs This</h3>
                  <p>{selectedDeal.whyIndiaNeedsThis || 'No details provided.'}</p>
                </div>

                <div className="side-section">
                  <h3>📦 Key Items</h3>
                  <ul>
                    {selectedDeal.keyItems?.map((item: string, i: number) => (
                      <li key={i}>{item}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
