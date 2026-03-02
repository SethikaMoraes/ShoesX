/**
 * Product Detail Page Manager
 * Handles product detail page functionality
 */

// Product database (in a real app, this would come from an API or Firestore)
const DEFAULT_PRODUCTS_DB = {
  'aeroflex-runner': {
    id: 'aeroflex-runner',
    name: 'AeroFlex Runner',
    price: '$149',
    priceNum: 149,
    category: 'Running',
    rating: 4.8,
    sizes: 'UK 6-11',
    colors: ['Graphite', 'Arctic Blue'],
    description: 'Lightweight knit runner with carbon-infused midsole. Perfect for daily runs and long-distance training. Features breathable mesh upper and responsive cushioning.',
    image: 'https://images.unsplash.com/photo-1528701800489-20be9c1e74bb?auto=format&fit=crop&w=900&q=60'
  },
  'pulse-knit-sneaker': {
    id: 'pulse-knit-sneaker',
    name: 'Pulse Knit Sneaker',
    price: '$129',
    priceNum: 129,
    category: 'Casual',
    rating: 4.7,
    sizes: 'UK 5-10',
    colors: ['Black', 'Sand'],
    description: 'Breathable knit upper with adaptive foam cushioning. Ideal for everyday wear with maximum comfort and style.',
    image: 'https://images.unsplash.com/photo-1514986888952-8cd320577b68?auto=format&fit=crop&w=900&q=60'
  },
  'vertex-trail-pro': {
    id: 'vertex-trail-pro',
    name: 'Vertex Trail Pro',
    price: '$169',
    priceNum: 169,
    category: 'Trail',
    rating: 4.9,
    sizes: 'UK 7-12',
    colors: ['Olive', 'Burnt Orange'],
    description: 'Aggressive outsole with waterproof mesh upper. Built for rugged terrain and challenging trails.',
    image: 'https://images.unsplash.com/photo-1549298916-b41d501d3772?auto=format&fit=crop&w=900&q=60'
  },
  'forma-luxe-oxford': {
    id: 'forma-luxe-oxford',
    name: 'Forma Luxe Oxford',
    price: '$189',
    priceNum: 189,
    category: 'Formal',
    rating: 4.6,
    sizes: 'UK 6-12',
    colors: ['Chestnut', 'Midnight'],
    description: 'Hand-finished leather upper with memory foam insole. Elegant design for professional and formal occasions.',
    image: 'https://images.unsplash.com/photo-1475180098004-ca77a66827be?auto=format&fit=crop&w=900&q=60'
  },
  'halo-court': {
    id: 'halo-court',
    name: 'Halo Court',
    price: '$139',
    priceNum: 139,
    category: 'Athletic',
    rating: 4.5,
    sizes: 'UK 6-11',
    colors: ['White', 'Navy'],
    description: 'Court-ready leather sneaker with cushioned heel pod. Perfect for indoor sports and casual wear.',
    image: 'https://images.unsplash.com/photo-1549298916-5a8b0c6908d1?auto=format&fit=crop&w=900&q=60'
  },
  'nimbus-glide': {
    id: 'nimbus-glide',
    name: 'Nimbus Glide',
    price: '$159',
    priceNum: 159,
    category: 'Running',
    rating: 4.8,
    sizes: 'UK 6-12',
    colors: ['Silver', 'Neon Lime'],
    description: 'Energy-return midsole with breathable engineered mesh. Advanced cushioning technology for maximum performance.',
    image: 'https://images.unsplash.com/photo-1549298916-12346510946f?auto=format&fit=crop&w=900&q=60'
  }
};

