import Link from 'next/link';
import { DonorLayout } from '../../components/layouts/DonorLayout';

const impactDeliveryCards = [
  {
    title: 'Education Support',
    item: '15x Used IT Textbooks',
    route: 'Subang Jaya -> Pages Community Library',
    status: '⏳ Waiting for a driver',
    badgeClass: 'bg-yellow-100 text-yellow-800',
    deliveryCost: 'RM 15.00',
    platformFee: 'RM 1.50',
    payText: 'Sponsor Delivery • RM 16.50',
  },
  {
    title: 'Healthcare & Accessibility',
    item: '1x Foldable Wheelchair (Gently Used)',
    route: 'Petaling Jaya -> Grace Old Folks Home',
    status: '🔴 Urgent Need',
    badgeClass: 'bg-red-100 text-red-700',
    deliveryCost: 'RM 22.00',
    platformFee: 'RM 2.20',
    payText: 'Sponsor Delivery • RM 24.20',
  },
  {
    title: 'Food Security',
    item: '50kg Surplus Rice & Canned Goods',
    route: 'Cheras -> Kechara Soup Kitchen',
    status: '⏳ Waiting for a driver',
    badgeClass: 'bg-yellow-100 text-yellow-800',
    deliveryCost: 'RM 18.00',
    platformFee: 'RM 1.80',
    payText: 'Sponsor Delivery • RM 19.80',
  },
  {
    title: 'Digital Equality',
    item: '3x Refurbished Dell Laptops',
    route: 'Bangsar -> Teach For Malaysia',
    status: '⏳ Waiting for a driver',
    badgeClass: 'bg-yellow-100 text-yellow-800',
    deliveryCost: 'RM 12.00',
    platformFee: 'RM 1.20',
    payText: 'Sponsor Delivery • RM 13.20',
  },
  {
    title: 'Disaster Relief',
    item: '3 Boxes of Clean Raincoats & Blankets',
    route: 'Shah Alam -> Red Crescent Society',
    status: '🔴 Urgent Need',
    badgeClass: 'bg-red-100 text-red-700',
    deliveryCost: 'RM 25.00',
    platformFee: 'RM 2.50',
    payText: 'Sponsor Delivery • RM 27.50',
  },
  {
    title: 'NGO Operations',
    item: '4x Office Chairs & 1 Whiteboard',
    route: 'KL Sentral (Corporate) -> Dignity for Children',
    status: '⏳ High Priority pickup',
    badgeClass: 'bg-orange-100 text-orange-700',
    deliveryCost: 'RM 35.00',
    platformFee: 'RM 3.50',
    payText: 'Sponsor Delivery • RM 38.50',
  },
];

export default function CommunityImpactPage() {
  return (
    <DonorLayout>
      <section className="py-24 bg-[#edf2f4]/50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="mb-10">
            <div className="mb-4">
              <Link href="/donor">
                <button className="px-6 py-3 bg-white text-[#000000] border border-[#dbe2e8] rounded-lg hover:bg-gray-50 transition-all duration-200 font-medium shadow-sm">
                  Back
                </button>
              </Link>
            </div>

            <div>
              <p className="inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-[#da1a32] mb-3">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="absolute inline-flex h-full w-full rounded-full bg-[#da1a32] opacity-70 animate-ping" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[#da1a32]" />
                </span>
                <span className="animate-pulse">Live Donations Waiting for Delivery</span>
              </p>
              <h1 className="text-4xl font-bold text-[#000000] mb-3">Community Impact Board</h1>
              <p className="text-lg text-gray-600 max-w-none lg:whitespace-nowrap">
                These matched donations are ready to go, but they need a ride. Sponsor a delivery to make an instant impact.
              </p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
            {impactDeliveryCards.map((card) => (
              <div key={card.title} className="bg-white border-2 border-[#edf2f4] rounded-2xl shadow-lg p-7 hover:-translate-y-1 hover:shadow-xl transition-all duration-200">
                <h3 className="text-xl font-bold text-[#000000] mb-5">{card.title}</h3>
                <div className="space-y-4 mb-6">
                  <p className="text-base text-[#000000] font-normal">Item: {card.item}</p>
                  <p className="text-sm text-gray-500">From {card.route}</p>
                </div>
                <div className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-semibold mb-6 ${card.badgeClass}`}>
                  {card.status}
                </div>
                <div className="border-t border-[#edf2f4] pt-4 space-y-2 mb-7 text-[#000000]">
                  <p className="text-sm text-gray-600">Delivery Cost: {card.deliveryCost}</p>
                  <p className="text-sm text-gray-600">Platform Fee: {card.platformFee}</p>
                </div>
                <Link href="/login?redirect=%2Fdonor%2Fcheckout">
                  <button className="w-full px-5 py-3 bg-[#da1a32] text-white rounded-lg hover:bg-[#b01528] hover:scale-[1.01] transition-all duration-200 font-semibold shadow-lg">
                    {card.payText}
                  </button>
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>
    </DonorLayout>
  );
}
