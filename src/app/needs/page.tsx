import { DonorLayout } from '../components/layouts/DonorLayout';
import { ReceiverNeedsList } from '../pages/donor/ReceiverNeedsList';
import { fetchPublicBrowseReceivers } from '@/lib/publicNeeds';

export default async function NeedsPage() {
  const liveReceivers = await fetchPublicBrowseReceivers();

  return (
    <DonorLayout>
      <ReceiverNeedsList
        detailBasePath="/needs"
        showBackButton
        backHref="/donor"
        liveReceivers={liveReceivers}
      />
    </DonorLayout>
  );
}
