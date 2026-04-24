export type ImpactDeliveryCard = {
  title: string;
  item: string;
  route: string;
  status: string;
  badgeClass: string;
  deliveryCost: string;
  platformFee: string;
  payText: string;
};

export const impactDeliveryCards: ImpactDeliveryCard[] = [
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
