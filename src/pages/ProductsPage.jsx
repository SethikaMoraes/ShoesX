import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import FiltersSidebar from '../components/FiltersSidebar';
import ProductGrid from '../components/ProductGrid';
import ShopHeaderBar from '../components/ShopHeaderBar';
import ShopTopBar from '../components/ShopTopBar';
import { categoryMatches, resolveCategoryOption } from '../constants/shopFilters';
import { useCart } from '../context/CartContext';
import { useFavourites } from '../context/FavouritesContext';
import { useProducts } from '../context/ProductsContext';

const normalizeText = (value) => String(value || '').toLowerCase();

const sortProducts = (products, sortBy) => {
  const list = [...products];
  if (sortBy === 'name') {
    return list.sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')));
  }
  if (sortBy === 'price-low-high') {
    return list.sort((a, b) => Number(a.priceNum || 0) - Number(b.priceNum || 0));
  }
  if (sortBy === 'price-high-low') {
    return list.sort((a, b) => Number(b.priceNum || 0) - Number(a.priceNum || 0));
  }
  return list;
};

export default function ProductsPage() {
  const { products } = useProducts();
  const { cartCount } = useCart();
  const { favouritesCount } = useFavourites();
  const [searchParams, setSearchParams] = useSearchParams();

  const [showFilters, setShowFilters] = useState(true);
  const [sortBy, setSortBy] = useState('featured');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [pickUpToday, setPickUpToday] = useState(false);
  const [searchInput, setSearchInput] = useState(() => String(searchParams.get('q') || ''));

  const searchQuery = normalizeText(searchParams.get('q'));
  const priceFilter = normalizeText(searchParams.get('price'));
  const urlCategory = resolveCategoryOption(searchParams.get('category') || 'All');

  useEffect(() => {
    setSelectedCategory(resolveCategoryOption(urlCategory));
  }, [urlCategory]);

  useEffect(() => {
    setSearchInput(String(searchParams.get('q') || ''));
  }, [searchParams]);

  const updateSearchParam = (key, value) => {
    const next = new URLSearchParams(searchParams);
    const isEmpty = !value || String(value).trim() === '';
    const isCategoryDefault = key === 'category' && resolveCategoryOption(value) === 'All';

    if (isEmpty || isCategoryDefault) {
      next.delete(key);
    } else {
      next.set(key, value);
    }
    setSearchParams(next, { replace: true });
  };

  const handleCategoryChange = (category) => {
    const resolvedCategory = resolveCategoryOption(category);
    setSelectedCategory(resolvedCategory);
    updateSearchParam('category', resolvedCategory);
  };

  const handleSearchSubmit = (event) => {
    event.preventDefault();
    updateSearchParam('q', searchInput.trim());
  };

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const searchIndex = [product.name, product.category, product.shortDescription, product.description]
        .map((item) => normalizeText(item))
        .join(' ');

      const logisticsText = [product.badge, ...(product.logistics || [])]
        .map((item) => normalizeText(item))
        .join(' ');

      const matchesQuery = !searchQuery || searchIndex.includes(searchQuery);
      const matchesCategory = categoryMatches(product.category, selectedCategory);
      const matchesPickup =
        !pickUpToday ||
        logisticsText.includes('dispatch') ||
        logisticsText.includes('pickup') ||
        logisticsText.includes('today');
      const matchesPrice = priceFilter !== 'under-150' || Number(product.priceNum || 0) < 150;

      return matchesQuery && matchesCategory && matchesPickup && matchesPrice;
    });
  }, [products, pickUpToday, priceFilter, searchQuery, selectedCategory]);

  const sortedProducts = useMemo(() => sortProducts(filteredProducts, sortBy), [filteredProducts, sortBy]);

  return (
    <div className="space-y-6">
      <ShopTopBar
        searchValue={searchInput}
        onSearchChange={setSearchInput}
        onSearchSubmit={handleSearchSubmit}
        onQuickCategorySelect={handleCategoryChange}
        favouritesCount={favouritesCount}
        cartCount={cartCount}
      />

      <ShopHeaderBar
        count={sortedProducts.length}
        showFilters={showFilters}
        onToggleFilters={() => setShowFilters((current) => !current)}
        sortBy={sortBy}
        onSortChange={setSortBy}
      />

      <div className="space-y-4 lg:hidden">
        {showFilters ? (
          <FiltersSidebar
            selectedCategory={selectedCategory}
            onCategoryChange={handleCategoryChange}
            pickUpToday={pickUpToday}
            onPickUpTodayChange={setPickUpToday}
          />
        ) : null}
        <ProductGrid products={sortedProducts} />
      </div>

      <div className="hidden gap-6 lg:flex">
        {showFilters ? (
          <div className="w-64 shrink-0">
            <FiltersSidebar
              selectedCategory={selectedCategory}
              onCategoryChange={handleCategoryChange}
              pickUpToday={pickUpToday}
              onPickUpTodayChange={setPickUpToday}
            />
          </div>
        ) : null}

        <div className="min-w-0 flex-1">
          <ProductGrid products={sortedProducts} />
        </div>
      </div>
    </div>
  );
}
