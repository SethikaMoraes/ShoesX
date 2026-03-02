import { Link } from 'react-router-dom';

export default function ReturnPolicy() {
  return (
    <div className="space-y-6">
      <section className="panel bg-gradient-to-r from-slate-900 to-cyan-900 text-white">
        <h1 className="text-3xl font-bold">Return Policy</h1>
        <p className="mt-2 max-w-3xl text-sm text-cyan-100">
          ShoesX offers a straightforward return process to keep shopping risk-free.
        </p>
      </section>

      <section className="panel space-y-4">
        <h2 className="text-xl font-semibold">Return Window</h2>
        <p className="text-sm text-slate-700 dark:text-slate-300">
          Returns are accepted within 30 days from the delivery date. Requests submitted after this period may not be
          eligible.
        </p>
      </section>

      <section className="panel space-y-4">
        <h2 className="text-xl font-semibold">Condition Requirements</h2>
        <ul className="list-disc space-y-2 pl-5 text-sm text-slate-700 dark:text-slate-300">
          <li>Items must be unworn and in original condition.</li>
          <li>Original packaging and tags should be included.</li>
          <li>Proof of purchase or order ID is required.</li>
        </ul>
      </section>

      <section className="panel space-y-4">
        <h2 className="text-xl font-semibold">How to Initiate a Return</h2>
        <ol className="list-decimal space-y-2 pl-5 text-sm text-slate-700 dark:text-slate-300">
          <li>Go to Order Status and locate your order.</li>
          <li>Contact support with your order ID and return reason.</li>
          <li>Follow the return instructions sent by our team.</li>
        </ol>
        <div className="flex flex-wrap gap-2">
          <Link to="/order-status" className="btn-secondary">
            Track Order
          </Link>
          <Link to="/contact" className="btn-primary">
            Start a Return
          </Link>
        </div>
      </section>

      <section className="panel space-y-4">
        <h2 className="text-xl font-semibold">Exchanges</h2>
        <p className="text-sm text-slate-700 dark:text-slate-300">
          Exchanges are available based on stock availability. If the requested size or style is unavailable, a refund
          can be issued instead.
        </p>
      </section>

      <section className="panel space-y-4">
        <h2 className="text-xl font-semibold">Refund Timeline</h2>
        <p className="text-sm text-slate-700 dark:text-slate-300">
          Once a return is inspected and approved, refunds are typically processed within 5 to 10 business days to the
          original payment method.
        </p>
      </section>

      <section className="panel space-y-4">
        <h2 className="text-xl font-semibold">Shipping Cost Rules</h2>
        <ul className="list-disc space-y-2 pl-5 text-sm text-slate-700 dark:text-slate-300">
          <li>Defective or incorrect items: return shipping is covered by ShoesX.</li>
          <li>Size or preference changes: return shipping may be deducted from refund totals.</li>
          <li>Original shipping charges are non-refundable unless required by law.</li>
        </ul>
      </section>

      <section className="panel space-y-4">
        <h2 className="text-xl font-semibold">Exceptions</h2>
        <p className="text-sm text-slate-700 dark:text-slate-300">
          Final-sale items, heavily worn items, and returns missing original packaging may be declined.
        </p>
      </section>
    </div>
  );
}
