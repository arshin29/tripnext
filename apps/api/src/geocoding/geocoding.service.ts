import { Injectable, Logger } from '@nestjs/common';
import { GeocodeResult } from '@tripnest/shared';

export interface CacheEntry {
  data: GeocodeResult[];
  cachedAt: number;
}

@Injectable()
export class GeocodingService {
  private readonly logger = new Logger(GeocodingService.name);

  // In-memory cache for geocoded queries
  private readonly cache = new Map<string, CacheEntry>();
  private readonly cacheTtlMs = 1000 * 60 * 60 * 24; // 24-hour cache TTL

  // Queue & rate-limiting state
  private queue: Promise<void> = Promise.resolve();
  private lastRequestTime = 0;
  private minIntervalMs = 1100; // Strictly 1.1s between outbound requests
  private requestTimeoutMs = 5000; // 5s timeout for upstream Nominatim requests

  /**
   * Set minimum interval between requests (primarily used for unit testing).
   */
  setIntervalForTesting(intervalMs: number): void {
    this.minIntervalMs = intervalMs;
  }

  /**
   * Set timeout for upstream requests (primarily used for unit testing).
   */
  setTimeoutForTesting(timeoutMs: number): void {
    this.requestTimeoutMs = timeoutMs;
  }

  /**
   * Clear in-memory cache (primarily used for unit testing).
   */
  clearCacheForTesting(): void {
    this.cache.clear();
    this.lastRequestTime = 0;
    this.queue = Promise.resolve();
  }

  /**
   * Return number of cached items.
   */
  getCacheSize(): number {
    return this.cache.size;
  }

  /**
   * Normalize search string to build uniform cache keys.
   */
  private normalizeQuery(fullQuery: string): string {
    return fullQuery.trim().toLowerCase().replace(/\s+/g, ' ');
  }

  /**
   * Execute or queue a geocoding search with server-side caching and rate limiting.
   */
  async geocode(query: string, contextHint?: string): Promise<GeocodeResult[]> {
    const trimmed = (query || '').trim();
    if (!trimmed || trimmed.length < 2) {
      return [];
    }

    const trimmedHint = (contextHint || '').trim();
    const fullQuery = trimmedHint ? `${trimmed} ${trimmedHint}` : trimmed;
    const cacheKey = this.normalizeQuery(fullQuery);

    // 1. Immediate cache check: avoid queuing if result is already in memory
    const existing = this.cache.get(cacheKey);
    if (existing && Date.now() - existing.cachedAt < this.cacheTtlMs) {
      this.logger.debug(`Cache hit for '${cacheKey}'`);
      return existing.data;
    }

    // 2. Enqueue the request in a shared FIFO promise queue
    return new Promise<GeocodeResult[]>((resolve) => {
      this.queue = this.queue
        .then(async () => {
          // Double-check cache in case another queued request for the same key just completed
          const recent = this.cache.get(cacheKey);
          if (recent && Date.now() - recent.cachedAt < this.cacheTtlMs) {
            resolve(recent.data);
            return;
          }

          // Enforce minimum delay since the previous outbound request
          const now = Date.now();
          const elapsed = now - this.lastRequestTime;
          if (elapsed < this.minIntervalMs) {
            const waitTime = this.minIntervalMs - elapsed;
            await new Promise((r) => setTimeout(r, waitTime));
          }

          // Update dispatch timestamp
          this.lastRequestTime = Date.now();

          // Execute remote Nominatim call with timeout
          const results = await this.fetchFromNominatim(fullQuery);

          // Store in cache
          this.cache.set(cacheKey, {
            data: results,
            cachedAt: Date.now(),
          });

          resolve(results);
        })
        .catch((err) => {
          this.logger.error(`Geocoding queue error: ${err.message}`);
          resolve([]);
        });
    });
  }

  /**
   * Outbound HTTP call to OpenStreetMap Nominatim with strict timeout, validation, and error handling.
   */
  private async fetchFromNominatim(query: string): Promise<GeocodeResult[]> {
    const abortController = new AbortController();
    const timeoutHandle = setTimeout(() => {
      abortController.abort();
    }, this.requestTimeoutMs);

    try {
      const params = new URLSearchParams({
        q: query,
        format: 'json',
        limit: '5',
        addressdetails: '1',
      });

      // Only pass email parameter if explicitly configured in environment; never invent or assume ownership
      const configuredEmail = process.env.NOMINATIM_EMAIL?.trim();
      if (configuredEmail) {
        params.set('email', configuredEmail);
      }

      const headers: Record<string, string> = {
        Accept: 'application/json',
        'Accept-Language': 'en',
        'User-Agent': 'TripNext-Backend/1.0 (TripNext Travel Concierge)',
      };

      const url = `https://nominatim.openstreetmap.org/search?${params.toString()}`;
      const response = await fetch(url, {
        method: 'GET',
        headers,
        signal: abortController.signal,
      });

      if (!response.ok) {
        this.logger.warn(`Nominatim responded with status HTTP ${response.status}`);
        return [];
      }

      const raw = await response.json();
      if (!Array.isArray(raw)) {
        return [];
      }

      const results: GeocodeResult[] = [];
      for (const item of raw) {
        const lat = parseFloat(item.lat);
        const lon = parseFloat(item.lon);
        if (!isNaN(lat) && !isNaN(lon) && lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180) {
          results.push({
            latitude: Number(lat.toFixed(6)),
            longitude: Number(lon.toFixed(6)),
            displayName: String(item.display_name || query).slice(0, 300),
          });
        }
      }

      return results;
    } catch (err: unknown) {
      const error = err as Error;
      if (error.name === 'AbortError' || abortController.signal.aborted) {
        this.logger.warn(`Nominatim request timed out after ${this.requestTimeoutMs}ms for query '${query}'`);
      } else {
        this.logger.warn(`Nominatim fetch failure (${error.message}) for query '${query}'`);
      }
      return [];
    } finally {
      clearTimeout(timeoutHandle);
    }
  }
}
