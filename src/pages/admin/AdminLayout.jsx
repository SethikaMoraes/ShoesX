import { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import AdminSidebar from '../../components/admin/AdminSidebar';
import AdminTopbar from '../../components/admin/AdminTopbar';

export default function AdminLayout() {
  const location = useLocation();
  const [isNavVisible, setIsNavVisible] = useState(true);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  useEffect(() => {
    setIsMobileNavOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (typeof document === 'undefined') return undefined;
    if (!isMobileNavOpen) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isMobileNavOpen]);

  return (
    <div className="min-h-screen bg-slate-100/80 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <div className={`min-h-screen ${isNavVisible ? 'lg:grid lg:grid-cols-[250px_1fr]' : 'lg:grid lg:grid-cols-1'}`}>
        {isNavVisible ? (
          <div className="hidden lg:block">
            <AdminSidebar onToggleNav={() => setIsNavVisible(false)} />
          </div>
        ) : null}
        <div className="min-w-0">
          <AdminTopbar
            isDesktopNavVisible={isNavVisible}
            onToggleDesktopNav={() => setIsNavVisible((current) => !current)}
            showDesktopNavToggle={!isNavVisible}
            isMobileNavOpen={isMobileNavOpen}
            onToggleMobileNav={() => setIsMobileNavOpen((current) => !current)}
          />
          <main className="px-3 pb-6 pt-4 sm:px-6 sm:pb-8 sm:pt-6 lg:px-8">
            <div className="mx-auto w-full max-w-[1150px]">
              <Outlet />
            </div>
          </main>
        </div>
      </div>

      <div
        className={`fixed inset-0 z-40 bg-slate-950/45 transition-opacity duration-200 lg:hidden ${
          isMobileNavOpen ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
        }`}
        onClick={() => setIsMobileNavOpen(false)}
        aria-hidden="true"
      />
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-[88vw] max-w-[320px] transform overflow-y-auto border-r border-slate-300/80 bg-white shadow-2xl transition-transform duration-200 dark:border-slate-800 dark:bg-slate-950 lg:hidden ${
          isMobileNavOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        aria-label="Admin navigation"
      >
        <AdminSidebar mobile onToggleNav={() => setIsMobileNavOpen(false)} />
      </aside>
    </div>
  );
}
