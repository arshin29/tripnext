'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useRouter } from 'next/navigation';
import { Destination, DestinationSummary, SavedDestination } from '@tripnest/shared';
import { apiClient } from '../lib/api-client';
import { useAuth } from './AuthContext';

interface WishlistContextType {
  savedDestinations: SavedDestination[];
  savedIds: Set<string>;
  savedCount: number;
  isLoading: boolean;
  isSaved: (destinationId: string) => boolean;
  toggleSave: (destination: DestinationSummary | Destination) => Promise<boolean>;
  refreshWishlist: () => Promise<void>;
}

const WishlistContext = createContext<WishlistContextType | undefined>(undefined);

export function WishlistProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [savedDestinations, setSavedDestinations] = useState<SavedDestination[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const savedIds = useMemo(() => {
    return new Set(savedDestinations.map((item) => item.destinationId));
  }, [savedDestinations]);

  const refreshWishlist = useCallback(async () => {
    if (!isAuthenticated) {
      setSavedDestinations([]);
      return;
    }

    try {
      setIsLoading(true);
      const res = await apiClient<SavedDestination[]>('/saved-destinations', {
        method: 'GET',
      });
      if (res.data) {
        setSavedDestinations(res.data);
      }
    } catch (err) {
      console.error('Failed to load wishlist:', err);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (!authLoading) {
      if (isAuthenticated) {
        refreshWishlist();
      } else {
        setSavedDestinations([]);
      }
    }
  }, [isAuthenticated, authLoading, refreshWishlist]);

  const isSaved = useCallback(
    (destinationId: string): boolean => {
      return savedIds.has(destinationId);
    },
    [savedIds],
  );

  const toggleSave = useCallback(
    async (destination: DestinationSummary | Destination): Promise<boolean> => {
      if (!isAuthenticated) {
        router.push('/login?redirect=' + encodeURIComponent(window.location.pathname));
        return false;
      }

      const alreadySaved = savedIds.has(destination.id);

      // Optimistic update
      if (alreadySaved) {
        setSavedDestinations((prev) =>
          prev.filter((item) => item.destinationId !== destination.id),
        );

        try {
          await apiClient(`/saved-destinations/${destination.id}`, {
            method: 'DELETE',
          });
          return false;
        } catch (err) {
          console.error('Failed to remove from wishlist:', err);
          // Revert optimistic update
          await refreshWishlist();
          return true;
        }
      } else {
        // Optimistically add
        const optimisticRecord: SavedDestination = {
          id: `opt-${Date.now()}`,
          userId: 'current',
          destinationId: destination.id,
          createdAt: new Date().toISOString(),
          destination: destination as Destination,
        };

        setSavedDestinations((prev) => [optimisticRecord, ...prev]);

        try {
          const res = await apiClient<SavedDestination>(
            `/saved-destinations/${destination.id}`,
            {
              method: 'POST',
            },
          );
          if (res.data) {
            setSavedDestinations((prev) =>
              prev.map((item) =>
                item.destinationId === destination.id ? res.data! : item,
              ),
            );
          }
          return true;
        } catch (err) {
          console.error('Failed to save to wishlist:', err);
          // Revert optimistic update
          await refreshWishlist();
          return false;
        }
      }
    },
    [isAuthenticated, savedIds, router, refreshWishlist],
  );

  return (
    <WishlistContext.Provider
      value={{
        savedDestinations,
        savedIds,
        savedCount: savedDestinations.length,
        isLoading,
        isSaved,
        toggleSave,
        refreshWishlist,
      }}
    >
      {children}
    </WishlistContext.Provider>
  );
}

export function useWishlist(): WishlistContextType {
  const context = useContext(WishlistContext);
  if (!context) {
    throw new Error('useWishlist must be used within a WishlistProvider');
  }
  return context;
}
