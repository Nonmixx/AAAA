'use client';

import dynamic from 'next/dynamic';

const ReceiverProfile = dynamic(
  () => import('../../pages/receiver/ReceiverProfile').then(mod => ({ default: mod.ReceiverProfile })),
  { ssr: false }
);

export default function ReceiverProfilePage() {
  return <ReceiverProfile />;
}
