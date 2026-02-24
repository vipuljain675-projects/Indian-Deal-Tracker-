import Link from 'next/link';

export default function Navbar() {
  return (
    <nav style={{ background: 'white', padding: '1rem 2rem', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <Link href="/" style={{ fontWeight: 'bold', fontSize: '1.2rem', textDecoration: 'none', color: 'var(--primary)' }}>🇮🇳 DealTracker</Link>
      <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
        <Link href="/" style={{ textDecoration: 'none', color: 'var(--text-main)', fontWeight: 500 }}>Dashboard</Link>
        <Link href="/analytics" style={{ textDecoration: 'none', color: 'var(--text-main)', fontWeight: 500 }}>Analytics</Link>
        <Link href="/compare" style={{ textDecoration: 'none', color: 'var(--text-main)', fontWeight: 500 }}>Compare</Link>
        <Link href="/admin" style={{ textDecoration: 'none', color: 'var(--accent)', fontWeight: 600 }}>Admin</Link>
      </div>
    </nav>
  );
}