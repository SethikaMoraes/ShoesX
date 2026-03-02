(() => {
  const STORAGE_KEY = 'shoesx_products';
  const grid = document.getElementById('products-grid');

  if (!grid) return;

  const getDefaultProducts = () => {
    if (Array.isArray(window.SHOESX_DEFAULT_PRODUCTS)) {
      return window.SHOESX_DEFAULT_PRODUCTS;
    }
    return [];
  };

  const loadProducts = () => {
    try {
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (Array.isArray(stored) && stored.length) {
        return stored;
      }
    } catch (e) {
      console.warn('Failed to parse stored products:', e);
    }
    return getDefaultProducts();
  };

  const formatPrice = (price) => {
    if (typeof price === 'number') {
      return `$${price}`;
    }
    if (typeof price === 'string' && price.trim()) {
      return price.startsWith('$') ? price : `$${price}`;
    }
    return '$0';
  };

  const toList = (value) => {
    if (Array.isArray(value)) return value;
    if (typeof value === 'string') {
      return value.split(',').map(item => item.trim()).filter(Boolean);
    }
    return [];
  };

  const getCardImage = (product) => product.cardImage || product.image || '';
  const getShortDescription = (product) => product.shortDescription || product.description || '';

  const renderProductCard = (product) => {
    const price = formatPrice(product.price ?? product.priceNum);
    const rating = product.rating ?? 0;
    const fitScore = product.fitScore ?? 90;
    const colors = toList(product.colors).join(', ');
    const sizes = product.sizes || 'UK 6-11';
    const badge = product.badge || 'Featured';
    const logistics = toList(product.logistics);
    const cardImage = getCardImage(product);
    const shortDescription = getShortDescription(product);

    const logisticsHtml = logistics.length
      ? logistics.map(item => `<span class="logistics-pill">${item}</span>`).join('')
      : '<span class="logistics-pill">Fast dispatch</span>';

    return `
      <div class="product-card card tilt-card" data-name="${product.name || ''}" data-price="${price}"
        data-category="${product.category || ''}" data-rating="${rating}" data-sizes="${sizes}"
        data-colors="${colors}" data-description="${shortDescription}"
        data-image="${product.image || ''}" data-fit-score="${fitScore}">
        <div class="product-card-media mb-4">
          <img src="${cardImage}" alt="${product.name || 'Product image'}" class="rounded-2xl h-48 w-full object-cover" loading="lazy">
          <span class="product-chip">${badge}</span>
        </div>
        <div class="flex items-center justify-between mb-2">
          <div>
            <h3 class="font-semibold text-lg dark:text-white">${product.name || ''}</h3>
            <p class="text-sm text-slate-500 dark:text-slate-400">${shortDescription}</p>
          </div>
          <span class="text-purple-600 dark:text-purple-400 font-semibold">${price}</span>
        </div>
        <div class="flex items-center justify-between text-sm text-slate-500 dark:text-slate-400 mb-3">
          <span class="px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-700">${product.category || ''}</span>
          <span class="fit-score" aria-label="Fit confidence score">AI Fit ${fitScore}%</span>
        </div>
        <ul class="product-meta text-xs text-slate-500 dark:text-slate-400 mb-4">
          <li><span>Sizes:</span><span>${sizes}</span></li>
          <li><span>Colors:</span><span>${colors}</span></li>
        </ul>
        <div class="flex items-center gap-2 text-xs text-emerald-600 dark:text-emerald-400 mb-4">
          ${logisticsHtml}
        </div>
        <div class="flex gap-2">
          <a href="product-detail.html?id=${product.id}" class="btn-secondary flex-1 text-center focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
            aria-label="View details for ${product.name || 'product'}">View Details</a>
          <button class="btn-primary flex-1 add-to-cart focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
            data-product-id="${product.id}" data-product-name="${product.name || ''}" data-product-price="${price}"
            data-product-image="${product.image || ''}" data-product-category="${product.category || ''}"
            aria-label="Add ${product.name || 'product'} to cart">Add to Cart</button>
        </div>
      </div>
    `;
  };

  const renderCatalog = () => {
    const products = loadProducts();
    grid.innerHTML = products.map(renderProductCard).join('');
  };

  renderCatalog();
})();
