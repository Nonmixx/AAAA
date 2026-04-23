/** Curated NGO demand signals — GLM must ground allocation on these records only. */
export interface NgoDemandProfile {
  id: string;
  name: string;
  location: string;
  demandCategories: string[];
  needLevel: 1 | 2 | 3 | 4 | 5;
  urgencyLabel: 'High' | 'Medium' | 'Low';
  currentGap: string;
}

export const NGO_DEMAND_CATALOG: NgoDemandProfile[] = [
  {
    id: 'ngo_hope_orphanage',
    name: 'Hope Orphanage',
    location: 'Kuala Lumpur • 2.5 km',
    demandCategories: ['clothing', 'school_supplies', 'hygiene', 'food'],
    needLevel: 5,
    urgencyLabel: 'High',
    currentGap: 'Winter clothing and school kits; intake spike after flooding nearby.',
  },
  {
    id: 'ngo_care_foundation',
    name: 'Care Foundation',
    location: 'Petaling Jaya • 5.1 km',
    demandCategories: ['elder_care', 'medical_consumables', 'blankets', 'clothing'],
    needLevel: 4,
    urgencyLabel: 'Medium',
    currentGap: 'Elder day centre needs blankets and gently used clothing.',
  },
  {
    id: 'ngo_green_pantry',
    name: 'Green Pantry Initiative',
    location: 'Shah Alam • 8.0 km',
    demandCategories: ['food', 'baby_supplies'],
    needLevel: 5,
    urgencyLabel: 'High',
    currentGap: 'Dry food packs running low; baby formula waitlist growing.',
  },
  {
    id: 'ngo_pages_library',
    name: 'Pages Community Library',
    location: 'Subang Jaya • 6.2 km',
    demandCategories: ['books', 'school_supplies', 'electronics_learning'],
    needLevel: 3,
    urgencyLabel: 'Medium',
    currentGap: 'Textbooks and STEM kits for teens; steady demand.',
  },
  {
    id: 'ngo_river_clinic',
    name: 'Riverbank Free Clinic',
    location: 'Klang • 12 km',
    demandCategories: ['medical_supplies', 'hygiene'],
    needLevel: 5,
    urgencyLabel: 'High',
    currentGap: 'Consumable medical supplies and hygiene kits critically short.',
  },
  {
    id: 'ngo_urban_shelter',
    name: 'Urban Night Shelter',
    location: 'KL Sentral • 3.8 km',
    demandCategories: ['blankets', 'clothing', 'hygiene', 'food'],
    needLevel: 4,
    urgencyLabel: 'High',
    currentGap: 'Nightly arrivals; bedding and warm layers highest priority.',
  },
];

export function getNgoById(id: string): NgoDemandProfile | undefined {
  return NGO_DEMAND_CATALOG.find((n) => n.id === id);
}
