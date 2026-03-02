import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { getUserOrders } from '../lib/firestore';

const emptyAccountForm = {
  username: '',
  email: '',
  password: '',
  confirmPassword: '',
};

const formatCurrency = (value) => `$${Number(value || 0).toFixed(2)}`;

const formatDate = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
};

export default function ProfilePage() {
  const { user, role, loading, authError, updateAccount } = useAuth();

  const [accountForm, setAccountForm] = useState(emptyAccountForm);
  const [showEditForm, setShowEditForm] = useState(false);
  const [recentPurchases, setRecentPurchases] = useState([]);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [savingAccount, setSavingAccount] = useState(false);

  useEffect(() => {
    let active = true;

    if (!user) {
      setAccountForm(emptyAccountForm);
      setRecentPurchases([]);
      setShowEditForm(false);
      return () => {
        active = false;
      };
    }

    setAccountForm({
      username: user.displayName || '',
      email: user.email || '',
      password: '',
      confirmPassword: '',
    });

    const loadOrders = async () => {
      try {
        const orders = await getUserOrders(user.uid, user.email || '');
        if (!active) return;
        setRecentPurchases(orders);
      } catch {
        if (!active) return;
        setRecentPurchases([]);
      }
    };

    loadOrders();
    return () => {
      active = false;
    };
  }, [user]);

  const handleSaveAccount = async (event) => {
    event.preventDefault();
    if (!user) return;

    setError('');
    setMessage('');

    const username = accountForm.username.trim();
    const email = accountForm.email.trim();
    const password = accountForm.password;
    const confirmPassword = accountForm.confirmPassword;

    if (!username || !email) {
      setError('Username and email are required.');
      return;
    }

    if (password && password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    if (password && password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setSavingAccount(true);
    try {
      await updateAccount({
        displayName: username,
        email,
        password: password || undefined,
      });

      setAccountForm((current) => ({
        ...current,
        password: '',
        confirmPassword: '',
      }));
      setMessage('Account updated successfully.');
      setShowEditForm(false);
    } catch (saveError) {
      setError(saveError.message || 'Failed to update account.');
    } finally {
      setSavingAccount(false);
    }
  };

  if (loading) {
    return (
      <section className="panel">
        <p className="text-sm text-slate-600 dark:text-slate-300">Checking authentication...</p>
      </section>
    );
  }

  if (!user) {
    return (
      <section className="panel">
        <h1 className="text-2xl font-bold">Profile</h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
          Please login or sign up to manage your profile.
        </p>
      </section>
    );
  }

  return (
    <div className="space-y-6">
      <section className="panel bg-gradient-to-r from-slate-900 to-cyan-900 text-white">
        <h1 className="text-3xl font-bold">Profile</h1>
        <p className="mt-2 text-sm text-cyan-100">Manage your account details and review purchase history.</p>
      </section>

      {(message || error || authError) ? (
        <section className="panel">
          {message ? <p className="text-sm text-emerald-600">{message}</p> : null}
          {error ? <p className="text-sm text-rose-600">{error}</p> : null}
          {authError ? <p className="text-sm text-rose-600">{authError}</p> : null}
        </section>
      ) : null}

      <section className="panel space-y-3">
        <h2 className="text-xl font-semibold">User Profile</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <p className="label">Username</p>
            <p className="text-base font-medium text-slate-900 dark:text-slate-100">{user.displayName || '-'}</p>
          </div>
          <div>
            <p className="label">Email</p>
            <p className="text-base font-medium text-slate-900 dark:text-slate-100">{user.email || '-'}</p>
          </div>
        </div>
        <div>
          <span className="label">Role</span>
          <div className="mt-1">
            <span
              className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.15em] ${
                role === 'admin'
                  ? 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-200'
                  : 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-200'
              }`}
            >
              {role || 'user'}
            </span>
          </div>
        </div>
      </section>

      <section className="panel space-y-4">
        <h2 className="text-xl font-semibold">Recent Purchases</h2>

        {recentPurchases.length === 0 ? (
          <p className="text-sm text-slate-600 dark:text-slate-300">No purchases available yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left dark:border-slate-800">
                  <th className="px-2 py-2">Date</th>
                  <th className="px-2 py-2">Items</th>
                  <th className="px-2 py-2">Total</th>
                  <th className="px-2 py-2">Order ID</th>
                </tr>
              </thead>
              <tbody>
                {recentPurchases.map((order) => (
                  <tr key={order.id || order.orderId} className="border-b border-slate-100 dark:border-slate-800/70">
                    <td className="px-2 py-2">{formatDate(order.createdAt)}</td>
                    <td className="px-2 py-2">{Array.isArray(order.items) ? order.items.length : 0}</td>
                    <td className="px-2 py-2">{formatCurrency(order.total)}</td>
                    <td className="px-2 py-2 font-medium">{order.orderId || order.id}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="panel space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-xl font-semibold">Edit Account Details</h2>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => {
              setShowEditForm((current) => !current);
              setError('');
              setMessage('');
            }}
          >
            {showEditForm ? 'Close' : 'Edit Account'}
          </button>
        </div>

        {showEditForm ? (
          <form className="space-y-4" onSubmit={handleSaveAccount}>
            <div className="grid gap-3 sm:grid-cols-2">
              <label>
                <span className="label">Username</span>
                <input
                  className="input"
                  value={accountForm.username}
                  onChange={(event) =>
                    setAccountForm((current) => ({ ...current, username: event.target.value }))
                  }
                  required
                />
              </label>

              <label>
                <span className="label">Email</span>
                <input
                  type="email"
                  className="input"
                  value={accountForm.email}
                  onChange={(event) =>
                    setAccountForm((current) => ({ ...current, email: event.target.value }))
                  }
                  required
                />
              </label>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <label>
                <span className="label">New Password</span>
                <input
                  type="password"
                  className="input"
                  value={accountForm.password}
                  onChange={(event) =>
                    setAccountForm((current) => ({ ...current, password: event.target.value }))
                  }
                  placeholder="Leave blank to keep current password"
                />
              </label>

              <label>
                <span className="label">Confirm New Password</span>
                <input
                  type="password"
                  className="input"
                  value={accountForm.confirmPassword}
                  onChange={(event) =>
                    setAccountForm((current) => ({ ...current, confirmPassword: event.target.value }))
                  }
                  placeholder="Repeat new password"
                />
              </label>
            </div>

            <button type="submit" className="btn-primary" disabled={savingAccount}>
              {savingAccount ? 'Saving...' : 'Save Changes'}
            </button>
          </form>
        ) : null}
      </section>
    </div>
  );
}
