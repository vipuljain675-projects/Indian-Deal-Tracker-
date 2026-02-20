import Navbar from '@/components/Navbar';
import DealsAI from '@/components/DealsAI';

import './globals.css';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Navbar />
        <DealsAI />

        {children}
      </body>
    </html>
  );
}