import Link from 'next/link';
import { fetchPublicOrganizationDetail } from '@/lib/publicNeeds';
import { PublicNeedDetailView } from '../../../../needs/[id]/PublicNeedDetailView';

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function ReceiverDetailPage({ params }: PageProps) {
  const { id } = await params;
  const live = await fetchPublicOrganizationDetail(id);
  if (live) {
    return <PublicNeedDetailView data={live} backHref="/donor/needs" donateHref="/donor/donate" />;
  }
  return (
    <div className="p-6 max-w-2xl mx-auto">
      <p className="text-[#000000] font-semibold mb-2">Listing not found</p>
      <p className="text-gray-600 text-sm mb-6">
        This organization is not available, or it has no active needs right now.
      </p>
      <Link href="/donor/needs" className="text-[#da1a32] font-medium hover:text-[#b01528]">
        ← Back to Needs List
      </Link>
    </div>
  );
}
