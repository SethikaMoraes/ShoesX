import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { hasSupabaseConfig, requireSupabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import { useProducts } from './ProductsContext';

const CartContext = createContext(null);

const createItemId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
};

const normalizeQty = (value, fallback = 1) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(1, Math.floor(parsed));
};

const idsMatch = (left, right) => String(left) === String(right);

export function CartProvider({ children }) {
  const { user } = useAuth();
  const { products } = useProducts();
  const [items, setItems] = useState([]);
  const [remoteLoaded, setRemoteLoaded] = useState(false);

  useEffect(() => {
    let active = true;

    const loadRemoteCart = async () => {
      if (!user?.uid || !hasSupabaseConfig) {
        if (!active) return;
        setItems((current) => (user?.uid ? current : []));
        setRemoteLoaded(true);
        return;
      }

      setRemoteLoaded(false);
      try {
        const client = requireSupabase();
        const { data, error } = await client
          .from('cart_items')
          .select('*')
          .eq('user_id', user.uid)
          .order('created_at', { ascending: true });

        if (error) {
          throw error;
        }

        if (!active) return;
        const mapped = (data || []).map((row) => ({
          id: String(row.id || createItemId()),
          productId: String(row.product_id || ''),
          size: String(row.size || 'UK 8'),
          qty: normalizeQty(row.qty),
          unitPrice: Number(row.unit_price || 0),
          addedAt: row.created_at || new Date().toISOString(),
        }));
        setItems(mapped);
      } catch {
        if (!active) return;
        setItems([]);
      } finally {
        if (active) setRemoteLoaded(true);
      }
    };

    loadRemoteCart();
    return () => {
      active = false;
    };
  }, [user?.uid]);

  useEffect(() => {
    if (!user?.uid || !remoteLoaded || !hasSupabaseConfig) return;

    const syncRemoteCart = async () => {
      try {
        const client = requireSupabase();
        const { error: deleteError } = await client
          .from('cart_items')
          .delete()
          .eq('user_id', user.uid);

        if (deleteError) {
          throw deleteError;
        }

        if (items.length === 0) return;

        const payload = items.map((item) => ({
          user_id: user.uid,
          product_id: String(item.productId),
          size: String(item.size || 'UK 8'),
          qty: normalizeQty(item.qty),
          unit_price: Number(item.unitPrice || 0),
        }));

        const { error: insertError } = await client.from('cart_items').insert(payload);
        if (insertError) {
          throw insertError;
        }
      } catch {
        // Keep in-memory cart state even when remote sync fails.
      }
    };

    syncRemoteCart();
  }, [items, remoteLoaded, user?.uid]);

  const addToCart = (productId, size = 'UK 8', qty = 1) => {
    if (!user?.uid) return false;

    const target = products.find((product) => idsMatch(product.id, productId));
    if (!target) return false;

    const nextQty = normalizeQty(qty);

    setItems((current) => {
      const index = current.findIndex(
        (item) => idsMatch(item.productId, productId) && item.size === size,
      );
      if (index >= 0) {
        const next = [...current];
        next[index] = {
          ...next[index],
          qty: normalizeQty(Number(next[index].qty || 0) + nextQty),
        };
        return next;
      }

      return [
        ...current,
        {
          id: createItemId(),
          productId: String(target.id),
          size,
          qty: nextQty,
          unitPrice: Number(target.priceNum) || 0,
          addedAt: new Date().toISOString(),
        },
      ];
    });

    return true;
  };

  const removeFromCart = (itemId) => {
    setItems((current) => current.filter((item) => item.id !== itemId));
  };

  const updateQty = (itemId, qty) => {
    const nextQty = Number(qty);
    if (!Number.isFinite(nextQty) || nextQty <= 0) {
      removeFromCart(itemId);
      return;
    }

    setItems((current) =>
      current.map((item) => (item.id === itemId ? { ...item, qty: normalizeQty(nextQty) } : item)),
    );
  };

  const clearCart = () => {
    setItems([]);
  };

  const cartItems = useMemo(() => {
    const productMap = new Map(products.map((product) => [String(product.id), product]));
    return items.map((item) => {
      const product = productMap.get(String(item.productId)) || null;
      const unitPrice = Number(product?.priceNum ?? item.unitPrice ?? 0);
      const qty = normalizeQty(item.qty);

      return {
        ...item,
        qty,
        product,
        unitPrice,
        lineTotal: unitPrice * qty,
      };
    });
  }, [items, products]);

  const cartCount = useMemo(
    () => cartItems.reduce((sum, item) => sum + normalizeQty(item.qty), 0),
    [cartItems],
  );

  const getCartTotal = () => cartItems.reduce((sum, item) => sum + item.lineTotal, 0);

  const value = useMemo(
    () => ({
      items,
      cartItems,
      cartCount,
      addToCart,
      removeFromCart,
      updateQty,
      getCartTotal,
      clearCart,
    }),
    [items, cartItems, cartCount],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used inside CartProvider.');
  }
  return context;
}