const buildProductMap = () => {
  const normalize = (product) => {
    const priceNum = Number(String(product.price || '').replace('$', '')) || product.priceNum || 0;
    return {
      id: product.id,
      name: product.name,
      price: product.price || `$${priceNum}`,
      priceNum: priceNum,
      category: product.category || 'Running',
      rating: Number(product.rating) || 0,
      sizes: product.sizes || 'UK 6-11',
      colors: Array.isArray(product.colors)
        ? product.colors
        : String(product.colors || '').split(',').map(item => item.trim()).filter(Boolean),
      description: product.description || '',
      image: product.image || product.cardImage || ''
    };
  };

  const fromArray = (products) => {
    return products.reduce((acc, product) => {
      if (!product || !product.id) return acc;
      acc[product.id] = normalize(product);
      return acc;
    }, {});
  };

  try {
    const stored = JSON.parse(localStorage.getItem('shoesx_products'));
    if (Array.isArray(stored) && stored.length) {
      return fromArray(stored);
    }
  } catch (e) {
    console.warn('Failed to parse admin products:', e);
  }

  if (Array.isArray(window.SHOESX_DEFAULT_PRODUCTS) && window.SHOESX_DEFAULT_PRODUCTS.length) {
    return fromArray(window.SHOESX_DEFAULT_PRODUCTS);
  }

  return DEFAULT_PRODUCTS_DB;
};

const PRODUCTS_DB = buildProductMap();

class ProductDetailManager {
  constructor() {
    this.currentProduct = null;
    this.selectedSize = null;
    this.selectedColor = null;
    this.currentSizeSystem = 'UK'; // Default size system
    this.init();
  }

  init() {
    // Get product ID from URL
    const urlParams = new URLSearchParams(window.location.search);
    const productId = urlParams.get('id');

    if (!productId) {
      this.showError();
      return;
    }

    // Load product data
    this.loadProduct(productId);
    this.setupEventListeners();
  }

  /**
   * Load product data
   */
  loadProduct(productId) {
    const product = PRODUCTS_DB[productId];

    if (!product) {
      this.showError();
      return;
    }

    this.currentProduct = product;
    this.displayProduct(product);
    this.loadRelatedProducts(product);
  }

  /**
   * Display product information
   */
  displayProduct(product) {
    // Hide loading, show content
    document.getElementById('loading-state').classList.add('hidden');
    document.getElementById('product-content').classList.remove('hidden');

    // Set page title
    document.title = `${product.name} - ShoesX`;

    // Breadcrumb
    const breadcrumb = document.getElementById('breadcrumb-product');
    if (breadcrumb) breadcrumb.textContent = product.name;

    // Main image
    const mainImage = document.getElementById('product-main-image');
    if (mainImage) {
      mainImage.src = product.image;
      mainImage.alt = product.name;
    }

    // Product name
    const productName = document.getElementById('product-name');
    if (productName) productName.textContent = product.name;

    // Category
    const category = document.getElementById('product-category');
    if (category) category.textContent = product.category;

    // Price
    const price = document.getElementById('product-price');
    if (price) price.textContent = product.price;

    // Rating
    const rating = document.getElementById('product-rating');
    const ratingText = document.getElementById('rating-text');
    if (rating) {
      rating.innerHTML = this.generateStars(product.rating);
    }
    if (ratingText) {
      ratingText.textContent = `${product.rating} (${Math.floor(Math.random() * 50 + 20)} reviews)`;
    }

    // Description
    const description = document.getElementById('product-description');
    if (description) description.textContent = product.description;

    // Available sizes
    const availableSizes = document.getElementById('available-sizes');
    if (availableSizes) availableSizes.textContent = product.sizes;

    // Size selection
    this.renderSizes(product.sizes);
    this.renderColors(product.colors);
  }

  /**
   * Generate star rating HTML
   */
  generateStars(rating) {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    let html = '';

    for (let i = 0; i < fullStars; i++) {
      html += '&#9733;';
    }
    if (hasHalfStar) {
      html += '&#9734;';
    }
    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
    for (let i = 0; i < emptyStars; i++) {
      html += '&#9734;';
    }

    return html;
  }

  /**
   * Render size selection buttons with multi-system support
   */
  renderSizes(sizeRange) {
    const container = document.getElementById('size-selection');
    if (!container) return;

    // Parse size range (e.g., "UK 6-11")
    const match = sizeRange.match(/(\w+)\s+(\d+)-(\d+)/);
    if (!match) return;

    const [, originalSystem, start, end] = match;
    const startSize = parseInt(start);
    const endSize = parseInt(end);

    // Store original range for system switching
    this.originalSizeRange = { system: originalSystem, start: startSize, end: endSize };

    this.updateSizeButtons();
    this.setupSizeSystemToggle();
  }

