import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { hasSupabaseConfig, requireSupabase } from '../lib/supabase';

const AuthContext = createContext(null);

const ADMIN_EMAIL = 'admin@gmail.com';
const ADMIN_PASSWORD = 'Admin123';

const normalizeRole = (role) => (role === 'admin' ? 'admin' : role === 'user' ? 'user' : null);

const getRoleFromEmail = (email) =>
  String(email || '').trim().toLowerCase() === ADMIN_EMAIL ? 'admin' : 'user';

const normalizeAuthUser = (authUser, profile = null) => {
  if (!authUser) return null;
  const metadata = authUser.user_metadata || {};
  const displayName = String(
    profile?.username ||
      metadata.display_name ||
      metadata.full_name ||
      metadata.username ||
      '',
  ).trim();

  return {
    uid: authUser.id,
    email: authUser.email || '',
    displayName,
  };
};

const resolveRole = (authUser, profileRole = null) => {
  const byEmail = getRoleFromEmail(authUser?.email);
  if (byEmail === 'admin') return 'admin';
  return normalizeRole(profileRole) || 'user';
};

const requiredError = (value) => new Error(value);

const getErrorMessage = (error, fallback) => {
  const message = String(error?.message || '').trim();
  return message || fallback;
};

const requireSupabaseAuth = () => {
  if (!hasSupabaseConfig) {
    throw requiredError('Supabase Auth is not configured.');
  }
  return requireSupabase();
};

const getProfileByUserId = async (client, userId) => {
  const uid = String(userId || '').trim();
  if (!uid) return null;

  try {
    const { data, error } = await client
      .from('users_profile')
      .select('username,role,email')
      .eq('id', uid)
      .maybeSingle();

    if (error) return null;
    return data || null;
  } catch {
    return null;
  }
};

