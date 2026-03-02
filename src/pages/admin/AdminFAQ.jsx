import { useCallback, useEffect, useState } from 'react';
import { createFaq, deleteFaq, getAdminFaqs, updateFaq } from '../../lib/faqService';

const emptyDraft = {
  question: '',
  answer: '',
  isPublished: true,
  sortOrder: 0,
};

const normalizeError = (error, fallback) => {
  const message = String(error?.message || '').trim();
  return message || fallback;
};

export default function AdminFAQ() {
  const [faqs, setFaqs] = useState([]);
  const [draft, setDraft] = useState(emptyDraft);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(false);
  const [savingId, setSavingId] = useState('');
  const [deletingId, setDeletingId] = useState('');

  const loadFaqs = useCallback(async (searchTerm = '') => {
    setLoading(true);
    setError('');
    try {
      const data = await getAdminFaqs(searchTerm);
      setFaqs(data);
    } catch (loadError) {
      setError(normalizeError(loadError, 'Unable to load FAQ entries.'));
      setFaqs([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadFaqs(search);
    }, 250);

    return () => clearTimeout(timer);
  }, [loadFaqs, search]);

  const handleCreate = async (event) => {
    event.preventDefault();
    setCreating(true);
    setError('');

    try {
      const createdFaq = await createFaq(draft);
      setFaqs((current) => [...current, createdFaq].sort((a, b) => a.sortOrder - b.sortOrder));
      setDraft(emptyDraft);
    } catch (createError) {
      setError(normalizeError(createError, 'Unable to create FAQ entry.'));
    } finally {
      setCreating(false);
    }
  };

  const handleLocalFaqChange = (id, key, value) => {
    setFaqs((current) =>
      current.map((item) =>
        item.id === id
          ? {
              ...item,
              [key]: key === 'sortOrder' ? Number(value || 0) : value,
            }
          : item,
      ),
    );
  };

  const handleSave = async (faq) => {
    if (!faq?.id) return;

    setSavingId(faq.id);
    setError('');
    try {
      const updatedFaq = await updateFaq(faq.id, faq);
      setFaqs((current) =>
        current
          .map((item) => (item.id === faq.id ? updatedFaq : item))
          .sort((a, b) => a.sortOrder - b.sortOrder),
      );
    } catch (saveError) {
      setError(normalizeError(saveError, 'Unable to save FAQ changes.'));
    } finally {
      setSavingId('');
    }
  };

  const handleDelete = async (faqId) => {
    if (!faqId) return;
    const confirmed = window.confirm('Delete this FAQ entry?');
    if (!confirmed) return;

    setDeletingId(faqId);
    setError('');
    try {
      await deleteFaq(faqId);
      setFaqs((current) => current.filter((item) => item.id !== faqId));
    } catch (deleteError) {
      setError(normalizeError(deleteError, 'Unable to delete FAQ entry.'));
    } finally {
      setDeletingId('');
    }
  };

  return (
    <div className="space-y-6">
      <section className="panel">
        <h1 className="text-2xl font-bold sm:text-3xl">FAQ</h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
          Create and manage frequently asked questions published to the customer FAQ page.
        </p>
      </section>

      <section className="panel">
        <h2 className="text-xl font-semibold">Add FAQ</h2>
        <form className="mt-4 grid gap-3" onSubmit={handleCreate}>
          <label>
            <span className="label">Question</span>
            <input
              className="input"
              required
              value={draft.question}
              onChange={(event) => setDraft((current) => ({ ...current, question: event.target.value }))}
            />
          </label>

          <label>
            <span className="label">Answer</span>
            <textarea
              className="input min-h-28"
              required
              value={draft.answer}
              onChange={(event) => setDraft((current) => ({ ...current, answer: event.target.value }))}
            />
          </label>

          <div className="grid gap-3 sm:grid-cols-[180px_1fr]">
            <label>
              <span className="label">Sort Order</span>
              <input
                className="input"
                type="number"
                min="0"
                value={draft.sortOrder}
                onChange={(event) => setDraft((current) => ({ ...current, sortOrder: Number(event.target.value || 0) }))}
              />
            </label>
            <label className="inline-flex items-center gap-2 pt-8">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-slate-400 text-cyan-600 focus:ring-cyan-500"
                checked={draft.isPublished}
                onChange={(event) => setDraft((current) => ({ ...current, isPublished: event.target.checked }))}
              />
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Published</span>
            </label>
          </div>

          <button type="submit" className="btn-primary w-fit" disabled={creating}>
            {creating ? 'Saving...' : 'Add FAQ'}
          </button>
        </form>
      </section>

      <section className="panel">
        <div className="flex flex-wrap items-center gap-3">
          <input
            className="input w-full sm:max-w-md"
            placeholder="Search question or answer"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
      </section>

      {error ? (
        <section className="panel">
          <p className="text-sm text-rose-600">{error}</p>
        </section>
      ) : null}

      <section className="panel">
        <h2 className="text-xl font-semibold">FAQ Entries</h2>

        {loading ? (
          <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">Loading FAQ entries...</p>
        ) : faqs.length === 0 ? (
          <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">No FAQ entries found.</p>
        ) : (
          <div className="mt-4 space-y-4">
            {faqs.map((faq) => {
              const isSaving = savingId === faq.id;
              const isDeleting = deletingId === faq.id;
              return (
                <article key={faq.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/50">
                  <div className="grid gap-3 md:grid-cols-[1fr_120px_auto]">
                    <label className="md:col-span-1">
                      <span className="label">Question</span>
                      <input
                        className="input"
                        value={faq.question}
                        onChange={(event) => handleLocalFaqChange(faq.id, 'question', event.target.value)}
                      />
                    </label>

                    <label>
                      <span className="label">Sort Order</span>
                      <input
                        className="input"
                        type="number"
                        min="0"
                        value={faq.sortOrder}
                        onChange={(event) => handleLocalFaqChange(faq.id, 'sortOrder', event.target.value)}
                      />
                    </label>

                    <label className="inline-flex items-center gap-2 pt-8">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-slate-400 text-cyan-600 focus:ring-cyan-500"
                        checked={faq.isPublished}
                        onChange={(event) => handleLocalFaqChange(faq.id, 'isPublished', event.target.checked)}
                      />
                      <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Published</span>
                    </label>
                  </div>

                  <label className="mt-3 block">
                    <span className="label">Answer</span>
                    <textarea
                      className="input min-h-24"
                      value={faq.answer}
                      onChange={(event) => handleLocalFaqChange(faq.id, 'answer', event.target.value)}
                    />
                  </label>

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      className="btn-primary w-full px-4 sm:w-auto"
                      disabled={isSaving || isDeleting}
                      onClick={() => handleSave(faq)}
                    >
                      {isSaving ? 'Saving...' : 'Save'}
                    </button>
                    <button
                      type="button"
                      className="btn-secondary w-full px-4 text-rose-700 hover:text-rose-700 dark:text-rose-300 sm:w-auto"
                      disabled={isSaving || isDeleting}
                      onClick={() => handleDelete(faq.id)}
                    >
                      {isDeleting ? 'Deleting...' : 'Delete'}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
