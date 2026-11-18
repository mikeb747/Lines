import React, { useState } from 'react';
import { CalibrationSolution } from '../calibration/physicsEngine';
import { NEON_CATALOG, NeonLine } from '../calibration/neonCatalog';
import { SpectralDispersionChart } from './SpectralDispersionChart';
import { Search, Crosshair, ShieldAlert } from 'lucide-react';

interface LinePickerViewProps {
  solution: CalibrationSolution;
  onSelectManualPcl: (wavenumberCm1: number | null) => void;
}

export const LinePickerView: React.FC<LinePickerViewProps> = ({
  solution,
  onSelectManualPcl,
}) => {
  const [filterMode, setFilterMode] = useState<'selected' | 'in_range' | 'all'>(
    'selected'
  );
  const [searchQuery, setSearchQuery] = useState('');

  const {
    params,
    primaryCalibrationLine,
    focusAnchorLines,
    selectedLines,
    candidatePool,
    binDistribution,
    dispersionUniformityScore,
    minRequiredLineSpacingCm1,
    scanHighCm1,
    scanLowCm1,
    absCentreCm1,
  } = solution;

  const baseList =
    filterMode === 'selected'
      ? selectedLines
      : filterMode === 'in_range'
        ? candidatePool
        : NEON_CATALOG;

  const filteredList = baseList.filter((line) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.trim().toLowerCase();
    return (
      line.wavenumber.toFixed(2).includes(q) ||
      line.wavelengthAirNm.toFixed(3).includes(q) ||
      (line.notes && line.notes.toLowerCase().includes(q)) ||
      line.transition.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Interactive Dispersion Map (Clicking any point pins wavenumber; clicking a line also sets PCL) */}
      <SpectralDispersionChart
        solution={solution}
        showUploadedComparison={false}
        onSelectPcl={(line) => onSelectManualPcl(line.wavenumber)}
      />

      {/* 5-Zone Equal Dispersion Breakdown + Line Confusion Physics Explainer */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* 5 Equal Spectral Zones */}
        <div className="lg:col-span-7 rounded-xl border border-slate-200 bg-white p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">
                5-Zone Equal Dispersion Distribution (Unweighted Curve Fit)
              </h3>
              <p className="text-xs text-slate-500">
                Because the spectrograph calibration polynomial has no weighting
                system, lines must be evenly spread across all 5 zones to
                preserve extreme-edge accuracy
              </p>
            </div>
            <span className="font-mono text-xs font-semibold text-emerald-700 tabular-nums">
              Uniformity: {dispersionUniformityScore}%
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-5 gap-2.5">
            {binDistribution.map((bin, idx) => (
              <div
                key={bin.binIndex}
                className="rounded-lg border border-slate-200 bg-slate-50 p-3 space-y-2"
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-700">
                    Zone {idx + 1}
                  </span>
                  <span className="font-mono font-semibold text-cyan-700 tabular-nums">
                    {bin.count} lines
                  </span>
                </div>
                <div className="font-mono text-[11px] text-slate-500 tabular-nums">
                  {bin.rangeHighCm1.toFixed(0)} – {bin.rangeLowCm1.toFixed(0)}{' '}
                  cm⁻¹
                </div>
                <div className="space-y-1 pt-1 border-t border-slate-200/80">
                  {bin.lines.length === 0 ? (
                    <span className="text-[11px] text-rose-600">
                      Empty zone
                    </span>
                  ) : (
                    bin.lines.map((l) => (
                      <div
                        key={l.id}
                        className="font-mono text-[11px] text-slate-800 tabular-nums"
                      >
                        {l.wavenumber.toFixed(2)}
                      </div>
                    ))
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* PCL Centrality, inVia/Virsa Lens Focus & Pre-Calibration Drift Guard */}
        <div className="lg:col-span-5 rounded-xl border border-slate-200 bg-white p-5 flex flex-col justify-between space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 text-amber-600 shrink-0" />
                <h3 className="text-sm font-semibold text-slate-900">
                  PCL Alignment, Lens Focus &amp; Confusion Guard
                </h3>
              </div>
              {solution.params.manualPclOverrideCm1 && (
                <button
                  type="button"
                  onClick={() => onSelectManualPcl(null)}
                  className="text-xs font-medium text-cyan-700 hover:text-cyan-900 underline"
                >
                  Reset Auto PCL
                </button>
              )}
            </div>

            <p className="text-xs leading-relaxed text-slate-600">
              Before calibration, lenses are aligned to the CCD centre and
              offset so the{' '}
              <strong>
                Primary Calibration Line (PCL:{' '}
                {primaryCalibrationLine?.wavenumber.toFixed(2) ?? '—'} cm⁻¹)
              </strong>{' '}
              reads at its exact wavenumber.{' '}
              {params.spectrograph === 'Virsa' ? (
                <span>
                  <strong>Virsa</strong> uses a{' '}
                  <strong>single movable lens</strong> (no dual near/far focus
                  anchor lines required).
                </span>
              ) : (
                <span>
                  On <strong>{params.spectrograph}</strong>, multiple internal
                  (near/far) lenses are focused by optimising the{' '}
                  <strong>intensity / peak height</strong> of lines at both ends
                  of the spectrum.
                </span>
              )}
            </p>
            <p className="text-xs leading-relaxed text-slate-600">
              For a{' '}
              <strong>{solution.params.gratingLinesPerMm} l/mm grating</strong>,
              selected lines are spaced by at least{' '}
              <strong className="font-mono">
                {minRequiredLineSpacingCm1.toFixed(1)} cm⁻¹
              </strong>{' '}
              so closely spaced peaks (such as{' '}
              <code className="font-mono">17484.88</code> vs{' '}
              <code className="font-mono">17347.80 cm⁻¹</code>) cannot be
              misidentified as each other prior to polynomial fitting.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 border-t border-slate-200 pt-3 font-mono text-xs">
            <div>
              <span className="block font-sans text-[11px] text-slate-500">
                Primary Calibration Line (PCL)
              </span>
              <span className="text-sm font-bold text-slate-900 tabular-nums">
                {primaryCalibrationLine
                  ? `${primaryCalibrationLine.wavenumber.toFixed(2)} cm⁻¹`
                  : 'None'}
              </span>
              <span className="block text-[11px] text-slate-500 tabular-nums">
                Range Centre: {absCentreCm1.toFixed(2)} cm⁻¹
              </span>
            </div>
            <div>
              <span className="block font-sans text-[11px] text-slate-500">
                {params.spectrograph === 'Virsa'
                  ? 'Virsa Lens Architecture'
                  : 'inVia Near / Far Focus Lines'}
              </span>
              <span className="text-sm font-bold text-slate-900 tabular-nums">
                {params.spectrograph === 'Virsa'
                  ? '1 Movable Lens'
                  : focusAnchorLines.length >= 2
                    ? `${focusAnchorLines[0].wavenumber.toFixed(1)} & ${focusAnchorLines[1].wavenumber.toFixed(1)}`
                    : '—'}
              </span>
              <span className="block text-[11px] text-slate-500 tabular-nums">
                {params.spectrograph === 'Virsa'
                  ? `Min Spacing: ≥${minRequiredLineSpacingCm1.toFixed(1)} cm⁻¹`
                  : 'Optimise peak height at both ends'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Neon Line Catalog & Selection Table */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">
              Neon I (Ne I) Calibration Line Selector ({filteredList.length}{' '}
              lines shown)
            </h3>
            <p className="text-xs text-slate-500">
              All 3 views filter the same NIST + empirical{' '}
              <code className="font-mono">.lns</code> Neon catalog for Scan Range{' '}
              <span className="font-mono tabular-nums">
                {scanHighCm1.toFixed(1)} – {scanLowCm1.toFixed(1)} cm⁻¹
              </span>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Segmented Filter */}
            <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-1">
              <button
                type="button"
                onClick={() => setFilterMode('selected')}
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors whitespace-nowrap ${
                  filterMode === 'selected'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Optimal Picked ({selectedLines.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterMode('in_range')}
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors whitespace-nowrap ${
                  filterMode === 'in_range'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All in Scan Range ({candidatePool.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterMode('all')}
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors whitespace-nowrap ${
                  filterMode === 'all'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Full NIST Catalog ({NEON_CATALOG.length})
              </button>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search cm⁻¹ or nm..."
                aria-label="Search Neon lines by wavenumber or wavelength"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="rounded-lg border border-slate-300 bg-white pl-8 pr-3 py-1 text-xs text-slate-900 focus:border-cyan-600 focus:outline-none"
              />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-[11px] font-semibold text-slate-500">
                <th className="py-2.5 pr-3">Wavenumber (cm⁻¹)</th>
                <th className="py-2.5 px-3 text-right">Raman Shift (cm⁻¹)</th>
                <th className="py-2.5 px-3 text-right">Air Wavelength (nm)</th>
                <th className="py-2.5 px-3 text-right">Rel. Intensity</th>
                <th className="py-2.5 px-3 text-right">Dist from PCL (cm⁻¹)</th>
                <th className="py-2.5 px-3">Calibration Role</th>
                <th className="py-2.5 px-3">Spectroscopic Notes</th>
                <th className="py-2.5 pl-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-xs font-mono tabular-nums">
              {filteredList.map((line) => {
                const isSelected = selectedLines.some((s) => s.id === line.id);
                const isPcl = primaryCalibrationLine?.id === line.id;
                const isFocus = focusAnchorLines.some((f) => f.id === line.id);
                const ramanShift =
                  solution.laserWavenumberCm1 - line.wavenumber;
                const distFromPcl = primaryCalibrationLine
                  ? line.wavenumber - primaryCalibrationLine.wavenumber
                  : 0;

                return (
                  <tr key={line.id} className="hover:bg-slate-50">
                    <td className="py-2.5 pr-3 font-semibold text-slate-900">
                      {line.wavenumber.toFixed(2)}
                    </td>
                    <td className="py-2.5 px-3 text-right text-slate-600">
                      {ramanShift.toFixed(1)}
                    </td>
                    <td className="py-2.5 px-3 text-right text-slate-600">
                      {line.wavelengthAirNm.toFixed(3)}
                    </td>
                    <td className="py-2.5 px-3 text-right text-slate-700">
                      {line.relativeIntensity}
                    </td>
                    <td className="py-2.5 px-3 text-right text-slate-500">
                      {distFromPcl >= 0 ? '+' : ''}
                      {distFromPcl.toFixed(1)}
                    </td>
                    <td className="py-2.5 px-3 font-sans">
                      {isPcl ? (
                        <span className="font-mono font-semibold text-amber-700">
                          ● Primary (PCL)
                        </span>
                      ) : isFocus ? (
                        <span className="font-mono font-semibold text-indigo-700">
                          ◆ inVia Lens Focus
                        </span>
                      ) : isSelected ? (
                        <span className="font-mono font-medium text-cyan-700">
                          ✓ Picked Anchor
                        </span>
                      ) : (
                        <span className="text-slate-400">Catalog</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 font-sans text-slate-600">
                      {line.notes || line.transition}
                    </td>
                    <td className="py-2.5 pl-3 text-right font-sans">
                      <button
                        type="button"
                        onClick={() => onSelectManualPcl(line.wavenumber)}
                        className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[11px] font-medium transition-colors whitespace-nowrap ${
                          isPcl
                            ? 'border-amber-500 bg-amber-50 text-amber-900'
                            : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        <Crosshair className="h-3 w-3" />
                        {isPcl ? 'Active PCL' : 'Set as PCL'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
