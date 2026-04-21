import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { DonorProvider } from './context/DonorContext';
import '../styles/index.css';

export const metadata: Metadata = {
  title: 'DonateAI',
  description: 'AI-powered donation allocation platform',
};

export default function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <DonorProvider>{children}</DonorProvider>
      </body>
    </html>
  );
}
