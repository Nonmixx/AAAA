'use client';

import dynamic from 'next/dynamic';

const SignUp = dynamic(
  () => import('../../pages/auth/SignUp').then(mod => ({ default: mod.SignUp })),
  { ssr: false }
);

export default function SignUpPage() {
  return <SignUp />;
}
