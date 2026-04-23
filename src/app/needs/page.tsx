import { DonorLayout } from '../components/layouts/DonorLayout';
import { ReceiverNeedsList } from '../pages/donor/ReceiverNeedsList';

export default function NeedsPage() {
  return (
    <DonorLayout>
      <ReceiverNeedsList detailBasePath="/needs" showBackButton backHref="/donor" />
    </DonorLayout>
  );
}
