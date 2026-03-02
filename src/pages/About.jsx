import { Link } from 'react-router-dom';

export default function About() {
  return (
    <div className="space-y-6">
      <section className="panel bg-gradient-to-r from-slate-900 to-cyan-900 text-white">
        <h1 className="text-3xl font-bold">About ShoesX</h1>
        <p className="mt-2 max-w-3xl text-sm text-cyan-100">
          ShoesX is built to make footwear shopping simpler, faster, and more reliable for every customer.
        </p>
      </section>

      <section className="panel space-y-4">
        <h2 className="text-xl font-semibold">Who We Are</h2>
        <p className="text-sm text-slate-700 dark:text-slate-300">
          ShoesX is a fit-first e-commerce experience focused on helping shoppers find the right pair with less
          guesswork. We combine clean product data, practical size guidance, and transparent order updates.
        </p>
        <p className="text-sm text-slate-700 dark:text-slate-300">
          Our platform is designed for a smooth browsing flow across products, favourites, cart, profile, and
          fit assurance tools.
        </p>
      </section>

      <section className="panel space-y-4">
        <h2 className="text-xl font-semibold">What We Prioritize</h2>
        <ul className="list-disc space-y-2 pl-5 text-sm text-slate-700 dark:text-slate-300">
          <li>Clear product details with reliable pricing, sizing, and category tags.</li>
          <li>Fit guidance that reduces return risk and improves purchase confidence.</li>
          <li>Simple account and order flows that are easy to use on mobile and desktop.</li>
          <li>Incremental improvements based on real user feedback.</li>
        </ul>
      </section>

      <section className="panel space-y-4">
        <h2 className="text-xl font-semibold">How We Improve</h2>
        <p className="text-sm text-slate-700 dark:text-slate-300">
          We actively collect feedback, review common support requests, and keep refining core journeys like product
          discovery, checkout, and post-order tracking.
        </p>
        <div className="flex flex-wrap gap-2">
          <Link to="/products" className="btn-primary">
            Explore Products
          </Link>
          <Link to="/feedback" className="btn-secondary">
            Share Feedback
          </Link>
        </div>
      </section>
    </div>
  );
}
