import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <div className="panel mx-auto max-w-xl text-center">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">404</p>
      <h1 className="mt-2 text-3xl font-bold">Page not found</h1>
      <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
        The page you requested is unavailable.
      </p>
      <Link to="/" className="btn-primary mt-4">
        Back home
      </Link>
    </div>
  );
}
