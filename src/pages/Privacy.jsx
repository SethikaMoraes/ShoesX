import { Link } from 'react-router-dom';

export default function Privacy() {
  return (
    <div className="space-y-6">
      <section className="panel bg-gradient-to-r from-slate-900 to-cyan-900 text-white">
        <h1 className="text-3xl font-bold">Privacy Policy</h1>
        <p className="mt-2 max-w-3xl text-sm text-cyan-100">
          This page explains what data ShoesX collects, how we use it, and the choices available to you.
        </p>
      </section>

      <section className="panel space-y-4">
        <h2 className="text-xl font-semibold">Information We Collect</h2>
        <ul className="list-disc space-y-2 pl-5 text-sm text-slate-700 dark:text-slate-300">
          <li>Account details such as email address and display name.</li>
          <li>Order details like item list, totals, status, and timestamps.</li>
          <li>Support and feedback messages you submit to improve our services.</li>
          <li>Product ratings and reviews shared by authenticated users.</li>
        </ul>
      </section>

      <section className="panel space-y-4">
        <h2 className="text-xl font-semibold">How We Use Data</h2>
        <ul className="list-disc space-y-2 pl-5 text-sm text-slate-700 dark:text-slate-300">
          <li>To deliver purchases and track order progress.</li>
          <li>To personalize fit recommendations and improve catalog quality.</li>
          <li>To answer support requests and resolve account or order issues.</li>
          <li>To monitor reliability, prevent abuse, and protect user accounts.</li>
        </ul>
      </section>

      <section className="panel space-y-4">
        <h2 className="text-xl font-semibold">Your Choices</h2>
        <p className="text-sm text-slate-700 dark:text-slate-300">
          You can update your account information from your profile page. You can also contact us to request data
          updates or ask questions about privacy.
        </p>
        <div className="flex flex-wrap gap-2">
          <Link to="/profile" className="btn-secondary">
            Manage Profile
          </Link>
          <Link to="/contact" className="btn-primary">
            Contact Support
          </Link>
        </div>
      </section>
    </div>
  );
}
