import { GeocodeResult } from '@tripnest/shared';
import { apiClient } from './api-client';

export type { GeocodeResult };

/**
 * Search coordinates via the centralized TripNext NestJS Geocoding API.
 * Delegates upstream Nominatim requests to the backend with server-side queue serialization
 * and caching, preventing direct browser requests to public Nominatim.
 *
 * @param query Place name, address, or landmark to geocode
 * @param contextHint Optional city or country to refine search (e.g., "Kyoto, Japan")
 */
export async function searchCoordinates(
  query: string,
  contextHint?: string,
): Promise<GeocodeResult[]> {
  const trimmed = (query || '').trim();
  if (!trimmed || trimmed.length < 2) {
    return [];
  }

  try {
    const params = new URLSearchParams({
      q: trimmed,
    });

    if (contextHint && contextHint.trim()) {
      params.set('contextHint', contextHint.trim());
    }

    const response = await apiClient<GeocodeResult[]>(
      `/geocoding/search?${params.toString()}`,
    );

    if (response && response.success && Array.isArray(response.data)) {
      return response.data;
    }

    return [];
  } catch {
    // Graceful offline/network failure handling: return empty array without throwing
    return [];
  }
}
