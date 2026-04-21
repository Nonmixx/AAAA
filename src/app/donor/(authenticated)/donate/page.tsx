'use client';

import dynamic from 'next/dynamic';

const AIDonation = dynamic(
  () => import('../../../pages/donor/AIDonation').then(mod => ({ default: mod.AIDonation })),
  { ssr: false }
);

export default function DonatePage() {
  return <AIDonation />;
}
