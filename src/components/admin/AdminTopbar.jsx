import { House, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function AdminTopbar({
  isDesktopNavVisible = true,
  onToggleDesktopNav,
  showDesktopNavToggle = true,
  isMobileNavOpen = false,
  onToggleMobileNav,
}) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 px-3 py-3 backdrop-blur dark:border-slate-800 dark:bg-slate-950/90 sm:px-6 sm:py-4 lg:px-8">
      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
        <button
          type="button"
          className="admin-btn-secondary h-10 w-10 shrink-0 px-0 lg:hidden"
          onClick={onToggleMobileNav}
          aria-label={isMobileNavOpen ? 'Hide admin navigation' : 'Show admin navigation'}
          title={isMobileNavOpen ? 'Hide navigation' : 'Show navigation'}
        >
          {isMobileNavOpen ? <PanelLeftClose size={16} /> : <PanelLeftOpen size={16} />}
        </button>

        {showDesktopNavToggle ? (
          <button
            type="button"
            className="admin-btn-secondary hidden h-10 w-10 shrink-0 px-0 lg:inline-flex"
            onClick={onToggleDesktopNav}
            aria-label={isDesktopNavVisible ? 'Hide admin navigation' : 'Show admin navigation'}
            title={isDesktopNavVisible ? 'Hide navigation' : 'Show navigation'}
          >
            {isDesktopNavVisible ? <PanelLeftClose size={16} /> : <PanelLeftOpen size={16} />}
          </button>
        ) : null}

        <button
          type="button"
          className="admin-btn-primary shrink-0 gap-2 px-3 py-2"
          onClick={() => navigate('/')}
        >
          <House size={16} />
          <span className="hidden sm:inline">Back to Website</span>
          <span className="sm:hidden">Website</span>
        </button>

        <div className="order-3 ml-auto flex w-full items-center justify-end gap-2 sm:order-none sm:w-auto">
          <div className="inline-flex max-w-[170px] items-center rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 sm:max-w-[220px]">
            <span className="truncate font-semibold">{user?.displayName || user?.email || 'Admin'}</span>
          </div>

          <button
            type="button"
            className="admin-btn-secondary whitespace-nowrap px-3 py-2"
            onClick={logout}
          >
            Sign Out
          </button>
        </div>
      </div>
    </header>
  );
}
