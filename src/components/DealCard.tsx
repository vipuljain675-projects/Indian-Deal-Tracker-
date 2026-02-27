import { IDeal } from '@/models/Deal';

// Country to flag emoji map
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

const typeIcons: Record<string, string> = {
  'Defense Acquisition': '🛡️',
  'Trade': '🤝',
  'Technology': '⚙️',
  'Energy': '⚡',
  'Diplomatic': '🕊️',
  'Defence': '🛡️',
};

const impactColors: Record<string, { bg: string; text: string; dot: string }> = {
  'High Impact': { bg: '#fef3c7', text: '#92400e', dot: '#f59e0b' },
  'Medium Impact': { bg: '#dbeafe', text: '#1e40af', dot: '#3b82f6' },
  'Low Impact': { bg: '#f1f5f9', text: '#475569', dot: '#94a3b8' },
};

function getFlag(country: string): string {
  return countryFlags[country] || '🌐';
}

/**
 * FIXED: Added String() conversion to prevent crashes if 'value' is a number
 * from MongoDB.
 */
function formatValue(value: any): string {
  if (value === undefined || value === null || value === '0' || value === 0) return '';
  
  // Convert to string safely before using string methods like .replace()
  const stringValue = String(value);
  const num = parseFloat(stringValue.replace(/[^0-9.]/g, ''));
  
  if (isNaN(num)) return stringValue;
  return `$${num}B`;
}

export default function DealCard({ deal }: { deal: IDeal }) {
  // Safe string conversion for status to prevent replace() errors
  const statusClass = String(deal.status || '').toLowerCase().replace(/\s+/g, '-');
  const flag = getFlag(deal.country || '');
  const typeIcon = typeIcons[deal.type] || '📋';
  const impactStyle = impactColors[deal.impact] || impactColors['Low Impact'];
  const formattedValue = formatValue(deal.value);

  // Extract year from date safely
  const year = deal.date
    ? String(deal.date).match(/\d{4}/)?.[0] || String(deal.date)
    : '';

  return (
    <div className="deal-card">
      <div className="card-top">
        <div className="card-country-row">
          <span className="card-flag">{flag}</span>
          <span className="card-country">{(deal.country || 'Unknown').toUpperCase()}</span>
          {year && <span className="card-year">• {year}</span>}
        </div>
        {formattedValue && (
          <span className="card-value">{formattedValue}</span>
        )}
      </div>

      <h3 className="card-title">{deal.title}</h3>
      <p className="card-desc">{deal.description}</p>

      <div className="card-footer">
        <div className="card-badges-left">
          <span className={`badge status-${statusClass}`}>{deal.status}</span>
          <span className="badge type-badge">
            <span style={{ marginRight: '4px' }}>{typeIcon}</span>
            {deal.type}
          </span>
        </div>
        {deal.impact && (
          <span
            className="badge impact-inline"
            style={{
              background: impactStyle.bg,
              color: impactStyle.text,
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <span
              style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                background: impactStyle.dot,
                display: 'inline-block',
              }}
            />
            {String(deal.impact).replace(' Impact', '')}
          </span>
        )}
      </div>
    </div>
  );
}