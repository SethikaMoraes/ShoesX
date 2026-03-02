import { useEffect, useMemo, useState } from 'react';
import {
  filterSizeChartRows,
  getSizeChartOptions,
  loadSizeChartRows,
  normalizeGenderLabel,
  preferredFitToWidthLabel,
} from '../data/sizeChart';
import { useAuth } from '../context/AuthContext';
import { useSite } from '../context/SiteContext';
import {
  normalizeCategoryForApi,
  normalizeGenderForApi,
  normalizePreferredFitForApi,
  requestFitPrediction,
} from '../lib/fitPredictApi';
import { getUserMeasurements, saveUserMeasurements } from '../services/firestoreProfile';

const emptyMeasurements = {
  gender: '',
  length: '',
  width: '',
  preferredFit: 'regular',
};

const normalizeMeasurementForm = (value) => ({
  gender: String(value?.gender || ''),
  length: value?.length === undefined || value?.length === null ? '' : String(value.length),
  width: value?.width === undefined || value?.width === null ? '' : String(value.width),
  preferredFit: String(value?.preferredFit || 'regular'),
});

const hasMeasurements = (value) => Number(value?.length) > 0 && Number(value?.width) > 0;

const formatNumber = (value, decimals = 1) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return '-';
  return parsed.toFixed(decimals);
};

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

