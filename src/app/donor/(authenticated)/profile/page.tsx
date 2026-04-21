'use client';

import dynamic from 'next/dynamic';

const DonorProfile = dynamic(
  () => import('../../../pages/donor/DonorProfile').then(mod => ({ default: mod.DonorProfile })),
  { ssr: false }
);

export default function ProfilePage() {
  return <DonorProfile />;
}
