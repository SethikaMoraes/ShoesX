import { useMemo, useState } from 'react';
import { useProducts } from '../../context/ProductsContext';
import { formatCurrency, generateProductId } from '../../data/products';

const MODEL_CHOICES = [
  { label: 'Sneaker Model', value: '/models/shoe.glb' },
  { label: 'Formal Model', value: '/models/formal.glb' },
  { label: 'Running Model', value: '/models/court.glb' },
  { label: 'Sport Model', value: '/models/trail.glb' },
];

const emptyForm = {
  id: '',
  name: '',
  priceNum: '',
  category: 'Running',
  fitScore: '',
  sizes: 'UK 6-11',
  colors: '',
  description: '',
  shortDescription: '',
  image: '',
  imageLinks: [''],
  cardImage: '',
  badge: '',
  logistics: '',
  modelUrl: '/models/shoe.glb',
};

const parseImageList = (value) =>
  Array.from(
    new Set(
      (Array.isArray(value) ? value : String(value || '').split(/\r?\n|,/))
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  );

export default function AdminProducts() {
  const { products, addProduct, updateProduct, deleteProduct, resetProducts } = useProducts();
  const [formMode, setFormMode] = useState('create');
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState('');

  const summary = useMemo(() => {
    const avgFitScore =
      products.length === 0
        ? 0
        : products.reduce((sum, item) => sum + (Number(item.fitScore) || 0), 0) / products.length;

    const counts = products.reduce((acc, item) => {
      const key = item.category || 'Other';
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    const topCategory = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';
    return {
      count: products.length,
      avgFitScore: avgFitScore.toFixed(0),
      topCategory,
    };
  }, [products]);

  const beginEdit = (product) => {
    setFormError('');
    setFormMode('edit');
    const imageList = Array.from(
      new Set([product.image, ...(Array.isArray(product.images) ? product.images : [])].filter(Boolean)),
    );
    const primaryImage = String(product.image || imageList[0] || '').trim();
    const additionalImages = imageList.filter((imageUrl) => String(imageUrl).trim() !== primaryImage);
    setForm({
      id: product.id,
      name: product.name,
      priceNum: String(product.priceNum || ''),
      category: product.category,
      fitScore: String(product.fitScore || ''),
      sizes: String(product.sizes || ''),
      colors: (product.colors || []).join(', '),
      description: product.description || '',
      shortDescription: product.shortDescription || '',
      image: primaryImage,
      imageLinks: additionalImages.length > 0 ? additionalImages : [''],
      cardImage: product.cardImage || '',
      badge: product.badge || '',
      logistics: (product.logistics || []).join(', '),
      modelUrl: product.modelUrl || '/models/shoe.glb',
    });
  };

  const resetForm = () => {
    setFormError('');
    setFormMode('create');
    setForm(emptyForm);
  };

  const inputClass = 'admin-input';

  return (
    <div className="space-y-6">
      <section className="admin-surface">
        <h1 className="text-2xl font-bold sm:text-3xl">Products</h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">Manage product catalog entries, visuals, fit details, and 3D models.</p>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <article className="admin-surface p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Total Products</p>
          <p className="mt-2 text-3xl font-bold">{summary.count}</p>
        </article>
        <article className="admin-surface p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Avg Fit Score</p>
          <p className="mt-2 text-3xl font-bold">{summary.avgFitScore}%</p>
        </article>
        <article className="admin-surface p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Top Category</p>
          <p className="mt-2 text-3xl font-bold">{summary.topCategory}</p>
        </article>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.2fr_1fr]">
        <article className="admin-surface">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-xl font-semibold">Catalog</h2>
            <button
              type="button"
              className="admin-btn-secondary px-3 py-2"
              onClick={async () => {
                try {
                  await resetProducts();
                } catch (error) {
                  setFormError(error.message || 'Unable to reset products.');
                }
              }}
            >
              Reset Defaults
            </button>
          </div>

          {products.length === 0 ? (
            <p className="text-sm text-slate-600 dark:text-slate-300">No products available.</p>
          ) : (
            <>
              <div className="space-y-3 md:hidden">
                {products.map((product) => (
                  <article key={product.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/50">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <p className="font-semibold text-slate-900 dark:text-slate-100">{product.name}</p>
                      <span className="rounded-full border border-slate-300 bg-white px-2 py-0.5 text-xs font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
                        {product.category}
                      </span>
                    </div>
                    <div className="mt-2 flex items-center justify-between text-sm">
                      <span className="text-slate-600 dark:text-slate-300">Price</span>
                      <span className="font-semibold text-slate-900 dark:text-slate-100">{formatCurrency(product.priceNum)}</span>
                    </div>
                    <div className="mt-1 flex items-center justify-between text-sm">
                      <span className="text-slate-600 dark:text-slate-300">Fit score</span>
                      <span className="font-semibold text-slate-900 dark:text-slate-100">{product.fitScore}%</span>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        className="admin-btn-secondary px-3 py-2 text-xs"
                        onClick={() => beginEdit(product)}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="rounded-xl border border-rose-300 px-3 py-2 text-xs font-semibold text-rose-700 transition hover:bg-rose-50 dark:border-rose-800 dark:text-rose-300 dark:hover:bg-rose-900/25"
                        onClick={async () => {
                          try {
                            await deleteProduct(product.id);
                          } catch (error) {
                            setFormError(error.message || 'Unable to delete product.');
                          }
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  </article>
                ))}
              </div>

              <div className="hidden overflow-x-auto md:block">
                <table className="min-w-[760px] text-left text-sm">
                  <thead>
                    <tr className="bg-cyan-700 text-white dark:bg-cyan-600 dark:text-white">
                      <th className="px-3 py-2 font-semibold">Name</th>
                      <th className="px-3 py-2 font-semibold">Category</th>
                      <th className="px-3 py-2 font-semibold">Price</th>
                      <th className="px-3 py-2 font-semibold">Fit</th>
                      <th className="px-3 py-2 font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {products.map((product) => (
                      <tr key={product.id} className="border-b border-slate-100 text-slate-700 dark:border-slate-800 dark:text-slate-200">
                        <td className="px-3 py-2 font-semibold">{product.name}</td>
                        <td className="px-3 py-2">{product.category}</td>
                        <td className="px-3 py-2">{formatCurrency(product.priceNum)}</td>
                        <td className="px-3 py-2">{product.fitScore}%</td>
                        <td className="px-3 py-2">
                          <div className="flex gap-2">
                            <button
                              type="button"
                              className="admin-btn-secondary px-3 py-1 text-xs"
                              onClick={() => beginEdit(product)}
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              className="rounded-xl border border-rose-300 px-3 py-1 text-xs font-semibold text-rose-700 transition hover:bg-rose-50 dark:border-rose-800 dark:text-rose-300 dark:hover:bg-rose-900/25"
                              onClick={async () => {
                                try {
                                  await deleteProduct(product.id);
                                } catch (error) {
                                  setFormError(error.message || 'Unable to delete product.');
                                }
                              }}
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </article>

        <article className="admin-surface">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-xl font-semibold">{formMode === 'edit' ? 'Edit Product' : 'Add Product'}</h2>
            {formMode === 'edit' ? (
              <button
                type="button"
                className="admin-btn-secondary px-3 py-2"
                onClick={resetForm}
              >
                Cancel
              </button>
            ) : null}
          </div>

          {formError ? <p className="mb-3 text-sm text-rose-600">{formError}</p> : null}

          <form
            className="grid gap-4"
            onSubmit={async (event) => {
              event.preventDefault();
              setFormError('');

              const imageInput = String(form.image || '').trim();
              const galleryList = parseImageList(form.imageLinks);
              if (!imageInput) {
                setFormError('At least one product image is required.');
                return;
              }

              if (/logo\.png$/i.test(imageInput)) {
                setFormError('Please provide a product image URL, not the site logo.');
                return;
              }

              const fallbackId = formMode === 'edit' ? form.id : generateProductId(form.name);
              const payload = {
                ...form,
                id: String(form.id || fallbackId),
                image: imageInput,
                images: Array.from(new Set([imageInput, ...galleryList])),
                cardImage: String(form.cardImage || '').trim(),
                modelUrl: String(form.modelUrl || '/models/shoe.glb').trim(),
                colors: form.colors,
                logistics: form.logistics,
              };

              try {
                if (formMode === 'edit') {
                  await updateProduct(form.id, payload);
                } else {
                  await addProduct(payload);
                }
              } catch (error) {
                setFormError(error.message || 'Unable to save product.');
                return;
              }

              resetForm();
            }}
          >
            <label>
              <span className="admin-label">Name</span>
              <input
                required
                className={inputClass}
                value={form.name}
                onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
              />
            </label>

            <div className="grid gap-3 sm:grid-cols-2">
              <label>
                <span className="admin-label">Price ($)</span>
                <input
                  className={inputClass}
                  type="number"
                  min="0"
                  required
                  value={form.priceNum}
                  onChange={(event) => setForm((current) => ({ ...current, priceNum: event.target.value }))}
                />
              </label>
              <label>
                <span className="admin-label">Category</span>
                <select
                  className={inputClass}
                  value={form.category}
                  onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))}
                >
                  <option value="Running">Running</option>
                  <option value="Sport">Sport</option>
                  <option value="Formal">Formal</option>
                  <option value="Sneaker">Sneaker</option>
                </select>
              </label>
            </div>

            <label>
              <span className="admin-label">Fit Score</span>
              <input
                className={inputClass}
                type="number"
                min="0"
                max="100"
                value={form.fitScore}
                onChange={(event) => setForm((current) => ({ ...current, fitScore: event.target.value }))}
              />
            </label>

            <label>
              <span className="admin-label">Sizes (example: UK 6-11)</span>
              <input
                className={inputClass}
                value={form.sizes}
                onChange={(event) => setForm((current) => ({ ...current, sizes: event.target.value }))}
              />
            </label>

            <label>
              <span className="admin-label">Description</span>
              <textarea
                className={`${inputClass} min-h-24`}
                value={form.description}
                onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
              />
            </label>

            <label>
              <span className="admin-label">Image URL</span>
              <input
                required
                className={inputClass}
                value={form.image}
                onChange={(event) => setForm((current) => ({ ...current, image: event.target.value }))}
                placeholder="/assets/your-image.webp"
              />
            </label>

            <div>
              <span className="admin-label">Additional Image Links</span>
              <div className="mt-2 space-y-2">
                {(form.imageLinks || []).map((imageLink, index) => (
                  <div key={`${form.id || 'new'}-image-link-${index}`} className="flex gap-2">
                    <input
                      className={inputClass}
                      value={imageLink}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          imageLinks: (current.imageLinks || []).map((value, valueIndex) =>
                            valueIndex === index ? event.target.value : value,
                          ),
                        }))
                      }
                      placeholder="https://.../photo.jpg"
                    />
                    <button
                      type="button"
                      className="admin-btn-secondary px-3 py-2"
                      onClick={() =>
                        setForm((current) => {
                          const next = (current.imageLinks || []).filter((_, valueIndex) => valueIndex !== index);
                          return {
                            ...current,
                            imageLinks: next.length > 0 ? next : [''],
                          };
                        })
                      }
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
              <button
                type="button"
                className="admin-btn-secondary mt-2 px-3 py-2"
                onClick={() =>
                  setForm((current) => ({
                    ...current,
                    imageLinks: [...(current.imageLinks || []), ''],
                  }))
                }
              >
                Add image link
              </button>
            </div>

            <label>
              <span className="admin-label">Card Image URL (optional)</span>
              <input
                className={inputClass}
                value={form.cardImage}
                onChange={(event) => setForm((current) => ({ ...current, cardImage: event.target.value }))}
              />
            </label>

            <label>
              <span className="admin-label">3D Model</span>
              <select
                className={inputClass}
                value={form.modelUrl}
                onChange={(event) => setForm((current) => ({ ...current, modelUrl: event.target.value }))}
              >
                {MODEL_CHOICES.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <div className="grid gap-3 sm:grid-cols-2">
              <label>
                <span className="admin-label">Badge</span>
                <input
                  className={inputClass}
                  value={form.badge}
                  onChange={(event) => setForm((current) => ({ ...current, badge: event.target.value }))}
                />
              </label>
              <label>
                <span className="admin-label">Logistics (comma separated)</span>
                <input
                  className={inputClass}
                  value={form.logistics}
                  onChange={(event) => setForm((current) => ({ ...current, logistics: event.target.value }))}
                />
              </label>
            </div>

            <button
              type="submit"
              className="admin-btn-primary w-full"
            >
              {formMode === 'edit' ? 'Save Changes' : 'Create Product'}
            </button>
          </form>
        </article>
      </section>
    </div>
  );
}
