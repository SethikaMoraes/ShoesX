import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import ProductCard from '../components/ProductCard';
import StarRating from '../components/StarRating';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useProducts } from '../context/ProductsContext';
import { useSite } from '../context/SiteContext';
import { formatCurrency, getProductSizeOptions, PRODUCT_IMAGE_PLACEHOLDER } from '../data/products';
import { getProductRatingStats, submitProductRating } from '../lib/firestore';

const FALLBACK_IMAGE = PRODUCT_IMAGE_PLACEHOLDER;

const recommendSize = (sizes, measurements) => {
  if (!sizes.length) return '';
  if (!measurements || !measurements.length) return sizes[Math.floor(sizes.length / 2)];

  const length = Number(measurements.length);
  if (!Number.isFinite(length) || length <= 0) return sizes[Math.floor(sizes.length / 2)];

  const index = Math.max(0, Math.min(sizes.length - 1, Math.round((length - 22) / 0.8)));
  return sizes[index];
};

const idsMatch = (productId, routeId) => String(productId) === String(routeId);

const getGalleryImages = (product) => {
  const list = [
    product?.image,
    ...(Array.isArray(product?.images) ? product.images : []),
    product?.cardImage,
    product?.imageUrl,
  ]
    .map((item) => String(item || '').trim())
    .filter(Boolean);

  return Array.from(new Set(list));
};

const getImage = (product) => getGalleryImages(product)[0] || FALLBACK_IMAGE;

const getDescription = (product) => {
  const text = String(product?.description || '').trim();
  return text || 'Detailed information for this product will be available soon.';
};

const resolve3DModelUrl = (product) => {
  const direct = String(product?.modelUrl || '').trim();
  if (direct) return direct;

  const category = String(product?.category || '').toLowerCase();
  const name = String(product?.name || '').toLowerCase();

  if (category.includes('formal') || name.includes('formal') || name.includes('oxford')) return '/models/formal.glb';
  if (category.includes('trail') || name.includes('trail')) return '/models/trail.glb';
  if (category.includes('court') || name.includes('court')) return '/models/court.glb';
  if (category.includes('running') || category.includes('sport')) return '/models/shoe.glb';

  return '/models/shoe.glb';
};

