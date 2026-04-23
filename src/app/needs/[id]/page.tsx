'use client';

import dynamic from 'next/dynamic';
import { DonorLayout } from '../../components/layouts/DonorLayout';

const ReceiverDetail = dynamic(
  () => import('../../pages/donor/ReceiverDetail').then((mod) => ({ default: mod.ReceiverDetail })),
  { ssr: false }
);

export default function PublicOrganizationDetailPage() {
  return (
    <DonorLayout>
      <ReceiverDetail backHref="/needs" donateHref="/login" />
    </DonorLayout>
  );
}
