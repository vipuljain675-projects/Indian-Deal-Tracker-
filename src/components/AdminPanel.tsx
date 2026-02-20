'use client';
import { useState } from 'react';

const countryFlags: Record<string, string> = {
  'USA': '🇺🇸', 'United States': '🇺🇸', 'Russia': '🇷🇺', 'France': '🇫🇷',
  'United Kingdom': '🇬🇧', 'UK': '🇬🇧', 'Israel': '🇮🇱', 'Japan': '🇯🇵',
  'Germany': '🇩🇪', 'China': '🇨🇳', 'Pakistan': '🇵🇰', 'Iran': '🇮🇷',
  'UAE': '🇦🇪', 'Saudi Arabia': '🇸🇦', 'Australia': '🇦🇺', 'Canada': '🇨🇦',
  'South Korea': '🇰🇷', 'Italy': '🇮🇹', 'European Union': '🇪🇺', 'India': '🇮🇳',
  'Egypt': '🇪🇬', 'Philippines': '🇵🇭', 'Nepal': '🇳🇵', 'Bangladesh': '🇧🇩',
  'Brazil': '🇧🇷', 'Croatia': '🇭🇷', 'Greece': '🇬🇷', 'Switzerland': '🇨🇭',
  'Singapore': '🇸🇬', 'Vietnam': '🇻🇳', 'Norway': '🇳🇴', 'ASEAN': '🌏',
};
const getFlag = (c: string) => countryFlags[c] || '🌐';

interface Props {
  pendingDeals: any[];
  stats: { total: number; pending: number; byStatus: Record<string, number> };
}

