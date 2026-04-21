'use client';

import dynamic from 'next/dynamic';

const CreateNeeds = dynamic(
  () => import('../../pages/receiver/CreateNeeds').then(mod => ({ default: mod.CreateNeeds })),
  { ssr: false }
);

export default function CreateNeedsPage() {
  return <CreateNeeds />;
}
