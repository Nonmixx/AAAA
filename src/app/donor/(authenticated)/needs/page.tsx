import { ReceiverNeedsList } from '../../../pages/donor/ReceiverNeedsList';
import { fetchPublicBrowseReceivers } from '@/lib/publicNeeds';

export default async function NeedsPage() {
  const liveReceivers = await fetchPublicBrowseReceivers();
  return <ReceiverNeedsList liveReceivers={liveReceivers} />;
}