export default function AdminPanel({ pendingDeals: initialPending, stats }: Props) {
  const [pending, setPending] = useState(initialPending);

  // URL / Text extraction
  const [urlInput, setUrlInput] = useState('');
  const [rawTextInput, setRawTextInput] = useState('');
  const [extractMode, setExtractMode] = useState<'url' | 'text'>('url');
  const [extracting, setExtracting] = useState(false);
  const [extractResult, setExtractResult] = useState<any>(null);
  const [extractError, setExtractError] = useState('');

  // Cron
  const [cronRunning, setCronRunning] = useState(false);
  const [cronResult, setCronResult] = useState<any>(null);

  // Tab
  const [tab, setTab] = useState<'queue' | 'url' | 'cron' | 'add'>('queue');

  // Manual add form
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

  // ── Extract Deal ──
  async function handleExtract() {
    const hasUrl = urlInput.trim();
    const hasText = rawTextInput.trim();
    if (!hasUrl && !hasText) return;

    setExtracting(true);
    setExtractResult(null);
    setExtractError('');

    try {
      const body = extractMode === 'text' ? { rawText: hasText } : { url: hasUrl };

      const res = await fetch('/api/extract-deal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.error === 'paywalled') {
          setExtractMode('text');
          setExtractError('⚠️ ' + data.message);
        } else if (data.error === 'not_a_deal') {
          setExtractError('🤖 ' + data.message);
        } else if (data.error === 'duplicate') {
          setExtractError('📋 ' + data.message);
        } else if (data.error === 'quota') {
          setExtractError('⏳ ' + data.message);
        } else {
          setExtractError('❌ ' + (data.message || 'Something went wrong.'));
        }
        return;
      }

      setExtractResult(data.deal);
      setUrlInput('');
      setRawTextInput('');
      setExtractMode('url');
      setPending(prev => [{ ...data.deal, _id: data.id, reviewStatus: 'pending', sourceUrl: hasUrl }, ...prev]);
    } catch (err: any) {
      setExtractError('❌ Network error: ' + err.message);
    } finally {
      setExtracting(false);
    }
  }

  // ── Trigger Cron ──
  async function handleCron() {
    setCronRunning(true);
    setCronResult(null);
    try {
      // Uses NEXT_PUBLIC_CRON_SECRET env var — set this in Vercel dashboard too
      const secret = process.env.NEXT_PUBLIC_CRON_SECRET || 'mySuperSecret123';
      const res = await fetch('/api/cron/fetch-deals', {
        headers: { Authorization: `Bearer ${secret}` },
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
        keyItems: newDeal.keyItems.split('\n').map((s: string) => s.trim()).filter(Boolean),
        reviewStatus: 'approved',
        createdAt: new Date(),
      };
      const res = await fetch('/api/deals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        alert('✅ Deal added and is now live on the dashboard!');
        setNewDeal({ title: '', country: '', value: '0', status: 'Proposed', type: 'Trade', impact: 'High Impact', description: '', strategicIntent: '', whyIndiaNeedsThis: '', keyItems: '', date: '' });
      } else {
        const d = await res.json();
        alert('Error: ' + (d.message || d.error));
      }
    } finally {
      setAdding(false);
    }
  }

  return (
    <div className="admin-container">

      {/* ── Header ── */}
      <div className="admin-header">
        <div>
          <h1>🇮🇳 Admin Panel</h1>
          <p>Manage deals, review AI-fetched entries, and trigger news scans</p>
        </div>
        <div className="admin-stats-row">
          <div className="mini-stat"><span>{stats.total}</span>Live Deals</div>
          <div className="mini-stat pending"><span>{pending.length}</span>Pending Review</div>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="admin-tabs">
        <button className={tab === 'queue' ? 'tab active' : 'tab'} onClick={() => setTab('queue')}>
          📥 Review Queue {pending.length > 0 && <span className="tab-badge">{pending.length}</span>}
        </button>
        <button className={tab === 'url' ? 'tab active' : 'tab'} onClick={() => setTab('url')}>
          🔗 Paste URL / Text
        </button>
        <button className={tab === 'cron' ? 'tab active' : 'tab'} onClick={() => setTab('cron')}>
          🤖 Auto-Scan
        </button>
        <button className={tab === 'add' ? 'tab active' : 'tab'} onClick={() => setTab('add')}>
          ➕ Add Manually
        </button>
      </div>

      {/* ══════════════════════════════════════════
          Tab: Review Queue
      ══════════════════════════════════════════ */}
      {tab === 'queue' && (
        <div className="tab-content">
          <div className="tab-intro">
            <h2>AI-Fetched Deals Awaiting Review</h2>
            <p>Approve to make live on dashboard, or reject to discard.</p>
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
                    <div style={{ flex: 1 }}>
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
                      {deal.value && deal.value !== '0' ? `$${deal.value}B` : '—'}
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
                    <span className={`badge status-${deal.status?.toLowerCase().replace(/\s+/g, '-')}`}>{deal.status}</span>
                    <span className="badge impact-badge">{deal.impact}</span>
                    <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.5rem' }}>
                      <button className="btn-reject" onClick={() => handleReview(deal._id, 'reject')}>✕ Reject</button>
                      <button className="btn-approve" onClick={() => handleReview(deal._id, 'approve')}>✓ Approve & Go Live</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════
          Tab: Paste URL / Text
      ══════════════════════════════════════════ */}
      {tab === 'url' && (
        <div className="tab-content">
          <div className="tab-intro">
            <h2>🔗 Add Deal from News Article</h2>
            <p>Paste a URL or article text — Groq AI extracts all deal details automatically.</p>
          </div>

          <div className="url-box">
            {/* Mode toggle */}
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
              <button
                onClick={() => { setExtractMode('url'); setExtractError(''); }}
                style={{
                  padding: '8px 18px', borderRadius: '8px', border: 'none', cursor: 'pointer',
                  fontWeight: 700, fontSize: '0.875rem',
                  background: extractMode === 'url' ? 'var(--primary)' : '#f1f5f9',
                  color: extractMode === 'url' ? 'white' : '#64748b',
                }}
              >
                🔗 Paste URL
              </button>
              <button
                onClick={() => { setExtractMode('text'); setExtractError(''); }}
                style={{
                  padding: '8px 18px', borderRadius: '8px', border: 'none', cursor: 'pointer',
                  fontWeight: 700, fontSize: '0.875rem',
                  background: extractMode === 'text' ? 'var(--primary)' : '#f1f5f9',
                  color: extractMode === 'text' ? 'white' : '#64748b',
                }}
              >
                📋 Paste Article Text
              </button>
            </div>

            {extractMode === 'url' ? (
              <div className="url-input-row">
                <input
                  type="url"
                  className="url-input"
                  placeholder="https://ndtv.com/india-news/india-signs-deal..."
                  value={urlInput}
                  onChange={e => { setUrlInput(e.target.value); setExtractError(''); setExtractResult(null); }}
                  onKeyDown={e => e.key === 'Enter' && handleExtract()}
                />
                <button className="btn-primary" onClick={handleExtract} disabled={extracting || !urlInput.trim()}>
                  {extracting ? '⏳ Reading...' : '🤖 Extract Deal'}
                </button>
              </div>
            ) : (
              <div>
                <p style={{ fontSize: '0.82rem', color: '#64748b', marginBottom: '0.5rem' }}>
                  Copy the full article text from any news site and paste below:
                </p>
                <textarea
                  rows={10}
                  className="url-input"
                  style={{ width: '100%', boxSizing: 'border-box', resize: 'vertical', fontFamily: 'inherit', fontSize: '0.875rem' }}
                  placeholder="Paste article text here — AI will read and extract deal details..."
                  value={rawTextInput}
                  onChange={e => { setRawTextInput(e.target.value); setExtractError(''); setExtractResult(null); }}
                />
                <button
                  className="btn-primary"
                  style={{ marginTop: '0.75rem' }}
                  onClick={handleExtract}
                  disabled={extracting || rawTextInput.trim().length < 100}
                >
                  {extracting ? '⏳ Extracting...' : '🤖 Extract Deal from Text'}
                </button>
              </div>
            )}

            {extractError && (
              <div className="alert-error" style={{ marginTop: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', flexWrap: 'wrap' }}>
                <span>{extractError}</span>
                {extractMode === 'url' && (
                  <button
                    onClick={() => setExtractMode('text')}
                    style={{ background: 'white', border: '1px solid #991b1b', borderRadius: '6px', padding: '4px 12px', cursor: 'pointer', fontSize: '0.8rem', color: '#991b1b', whiteSpace: 'nowrap' }}
                  >
                    Try pasting text instead →
                  </button>
                )}
              </div>
            )}

            {extractResult && (
              <div className="extract-preview" style={{ marginTop: '1rem' }}>
                <div className="extract-preview-header">✅ Deal extracted! Added to Review Queue.</div>
                <div className="extract-preview-body">
                  <div className="extract-row">
                    <span style={{ fontSize: '1.3rem' }}>{getFlag(extractResult.country)}</span>
                    <strong>{extractResult.title}</strong>
                  </div>
                  <p style={{ fontSize: '0.875rem', color: '#475569', margin: '0.5rem 0' }}>{extractResult.description}</p>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <span className={`badge status-${extractResult.status?.toLowerCase().replace(/\s+/g, '-')}`}>{extractResult.status}</span>
                    <span className="badge type-badge">{extractResult.type}</span>
                    <span className="badge impact-badge">{extractResult.impact}</span>
                  </div>
                </div>
                <button className="btn-secondary" style={{ marginTop: '1rem' }} onClick={() => { setTab('queue'); setExtractResult(null); }}>
                  Go to Review Queue →
                </button>
              </div>
            )}
          </div>

          <div className="url-tips">
            <h3>Works best with open-access sources:</h3>
            <div className="source-pills">
              {['NDTV', 'Times of India', 'Indian Express', 'Reuters', 'Economic Times', 'Mint', 'ANI News', 'Business Standard', 'DD News'].map(s => (
                <span key={s} className="source-pill">{s}</span>
              ))}
            </div>
            <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '0.75rem' }}>
              💡 The Hindu, Bloomberg, FT are paywalled — use <strong>Paste Article Text</strong> mode for those.
            </p>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════
          Tab: Auto-Scan
      ══════════════════════════════════════════ */}
      {tab === 'cron' && (
        <div className="tab-content">
          <div className="tab-intro">
            <h2>🤖 Automatic News Scanner</h2>
            <p>Runs <strong>automatically once daily</strong> via Vercel Cron. Trigger manually below to scan right now.</p>
          </div>

          <div className="cron-box">
            <div className="cron-schedule">
              <div className="cron-item">
                <span>🕐</span>
                <div>
                  <strong>Auto Schedule</strong>
                  <p>Runs once daily at 09:00 UTC (Vercel Hobby plan)</p>
                </div>
              </div>
              <div className="cron-item">
                <span>📰</span>
                <div>
                  <strong>News Sources</strong>
                  <p>NewsAPI — 4 India-specific search queries</p>
                </div>
              </div>
              <div className="cron-item">
                <span>🧠</span>
                <div>
                  <strong>AI Extraction</strong>
                  <p>Groq AI (Llama 3.3 70B) — 14,400 free requests/day</p>
                </div>
              </div>
              <div className="cron-item">
                <span>✋</span>
                <div>
                  <strong>Human Review</strong>
                  <p>All AI deals go to Review Queue before going live</p>
                </div>
              </div>
            </div>

            <button className="btn-cron" onClick={handleCron} disabled={cronRunning}>
              {cronRunning ? '⏳ Scanning news... (~1 min)' : '▶ Run Manual Scan Now'}
            </button>

            {cronResult && (
              <div className={`cron-result ${cronResult.error ? 'cron-error' : 'cron-success'}`}>
                {cronResult.error ? (
                  <p>❌ Error: {cronResult.error}</p>
                ) : (
                  <>
                    <p>✅ Scan complete — {new Date(cronResult.timestamp).toLocaleTimeString()}</p>
                    <p><strong>{cronResult.added}</strong> new deals added to review queue</p>
                    <p><strong>{cronResult.skipped}</strong> articles skipped</p>
                    {cronResult.added > 0 && (
                      <button className="btn-secondary" style={{ marginTop: '0.75rem' }} onClick={() => setTab('queue')}>
                        Review New Deals →
                      </button>
                    )}
                  </>
                )}
              </div>
            )}
          </div>

          <div className="cron-setup">
            <h3>Required Environment Variables</h3>
            <div className="env-list">
              <div className="env-item">
                <code>NEWS_API_KEY</code>
                <span>Free from <a href="https://newsapi.org" target="_blank" rel="noopener noreferrer">newsapi.org</a></span>
              </div>
              <div className="env-item">
                <code>GROQ_API_KEY</code>
                <span>Free from <a href="https://console.groq.com" target="_blank" rel="noopener noreferrer">console.groq.com</a> — 14,400 req/day</span>
              </div>
              <div className="env-item">
                <code>CRON_SECRET</code>
                <span>Any random string</span>
              </div>
              <div className="env-item">
                <code>NEXT_PUBLIC_CRON_SECRET</code>
                <span>Same value as CRON_SECRET — needed for manual trigger button</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════
          Tab: Add Manually
      ══════════════════════════════════════════ */}
      {tab === 'add' && (
        <div className="tab-content">
          <div className="tab-intro">
            <h2>➕ Add Deal Manually</h2>
            <p>Goes live immediately on the dashboard — no review needed.</p>
          </div>

          <div className="manual-form">
            <div className="form-row-2">
              <div className="input-group">
                <label>Deal Title *</label>
                <input value={newDeal.title} onChange={e => setNewDeal({ ...newDeal, title: e.target.value })} placeholder="India–France Rafale MRFA Deal" />
              </div>
              <div className="input-group">
                <label>Partner Country *</label>
                <input value={newDeal.country} onChange={e => setNewDeal({ ...newDeal, country: e.target.value })} placeholder="France" />
              </div>
            </div>

            <div className="form-row-3">
              <div className="input-group">
                <label>Value (Billions USD)</label>
                <input value={newDeal.value} onChange={e => setNewDeal({ ...newDeal, value: e.target.value })} placeholder="40" />
              </div>
              <div className="input-group">
                <label>Status</label>
                <select value={newDeal.status} onChange={e => setNewDeal({ ...newDeal, status: e.target.value })}>
                  <option>Proposed</option>
                  <option>Signed</option>
                  <option>In Progress</option>
                  <option>Ongoing</option>
                  <option>Completed</option>
                </select>
              </div>
              <div className="input-group">
                <label>Date</label>
                <input value={newDeal.date} onChange={e => setNewDeal({ ...newDeal, date: e.target.value })} placeholder="February 2026" />
              </div>
            </div>

            <div className="form-row-2">
              <div className="input-group">
                <label>Type</label>
                <select value={newDeal.type} onChange={e => setNewDeal({ ...newDeal, type: e.target.value })}>
                  <option>Defense Acquisition</option>
                  <option>Trade</option>
                  <option>Technology</option>
                  <option>Energy</option>
                  <option>Diplomatic</option>
                </select>
              </div>
              <div className="input-group">
                <label>Impact</label>
                <select value={newDeal.impact} onChange={e => setNewDeal({ ...newDeal, impact: e.target.value })}>
                  <option>High Impact</option>
                  <option>Medium Impact</option>
                  <option>Low Impact</option>
                </select>
              </div>
            </div>

            <div className="input-group">
              <label>Description</label>
              <textarea rows={3} value={newDeal.description} onChange={e => setNewDeal({ ...newDeal, description: e.target.value })} placeholder="A brief factual summary of the deal..." />
            </div>

            <div className="input-group">
              <label>Strategic Intent</label>
              <textarea rows={2} value={newDeal.strategicIntent} onChange={e => setNewDeal({ ...newDeal, strategicIntent: e.target.value })} placeholder="What India aims to achieve with this deal..." />
            </div>

            <div className="input-group">
              <label>Why India Needs This</label>
              <textarea rows={2} value={newDeal.whyIndiaNeedsThis} onChange={e => setNewDeal({ ...newDeal, whyIndiaNeedsThis: e.target.value })} placeholder="The specific need or gap this addresses..." />
            </div>

            <div className="input-group">
              <label>Key Items (one per line)</label>
              <textarea rows={4} value={newDeal.keyItems} onChange={e => setNewDeal({ ...newDeal, keyItems: e.target.value })} placeholder={"36 Rafale jets\nMeteor BVR missiles\nTechnology transfer to HAL\nOffset clause 50%"} />
            </div>

            <button
              className="btn-primary"
              onClick={handleManualAdd}
              disabled={adding || !newDeal.title || !newDeal.country}
            >
              {adding ? '⏳ Adding...' : '➕ Add Deal (Goes Live Immediately)'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}