const formatDate = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
};

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAuthenticated } = useAuth();
  const { products } = useProducts();
  const { addToCart } = useCart();
  const { addSizeHistory, measurements } = useSite();

  const [ratingValue, setRatingValue] = useState(0);
  const [reviewText, setReviewText] = useState('');
  const [ratingStats, setRatingStats] = useState({ averageRating: 0, ratingCount: 0, ratings: [] });
  const [ratingsLoading, setRatingsLoading] = useState(false);
  const [ratingSubmitting, setRatingSubmitting] = useState(false);
  const [ratingNotice, setRatingNotice] = useState('');
  const [ratingError, setRatingError] = useState('');
  const [show3DModal, setShow3DModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState('');

  const routeId = useMemo(() => {
    try {
      return decodeURIComponent(id || '');
    } catch {
      return id || '';
    }
  }, [id]);

  const product = useMemo(
    () => products.find((item) => idsMatch(item.id, routeId)) || null,
    [products, routeId],
  );

  const availableSizes = useMemo(() => getProductSizeOptions(product), [product]);
  const galleryImages = useMemo(() => getGalleryImages(product), [product]);

  const [selectedSize, setSelectedSize] = useState(() => availableSizes[0] || 'UK 8');
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    setSelectedSize(availableSizes[0] || 'UK 8');
    setQuantity(1);
  }, [routeId, availableSizes]);

  useEffect(() => {
    setSelectedImage(galleryImages[0] || getImage(product));
  }, [routeId, galleryImages, product]);

  useEffect(() => {
    if (!show3DModal) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setShow3DModal(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [show3DModal]);

  useEffect(() => {
    if (!product?.id) {
      setRatingStats({ averageRating: 0, ratingCount: 0, ratings: [] });
      return;
    }

    let active = true;

    const loadRatings = async () => {
      setRatingsLoading(true);
      try {
        const stats = await getProductRatingStats(product.id);
        if (!active) return;

        setRatingStats(stats);

        if (user?.uid) {
          const existing = stats.ratings.find((entry) => String(entry.userId) === String(user.uid));
          if (existing) {
            setRatingValue(Number(existing.rating) || 0);
            setReviewText(String(existing.reviewText || ''));
          } else {
            setRatingValue(0);
            setReviewText('');
          }
        } else {
          setRatingValue(0);
          setReviewText('');
        }
      } catch {
        if (active) {
          setRatingStats({ averageRating: 0, ratingCount: 0, ratings: [] });
        }
      } finally {
        if (active) setRatingsLoading(false);
      }
    };

    loadRatings();
    return () => {
      active = false;
    };
  }, [product?.id, user?.uid]);

  const related = useMemo(() => {
    if (!product) return [];
    return products
      .filter(
        (item) =>
          !idsMatch(item.id, product.id) &&
          String(item.category || '').toLowerCase() === String(product.category || '').toLowerCase(),
      )
      .slice(0, 3);
  }, [products, product]);

  const aiSuggestedSize = useMemo(
    () => recommendSize(availableSizes, measurements),
    [availableSizes, measurements],
  );

  const submitRating = async (event) => {
    event.preventDefault();
    setRatingNotice('');
    setRatingError('');

    if (!user?.uid) {
      setRatingError('Please log in to rate this product.');
      return;
    }

    if (ratingValue < 1 || ratingValue > 5) {
      setRatingError('Select a rating between 1 and 5 stars.');
      return;
    }

    setRatingSubmitting(true);
    try {
      const stats = await submitProductRating({
        productId: product.id,
        userId: user.uid,
        userEmail: user.email || '',
        rating: ratingValue,
        reviewText,
      });
      setRatingStats(stats);
      setRatingNotice('Your rating has been saved.');
    } catch (error) {
      setRatingError(error.message || 'Unable to submit rating right now.');
    } finally {
      setRatingSubmitting(false);
    }
  };

  if (!product) {
    return (
      <div className="panel text-center">
        <h1 className="text-xl font-semibold">Product not found</h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">The product you are looking for is unavailable.</p>
        <Link to="/products" className="btn-primary mt-4">
          Continue Shopping
        </Link>
      </div>
    );
  }

  const image = selectedImage || getImage(product);
  const description = getDescription(product);
  const category = product.category || 'Uncategorized';
  const name = product.name || 'Untitled Product';
  const sizesLabel = String(product.sizes || availableSizes.join(', ') || 'UK 8');
  const modelUrl = resolve3DModelUrl(product);

  return (
    <div className="space-y-8">
      <section className="grid gap-6 lg:grid-cols-2">
        <div className="panel p-4">
          <img
            src={image}
            alt={name}
            className="h-[330px] w-full rounded-2xl bg-white p-4 object-contain sm:h-[410px] lg:h-[460px]"
            onError={(event) => {
              // Previous behavior used the site logo as fallback, which masked broken product image paths.
              // Keep a neutral placeholder instead so product images stay consistent across card and detail pages.
              if (event.currentTarget.src.endsWith(FALLBACK_IMAGE)) return;
              event.currentTarget.src = FALLBACK_IMAGE;
            }}
          />

          {galleryImages.length > 1 ? (
            <div className="mt-3 grid grid-cols-4 gap-2 sm:grid-cols-5">
              {galleryImages.map((galleryImage) => {
                const isActive = galleryImage === image;
                return (
                  <button
                    key={galleryImage}
                    type="button"
                    onClick={() => setSelectedImage(galleryImage)}
                    className={`overflow-hidden rounded-lg border p-1 transition ${
                      isActive
                        ? 'border-cyan-500 bg-cyan-50 dark:bg-cyan-900/30'
                        : 'border-slate-200 hover:border-slate-300 dark:border-slate-700 dark:hover:border-slate-500'
                    }`}
                    aria-label={`View image of ${name}`}
                  >
                    <img
                      src={galleryImage}
                      alt={name}
                      className="h-16 w-full rounded-md bg-white object-contain"
                      onError={(event) => {
                        if (event.currentTarget.src.endsWith(FALLBACK_IMAGE)) return;
                        event.currentTarget.src = FALLBACK_IMAGE;
                      }}
                    />
                  </button>
                );
              })}
            </div>
          ) : null}
        </div>

        <div className="panel space-y-5">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-cyan-600 dark:text-cyan-300">{category}</p>
            <h1 className="mt-2 text-3xl font-bold">{name}</h1>
            <p className="mt-2 text-lg font-semibold text-cyan-600 dark:text-cyan-300">
              {formatCurrency(product.priceNum ?? product.price)}
            </p>
            <div className="mt-2 flex items-center gap-2">
              <StarRating value={Math.round(ratingStats.averageRating)} readOnly />
              <p className="text-sm text-slate-600 dark:text-slate-300">
                {ratingStats.averageRating.toFixed(1)} ({ratingStats.ratingCount} ratings)
              </p>
            </div>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{description}</p>
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">Available sizes: {sizesLabel}</p>
          </div>

          <div>
            <div>
              <p className="mb-2 text-sm font-medium">Select size</p>
              <div className="flex flex-wrap gap-2">
                {availableSizes.map((size) => (
                  <button
                    key={size}
                    type="button"
                    className={`rounded-lg border px-3 py-1.5 text-sm ${
                      selectedSize === size
                        ? 'border-cyan-500 bg-cyan-50 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-200'
                        : 'border-slate-300 dark:border-slate-700'
                    }`}
                    onClick={() => setSelectedSize(size)}
                  >
                    {size}
                  </button>
                ))}
              </div>
              <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                Suggested fit: <strong>{aiSuggestedSize}</strong>
              </p>
            </div>
          </div>

          <div>
            <label className="label" htmlFor="quantity-input">
              Quantity
            </label>
            <input
              id="quantity-input"
              type="number"
              min="1"
              value={quantity}
              onChange={(event) => setQuantity(Math.max(1, Number(event.target.value) || 1))}
              className="input max-w-24"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="btn-primary"
              onClick={() => {
                if (!isAuthenticated) {
                  navigate('/signin', {
                    state: { from: `${location.pathname}${location.search}` },
                  });
                  return;
                }

                const sizeToAdd = selectedSize || availableSizes[0];
                if (!sizeToAdd) return;
                addToCart(product.id, sizeToAdd, quantity);
                addSizeHistory({
                  productId: product.id,
                  productName: name,
                  size: sizeToAdd,
                });
              }}
            >
              Add to cart
            </button>
            <button type="button" className="btn-secondary" onClick={() => setShow3DModal(true)}>
              View in 3D
            </button>
            <Link to="/products" className="btn-secondary">
              Back to products
            </Link>
          </div>
        </div>
      </section>

      {show3DModal ? (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/60 p-4"
          onClick={() => setShow3DModal(false)}
          role="presentation"
        >
          <div
            className="panel w-full max-w-3xl space-y-4 p-4 sm:p-6"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label={`${name} 3D view`}
          >
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-xl font-semibold">3D View</h2>
              <button type="button" className="btn-secondary" onClick={() => setShow3DModal(false)}>
                Close
              </button>
            </div>

            <model-viewer
              src={modelUrl}
              camera-controls
              auto-rotate
              shadow-intensity="1"
              style={{ width: '100%', height: 420 }}
            />
          </div>
        </div>
      ) : null}

      <section className="panel space-y-4">
        <h2 className="text-xl font-semibold">Rate This Product</h2>
        {ratingsLoading ? <p className="text-sm text-slate-600 dark:text-slate-300">Loading ratings...</p> : null}
        {ratingNotice ? <p className="text-sm text-emerald-600">{ratingNotice}</p> : null}
        {ratingError ? <p className="text-sm text-rose-600">{ratingError}</p> : null}

        {!user ? (
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Please log in from the navbar to submit a rating.
          </p>
        ) : (
          <form className="space-y-3" onSubmit={submitRating}>
            <div>
              <p className="label">Your Rating</p>
              <StarRating value={ratingValue} onChange={setRatingValue} />
            </div>

            <label>
              <span className="label">Short Review (optional)</span>
              <textarea
                className="input min-h-24"
                value={reviewText}
                onChange={(event) => setReviewText(event.target.value)}
                placeholder="How did this pair fit and feel?"
              />
            </label>

            <button type="submit" className="btn-primary" disabled={ratingSubmitting}>
              {ratingSubmitting ? 'Saving...' : 'Submit Rating'}
            </button>
          </form>
        )}

        {ratingStats.ratings.length > 0 ? (
          <div className="space-y-2 border-t border-slate-200 pt-3 dark:border-slate-800">
            <h3 className="text-sm font-semibold uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400">
              Recent Reviews
            </h3>
            <ul className="space-y-2">
              {ratingStats.ratings.slice(0, 3).map((entry) => (
                <li key={entry.id} className="rounded-xl border border-slate-200 p-3 dark:border-slate-800">
                  <div className="flex items-center justify-between gap-2">
                    <StarRating value={Number(entry.rating) || 0} readOnly size={16} />
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      {formatDate(entry.createdAt)}
                    </span>
                  </div>
                  {entry.reviewText ? (
                    <p className="mt-2 text-sm text-slate-700 dark:text-slate-300">{entry.reviewText}</p>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </section>

      <section>
        <h2 className="mb-3 text-2xl font-bold">Related shoes</h2>
        {related.length === 0 ? (
          <div className="panel text-sm text-slate-600 dark:text-slate-300">No related products found.</div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {related.map((item) => (
              <ProductCard key={item.id} product={item} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
