import { useEffect, useState } from 'react';
import { getPublishedFaqs } from '../lib/faqService';

const normalizeError = (error, fallback) => {
  const message = String(error?.message || '').trim();
  return message || fallback;
};

export default function FaqPage() {
  const [faqs, setFaqs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadFaqs = async () => {
      setLoading(true);
      setError('');
      try {
        const data = await getPublishedFaqs();
        setFaqs(data);
      } catch (loadError) {
        setError(normalizeError(loadError, 'Unable to load FAQs right now.'));
      } finally {
        setLoading(false);
      }
    };

    loadFaqs();
  }, []);

  return (
    <div className="space-y-6">
      <section className="panel">
        <h1 className="text-3xl font-bold">Frequently Asked Questions</h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
          Answers to common questions about orders, shipping, returns, and account support.
        </p>
      </section>

      {error ? (
        <section className="panel">
          <p className="text-sm text-rose-600">{error}</p>
        </section>
      ) : null}

      <section className="panel">
        {loading ? (
          <p className="text-sm text-slate-600 dark:text-slate-300">Loading FAQs...</p>
        ) : faqs.length === 0 ? (
          <p className="text-sm text-slate-600 dark:text-slate-300">
            No published FAQs are available yet.
          </p>
        ) : (
          <div className="space-y-3">
            {faqs.map((faq) => (
              <details
                key={faq.id}
                className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm dark:border-slate-800 dark:bg-slate-900/60"
              >
                <summary className="cursor-pointer list-none font-semibold text-slate-900 dark:text-slate-100">
                  {faq.question}
                </summary>
                <p className="mt-2 whitespace-pre-wrap text-slate-700 dark:text-slate-300">{faq.answer}</p>
              </details>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
