import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import {
  DEFAULT_PRODUCTS,
  normalizeProduct,
  PRODUCT_IMAGE_PLACEHOLDER,
} from '../data/products';
import { hasSupabaseConfig, requireSupabase } from '../lib/supabase';

const ProductsContext = createContext(null);

const normalizeProducts = (products) => {
  if (!Array.isArray(products)) return [];
  return products.map((product) => normalizeProduct(product));
};

const toId = (value) => String(value ?? '').trim();

export function ProductsProvider({ children }) {
  const [products, setProducts] = useState(() => normalizeProducts(DEFAULT_PRODUCTS));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const mapRowToProduct = (row = {}) =>
    normalizeProduct({
      id: row.id,
      name: row.name,
      description: row.description,
      shortDescription: row.short_description,
      priceNum: row.price,
      category: row.category,
      sizes: row.sizes,
      sizeOptions: row.size_options,
      colors: row.colors,
      image: row.image,
      cardImage: row.card_image,
      imageUrl: row.image,
      images: row.images,
      modelUrl: row.model_url,
      badge: row.badge,
      logistics: row.logistics,
      fitScore: row.fit_score,
      aiFit: row.ai_fit,
      rating: row.rating,
    });

  const mapProductToRow = (product = {}) => {
    const normalized = normalizeProduct(product);
    return {
      id: String(normalized.id),
      name: normalized.name,
      description: normalized.description || '',
      short_description: normalized.shortDescription || '',
      price: Number(normalized.priceNum || normalized.price || 0),
      category: normalized.category || 'Sport',
      sizes: normalized.sizes || '',
      size_options: Array.isArray(normalized.sizeOptions) ? normalized.sizeOptions : [],
      colors: Array.isArray(normalized.colors) ? normalized.colors : [],
      image:
        String(normalized.image || normalized.imageUrl || normalized.cardImage || '').trim() ||
        PRODUCT_IMAGE_PLACEHOLDER,
      images: Array.isArray(normalized.images) ? normalized.images : [],
      card_image: String(normalized.cardImage || '').trim() || null,
      model_url: String(normalized.modelUrl || '').trim() || null,
      badge: String(normalized.badge || '').trim() || null,
      logistics: Array.isArray(normalized.logistics) ? normalized.logistics : [],
      fit_score: Number(normalized.fitScore ?? normalized.aiFit ?? 90),
      ai_fit: Number(normalized.aiFit ?? normalized.fitScore ?? 90),
      rating: Number(normalized.rating || 0),
      updated_at: new Date().toISOString(),
    };
  };

  const loadProducts = async () => {
    setLoading(true);
    setError('');

    if (!hasSupabaseConfig) {
      setProducts(normalizeProducts(DEFAULT_PRODUCTS));
      setLoading(false);
      return;
    }

    try {
      const client = requireSupabase();
      const { data, error: loadError } = await client
        .from('products')
        .select('*')
        .order('created_at', { ascending: false });

      if (loadError) {
        throw new Error(loadError.message || 'Unable to load products.');
      }

      const remoteProducts = Array.isArray(data) ? data.map(mapRowToProduct) : [];
      setProducts(remoteProducts.length > 0 ? remoteProducts : normalizeProducts(DEFAULT_PRODUCTS));
    } catch (loadError) {
      setError(String(loadError?.message || 'Unable to load products.'));
      setProducts(normalizeProducts(DEFAULT_PRODUCTS));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  const addProduct = async (productPayload) => {
    const nextProduct = normalizeProduct(productPayload);

    if (hasSupabaseConfig) {
      const client = requireSupabase();
      const { error: upsertError } = await client
        .from('products')
        .upsert(mapProductToRow(nextProduct), { onConflict: 'id' });

      if (upsertError) {
        throw new Error(upsertError.message || 'Unable to add product.');
      }
    }

    setProducts((current) => [nextProduct, ...current.filter((item) => toId(item.id) !== toId(nextProduct.id))]);
    return nextProduct;
  };

  const updateProduct = async (productId, updates) => {
    const existing = products.find((item) => toId(item.id) === toId(productId));
    if (!existing) return null;

    const nextProduct = normalizeProduct({ ...existing, ...updates, id: existing.id });

    if (hasSupabaseConfig) {
      const client = requireSupabase();
      const { error: updateError } = await client
        .from('products')
        .update(mapProductToRow(nextProduct))
        .eq('id', String(existing.id));

      if (updateError) {
        throw new Error(updateError.message || 'Unable to update product.');
      }
    }

    setProducts((current) =>
      current.map((item) => (toId(item.id) === toId(productId) ? nextProduct : item)),
    );

    return nextProduct;
  };

  const deleteProduct = async (productId) => {
    if (hasSupabaseConfig) {
      const client = requireSupabase();
      const { error: deleteError } = await client
        .from('products')
        .delete()
        .eq('id', String(productId));

      if (deleteError) {
        throw new Error(deleteError.message || 'Unable to delete product.');
      }
    }

    setProducts((current) => current.filter((product) => toId(product.id) !== toId(productId)));
  };

  const getProductById = (productId) =>
    products.find((product) => toId(product.id) === toId(productId)) || null;

  const resetProducts = async () => {
    const defaults = normalizeProducts(DEFAULT_PRODUCTS);

    if (hasSupabaseConfig) {
      const client = requireSupabase();
      const { error: deleteError } = await client.from('products').delete().neq('id', '');
      if (deleteError) {
        throw new Error(deleteError.message || 'Unable to reset products.');
      }

      const rows = defaults.map((product) => mapProductToRow(product));
      const { error: insertError } = await client.from('products').insert(rows);
      if (insertError) {
        throw new Error(insertError.message || 'Unable to reset products.');
      }
    }

    setProducts(defaults);
  };

  const value = useMemo(
    () => ({
      products,
      loading,
      error,
      refreshProducts: loadProducts,
      addProduct,
      updateProduct,
      deleteProduct,
      getProductById,
      resetProducts,
    }),
    [products, loading, error],
  );

  return <ProductsContext.Provider value={value}>{children}</ProductsContext.Provider>;
}

export function useProducts() {
  const context = useContext(ProductsContext);
  if (!context) {
    throw new Error('useProducts must be used inside ProductsProvider.');
  }
  return context;
}
