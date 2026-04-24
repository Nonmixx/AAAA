/**
 * Single source of truth for browse + detail (/needs and /donor/needs).
 * Replace `ORGANIZATIONS` or `getOrganizationsInNeed` with API/Supabase when ready.
 */

export type NeedUrgency = 'high' | 'medium' | 'low';

export type OrganizationNeedItem = {
  item: string;
  quantity: number;
  urgency: NeedUrgency;
  description: string;
  requestedAgo: string;
};

export type OrganizationInNeed = {
  id: string;
  name: string;
  location: string;
  distance: string;
  emergency: boolean;
  emergencyReason: string;
  about: string;
  phone: string;
  email: string;
  address: string;
  mapLabel: string;
  impactSummary: string;
  items: OrganizationNeedItem[];
};

const ORGANIZATIONS: OrganizationInNeed[] = [
  {
    id: '1',
    name: 'Hope Orphanage',
    location: 'Kuala Lumpur',
    distance: '2.5 km',
    emergency: true,
    emergencyReason: 'Flash flood displaced 80 children',
    about:
      'Hope Orphanage is a registered non-profit organization dedicated to providing care, education, and support to underprivileged children in Kuala Lumpur. We currently house 80 children aged 3-17 and provide them with shelter, food, education, and healthcare.',
    phone: '+60 3-1234 5678',
    email: 'contact@hopeorphanage.org',
    address: 'No. 123, Jalan Bukit Bintang, Kuala Lumpur',
    mapLabel: 'Map showing Hope Orphanage',
    impactSummary: 'Your donation will directly help 80 children in need',
    items: [
      {
        item: 'Food Packs',
        quantity: 100,
        urgency: 'high',
        description: 'Essential food supplies for daily meals',
        requestedAgo: 'Requested 2 days ago',
      },
      {
        item: 'School Supplies',
        quantity: 50,
        urgency: 'medium',
        description: 'Books, stationery, and learning materials',
        requestedAgo: 'Requested 1 week ago',
      },
    ],
  },
  {
    id: '2',
    name: 'Care Foundation',
    location: 'Petaling Jaya',
    distance: '5.1 km',
    emergency: true,
    emergencyReason: 'Critical shortage after donations halted',
    about:
      'Care Foundation runs community clinics and shelters across Petaling Jaya. We distribute medical supplies and bedding to families affected by recent supply chain disruptions.',
    phone: '+60 3-9876 5432',
    email: 'hello@carefoundation.my',
    address: '18 Jalan SS2/72, Petaling Jaya',
    mapLabel: 'Map showing Care Foundation',
    impactSummary: 'Your donation supports families in our weekly outreach programme',
    items: [
      {
        item: 'Blankets',
        quantity: 75,
        urgency: 'high',
        description: 'Warm blankets for overnight shelter guests',
        requestedAgo: 'Requested 3 days ago',
      },
      {
        item: 'Medical Supplies',
        quantity: 30,
        urgency: 'high',
        description: 'Bandages, antiseptic, and basic clinic consumables',
        requestedAgo: 'Requested 5 days ago',
      },
    ],
  },
  {
    id: '3',
    name: 'Sunshine Children Home',
    location: 'Subang Jaya',
    distance: '8.3 km',
    emergency: false,
    emergencyReason: '',
    about:
      'Sunshine Children Home provides long-term residential care and schooling support for children from vulnerable backgrounds in Subang Jaya.',
    phone: '+60 3-5555 1212',
    email: 'info@sunshinechildrenhome.org',
    address: 'Lot 7, Persiaran Kewajipan, Subang Jaya',
    mapLabel: 'Map showing Sunshine Children Home',
    impactSummary: 'Your donation helps us clothe and equip every child in our home',
    items: [
      {
        item: 'Clothing',
        quantity: 120,
        urgency: 'medium',
        description: 'Season-appropriate clothes for ages 5–14',
        requestedAgo: 'Requested 4 days ago',
      },
      {
        item: 'Toys',
        quantity: 60,
        urgency: 'low',
        description: 'Educational toys and indoor play materials',
        requestedAgo: 'Requested 2 weeks ago',
      },
    ],
  },
  {
    id: '4',
    name: 'Elderly Care Center',
    location: 'Shah Alam',
    distance: '12.4 km',
    emergency: false,
    emergencyReason: '',
    about:
      'Elderly Care Center offers assisted living, physiotherapy, and medicine management for seniors in Shah Alam and surrounding townships.',
    phone: '+60 3-7777 8899',
    email: 'care@elderlycarecenter.my',
    address: 'Persiaran Damai, Seksyen 9, Shah Alam',
    mapLabel: 'Map showing Elderly Care Center',
    impactSummary: 'Your donation improves mobility and daily comfort for our residents',
    items: [
      {
        item: 'Wheelchairs',
        quantity: 10,
        urgency: 'high',
        description: 'Lightweight wheelchairs for indoor and outdoor use',
        requestedAgo: 'Requested 1 day ago',
      },
      {
        item: 'Medicine',
        quantity: 50,
        urgency: 'medium',
        description: 'Supplemental prescriptions funded out-of-pocket',
        requestedAgo: 'Requested 6 days ago',
      },
    ],
  },
];

export function getOrganizationsInNeed(): OrganizationInNeed[] {
  return ORGANIZATIONS;
}

export function getOrganizationById(id: string | string[] | undefined | null): OrganizationInNeed | null {
  const raw = Array.isArray(id) ? id[0] : id;
  if (raw == null || raw === '') return null;
  const sid = String(raw);
  return ORGANIZATIONS.find((o) => o.id === sid) ?? null;
}
