/**
 * Cart UI Manager
 * Handles cart UI rendering and interactions
 */

class CartUI {
  constructor(cartManager) {
    this.cart = cartManager;
    this.isOpen = false;
    this.init();
  }

  init() {
    this.createCartIcon();
    this.createCartSidebar();
    this.setupEventListeners();
    
    // Subscribe to cart changes
    this.cart.subscribe((items, total, count) => {
      this.updateCartIcon(count);
      this.updateCartSidebar(items, total);
    });
  }

  /**
   * Create cart icon in navbar
   */
  createCartIcon() {
    const navbar = document.querySelector('header nav');
    if (!navbar) return;

    const rightSide = navbar.querySelector('.hidden.lg\\:flex.items-center.gap-3');
    if (!rightSide) return;

    // Check if cart icon already exists
    if (document.getElementById('cart-icon')) return;

    const cartIcon = document.createElement('button');
    cartIcon.id = 'cart-icon';
    cartIcon.className = 'relative w-11 h-11 rounded-full bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border border-slate-200/50 dark:border-slate-700/50 flex items-center justify-center shadow-md hover:bg-white dark:hover:bg-slate-700 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 transition-all';
    cartIcon.setAttribute('aria-label', 'Open shopping cart');
    cartIcon.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-slate-700 dark:text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
      <span id="cart-count" class="absolute -top-1 -right-1 bg-purple-600 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center hidden">0</span>
    `;

    // Insert before theme toggle
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
      rightSide.insertBefore(cartIcon, themeToggle);
    } else {
      rightSide.appendChild(cartIcon);
    }
  }

  /**
   * Create cart sidebar
   */
  createCartSidebar() {
    const sidebar = document.createElement('div');
    sidebar.id = 'cart-sidebar';
    sidebar.className = 'fixed top-0 right-0 h-full w-full md:w-96 bg-white dark:bg-slate-800 shadow-2xl z-50 transform translate-x-full transition-transform duration-300 ease-in-out';
    sidebar.setAttribute('aria-label', 'Shopping cart');
    sidebar.innerHTML = `
      <div class="flex flex-col h-full">
        <!-- Header -->
        <div class="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
          <h2 class="text-xl font-bold dark:text-white">Shopping Cart</h2>
          <button id="close-cart" class="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center hover:bg-slate-200 dark:hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-purple-500" aria-label="Close cart">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-slate-700 dark:text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div class="cart-hero px-6 py-5 space-y-4">
          <div class="cart-hero-grid">
            <div class="cart-metric">
              <p class="label text-slate-600 dark:text-slate-400">Items</p>
              <p class="value text-slate-900 dark:text-white" id="cart-metric-items">00</p>
            </div>
            <div class="cart-metric">
              <p class="label text-slate-600 dark:text-slate-400">Fit confidence</p>
              <p class="value text-slate-900 dark:text-white" id="cart-metric-fit">90%</p>
            </div>
            <div class="cart-metric">
              <p class="label text-slate-600 dark:text-slate-400">Cart total</p>
              <p class="value text-slate-900 dark:text-white" id="cart-metric-cost">$0</p>
            </div>
            <div class="cart-metric">
              <p class="label text-slate-600 dark:text-slate-400">Categories</p>
              <p class="value text-slate-900 dark:text-white" id="cart-metric-categories">0</p>
            </div>
          </div>
          <div class="flex flex-wrap gap-2">
            <span class="cart-pill text-blue-700 dark:text-blue-300" id="cart-shipping-pill">Add $200 for free express shipping</span>
            <span class="cart-pill text-blue-700 dark:text-blue-300">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-sky-500 dark:text-sky-400" viewBox="0 0 20 20" fill="currentColor"><path d="M10 18a8 8 0 100-16 8 8 0 000 16zm.75-11.5a.75.75 0 00-1.5 0v4.25c0 .414.336.75.75.75h2.5a.75.75 0 000-1.5h-1.75V6.5z"/></svg>
              Fit sync active
            </span>
          </div>
        </div>

        <!-- Cart Items -->
        <div id="cart-items" class="flex-1 overflow-y-auto p-6 space-y-4">
          <div id="cart-empty" class="text-center py-12">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-16 w-16 mx-auto text-slate-300 dark:text-slate-600 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <p class="text-slate-500 dark:text-slate-400">Your cart is empty</p>
          </div>
        </div>

        <!-- Footer -->
        <div class="border-t border-slate-200 dark:border-slate-700 p-6 space-y-4">
          <div class="flex justify-between items-center">
            <span class="text-lg font-semibold dark:text-white">Total:</span>
            <span id="cart-total" class="text-xl font-bold text-purple-600 dark:text-purple-400">$0.00</span>
          </div>
          <button id="checkout-btn" class="btn-primary w-full py-3 disabled:opacity-50 disabled:cursor-not-allowed" disabled>
            Proceed to Checkout
          </button>
          <button id="continue-shopping" class="btn-secondary w-full py-3">
            Continue Shopping
          </button>
        </div>
      </div>
    `;

    // Overlay
    const overlay = document.createElement('div');
    overlay.id = 'cart-overlay';
    overlay.className = 'fixed inset-0 bg-black/50 z-40 hidden';
    overlay.setAttribute('aria-hidden', 'true');

    document.body.appendChild(overlay);
    document.body.appendChild(sidebar);
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // Open cart
    const cartIcon = document.getElementById('cart-icon');
    if (cartIcon) {
      cartIcon.addEventListener('click', () => this.openCart());
    }

    // Close cart
    const closeBtn = document.getElementById('close-cart');
    const overlay = document.getElementById('cart-overlay');
    const continueBtn = document.getElementById('continue-shopping');

    if (closeBtn) closeBtn.addEventListener('click', () => this.closeCart());
    if (overlay) overlay.addEventListener('click', () => this.closeCart());
    if (continueBtn) continueBtn.addEventListener('click', () => this.closeCart());

    // Close on Escape
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isOpen) {
        this.closeCart();
      }
    });
  }

  /**
   * Open cart sidebar
   */
  openCart() {
    this.isOpen = true;
    const sidebar = document.getElementById('cart-sidebar');
    const overlay = document.getElementById('cart-overlay');
    
    if (sidebar) {
      sidebar.classList.remove('translate-x-full');
      document.body.style.overflow = 'hidden';
    }
    if (overlay) {
      overlay.classList.remove('hidden');
    }
  }

  /**
   * Close cart sidebar
   */
  closeCart() {
    this.isOpen = false;
    const sidebar = document.getElementById('cart-sidebar');
    const overlay = document.getElementById('cart-overlay');
    
    if (sidebar) {
      sidebar.classList.add('translate-x-full');
      document.body.style.overflow = '';
    }
    if (overlay) {
      overlay.classList.add('hidden');
    }
  }

  /**
   * Update cart icon badge
   */
  updateCartIcon(count) {
    const badge = document.getElementById('cart-count');
    if (badge) {
      if (count > 0) {
        badge.textContent = count > 99 ? '99+' : count;
        badge.classList.remove('hidden');
      } else {
        badge.classList.add('hidden');
      }
    }
  }

  /**
   * Update cart sidebar content
   */
  updateCartSidebar(items, total) {
    const itemsContainer = document.getElementById('cart-items');
    const emptyState = document.getElementById('cart-empty');
    const totalElement = document.getElementById('cart-total');
    const checkoutBtn = document.getElementById('checkout-btn');
    const metricItems = document.getElementById('cart-metric-items');
    const metricFit = document.getElementById('cart-metric-fit');
    const metricCost = document.getElementById('cart-metric-cost');
    const metricCategories = document.getElementById('cart-metric-categories');
    const shippingPill = document.getElementById('cart-shipping-pill');

    if (!itemsContainer) return;

    // Update total
    if (totalElement) {
      totalElement.textContent = `$${total.toFixed(2)}`;
    }

    const itemCount = this.cart.getItemCount();
    const uniqueCategories = new Set(items.map(item => item.category)).size;
    const fitConfidence = items.length ? Math.min(99, 88 + Math.min(itemCount * 2, 8) + Math.min(uniqueCategories, 3)) : 90;

    if (metricItems) metricItems.textContent = String(itemCount).padStart(2, '0');
    if (metricFit) metricFit.textContent = `${fitConfidence}%`;
    if (metricCost) metricCost.textContent = `$${total.toFixed(0)}`;
    if (metricCategories) metricCategories.textContent = uniqueCategories.toString();

    if (shippingPill) {
      const threshold = 200;
      if (total >= threshold) {
        shippingPill.textContent = 'Free express shipping unlocked';
      } else {
        shippingPill.textContent = `Add $${Math.max(0, threshold - total).toFixed(0)} for free express shipping`;
      }
    }

    // Enable/disable checkout
    if (checkoutBtn) {
      checkoutBtn.disabled = items.length === 0;
    }

    // Clear existing items
    itemsContainer.innerHTML = '';

    if (items.length === 0) {
      // Show empty state
      if (emptyState) {
        itemsContainer.appendChild(emptyState);
      }
      return;
    }

    // Render items
    items.forEach(item => {
      const itemElement = this.createCartItemElement(item);
      itemsContainer.appendChild(itemElement);
    });
  }

  /**
   * Create cart item element
   */
  createCartItemElement(item) {
    const div = document.createElement('div');
    div.className = 'flex gap-4 p-4 bg-slate-50 dark:bg-slate-700 rounded-xl';
    div.innerHTML = `
      <img src="${item.productImage}" alt="${item.productName}" class="w-20 h-20 object-cover rounded-lg">
      <div class="flex-1">
        <h3 class="font-semibold text-sm dark:text-white">${item.productName}</h3>
        <p class="text-xs text-slate-500 dark:text-slate-400">Size: ${item.size}</p>
        <p class="text-sm font-semibold text-purple-600 dark:text-purple-400 mt-1">$${item.price.toFixed(2)}</p>
        <div class="flex items-center gap-2 mt-2">
          <button class="quantity-btn" data-action="decrease" data-product="${item.productId}" data-size="${item.size}" aria-label="Decrease quantity">-</button>
          <span class="quantity-display w-8 text-center text-sm font-medium dark:text-white">${item.quantity}</span>
          <button class="quantity-btn" data-action="increase" data-product="${item.productId}" data-size="${item.size}" aria-label="Increase quantity">+</button>
          <button class="remove-btn ml-auto text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 text-sm font-medium" data-product="${item.productId}" data-size="${item.size}" aria-label="Remove item">Remove</button>
        </div>
      </div>
    `;

    // Add event listeners
    const decreaseBtn = div.querySelector('[data-action="decrease"]');
    const increaseBtn = div.querySelector('[data-action="increase"]');
    const removeBtn = div.querySelector('.remove-btn');

    decreaseBtn?.addEventListener('click', () => {
      this.cart.updateQuantity(item.productId, item.size, item.quantity - 1);
    });

    increaseBtn?.addEventListener('click', () => {
      this.cart.updateQuantity(item.productId, item.size, item.quantity + 1);
    });

    removeBtn?.addEventListener('click', () => {
      this.cart.removeItem(item.productId, item.size);
    });

    return div;
  }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CartUI;
}

window.CartUI = CartUI;

