import { useEffect, useRef, useState } from 'react';
import { Heart, ShoppingCart, User } from 'lucide-react';
import { Link, NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useFavourites } from '../context/FavouritesContext';
import Login from './Login';
import Signup from './Signup';
import ThemeToggle from './ThemeToggle';

const navItems = [
  { to: '/products', label: 'Shop' },
  { to: '/custom-order', label: 'Custom Order' },
  { to: '/fit-assurance', label: 'Fit Assurance' },
  { to: '/3d-view', label: '3D View' },
];

const iconButtonClass =
  'relative inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-300 bg-white text-slate-800 transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:ring-offset-2 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 dark:ring-offset-slate-950';

const normalizeError = (value, fallback) => {
  const text = String(value || '').trim();
  return text || fallback;
};

export default function Navbar({ onCartOpen }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [authMode, setAuthMode] = useState(null);
  const [localError, setLocalError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    identity: '',
    password: '',
    confirmPassword: '',
  });
  const [accountOpen, setAccountOpen] = useState(false);

  const accountRef = useRef(null);
  const { cartCount } = useCart();
  const { favouritesCount } = useFavourites();
  const { isAuthenticated, isAdmin, login, signup, logout, authError } = useAuth();

  useEffect(() => {
    const handler = (event) => {
      if (!accountRef.current) return;
      if (!accountRef.current.contains(event.target)) {
        setAccountOpen(false);
      }
    };

    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const openAuth = (mode) => {
    setLocalError('');
    setAuthMode(mode);
    setForm({ identity: '', password: '', confirmPassword: '' });
  };

  const handleAuthSubmit = async (event) => {
    event.preventDefault();
    setLocalError('');

    const identity = form.identity.trim();
    const password = form.password;

    if (!identity || !password) {
      setLocalError('Email and password are required.');
      return;
    }

    if (authMode === 'signup' && password !== form.confirmPassword) {
      setLocalError('Passwords do not match.');
      return;
    }

    setSubmitting(true);
    try {
      if (authMode === 'signup') {
        const username = identity.includes('@') ? identity.split('@')[0] : identity;
        await signup(identity, password, username);
      } else {
        await login(identity, password);
      }
      setAuthMode(null);
      setMenuOpen(false);
    } catch (error) {
      setLocalError(normalizeError(error?.message, `Unable to ${authMode}.`));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-50 border-b border-slate-300/80 bg-white/95 backdrop-blur dark:border-slate-800 dark:bg-slate-950/90">
        <nav className="mx-auto flex h-24 w-full max-w-[88rem] items-center justify-between px-5 sm:px-7 lg:px-10">
          <div className="flex flex-1 items-center">
            <Link to="/" className="flex items-center gap-2" onClick={() => setMenuOpen(false)}>
              <img
                src="/assets/logo.png"
                alt="ShoesX"
                className="h-14 w-14 rounded-xl bg-white p-1 object-contain ring-1 ring-slate-300 shadow-sm dark:bg-slate-900 dark:ring-slate-700"
              />
              <span className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">ShoesX</span>
            </Link>
          </div>

          <div className="hidden flex-1 items-center justify-center gap-3 lg:flex">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `inline-flex min-w-[132px] whitespace-nowrap items-center justify-center rounded-xl px-5 py-2.5 text-sm font-medium transition ${
                    isActive
                      ? 'bg-cyan-600 text-white'
                      : 'text-slate-800 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800'
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </div>

          <div className="hidden flex-1 items-center justify-end gap-2 lg:flex">
            <ThemeToggle />

            <Link to="/favourites" className={iconButtonClass} aria-label="Favourites">
              <Heart
                size={18}
                className={
                  favouritesCount > 0
                    ? 'fill-slate-900 text-slate-900 dark:fill-white dark:text-white'
                    : ''
                }
              />
              {favouritesCount > 0 ? (
                <span className="absolute -right-1 -top-1 inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-slate-900 px-1 text-[10px] font-bold text-white dark:bg-slate-100 dark:text-slate-900">
                  {favouritesCount}
                </span>
              ) : null}
            </Link>

            <button type="button" onClick={onCartOpen} className={iconButtonClass} aria-label="Open cart">
              <ShoppingCart size={18} aria-hidden="true" />
              <span className="absolute -right-1 -top-1 inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-slate-900 px-1 text-[10px] font-bold text-white dark:bg-slate-100 dark:text-slate-900">
                {cartCount}
              </span>
            </button>

            {isAuthenticated ? (
              <div className="relative" ref={accountRef}>
                <button
                  type="button"
                  className={iconButtonClass}
                  aria-label="Account menu"
                  onClick={() => setAccountOpen((current) => !current)}
                >
                  <User size={18} aria-hidden="true" />
                </button>

                {accountOpen ? (
                  <div className="absolute right-0 mt-2 w-48 rounded-xl border border-slate-200 bg-white p-2 shadow-lg dark:border-slate-700 dark:bg-slate-900">
                    <Link
                      to="/profile"
                      className="block rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                      onClick={() => setAccountOpen(false)}
                    >
                      Profile
                    </Link>
                    {/* UI visibility is role-based; backend rules must enforce true admin security. */}
                    {isAdmin ? (
                      <Link
                        to="/admin/dashboard"
                        className="block rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                        onClick={() => setAccountOpen(false)}
                      >
                        Admin Panel
                      </Link>
                    ) : null}
                    <button
                      type="button"
                      className="mt-1 w-full rounded-lg px-3 py-2 text-left text-sm text-rose-700 hover:bg-rose-50 dark:text-rose-300 dark:hover:bg-rose-900/30"
                      onClick={() => {
                        logout();
                        setAccountOpen(false);
                      }}
                    >
                      Logout
                    </button>
                  </div>
                ) : null}
              </div>
            ) : (
              <>
                <button type="button" className="btn-secondary px-3" onClick={() => openAuth('login')}>
                  Login
                </button>
                <button type="button" className="btn-primary px-3" onClick={() => openAuth('signup')}>
                  Sign Up
                </button>
              </>
            )}
          </div>

          <button
            type="button"
            className="btn-secondary px-3 lg:hidden"
            onClick={() => setMenuOpen((current) => !current)}
            aria-label="Toggle menu"
            aria-expanded={menuOpen}
          >
            Menu
          </button>
        </nav>

        {menuOpen ? (
          <div className="border-t border-slate-300 bg-white p-4 dark:border-slate-800 dark:bg-slate-950 lg:hidden">
            <div className="flex flex-col gap-2">
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={() => setMenuOpen(false)}
                  className={({ isActive }) =>
                    `rounded-xl whitespace-nowrap px-4 py-2.5 text-sm font-medium ${
                      isActive
                        ? 'bg-cyan-600 text-white'
                        : 'text-slate-800 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800'
                    }`
                  }
                >
                  {item.label}
                </NavLink>
              ))}

              <div className="mt-2 flex gap-2">
                <Link to="/favourites" className={`${iconButtonClass} flex-1`} onClick={() => setMenuOpen(false)}>
                  <Heart
                    size={18}
                    className={
                      favouritesCount > 0
                        ? 'fill-slate-900 text-slate-900 dark:fill-white dark:text-white'
                        : ''
                    }
                  />
                  {favouritesCount > 0 ? (
                    <span className="absolute -right-1 -top-1 inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-slate-900 px-1 text-[10px] font-bold text-white dark:bg-slate-100 dark:text-slate-900">
                      {favouritesCount}
                    </span>
                  ) : null}
                </Link>

                <button
                  type="button"
                  onClick={onCartOpen}
                  className={`${iconButtonClass} flex-1`}
                  aria-label="Open cart"
                >
                  <ShoppingCart size={18} aria-hidden="true" />
                  <span className="absolute -right-1 -top-1 inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-slate-900 px-1 text-[10px] font-bold text-white dark:bg-slate-100 dark:text-slate-900">
                    {cartCount}
                  </span>
                </button>

                <ThemeToggle className="flex-1" />
              </div>

              {isAuthenticated ? (
                <div className="mt-1 space-y-2">
                  <Link
                    to="/profile"
                    onClick={() => setMenuOpen(false)}
                    className="block rounded-xl px-3 py-2 text-sm font-medium text-slate-800 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                  >
                    Profile
                  </Link>
                  {isAdmin ? (
                    <Link
                      to="/admin/dashboard"
                      onClick={() => setMenuOpen(false)}
                      className="block rounded-xl px-3 py-2 text-sm font-medium text-slate-800 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                    >
                      Admin Panel
                    </Link>
                  ) : null}
                  <button
                    type="button"
                    className="btn-primary w-full"
                    onClick={() => {
                      logout();
                      setMenuOpen(false);
                    }}
                  >
                    Logout
                  </button>
                </div>
              ) : (
                <div className="mt-1 grid grid-cols-2 gap-2">
                  <button type="button" className="btn-secondary" onClick={() => openAuth('login')}>
                    Login
                  </button>
                  <button type="button" className="btn-primary" onClick={() => openAuth('signup')}>
                    Sign Up
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : null}
      </header>

      {authMode ? (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm"
          onClick={() => setAuthMode(null)}
        >
          <div className="panel w-full max-w-md" onClick={(event) => event.stopPropagation()}>
            {authMode === 'signup' ? (
              <Signup
                form={form}
                setForm={setForm}
                onSubmit={handleAuthSubmit}
                onSwitch={() => {
                  setLocalError('');
                  setAuthMode('login');
                }}
                error={localError || authError}
                submitting={submitting}
              />
            ) : (
              <Login
                form={form}
                setForm={setForm}
                onSubmit={handleAuthSubmit}
                onSwitch={() => {
                  setLocalError('');
                  setAuthMode('signup');
                }}
                error={localError || authError}
                submitting={submitting}
              />
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}
