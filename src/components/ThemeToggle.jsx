import { useSite } from '../context/SiteContext';
import { Moon, Sun } from 'lucide-react';

export default function ThemeToggle({ className = '' }) {
  const { theme, toggleTheme } = useSite();
  const isDark = theme === 'dark';

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={`btn-secondary px-3 ${className}`.trim()}
      aria-label="Toggle theme"
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {isDark ? <Sun size={18} aria-hidden="true" /> : <Moon size={18} aria-hidden="true" />}
    </button>
  );
}
