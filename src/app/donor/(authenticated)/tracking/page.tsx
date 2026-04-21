'use client';

import dynamic from 'next/dynamic';

const DonorTracking = dynamic(
  () => import('../../../pages/donor/DonorTracking').then(mod => ({ default: mod.DonorTracking })),
  { ssr: false }
);

export default function TrackingPage() {
  return <DonorTracking />;
}