export default function FitAssurancePage() {
  const { user, hasSupabaseConfig } = useAuth();
  const { measurements, saveMeasurements } = useSite();

  const [measurementForm, setMeasurementForm] = useState(emptyMeasurements);
  const [showMeasurementForm, setShowMeasurementForm] = useState(false);
  const [sizeChartRows, setSizeChartRows] = useState([]);
  const [sizeChartError, setSizeChartError] = useState('');
  const [sizeChartLoading, setSizeChartLoading] = useState(true);
  const [selectedSystem, setSelectedSystem] = useState('UK');
  const [selectedGender, setSelectedGender] = useState('Unisex');
  const [selectedWidthLabel, setSelectedWidthLabel] = useState('Regular');
  const [statusMessage, setStatusMessage] = useState('');
  const [statusError, setStatusError] = useState('');
  const [savingMeasurements, setSavingMeasurements] = useState(false);
  const [apiRecommendation, setApiRecommendation] = useState(null);
  const [apiRecommendationLoading, setApiRecommendationLoading] = useState(false);
  const [apiRecommendationError, setApiRecommendationError] = useState('');

  useEffect(() => {
    setMeasurementForm(normalizeMeasurementForm(measurements));
  }, [measurements]);

  useEffect(() => {
    let active = true;

    const load = async () => {
      setSizeChartLoading(true);
      setSizeChartError('');

      try {
        const rows = await loadSizeChartRows();
        if (!active) return;
        setSizeChartRows(rows);
      } catch (error) {
        if (!active) return;
        setSizeChartError(error.message || 'Failed to load size chart.');
      } finally {
        if (active) setSizeChartLoading(false);
      }
    };

    load();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!user || !hasSupabaseConfig) return;
    let active = true;

    const loadRemoteMeasurements = async () => {
      try {
        const remoteMeasurements = await getUserMeasurements(user.uid);
        if (!active || !remoteMeasurements) return;

        const normalized = {
          gender: String(remoteMeasurements.gender || ''),
          length: Number(remoteMeasurements.length) || 0,
          width: Number(remoteMeasurements.width) || 0,
          preferredFit: String(remoteMeasurements.preferredFit || 'regular'),
        };

        saveMeasurements(normalized);
      } catch {
        // Keep local measurements if Supabase fetch fails.
      }
    };

    loadRemoteMeasurements();
    return () => {
      active = false;
    };
  }, [hasSupabaseConfig, saveMeasurements, user]);

  const sizeChartOptions = useMemo(() => getSizeChartOptions(sizeChartRows), [sizeChartRows]);

  useEffect(() => {
    if (sizeChartOptions.systems.length === 0) return;

    const fallbackGender = normalizeGenderLabel(measurements?.gender);
    const fallbackWidth = preferredFitToWidthLabel(measurements?.preferredFit);

    setSelectedSystem((current) =>
      sizeChartOptions.systems.includes(current)
        ? current
        : sizeChartOptions.systems.includes('UK')
          ? 'UK'
          : sizeChartOptions.systems[0],
    );

    setSelectedGender((current) =>
      sizeChartOptions.genders.includes(current)
        ? current
        : sizeChartOptions.genders.includes(fallbackGender)
          ? fallbackGender
          : sizeChartOptions.genders[0] || 'Unisex',
    );

    setSelectedWidthLabel((current) =>
      sizeChartOptions.widths.includes(current)
        ? current
        : sizeChartOptions.widths.includes(fallbackWidth)
          ? fallbackWidth
          : sizeChartOptions.widths[0] || 'Regular',
    );
  }, [measurements?.gender, measurements?.preferredFit, sizeChartOptions]);

  const visibleSizeRows = useMemo(
    () =>
      filterSizeChartRows(sizeChartRows, {
        system: selectedSystem,
        gender: selectedGender,
        widthLabel: selectedWidthLabel,
      }),
    [selectedGender, selectedSystem, selectedWidthLabel, sizeChartRows],
  );

  const chartRecommendation = useMemo(() => {
    if (!hasMeasurements(measurements) || sizeChartRows.length === 0) return null;

    const measuredLength = Number(measurements.length);
    const widthLabel = preferredFitToWidthLabel(measurements.preferredFit);
    const genderLabel = normalizeGenderLabel(measurements.gender);

    const getCandidateRows = () => {
      const strict = filterSizeChartRows(sizeChartRows, {
        system: 'UK',
        gender: genderLabel,
        widthLabel,
      });
      if (strict.length > 0) return strict;

      const genderOnly = filterSizeChartRows(sizeChartRows, {
        system: 'UK',
        gender: genderLabel,
      });
      if (genderOnly.length > 0) return genderOnly;

      const widthOnly = filterSizeChartRows(sizeChartRows, {
        system: 'UK',
        widthLabel,
      });
      if (widthOnly.length > 0) return widthOnly;

      return filterSizeChartRows(sizeChartRows, { system: 'UK' });
    };

    const candidates = getCandidateRows();
    if (candidates.length === 0) return null;

    const bestUK = candidates.reduce((best, row) => {
      const bestDistance = Math.abs(Number(best.footLengthCm) - measuredLength);
      const rowDistance = Math.abs(Number(row.footLengthCm) - measuredLength);
      return rowDistance < bestDistance ? row : best;
    }, candidates[0]);

    const pickForSystem = (system) => {
      const systemRows = filterSizeChartRows(sizeChartRows, {
        system,
        gender: bestUK.gender,
        widthLabel: bestUK.widthLabel,
      });
      if (systemRows.length === 0) return '-';

      const exact = systemRows.find(
        (row) => Math.abs(Number(row.footLengthCm) - Number(bestUK.footLengthCm)) < 0.001,
      );
      if (exact) return exact.sizeLabel;

      const nearest = systemRows.reduce((best, row) => {
        const bestDistance = Math.abs(Number(best.footLengthCm) - Number(bestUK.footLengthCm));
        const rowDistance = Math.abs(Number(row.footLengthCm) - Number(bestUK.footLengthCm));
        return rowDistance < bestDistance ? row : best;
      }, systemRows[0]);

      return nearest.sizeLabel;
    };

    const lengthDelta = Math.abs(Number(bestUK.footLengthCm) - measuredLength);
    const widthDelta = Math.abs(Number(bestUK.footWidthCm) - Number(measurements.width || 0));
    const confidence = clamp(Math.round(96 - lengthDelta * 16 - widthDelta * 6), 65, 99);

    return {
      uk: pickForSystem('UK'),
      us: pickForSystem('US'),
      eu: pickForSystem('EU'),
      confidence,
      reasons: [
        `Foot length ${formatNumber(measuredLength)} cm is closest to ${formatNumber(bestUK.footLengthCm)} cm in the chart.`,
        `Preferred fit "${measurements.preferredFit || 'regular'}" maps to ${widthLabel} width guidance.`,
        `Measured width ${formatNumber(measurements.width, 2)} cm aligns with ${bestUK.widthLabel} range (${formatNumber(bestUK.footWidthCm, 2)} cm typical).`,
      ],
    };
  }, [measurements, sizeChartRows]);

  useEffect(() => {
    if (!hasMeasurements(measurements)) {
      setApiRecommendation(null);
      setApiRecommendationError('');
      setApiRecommendationLoading(false);
      return;
    }

    const footLengthCm = Number(measurements?.length);
    const footWidthCm = Number(measurements?.width);

    if (!Number.isFinite(footLengthCm) || footLengthCm < 10 || footLengthCm > 40) {
      setApiRecommendation(null);
      setApiRecommendationLoading(false);
      setApiRecommendationError('Foot length must be between 10 and 40 cm to run ML prediction.');
      return;
    }

    if (!Number.isFinite(footWidthCm) || footWidthCm < 5 || footWidthCm > 20) {
      setApiRecommendation(null);
      setApiRecommendationLoading(false);
      setApiRecommendationError('Foot width must be between 5 and 20 cm to run ML prediction.');
      return;
    }

    let active = true;
    setApiRecommendationLoading(true);
    setApiRecommendationError('');

    requestFitPrediction({
      gender: normalizeGenderForApi(measurements?.gender),
      footLengthCm,
      footWidthCm,
      category: normalizeCategoryForApi(measurements?.category || 'Running'),
      preferredFit: normalizePreferredFitForApi(measurements?.preferredFit),
    })
      .then((result) => {
        if (!active) return;
        setApiRecommendation(result);
      })
      .catch((error) => {
        if (!active) return;
        setApiRecommendation(null);
        setApiRecommendationError(
          error?.message ||
            'Unable to reach Fit API at http://localhost:8000/predict. Start the API server and try again.',
        );
      })
      .finally(() => {
        if (!active) return;
        setApiRecommendationLoading(false);
      });

    return () => {
      active = false;
    };
  }, [measurements]);

  const apiConfidencePercent = apiRecommendation
    ? clamp(Math.round(apiRecommendation.confidence * 100), 0, 100)
    : null;
  const apiCategory = normalizeCategoryForApi(measurements?.category || 'Running');

  const saveMeasurementDetails = async (event) => {
    event.preventDefault();
    setStatusError('');
    setStatusMessage('');

    const nextLength = Number(measurementForm.length);
    const nextWidth = Number(measurementForm.width);

    if (!Number.isFinite(nextLength) || nextLength <= 0) {
      setStatusError('Foot length is required.');
      return;
    }

    if (!Number.isFinite(nextWidth) || nextWidth <= 0) {
      setStatusError('Foot width is required.');
      return;
    }

    const payload = {
      gender: measurementForm.gender || '',
      length: nextLength,
      width: nextWidth,
      preferredFit: measurementForm.preferredFit || 'regular',
    };

    setSavingMeasurements(true);
    try {
      // Persist into the shared site store used by product detail fit suggestions.
      saveMeasurements(payload);

      // If Supabase is configured and a user is logged in, mirror the same data remotely.
      if (hasSupabaseConfig && user?.uid) {
        await saveUserMeasurements(user.uid, payload);
      }

      setStatusMessage('Measurements updated.');
      setShowMeasurementForm(false);
    } catch (error) {
      setStatusError(error.message || 'Unable to save measurements right now.');
    } finally {
      setSavingMeasurements(false);
    }
  };

  const showAddMeasurementsButton = !hasMeasurements(measurements);

  return (
    <div className="space-y-6">
      <section className="panel space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-2xl font-bold">Measurements Card</h1>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => {
              setShowMeasurementForm((current) => !current);
              setStatusError('');
              setStatusMessage('');
            }}
          >
            {showAddMeasurementsButton ? 'Add Measurements' : 'Edit Measurements'}
          </button>
        </div>

        {showAddMeasurementsButton ? (
          <p className="text-sm text-slate-600 dark:text-slate-300">
            No measurements found. Add your measurements to get size recommendations.
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <p className="label">Gender</p>
              <p className="text-base font-medium text-slate-900 dark:text-slate-100">
                {measurements?.gender || 'Unspecified'}
              </p>
            </div>
            <div>
              <p className="label">Foot Length</p>
              <p className="text-base font-medium text-slate-900 dark:text-slate-100">
                {formatNumber(measurements?.length)} cm
              </p>
            </div>
            <div>
              <p className="label">Foot Width</p>
              <p className="text-base font-medium text-slate-900 dark:text-slate-100">
                {formatNumber(measurements?.width, 2)} cm
              </p>
            </div>
            <div>
              <p className="label">Preferred Fit</p>
              <p className="text-base font-medium capitalize text-slate-900 dark:text-slate-100">
                {measurements?.preferredFit || 'regular'}
              </p>
            </div>
          </div>
        )}

        {showMeasurementForm ? (
          <form className="grid gap-3 border-t border-slate-200 pt-4 dark:border-slate-800" onSubmit={saveMeasurementDetails}>
            <div className="grid gap-3 sm:grid-cols-2">
              <label>
                <span className="label">Gender</span>
                <select
                  className="input"
                  value={measurementForm.gender}
                  onChange={(event) =>
                    setMeasurementForm((current) => ({ ...current, gender: event.target.value }))
                  }
                >
                  <option value="">Select</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </label>

              <label>
                <span className="label">Preferred Fit</span>
                <select
                  className="input"
                  value={measurementForm.preferredFit}
                  onChange={(event) =>
                    setMeasurementForm((current) => ({ ...current, preferredFit: event.target.value }))
                  }
                >
                  <option value="snug">Snug</option>
                  <option value="regular">Regular</option>
                  <option value="relaxed">Relaxed</option>
                </select>
              </label>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <label>
                <span className="label">Foot Length (cm)</span>
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  className="input"
                  value={measurementForm.length}
                  onChange={(event) =>
                    setMeasurementForm((current) => ({ ...current, length: event.target.value }))
                  }
                  required
                />
              </label>

              <label>
                <span className="label">Foot Width (cm)</span>
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  className="input"
                  value={measurementForm.width}
                  onChange={(event) =>
                    setMeasurementForm((current) => ({ ...current, width: event.target.value }))
                  }
                  required
                />
              </label>
            </div>

            <div className="flex items-center gap-2">
              <button type="submit" className="btn-primary" disabled={savingMeasurements}>
                {savingMeasurements ? 'Saving...' : 'Save Measurements'}
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => {
                  setShowMeasurementForm(false);
                  setMeasurementForm(normalizeMeasurementForm(measurements));
                  setStatusError('');
                }}
              >
                Cancel
              </button>
            </div>
          </form>
        ) : null}

        {(statusMessage || statusError) ? (
          <div>
            {statusMessage ? <p className="text-sm text-emerald-600">{statusMessage}</p> : null}
            {statusError ? <p className="text-sm text-rose-600">{statusError}</p> : null}
          </div>
        ) : null}
      </section>

      <section className="panel space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-2xl font-bold">Size Guide Chart</h2>

          <div className="flex flex-wrap items-center gap-2">
            {['UK', 'US', 'EU'].map((system) => (
              <button
                key={system}
                type="button"
                className={`rounded-lg border px-3 py-1.5 text-sm ${
                  selectedSystem === system
                    ? 'border-cyan-500 bg-cyan-50 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-200'
                    : 'border-slate-300 dark:border-slate-700'
                }`}
                onClick={() => setSelectedSystem(system)}
              >
                {system}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <label>
            <span className="label">Gender</span>
            <select
              className="input"
              value={selectedGender}
              onChange={(event) => setSelectedGender(event.target.value)}
            >
              {sizeChartOptions.genders.map((gender) => (
                <option key={gender} value={gender}>
                  {gender}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span className="label">Width</span>
            <select
              className="input"
              value={selectedWidthLabel}
              onChange={(event) => setSelectedWidthLabel(event.target.value)}
            >
              {sizeChartOptions.widths.map((width) => (
                <option key={width} value={width}>
                  {width}
                </option>
              ))}
            </select>
          </label>
        </div>

        {sizeChartLoading ? <p className="text-sm text-slate-600 dark:text-slate-300">Loading size chart...</p> : null}
        {sizeChartError ? <p className="text-sm text-rose-600">{sizeChartError}</p> : null}

        {!sizeChartLoading && !sizeChartError ? (
          <div className="max-h-[420px] overflow-auto rounded-xl border border-slate-200 dark:border-slate-800">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-left dark:border-slate-800 dark:bg-slate-900">
                  <th className="px-3 py-2">{selectedSystem} Size</th>
                  <th className="px-3 py-2">Foot Length (cm)</th>
                  <th className="px-3 py-2">Foot Width (cm)</th>
                  <th className="px-3 py-2">Width Label</th>
                </tr>
              </thead>
              <tbody>
                {visibleSizeRows.map((row) => (
                  <tr key={`${row.system}-${row.gender}-${row.widthLabel}-${row.sizeLabel}`} className="border-b border-slate-100 dark:border-slate-800/70">
                    <td className="px-3 py-2 font-medium">{row.sizeLabel}</td>
                    <td className="px-3 py-2">{formatNumber(row.footLengthCm)}</td>
                    <td className="px-3 py-2">{formatNumber(row.footWidthCm, 2)}</td>
                    <td className="px-3 py-2">{row.widthLabel}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </section>

      <section className="panel space-y-4">
        <h2 className="text-2xl font-bold">Fit Recommendations</h2>

        {!hasMeasurements(measurements) ? (
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Add measurements to generate size recommendations and confidence.
          </p>
        ) : apiRecommendationLoading ? (
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Getting ML prediction from the Fit API...
          </p>
        ) : apiRecommendationError ? (
          <p className="text-sm text-rose-600">
            ML prediction unavailable: {apiRecommendationError}
          </p>
        ) : !apiRecommendation ? (
          <p className="text-sm text-slate-600 dark:text-slate-300">
            No recommendation available yet.
          </p>
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-800">
                <p className="label">Recommended UK</p>
                <p className="text-xl font-bold text-slate-900 dark:text-slate-100">
                  {apiRecommendation.recommendedSizeUK || '-'}
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-800">
                <p className="label">Recommended US</p>
                <p className="text-xl font-bold text-slate-900 dark:text-slate-100">
                  {chartRecommendation?.us || '-'}
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-800">
                <p className="label">Recommended EU</p>
                <p className="text-xl font-bold text-slate-900 dark:text-slate-100">
                  {chartRecommendation?.eu || '-'}
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-800">
                <p className="label">Return Risk</p>
                <p className="text-xl font-bold text-slate-900 dark:text-slate-100">
                  {apiRecommendation.riskLevel}
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-800">
              <p className="label">Confidence</p>
              <p className="text-xl font-bold text-cyan-700 dark:text-cyan-300">
                {apiConfidencePercent ?? 0}%
              </p>
            </div>

            <div>
              <p className="mb-2 text-sm font-semibold text-slate-800 dark:text-slate-200">Why this size</p>
              <ul className="list-disc space-y-1 pl-5 text-sm text-slate-600 dark:text-slate-300">
                {[
                  `ML model prediction on category "${apiCategory}" returned UK ${apiRecommendation.recommendedSizeUK}.`,
                  `Model confidence is ${apiConfidencePercent ?? 0}% with ${apiRecommendation.riskLevel} return risk.`,
                  ...(chartRecommendation?.reasons || []),
                ].map((reason) => (
                  <li key={reason}>{reason}</li>
                ))}
              </ul>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
