interface Props {
  label: string;
  value: string | number;
  icon: string;
  description?: string;
  color?: string;
}

export default function StatCard({ label, value, icon, description, color = '#003366' }: Props) {
  return (
    <div className="stat-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <p style={{ fontSize: '0.72rem', fontWeight: 700, color: '#94a3b8', letterSpacing: '0.06em', textTransform: 'uppercase', margin: 0 }}>
            {label}
          </p>
          <p className="stat-value" style={{ color }}>
            {value}
          </p>
          {description && (
            <p style={{ fontSize: '0.78rem', color: '#94a3b8', margin: 0 }}>{description}</p>
          )}
        </div>
        <div style={{
          width: 44,
          height: 44,
          borderRadius: 12,
          background: `${color}15`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '1.3rem',
          flexShrink: 0,
        }}>
          {icon}
        </div>
      </div>
    </div>
  );
}