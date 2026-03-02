import { Link } from 'react-router-dom';
import { Instagram, MessageCircle, Twitter } from 'lucide-react';

const siteLinks = [
  { title: 'Shop', to: '/products' },
  { title: '3D View', to: '/3d-view' },
  { title: 'Fit Assurance', to: '/fit-assurance' },
  { title: 'Order Status', to: '/order-status' },
];

const supportLinks = [
  { title: 'Contact Us', to: '/contact' },
  { title: 'Terms of Service', to: '/terms' },
  { title: 'Privacy Policy', to: '/privacy' },
  { title: 'Return Policy', to: '/returns' },
];

const blogHighlights = [
  { title: 'How to Pick Running Shoes for Daily Training', to: '/blog' },
  { title: 'AI Fit Scores: What They Mean for Comfort', to: '/blog' },
  { title: 'Shoe Care Basics: Keep Sneakers Fresh Longer', to: '/blog' },
];

const socialLinks = [
  { label: 'Instagram', href: 'https://www.instagram.com', icon: Instagram },
  { label: 'Twitter', href: 'https://www.twitter.com', icon: Twitter },
  { label: 'WhatsApp', href: 'https://wa.me/94760194668', icon: MessageCircle },
];

export default function Footer() {
  return (
    <footer className="border-t border-slate-200/80 bg-white/90 py-10 dark:border-slate-800 dark:bg-slate-950/80">
      <div className="mx-auto grid w-full max-w-7xl gap-8 px-4 sm:grid-cols-2 sm:px-6 lg:grid-cols-3 lg:px-8">
        <section>
          <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-700 dark:text-slate-300">
            Explore
          </h3>
          <ul className="mt-3 space-y-2">
            {siteLinks.map((link) => (
              <li key={link.title}>
                <Link
                  to={link.to}
                  className="text-sm text-slate-700 hover:text-cyan-700 dark:text-slate-200 dark:hover:text-cyan-300"
                >
                  {link.title}
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-700 dark:text-slate-300">
            Support
          </h3>
          <ul className="mt-3 space-y-2">
            {supportLinks.map((link) => (
              <li key={link.title}>
                <Link
                  to={link.to}
                  className="text-sm text-slate-700 hover:text-cyan-700 dark:text-slate-200 dark:hover:text-cyan-300"
                >
                  {link.title}
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-700 dark:text-slate-300">
            Blog
          </h3>
          <ul className="mt-3 space-y-2">
            {blogHighlights.map((post) => (
              <li key={post.title}>
                <Link
                  to={post.to}
                  className="text-sm text-slate-700 hover:text-cyan-700 dark:text-slate-200 dark:hover:text-cyan-300"
                >
                  {post.title}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <div className="mx-auto mt-8 flex w-full max-w-7xl items-center justify-center gap-3 border-t border-slate-200/80 px-4 pt-6 dark:border-slate-800 sm:px-6 lg:px-8">
        {socialLinks.map((item) => {
          const Icon = item.icon;
          return (
            <a
              key={item.label}
              href={item.href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={item.label}
              title={item.label}
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-300 bg-white text-slate-700 transition hover:border-cyan-500 hover:text-cyan-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-cyan-400 dark:hover:text-cyan-300"
            >
              <Icon size={18} aria-hidden="true" />
            </a>
          );
        })}
      </div>
    </footer>
  );
}
