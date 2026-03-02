import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import ProductGrid from '../components/ProductGrid';
import { useFavourites } from '../context/FavouritesContext';
import { useProducts } from '../context/ProductsContext';

export default function Favourites() {
  const { products } = useProducts();
  const { favourites, clearFavourites } = useFavourites();

  const favouriteProducts = useMemo(() => {
    const ids = new Set(favourites.map((id) => String(id)));
    return products.filter((product) => ids.has(String(product.id)));
  }, [products, favourites]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Favourites ({favouriteProducts.length})</h1>
        {favouriteProducts.length > 0 ? (
          <button type="button" className="btn-secondary" onClick={clearFavourites}>
            Clear all
          </button>
        ) : null}
      </div>

      {favouriteProducts.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center dark:border-slate-800 dark:bg-slate-900">
          <p className="text-sm text-slate-600 dark:text-slate-300">
            You have not saved any favourites yet.
          </p>
          <Link to="/products" className="btn-primary mt-4">
            Browse Products
          </Link>
        </div>
      ) : (
        <ProductGrid products={favouriteProducts} />
      )}
    </div>
  );
}
