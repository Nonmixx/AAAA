'use client';

import dynamic from 'next/dynamic';

const ReceiverDetail = dynamic(
  () => import('../../../../pages/donor/ReceiverDetail').then(mod => ({ default: mod.ReceiverDetail })),
  { ssr: false }
);

export default function ReceiverDetailPage() {
  return <ReceiverDetail />;
}
