import { normalizeCategory, SHOP_CATEGORY_OPTIONS } from '../constants/shopFilters';

export default function FiltersSidebar({
  selectedCategory,
  onCategoryChange,
  pickUpToday,
  onPickUpTodayChange,
}) {
  const selectedCategoryKey = normalizeCategory(selectedCategory);

  return (
    <aside className="w-full border-r border-slate-200 pr-6 dark:border-slate-800">
      <div className="mb-5 flex items-center justify-between">
        <p className="text-3xl font-medium">Pick Up Today</p>
        <button
          type="button"
          aria-pressed={pickUpToday}
          onClick={() => onPickUpTodayChange(!pickUpToday)}
          className={`relative h-7 w-12 rounded-full transition ${
            pickUpToday ? 'bg-slate-900 dark:bg-slate-100' : 'bg-slate-300 dark:bg-slate-700'
          }`}
        >
          <span
            className={`absolute top-1 h-5 w-5 rounded-full bg-white transition ${
              pickUpToday ? 'left-6 bg-white dark:bg-slate-900' : 'left-1'
            }`}
          />
        </button>
      </div>

      <div className="max-h-[560px] overflow-y-auto pr-2">
        <ul className="space-y-2">
          {SHOP_CATEGORY_OPTIONS.map((category) => (
            <li key={category}>
              <button
                type="button"
                onClick={() => onCategoryChange(category)}
                className={`block text-left text-xl transition ${
                  selectedCategoryKey === normalizeCategory(category)
                    ? 'font-semibold text-slate-900 dark:text-slate-100'
                    : 'text-slate-700 hover:text-slate-900 dark:text-slate-300 dark:hover:text-slate-100'
                }`}
              >
                {category}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
}
