import React from 'react';
import { FACTORY_PRESETS, FactoryPreset } from '../calibration/presets';
import { solveCalibration } from '../calibration/physicsEngine';
import { ArrowUpRight } from 'lucide-react';

interface FactoryMatrixViewProps {
  activePresetId: string;
  onSelectPreset: (preset: FactoryPreset) => void;
}

export const FactoryMatrixView: React.FC<FactoryMatrixViewProps> = ({
  activePresetId,
  onSelectPreset,
}) => {
  const referencePresets = FACTORY_PRESETS.filter((p) => !p.isFlawedDemo);

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">
            Factory Spectrograph Calibration Reference Matrix (Virsa / inVia /
            Strada)
          </h3>
          <p className="text-xs text-slate-500">
            Standardized Raman shift bounds, Absolute wavenumber windows,
            Grating turret scan ranges, Primary Calibration Lines (PCL), 2nd
            Calibration Lines, and Motor Step sizes across laser &amp; grating
            combinations
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-[11px] font-semibold text-slate-500">
                <th className="py-2.5 pr-3">Laser (nm)</th>
                <th className="py-2.5 px-3 text-right">Grating (l/mm)</th>
                <th className="py-2.5 px-3 text-right">Raman Shift (cm⁻¹)</th>
                <th className="py-2.5 px-3 text-right">Abs Range (cm⁻¹)</th>
                <th className="py-2.5 px-3 text-right">Range Centre (cm⁻¹)</th>
                <th className="py-2.5 px-3 text-right">Scan Range (cm⁻¹)</th>
                <th className="py-2.5 px-3 text-right">Primary PCL (cm⁻¹)</th>
                <th className="py-2.5 px-3 text-right">2nd Cal Line (cm⁻¹)</th>
                <th className="py-2.5 px-3 text-right">Cal Step (Abs cm⁻¹)</th>
                <th className="py-2.5 pl-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-xs font-mono tabular-nums">
              {referencePresets.map((preset) => {
                const sol = solveCalibration(preset.params);
                const isActive = activePresetId === preset.id;

                return (
                  <tr
                    key={preset.id}
                    className={
                      isActive ? 'bg-cyan-50/70' : 'hover:bg-slate-50'
                    }
                  >
                    <td className="py-3 pr-3 font-semibold text-slate-900">
                      {preset.params.laserNm} nm
                    </td>
                    <td className="py-3 px-3 text-right font-semibold text-slate-800">
                      {preset.params.gratingLinesPerMm}
                    </td>
                    <td className="py-3 px-3 text-right text-slate-600">
                      {sol.effectiveRamanMinCm1}–{sol.effectiveRamanMaxCm1}
                    </td>
                    <td className="py-3 px-3 text-right text-slate-800">
                      {sol.absHighCm1.toFixed(1)} – {sol.absLowCm1.toFixed(1)}
                    </td>
                    <td className="py-3 px-3 text-right text-slate-600">
                      {sol.absCentreCm1.toFixed(2)}
                    </td>
                    <td className="py-3 px-3 text-right font-semibold text-cyan-800">
                      {sol.scanHighCm1.toFixed(1)} – {sol.scanLowCm1.toFixed(1)}
                    </td>
                    <td className="py-3 px-3 text-right font-semibold text-amber-800">
                      {sol.primaryCalibrationLine?.wavenumber.toFixed(2) ?? '—'}
                    </td>
                    <td className="py-3 px-3 text-right text-blue-800">
                      {sol.secondaryCalibrationLine?.wavenumber.toFixed(2) ??
                        '—'}
                    </td>
                    <td className="py-3 px-3 text-right text-slate-700">
                      {sol.wireXStepAbsCm1} cm⁻¹ ({sol.wireXTotalScanCount} scans)
                    </td>
                    <td className="py-3 pl-3 text-right font-sans">
                      <button
                        type="button"
                        onClick={() => onSelectPreset(preset)}
                        className={`inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-xs font-medium transition-colors whitespace-nowrap ${
                          isActive
                            ? 'border-cyan-600 bg-cyan-600 text-white'
                            : 'border-slate-300 bg-white text-slate-800 hover:bg-slate-100'
                        }`}
                      >
                        <span>{isActive ? 'Loaded' : 'Load Spec'}</span>
                        <ArrowUpRight className="h-3 w-3" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Physical Constraint Notes Card Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-1.5">
          <h4 className="text-xs font-semibold text-slate-900">
            01. Filter &amp; Grating Angle Limits
          </h4>
          <p className="text-xs leading-relaxed text-slate-600">
            Standard Rayleigh rejection filters operate across 50–4000 cm⁻¹
            Raman shift, while RPL/PL filters extend to 50–8500 cm⁻¹. High
            groove density gratings (such as 2400 l/mm at 633 nm) reach their
            mechanical turret angle limit at 2500 cm⁻¹ (13302.8 cm⁻¹ Abs).
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-1.5">
          <h4 className="text-xs font-semibold text-slate-900">
            02. Silicon CCD Long-Wavelength Roll-Off
          </h4>
          <p className="text-xs leading-relaxed text-slate-600">
            Both FDA (Front-side Direct) and BDA/BI (Back-Illuminated) Silicon
            CCDs exhibit quantum efficiency roll-off around ~9800–9239 cm⁻¹ Abs
            (~1020–1080 nm). For a 785 nm laser (12739 cm⁻¹), this caps the
            calibrated Raman shift to 50–3500 cm⁻¹ (12689–9239 cm⁻¹ Abs).
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-1.5">
          <h4 className="text-xs font-semibold text-slate-900">
            03. Primary Calibration Line (PCL) &amp; Step Size
          </h4>
          <p className="text-xs leading-relaxed text-slate-600">
            Manually aligning the lenses to hit the CCD centre and offsetting so
            the central PCL (e.g. 17086.75 cm⁻¹ for 532 nm) reads at its true
            value prevents extreme lines from drifting into adjacent peak
            windows. Setting 8 occurrences across the 1014 px CCD determines the
            50-step motor increment.
          </p>
        </div>
      </div>
    </div>
  );
};
