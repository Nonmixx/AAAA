'use client';

import dynamic from 'next/dynamic';

const DonorSignUp = dynamic(
  () => import('../../../pages/auth/DonorSignUp').then((mod) => ({ default: mod.DonorSignUp })),
  { ssr: false },
);

export default function DonorSignUpPage() {
  return <DonorSignUp />;
}
