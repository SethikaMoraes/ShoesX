(() => {
  const CSV_PATH = 'size_chart.csv';
  let cachedRows = null;

  const parseCsvLine = (line) => {
    const values = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        values.push(current);
        current = '';
      } else {
        current += char;
      }
    }

    values.push(current);
    return values;
  };

  const parseCsv = (text) => {
    const lines = text.split(/\r?\n/).filter(Boolean);
    if (!lines.length) return [];

    const headers = parseCsvLine(lines[0]).map((header) => header.trim());
    const rows = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      if (!line.trim()) continue;
      const values = parseCsvLine(line);
      const row = {};

      headers.forEach((header, index) => {
        row[header] = values[index] ?? '';
      });

      rows.push({
        gender: (row.gender_target || 'Unisex').trim(),
        system: (row.size_system || 'UK').trim(),
        sizeLabel: (row.size_value || '').trim(),
        sizeValue: parseFloat(row.size_value),
        footLengthCm: parseFloat(row.foot_length_cm),
        footWidthCm: parseFloat(row.foot_width_cm_typical),
        widthLabel: (row.width_label || 'Regular').trim()
      });
    }

    return rows;
  };

  const load = async () => {
    if (cachedRows) return cachedRows;
    const response = await fetch(CSV_PATH, { cache: 'no-cache' });
    if (!response.ok) {
      throw new Error(`Failed to load size chart (${response.status})`);
    }
    const text = await response.text();
    cachedRows = parseCsv(text);
    return cachedRows;
  };

  const getOptions = (rows) => {
    const genders = new Set();
    const systems = new Set();
    const widths = new Set();

    rows.forEach((row) => {
      genders.add(row.gender);
      systems.add(row.system);
      widths.add(row.widthLabel);
    });

    return {
      genders: Array.from(genders),
      systems: Array.from(systems),
      widths: Array.from(widths)
    };
  };

  const filterData = (rows, { gender, system, width }) => rows
    .filter((row) => !gender || row.gender === gender)
    .filter((row) => !system || row.system === system)
    .filter((row) => !width || row.widthLabel === width);

  window.SizeChart = {
    load,
    getOptions,
    filterData
  };
})();
