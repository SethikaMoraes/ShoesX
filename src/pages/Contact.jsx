import { useEffect, useState } from 'react';
import { Instagram, MessageCircle, Twitter } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { submitContactMessage } from '../lib/firestore';

const TOPICS = [
  'General Inquiry',
  'Order Support',
  'Returns & Refunds',
  'Custom Order Request',
  'Partnership',
  'Technical Issue',
];

const initialForm = {
  topic: TOPICS[0],
  name: '',
  email: '',
  message: '',
};

const socialLinks = [
  { label: 'Instagram', href: 'https://www.instagram.com', icon: Instagram },
  { label: 'Twitter', href: 'https://www.twitter.com', icon: Twitter },
  { label: 'WhatsApp', href: 'https://wa.me/94760194668', icon: MessageCircle },
];

export default function Contact() {
  const { user } = useAuth();
  const [form, setForm] = useState({
    ...initialForm,
    name: user?.displayName || '',
    email: user?.email || '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    setForm((current) => ({
      ...current,
      name: current.name || user?.displayName || '',
      email: current.email || user?.email || '',
    }));
  }, [user?.displayName, user?.email]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setSuccess('');

    const name = String(form.name || '').trim();
    const email = String(form.email || '').trim();
    const message = String(form.message || '').trim();

    if (!name || !email || message.length < 10) {
      setError('Please fill in name, email, and a message of at least 10 characters.');
      return;
    }

    setSubmitting(true);
    try {
      await submitContactMessage({
        userId: user?.uid || '',
        userEmail: user?.email || email,
        topic: form.topic,
        name,
        email,
        message,
      });

      setSuccess('Your message was sent. Our team will get back to you soon.');
      setForm((current) => ({ ...current, message: '', topic: TOPICS[0] }));
    } catch (submitError) {
      setError(submitError.message || 'Unable to send message right now.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <section className="panel bg-gradient-to-r from-slate-900 to-cyan-900 text-white">
        <h1 className="text-3xl font-bold">Contact Us</h1>
        <p className="mt-2 max-w-3xl text-sm text-cyan-100">
          Need help with an order or have a question about ShoesX? Send us a message.
        </p>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <article className="panel space-y-4">
          <h2 className="text-xl font-semibold">Support Details</h2>
          <ul className="space-y-2 text-sm text-slate-700 dark:text-slate-300">
            <li>
              <span className="font-semibold">Email:</span> sethika.moraes@gmail.com
            </li>
            <li>
              <span className="font-semibold">Phone:</span> +94760194668
            </li>
            <li>
              <span className="font-semibold">Location:</span> 120 Market Street,Sri Lanka
            </li>
          </ul>
          <p className="text-sm text-slate-700 dark:text-slate-300">
            Typical response time is within one business day.
          </p>
          <div>
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Follow Us</p>
            <div className="mt-2 flex items-center gap-2">
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
          </div>
          <div className="pt-2">
            <Link to="/custom-order" className="btn-primary">
              Request a Custom Design
            </Link>
          </div>
        </article>

        <article className="panel space-y-4">
          <h2 className="text-xl font-semibold">Send a Message</h2>

          {success ? <p className="text-sm text-emerald-600">{success}</p> : null}
          {error ? <p className="text-sm text-rose-600">{error}</p> : null}

          <form className="space-y-4" onSubmit={handleSubmit}>
            <label>
              <span className="label">Topic</span>
              <select
                className="input"
                value={form.topic}
                onChange={(event) => setForm((current) => ({ ...current, topic: event.target.value }))}
              >
                {TOPICS.map((topic) => (
                  <option key={topic} value={topic}>
                    {topic}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span className="label">Name</span>
              <input
                className="input"
                required
                value={form.name}
                onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
              />
            </label>

            <label>
              <span className="label">Email</span>
              <input
                type="email"
                className="input"
                required
                value={form.email}
                onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
              />
            </label>

            <label>
              <span className="label">Message</span>
              <textarea
                className="input min-h-28"
                required
                minLength={10}
                value={form.message}
                onChange={(event) => setForm((current) => ({ ...current, message: event.target.value }))}
              />
            </label>

            <button type="submit" className="btn-primary" disabled={submitting}>
              {submitting ? 'Sending...' : 'Send Message'}
            </button>
          </form>
        </article>
      </section>
    </div>
  );
}
