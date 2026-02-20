'use client';
import { useState } from 'react';

const countryFlags: Record<string, string> = {
  'USA': '🇺🇸', 'United States': '🇺🇸', 'Russia': '🇷🇺', 'France': '🇫🇷',
  'United Kingdom': '🇬🇧', 'UK': '🇬🇧', 'Israel': '🇮🇱', 'Japan': '🇯🇵',
  'Germany': '🇩🇪', 'China': '🇨🇳', 'Pakistan': '🇵🇰', 'Iran': '🇮🇷',
  'UAE': '🇦🇪', 'Saudi Arabia': '🇸🇦', 'Australia': '🇦🇺', 'Canada': '🇨🇦',
  'South Korea': '🇰🇷', 'Italy': '🇮🇹', 'European Union': '🇪🇺', 'India': '🇮🇳',
  'Egypt': '🇪🇬', 'Philippines': '🇵🇭', 'Nepal': '🇳🇵', 'Bangladesh': '🇧🇩',
};
const getFlag = (c: string) => countryFlags[c] || '🌐';

interface Props {
  pendingDeals: any[];
  stats: { total: number; pending: number; byStatus: Record<string, number> };
}

export default function AdminPanel({ pendingDeals: initialPending, stats }: Props) {
  const [pending, setPending] = useState(initialPending);
  const [urlInput, setUrlInput] = useState('');
  const [extracting, setExtracting] = useState(false);
  const [extractResult, setExtractResult] = useState<any>(null);
  const [extractError, setExtractError] = useState('');
  const [cronRunning, setCronRunning] = useState(false);
  const [cronResult, setCronResult] = useState<any>(null);
  const [tab, setTab] = useState<'queue' | 'url' | 'cron' | 'add'>('queue');

  // Manual add form state
  const [newDeal, setNewDeal] = useState({
    title: '', country: '', value: '0', status: 'Proposed',
    type: 'Trade', impact: 'High Impact', description: '',
    strategicIntent: '', whyIndiaNeedsThis: '', keyItems: '', date: '',
  });
  const [adding, setAdding] = useState(false);

  // ── Approve / Reject ──
  async function handleReview(id: string, action: 'approve' | 'reject') {
    await fetch('/api/admin/review', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, action }),
    });
    setPending(prev => prev.filter(d => d._id !== id));
  }

  // ── URL Extract ──
  async function handleExtract() {
    if (!urlInput.trim()) return;
    setExtracting(true);
    setExtractResult(null);
    setExtractError('');
    try {
      const res = await fetch('/api/extract-deal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: urlInput }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setExtractResult(data.deal);
      setUrlInput('');
      // Add to pending queue display
      setPending(prev => [{ ...data.deal, _id: data.id, reviewStatus: 'pending', sourceUrl: urlInput }, ...prev]);
    } catch (err: any) {
      setExtractError(err.message);
    } finally {
      setExtracting(false);
    }
  }

  // ── Trigger Cron ──
  async function handleCron() {
    setCronRunning(true);
    setCronResult(null);
    try {
      const res = await fetch('/api/cron/fetch-deals', {
        headers: { Authorization: `Bearer ${process.env.NEXT_PUBLIC_CRON_SECRET || 'dev-secret'}` },
      });
      const data = await res.json();
      setCronResult(data);
    } catch (err: any) {
      setCronResult({ error: err.message });
    } finally {
      setCronRunning(false);
    }
  }

  // ── Manual Add ──
  async function handleManualAdd() {
    setAdding(true);
    try {
      const payload = {
        ...newDeal,
        keyItems: newDeal.keyItems.split('\n').map(s => s.trim()).filter(Boolean),
        reviewStatus: 'approved',
        createdAt: new Date(),
      };
      const res = await fetch('/api/deals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        alert('✅ Deal added successfully!');
        setNewDeal({ title: '', country: '', value: '0', status: 'Proposed', type: 'Trade', impact: 'High Impact', description: '', strategicIntent: '', whyIndiaNeedsThis: '', keyItems: '', date: '' });
      } else {
        const d = await res.json();
        alert('Error: ' + d.error);
      }
    } finally {
      setAdding(false);
    }
  }

  return (
    <div className="admin-container">
      {/* Header */}
      <div className="admin-header">
        <div>
          <h1>🇮🇳 Admin Panel</h1>
          <p>Manage deals, review AI-fetched entries, and trigger news scans</p>
        </div>
        <div className="admin-stats-row">
          <div className="mini-stat"><span>{stats.total}</span>Live Deals</div>
          <div className="mini-stat pending"><span>{stats.pending + pending.length}</span>Pending Review</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="admin-tabs">
        <button className={tab === 'queue' ? 'tab active' : 'tab'} onClick={() => setTab('queue')}>
          📥 Review Queue {pending.length > 0 && <span className="tab-badge">{pending.length}</span>}
        </button>
        <button className={tab === 'url' ? 'tab active' : 'tab'} onClick={() => setTab('url')}>
          🔗 Paste URL
        </button>
        <button className={tab === 'cron' ? 'tab active' : 'tab'} onClick={() => setTab('cron')}>
          🤖 Auto-Scan
        </button>
        <button className={tab === 'add' ? 'tab active' : 'tab'} onClick={() => setTab('add')}>
          ➕ Add Manually
        </button>
      </div>

      {/* ── Tab: Review Queue ── */}
      {tab === 'queue' && (
        <div className="tab-content">
          <div className="tab-intro">
            <h2>AI-Fetched Deals Awaiting Review</h2>
            <p>These deals were found by AI scanning news. Review and approve or reject each one.</p>
          </div>
          {pending.length === 0 ? (
            <div className="empty-state">
              <span>🎉</span>
              <p>All caught up! No pending deals.</p>
              <button className="btn-secondary" onClick={() => setTab('cron')}>Run Auto-Scan</button>
            </div>
          ) : (
            <div className="pending-list">
              {pending.map(deal => (
                <div key={deal._id} className="pending-card">
                  <div className="pending-card-top">
                    <div>
                      <div className="pending-meta">
                        <span>{getFlag(deal.country)}</span>
                        <span className="pending-country">{deal.country}</span>
                        <span className="pending-type-badge">{deal.type}</span>
                        {deal.sourceUrl && (
                          <a href={deal.sourceUrl} target="_blank" rel="noopener noreferrer" className="source-link">
                            📰 Source
                          </a>
                        )}
                      </div>
                      <h3 className="pending-title">{deal.title}</h3>
                      <p className="pending-desc">{deal.description}</p>
                    </div>
                    <div className="pending-value">
                      {deal.value !== '0' && deal.value ? `$${deal.value}B` : '—'}
                    </div>
                  </div>

                  <div className="pending-details">
                    {deal.strategicIntent && (
                      <div className="pending-field">
                        <strong>🎯 Strategic Intent</strong>
                        <p>{deal.strategicIntent}</p>
                      </div>
                    )}
                    {deal.whyIndiaNeedsThis && (
                      <div className="pending-field">
                        <strong>💡 Why India Needs This</strong>
                        <p>{deal.whyIndiaNeedsThis}</p>
                      </div>
                    )}
                  </div>

                  <div className="pending-actions">
                    <span className={`badge status-${deal.status?.toLowerCase().replace(/\s+/g, '-')}`}>
                      {deal.status}
                    </span>
                    <span className="badge impact-badge">{deal.impact}</span>
                    <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.5rem' }}>
                      <button
                        className="btn-reject"
                        onClick={() => handleReview(deal._id, 'reject')}
                      >
                        ✕ Reject
                      </button>
                      <button
                        className="btn-approve"
                        onClick={() => handleReview(deal._id, 'approve')}
                      >
                        ✓ Approve
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Tab: Paste URL ── */}
      {tab === 'url' && (
        <div className="tab-content">
          <div className="tab-intro">
            <h2>🔗 Paste a News Article URL</h2>
            <p>Just saw a deal in the news? Paste the article URL — AI will read it and extract all deal details automatically.</p>
          </div>
          <div className="url-box">
            <div className="url-input-row">
              <input
                type="url"
                className="url-input"
                placeholder="https://thehindu.com/news/india-france-deal-2026..."
                value={urlInput}
                onChange={e => setUrlInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleExtract()}
              />
              <button
                className="btn-primary"
                onClick={handleExtract}
                disabled={extracting || !urlInput.trim()}
              >
                {extracting ? '⏳ Extracting...' : '🤖 Extract Deal'}
              </button>
            </div>

            {extractError && (
              <div className="alert-error">❌ {extractError}</div>
            )}

            {extractResult && (
              <div className="extract-preview">
                <div className="extract-preview-header">
                  <span>✅ Deal extracted and added to Review Queue!</span>
                </div>
                <div className="extract-preview-body">
                  <div className="extract-row">
                    <span>{getFlag(extractResult.country)}</span>
                    <strong>{extractResult.title}</strong>
                  </div>
                  <p>{extractResult.description}</p>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <span className={`badge status-${extractResult.status?.toLowerCase().replace(/\s+/g, '-')}`}>{extractResult.status}</span>
                    <span className="badge type-badge">{extractResult.type}</span>
                    <span className="badge impact-badge">{extractResult.impact}</span>
                  </div>
                </div>
                <button className="btn-secondary" onClick={() => setTab('queue')}>
                  Go to Review Queue →
                </button>
              </div>
            )}
          </div>

          <div className="url-tips">
            <h3>Works with any news source:</h3>
            <div className="source-pills">
              {['The Hindu', 'Times of India', 'Indian Express', 'Reuters', 'Bloomberg', 'NDTV', 'Mint', 'Economic Times'].map(s => (
                <span key={s} className="source-pill">{s}</span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Tab: Auto Scan ── */}
      {tab === 'cron' && (
        <div className="tab-content">
          <div className="tab-intro">
            <h2>🤖 Automatic News Scanner</h2>
            <p>
              This scanner runs <strong>automatically every 6 hours</strong> via Vercel Cron — no action needed.
              You can also trigger it manually below to fetch the latest deals right now.
            </p>
          </div>

          <div className="cron-box">
            <div className="cron-schedule">
              <div className="cron-item">
                <span>🕐</span>
                <div>
                  <strong>Auto Schedule</strong>
                  <p>Runs at 00:00, 06:00, 12:00, 18:00 UTC daily</p>
                </div>
              </div>
              <div className="cron-item">
                <span>📰</span>
                <div>
                  <strong>News Sources Scanned</strong>
                  <p>NewsAPI — 7 India-specific search queries</p>
                </div>
              </div>
              <div className="cron-item">
                <span>🧠</span>
                <div>
                  <strong>AI Extraction</strong>
                  <p>Gemini AI reads each article and extracts structured deal data</p>
                </div>
              </div>
              <div className="cron-item">
                <span>✋</span>
                <div>
                  <strong>Human Review</strong>
                  <p>All AI-found deals go to Review Queue — you approve before they go live</p>
                </div>
              </div>
            </div>

            <button
              className="btn-cron"
              onClick={handleCron}
              disabled={cronRunning}
            >
              {cronRunning ? '⏳ Scanning news...' : '▶ Run Manual Scan Now'}
            </button>

            {cronResult && (
              <div className={`cron-result ${cronResult.error ? 'cron-error' : 'cron-success'}`}>
                {cronResult.error ? (
                  <p>❌ Error: {cronResult.error}</p>
                ) : (
                  <>
                    <p>✅ Scan complete at {new Date(cronResult.timestamp).toLocaleTimeString()}</p>
                    <p><strong>{cronResult.added}</strong> new deals added to review queue</p>
                    <p><strong>{cronResult.skipped}</strong> articles skipped (duplicates or non-deals)</p>
                    {cronResult.added > 0 && (
                      <button className="btn-secondary" onClick={() => setTab('queue')}>
                        Review New Deals →
                      </button>
                    )}
                  </>
                )}
              </div>
            )}
          </div>

          <div className="cron-setup">
            <h3>Setup Requirements</h3>
            <div className="env-list">
              <div className="env-item">
                <code>NEWS_API_KEY</code>
                <span>Free key from <a href="https://newsapi.org" target="_blank" rel="noopener noreferrer">newsapi.org</a></span>
              </div>
              <div className="env-item">
                <code>ANTHROPIC_API_KEY</code>
                <span>Your Claude API key for AI extraction</span>
              </div>
              <div className="env-item">
                <code>CRON_SECRET</code>
                <span>Any random string to secure the cron endpoint</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Tab: Manual Add ── */}
      {tab === 'add' && (
        <div className="tab-content">
          <div className="tab-intro">
            <h2>➕ Add Deal Manually</h2>
            <p>Add a deal directly without going through the AI review queue.</p>
          </div>

          <div className="manual-form">
            <div className="form-row-2">
              <div className="input-group">
                <label>Deal Title *</label>
                <input value={newDeal.title} onChange={e => setNewDeal({...newDeal, title: e.target.value})} placeholder="India–France Rafale MRFA Deal" />
              </div>
              <div className="input-group">
                <label>Partner Country *</label>
                <input value={newDeal.country} onChange={e => setNewDeal({...newDeal, country: e.target.value})} placeholder="France" />
              </div>
            </div>

            <div className="form-row-3">
              <div className="input-group">
                <label>Value (USD Billions)</label>
                <input type="text" value={newDeal.value} onChange={e => setNewDeal({...newDeal, value: e.target.value})} placeholder="40" />
              </div>
              <div className="input-group">
                <label>Status</label>
                <select value={newDeal.status} onChange={e => setNewDeal({...newDeal, status: e.target.value})}>
                  <option>Proposed</option><option>Signed</option><option>In Progress</option><option>Ongoing</option><option>Completed</option>
                </select>
              </div>
              <div className="input-group">
                <label>Date</label>
                <input value={newDeal.date} onChange={e => setNewDeal({...newDeal, date: e.target.value})} placeholder="February 2026" />
              </div>
            </div>

            <div className="form-row-2">
              <div className="input-group">
                <label>Type</label>
                <select value={newDeal.type} onChange={e => setNewDeal({...newDeal, type: e.target.value})}>
                  <option>Defense Acquisition</option><option>Trade</option><option>Technology</option><option>Energy</option><option>Diplomatic</option>
                </select>
              </div>
              <div className="input-group">
                <label>Impact</label>
                <select value={newDeal.impact} onChange={e => setNewDeal({...newDeal, impact: e.target.value})}>
                  <option>High Impact</option><option>Medium Impact</option><option>Low Impact</option>
                </select>
              </div>
            </div>

            <div className="input-group">
              <label>Description</label>
              <textarea rows={3} value={newDeal.description} onChange={e => setNewDeal({...newDeal, description: e.target.value})} placeholder="A brief factual summary of the deal..." />
            </div>

            <div className="input-group">
              <label>Strategic Intent</label>
              <textarea rows={2} value={newDeal.strategicIntent} onChange={e => setNewDeal({...newDeal, strategicIntent: e.target.value})} placeholder="What India aims to achieve..." />
            </div>

            <div className="input-group">
              <label>Why India Needs This</label>
              <textarea rows={2} value={newDeal.whyIndiaNeedsThis} onChange={e => setNewDeal({...newDeal, whyIndiaNeedsThis: e.target.value})} placeholder="The specific Indian need this addresses..." />
            </div>

            <div className="input-group">
              <label>Key Items (one per line)</label>
              <textarea rows={3} value={newDeal.keyItems} onChange={e => setNewDeal({...newDeal, keyItems: e.target.value})} placeholder={"36 Rafale jets\nMeteor BVR missiles\nTechnology transfer to HAL"} />
            </div>

            <button
              className="btn-primary"
              onClick={handleManualAdd}
              disabled={adding || !newDeal.title || !newDeal.country}
            >
              {adding ? '⏳ Adding...' : '➕ Add Deal'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
