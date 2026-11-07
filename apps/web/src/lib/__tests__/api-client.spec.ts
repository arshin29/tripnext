import { apiClient, clearClientCache, invalidateClientCache } from '../api-client';

describe('apiClient caching & security', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    clearClientCache();
    jest.clearAllMocks();
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  it('should cache GET /destinations responses for repeated queries', async () => {
    const mockData = { success: true, data: [{ id: '1', name: 'Tokyo' }] };
    const mockFetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: { get: () => 'application/json' },
      json: async () => mockData,
    });
    global.fetch = mockFetch;

    const res1 = await apiClient('/destinations');
    const res2 = await apiClient('/destinations');

    expect(res1).toEqual(mockData);
    expect(res2).toEqual(mockData);
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('should invalidate cache when a mutation occurs', async () => {
    const mockData = { success: true, data: [{ id: 'trip-1', title: 'Japan Trip' }] };
    const mockFetch = jest
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: { get: () => 'application/json' },
        json: async () => mockData,
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: { get: () => 'application/json' },
        json: async () => ({ success: true, message: 'Updated' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: { get: () => 'application/json' },
        json: async () => ({ success: true, data: [{ id: 'trip-1', title: 'Updated Japan' }] }),
      });
    global.fetch = mockFetch;

    // 1. Initial GET
    await apiClient('/trips');
    expect(mockFetch).toHaveBeenCalledTimes(1);

    // 2. Mutation
    await apiClient('/trips/trip-1', { method: 'PATCH', body: { title: 'Updated Japan' } });
    expect(mockFetch).toHaveBeenCalledTimes(2);

    // 3. Next GET should bypass invalidated cache and fetch fresh
    const res3 = await apiClient('/trips');
    expect(mockFetch).toHaveBeenCalledTimes(3);
    expect((res3.data as any)[0].title).toBe('Updated Japan');
  });

  it('should clear cache on 401 Unauthorized response', async () => {
    const mockData = { success: true, data: [{ id: 'trip-1' }] };
    const mockFetch = jest
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: { get: () => 'application/json' },
        json: async () => mockData,
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 401,
        headers: { get: () => 'application/json' },
        json: async () => ({ message: 'Unauthorized' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: { get: () => 'application/json' },
        json: async () => ({ success: true, data: [] }),
      });
    global.fetch = mockFetch;

    // First request cached
    await apiClient('/trips');
    expect(mockFetch).toHaveBeenCalledTimes(1);

    // Second request encounters 401
    await expect(apiClient('/trips/expired-check', { skipCache: true })).rejects.toThrow();
    expect(mockFetch).toHaveBeenCalledTimes(2);

    // Third request should be a fresh network call because cache was cleared
    await apiClient('/trips');
    expect(mockFetch).toHaveBeenCalledTimes(3);
  });

  it('should ignore in-flight responses if clearClientCache is called before they resolve', async () => {
    let resolveFirstFetch: (val: any) => void;
    const delayedPromise = new Promise((resolve) => {
      resolveFirstFetch = resolve;
    });

    const mockFetch = jest.fn().mockImplementationOnce(() => delayedPromise);
    global.fetch = mockFetch;

    // Start in-flight request for user 1
    const inFlight = apiClient('/trips');

    // User switches accounts / logs out while request is pending
    clearClientCache();

    // Now request completes
    resolveFirstFetch!({
      ok: true,
      status: 200,
      headers: { get: () => 'application/json' },
      json: async () => ({ success: true, data: [{ id: 'user1-trip' }] }),
    });
    await inFlight;

    // Next GET for new user should make a fresh network call, not use old in-flight data
    const freshFetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: { get: () => 'application/json' },
      json: async () => ({ success: true, data: [{ id: 'user2-trip' }] }),
    });
    global.fetch = freshFetch;

    const res = await apiClient('/trips');
    expect(freshFetch).toHaveBeenCalledTimes(1);
    expect((res.data as any)[0].id).toBe('user2-trip');
  });
});
