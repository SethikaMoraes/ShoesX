# Shopping Cart Integration Guide

This guide shows how to integrate the shopping cart system into your existing ShoesX application.

## Step 1: Add Script Tags

Add these script tags to your `index.html` before the closing `</body>` tag, after `app.js`:

```html
<script src="js/cart.js"></script>
<script src="js/cart-ui.js"></script>
```

## Step 2: Initialize Cart in app.js

Add this code to your `app.js` file, in the `init()` function (around line 440):

```javascript
// Initialize Cart System
let cartManager, cartUI;
if (typeof CartManager !== 'undefined') {
  cartManager = new CartManager();
  cartUI = new CartUI(cartManager);
  
  // Sync cart with Firestore if user is logged in
  if (AuthManager.currentUser && db) {
    cartManager.loadFromFirestore(AuthManager.currentUser.uid, db);
  }
}
```

## Step 3: Update "Add to Cart" Buttons

Find all "Add to Cart" buttons in your `index.html` (around line 219, 234, etc.) and update them:

**Before:**
```html
<button class="btn-primary flex-1">Add to Cart</button>
```

**After:**
```html
<button class="btn-primary flex-1 add-to-cart" 
        data-product-id="product-1"
        data-product-name="AeroFlex Runner"
        data-product-price="$149"
        data-product-image="https://images.unsplash.com/photo-1528701800489-20be9c1e74bb?auto=format&fit=crop&w=900&q=60"
        data-product-category="Running">
  Add to Cart
</button>
```

## Step 4: Add Size Selection Modal

When user clicks "Add to Cart", show a size selection modal. Add this to `index.html` before closing `</body>`:

```html
<!-- Size Selection Modal -->
<div id="size-modal" class="fixed inset-0 bg-black/50 hidden items-center justify-center z-50" role="dialog" aria-modal="true">
  <div class="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl max-w-md w-full mx-4 p-6">
    <h3 class="text-xl font-semibold mb-4 dark:text-white">Select Size</h3>
    <div id="size-options" class="grid grid-cols-4 gap-2 mb-4">
      <!-- Sizes will be populated dynamically -->
    </div>
    <div class="flex gap-3">
      <button id="size-modal-cancel" class="btn-secondary flex-1">Cancel</button>
      <button id="size-modal-add" class="btn-primary flex-1" disabled>Add to Cart</button>
    </div>
  </div>
</div>
```

## Step 5: Add Event Listeners for Add to Cart

Add this to your `app.js` in the `init()` function:

```javascript
// Handle Add to Cart clicks
let currentProduct = null;
document.querySelectorAll('.add-to-cart').forEach(btn => {
  btn.addEventListener('click', () => {
    currentProduct = {
      id: btn.dataset.productId,
      name: btn.dataset.productName,
      price: btn.dataset.productPrice,
      image: btn.dataset.productImage,
      category: btn.dataset.productCategory
    };
    
    // Show size selection modal
    showSizeModal();
  });
});

function showSizeModal() {
  const modal = document.getElementById('size-modal');
  const sizeOptions = document.getElementById('size-options');
  const addBtn = document.getElementById('size-modal-add');
  
  if (!modal || !sizeOptions) return;
  
  // Generate size options (UK 5-12)
  sizeOptions.innerHTML = '';
  for (let size = 5; size <= 12; size++) {
    const btn = document.createElement('button');
    btn.className = 'px-4 py-2 border-2 border-slate-200 dark:border-slate-700 rounded-lg hover:border-purple-500 dark:hover:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500';
    btn.textContent = `UK ${size}`;
    btn.dataset.size = `UK ${size}`;
    btn.addEventListener('click', () => {
      // Remove selected class from all
      sizeOptions.querySelectorAll('button').forEach(b => {
        b.classList.remove('border-purple-600', 'bg-purple-50', 'dark:bg-purple-900/20');
      });
      // Add to clicked
      btn.classList.add('border-purple-600', 'bg-purple-50', 'dark:bg-purple-900/20');
      addBtn.disabled = false;
      addBtn.dataset.selectedSize = btn.dataset.size;
    });
    sizeOptions.appendChild(btn);
  }
  
  modal.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}

// Size modal event listeners
document.getElementById('size-modal-cancel')?.addEventListener('click', () => {
  document.getElementById('size-modal')?.classList.add('hidden');
  document.body.style.overflow = '';
});

document.getElementById('size-modal-add')?.addEventListener('click', () => {
  const selectedSize = document.getElementById('size-modal-add')?.dataset.selectedSize;
  if (currentProduct && selectedSize && cartManager) {
    cartManager.addItem(currentProduct, selectedSize, 1);
    document.getElementById('size-modal')?.classList.add('hidden');
    document.body.style.overflow = '';
    
    // Show success notification
    showNotification('Item added to cart!', 'success');
  }
});

// Close modal on overlay click
document.getElementById('size-modal')?.addEventListener('click', (e) => {
  if (e.target.id === 'size-modal') {
    document.getElementById('size-modal')?.classList.add('hidden');
    document.body.style.overflow = '';
  }
});
```

## Step 6: Add Notification System (Optional but Recommended)

Add this simple notification function to `app.js`:

```javascript
function showNotification(message, type = 'info') {
  const notification = document.createElement('div');
  notification.className = `fixed top-24 right-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg p-4 z-50 transform translate-x-full transition-transform duration-300`;
  notification.innerHTML = `
    <div class="flex items-center gap-3">
      <span class="text-sm font-medium dark:text-white">${message}</span>
      <button class="text-slate-400 hover:text-slate-600" onclick="this.parentElement.parentElement.remove()">×</button>
    </div>
  `;
  document.body.appendChild(notification);
  
  // Animate in
  setTimeout(() => {
    notification.classList.remove('translate-x-full');
  }, 10);
  
  // Auto remove after 3 seconds
  setTimeout(() => {
    notification.classList.add('translate-x-full');
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}
```

## Step 7: Sync Cart with Firestore on Auth State Change

Update your `AuthManager.updateUI` function to sync cart:

```javascript
updateUI(user) {
  // ... existing code ...
  
  if (user) {
    // User is signed in - load cart from Firestore
    if (cartManager && db) {
      cartManager.loadFromFirestore(user.uid, db);
    }
  } else {
    // User signed out - save cart to localStorage only
    if (cartManager) {
      cartManager.saveToStorage();
    }
  }
}
```

## Step 8: Add Checkout Button Handler

Add this to handle checkout (you'll need to create checkout.html later):

```javascript
document.getElementById('checkout-btn')?.addEventListener('click', () => {
  if (cartManager.items.length === 0) return;
  
  // Redirect to checkout page (create this later)
  window.location.href = 'checkout.html';
  // Or show checkout modal
});
```

## Testing

1. Open your website
2. Click "Add to Cart" on any product
3. Select a size
4. Verify item appears in cart (click cart icon)
5. Test quantity increase/decrease
6. Test remove item
7. Verify cart persists after page refresh

## Next Steps

- Create `checkout.html` for the checkout flow
- Integrate with payment system (Stripe/PayPal)
- Add order management
- Implement cart persistence across devices (Firestore)

## Troubleshooting

**Cart icon not showing?**
- Check that `cart.js` and `cart-ui.js` are loaded
- Verify CartManager and CartUI are defined (check console)

**Items not adding?**
- Check browser console for errors
- Verify product data attributes are set correctly
- Ensure cartManager is initialized

**Cart not persisting?**
- Check localStorage in browser DevTools
- Verify Firestore sync if user is logged in

