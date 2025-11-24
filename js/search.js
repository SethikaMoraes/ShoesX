/**
 * Search and Filter Manager
 * Handles product search, filtering, and sorting
 */

class SearchManager {
  constructor() {
    this.products = [];
    this.filteredProducts = [];
    this.filters = {
      search: '',
      categories: [],
      priceRange: 'all',
      sortBy: 'default'
    };
    this.totalProducts = 0;
    this.availableCategories = [];
    this.activeQuickCategory = null;
    this.activeQuickPrice = null;
    this.init();
  }

  init() {
    this.loadProducts();
    this.applyInitialFiltersFromURL();
    this.setupEventListeners();
    this.applyFilters();
  }

  /**
   * Load products from DOM
   */
  loadProducts() {
    const productCards = document.querySelectorAll('.product-card');
    this.products = Array.from(productCards).map(card => ({
      element: card,
      name: card.dataset.name || '',
      price: parseFloat((card.dataset.price || '0').replace('$', '')),
      category: card.dataset.category || '',
      rating: parseFloat(card.dataset.rating || '0'),
      sizes: card.dataset.sizes || '',
      colors: card.dataset.colors || '',
      description: card.dataset.description || '',
      image: card.dataset.image || '',
      fitScore: parseInt(card.dataset.fitScore || '90', 10)
    }));
    this.filteredProducts = [...this.products];
    this.totalProducts = this.products.length;
    this.availableCategories = Array.from(new Set(this.products.map(p => p.category))).filter(Boolean);
    this.updateSummaryUI();
    this.updateMetrics();
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // Search input
    const searchInput = document.getElementById('search-input');
    const mobileSearchInput = document.getElementById('mobile-search-input');
    
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.filters.search = e.target.value.toLowerCase();
        this.applyFilters();
      });
    }

    if (mobileSearchInput) {
      mobileSearchInput.addEventListener('input', (e) => {
        this.filters.search = e.target.value.toLowerCase();
        this.applyFilters();
      });
    }

    // Category filters
    document.querySelectorAll('.filter-category').forEach(checkbox => {
      checkbox.addEventListener('change', () => {
        this.updateCategoryFilters();
      });
    });

    // Price filters
    document.querySelectorAll('.filter-price').forEach(radio => {
      radio.addEventListener('change', (e) => {
        this.filters.priceRange = e.target.value;
        this.applyFilters();
      });
    });

    // Sort options (desktop and mobile)
    const sortSelect = document.getElementById('sort-options');
    const sortSelectMobile = document.getElementById('sort-options-mobile');
    
    if (sortSelect) {
      sortSelect.addEventListener('change', (e) => {
        this.filters.sortBy = e.target.value;
        this.applyFilters();
      });
    }
    
    if (sortSelectMobile) {
      sortSelectMobile.addEventListener('change', (e) => {
        this.filters.sortBy = e.target.value;
        this.applyFilters();
      });
    }

    // Clear filters (desktop and mobile)
    const clearFilters = document.getElementById('clear-filters');
    const clearFiltersMobile = document.getElementById('clear-filters-mobile');
    
    if (clearFilters) {
      clearFilters.addEventListener('click', () => {
        this.clearFilters();
      });
    }
    
    if (clearFiltersMobile) {
      clearFiltersMobile.addEventListener('click', () => {
        this.clearFilters();
      });
    }

    // Filter sidebar toggle (mobile)
    const filterToggle = document.getElementById('filter-toggle');
    const filterSidebar = document.getElementById('filter-sidebar');
    const filterOverlay = document.getElementById('filter-overlay');
    const closeFilters = document.getElementById('close-filters');

    if (filterToggle) {
      filterToggle.addEventListener('click', () => {
        this.openFilterSidebar();
      });
    }

    if (closeFilters) {
      closeFilters.addEventListener('click', () => {
        this.closeFilterSidebar();
      });
    }

    if (filterOverlay) {
      filterOverlay.addEventListener('click', () => {
        this.closeFilterSidebar();
      });
    }

    // Desktop filter toggle
    const filterToggleDesktop = document.getElementById('filter-toggle-desktop');
    const desktopFilters = document.getElementById('desktop-filters');
    
    if (filterToggleDesktop && desktopFilters) {
      filterToggleDesktop.addEventListener('click', () => {
        desktopFilters.classList.toggle('hidden');
      });
    }

    this.setupQuickFilterPills();
    this.setupActiveFilterRemoval();
  }

  applyInitialFiltersFromURL() {
    const params = new URLSearchParams(window.location.search);
    const categoryParam = params.get('category');
    const priceParam = params.get('price');
    const searchParam = params.get('search');

    if (categoryParam) {
      const normalized = this.normalizeCategory(categoryParam);
      const categoryCheckboxes = document.querySelectorAll('.filter-category');
      let matched = false;
      categoryCheckboxes.forEach(cb => {
        const shouldCheck = cb.value === normalized;
        cb.checked = shouldCheck;
        if (shouldCheck) matched = true;
      });
      this.filters.categories = matched ? [normalized] : [];
    }

    if (priceParam) {
      const radio = document.querySelector(`.filter-price[value="${priceParam}"]`);
      if (radio) {
        document.querySelectorAll('.filter-price').forEach(r => r.checked = false);
        radio.checked = true;
        this.filters.priceRange = priceParam;
      }
    }

    if (searchParam) {
      const value = decodeURIComponent(searchParam).replace(/\+/g, ' ');
      const searchInput = document.getElementById('search-input');
      const mobileSearchInput = document.getElementById('mobile-search-input');
      if (searchInput) searchInput.value = value;
      if (mobileSearchInput) mobileSearchInput.value = value;
      this.filters.search = value.toLowerCase();
    }
  }

  setupQuickFilterPills() {
    const quickCategoryButtons = document.querySelectorAll('[data-quick-category]');
    quickCategoryButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const value = btn.dataset.quickCategory;
        if (this.filters.categories.length === 1 && this.filters.categories[0] === value) {
          this.resetCategoryFilters();
          this.applyFilters();
        } else {
          this.applyQuickCategory(value);
        }
      });
    });

    const quickPriceButtons = document.querySelectorAll('[data-quick-price]');
    quickPriceButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const value = btn.dataset.quickPrice;
        if (this.filters.priceRange === value) {
          this.resetPriceFilter();
          this.applyFilters();
        } else {
          this.applyQuickPrice(value);
        }
      });
    });

    const quickReset = document.querySelector('[data-quick-reset]');
    if (quickReset) {
      quickReset.addEventListener('click', () => this.clearFilters());
    }
  }

  setupActiveFilterRemoval() {
    const container = document.getElementById('active-filters');
    if (!container) return;

    container.addEventListener('click', (event) => {
      const target = event.target.closest('[data-remove-filter]');
      if (!target) return;

      const type = target.dataset.removeFilter;
      switch (type) {
        case 'search':
          this.clearSearchInput();
          break;
        case 'price':
          this.resetPriceFilter();
          break;
        case 'categories':
          this.resetCategoryFilters();
          break;
        default:
          break;
      }
      this.applyFilters();
    });
  }

  applyQuickCategory(category) {
    document.querySelectorAll('.filter-category').forEach(cb => {
      cb.checked = cb.value === category;
    });
    this.updateCategoryFilters();
  }

  resetCategoryFilters() {
    document.querySelectorAll('.filter-category').forEach(cb => {
      cb.checked = true;
    });
    this.filters.categories = [];
  }

  applyQuickPrice(priceRange) {
    const radio = document.querySelector(`.filter-price[value="${priceRange}"]`);
    if (radio) {
      radio.checked = true;
      this.filters.priceRange = priceRange;
    }
  }

  resetPriceFilter() {
    const radio = document.querySelector('.filter-price[value="all"]');
    if (radio) {
      radio.checked = true;
    }
    this.filters.priceRange = 'all';
  }

  clearSearchInput() {
    const searchInput = document.getElementById('search-input');
    const mobileSearchInput = document.getElementById('mobile-search-input');
    if (searchInput) searchInput.value = '';
    if (mobileSearchInput) mobileSearchInput.value = '';
    this.filters.search = '';
  }

  /**
   * Update category filters
   */
  updateCategoryFilters() {
    this.filters.categories = Array.from(document.querySelectorAll('.filter-category:checked'))
      .map(cb => cb.value);
    this.applyFilters();
  }

  /**
   * Apply all filters and update display
   */
  applyFilters() {
    let results = [...this.products];

    // Search filter
    if (this.filters.search) {
      results = results.filter(product => 
        product.name.toLowerCase().includes(this.filters.search) ||
        product.description.toLowerCase().includes(this.filters.search) ||
        product.category.toLowerCase().includes(this.filters.search)
      );
    }

    // Category filter
    if (this.filters.categories.length > 0) {
      results = results.filter(product => 
        this.filters.categories.includes(product.category)
      );
    }

    // Price filter
    if (this.filters.priceRange !== 'all') {
      if (this.filters.priceRange === '0-150') {
        results = results.filter(p => p.price < 150);
      } else if (this.filters.priceRange === '150-200') {
        results = results.filter(p => p.price >= 150 && p.price <= 200);
      } else if (this.filters.priceRange === '200+') {
        results = results.filter(p => p.price > 200);
      }
    }

    // Sort
    results = this.sortProducts(results, this.filters.sortBy);

    this.filteredProducts = results;
    this.updateDisplay();
    this.updateSummaryUI();
  }

  updateSummaryUI() {
    const resultsCount = document.getElementById('results-count');
    const totalCount = document.getElementById('total-count');
    if (resultsCount) {
      resultsCount.textContent = String(this.filteredProducts.length).padStart(2, '0');
    }
    if (totalCount) {
      totalCount.textContent = String(this.totalProducts).padStart(2, '0');
    }
    this.updateActiveFiltersUI();
    this.updateQuickFilterState();
  }

  updateActiveFiltersUI() {
    const container = document.getElementById('active-filters');
    if (!container) return;

    container.innerHTML = '';
    const chips = [];

    if (this.filters.search) {
      chips.push(this.createFilterChip(`Search: "${this.filters.search}"`, 'search'));
    }

    if (this.isCategoryFiltered()) {
      const label = this.filters.categories.length === 1
        ? `Category: ${this.filters.categories[0]}`
        : `Categories (${this.filters.categories.length})`;
      chips.push(this.createFilterChip(label, 'categories'));
    }

    if (this.filters.priceRange !== 'all') {
      chips.push(this.createFilterChip(`Price: ${this.getPriceLabel(this.filters.priceRange)}`, 'price'));
    }

    if (chips.length === 0) {
      container.innerHTML = '<span class="text-slate-400 dark:text-slate-500">No filters applied</span>';
      return;
    }

    chips.forEach(chip => container.appendChild(chip));
  }

  createFilterChip(label, type) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'filter-chip';
    button.dataset.removeFilter = type;
    button.innerHTML = `
      <span>${label}</span>
      <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
      </svg>
    `;
    return button;
  }

  isCategoryFiltered() {
    return this.filters.categories.length > 0 &&
      this.availableCategories.length > 0 &&
      this.filters.categories.length < this.availableCategories.length;
  }

  getPriceLabel(value) {
    switch (value) {
      case '0-150':
        return 'Under $150';
      case '150-200':
        return '$150 - $200';
      case '200+':
        return 'Over $200';
      default:
        return 'All prices';
    }
  }

  normalizeCategory(value) {
    if (!value) return '';
    return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
  }

  updateQuickFilterState() {
    document.querySelectorAll('[data-quick-category]').forEach(btn => {
      const value = btn.dataset.quickCategory;
      const isActive = this.filters.categories.length === 1 && this.filters.categories[0] === value;
      btn.classList.toggle('is-active', isActive);
      btn.setAttribute('aria-pressed', String(isActive));
    });

    document.querySelectorAll('[data-quick-price]').forEach(btn => {
      const value = btn.dataset.quickPrice;
      const isActive = this.filters.priceRange === value;
      btn.classList.toggle('is-active', isActive);
      btn.setAttribute('aria-pressed', String(isActive));
    });
  }

  updateMetrics() {
    if (this.products.length === 0) return;

    const totalEl = document.getElementById('metric-total-products');
    const ratingEl = document.getElementById('metric-rating');
    const fitRateEl = document.getElementById('metric-fit-rate');
    const topCategoryEl = document.getElementById('metric-top-category');

    if (totalEl) {
      totalEl.textContent = String(this.totalProducts).padStart(2, '0');
    }

    if (ratingEl) {
      const avgRating = this.products.reduce((sum, product) => sum + (product.rating || 0), 0) / this.products.length;
      ratingEl.textContent = avgRating ? avgRating.toFixed(1) : '4.5';
    }

    if (fitRateEl) {
      const avgFit = Math.round(this.products.reduce((sum, product) => sum + (product.fitScore || 90), 0) / this.products.length);
      fitRateEl.textContent = `${avgFit}%`;
    }

    if (topCategoryEl) {
      topCategoryEl.textContent = this.getTopCategory() || 'All';
    }
  }

  getTopCategory() {
    if (!this.products.length) return '';
    const counts = this.products.reduce((acc, product) => {
      if (!product.category) return acc;
      acc[product.category] = (acc[product.category] || 0) + 1;
      return acc;
    }, {});

    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([category]) => category)[0] || '';
  }

  /**
   * Sort products
   */
  sortProducts(products, sortBy) {
    const sorted = [...products];
    
    switch (sortBy) {
      case 'price-low':
        sorted.sort((a, b) => a.price - b.price);
        break;
      case 'price-high':
        sorted.sort((a, b) => b.price - a.price);
        break;
      case 'name':
        sorted.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'rating':
        sorted.sort((a, b) => b.rating - a.rating);
        break;
      default:
        // Keep original order
        break;
    }
    
    return sorted;
  }

  /**
   * Update product display
   */
  updateDisplay() {
    // Try products page first, then shop section
    let productsGrid = document.getElementById('products-grid');
    if (!productsGrid) {
      const shopSection = document.getElementById('shop');
      if (shopSection) {
        productsGrid = shopSection.querySelector('.grid');
      }
    }
    
    if (!productsGrid) return;

    // Hide all products
    this.products.forEach(product => {
      product.element.style.display = 'none';
    });

    // Show filtered products
    this.filteredProducts.forEach(product => {
      product.element.style.display = 'block';
    });

    // Show "no results" message if needed
    this.showNoResults();
  }

  /**
   * Show no results message
   */
  showNoResults() {
    let productsGrid = document.getElementById('products-grid');
    if (!productsGrid) {
      const shopSection = document.getElementById('shop');
      if (shopSection) {
        productsGrid = shopSection.querySelector('.grid');
      }
    }
    
    if (!productsGrid) return;

    let noResults = document.getElementById('no-results-message');
    
    if (this.filteredProducts.length === 0) {
      if (!noResults) {
        noResults = document.createElement('div');
        noResults.id = 'no-results-message';
        noResults.className = 'col-span-full text-center py-12';
        noResults.innerHTML = `
          <svg xmlns="http://www.w3.org/2000/svg" class="h-16 w-16 mx-auto text-slate-300 dark:text-slate-600 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p class="text-lg font-semibold dark:text-white mb-2">No products found</p>
          <p class="text-slate-500 dark:text-slate-400">Try adjusting your filters or search terms</p>
        `;
        productsGrid.appendChild(noResults);
      }
    } else {
      if (noResults) {
        noResults.remove();
      }
    }
  }

  /**
   * Clear all filters
   */
  clearFilters() {
    // Reset search
    const searchInput = document.getElementById('search-input');
    const mobileSearchInput = document.getElementById('mobile-search-input');
    if (searchInput) searchInput.value = '';
    if (mobileSearchInput) mobileSearchInput.value = '';
    this.filters.search = '';

    // Reset categories
    document.querySelectorAll('.filter-category').forEach(cb => {
      cb.checked = true;
    });
    this.filters.categories = [];

    // Reset price
    document.querySelector('.filter-price[value="all"]').checked = true;
    this.filters.priceRange = 'all';

    // Reset sort (desktop and mobile)
    const sortSelect = document.getElementById('sort-options');
    const sortSelectMobile = document.getElementById('sort-options-mobile');
    
    if (sortSelect) {
      sortSelect.value = 'default';
    }
    if (sortSelectMobile) {
      sortSelectMobile.value = 'default';
    }
    this.filters.sortBy = 'default';

    this.applyFilters();
  }

  /**
   * Open filter sidebar
   */
  openFilterSidebar() {
    const sidebar = document.getElementById('filter-sidebar');
    const overlay = document.getElementById('filter-overlay');
    
    if (sidebar) {
      sidebar.classList.remove('-translate-x-full');
      document.body.style.overflow = 'hidden';
    }
    if (overlay) {
      overlay.classList.remove('hidden');
    }
  }

  /**
   * Close filter sidebar
   */
  closeFilterSidebar() {
    const sidebar = document.getElementById('filter-sidebar');
    const overlay = document.getElementById('filter-overlay');
    
    if (sidebar) {
      sidebar.classList.add('-translate-x-full');
      document.body.style.overflow = '';
    }
    if (overlay) {
      overlay.classList.add('hidden');
    }
  }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = SearchManager;
}

window.SearchManager = SearchManager;

