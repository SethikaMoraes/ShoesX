const SIZE_CHART_PATH = '/size_chart.csv';

let cachedRows = null;

const parseCsvLine = (line) => {
  const values = [];
  let current = '';
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];

    if (character === '"') {
      if (inQuotes && line[index + 1] === '"') {
        current += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (character === ',' && !inQuotes) {
      values.push(current);
      current = '';
      continue;
    }

    current += character;
  }

  values.push(current);
  return values;
};

const parseCsv = (rawCsv) => {
  const lines = String(rawCsv || '')
    .split(/\r?\n/)
    .filter((line) => line.trim());

  if (lines.length === 0) return [];

  const headers = parseCsvLine(lines[0]).map((header) => header.trim());

  return lines.slice(1).map((line) => {
    const rowValues = parseCsvLine(line);
    const row = {};

    headers.forEach((header, index) => {
      row[header] = rowValues[index] ?? '';
    });

    return {
      gender: String(row.gender_target || 'Unisex').trim(),
      system: String(row.size_system || 'UK').trim().toUpperCase(),
      sizeLabel: String(row.size_value || '').trim(),
      sizeValue: Number(row.size_value),
      footLengthCm: Number(row.foot_length_cm),
      footWidthCm: Number(row.foot_width_cm_typical),
      widthLabel: String(row.width_label || 'Regular').trim(),
    };
  });
};

const getSortedValues = (rows, key, order = []) => {
  const values = Array.from(new Set(rows.map((row) => row[key]).filter(Boolean)));

  if (order.length === 0) return values;
  return values.sort((a, b) => {
    const aIndex = order.indexOf(a);
    const bIndex = order.indexOf(b);
    if (aIndex === -1 && bIndex === -1) return String(a).localeCompare(String(b));
    if (aIndex === -1) return 1;
    if (bIndex === -1) return -1;
    return aIndex - bIndex;
  });
};

export const preferredFitToWidthLabel = (preferredFit) => {
  const normalized = String(preferredFit || '').trim().toLowerCase();
  if (normalized === 'snug') return 'Narrow';
  if (normalized === 'relaxed') return 'Wide';
  return 'Regular';
};

export const normalizeGenderLabel = (gender) => {
  const normalized = String(gender || '').trim().toLowerCase();
  if (normalized === 'male') return 'Male';
  if (normalized === 'female') return 'Female';
  if (normalized === 'other') return 'Unisex';
  return 'Unisex';
};

export async function loadSizeChartRows() {
  if (cachedRows) return cachedRows;

  const response = await fetch(SIZE_CHART_PATH, { cache: 'no-cache' });
  if (!response.ok) {
    throw new Error(`Unable to load size chart (${response.status}).`);
  }

  const csv = await response.text();
  cachedRows = parseCsv(csv);
  return cachedRows;
}

export function getSizeChartOptions(rows = []) {
  return {
    genders: getSortedValues(rows, 'gender', ['Unisex', 'Male', 'Female']),
    systems: getSortedValues(rows, 'system', ['UK', 'US', 'EU']),
    widths: getSortedValues(rows, 'widthLabel', ['Narrow', 'Regular', 'Wide']),
  };
}

export function filterSizeChartRows(rows = [], { gender, system, widthLabel } = {}) {
  return rows
    .filter((row) => !gender || row.gender === gender)
    .filter((row) => !system || row.system === system)
    .filter((row) => !widthLabel || row.widthLabel === widthLabel)
    .sort((a, b) => Number(a.sizeValue || 0) - Number(b.sizeValue || 0));
}
