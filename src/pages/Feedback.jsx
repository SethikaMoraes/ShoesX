import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import StarRating from '../components/StarRating';
import { submitFeedback } from '../lib/firestore';

const SUBJECT_OPTIONS = ['Bug Report', 'Feature Request', 'Order Issue', 'General Feedback'];

const initialForm = {
  subject: SUBJECT_OPTIONS[3],
  message: '',
  rating: 0,
  orderId: '',
};

export default function Feedback() {
  const { user } = useAuth();
  const [form, setForm] = useState(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const onSubmit = async (event) => {
    event.preventDefault();
    setSuccess('');
    setError('');

    const message = String(form.message || '').trim();
    if (message.length < 10) {
      setError('Please enter at least 10 characters in your message.');
      return;
    }

    setSubmitting(true);
    try {
      await submitFeedback({
        userId: user?.uid || '',
        userEmail: user?.email || '',
        subject: form.subject,
        message,
        rating: form.rating,
        orderId: form.orderId,
      });

      setSuccess('Thank you. Your feedback was submitted successfully.');
      setForm(initialForm);
    } catch (submitError) {
      setError(submitError.message || 'Unable to submit feedback right now.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <section className="panel bg-gradient-to-r from-slate-900 to-cyan-900 text-white">
        <h1 className="text-3xl font-bold">Feedback</h1>
        <p className="mt-2 max-w-3xl text-sm text-cyan-100">
          Share bugs, ideas, or order concerns so we can keep improving ShoesX.
        </p>
      </section>

      <section className="panel space-y-4">
        <h2 className="text-xl font-semibold">Send Feedback</h2>

        {success ? <p className="text-sm text-emerald-600">{success}</p> : null}
        {error ? <p className="text-sm text-rose-600">{error}</p> : null}

        <form className="space-y-4" onSubmit={onSubmit}>
          <label>
            <span className="label">Subject</span>
            <select
              className="input"
              value={form.subject}
              onChange={(event) => setForm((current) => ({ ...current, subject: event.target.value }))}
            >
              {SUBJECT_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span className="label">Message</span>
            <textarea
              required
              minLength={10}
              className="input min-h-28"
              value={form.message}
              onChange={(event) => setForm((current) => ({ ...current, message: event.target.value }))}
              placeholder="Tell us what happened or what you would like to see improved."
            />
          </label>

          <label>
            <span className="label">Overall Site Experience (optional)</span>
            <div className="mt-2">
              <StarRating value={form.rating} onChange={(value) => setForm((current) => ({ ...current, rating: value }))} />
            </div>
          </label>

          <label>
            <span className="label">Order ID (optional)</span>
            <input
              className="input"
              value={form.orderId}
              onChange={(event) => setForm((current) => ({ ...current, orderId: event.target.value }))}
              placeholder="Example: SX-ABC123"
            />
          </label>

          <button type="submit" className="btn-primary" disabled={submitting}>
            {submitting ? 'Submitting...' : 'Submit Feedback'}
          </button>
        </form>
      </section>
    </div>
  );
}
