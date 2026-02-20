import Link from 'next/link';

export default function Navbar() {
  return (
    <nav style={{ background: 'white', padding: '1rem 2rem', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between' }}>
      <Link href="/" style={{ fontWeight: 'bold', fontSize: '1.2rem', textDecoration: 'none', color: 'var(--primary)' }}>🇮🇳 DealTracker</Link>
      <div>
        <Link href="/" style={{ marginRight: '1rem', textDecoration: 'none' }}>Dashboard</Link>
        <Link href="/admin" style={{ textDecoration: 'none', color: 'var(--accent)' }}>Admin Panel</Link>
      </div>
    </nav>
  );
}