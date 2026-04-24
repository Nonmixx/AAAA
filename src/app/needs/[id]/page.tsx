import Link from 'next/link';
import { DonorLayout } from '../../components/layouts/DonorLayout';
import { fetchPublicOrganizationDetail, isOrganizationUuid } from '@/lib/publicNeeds';
import { PublicNeedDetailView } from './PublicNeedDetailView';
import { NeedDetailLegacy } from './NeedDetailLegacy';

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function PublicOrganizationDetailPage({ params }: PageProps) {
  const { id } = await params;

  if (isOrganizationUuid(id)) {
    const live = await fetchPublicOrganizationDetail(id);
    if (live) {
      return (
        <DonorLayout>
          <PublicNeedDetailView data={live} />
        </DonorLayout>
      );
    }

    return (
      <DonorLayout>
        <div className="p-6 max-w-2xl mx-auto">
          <p className="text-[#000000] font-semibold mb-2">Listing not found</p>
          <p className="text-gray-600 text-sm mb-6">
            This organization is not available on the public catalog, or it has no active published needs yet.
          </p>
          <Link href="/needs" className="text-[#da1a32] font-medium hover:text-[#b01528]">
            ← Back to Needs List
          </Link>
        </div>
      </DonorLayout>
    );
  }

  return (
    <DonorLayout>
      <NeedDetailLegacy />
    </DonorLayout>
  );
}
