import { useCallback, useEffect, useState } from 'react';
import {
  ADMIN_CUSTOM_ORDER_STATUS_OPTIONS,
  ADMIN_ORDER_STATUS_OPTIONS,
  getAdminInquiries,
  getAdminStats,
  getRecentOrders,
  replyToInquiry,
  subscribeAdminRealtime,
  updateOrderStatus,
} from '../../lib/adminData';
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

export default function AdminOrders() {
  const [orders, setOrders] = useState([]);
  const [inquiries, setInquiries] = useState([]);
  const [totalOrders, setTotalOrders] = useState(0);
  const [inquiryFilter, setInquiryFilter] = useState('all');
  const [activeTab, setActiveTab] = useState('orders');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updatingOrderId, setUpdatingOrderId] = useState('');
  const [savingInquiryKey, setSavingInquiryKey] = useState('');
  const [replyDrafts, setReplyDrafts] = useState({});
  const [statusDrafts, setStatusDrafts] = useState({});

  const inquiryKey = (item) => `${item.inquiryType}:${item.id}`;

  const getInquiryTypeLabel = (type) => {
    if (type === 'custom_order') return 'Custom Order';
    if (type === 'feedback') return 'Feedback';
    return 'Contact';
  };

  const getInquiryStatusLabel = (inquiry) => {
    const status = String(inquiry?.status || '').trim();
    if (!status) return 'new';
    return status.replace(/_/g, ' ');
  };

  const getInquiryStatusClass = (inquiry) => {
    const status = String(inquiry?.status || '').trim().toLowerCase();
    if (status === 'approved' || status === 'replied') {
      return 'border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-900/30 dark:text-emerald-300';
    }
    if (status === 'in_review' || status === 'processing' || status === 'new' || status === 'pending') {
      return 'border-cyan-300 bg-cyan-50 text-cyan-700 dark:border-cyan-900 dark:bg-cyan-900/30 dark:text-cyan-300';
    }
    if (status === 'rejected' || status === 'closed') {
      return 'border-rose-300 bg-rose-50 text-rose-700 dark:border-rose-900 dark:bg-rose-900/30 dark:text-rose-300';
    }
    return 'border-slate-300 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200';
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [nextOrders, nextInquiries, stats] = await Promise.all([
        getRecentOrders(100),
        getAdminInquiries(200),
        getAdminStats(),
      ]);
      setOrders(nextOrders);
      setInquiries(nextInquiries);
      setTotalOrders(Number(stats?.totalOrders || 0));
    } catch (loadError) {
      const message = String(loadError?.message || '').trim();
      setError(message || 'Unable to load orders and inquiries.');
      setInquiries([]);
      setTotalOrders(0);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    const unsubscribe = subscribeAdminRealtime(
      () => loadData(),
      (subscribeError) => {
        const message = String(subscribeError?.message || '').trim();
        setError(message || 'Realtime admin updates are unavailable.');
      },
    );
    return () => unsubscribe();
  }, [loadData]);

  const handleStatusChange = async (order, nextStatus) => {
    if (!order?.id) return;
    setUpdatingOrderId(order.id);
    setError('');
    try {
      await updateOrderStatus(order.id, nextStatus);
      await loadData();
    } catch (updateError) {
      const message = String(updateError?.message || '').trim();
      setError(message || 'Unable to update order status.');
    } finally {
      setUpdatingOrderId('');
    }
  };

  const handleReplyChange = (inquiry, value) => {
    const key = inquiryKey(inquiry);
    setReplyDrafts((current) => ({ ...current, [key]: value }));
  };

  const handleInquiryStatusChange = (inquiry, value) => {
    const key = inquiryKey(inquiry);
    setStatusDrafts((current) => ({ ...current, [key]: value }));
  };

  const handleReplySubmit = async (inquiry) => {
    if (!inquiry?.id || !inquiry?.inquiryType) return;

    const key = inquiryKey(inquiry);
    const reply = String(replyDrafts[key] ?? inquiry.adminReply ?? '').trim();
    if (!reply) {
      setError('Reply message cannot be empty.');
      return;
    }

    const nextStatus =
      inquiry.inquiryType === 'custom_order'
        ? String(statusDrafts[key] || inquiry.status || 'pending').toLowerCase()
        : '';

    setSavingInquiryKey(key);
    setError('');
    try {
      const updatedInquiry = await replyToInquiry({
        inquiryType: inquiry.inquiryType,
        inquiryId: inquiry.id,
        reply,
        status: nextStatus,
      });
      setInquiries((current) =>
        current.map((item) =>
          item.id === updatedInquiry.id && item.inquiryType === updatedInquiry.inquiryType ? updatedInquiry : item,
        ),
      );
      setReplyDrafts((current) => ({ ...current, [key]: updatedInquiry.adminReply || reply }));
      if (updatedInquiry.inquiryType === 'custom_order') {
        setStatusDrafts((current) => ({ ...current, [key]: updatedInquiry.status || nextStatus }));
      }
    } catch (replyError) {
      const message = String(replyError?.message || '').trim();
      setError(message || 'Unable to send inquiry reply.');
    } finally {
      setSavingInquiryKey('');
    }
  };

  const filteredInquiries =
    inquiryFilter === 'all'
      ? inquiries
      : inquiries.filter((item) => String(item.inquiryType || '').toLowerCase() === inquiryFilter);

  return (
    <div className="space-y-6">
      <section className="panel">
        <h1 className="text-2xl font-bold sm:text-3xl">Orders & Inquiries</h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
          Review all incoming orders and reply to customer inquiries from one admin view.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <article className="panel p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Total Orders</p>
          <p className="mt-2 text-3xl font-bold text-slate-900 dark:text-slate-100">
            {loading ? '...' : totalOrders}
          </p>
        </article>
        <article className="panel p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Total Inquiries</p>
          <p className="mt-2 text-3xl font-bold text-slate-900 dark:text-slate-100">
            {loading ? '...' : inquiries.length}
          </p>
        </article>
      </section>

      {error ? (
        <section className="panel">
          <p className="text-sm text-rose-600">{error}</p>
        </section>
      ) : null}

      <section className="panel p-3">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className={`rounded-xl border px-3 py-2 text-sm font-semibold transition ${
              activeTab === 'orders'
                ? 'border-cyan-600 bg-cyan-600 text-white hover:bg-cyan-500'
                : 'border-slate-300 bg-slate-100 text-slate-700 hover:bg-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800'
            }`}
            onClick={() => setActiveTab('orders')}
          >
            Orders
          </button>
          <button
            type="button"
            className={`rounded-xl border px-3 py-2 text-sm font-semibold transition ${
              activeTab === 'inquiries'
                ? 'border-cyan-600 bg-cyan-600 text-white hover:bg-cyan-500'
                : 'border-slate-300 bg-slate-100 text-slate-700 hover:bg-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800'
            }`}
            onClick={() => setActiveTab('inquiries')}
          >
            Inquiries
          </button>
        </div>
      </section>

      {activeTab === 'orders' ? (
        <section className="panel">
          {loading ? (
            <p className="text-sm text-slate-600 dark:text-slate-300">Loading orders...</p>
          ) : orders.length === 0 ? (
            <p className="text-sm text-slate-600 dark:text-slate-300">No orders available.</p>
          ) : (
            <>
              <div className="space-y-3 md:hidden">
                {orders.map((order) => (
                  <article key={order.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/50">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <p className="font-semibold text-slate-900 dark:text-slate-100">{order.orderId || order.id}</p>
                      <span className="rounded-full border border-slate-300 bg-white px-2 py-0.5 text-xs font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
                        {order.itemCount} item(s)
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{order.userEmail || order.userId || 'Guest'}</p>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{formatDate(order.createdAt)}</p>
                    <div className="mt-2 flex items-center justify-between gap-2 text-sm">
                      <span className="text-slate-600 dark:text-slate-300">Total</span>
                      <span className="font-semibold text-slate-900 dark:text-slate-100">{formatCurrency(order.total)}</span>
                    </div>
                    <label className="mt-3 block">
                      <span className="sr-only">Order status</span>
                      <select
                        value={order.status}
                        onChange={(event) => handleStatusChange(order, event.target.value)}
                        disabled={updatingOrderId === order.id}
                        className="input py-2"
                      >
                        {ADMIN_ORDER_STATUS_OPTIONS.map((status) => (
                          <option key={status} value={status}>
                            {status}
                          </option>
                        ))}
                      </select>
                    </label>
                  </article>
                ))}
              </div>

              <div className="hidden overflow-x-auto md:block">
                <table className="min-w-[760px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-600 dark:border-slate-800 dark:text-slate-300">
                      <th className="px-2 py-2">Order ID</th>
                      <th className="px-2 py-2">Date</th>
                      <th className="px-2 py-2">Customer</th>
                      <th className="px-2 py-2">Items</th>
                      <th className="px-2 py-2">Total</th>
                      <th className="px-2 py-2">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map((order) => (
                      <tr key={order.id} className="border-b border-slate-100 text-slate-700 dark:border-slate-800 dark:text-slate-200">
                        <td className="px-2 py-2 font-semibold">{order.orderId || order.id}</td>
                        <td className="px-2 py-2">{formatDate(order.createdAt)}</td>
                        <td className="px-2 py-2">{order.userEmail || order.userId || 'Guest'}</td>
                        <td className="px-2 py-2">{order.itemCount}</td>
                        <td className="px-2 py-2 font-semibold">{formatCurrency(order.total)}</td>
                        <td className="px-2 py-2">
                          <select
                            value={order.status}
                            onChange={(event) => handleStatusChange(order, event.target.value)}
                            disabled={updatingOrderId === order.id}
                            className="input py-2"
                          >
                            {ADMIN_ORDER_STATUS_OPTIONS.map((status) => (
                              <option key={status} value={status}>
                                {status}
                              </option>
                            ))}
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </section>
      ) : (
        <section className="panel space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Filter</span>
            <button
              type="button"
              className={`rounded-xl border px-3 py-1.5 text-xs font-semibold transition ${
                inquiryFilter === 'all'
                  ? 'border-cyan-600 bg-cyan-600 text-white hover:bg-cyan-500'
                  : 'border-slate-300 bg-slate-100 text-slate-700 hover:bg-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800'
              }`}
              onClick={() => setInquiryFilter('all')}
            >
              All
            </button>
            <button
              type="button"
              className={`rounded-xl border px-3 py-1.5 text-xs font-semibold transition ${
                inquiryFilter === 'contact'
                  ? 'border-cyan-600 bg-cyan-600 text-white hover:bg-cyan-500'
                  : 'border-slate-300 bg-slate-100 text-slate-700 hover:bg-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800'
              }`}
              onClick={() => setInquiryFilter('contact')}
            >
              Contact
            </button>
            <button
              type="button"
              className={`rounded-xl border px-3 py-1.5 text-xs font-semibold transition ${
                inquiryFilter === 'custom_order'
                  ? 'border-cyan-600 bg-cyan-600 text-white hover:bg-cyan-500'
                  : 'border-slate-300 bg-slate-100 text-slate-700 hover:bg-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800'
              }`}
              onClick={() => setInquiryFilter('custom_order')}
            >
              Custom Orders
            </button>
            <button
              type="button"
              className={`rounded-xl border px-3 py-1.5 text-xs font-semibold transition ${
                inquiryFilter === 'feedback'
                  ? 'border-cyan-600 bg-cyan-600 text-white hover:bg-cyan-500'
                  : 'border-slate-300 bg-slate-100 text-slate-700 hover:bg-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800'
              }`}
              onClick={() => setInquiryFilter('feedback')}
            >
              Feedback
            </button>
          </div>

          {loading ? (
            <p className="text-sm text-slate-600 dark:text-slate-300">Loading inquiries...</p>
          ) : filteredInquiries.length === 0 ? (
            <p className="text-sm text-slate-600 dark:text-slate-300">No inquiries available for this filter.</p>
          ) : (
            <div className="space-y-4">
              {filteredInquiries.map((inquiry) => {
                const key = inquiryKey(inquiry);
                const replyValue = String(replyDrafts[key] ?? inquiry.adminReply ?? '');
                const statusValue =
                  inquiry.inquiryType === 'custom_order'
                    ? String(statusDrafts[key] || inquiry.status || 'pending').toLowerCase()
                    : '';
                const isSaving = savingInquiryKey === key;

                return (
                  <article key={key} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/50">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-700 dark:text-cyan-300">
                          {getInquiryTypeLabel(inquiry.inquiryType)}
                        </p>
                        <h3 className="mt-1 text-lg font-semibold text-slate-900 dark:text-slate-100">{inquiry.subject || 'Customer Inquiry'}</h3>
                      </div>
                      <span className={`rounded-full border px-2 py-1 text-xs font-semibold uppercase ${getInquiryStatusClass(inquiry)}`}>
                        {getInquiryStatusLabel(inquiry)}
                      </span>
                    </div>

                    <p className="mt-2 text-sm text-slate-700 dark:text-slate-200">
                      {inquiry.name || 'Customer'} | {inquiry.email || inquiry.userEmail || inquiry.userId || 'Unknown'}
                    </p>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      Submitted {formatDate(inquiry.createdAt)}
                    </p>

                    {inquiry.orderId ? (
                      <p className="mt-1 text-xs font-semibold text-slate-600 dark:text-slate-300">Related Order: {inquiry.orderId}</p>
                    ) : null}

                    <p className="mt-3 whitespace-pre-wrap text-sm text-slate-700 dark:text-slate-200">
                      {inquiry.message || 'No message provided.'}
                    </p>

                    {inquiry.inquiryType === 'custom_order' ? (
                      <div className="mt-3 grid gap-2 text-xs text-slate-600 dark:text-slate-300 sm:grid-cols-2">
                        <p><span className="font-semibold text-slate-700 dark:text-slate-200">Shoe:</span> {inquiry.meta?.shoeType || '-'}</p>
                        <p><span className="font-semibold text-slate-700 dark:text-slate-200">Size:</span> {inquiry.meta?.size || '-'}</p>
                        <p><span className="font-semibold text-slate-700 dark:text-slate-200">Material:</span> {inquiry.meta?.material || '-'}</p>
                        <p><span className="font-semibold text-slate-700 dark:text-slate-200">Budget:</span> {inquiry.meta?.budgetRange || '-'}</p>
                      </div>
                    ) : null}

                    <div className="mt-4 space-y-3">
                      {inquiry.inquiryType === 'custom_order' ? (
                        <label>
                          <span className="label">Request Status</span>
                          <select
                            className="input py-2"
                            value={statusValue}
                            onChange={(event) => handleInquiryStatusChange(inquiry, event.target.value)}
                            disabled={isSaving}
                          >
                            {ADMIN_CUSTOM_ORDER_STATUS_OPTIONS.map((status) => (
                              <option key={status} value={status}>
                                {status.replace(/_/g, ' ')}
                              </option>
                            ))}
                          </select>
                        </label>
                      ) : null}

                      <label>
                        <span className="label">Admin Reply</span>
                        <textarea
                          className="input min-h-24"
                          value={replyValue}
                          onChange={(event) => handleReplyChange(inquiry, event.target.value)}
                          placeholder="Write your response to this inquiry."
                          disabled={isSaving}
                        />
                      </label>

                      <div className="flex flex-wrap items-center justify-between gap-2">
                        {inquiry.repliedAt ? (
                          <p className="text-xs text-slate-500 dark:text-slate-400">Last reply: {formatDate(inquiry.repliedAt)}</p>
                        ) : (
                          <span />
                        )}
                        <button
                          type="button"
                          className="btn-primary"
                          disabled={isSaving}
                          onClick={() => handleReplySubmit(inquiry)}
                        >
                          {isSaving ? 'Saving...' : 'Save Reply'}
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      )}
    </div>
  );
}

