import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { hasSupabaseConfig, requireSupabase } from '../lib/supabase';
import { useAuth } from './AuthContext';

const FavouritesContext = createContext(null);

const normalizeId = (value) => String(value ?? '').trim();

export function FavouritesProvider({ children }) {
  const { user } = useAuth();
  const [favourites, setFavourites] = useState([]);

  useEffect(() => {
    let active = true;

    const loadRemoteFavourites = async () => {
      if (!user?.uid || !hasSupabaseConfig) {
        if (active) setFavourites([]);
        return;
      }

      try {
        const client = requireSupabase();
        const { data, error } = await client
          .from('user_favourites')
          .select('product_id')
          .eq('user_id', user.uid);

        if (error) {
          throw error;
        }

        if (!active) return;
        const ids = Array.from(
          new Set((data || []).map((entry) => normalizeId(entry.product_id)).filter(Boolean)),
        );
        setFavourites(ids);
      } catch {
        if (!active) return;
        setFavourites([]);
      }
    };

    loadRemoteFavourites();
    return () => {
      active = false;
    };
  }, [user?.uid]);

  const toggleFavourite = (productId) => {
    if (!user?.uid) return false;

    const id = normalizeId(productId);
    if (!id) return false;

    setFavourites((current) => {
      const exists = current.includes(id);
      const next = exists ? current.filter((item) => item !== id) : [...current, id];

      if (user?.uid && hasSupabaseConfig) {
        const client = requireSupabase();
        const request = exists
          ? client
              .from('user_favourites')
              .delete()
              .eq('user_id', user.uid)
              .eq('product_id', id)
          : client
              .from('user_favourites')
              .insert({ user_id: user.uid, product_id: id });

        request.catch(() => {
          // Keep optimistic UI state if remote write fails.
        });
      }

      return next;
    });

    return true;
  };

  const isFavourite = (productId) => {
    const id = normalizeId(productId);
    return favourites.includes(id);
  };

  const clearFavourites = () => {
    setFavourites([]);

    if (user?.uid && hasSupabaseConfig) {
      const client = requireSupabase();
      client
        .from('user_favourites')
        .delete()
        .eq('user_id', user.uid)
        .catch(() => {});
    }
  };

  const value = useMemo(
    () => ({
      favourites,
      favouritesCount: favourites.length,
      toggleFavourite,
      isFavourite,
      clearFavourites,
    }),
    [favourites],
  );

  return <FavouritesContext.Provider value={value}>{children}</FavouritesContext.Provider>;
}

export function useFavourites() {
  const context = useContext(FavouritesContext);
  if (!context) {
    throw new Error('useFavourites must be used inside FavouritesProvider.');
  }
  return context;
}