const syncUsersProfile = async (client, authUser, role, username = '') => {
  const uid = String(authUser?.id || '').trim();
  if (!uid) return;

  // Keep users_profile in sync for admin/user dashboards and role-aware UI.
  const payload = {
    id: uid,
    email: String(authUser?.email || '').trim(),
    username: String(username || '').trim() || String(authUser?.email || '').split('@')[0] || 'User',
    role: role === 'admin' ? 'admin' : 'user',
    updated_at: new Date().toISOString(),
  };

  try {
    await client.from('users_profile').upsert(payload, { onConflict: 'id' });
  } catch {
    // Do not block auth flow if profile table/RLS is not ready yet.
  }
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState('');
  const authSyncVersionRef = useRef(0);
  const initializedRef = useRef(false);

  useEffect(() => {
    initializedRef.current = false;

    if (!hasSupabaseConfig) {
      setUser(null);
      setRole(null);
      setLoading(false);
      initializedRef.current = true;
      return;
    }

    const client = requireSupabase();
    let active = true;

    const markInitialized = () => {
      if (!active || initializedRef.current) return;
      initializedRef.current = true;
      setLoading(false);
    };

    const syncAuthState = async (authUser) => {
      const version = ++authSyncVersionRef.current;

      if (!authUser) {
        if (!active || version !== authSyncVersionRef.current) return;
        setUser(null);
        setRole(null);
        return;
      }

      const profile = await getProfileByUserId(client, authUser.id);
      if (!active || version !== authSyncVersionRef.current) return;

      const normalizedUser = normalizeAuthUser(authUser, profile);
      const derivedRole = resolveRole(authUser, profile?.role);

      setUser(normalizedUser);
      setRole(derivedRole);
      syncUsersProfile(client, authUser, derivedRole, normalizedUser?.displayName || '').catch(() => {});
    };

    const initialize = async () => {
      setLoading(true);
      setAuthError('');

      try {
        const { data, error } = await client.auth.getSession();
        if (error) {
          throw error;
        }

        await syncAuthState(data?.session?.user || null);
      } catch (error) {
        if (!active) return;
        setAuthError(getErrorMessage(error, 'Unable to restore your session.'));
        setUser(null);
        setRole(null);
      } finally {
        markInitialized();
      }
    };

    initialize();

    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((_event, session) => {
      syncAuthState(session?.user || null).finally(() => {
        // Guard against event timing where auth callback fires before initial getSession resolves.
        markInitialized();
      });
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  const login = async (email, password) => {
    const nextEmail = String(email || '').trim();
    const nextPassword = String(password || '');
    const normalizedEmail = nextEmail.toLowerCase();

    if (!nextEmail || !nextPassword) {
      const message = 'Email and password are required.';
      setAuthError(message);
      throw requiredError(message);
    }

    // Restrict admin privileges to the exact approved credentials.
    if (normalizedEmail === ADMIN_EMAIL && nextPassword !== ADMIN_PASSWORD) {
      const message = 'Invalid admin credentials.';
      setAuthError(message);
      throw requiredError(message);
    }

    try {
      const client = requireSupabaseAuth();
      setAuthError('');
      const { data, error } = await client.auth.signInWithPassword({
        email: nextEmail,
        password: nextPassword,
      });

      if (error) {
        throw error;
      }

      const authUser = data?.user;
      if (!authUser) {
        throw requiredError('Unable to login right now.');
      }

      const profile = await getProfileByUserId(client, authUser.id);
      const normalizedUser = normalizeAuthUser(authUser, profile);
      const derivedRole = resolveRole(authUser, profile?.role);

      setUser(normalizedUser);
      setRole(derivedRole);
      await syncUsersProfile(client, authUser, derivedRole, normalizedUser?.displayName || '');
      return normalizedUser;
    } catch (error) {
      const message = getErrorMessage(error, 'Unable to login right now.');
      setAuthError(message);
      throw requiredError(message);
    }
  };

  const signup = async (email, password, username = '') => {
    const nextEmail = String(email || '').trim();
    const nextPassword = String(password || '');
    const nextUsername = String(username || '').trim();

    if (!nextEmail || !nextPassword) {
      const message = 'Email and password are required.';
      setAuthError(message);
      throw requiredError(message);
    }

    try {
      const client = requireSupabaseAuth();
      setAuthError('');
      const defaultUsername = nextUsername || nextEmail.split('@')[0] || 'User';
      const { data, error } = await client.auth.signUp({
        email: nextEmail,
        password: nextPassword,
        options: {
          data: {
            display_name: defaultUsername,
            username: defaultUsername,
          },
        },
      });

      if (error) {
        throw error;
      }

      const authUser = data?.user;
      if (!authUser) {
        throw requiredError('Unable to create account right now.');
      }

      const profile = await getProfileByUserId(client, authUser.id);
      const derivedRole = resolveRole(authUser, profile?.role);
      const normalizedUser = normalizeAuthUser(authUser, {
        ...profile,
        username: defaultUsername,
      });

      if (data?.session?.user) {
        setUser(normalizedUser);
        setRole(derivedRole);
      }

      await syncUsersProfile(client, authUser, derivedRole, normalizedUser?.displayName || defaultUsername);

      // If email confirmations are enabled, the user may need to verify before a session is active.
      if (!data?.session?.user) {
        setUser(null);
        setRole(null);
      }

      return normalizedUser;
    } catch (error) {
      const message = getErrorMessage(error, 'Unable to sign up right now.');
      setAuthError(message);
      throw requiredError(message);
    }
  };

  const logout = async () => {
    try {
      const client = requireSupabaseAuth();
      setAuthError('');
      await client.auth.signOut();
    } finally {
      setUser(null);
      setRole(null);
    }
  };

  const updateAccount = async (payload = {}) => {
    try {
      const client = requireSupabaseAuth();
      const {
        data: { user: activeUser },
      } = await client.auth.getUser();

      if (!activeUser) {
        throw requiredError('You must be logged in to update account details.');
      }

      const nextName = String(payload.displayName ?? '').trim();
      const nextEmail = String(payload.email ?? '').trim();
      const nextPassword = String(payload.password ?? '');

      if (!nextName) {
        throw requiredError('Username is required.');
      }

      if (!nextEmail) {
        throw requiredError('Email is required.');
      }

      const nextPayload = {
        email: nextEmail,
        data: {
          display_name: nextName,
          username: nextName,
        },
      };

      if (nextPassword) {
        nextPayload.password = nextPassword;
      }

      const { data, error } = await client.auth.updateUser(nextPayload);
      if (error) {
        throw error;
      }

      const refreshedUser = data?.user || activeUser;
      const derivedRole = resolveRole(refreshedUser, role);
      const normalizedUser = normalizeAuthUser(refreshedUser, { username: nextName, role: derivedRole });

      setUser(normalizedUser);
      setRole(derivedRole);
      await syncUsersProfile(client, refreshedUser, derivedRole, nextName);
      return normalizedUser;
    } catch (error) {
      const message = getErrorMessage(error, 'Failed to update account.');
      setAuthError(message);
      throw requiredError(message);
    }
  };

  const onAuthStateChanged = (callback) => {
    if (typeof callback !== 'function') return () => {};
    if (!hasSupabaseConfig) {
      callback(null);
      return () => {};
    }

    const client = requireSupabase();
    client.auth
      .getSession()
      .then(({ data }) => {
        callback(normalizeAuthUser(data?.session?.user || null));
      })
      .catch(() => {
        callback(null);
      });

    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((_event, session) => {
      callback(normalizeAuthUser(session?.user || null));
    });

    return () => subscription.unsubscribe();
  };

  const isAuthenticated = !loading && Boolean(user);
  const isAdmin = !loading && role === 'admin';

  const value = useMemo(
    () => ({
      authUser: user,
      user,
      role,
      isAuthenticated,
      isAdmin,
      loading,
      authError,
      hasSupabaseConfig,
      login,
      signup,
      logout,
      signIn: login,
      signUp: signup,
      signOut: logout,
      updateAccount,
      onAuthStateChanged,
    }),
    [user, role, loading, authError, isAuthenticated, isAdmin],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw requiredError('useAuth must be used inside AuthProvider.');
  }
  return context;
}
