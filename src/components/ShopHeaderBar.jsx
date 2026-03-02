import { SlidersHorizontal } from 'lucide-react';

export default function ShopHeaderBar({
  count,
  showFilters,
  onToggleFilters,
  sortBy,
  onSortChange,
}) {
  return (
    <div className="flex flex-col gap-3 border-b border-slate-200 pb-4 dark:border-slate-800 sm:flex-row sm:items-end sm:justify-between">
      <h1 className="text-3xl font-bold tracking-tight">Shoes &amp; Sneakers ({count})</h1>

      <div className="flex items-center gap-4 text-lg">
        <button
          type="button"
          onClick={onToggleFilters}
          className="inline-flex items-center gap-2 text-slate-900 transition hover:text-slate-600 dark:text-slate-100 dark:hover:text-slate-300"
        >
          {showFilters ? 'Hide Filters' : 'Show Filters'}
          <SlidersHorizontal size={18} aria-hidden="true" />
        </button>

        <label className="inline-flex items-center gap-2">
          <span className="text-slate-900 dark:text-slate-100">Sort By</span>
          <select
            value={sortBy}
            onChange={(event) => onSortChange(event.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-base text-slate-900 outline-none focus:border-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
          >
            <option value="featured">Featured</option>
            <option value="name">Name</option>
            <option value="price-low-high">Price: Low to High</option>
            <option value="price-high-low">Price: High to Low</option>
          </select>
        </label>
      </div>
    </div>
  );
}
