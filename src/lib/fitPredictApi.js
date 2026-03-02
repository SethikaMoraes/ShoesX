const DEFAULT_API_BASE_URL = 'http://localhost:8000';

const trimTrailingSlash = (value) => String(value || '').replace(/\/+$/, '');

export const FIT_API_BASE_URL = trimTrailingSlash(
  import.meta.env.VITE_FIT_API_URL || DEFAULT_API_BASE_URL,
);

const normalizeText = (value) => String(value || '').trim();

export const normalizeGenderForApi = (value) => {
  const text = normalizeText(value).toLowerCase();
  if (text.startsWith('m')) return 'Male';
  if (text.startsWith('f')) return 'Female';
  return 'Unisex';
};

export const normalizePreferredFitForApi = (value) => {
  const text = normalizeText(value).toLowerCase();
  if (text === 'snug' || text === 'tight') return 'snug';
  if (text === 'roomy' || text === 'relaxed' || text === 'loose') return 'roomy';
  return 'regular';
};

export const normalizeCategoryForApi = (value) => {
  const text = normalizeText(value).toLowerCase();
  if (!text) return 'Running';
  if (text.includes('formal') || text.includes('oxford')) return 'Formal';
  if (text.includes('trail') || text.includes('hiking')) return 'Trail';
  if (text.includes('run')) return 'Running';
  if (
    text.includes('sport') ||
    text.includes('athlet') ||
    text.includes('court') ||
    text.includes('gym') ||
    text.includes('football') ||
    text.includes('soccer')
  ) {
    return 'Athletic';
  }
  if (text.includes('casual') || text.includes('sneaker')) return 'Casual';
  return 'Running';
};

export const formatUkSize = (value) => String(value ?? '').replace(/^UK\s*/i, '').trim();

export async function requestFitPrediction(payload) {
  const response = await fetch(`${FIT_API_BASE_URL}/predict`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  let parsed = null;
  try {
    parsed = await response.json();
  } catch {
    parsed = null;
  }

  if (!response.ok) {
    const detail =
      typeof parsed?.detail === 'string'
        ? parsed.detail
        : Array.isArray(parsed?.detail) && parsed.detail[0]?.msg
          ? parsed.detail[0].msg
          : `Fit prediction request failed with status ${response.status}.`;
    throw new Error(detail);
  }

  return {
    recommendedSizeUK: formatUkSize(parsed?.recommendedSizeUK),
    confidence: Number(parsed?.confidence) || 0,
    riskLevel: String(parsed?.riskLevel || 'High'),
  };
}
