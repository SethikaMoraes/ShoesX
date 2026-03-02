import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { ORDER_STATUSES, getOrderById, getUserOrders } from '../lib/firestore';
import { formatCurrency } from '../data/products';

const formatDate = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
};

const getStepIndex = (status) => {
  const normalized = String(status || '').trim().toLowerCase();
  const index = ORDER_STATUSES.findIndex(
    (step) => step.toLowerCase() === normalized,
  );
  return index >= 0 ? index : 0;
};

const OrderTracker = ({ status }) => {
  const activeIndex = getStepIndex(status);

  return (
    <ol className="grid gap-2 sm:grid-cols-5">
      {ORDER_STATUSES.map((step, index) => {
        const reached = index <= activeIndex;
        return (
          <li key={step} className="flex items-center gap-2">
            <span
              className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${
                reached
                  ? 'bg-cyan-600 text-white'
                  : 'bg-slate-200 text-slate-500 dark:bg-slate-800 dark:text-slate-300'
              }`}
            >
              {index + 1}
            </span>
            <span
              className={`text-xs sm:text-sm ${
                reached ? 'text-slate-900 dark:text-slate-100' : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              {step}
            </span>
          </li>
        );
      })}
    </ol>
  );
};

const OrderSummary = ({ order }) => (
  <section className="panel space-y-4">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h2 className="text-xl font-semibold">Order {order.orderId}</h2>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Placed on {formatDate(order.createdAt)}</p>
      </div>
      <span className="rounded-full bg-cyan-100 px-3 py-1 text-xs font-semibold text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-200">
        {order.status}
      </span>
    </div>

    <OrderTracker status={order.status} />

    <div>
      <h3 className="text-sm font-semibold uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400">
        Items
      </h3>
      <ul className="mt-2 space-y-2">
        {order.items.map((item, index) => (
          <li key={`${item.name}-${index}`} className="flex items-center justify-between text-sm">
            <span className="text-slate-700 dark:text-slate-300">
              {item.name} x{Number(item.qty) || 1}
            </span>
            <span className="font-semibold">{formatCurrency(item.price)}</span>
          </li>
        ))}
      </ul>
    </div>

    <div className="border-t border-slate-200 pt-3 dark:border-slate-800">
      <div className="flex items-center justify-between text-sm">
        <span className="text-slate-600 dark:text-slate-300">Total</span>
        <span className="text-base font-semibold">{formatCurrency(order.total)}</span>
      </div>
      <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">Last updated: {formatDate(order.updatedAt)}</p>
    </div>
  </section>
);

export default function OrderStatus() {
  const { user } = useAuth();

  const [searchOrderId, setSearchOrderId] = useState('');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [recentOrders, setRecentOrders] = useState([]);
  const [loadingRecent, setLoadingRecent] = useState(false);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    if (!user?.uid) {
      setRecentOrders([]);
      return () => {
        active = false;
      };
    }

    const load = async () => {
      setLoadingRecent(true);
      try {
        const orders = await getUserOrders(user.uid, user.email || '');
        if (active) {
          setRecentOrders(orders);
          if (!selectedOrder && orders.length > 0) {
            setSelectedOrder(orders[0]);
          }
        }
      } catch {
        if (active) setRecentOrders([]);
      } finally {
        if (active) setLoadingRecent(false);
      }
    };

    load();
    return () => {
      active = false;
    };
  }, [user?.uid]);

  const orderIds = useMemo(() => recentOrders.map((order) => order.orderId), [recentOrders]);

  const handleSearch = async (event) => {
    event.preventDefault();
    setError('');

    const orderId = String(searchOrderId || '').trim();
    if (!orderId) {
      setError('Please enter a valid order ID.');
      return;
    }

    setSearching(true);
    try {
      const order = await getOrderById(orderId, user?.uid || '', user?.email || '');
      if (!order) {
        setError('Order not found. Please check the ID and try again.');
        setSelectedOrder(null);
        return;
      }

      setSelectedOrder(order);
      setSearchOrderId(order.orderId);
    } catch {
      setError('Unable to check order status right now.');
    } finally {
      setSearching(false);
    }
  };

  return (
    <div className="space-y-6">
      <section className="panel bg-gradient-to-r from-slate-900 to-cyan-900 text-white">
        <h1 className="text-3xl font-bold">Order Status</h1>
        <p className="mt-2 max-w-3xl text-sm text-cyan-100">
          Track your delivery progress by entering your order ID or selecting a recent order.
        </p>
      </section>

      <section className="panel space-y-4">
        <h2 className="text-xl font-semibold">Track an Order</h2>

        <form className="flex flex-col gap-2 sm:flex-row" onSubmit={handleSearch}>
          <input
            className="input"
            placeholder="Enter Order ID (example: SX-ABC123)"
            value={searchOrderId}
            onChange={(event) => setSearchOrderId(event.target.value)}
          />
          <button type="submit" className="btn-primary sm:w-auto" disabled={searching}>
            {searching ? 'Checking...' : 'Check Status'}
          </button>
        </form>

        {error ? <p className="text-sm text-rose-600">{error}</p> : null}

        {user?.uid ? (
          <div className="space-y-2">
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Recent orders for {user.email}
            </p>
            {loadingRecent ? (
              <p className="text-sm text-slate-600 dark:text-slate-300">Loading recent orders...</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {orderIds.length === 0 ? (
                  <p className="text-sm text-slate-600 dark:text-slate-300">
                    No recent orders yet.
                  </p>
                ) : (
                  orderIds.map((id) => (
                    <button
                      key={id}
                      type="button"
                      className="btn-secondary"
                      onClick={() => {
                        setSearchOrderId(id);
                        const match = recentOrders.find((order) => order.orderId === id);
                        if (match) setSelectedOrder(match);
                      }}
                    >
                      {id}
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        ) : (
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Login to see your recent orders automatically.
          </p>
        )}
      </section>

      {selectedOrder ? (
        <OrderSummary order={selectedOrder} />
      ) : (
        <section className="panel text-sm text-slate-600 dark:text-slate-300">
          Enter an order ID to view tracking details.
        </section>
      )}
    </div>
  );
}
