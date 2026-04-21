'use client';

import dynamic from 'next/dynamic';

const IncomingDonations = dynamic(
  () => import('../../pages/receiver/IncomingDonations').then(mod => ({ default: mod.IncomingDonations })),
  { ssr: false }
);

export default function IncomingPage() {
  return <IncomingDonations />;
}
