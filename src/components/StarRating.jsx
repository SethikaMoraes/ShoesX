import { Star } from 'lucide-react';

export default function StarRating({
  value = 0,
  onChange,
  max = 5,
  readOnly = false,
  size = 18,
  className = '',
}) {
  const safeValue = Number(value) || 0;
  const stars = Array.from({ length: max }, (_, index) => index + 1);

  return (
    <div className={`inline-flex items-center gap-1 ${className}`}>
      {stars.map((star) => {
        const active = star <= safeValue;
        if (readOnly) {
          return (
            <Star
              key={star}
              size={size}
              className={active ? 'fill-amber-400 text-amber-400' : 'text-slate-300 dark:text-slate-600'}
              aria-hidden="true"
            />
          );
        }

        return (
          <button
            key={star}
            type="button"
            onClick={() => onChange?.(star)}
            className="rounded p-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500"
            aria-label={`Rate ${star} star${star > 1 ? 's' : ''}`}
          >
            <Star
              size={size}
              className={active ? 'fill-amber-400 text-amber-400' : 'text-slate-300 dark:text-slate-600'}
              aria-hidden="true"
            />
          </button>
        );
      })}
    </div>
  );
}
