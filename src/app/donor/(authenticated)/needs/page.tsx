'use client';

import dynamic from 'next/dynamic';

const ReceiverNeedsList = dynamic(
  () => import('../../../pages/donor/ReceiverNeedsList').then(mod => ({ default: mod.ReceiverNeedsList })),
  { ssr: false }
);

export default function NeedsPage() {
  return <ReceiverNeedsList />;
}
