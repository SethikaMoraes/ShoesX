/**
 * Shopping Cart Manager
 * Handles cart operations, persistence, and Firestore sync
 */

class CartManager {
  constructor() {
    this.items = this.loadFromStorage();
    this.listeners = [];
  }

  /**
   * Add item to cart
   * @param {Object} product - Product object
   * @param {string} size - Selected size
   * @param {number} quantity - Quantity to add
   */
  addItem(product, size, quantity = 1) {
    if (!product || !size) {
      throw new Error('Product and size are required');
    }

    const existingIndex = this.items.findIndex(
      item => item.productId === product.id && item.size === size
    );

    if (existingIndex > -1) {
      // Update quantity if item already exists
      this.items[existingIndex].quantity += quantity;
    } else {
      // Add new item
      this.items.push({
        productId: product.id,
        productName: product.name,
        productImage: product.image,
        price: parseFloat(product.price.replace('$', '')),
        size: size,
        quantity: quantity,
        category: product.category,
        addedAt: new Date().toISOString()
      });
    }

    this.saveToStorage();
    this.notifyListeners();
    return this.items;
  }

  /**
   * Remove item from cart
   * @param {string} productId - Product ID
   * @param {string} size - Size to remove
   */
  removeItem(productId, size) {
    this.items = this.items.filter(
      item => !(item.productId === productId && item.size === size)
    );
    this.saveToStorage();
    this.notifyListeners();
    return this.items;
  }

  /**
   * Update item quantity
   * @param {string} productId - Product ID
   * @param {string} size - Size
   * @param {number} quantity - New quantity
   */
  updateQuantity(productId, size, quantity) {
    if (quantity <= 0) {
      return this.removeItem(productId, size);
    }

    const item = this.items.find(
      item => item.productId === productId && item.size === size
    );

    if (item) {
      item.quantity = quantity;
      this.saveToStorage();
      this.notifyListeners();
    }

    return this.items;
  }

  /**
   * Get cart total
   * @returns {number} Total price
   */
  getTotal() {
    return this.items.reduce((total, item) => {
      return total + (item.price * item.quantity);
    }, 0);
  }

  /**
   * Get item count
   * @returns {number} Total items in cart
   */
  getItemCount() {
    return this.items.reduce((count, item) => count + item.quantity, 0);
  }

  /**
   * Clear cart
   */
  clear() {
    this.items = [];
    this.saveToStorage();
    this.notifyListeners();
  }

  /**
   * Save cart to localStorage
   */
  saveToStorage() {
    try {
      localStorage.setItem('shoesx_cart', JSON.stringify(this.items));
    } catch (e) {
      console.error('Failed to save cart to storage:', e);
    }
  }

  /**
   * Load cart from localStorage
   * @returns {Array} Cart items
   */
  loadFromStorage() {
    try {
      const stored = localStorage.getItem('shoesx_cart');
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      console.error('Failed to load cart from storage:', e);
      return [];
    }
  }

  /**
   * Save cart to Firestore (for logged-in users)
   * @param {string} userId - User ID
   * @param {Object} db - Firestore instance
   */
  async saveToFirestore(userId, db) {
    if (!userId || !db) return;

    try {
      await db.collection('users').doc(userId).set({
        cart: this.items,
        cartUpdatedAt: firebase.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
    } catch (error) {
      console.error('Failed to save cart to Firestore:', error);
    }
  }

  /**
   * Load cart from Firestore
   * @param {string} userId - User ID
   * @param {Object} db - Firestore instance
   */
  async loadFromFirestore(userId, db) {
    if (!userId || !db) return;

    try {
      const userDoc = await db.collection('users').doc(userId).get();
      if (userDoc.exists && userDoc.data().cart) {
        this.items = userDoc.data().cart;
        this.saveToStorage();
        this.notifyListeners();
      }
    } catch (error) {
      console.error('Failed to load cart from Firestore:', error);
    }
  }

  /**
   * Subscribe to cart changes
   * @param {Function} callback - Callback function
   */
  subscribe(callback) {
    this.listeners.push(callback);
    // Immediately call with current state
    callback(this.items, this.getTotal(), this.getItemCount());
  }

  /**
   * Notify all listeners of cart changes
   */
  notifyListeners() {
    this.listeners.forEach(callback => {
      callback(this.items, this.getTotal(), this.getItemCount());
    });
  }
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CartManager;
}

// Global instance
window.CartManager = CartManager;

