import { useState } from 'react';
import { Link } from 'react-router-dom';
import { formatCurrency, PRODUCT_IMAGE_PLACEHOLDER } from '../data/products';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { createOrder } from '../lib/firestore';

export default function CartSidebar({ open, onClose }) {
  const { cartItems, cartCount, updateQty, removeFromCart, getCartTotal, clearCart } = useCart();
  const { user } = useAuth();
  const [checkoutPending, setCheckoutPending] = useState(false);
  const [checkoutError, setCheckoutError] = useState('');
  const [checkoutSuccess, setCheckoutSuccess] = useState('');
  const total = getCartTotal();

  const handleCheckout = async () => {
    setCheckoutError('');
    setCheckoutSuccess('');

    if (cartItems.length === 0) return;

    setCheckoutPending(true);
    try {
      const order = await createOrder({
        userId: user?.uid || '',
        userEmail: user?.email || '',
        items: cartItems.map((item) => ({
          name: item.product?.name || item.productId,
          qty: item.qty,
          price: item.unitPrice,
        })),
        total,
      });

      clearCart();
      setCheckoutSuccess(`Order ${order.orderId} has been placed successfully.`);
    } catch (error) {
      setCheckoutError(error.message || 'Unable to complete checkout at this time.');
    } finally {
      setCheckoutPending(false);
    }
  };

  return (
    <>
      <div
        className={`fixed inset-0 z-40 bg-slate-950/50 transition ${
          open ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
        }`}
        onClick={onClose}
        aria-hidden="true"
      />
      <aside
        className={`fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col border-l border-slate-200 bg-white shadow-2xl transition duration-300 dark:border-slate-800 dark:bg-slate-950 ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
        aria-label="Cart sidebar"
      >
        <div className="flex items-center justify-between border-b border-slate-200 p-4 dark:border-slate-800">
          <h2 className="text-lg font-semibold">Cart ({cartCount})</h2>
          <button type="button" onClick={onClose} className="btn-secondary px-3 py-2">
            Close
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto p-4">
          {cartItems.length === 0 ? (
            <div className="panel text-center">
              <p className="text-sm text-slate-600 dark:text-slate-300">
                Your cart is currently empty. Add products to continue checkout.
              </p>
              <Link to="/products" className="btn-primary mt-4 inline-flex" onClick={onClose}>
                Browse products
              </Link>
            </div>
          ) : (
            cartItems.map((item) => (
              <article key={item.id} className="rounded-2xl border border-slate-200 p-3 dark:border-slate-800">
                <div className="flex gap-3">
                  <img
                    src={item.product?.image || item.product?.cardImage || PRODUCT_IMAGE_PLACEHOLDER}
                    alt={item.product?.name || item.productId}
                    className="h-20 w-20 rounded-xl object-cover"
                    onError={(event) => {
                      if (event.currentTarget.src.endsWith(PRODUCT_IMAGE_PLACEHOLDER)) return;
                      event.currentTarget.src = PRODUCT_IMAGE_PLACEHOLDER;
                    }}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{item.product?.name || item.productId}</p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Size {item.size}</p>
                    <p className="text-sm font-medium text-cyan-600 dark:text-cyan-300">
                      {formatCurrency(item.unitPrice)}
                    </p>

                    <div className="mt-2 flex items-center gap-2">
                      <button
                        type="button"
                        className="btn-secondary h-8 w-8 px-0"
                        onClick={() => updateQty(item.id, item.qty - 1)}
                      >
                        -
                      </button>
                      <span className="w-8 text-center text-sm">{item.qty}</span>
                      <button
                        type="button"
                        className="btn-secondary h-8 w-8 px-0"
                        onClick={() => updateQty(item.id, item.qty + 1)}
                      >
                        +
                      </button>
                      <button
                        type="button"
                        className="ml-auto text-sm font-medium text-rose-600 hover:text-rose-500"
                        onClick={() => removeFromCart(item.id)}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              </article>
            ))
          )}
        </div>

        <div className="space-y-3 border-t border-slate-200 p-4 dark:border-slate-800">
          {checkoutSuccess ? <p className="text-sm text-emerald-600">{checkoutSuccess}</p> : null}
          {checkoutError ? <p className="text-sm text-rose-600">{checkoutError}</p> : null}
          <div className="flex items-center justify-between text-sm text-slate-600 dark:text-slate-300">
            <span>Total</span>
            <span className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              {formatCurrency(total)}
            </span>
          </div>
          <button
            type="button"
            className="btn-primary w-full"
            disabled={cartItems.length === 0 || checkoutPending}
            onClick={handleCheckout}
          >
            {checkoutPending ? 'Processing...' : 'Checkout'}
          </button>
          <button type="button" className="btn-secondary w-full" onClick={clearCart} disabled={cartItems.length === 0}>
            Clear Cart
          </button>
          <Link to="/order-status" className="btn-secondary w-full text-center" onClick={onClose}>
            View order status
          </Link>
        </div>
      </aside>
    </>
  );
}
