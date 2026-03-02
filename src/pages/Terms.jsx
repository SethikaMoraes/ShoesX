import { Link } from 'react-router-dom';

export default function Terms() {
  return (
    <div className="space-y-6">
      <section className="panel bg-gradient-to-r from-slate-900 to-cyan-900 text-white">
        <h1 className="text-3xl font-bold">Terms of Service</h1>
        <p className="mt-2 max-w-3xl text-sm text-cyan-100">
          These terms govern your use of ShoesX, including account access, purchases, and service use.
        </p>
      </section>

      <section className="panel space-y-4">
        <h2 className="text-xl font-semibold">1. Introduction</h2>
        <p className="text-sm text-slate-700 dark:text-slate-300">
          By using ShoesX, you agree to these Terms of Service and our Privacy Policy. If you do not agree, please
          discontinue use of the website and services.
        </p>
      </section>

      <section className="panel space-y-4">
        <h2 className="text-xl font-semibold">2. Eligibility</h2>
        <p className="text-sm text-slate-700 dark:text-slate-300">
          You must be legally able to enter into a binding agreement to place orders. You are responsible for
          providing accurate information during registration and checkout.
        </p>
      </section>

      <section className="panel space-y-4">
        <h2 className="text-xl font-semibold">3. Account</h2>
        <p className="text-sm text-slate-700 dark:text-slate-300">
          You are responsible for maintaining the confidentiality of your account credentials and for activity under
          your account. Notify ShoesX immediately if you suspect unauthorized access.
        </p>
      </section>

      <section className="panel space-y-4">
        <h2 className="text-xl font-semibold">4. Orders and Payments</h2>
        <p className="text-sm text-slate-700 dark:text-slate-300">
          Product availability, prices, and promotions may change without prior notice. Orders are confirmed only
          after payment authorization and order acceptance.
        </p>
      </section>

      <section className="panel space-y-4">
        <h2 className="text-xl font-semibold">5. Shipping</h2>
        <p className="text-sm text-slate-700 dark:text-slate-300">
          Delivery timelines are estimates and may vary based on destination, carrier performance, and external
          factors. Tracking updates are provided as available.
        </p>
      </section>

      <section className="panel space-y-4">
        <h2 className="text-xl font-semibold">6. Returns</h2>
        <p className="text-sm text-slate-700 dark:text-slate-300">
          Returns are subject to the Return Policy. Items must meet return eligibility requirements before a refund or
          exchange is processed.
        </p>
        <Link to="/returns" className="btn-secondary">
          View Return Policy
        </Link>
      </section>

      <section className="panel space-y-4">
        <h2 className="text-xl font-semibold">7. Prohibited Use</h2>
        <ul className="list-disc space-y-2 pl-5 text-sm text-slate-700 dark:text-slate-300">
          <li>Fraudulent purchases, chargeback abuse, or account impersonation.</li>
          <li>Attempting to disrupt site operations, security, or platform stability.</li>
          <li>Uploading malicious content, scripts, or unauthorized automated traffic.</li>
        </ul>
      </section>

      <section className="panel space-y-4">
        <h2 className="text-xl font-semibold">8. Liability</h2>
        <p className="text-sm text-slate-700 dark:text-slate-300">
          ShoesX is provided on an as-available basis. To the extent permitted by law, ShoesX is not liable for
          indirect or consequential damages resulting from site use, delays, or service interruptions.
        </p>
      </section>

      <section className="panel space-y-4">
        <h2 className="text-xl font-semibold">9. Changes to Terms</h2>
        <p className="text-sm text-slate-700 dark:text-slate-300">
          We may update these terms periodically. Material updates will be reflected on this page with an updated
          effective date.
        </p>
      </section>

      <section className="panel space-y-4">
        <h2 className="text-xl font-semibold">10. Contact</h2>
        <p className="text-sm text-slate-700 dark:text-slate-300">
          For questions about these terms, please contact our support team.
        </p>
        <Link to="/contact" className="btn-primary">
          Contact Us
        </Link>
      </section>
    </div>
  );
}