  /**
   * Update size buttons based on current size system
   */
  updateSizeButtons() {
    const container = document.getElementById('size-selection');
    if (!container || !this.originalSizeRange) return;

    const { system, start, end } = this.originalSizeRange;
    container.innerHTML = '';

    for (let size = start; size <= end; size++) {
      const convertedSize = SizeConverter.convert(size, system, this.currentSizeSystem);
      const button = document.createElement('button');
      button.className = 'px-4 py-3 border-2 border-slate-200 dark:border-slate-700 rounded-lg hover:border-purple-500 dark:hover:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-colors dark:text-white font-medium';
      button.textContent = `${this.currentSizeSystem} ${convertedSize}`;
      button.dataset.size = `${this.currentSizeSystem} ${convertedSize}`;
      button.dataset.originalSize = `${system} ${size}`;
      
      button.addEventListener('click', () => {
        // Remove selected from all
        container.querySelectorAll('button').forEach(btn => {
          btn.classList.remove('border-purple-600', 'bg-purple-50', 'dark:bg-purple-900/20', 'text-purple-700', 'dark:text-purple-300');
        });
        // Add to clicked
        button.classList.add('border-purple-600', 'bg-purple-50', 'dark:bg-purple-900/20', 'text-purple-700', 'dark:text-purple-300');
        this.selectedSize = button.dataset.originalSize; // Store original size for cart
        this.hideSizeError();
      });

      container.appendChild(button);
    }
  }

  /**
   * Setup size system toggle (UK/US/EU)
   */
  setupSizeSystemToggle() {
    const buttons = document.querySelectorAll('.size-system-btn');
    buttons.forEach(btn => {
      btn.addEventListener('click', () => {
        // Remove active class from all
        buttons.forEach(b => b.classList.remove('active'));
        // Add to clicked
        btn.classList.add('active');
        this.currentSizeSystem = btn.dataset.system;
        this.updateSizeButtons();
      });
    });
  }

  /**
   * Setup size chart modal
   */
  setupSizeChartModal() {
    if (typeof SizeChartUI === 'undefined') return;

    SizeChartUI.initModal({
      openBtnId: 'size-chart-btn',
      closeBtnId: 'size-chart-close',
      modalId: 'size-chart-modal',
      genderSelectId: 'size-chart-gender',
      systemSelectId: 'size-chart-system',
      widthSelectId: 'size-chart-width',
      tableBodyId: 'size-chart-body',
      sizeHeaderId: 'size-chart-size-header',
      statusId: 'size-chart-status',
      scrollContainerId: 'size-chart-scroll',
      scrollUpBtnId: 'size-chart-scroll-up',
      scrollDownBtnId: 'size-chart-scroll-down',
      getDefaultSystem: () => this.currentSizeSystem
    });
  }

  /**
   * Render color selection
   */
  renderColors(colors) {
    const container = document.getElementById('color-selection');
    if (!container) return;

    container.innerHTML = '';

    colors.forEach((color, index) => {
      const button = document.createElement('button');
      button.className = 'px-4 py-2 border-2 border-slate-200 dark:border-slate-700 rounded-lg hover:border-purple-500 dark:hover:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-colors dark:text-white text-sm';
      button.textContent = color;
      button.dataset.color = color;
      
      if (index === 0) {
        button.classList.add('border-purple-600', 'bg-purple-50', 'dark:bg-purple-900/20', 'text-purple-700', 'dark:text-purple-300');
        this.selectedColor = color;
      }

      button.addEventListener('click', () => {
        container.querySelectorAll('button').forEach(btn => {
          btn.classList.remove('border-purple-600', 'bg-purple-50', 'dark:bg-purple-900/20', 'text-purple-700', 'dark:text-purple-300');
        });
        button.classList.add('border-purple-600', 'bg-purple-50', 'dark:bg-purple-900/20', 'text-purple-700', 'dark:text-purple-300');
        this.selectedColor = color;
      });

      container.appendChild(button);
    });
  }

