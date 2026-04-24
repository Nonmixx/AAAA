export type GeocodeResult = {
  latitude: number;
  longitude: number;
  locationName: string | null;
};

/**
 * Best-effort geocoding for Malaysia addresses.
 * Returns null on any failure so caller flow remains unaffected.
 */
export async function geocodeMalaysiaAddress(address: string): Promise<GeocodeResult | null> {
  const raw = address?.trim();
  if (!raw) return null;

  try {
    const query = encodeURIComponent(`${raw}, Malaysia`);
    const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&countrycodes=my&q=${query}`;
    const response = await fetch(url, {
      headers: {
        Accept: 'application/json',
      },
    });

    if (!response.ok) return null;
    const data = (await response.json()) as Array<{
      lat?: string;
      lon?: string;
      display_name?: string;
      address?: { city?: string; town?: string; state?: string; suburb?: string };
    }>;
    const first = data?.[0];
    if (!first?.lat || !first?.lon) return null;

    const latitude = Number(first.lat);
    const longitude = Number(first.lon);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;

    const locationName =
      first.address?.city ||
      first.address?.town ||
      first.address?.suburb ||
      first.address?.state ||
      null;

    return { latitude, longitude, locationName };
  } catch {
    return null;
  }
}
