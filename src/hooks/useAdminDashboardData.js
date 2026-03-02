import { useCallback, useEffect, useState } from 'react';
import { getAdminStats, getOpenChats, getRecentOrders, subscribeAdminRealtime } from '../lib/adminData';

const EMPTY_STATS = {
  totalOrders: 0,
  openChats: 0,
  revenue: 0,
  productsCount: 0,
  pendingOrders: 0,
};

export function useAdminDashboardData() {
  const [stats, setStats] = useState(EMPTY_STATS);
  const [recentOrders, setRecentOrders] = useState([]);
  const [openChats, setOpenChats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const [nextStats, nextOrders, nextChats] = await Promise.all([
        getAdminStats(),
        getRecentOrders(10),
        getOpenChats(10),
      ]);

      setStats(nextStats);
      setRecentOrders(nextOrders);
      setOpenChats(nextChats);
    } catch (loadError) {
      const message = String(loadError?.message || '').trim();
      setError(message || 'Unable to load dashboard data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();

    const unsubscribe = subscribeAdminRealtime(
      () => {
        refresh();
      },
      (subscribeError) => {
        const message = String(subscribeError?.message || '').trim();
        setError(message || 'Realtime dashboard updates are unavailable.');
      },
    );

    return () => unsubscribe();
  }, [refresh]);

  return {
    stats,
    recentOrders,
    openChats,
    loading,
    error,
    refresh,
  };
}
