import type { ReactNode } from 'react';
import './globals.css';

export const metadata = {
  title: 'OmniCore Admin',
  description: 'Retail operations platform',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
