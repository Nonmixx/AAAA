'use client';

// Re-export the existing DonorDashboard component
// This is a temporary wrapper until all pages are fully migrated

import dynamic from 'next/dynamic';

// Dynamically import to handle any potential SSR issues
const DonorDashboard = dynamic(
  () => import('../../../pages/donor/DonorDashboard').then(mod => ({ default: mod.DonorDashboard })),
  { ssr: false }
);

export default function DonorDashboardPage() {
  return <DonorDashboard />;
}