  /**
   * Load related products
   */
  loadRelatedProducts(currentProduct) {
    const container = document.getElementById('related-products');
    if (!container) return;

    // Get products from same category, excluding current
    const related = Object.values(PRODUCTS_DB)
      .filter(p => p.category === currentProduct.category && p.id !== currentProduct.id)
      .slice(0, 4);

    if (related.length === 0) {
      // If no same category, get random products
      const allProducts = Object.values(PRODUCTS_DB).filter(p => p.id !== currentProduct.id);
      related.push(...allProducts.slice(0, 4));
    }

    container.innerHTML = related.map(product => `
      <div class="product-card card tilt-card">
        <a href="product-detail.html?id=${product.id}">
          <img src="${product.image}" alt="${product.name}" class="rounded-2xl h-48 w-full object-cover mb-4" loading="lazy">
        </a>
        <div class="flex items-center justify-between mb-2">
          <h3 class="font-semibold text-lg dark:text-white">${product.name}</h3>
          <span class="text-purple-600 dark:text-purple-400 font-semibold">${product.price}</span>
        </div>
        <div class="flex items-center justify-between text-sm text-slate-500 dark:text-slate-400 mb-3">
          <span class="px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-700">${product.category}</span>
          <span class="text-amber-500">${this.generateStars(product.rating)}</span>
        </div>
        <a href="product-detail.html?id=${product.id}" class="btn-secondary w-full text-center block">View Details</a>
      </div>
    `).join('');
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // Add to cart button
    const addToCartBtn = document.getElementById('add-to-cart-btn');
    if (addToCartBtn) {
      addToCartBtn.addEventListener('click', () => {
        this.handleAddToCart();
      });
    }

    // View 3D button
    const view3dBtn = document.getElementById('view-3d-btn');
    if (view3dBtn) {
      view3dBtn.addEventListener('click', () => {
        window.location.href = 'index.html#viewer';
      });
    }

    // Size chart modal
    this.setupSizeChartModal();
  }

  /**
   * Handle add to cart
   */
  handleAddToCart() {
    if (!this.selectedSize) {
      this.showSizeError();
      return;
    }

    // Ensure cart manager is initialized
    if (!window.cartManager && typeof CartManager !== 'undefined' && typeof CartUI !== 'undefined') {
      window.cartManager = new CartManager();
      window.cartUI = new CartUI(window.cartManager);
      
      // Sync cart with Firestore if user is logged in
      if (window.AuthManager && window.AuthManager.currentUser && typeof db !== 'undefined' && db) {
        window.cartManager.loadFromFirestore(window.AuthManager.currentUser.uid, db);
      }
    }

    if (!this.currentProduct || !window.cartManager) {
      console.error('Product or cart manager not available');
      return;
    }

    const product = {
      id: this.currentProduct.id,
      name: this.currentProduct.name,
      price: this.currentProduct.price,
      image: this.currentProduct.image,
      category: this.currentProduct.category
    };

    window.cartManager.addItem(product, this.selectedSize, 1);

    // Save to Firestore if user is logged in
    if (window.AuthManager && window.AuthManager.currentUser && db) {
      window.cartManager.saveToFirestore(window.AuthManager.currentUser.uid, db);
    }

    // Show success notification
    if (window.showNotification) {
      window.showNotification('Item added to cart!', 'success');
    } else {
      alert('Item added to cart!');
    }
  }

  /**
   * Show size error
   */
  showSizeError() {
    const errorDiv = document.getElementById('size-error');
    if (errorDiv) {
      errorDiv.classList.remove('hidden');
      setTimeout(() => {
        errorDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 100);
    }
  }

  /**
   * Hide size error
   */
  hideSizeError() {
    const errorDiv = document.getElementById('size-error');
    if (errorDiv) {
      errorDiv.classList.add('hidden');
    }
  }

  /**
   * Show error state
   */
  showError() {
    document.getElementById('loading-state').classList.add('hidden');
    document.getElementById('product-content').classList.add('hidden');
    document.getElementById('error-state').classList.remove('hidden');
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.productDetailManager = new ProductDetailManager();
  });
} else {
  window.productDetailManager = new ProductDetailManager();
}
