import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { hasSupabaseConfig, requireSupabase } from '../lib/supabase';
import { useAuth } from './AuthContext';

const SiteContext = createContext(null);

const normalizeTheme = (theme) => (theme === 'dark' ? 'dark' : 'light');

const createEventId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
};

export function SiteProvider({ children }) {
  const { user } = useAuth();
  const [theme, setTheme] = useState('light');
  const [measurements, setMeasurements] = useState(null);
  const [sizeHistory, setSizeHistory] = useState([]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const value = normalizeTheme(theme);
    const root = document.documentElement;

    root.classList.toggle('dark', value === 'dark');
    root.setAttribute('data-theme', value);
  }, [theme]);

  useEffect(() => {
    let active = true;

    const loadUserSiteData = async () => {
      if (!user?.uid || !hasSupabaseConfig) {
        if (!active) return;
        setSizeHistory([]);
        return;
      }

      try {
        const client = requireSupabase();

        const profileQuery = await client
          .from('users_profile')
          .select('preferred_theme,measurements')
          .eq('id', user.uid)
          .maybeSingle();

        if (!active) return;
        if (!profileQuery.error && profileQuery.data) {
          if (profileQuery.data.preferred_theme) {
            setTheme(normalizeTheme(profileQuery.data.preferred_theme));
          }

          if (profileQuery.data.measurements) {
            setMeasurements(profileQuery.data.measurements);
          }
        }

        const historyQuery = await client
          .from('size_history')
          .select('id,product_id,product_name,size,color,created_at')
          .eq('user_id', user.uid)
          .order('created_at', { ascending: false })
          .limit(30);

        if (!active) return;
        if (!historyQuery.error) {
          const rows = (historyQuery.data || []).map((row) => ({
            id: row.id,
            productId: row.product_id || '',
            productName: row.product_name || '',
            size: row.size || '',
            color: row.color || '',
            createdAt: row.created_at || new Date().toISOString(),
          }));
          setSizeHistory(rows);
        }
      } catch {
        if (!active) return;
      }
    };

    loadUserSiteData();
    return () => {
      active = false;
    };
  }, [user?.uid]);

  useEffect(() => {
    if (!user?.uid || !hasSupabaseConfig) return;

    const saveTheme = async () => {
      try {
        const client = requireSupabase();
        await client
          .from('users_profile')
          .update({ preferred_theme: normalizeTheme(theme), updated_at: new Date().toISOString() })
          .eq('id', user.uid);
      } catch {
        // Keep in-memory theme if remote save fails.
      }
    };

    saveTheme();
  }, [theme, user?.uid]);

  const toggleTheme = () => {
    setTheme((current) => (current === 'dark' ? 'light' : 'dark'));
  };

  const saveMeasurements = (payload) => {
    const next = {
      gender: payload.gender || '',
      length: Number(payload.length) || 0,
      width: Number(payload.width) || 0,
      preferredFit: payload.preferredFit || 'regular',
      lastUpdated: new Date().toISOString(),
    };
    setMeasurements(next);
  };

  const addSizeHistory = (entry) => {
    const event = {
      id: createEventId(),
      ...entry,
      createdAt: new Date().toISOString(),
    };
    setSizeHistory((current) => [event, ...current].slice(0, 30));

    if (user?.uid && hasSupabaseConfig) {
      const client = requireSupabase();
      client
        .from('size_history')
        .insert({
          id: event.id,
          user_id: user.uid,
          product_id: String(event.productId || ''),
          product_name: String(event.productName || ''),
          size: String(event.size || ''),
          color: String(event.color || ''),
          created_at: event.createdAt,
        })
        .catch(() => {});
    }
  };

  const clearSizeHistory = () => {
    setSizeHistory([]);

    if (user?.uid && hasSupabaseConfig) {
      const client = requireSupabase();
      client.from('size_history').delete().eq('user_id', user.uid).catch(() => {});
    }
  };

  const value = useMemo(
    () => ({
      theme,
      setTheme,
      toggleTheme,
      measurements,
      saveMeasurements,
      sizeHistory,
      addSizeHistory,
      clearSizeHistory,
    }),
    [theme, measurements, sizeHistory],
  );

  return <SiteContext.Provider value={value}>{children}</SiteContext.Provider>;
}

export function useSite() {
  const value = useContext(SiteContext);
  if (!value) {
    throw new Error('useSite must be used inside SiteProvider');
  }
  return value;
}
