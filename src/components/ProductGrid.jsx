import ProductCard from './ProductCard';

export default function ProductGrid({ products = [] }) {
  if (products.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
        No products matched your current filters.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} variant="shop" />
      ))}
    </div>
  );
}
