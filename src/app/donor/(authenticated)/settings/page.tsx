'use client';

import dynamic from 'next/dynamic';

const DonorSettings = dynamic(
  () => import('../../../pages/donor/DonorSettings').then(mod => ({ default: mod.DonorSettings })),
  { ssr: false }
);

export default function SettingsPage() {
  return <DonorSettings />;
}
