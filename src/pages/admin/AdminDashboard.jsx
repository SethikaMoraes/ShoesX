import { Link } from 'react-router-dom';
import { ArrowUpRight, Boxes, Clock3, MessageCircle, ShoppingBag, Wallet } from 'lucide-react';
import { useAdminDashboardData } from '../../hooks/useAdminDashboardData';
import { formatCurrency } from '../../data/products';

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

const todayLabel = new Intl.DateTimeFormat('en-US', {
  month: 'numeric',
  day: 'numeric',
  year: 'numeric',
}).format(new Date());

const getStatusTone = (status) => {
  const text = String(status || '').toLowerCase();
  if (text.includes('delivered')) {
    return 'border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-900/30 dark:text-emerald-300';
  }
  if (text.includes('processing') || text.includes('order placed')) {
    return 'border-cyan-300 bg-cyan-50 text-cyan-700 dark:border-cyan-900 dark:bg-cyan-900/30 dark:text-cyan-300';
  }
  if (text.includes('shipped') || text.includes('out for delivery')) {
    return 'border-cyan-300 bg-cyan-50 text-cyan-700 dark:border-cyan-900 dark:bg-cyan-900/30 dark:text-cyan-300';
  }
  return 'border-slate-300 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200';
};

export default function AdminDashboard() {
  const { stats, recentOrders, openChats, loading, error } = useAdminDashboardData();
  const hasLiveData = !loading && !error;

  const metricItems = [
    { label: 'Total Orders', value: stats.totalOrders, icon: ShoppingBag },
    { label: 'Revenue', value: formatCurrency(stats.revenue), icon: Wallet },
    { label: 'Products', value: stats.productsCount, icon: Boxes },
    { label: 'Open Chats', value: stats.openChats, icon: MessageCircle },
  ];

  return (
    <div className="space-y-6">
      <section className="admin-surface">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-700 dark:text-cyan-300">Administration</p>
            <h1 className="mt-2 text-3xl font-bold leading-tight sm:text-4xl">Dashboard</h1>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              Monitor commerce activity and support operations from one panel.
            </p>
          </div>
          <span className="rounded-full border border-slate-300 bg-white px-3 py-1 text-sm font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
            {todayLabel}
          </span>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metricItems.map((item) => {
          const Icon = item.icon;
          return (
            <article key={item.label} className="admin-surface p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">{item.label}</p>
                <Icon size={17} className="text-cyan-700 dark:text-cyan-300" />
              </div>
              <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-slate-100">
                {hasLiveData ? item.value : '...'}
              </p>
            </article>
          );
        })}
      </section>

      {error ? (
        <section className="admin-surface">
          <p className="text-sm text-rose-600">{error}</p>
        </section>
      ) : null}

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(280px,1fr)]">
        <article className="admin-surface">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-xl font-semibold">Recent Orders</h2>
            <Link to="/admin/orders" className="text-sm font-semibold text-cyan-700 hover:text-cyan-600 dark:text-cyan-300 dark:hover:text-cyan-200">
              View all
            </Link>
          </div>

          {loading ? (
            <p className="text-sm text-slate-600 dark:text-slate-300">Loading recent orders...</p>
          ) : error ? (
            <p className="text-sm text-slate-600 dark:text-slate-300">Recent orders are unavailable right now.</p>
          ) : recentOrders.length === 0 ? (
            <p className="text-sm text-slate-600 dark:text-slate-300">
              No orders yet. New orders will appear here once customers complete checkout.
            </p>
          ) : (
            <>
              <div className="space-y-3 md:hidden">
                {recentOrders.slice(0, 10).map((order) => (
                  <article key={order.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950/60">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <p className="font-semibold text-slate-900 dark:text-slate-100">{order.orderId || order.id}</p>
                      <span className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${getStatusTone(order.status)}`}>
                        {order.status}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{order.userEmail || order.userId || 'Guest'}</p>
                    <div className="mt-2 flex items-center justify-between text-sm">
                      <span className="text-slate-600 dark:text-slate-300">{formatDate(order.createdAt)}</span>
                      <span className="font-semibold text-slate-900 dark:text-slate-100">{formatCurrency(order.total)}</span>
                    </div>
                  </article>
                ))}
              </div>

              <div className="hidden overflow-x-auto md:block">
                <table className="min-w-[760px] text-left text-sm">
                  <thead>
                    <tr className="bg-cyan-700 text-white dark:bg-cyan-600 dark:text-white">
                      <th className="px-3 py-2 font-semibold">Order ID</th>
                      <th className="px-3 py-2 font-semibold">Customer</th>
                      <th className="px-3 py-2 font-semibold">Date</th>
                      <th className="px-3 py-2 font-semibold">Status</th>
                      <th className="px-3 py-2 font-semibold">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentOrders.slice(0, 10).map((order) => (
                      <tr key={order.id} className="border-b border-slate-100 text-slate-700 dark:border-slate-800 dark:text-slate-200">
                        <td className="px-3 py-2 font-semibold">{order.orderId || order.id}</td>
                        <td className="px-3 py-2">{order.userEmail || order.userId || 'Guest'}</td>
                        <td className="px-3 py-2">{formatDate(order.createdAt)}</td>
                        <td className="px-3 py-2">
                          <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold ${getStatusTone(order.status)}`}>
                            {order.status}
                          </span>
                        </td>
                        <td className="px-3 py-2 font-semibold">{formatCurrency(order.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </article>

        <div className="space-y-6">
          <aside className="admin-surface space-y-4">
            <div>
              <h2 className="text-xl font-semibold">Summary</h2>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                Current order flow and support queue health.
              </p>
            </div>

            <dl className="space-y-2">
              <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-800 dark:bg-slate-950/60">
                <dt className="text-slate-600 dark:text-slate-300">Pending Orders</dt>
                <dd className="font-semibold text-slate-900 dark:text-slate-100">{hasLiveData ? stats.pendingOrders : '...'}</dd>
              </div>
              <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-800 dark:bg-slate-950/60">
                <dt className="text-slate-600 dark:text-slate-300">Open Chats</dt>
                <dd className="font-semibold text-slate-900 dark:text-slate-100">{hasLiveData ? stats.openChats : '...'}</dd>
              </div>
              <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-800 dark:bg-slate-950/60">
                <dt className="text-slate-600 dark:text-slate-300">Average Order Value</dt>
                <dd className="font-semibold text-slate-900 dark:text-slate-100">
                  {!hasLiveData
                    ? '...'
                    : stats.totalOrders > 0
                      ? formatCurrency(stats.revenue / stats.totalOrders)
                      : formatCurrency(0)}
                </dd>
              </div>
            </dl>

            <div className="grid gap-2">
              <Link to="/admin/orders" className="admin-btn-secondary justify-between">
                Manage Orders
                <ArrowUpRight size={14} />
              </Link>
              <Link to="/admin/products" className="admin-btn-secondary justify-between">
                Manage Products
                <ArrowUpRight size={14} />
              </Link>
              <Link to="/admin/chat" className="admin-btn-secondary justify-between">
                Open Live Chat
                <ArrowUpRight size={14} />
              </Link>
            </div>
          </aside>

          <article className="admin-surface">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-xl font-semibold">Open Chat Queue</h2>
              <Link to="/admin/chat" className="text-sm font-semibold text-cyan-700 hover:text-cyan-600 dark:text-cyan-300 dark:hover:text-cyan-200">
                Open chat
              </Link>
            </div>

            {loading ? (
              <p className="text-sm text-slate-600 dark:text-slate-300">Loading chat queue...</p>
            ) : error ? (
              <p className="text-sm text-slate-600 dark:text-slate-300">Chat queue is unavailable right now.</p>
            ) : openChats.length === 0 ? (
              <p className="text-sm text-slate-600 dark:text-slate-300">
                No open chats. New support requests will appear automatically.
              </p>
            ) : (
              <ul className="space-y-3">
                {openChats.slice(0, 5).map((chat) => (
                  <li key={chat.id} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-800 dark:bg-slate-950/60">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
                        {chat.userEmail || chat.userId || 'Guest'}
                      </p>
                      <span className="inline-flex items-center gap-1 rounded-full border border-cyan-300 bg-cyan-50 px-2 py-0.5 text-xs font-semibold text-cyan-700 dark:border-cyan-900 dark:bg-cyan-900/30 dark:text-cyan-300">
                        <Clock3 size={12} />
                        open
                      </span>
                    </div>
                    <p className="mt-1 truncate text-sm text-slate-600 dark:text-slate-300">
                      {chat.lastMessage || 'No message preview available.'}
                    </p>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{formatDate(chat.updatedAt)}</p>
                  </li>
                ))}
              </ul>
            )}
          </article>
        </div>
      </section>
    </div>
  );
}
