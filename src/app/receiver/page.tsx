'use client';

import dynamic from 'next/dynamic';

const ReceiverDashboard = dynamic(
  () => import('../pages/receiver/ReceiverDashboard').then(mod => ({ default: mod.ReceiverDashboard })),
  { ssr: false }
);

export default function ReceiverDashboardPage() {
  return <ReceiverDashboard />;
}
