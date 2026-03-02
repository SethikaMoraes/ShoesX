import { Heart } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useFavourites } from '../context/FavouritesContext';
import { formatCurrency, getProductDefaultSize, PRODUCT_IMAGE_PLACEHOLDER } from '../data/products';

const getStatusText = (product) => {
  const explicit = String(product?.status || '').trim();
  if (explicit) return explicit;

  const badge = String(product?.badge || '').trim();
  if (!badge) return '';

  // Keep the Nike-style status position while allowing product data to drive text.
  return badge.toLowerCase().includes('new') ? 'Coming Soon' : badge;
};

const getSubtitle = (product) => {
  const explicit = String(product?.subtitle || '').trim();
  if (explicit) return explicit;
  const category = String(product?.category || '').trim();
  return category ? `${category} Shoes` : "Men's Shoes";
};

function ShopStyleCard({ product }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated } = useAuth();
  const { isFavourite, toggleFavourite } = useFavourites();
  const isLiked = isFavourite(product.id);
  const image = product?.image || PRODUCT_IMAGE_PLACEHOLDER;
  const status = getStatusText(product);
  const subtitle = getSubtitle(product);

  return (
    <article className="group flex h-full flex-col">
      <div className="relative mb-3 overflow-hidden rounded-2xl bg-white">
        <button
          type="button"
          aria-label={isLiked ? 'Remove from favourites' : 'Add to favourites'}
          className="absolute right-3 top-3 z-10 inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-slate-700 shadow-sm transition hover:bg-white dark:bg-slate-900/80 dark:text-slate-200"
          onClick={() => {
            if (!isAuthenticated) {
              navigate('/signin', {
                state: { from: `${location.pathname}${location.search}` },
              });
              return;
            }
            toggleFavourite(product.id);
          }}
        >
          <Heart
            size={18}
            className={isLiked ? 'fill-slate-900 text-slate-900 dark:fill-white dark:text-white' : ''}
          />
        </button>

        <Link to={`/product/${product.id}`} className="block">
          <img
            src={image}
            alt={product.name}
            className="h-72 w-full rounded-lg object-contain p-6 sm:h-80"
            loading="lazy"
            onError={(event) => {
              if (event.currentTarget.src.endsWith(PRODUCT_IMAGE_PLACEHOLDER)) return;
              event.currentTarget.src = PRODUCT_IMAGE_PLACEHOLDER;
            }}
          />
        </Link>
      </div>

      <div className="space-y-1">
        {status ? <p className="text-[15px] font-medium text-orange-600">{status}</p> : null}
        <Link to={`/product/${product.id}`} className="block text-xl font-semibold leading-tight hover:underline">
          {product.name}
        </Link>
        <p className="text-lg text-slate-500 dark:text-slate-400">{subtitle}</p>

        <p className="pt-1 text-xl font-semibold">{formatCurrency(product.priceNum)}</p>
      </div>
    </article>
  );
}

function PanelStyleCard({ product, showDescription = true }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated } = useAuth();
  const { addToCart } = useCart();
  const productId = String(product.id ?? '');
  const image = product?.image || PRODUCT_IMAGE_PLACEHOLDER;

  return (
    <article className="panel flex h-full flex-col p-4">
      <div className="relative mb-3 overflow-hidden rounded-2xl">
        <img
          src={image}
          alt={product.name}
          className="h-52 w-full object-cover"
          loading="lazy"
          onError={(event) => {
            if (event.currentTarget.src.endsWith(PRODUCT_IMAGE_PLACEHOLDER)) return;
            event.currentTarget.src = PRODUCT_IMAGE_PLACEHOLDER;
          }}
        />
        <span className="absolute left-3 top-3 rounded-full bg-slate-950/80 px-2.5 py-1 text-xs font-semibold text-white">
          {product.badge || 'Featured'}
        </span>
      </div>

      <div className="mb-2 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold">{product.name}</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">{product.category}</p>
        </div>
        <span className="text-base font-semibold text-cyan-600 dark:text-cyan-300">
          {formatCurrency(product.priceNum)}
        </span>
      </div>

      {showDescription ? (
        <p className="mb-3 text-sm text-slate-600 dark:text-slate-300">
          {product.shortDescription || product.description}
        </p>
      ) : null}

      <div className="mb-4 mt-auto grid grid-cols-2 gap-2 text-xs text-slate-500 dark:text-slate-400">
        <span className="rounded-lg bg-slate-100 px-2 py-1 dark:bg-slate-800">AI Fit {product.fitScore}%</span>
        <span className="rounded-lg bg-slate-100 px-2 py-1 dark:bg-slate-800">Rating {product.rating}</span>
      </div>

      <div className="flex gap-2">
        <Link to={`/product/${product.id}`} className="btn-secondary flex-1">
          View
        </Link>
        <button
          type="button"
          className="btn-primary flex-1"
          onClick={() => {
            if (!isAuthenticated) {
              navigate('/signin', {
                state: { from: `${location.pathname}${location.search}` },
              });
              return;
            }
            addToCart(productId, getProductDefaultSize(product), 1);
          }}
        >
          Add
        </button>
      </div>
    </article>
  );
}

export default function ProductCard({ product, variant = 'panel', showDescription = true }) {
  if (variant === 'shop') {
    return <ShopStyleCard product={product} />;
  }
  return <PanelStyleCard product={product} showDescription={showDescription} />;
}
