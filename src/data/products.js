import { defaultProducts } from './defaultProducts';

export const STORAGE_KEYS = {
  adminSession: 'shoesx_admin_session',
};

export const DEFAULT_PRODUCTS = defaultProducts;
export const PRODUCT_IMAGE_PLACEHOLDER = '/assets/product-placeholder.svg';

const FALLBACK_SIZE = 'UK 8';
const FALLBACK_CATEGORY = 'Sport';
const MODEL_OPTIONS = new Set(['/models/shoe.glb', '/models/formal.glb', '/models/court.glb', '/models/trail.glb']);

const toList = (value) => {
  if (Array.isArray(value)) return value.map((item) => String(item).trim()).filter(Boolean);
  if (typeof value === 'string') {
    return value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
};

const slugify = (value) =>
  String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

const createRangeSizes = (text) => {
  const match = String(text || '')
    .trim()
    .match(/^([A-Za-z]+)\s*(\d+)\s*-\s*(\d+)$/);
  if (!match) return [];

  const [, system, fromRaw, toRaw] = match;
  const from = Number(fromRaw);
  const to = Number(toRaw);
  if (!Number.isFinite(from) || !Number.isFinite(to) || to < from) return [];

  const values = [];
  for (let current = from; current <= to; current += 1) {
    values.push(`${system} ${current}`);
  }
  return values;
};

const flattenSizeMap = (sizesObject) => {
  if (!sizesObject || typeof sizesObject !== 'object' || Array.isArray(sizesObject)) return [];
  return Object.entries(sizesObject).flatMap(([system, sizes]) =>
    toList(sizes).map((size) => `${String(system).toUpperCase()} ${size.replace(/^[A-Za-z]+\s*/, '')}`),
  );
};

const normalizeSizeOptions = (sizes) => {
  if (Array.isArray(sizes)) {
    return sizes.map((size) => String(size).trim()).filter(Boolean);
  }

  if (sizes && typeof sizes === 'object') {
    return flattenSizeMap(sizes);
  }

  if (typeof sizes === 'string') {
    const text = sizes.trim();
    if (!text) return [];

    const rangeValues = createRangeSizes(text);
    if (rangeValues.length > 0) return rangeValues;

    return toList(text);
  }

  return [];
};

const collapseSizeLabel = (options) => {
  if (!Array.isArray(options) || options.length === 0) return '';

  const parsed = options
    .map((item) => {
      const match = String(item).trim().match(/^([A-Za-z]+)\s*(\d+)$/);
      if (!match) return null;
      return { system: match[1], value: Number(match[2]) };
    })
    .filter(Boolean);

  if (parsed.length !== options.length) return options.join(', ');

  const system = parsed[0].system;
  if (!parsed.every((item) => item.system === system)) return options.join(', ');

  const sortedValues = parsed.map((item) => item.value).sort((a, b) => a - b);
  const isRange = sortedValues.every((value, index) => index === 0 || value - sortedValues[index - 1] === 1);

  if (!isRange) return options.join(', ');
  return `${system} ${sortedValues[0]}-${sortedValues[sortedValues.length - 1]}`;
};

const normalizePriceNumber = (product) => {
  const byPriceNum = Number(product?.priceNum);
  if (Number.isFinite(byPriceNum) && byPriceNum > 0) return byPriceNum;

  const rawPrice = String(product?.price ?? '').replace('$', '').trim();
  const byPrice = Number(rawPrice);
  if (Number.isFinite(byPrice) && byPrice > 0) return byPrice;

  return 0;
};

const normalizeCategory = (value) => {
  const text = String(value || '').trim().toLowerCase();
  if (!text) return FALLBACK_CATEGORY;
  if (text === 'all') return FALLBACK_CATEGORY;
  if (text.includes('run')) return 'Running';
  if (text.includes('trail') || text.includes('hiking') || text.includes('sneaker')) return 'Sneaker';
  if (text.includes('formal') || text.includes('oxford') || text.includes('loafer')) return 'Formal';
  if (
    text.includes('sport') ||
    text.includes('athletic') ||
    text.includes('casual') ||
    text.includes('court') ||
    text.includes('basketball') ||
    text.includes('training') ||
    text.includes('gym') ||
    text.includes('football') ||
    text.includes('soccer')
  ) {
    return 'Sport';
  }
  return FALLBACK_CATEGORY;
};

const normalizeBadges = (product) => {
  const byBadges = toList(product?.badges);
  if (byBadges.length > 0) return byBadges;

  const mainBadge = String(product?.badge || '').trim();
  const logistics = toList(product?.logistics);
  return [mainBadge, ...logistics].filter(Boolean);
};

const normalizeId = (product) => {
  const raw = String(product?.id ?? product?.productId ?? '').trim();
  if (raw) return raw;
  const fromName = slugify(product?.name || product?.title || 'shoe');
  return fromName || 'shoe';
};

const normalizeImagePath = (value) => {
  const raw = String(value || '').trim();
  if (!raw) return '';

  const normalized = raw.replace(/\\/g, '/');
  if (
    normalized.startsWith('http://') ||
    normalized.startsWith('https://') ||
    normalized.startsWith('data:') ||
    normalized.startsWith('blob:') ||
    normalized.startsWith('/')
  ) {
    return normalized;
  }

  // Legacy HTML/localStorage entries often stored "assets/..." without a leading slash.
  // In route URLs (e.g. /products), that becomes a broken relative path and caused logo fallback.
  if (normalized.startsWith('./')) {
    return `/${normalized.slice(2)}`;
  }
  if (normalized.startsWith('public/')) {
    return `/${normalized.slice('public/'.length)}`;
  }
  return `/${normalized}`;
};

const normalizeImageList = (value) => {
  const list = toList(value)
    .map((item) => normalizeImagePath(item))
    .filter(Boolean);
  return Array.from(new Set(list));
};

const normalizeModelPath = (value, category) => {
  const raw = String(value || '').trim();
  const normalized = normalizeImagePath(raw);
  if (MODEL_OPTIONS.has(normalized)) return normalized;

  const categoryText = String(category || '').toLowerCase();
  if (categoryText === 'formal') return '/models/formal.glb';
  if (categoryText === 'trail') return '/models/trail.glb';
  if (categoryText === 'sport' || categoryText === 'running' || categoryText === 'sneaker') return '/models/shoe.glb';
  return '/models/shoe.glb';
};

export const generateProductId = (seed = 'product') => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  const base = slugify(seed) || 'product';
  return `${base}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
};

export const normalizeProduct = (product = {}) => {
  const priceNum = normalizePriceNumber(product);
  const sizeOptions = normalizeSizeOptions(product.sizeOptions ?? product.sizes);
  const sizeLabel =
    typeof product.sizes === 'string' && product.sizes.trim()
      ? product.sizes.trim()
      : collapseSizeLabel(sizeOptions) || FALLBACK_SIZE;

  const category = normalizeCategory(product.category);

  const normalizedImages = normalizeImageList(product.images);
  const primaryImageCandidate =
    normalizeImagePath(product.image || product.cardImage || product.imageUrl) || normalizedImages[0] || '';
  const image = primaryImageCandidate || PRODUCT_IMAGE_PLACEHOLDER;
  const imageUrl = normalizeImagePath(product.imageUrl || image) || image;
  const cardImage = normalizeImagePath(product.cardImage || imageUrl || image) || image;
  const images = Array.from(new Set([image, ...normalizedImages].filter(Boolean)));

  const badges = normalizeBadges(product);
  const fitScore = Number(product.fitScore ?? product.aiFit);
  const rating = Number(product.rating);

  const description = String(product.description || '').trim();
  const shortDescription = String(product.shortDescription || description).trim();

  return {
    id: normalizeId(product),
    name: product.name || product.title || 'Untitled Shoe',
    title: product.title || product.name || 'Untitled Shoe',
    category,
    description,
    shortDescription,
    price: priceNum,
    priceNum,
    rating: Number.isFinite(rating) ? Number(rating.toFixed(1)) : 0,
    sizes: sizeLabel,
    sizeOptions: sizeOptions.length > 0 ? sizeOptions : [FALLBACK_SIZE],
    colors: toList(product.colors),
    image,
    imageUrl,
    cardImage,
    images,
    aiFit: Number.isFinite(fitScore) ? Math.max(0, Math.round(fitScore)) : 90,
    fitScore: Number.isFinite(fitScore) ? Math.max(0, Math.round(fitScore)) : 90,
    badges,
    badge: badges[0] || 'Featured',
    logistics: badges.slice(1),
    modelUrl: normalizeModelPath(product.modelUrl, category),
  };
};

export const getProductImage = (product) =>
  normalizeImagePath(product?.image || product?.imageUrl || product?.cardImage) || PRODUCT_IMAGE_PLACEHOLDER;

export const getProductSizeOptions = (product) => {
  const options = normalizeSizeOptions(product?.sizeOptions ?? product?.sizes);
  return options.length > 0 ? options : [FALLBACK_SIZE];
};

export const getProductDefaultSize = (product) => getProductSizeOptions(product)[0] || FALLBACK_SIZE;

export const loadProductsFromStorage = () => {
  return DEFAULT_PRODUCTS.map((product) => normalizeProduct(product));
};

export const saveProductsToStorage = (products) => {
  return (products || []).map((product) => normalizeProduct(product));
};

export const formatCurrency = (value) => {
  const number = Number(value) || 0;
  return `$${number.toFixed(0)}`;
};
