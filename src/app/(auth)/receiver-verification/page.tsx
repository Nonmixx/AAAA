'use client';

import dynamic from 'next/dynamic';

const ReceiverVerification = dynamic(
  () => import('../../pages/auth/ReceiverVerification').then(mod => ({ default: mod.ReceiverVerification })),
  { ssr: false }
);

export default function ReceiverVerificationPage() {
  return <ReceiverVerification />;
}
