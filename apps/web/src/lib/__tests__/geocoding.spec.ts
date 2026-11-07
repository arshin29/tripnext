import { searchCoordinates, GeocodeResult } from '../geocoding';
import * as apiClientModule from '../api-client';

jest.mock('../api-client');

describe('Frontend Geocoding Client (searchCoordinates)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return empty array without calling API when query is empty or shorter than 2 characters', async () => {
    const mockApiClient = jest.spyOn(apiClientModule, 'apiClient');

    const emptyRes = await searchCoordinates('');
    const whitespaceRes = await searchCoordinates('   ');
    const singleCharRes = await searchCoordinates('a');

    expect(emptyRes).toEqual([]);
    expect(whitespaceRes).toEqual([]);
    expect(singleCharRes).toEqual([]);
    expect(mockApiClient).not.toHaveBeenCalled();
  });

  it('should call internal API endpoint with encoded query parameters', async () => {
    const mockData: GeocodeResult[] = [
      {
        latitude: 35.6762,
        longitude: 139.6503,
        displayName: 'Tokyo, Japan',
      },
    ];

    const mockApiClient = jest.spyOn(apiClientModule, 'apiClient').mockResolvedValue({
      success: true,
      data: mockData,
      message: 'Geocoding search completed.',
    });

    const results = await searchCoordinates('Shibuya Crossing', 'Tokyo, Japan');

    expect(results).toEqual(mockData);
    expect(mockApiClient).toHaveBeenCalledTimes(1);
    expect(mockApiClient).toHaveBeenCalledWith(
      '/geocoding/search?q=Shibuya+Crossing&contextHint=Tokyo%2C+Japan',
    );
  });

  it('should handle API failure or network error gracefully by returning empty array', async () => {
    jest.spyOn(apiClientModule, 'apiClient').mockRejectedValue(
      new Error('Network connection error'),
    );

    const results = await searchCoordinates('Eiffel Tower');

    expect(results).toEqual([]);
  });

  it('should handle unsuccessful or unexpected response payload gracefully', async () => {
    jest.spyOn(apiClientModule, 'apiClient').mockResolvedValue({
      success: false,
      data: undefined,
      message: 'No results',
    });

    const results = await searchCoordinates('Unknown Place');

    expect(results).toEqual([]);
  });

  it('should preserve GeocodeResult format compatibility with existing UI components', async () => {
    const mockData: GeocodeResult[] = [
      {
        latitude: 51.5074,
        longitude: -0.1278,
        displayName: 'London, Greater London, England, United Kingdom',
      },
    ];

    jest.spyOn(apiClientModule, 'apiClient').mockResolvedValue({
      success: true,
      data: mockData,
    });

    const results = await searchCoordinates('London');

    expect(results).toHaveLength(1);
    expect(typeof results[0].latitude).toBe('number');
    expect(typeof results[0].longitude).toBe('number');
    expect(typeof results[0].displayName).toBe('string');
  });
});
