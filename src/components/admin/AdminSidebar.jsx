import { Boxes, CircleHelp, ClipboardList, House, MessageSquareText, PanelLeftClose, Users } from 'lucide-react';
import { NavLink } from 'react-router-dom';

const items = [
  { to: '/admin/dashboard', label: 'Dashboard', icon: House },
  { to: '/admin/products', label: 'Products', icon: Boxes },
  { to: '/admin/orders', label: 'Orders', icon: ClipboardList },
  { to: '/admin/chat', label: 'Live Chat', icon: MessageSquareText },
  { to: '/admin/users', label: 'Users', icon: Users },
  { to: '/admin/faq', label: 'FAQ', icon: CircleHelp },
];

export default function AdminSidebar({ onToggleNav, mobile = false }) {
  return (
    <aside className="h-full border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950 lg:border-b-0 lg:border-r">
      <div className="px-4 py-4 sm:px-5 sm:py-6 lg:px-5 lg:py-7">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3">
            <img src="/assets/logo.png" alt="ShoesX" className="h-10 w-10 rounded-lg object-contain" />
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-700 dark:text-cyan-300">ShoesX</p>
              <h1 className="mt-1 text-lg font-bold text-slate-900 dark:text-slate-100 sm:text-xl">Admin Panel</h1>
            </div>
          </div>
          {typeof onToggleNav === 'function' ? (
            <button
              type="button"
              className={`admin-btn-secondary h-10 w-10 px-0 ${mobile ? 'inline-flex' : 'hidden lg:inline-flex'}`}
              onClick={onToggleNav}
              aria-label={mobile ? 'Close admin navigation' : 'Hide admin navigation'}
              title={mobile ? 'Close navigation' : 'Hide navigation'}
            >
              <PanelLeftClose size={16} />
            </button>
          ) : null}
        </div>
      </div>

      <nav className="flex flex-col gap-3 px-3 pb-5 lg:px-4">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `inline-flex w-full items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition ${
                  isActive
                    ? 'border-cyan-600 bg-cyan-600 text-white shadow-sm dark:border-cyan-500 dark:bg-cyan-500 dark:text-slate-950'
                    : 'border-transparent bg-transparent text-slate-700 hover:border-slate-200 hover:bg-slate-100 dark:text-slate-300 dark:hover:border-slate-700 dark:hover:bg-slate-900'
                }`
              }
            >
              <Icon size={17} aria-hidden="true" />
              {item.label}
            </NavLink>
          );
        })}
      </nav>
    </aside>
  );
}
