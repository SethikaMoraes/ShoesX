import { useCallback, useEffect, useState } from 'react';
import { Ban, ShieldCheck, ShieldOff } from 'lucide-react';
import { getAdminUsers, setUserDisabled, updateUserRole } from '../../lib/adminUsersService';

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

const normalizeError = (error, fallback) => {
  const message = String(error?.message || '').trim();
  return message || fallback;
};

const roleBadgeClass = (role) =>
  role === 'admin'
    ? 'border-cyan-200 bg-cyan-50 text-cyan-700 dark:border-cyan-900 dark:bg-cyan-900/40 dark:text-cyan-200'
    : 'border-slate-300 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200';

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [totalUsers, setTotalUsers] = useState(0);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [savingUserId, setSavingUserId] = useState('');
  const [supportsDisable, setSupportsDisable] = useState(false);

  const loadUsers = useCallback(async (searchTerm = '') => {
    setLoading(true);
    setError('');
    try {
      const response = await getAdminUsers(searchTerm);
      setUsers(response.users);
      setSupportsDisable(response.supportsDisable);
      setTotalUsers(Number(response.totalCount || 0));
    } catch (loadError) {
      setError(normalizeError(loadError, 'Unable to load users.'));
      setUsers([]);
      setSupportsDisable(false);
      setTotalUsers(0);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadUsers(search);
    }, 250);

    return () => clearTimeout(timer);
  }, [loadUsers, search]);

  const handleRoleChange = async (user, nextRole) => {
    if (!user?.id || user.role === nextRole) return;

    setSavingUserId(user.id);
    setError('');
    try {
      const updatedUser = await updateUserRole(user.id, nextRole);
      setUsers((current) => current.map((item) => (item.id === user.id ? { ...item, ...updatedUser } : item)));
    } catch (updateError) {
      setError(normalizeError(updateError, 'Unable to update role.'));
    } finally {
      setSavingUserId('');
    }
  };

  const handleDisableToggle = async (user) => {
    if (!supportsDisable || !user?.id) return;

    setSavingUserId(user.id);
    setError('');
    try {
      const updatedUser = await setUserDisabled(user.id, !user.disabled);
      setUsers((current) => current.map((item) => (item.id === user.id ? { ...item, ...updatedUser } : item)));
    } catch (updateError) {
      setError(normalizeError(updateError, 'Unable to update user status.'));
    } finally {
      setSavingUserId('');
    }
  };

  return (
    <div className="space-y-6">
      <section className="panel">
        <h1 className="text-2xl font-bold sm:text-3xl">Users</h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
          View registered users and manage role access from the users profile table.
        </p>
      </section>

      <section className="panel p-4">
        <p className="text-xs uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Total Users</p>
        <p className="mt-2 text-3xl font-bold text-slate-900 dark:text-slate-100">
          {loading ? '...' : totalUsers}
        </p>
      </section>

      <section className="panel">
        <div className="flex flex-wrap items-center gap-3">
          <input
            className="input w-full sm:max-w-md"
            placeholder="Search by email or username"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          {supportsDisable ? (
            <span className="rounded-full border border-slate-300 bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
              Disable action enabled
            </span>
          ) : (
            <span className="rounded-full border border-cyan-300 bg-cyan-50 px-3 py-1 text-xs font-semibold text-cyan-700 dark:border-cyan-900 dark:bg-cyan-900/40 dark:text-cyan-200">
              Disable column not detected
            </span>
          )}
        </div>
      </section>

      {error ? (
        <section className="panel">
          <p className="text-sm text-rose-600">{error}</p>
        </section>
      ) : null}

      <section className="panel">
        {loading ? (
          <p className="text-sm text-slate-600 dark:text-slate-300">Loading users...</p>
        ) : users.length === 0 ? (
          <p className="text-sm text-slate-600 dark:text-slate-300">No users found for this query.</p>
        ) : (
          <>
            <div className="space-y-3 md:hidden">
              {users.map((user) => {
                const isSaving = savingUserId === user.id;
                return (
                  <article key={user.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/50">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-900 dark:text-slate-100">{user.username}</p>
                        <p className="mt-1 break-all text-sm text-slate-600 dark:text-slate-300">{user.email || '-'}</p>
                      </div>
                      <span className={`inline-flex rounded-full border px-2 py-1 text-xs font-semibold uppercase ${roleBadgeClass(user.role)}`}>
                        {user.role}
                      </span>
                    </div>

                    <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">Created {formatDate(user.createdAt)}</p>

                    <div className="mt-3 grid gap-2">
                      <label className="sr-only" htmlFor={`mobile-role-${user.id}`}>
                        Role
                      </label>
                      <select
                        id={`mobile-role-${user.id}`}
                        className="input py-2"
                        value={user.role}
                        disabled={isSaving}
                        onChange={(event) => handleRoleChange(user, event.target.value)}
                      >
                        <option value="user">user</option>
                        <option value="admin">admin</option>
                      </select>

                      {supportsDisable ? (
                        <button
                          type="button"
                          className="btn-secondary gap-2 px-3 py-2"
                          disabled={isSaving}
                          onClick={() => handleDisableToggle(user)}
                        >
                          {user.disabled ? <ShieldCheck size={15} /> : <Ban size={15} />}
                          {user.disabled ? 'Enable' : 'Disable'}
                        </button>
                      ) : (
                        <span className="inline-flex items-center justify-center gap-1 rounded-xl border border-slate-300 bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
                          <ShieldOff size={14} />
                          Disable unavailable
                        </span>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>

            <div className="hidden overflow-x-auto md:block">
              <table className="min-w-[760px] text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-600 dark:border-slate-800 dark:text-slate-300">
                    <th className="px-2 py-2">Name</th>
                    <th className="px-2 py-2">Email</th>
                    <th className="px-2 py-2">Role</th>
                    <th className="px-2 py-2">Created At</th>
                    <th className="px-2 py-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => {
                    const isSaving = savingUserId === user.id;
                    return (
                      <tr key={user.id} className="border-b border-slate-100 text-slate-700 dark:border-slate-800 dark:text-slate-200">
                        <td className="px-2 py-2 font-semibold">{user.username}</td>
                        <td className="px-2 py-2">{user.email || '-'}</td>
                        <td className="px-2 py-2">
                          <span className={`inline-flex rounded-full border px-2 py-1 text-xs font-semibold uppercase ${roleBadgeClass(user.role)}`}>
                            {user.role}
                          </span>
                        </td>
                        <td className="px-2 py-2">{formatDate(user.createdAt)}</td>
                        <td className="px-2 py-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <label className="sr-only" htmlFor={`role-${user.id}`}>
                              Role
                            </label>
                            <select
                              id={`role-${user.id}`}
                              className="input min-w-[120px] py-2"
                              value={user.role}
                              disabled={isSaving}
                              onChange={(event) => handleRoleChange(user, event.target.value)}
                            >
                              <option value="user">user</option>
                              <option value="admin">admin</option>
                            </select>

                            {supportsDisable ? (
                              <button
                                type="button"
                                className="btn-secondary gap-2 px-3 py-2"
                                disabled={isSaving}
                                onClick={() => handleDisableToggle(user)}
                              >
                                {user.disabled ? <ShieldCheck size={15} /> : <Ban size={15} />}
                                {user.disabled ? 'Enable' : 'Disable'}
                              </button>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded-xl border border-slate-300 bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
                                <ShieldOff size={14} />
                                Disable unavailable
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
