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

  // AI verdict state
  const [aiVerdict, setAiVerdict] = useState<string>('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');

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
    // Clear AI verdict when selection changes
    setAiVerdict('');
    setAiError('');
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

  const maxValueId = selectedDealObjects.length > 1
    ? selectedDealObjects.reduce((max, d) => parseValue(d.value) > parseValue(max.value) ? d : max, selectedDealObjects[0])?._id
    : null;

  const mostRecentId = selectedDealObjects.length > 1
    ? selectedDealObjects.reduce((max, d) => parseInt(extractYear(d.date)) > parseInt(extractYear(max.date)) ? d : max, selectedDealObjects[0])?._id
    : null;

  // ── AI Compare function ──
  const getAiVerdict = async () => {
    if (selectedDealObjects.length < 2) return;
    setAiLoading(true);
    setAiVerdict('');
    setAiError('');

    const dealSummaries = selectedDealObjects.map((d, i) =>
      `DEAL ${i + 1}: ${d.title}
  Country: ${d.country}
  Value: $${parseValue(d.value).toFixed(1)}B
  Status: ${d.status}
  Type: ${d.type}
  Year: ${extractYear(d.date)}
  Impact: ${d.impact}
  Description: ${d.description}
  Strategic Intent: ${d.strategicIntent || 'N/A'}
  Why India Needs This: ${d.whyIndiaNeedsThis || 'N/A'}
  Key Items: ${d.keyItems?.join(', ') || 'N/A'}`
    ).join('\n\n');

    const question = `Compare these ${selectedDealObjects.length} India deals and tell me which was better for India and why:

${dealSummaries}

Give me:
1. Which deal was better value for India overall and why
2. Strategic winner — which deal gave India more long-term power
3. Risk/controversy comparison — which had more problems
4. Your final verdict — if India had to choose, which one was the smarter deal?

Be direct, analytical, use numbers, don't be diplomatic about problems.`;

    try {
      const res = await fetch('/api/ai-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: question }]
        }),
      });

      const data = await res.json();
      if (data.reply) {
        setAiVerdict(data.reply);
      } else {
        setAiError('AI did not return a response. Try again.');
      }
    } catch {
      setAiError('Failed to reach AI. Check your connection.');
    } finally {
      setAiLoading(false);
    }
  };

  // Format AI response — convert markdown bold and bullets to readable format
  const formatAiText = (text: string) => {
    return text.split('\n').map((line, i) => {
      const trimmed = line.trim();
      if (!trimmed) return <div key={i} style={{ height: '0.5rem' }} />;

      // Headers like "1. Which deal..." or "## heading"
      if (/^#+\s/.test(trimmed)) {
        return <div key={i} style={{ fontWeight: 700, color: '#0f172a', fontSize: '1rem', marginTop: '1rem', marginBottom: '0.25rem' }}>
          {trimmed.replace(/^#+\s/, '')}
        </div>;
      }
      if (/^\d+\.\s/.test(trimmed)) {
        return <div key={i} style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.95rem', marginTop: '1rem', marginBottom: '0.25rem' }}>
          {trimmed}
        </div>;
      }

      // Emoji-led lines like "📊 NUMBERS:" or "✅ CASE FOR:"
      if (/^[📊✅⚠️🔍💰🛡️🌍📅]/.test(trimmed)) {
        return <div key={i} style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.95rem', marginTop: '0.75rem', marginBottom: '0.25rem' }}>
          {trimmed.replace(/\*\*/g, '')}
        </div>;
      }

      // Bullet points
      if (trimmed.startsWith('•') || trimmed.startsWith('-') || trimmed.startsWith('*')) {
        return <div key={i} style={{ display: 'flex', gap: '0.5rem', color: '#475569', fontSize: '0.9rem', lineHeight: 1.6, paddingLeft: '0.5rem', marginBottom: '0.15rem' }}>
          <span style={{ color: '#0f172a', flexShrink: 0 }}>▸</span>
          <span>{trimmed.replace(/^[•\-*]\s*/, '').replace(/\*\*(.*?)\*\*/g, '$1')}</span>
        </div>;
      }

      // Normal paragraph
      return <p key={i} style={{ margin: '0 0 0.5rem 0', color: '#475569', fontSize: '0.9rem', lineHeight: 1.7 }}>
        {trimmed.replace(/\*\*(.*?)\*\*/g, '$1')}
      </p>;
    });
  };

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
          <p style={{ color: 'var(--text-muted)', margin: 0 }}>Select 2–3 deals · Compare side by side · Get AI verdict on which was better for India</p>
        </div>

        {/* Search + Filter */}
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
          <input
            type="text"
            placeholder="Search deals..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            style={{ flex: 1, minWidth: '200px', padding: '0.75rem 1rem', border: '1.5px solid #e2e8f0', borderRadius: '10px', fontSize: '0.95rem', outline: 'none' }}
          />
          <select
            value={filterType}
            onChange={e => setFilterType(e.target.value)}
            style={{ padding: '0.75rem 1rem', border: '1.5px solid #e2e8f0', borderRadius: '10px', fontSize: '0.95rem', outline: 'none', background: 'white', cursor: 'pointer' }}
          >
            {dealTypes.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>

        {/* Selected chips */}
        {selectedDealObjects.length > 0 && (
          <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>Comparing ({selectedDealObjects.length}/3):</span>
            {selectedDealObjects.map(deal => (
              <div key={deal._id} style={{
                padding: '0.4rem 0.9rem', background: '#f0f4ff', border: '2px solid var(--primary)',
                borderRadius: '20px', display: 'flex', alignItems: 'center', gap: '0.5rem',
                fontSize: '0.85rem', fontWeight: 600, color: 'var(--primary)',
              }}>
                {deal.title.length > 40 ? deal.title.slice(0, 40) + '…' : deal.title}
                <button onClick={() => toggleDeal(deal._id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--primary)', fontWeight: 800, padding: 0, lineHeight: 1 }}>✕</button>
              </div>
            ))}
            <button onClick={() => { setSelectedDeals([]); setAiVerdict(''); }}
              style={{ padding: '0.4rem 0.9rem', background: '#fee2e2', border: 'none', borderRadius: '20px', cursor: 'pointer', color: '#dc2626', fontSize: '0.85rem', fontWeight: 600 }}>
              Clear all
            </button>
          </div>
        )}

        {/* ── COMPARISON TABLE ── */}
        {selectedDealObjects.length >= 2 ? (
          <>
            <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #e2e8f0', marginBottom: '1.5rem', overflowX: 'auto' }}>
              <div style={{ padding: '1.5rem 2rem', borderBottom: '1px solid #f1f5f9' }}>
                <h2 style={{ margin: 0, color: 'var(--primary)', fontSize: '1.2rem' }}>Side-by-Side Comparison</h2>
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #f1f5f9' }}>
                    <th style={{ padding: '1rem 1.5rem', textAlign: 'left', color: '#94a3b8', fontWeight: 600, fontSize: '0.85rem', width: '160px' }}>ATTRIBUTE</th>
                    {selectedDealObjects.map(deal => (
                      <th key={deal._id} style={{ padding: '1rem 1.5rem', textAlign: 'left', minWidth: '280px', background: deal._id === maxValueId ? '#f0f9ff' : 'white' }}>
                        <div style={{ marginBottom: '0.25rem' }}>
                          {deal._id === maxValueId && <span style={{ fontSize: '0.72rem', background: '#0f172a', color: 'white', padding: '2px 7px', borderRadius: '4px', marginRight: '6px' }}>💰 Highest Value</span>}
                          {deal._id === mostRecentId && deal._id !== maxValueId && <span style={{ fontSize: '0.72rem', background: '#6366f1', color: 'white', padding: '2px 7px', borderRadius: '4px', marginRight: '6px' }}>🆕 Most Recent</span>}
                        </div>
                        <div style={{ color: 'var(--text-main)', fontWeight: 700, fontSize: '0.95rem' }}>{deal.title}</div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[
                    { label: 'COUNTRY', render: (d: Deal) => <span style={{ fontWeight: 600 }}>{d.country}</span> },
                    {
                      label: 'VALUE', bg: true, render: (d: Deal) => {
                        const val = parseValue(d.value);
                        const isHighest = d._id === maxValueId;
                        return <span style={{ fontWeight: 800, fontSize: '1.1rem', color: isHighest ? '#0f172a' : 'var(--text-main)' }}>
                          {val > 0 ? `$${val.toFixed(1)}B` : 'N/A'}
                          {isHighest && selectedDealObjects.length > 1 && <span style={{ fontSize: '0.7rem', color: '#10b981', marginLeft: '6px', fontWeight: 700 }}>▲ Highest</span>}
                        </span>;
                      }
                    },
                    {
                      label: 'STATUS', render: (d: Deal) => (
                        <span style={{ padding: '4px 10px', borderRadius: '6px', fontSize: '0.82rem', fontWeight: 700, background: `${STATUS_COLORS[d.status]}18`, color: STATUS_COLORS[d.status] || '#64748b', border: `1px solid ${STATUS_COLORS[d.status]}33` }}>
                          {d.status}
                        </span>
                      )
                    },
                    {
                      label: 'TYPE', bg: true, render: (d: Deal) => (
                        <span style={{ padding: '4px 10px', borderRadius: '6px', fontSize: '0.82rem', fontWeight: 600, background: `${TYPE_COLORS[d.type] || '#64748b'}15`, color: TYPE_COLORS[d.type] || '#64748b' }}>
                          {d.type}
                        </span>
                      )
                    },
                    {
                      label: 'IMPACT', render: (d: Deal) => (
                        <span style={{ fontWeight: 700, color: d.impact === 'High Impact' ? '#dc2626' : d.impact === 'Medium Impact' ? '#f97316' : '#64748b' }}>
                          {d.impact === 'High Impact' ? '🔴' : d.impact === 'Medium Impact' ? '🟡' : '🟢'} {d.impact}
                        </span>
                      )
                    },
                    {
                      label: 'YEAR', bg: true, render: (d: Deal) => (
                        <span style={{ fontWeight: 600 }}>
                          {extractYear(d.date)}
                          {d._id === mostRecentId && selectedDealObjects.length > 1 && <span style={{ fontSize: '0.7rem', color: '#6366f1', marginLeft: '6px', fontWeight: 700 }}>▲ Newest</span>}
                        </span>
                      )
                    },
                    { label: 'DESCRIPTION', vtop: true, render: (d: Deal) => <span style={{ color: '#475569', lineHeight: 1.6, fontSize: '0.9rem' }}>{d.description || '—'}</span> },
                    { label: 'STRATEGIC INTENT', bg: true, vtop: true, render: (d: Deal) => <span style={{ color: '#475569', lineHeight: 1.6, fontSize: '0.9rem' }}>{d.strategicIntent || '—'}</span> },
                    { label: 'WHY INDIA NEEDS THIS', vtop: true, render: (d: Deal) => <span style={{ color: '#475569', lineHeight: 1.6, fontSize: '0.9rem' }}>{d.whyIndiaNeedsThis || '—'}</span> },
                    {
                      label: 'KEY ITEMS', bg: true, vtop: true, render: (d: Deal) => d.keyItems?.length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                          {d.keyItems.map((item, i) => (
                            <div key={i} style={{ display: 'flex', gap: '0.5rem', fontSize: '0.875rem', color: '#475569' }}>
                              <span style={{ color: 'var(--primary)', flexShrink: 0 }}>▸</span>{item}
                            </div>
                          ))}
                        </div>
                      ) : <span style={{ color: '#94a3b8' }}>—</span>
                    },
                  ].map(row => (
                    <tr key={row.label} style={{ borderBottom: '1px solid #f8fafc' }}>
                      <td style={{ padding: '0.9rem 1.5rem', fontWeight: 600, color: '#64748b', fontSize: '0.82rem', verticalAlign: row.vtop ? 'top' : 'middle', background: row.bg ? '#fafafa' : 'white' }}>
                        {row.label}
                      </td>
                      {selectedDealObjects.map(deal => (
                        <td key={deal._id} style={{ padding: '0.9rem 1.5rem', verticalAlign: row.vtop ? 'top' : 'middle', background: deal._id === maxValueId ? (row.bg ? '#f5faff' : '#fafcff') : (row.bg ? '#fafafa' : 'white') }}>
                          {row.render(deal)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* ── AI VERDICT SECTION ── */}
            <div style={{
              background: 'white',
              borderRadius: '16px',
              border: '2px solid #0f172a',
              marginBottom: '2rem',
              overflow: 'hidden',
            }}>
              {/* Header */}
              <div style={{
                background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%)',
                padding: '1.5rem 2rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '1rem',
              }}>
                <div>
                  <div style={{ color: 'white', fontWeight: 800, fontSize: '1.2rem', marginBottom: '0.25rem' }}>
                    🤖 AI Analyst Verdict
                  </div>
                  <div style={{ color: '#94a3b8', fontSize: '0.85rem' }}>
                    Which deal was better for India? Ask the AI.
                  </div>
                </div>
                <button
                  onClick={getAiVerdict}
                  disabled={aiLoading}
                  style={{
                    padding: '0.75rem 1.75rem',
                    background: aiLoading ? '#334155' : '#f97316',
                    color: 'white',
                    border: 'none',
                    borderRadius: '10px',
                    fontWeight: 700,
                    fontSize: '0.95rem',
                    cursor: aiLoading ? 'not-allowed' : 'pointer',
                    transition: 'background 0.2s',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                  }}
                >
                  {aiLoading ? (
                    <>
                      <span style={{ display: 'inline-block', width: '16px', height: '16px', border: '2px solid #fff3', borderTop: '2px solid white', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                      Analysing...
                    </>
                  ) : aiVerdict ? '🔄 Re-analyse' : '⚡ Get AI Verdict'}
                </button>
              </div>

              {/* Content */}
              <div style={{ padding: '1.75rem 2rem' }}>
                {!aiVerdict && !aiLoading && !aiError && (
                  <div style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>
                    <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>🧠</div>
                    <p style={{ margin: '0 0 0.5rem 0', fontWeight: 600, color: '#64748b', fontSize: '1rem' }}>
                      Ready to analyse {selectedDealObjects.map(d => d.title.split('–')[1]?.trim() || d.title.split(' ')[0]).join(' vs ')}
                    </p>
                    <p style={{ margin: 0, fontSize: '0.85rem' }}>
                      The AI will compare strategic value, cost efficiency, delivery record, and controversy — then give a verdict.
                    </p>
                  </div>
                )}

                {aiLoading && (
                  <div style={{ textAlign: 'center', padding: '2.5rem', color: '#64748b' }}>
                    <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>⏳</div>
                    <p style={{ margin: 0, fontWeight: 600 }}>
                      Comparing {selectedDealObjects.map(d => d.title).join(' vs ')}...
                    </p>
                    <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.85rem', color: '#94a3b8' }}>This takes 5–10 seconds</p>
                  </div>
                )}

                {aiError && (
                  <div style={{ padding: '1.25rem', background: '#fef2f2', borderRadius: '10px', border: '1px solid #fecaca', color: '#dc2626', fontSize: '0.9rem' }}>
                    ⚠️ {aiError}
                  </div>
                )}

                {aiVerdict && !aiLoading && (
                  <div>
                    {/* Deals being compared — reminder chips */}
                    <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
                      {selectedDealObjects.map((d, i) => (
                        <span key={d._id} style={{
                          padding: '0.35rem 0.8rem',
                          background: i === 0 ? '#f0f4ff' : i === 1 ? '#fff7ed' : '#f0fdf4',
                          border: `1.5px solid ${i === 0 ? '#6366f1' : i === 1 ? '#f97316' : '#10b981'}`,
                          borderRadius: '20px',
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          color: i === 0 ? '#6366f1' : i === 1 ? '#f97316' : '#10b981',
                        }}>
                          {i === 0 ? '①' : i === 1 ? '②' : '③'} {d.title.length > 50 ? d.title.slice(0, 50) + '…' : d.title}
                        </span>
                      ))}
                    </div>

                    {/* AI response formatted */}
                    <div style={{
                      background: '#f8fafc',
                      borderRadius: '12px',
                      padding: '1.5rem',
                      border: '1px solid #e2e8f0',
                      lineHeight: 1.7,
                    }}>
                      {formatAiText(aiVerdict)}
                    </div>

                    <div style={{ marginTop: '1rem', fontSize: '0.75rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <span>🤖</span> AI analysis by Groq Llama 3.3 · Based on deal data + strategic context · Always verify with official sources
                    </div>
                  </div>
                )}
              </div>
            </div>
          </>
        ) : selectedDealObjects.length === 1 ? (
          <div style={{ background: 'white', borderRadius: '16px', border: '2px dashed #e2e8f0', padding: '3rem', textAlign: 'center', marginBottom: '2rem' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>👆</div>
            <h3 style={{ color: 'var(--primary)', margin: '0 0 0.5rem 0' }}>Select one more deal to compare</h3>
            <p style={{ color: '#94a3b8', margin: 0 }}>You need at least 2 deals for side-by-side comparison and AI verdict.</p>
          </div>
        ) : (
          <div style={{ background: 'white', borderRadius: '16px', border: '2px dashed #e2e8f0', padding: '4rem', textAlign: 'center', marginBottom: '2rem' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⚖️</div>
            <h3 style={{ color: 'var(--primary)', margin: '0 0 0.5rem 0' }}>Pick any 2–3 deals below</h3>
            <p style={{ color: '#94a3b8', margin: '0 0 1.5rem 0' }}>Then get an AI verdict on which was the smarter deal for India</p>
            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', flexWrap: 'wrap' }}>
              {['Rafale', 'S-400', 'BrahMos', 'Scorpene', 'Su-30MKI'].map(term => (
                <button key={term} onClick={() => setSearchTerm(term)}
                  style={{ padding: '0.4rem 0.9rem', background: '#f0f4ff', border: '1.5px solid var(--primary)', borderRadius: '20px', cursor: 'pointer', color: 'var(--primary)', fontSize: '0.85rem', fontWeight: 600 }}>
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
              const selIdx = selectedDeals.indexOf(deal._id);
              return (
                <div key={deal._id} onClick={() => !isDisabled && toggleDeal(deal._id)}
                  style={{
                    padding: '1rem',
                    background: isSelected ? '#f0f4ff' : isDisabled ? '#f8fafc' : 'white',
                    border: isSelected ? '2px solid var(--primary)' : '1.5px solid #e2e8f0',
                    borderRadius: '10px',
                    cursor: isDisabled ? 'not-allowed' : 'pointer',
                    opacity: isDisabled ? 0.45 : 1,
                    transition: 'all 0.15s',
                    position: 'relative',
                  }}
                >
                  {isSelected && (
                    <div style={{
                      position: 'absolute', top: '10px', right: '10px',
                      width: '22px', height: '22px', background: 'var(--primary)',
                      borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: 'white', fontSize: '0.75rem', fontWeight: 800,
                    }}>
                      {selIdx + 1}
                    </div>
                  )}
                  <div style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.4rem', paddingRight: '1.75rem' }}>
                    {deal.title}
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.4rem' }}>
                    <span style={{ fontSize: '0.75rem', color: '#64748b' }}>{deal.country}</span>
                    <span style={{ fontSize: '0.75rem', color: '#cbd5e1' }}>·</span>
                    <span style={{ fontSize: '0.75rem', color: TYPE_COLORS[deal.type] || '#64748b', fontWeight: 600 }}>{deal.type}</span>
                    {deal.value && deal.value !== '0' && (
                      <>
                        <span style={{ fontSize: '0.75rem', color: '#cbd5e1' }}>·</span>
                        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--primary)' }}>${parseValue(deal.value).toFixed(1)}B</span>
                      </>
                    )}
                  </div>
                  <p style={{ margin: 0, fontSize: '0.8rem', color: '#94a3b8', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {deal.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Spinner keyframe */}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}