import { ApiResponse, CSRF_HEADER_NAME } from '@tripnest/shared';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4001/api';

export class ApiError extends Error {
  statusCode: number;
  details?: unknown;

  constructor(message: string, statusCode: number, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.details = details;
  }
}

interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
  skipCache?: boolean;
}

interface CacheEntry {
  data: any;
  cachedAt: number;
  ttlMs: number;
}

const memoryCache = new Map<string, CacheEntry>();
let cacheEpoch = 0;

/**
 * Determine cache TTL based on endpoint pattern.
 * - Public destination catalog: 5 minutes (300,000 ms)
 * - User-specific data (trips, wishlist, expenses): 30 seconds (30,000 ms)
 * - Return 0 to bypass caching.
 */
function getEndpointTtl(endpoint: string): number {
  const clean = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;

  if (clean.startsWith('/destinations')) {
    return 5 * 60 * 1000; // 5 minutes
  }

  if (
    clean === '/trips' ||
    clean.startsWith('/trips/') ||
    clean === '/saved-destinations' ||
    clean.startsWith('/expenses')
  ) {
    return 30 * 1000; // 30 seconds
  }

  return 0;
}

/**
 * Invalidate cache entries when a mutation occurs.
 */
export function invalidateClientCache(prefix?: string): void {
  if (!prefix) {
    memoryCache.clear();
    return;
  }
  const cleanPrefix = prefix.startsWith('/') ? prefix : `/${prefix}`;
  for (const key of memoryCache.keys()) {
    if (key.includes(cleanPrefix)) {
      memoryCache.delete(key);
    }
  }
}

/**
 * Clear all cache on user logout, login, or session expiry to ensure complete isolation.
 * Increments cacheEpoch so that any pending in-flight requests cannot populate the cache.
 */
export function clearClientCache(): void {
  cacheEpoch++;
  memoryCache.clear();
}

export async function apiClient<T>(
  endpoint: string,
  options: RequestOptions = {},
): Promise<ApiResponse<T>> {
  const { body, headers = {}, skipCache = false, ...customConfig } = options;

  const requestEpoch = cacheEpoch;
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const url = `${API_BASE_URL}${cleanEndpoint}`;
  const method = (customConfig.method || 'GET').toUpperCase();

  // Cache lookup for GET requests
  const ttlMs = getEndpointTtl(cleanEndpoint);
  const cacheKey = `GET:${url}`;
  if (method === 'GET' && !skipCache && ttlMs > 0) {
    const cached = memoryCache.get(cacheKey);
    if (cached && Date.now() - cached.cachedAt < cached.ttlMs) {
      return cached.data as ApiResponse<T>;
    }
  }

  const requestHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    ...(headers as Record<string, string>),
  };

  // Attach CSRF protection header for state-changing requests
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    requestHeaders[CSRF_HEADER_NAME] = '1';
  }

  const config: RequestInit = {
    ...customConfig,
    headers: requestHeaders,
    credentials: 'include', // Ensures HTTP-only cookies are included in requests
  };

  if (body !== undefined) {
    config.body = JSON.stringify(body);
  }

  try {
    const response = await fetch(url, config);

    let data: any;
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      data = { message: response.statusText };
    }

    if (!response.ok) {
      // Clear cache immediately on session expiry / unauthorized
      if (response.status === 401) {
        clearClientCache();
      }

      const errorMessage =
        (Array.isArray(data?.message) ? data.message.join('. ') : data?.message) ||
        data?.error ||
        `Request failed with status ${response.status}`;

      throw new ApiError(errorMessage, response.status, data);
    }

    // Save successful GET responses to memory cache (only if cache was not cleared while request was in flight)
    if (method === 'GET' && ttlMs > 0 && requestEpoch === cacheEpoch) {
      memoryCache.set(cacheKey, {
        data,
        cachedAt: Date.now(),
        ttlMs,
      });
    }

    // Invalidate affected cache entries when state changes
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
      if (cleanEndpoint.includes('/trips')) {
        invalidateClientCache('/trips');
        invalidateClientCache('/expenses');
      }
      if (cleanEndpoint.includes('/saved-destinations')) {
        invalidateClientCache('/saved-destinations');
      }
      if (cleanEndpoint.includes('/expenses')) {
        invalidateClientCache('/expenses');
        invalidateClientCache('/trips');
      }
      if (cleanEndpoint.includes('/destinations')) {
        invalidateClientCache('/destinations');
      }
    }

    return data as ApiResponse<T>;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    const message =
      error instanceof Error ? error.message : 'A network communication error occurred.';
    throw new ApiError(message, 0);
  }
}
