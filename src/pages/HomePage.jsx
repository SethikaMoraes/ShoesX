import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import ProductCard from '../components/ProductCard';
import ThreeDViewSection from '../components/ThreeDViewSection';
import { useCart } from '../context/CartContext';
import { useProducts } from '../context/ProductsContext';

const quickFilters = [
  { label: 'Running', query: '?category=Running' },
  { label: 'Sneaker', query: '?category=Sneaker' },
  { label: 'Formal', query: '?category=Formal' },
  { label: 'Under $150', query: '?price=under-150' },
];

const heroVideos = [
  '/assets/Nike Shoes Ad Motion Graphics A Visual Masterpiece  after effects.mp4',
  '/assets/videoplayback.mp4',
];

export default function HomePage() {
  const { products } = useProducts();
  const { cartCount } = useCart();
  const navigate = useNavigate();
  const featured = products.slice(0, 3);
  const [activeVideoIndex, setActiveVideoIndex] = useState(0);

  const activeVideoSrc = heroVideos[activeVideoIndex] || heroVideos[0];

  const handleHeroVideoEnded = () => {
    if (heroVideos.length <= 1) return;
    setActiveVideoIndex((current) => (current + 1) % heroVideos.length);
  };

  return (
    <div className="space-y-10">
      <section className="overflow-hidden rounded-3xl border border-cyan-200/60 bg-gradient-to-br from-cyan-600 via-sky-600 to-slate-900 p-8 text-white shadow-2xl sm:p-10">
        <div className="grid items-center gap-8 lg:grid-cols-[1.3fr_1fr]">
          <div className="space-y-5">
            <p className="inline-flex rounded-full bg-white/20 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em]">
              ShoesX Collection
            </p>
            <h1 className="text-4xl font-bold leading-tight sm:text-5xl">
              Find the Right Pair for Every Step
            </h1>
            <p className="max-w-xl text-base text-cyan-100 sm:text-lg">
              Shop performance, lifestyle, and trail-ready shoes with confident sizing, smooth checkout,
              and dependable delivery updates.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                to="/products"
                className="btn-primary border border-white/40 bg-white text-cyan-700 hover:bg-cyan-100"
              >
                Shop Collection
              </Link>
              <Link
                to="/fit-assurance"
                className="btn-secondary border-white/40 bg-white/10 text-white hover:bg-white/20"
              >
                Update Measurements
              </Link>
            </div>
          </div>

          <div
            id="three-d-view"
            className="rounded-2xl border border-white/20 bg-slate-950/40 p-4 shadow-glass backdrop-blur"
          >
            <div className="overflow-hidden rounded-xl">
              <video
                key={activeVideoSrc}
                src={activeVideoSrc}
                className="pointer-events-none w-full rounded-xl object-cover"
                style={{ height: 280 }}
                autoPlay
                muted
                playsInline
                loop={heroVideos.length <= 1}
                onEnded={handleHeroVideoEnded}
              >
                Your browser does not support the video tag.
              </video>
            </div>
            <div className="mt-2 flex justify-center gap-2">
              {heroVideos.map((_, index) => (
                <button
                  key={`hero-video-dot-${index}`}
                  type="button"
                  onClick={() => setActiveVideoIndex(index)}
                  className={`h-1.5 w-6 rounded-full transition ${
                    activeVideoIndex === index ? 'bg-white' : 'bg-white/40 hover:bg-white/60'
                  }`}
                  aria-label={`Go to video ${index + 1}`}
                />
              ))}
            </div>
            <p className="mt-3 text-sm text-cyan-100">Watch the sneaker in action before purchase.</p>
          </div>
        </div>
      </section>

      <ThreeDViewSection />

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {quickFilters.map((item) => (
          <button
            key={item.label}
            type="button"
            className="panel text-left transition hover:-translate-y-0.5 hover:border-cyan-400"
            onClick={() => navigate(`/products${item.query}`)}
          >
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{item.label}</p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Browse this collection</p>
          </button>
        ))}
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="panel">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Catalog</p>
          <p className="mt-2 text-3xl font-bold">{products.length}</p>
          <p className="text-sm text-slate-500 dark:text-slate-400">carefully curated shoe styles</p>
        </div>
        <div className="panel">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Cart</p>
          <p className="mt-2 text-3xl font-bold">{cartCount}</p>
          <p className="text-sm text-slate-500 dark:text-slate-400">items ready for checkout</p>
        </div>
        <div className="panel">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Customer Care</p>
          <p className="mt-2 text-3xl font-bold">24/7</p>
          <p className="text-sm text-slate-500 dark:text-slate-400">support for orders and sizing questions</p>
        </div>
      </section>

      <section>
        <div className="mb-4 flex items-end justify-between">
          <div>
            <h2 className="text-2xl font-bold">Featured Picks</h2>
            <p className="text-sm text-slate-600 dark:text-slate-300">Top choices selected from the current catalog.</p>
          </div>
          <Link to="/products" className="btn-secondary">
            View all
          </Link>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {featured.map((product) => (
            <ProductCard key={product.id} product={product} showDescription={false} />
          ))}
        </div>
      </section>
    </div>
  );
}
