import { disasterConfig, requireConfig } from '../config';

export type LatLng = {
  lat: number;
  lng: number;
};

export type TravelEstimate = {
  distanceMeters: number;
  durationSeconds: number;
};

export async function geocodeAddress(address: string): Promise<LatLng | null> {
  const apiKey = requireConfig(
    disasterConfig.maps.googleGeocodingApiKey ?? disasterConfig.maps.googleMapsApiKey,
    'Set GOOGLE_GEOCODING_API_KEY or GOOGLE_MAPS_API_KEY to enable geocoding.',
  );
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${encodeURIComponent(apiKey)}`;
  const response = await fetch(url, { cache: 'no-store' });
  if (!response.ok) throw new Error(`Geocoding request failed: ${response.status}`);
  const payload = (await response.json()) as {
    results?: Array<{ geometry?: { location?: { lat?: number; lng?: number } } }>;
  };
  const location = payload.results?.[0]?.geometry?.location;
  if (typeof location?.lat !== 'number' || typeof location?.lng !== 'number') return null;
  return { lat: location.lat, lng: location.lng };
}

export async function getTravelEstimate(origin: LatLng, destination: LatLng): Promise<TravelEstimate | null> {
  const apiKey = requireConfig(
    disasterConfig.maps.googleMapsApiKey,
    'Set GOOGLE_MAPS_API_KEY to enable travel estimates.',
  );
  const params = new URLSearchParams({
    origins: `${origin.lat},${origin.lng}`,
    destinations: `${destination.lat},${destination.lng}`,
    key: apiKey,
  });
  const url = `https://maps.googleapis.com/maps/api/distancematrix/json?${params.toString()}`;
  const response = await fetch(url, { cache: 'no-store' });
  if (!response.ok) throw new Error(`Travel estimate request failed: ${response.status}`);

  const payload = (await response.json()) as {
    rows?: Array<{
      elements?: Array<{
        distance?: { value?: number };
        duration?: { value?: number };
        status?: string;
      }>;
    }>;
  };
  const element = payload.rows?.[0]?.elements?.[0];
  if (element?.status !== 'OK') return null;

  return {
    distanceMeters: element.distance?.value ?? 0,
    durationSeconds: element.duration?.value ?? 0,
  };
}
