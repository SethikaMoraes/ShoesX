import { Heart, Search, ShoppingCart } from 'lucide-react';
import { Link } from 'react-router-dom';
import { SHOP_CATEGORY_OPTIONS } from '../constants/shopFilters';

const quickLinks = SHOP_CATEGORY_OPTIONS;

export default function ShopTopBar({
  searchValue,
  onSearchChange,
  onSearchSubmit,
  onQuickCategorySelect,
  favouritesCount,
  cartCount,
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          {quickLinks.map((label) => (
            <button
              key={label}
              type="button"
              onClick={() => onQuickCategorySelect(label)}
              className="rounded-xl px-3 py-2 text-sm font-medium text-slate-800 transition hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              {label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <form
            className="flex items-center gap-2 rounded-full border border-slate-300 bg-slate-100 px-3 py-2 dark:border-slate-700 dark:bg-slate-950"
            onSubmit={onSearchSubmit}
          >
            <Search size={16} aria-hidden="true" className="text-slate-600 dark:text-slate-300" />
            <input
              value={searchValue}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="Search"
              className="w-36 bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-500 dark:text-slate-100 dark:placeholder:text-slate-400"
            />
          </form>

          <Link
            to="/favourites"
            aria-label="Favourites"
            className="relative inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-300 bg-white text-slate-800 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <Heart
              size={18}
              className={
                favouritesCount > 0 ? 'fill-slate-900 text-slate-900 dark:fill-white dark:text-white' : ''
              }
            />
            {favouritesCount > 0 ? (
              <span className="absolute -right-1 -top-1 inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-slate-900 px-1 text-[10px] font-bold text-white dark:bg-slate-100 dark:text-slate-900">
                {favouritesCount}
              </span>
            ) : null}
          </Link>

          <button
            type="button"
            aria-label="Open cart"
            onClick={() => {
              if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('open-shoesx-cart'));
              }
            }}
            className="relative inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-300 bg-white text-slate-800 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <ShoppingCart size={18} aria-hidden="true" />
            <span className="absolute -right-1 -top-1 inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-slate-900 px-1 text-[10px] font-bold text-white dark:bg-slate-100 dark:text-slate-900">
              {cartCount}
            </span>
          </button>
        </div>
      </div>
    </section>
  );
}
