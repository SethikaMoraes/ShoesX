import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { submitCustomOrderRequest } from '../lib/firestore';

const SHOE_TYPES = ['Sneaker', 'Running', 'Sport', 'Formal'];

const initialForm = {
  name: '',
  email: '',
  phone: '',
  shoeType: SHOE_TYPES[0],
  size: '',
  preferredColors: '',
  material: '',
  budgetRange: '',
  deliveryTimeline: '',
  inspirationUrl: '',
  designNotes: '',
};

export default function CustomOrder() {
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
    const designNotes = String(form.designNotes || '').trim();

    if (!name || !email || designNotes.length < 20) {
      setError('Please fill name, email, and at least 20 characters for your design details.');
      return;
    }

    setSubmitting(true);
    try {
      await submitCustomOrderRequest({
        userId: user?.uid || '',
        userEmail: user?.email || email,
        name,
        email,
        phone: form.phone,
        shoeType: form.shoeType,
        size: form.size,
        preferredColors: form.preferredColors,
        material: form.material,
        budgetRange: form.budgetRange,
        deliveryTimeline: form.deliveryTimeline,
        inspirationUrl: form.inspirationUrl,
        designNotes,
      });

      setSuccess('Your custom order request has been submitted. Our design team will contact you shortly.');
      setForm((current) => ({
        ...initialForm,
        name: current.name,
        email: current.email,
      }));
    } catch (submitError) {
      setError(submitError.message || 'Unable to submit custom order request right now.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <section className="panel bg-gradient-to-r from-slate-900 to-cyan-900 text-white">
        <h1 className="text-3xl font-bold">Custom Order</h1>
        <p className="mt-2 max-w-3xl text-sm text-cyan-100">
          Tell us your preferred design, colors, and fit details. We will reach out with design options and next
          steps.
        </p>
      </section>

      <section className="panel space-y-4">
        <h2 className="text-xl font-semibold">Request Design Options</h2>

        {success ? <p className="text-sm text-emerald-600">{success}</p> : null}
        {error ? <p className="text-sm text-rose-600">{error}</p> : null}

        <form className="grid gap-4 md:grid-cols-2" onSubmit={handleSubmit}>
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
            <span className="label">Phone (optional)</span>
            <input
              className="input"
              value={form.phone}
              onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))}
            />
          </label>

          <label>
            <span className="label">Shoe Type</span>
            <select
              className="input"
              value={form.shoeType}
              onChange={(event) => setForm((current) => ({ ...current, shoeType: event.target.value }))}
            >
              {SHOE_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span className="label">Preferred Size (optional)</span>
            <input
              className="input"
              placeholder="Example: UK 9"
              value={form.size}
              onChange={(event) => setForm((current) => ({ ...current, size: event.target.value }))}
            />
          </label>

          <label>
            <span className="label">Preferred Colors (optional)</span>
            <input
              className="input"
              placeholder="Example: Black, Silver"
              value={form.preferredColors}
              onChange={(event) => setForm((current) => ({ ...current, preferredColors: event.target.value }))}
            />
          </label>

          <label>
            <span className="label">Material Preference (optional)</span>
            <input
              className="input"
              placeholder="Example: Knit upper, gum sole"
              value={form.material}
              onChange={(event) => setForm((current) => ({ ...current, material: event.target.value }))}
            />
          </label>

          <label>
            <span className="label">Budget Range (optional)</span>
            <input
              className="input"
              placeholder="Example: $150 - $220"
              value={form.budgetRange}
              onChange={(event) => setForm((current) => ({ ...current, budgetRange: event.target.value }))}
            />
          </label>

          <label>
            <span className="label">Desired Delivery Timeline (optional)</span>
            <input
              className="input"
              placeholder="Example: Within 3 weeks"
              value={form.deliveryTimeline}
              onChange={(event) => setForm((current) => ({ ...current, deliveryTimeline: event.target.value }))}
            />
          </label>

          <label>
            <span className="label">Inspiration Link (optional)</span>
            <input
              type="url"
              className="input"
              placeholder="https://..."
              value={form.inspirationUrl}
              onChange={(event) => setForm((current) => ({ ...current, inspirationUrl: event.target.value }))}
            />
          </label>

          <label className="md:col-span-2">
            <span className="label">Design Details</span>
            <textarea
              className="input min-h-32"
              required
              minLength={20}
              placeholder="Describe your custom design idea, fit preferences, and where you plan to wear it."
              value={form.designNotes}
              onChange={(event) => setForm((current) => ({ ...current, designNotes: event.target.value }))}
            />
          </label>

          <div className="md:col-span-2">
            <button type="submit" className="btn-primary" disabled={submitting}>
              {submitting ? 'Submitting...' : 'Submit Custom Order Request'}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
