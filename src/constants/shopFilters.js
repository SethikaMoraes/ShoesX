export const SHOP_CATEGORY_OPTIONS = ['All', 'Running', 'Sport', 'Formal', 'Sneaker'];

export const normalizeCategory = (value) => String(value || '').trim().toLowerCase();

export const isAllCategory = (value) => normalizeCategory(value) === 'all';

export const resolveCategoryOption = (value) => {
  const normalized = normalizeCategory(value);
  const match = SHOP_CATEGORY_OPTIONS.find((category) => normalizeCategory(category) === normalized);
  return match || 'All';
};

export const categoryMatches = (productCategory, selectedCategory) =>
  isAllCategory(selectedCategory) || normalizeCategory(productCategory) === normalizeCategory(selectedCategory);
