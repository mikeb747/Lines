import React from 'react';
import {
  applyCcdArchitecture,
  applySpectrographModel,
  CalibrationParameters,
  CCDArchitecture,
  FilterType,
  SpectrographModel,
} from '../calibration/physicsEngine';
import { FACTORY_PRESETS, FactoryPreset } from '../calibration/presets';
import { Sliders, RotateCcw } from 'lucide-react';
import { DeferredNumberInput } from './DeferredNumberInput';

interface ParameterSidebarProps {
  params: CalibrationParameters;
  activePresetId: string;
  onChangeParams: (next: CalibrationParameters) => void;
  onSelectPreset: (preset: FactoryPreset) => void;
  onResetDefaults: () => void;
}

const LASER_OPTIONS = [405, 457, 532, 633, 660, 785, 830];
const GRATING_OPTIONS = [600, 1200, 1500, 1800, 2400, 3000];
const SPECTROGRAPH_OPTIONS: SpectrographModel[] = ['inVia', 'Virsa', 'Strava'];

export const ParameterSidebar: React.FC<ParameterSidebarProps> = ({
  params,
  activePresetId,
  onChangeParams,
  onSelectPreset,
  onResetDefaults,
}) => {
  const update = <K extends keyof CalibrationParameters>(
    key: K,
    value: CalibrationParameters[K]
  ) => {
    onChangeParams({ ...params, [key]: value });
  };

  return (
    <aside
      aria-label="Spectrograph Calibration Parameters"
      className="w-full lg:w-88 shrink-0 border-b lg:border-b-0 lg:border-r border-slate-200 bg-white p-5 space-y-5"
    >
      {/* Preset Selector */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label
            htmlFor="factory-preset-select"
            className="text-xs font-semibold text-slate-800"
          >
            Factory Configuration Preset
          </label>
          <button
            type="button"
            onClick={onResetDefaults}
            className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-900 transition-colors"
            title="Reset parameters to default 532nm 600 l/mm"
          >
            <RotateCcw className="h-3 w-3" />
            Reset
          </button>
        </div>
        <select
          id="factory-preset-select"
          value={activePresetId}
          onChange={(e) => {
            const found = FACTORY_PRESETS.find((p) => p.id === e.target.value);
            if (found) onSelectPreset(found);
          }}
          className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-900 focus:border-cyan-600 focus:bg-white focus:outline-none"
        >
          {FACTORY_PRESETS.map((preset) => (
            <option key={preset.id} value={preset.id}>
              {preset.label}
            </option>
          ))}
          <option value="custom">Custom User Parameters</option>
        </select>
      </div>

      <hr className="border-slate-200" />

      {/* 1. Spectrograph System & Laser */}
      <div className="space-y-3.5">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-900">
          <Sliders className="h-3.5 w-3.5 text-cyan-600" />
          <span>01. Optical Bench & Excitation Laser</span>
        </div>

        {/* Spectrograph Model */}
        <div>
          <span className="block text-xs font-medium text-slate-600 mb-1.5">
            Spectrograph System
          </span>
          <div className="grid grid-cols-3 gap-1.5 rounded-lg bg-slate-100 p-1">
            {SPECTROGRAPH_OPTIONS.map((model) => (
              <button
                key={model}
                type="button"
                onClick={() =>
                  onChangeParams(applySpectrographModel(params, model))
                }
                className={`rounded-md py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
                  params.spectrograph === model
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {model}
              </button>
            ))}
          </div>
        </div>

        {/* Laser Wavelength */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label
              htmlFor="laser-nm-input"
              className="text-xs font-medium text-slate-600"
            >
              Laser Wavelength (nm)
            </label>
            <span className="font-mono text-xs text-slate-500 tabular-nums">
              {params.laserNm > 0 ? (1e7 / params.laserNm).toFixed(1) : '—'} cm⁻¹
            </span>
          </div>
          <div className="grid grid-cols-7 gap-1 mb-2">
            {LASER_OPTIONS.map((nm) => (
              <button
                key={nm}
                type="button"
                onClick={() => update('laserNm', nm)}
                className={`rounded-md border py-1 text-xs font-mono font-medium transition-colors whitespace-nowrap ${
                  Math.abs(params.laserNm - nm) < 0.5
                    ? 'border-cyan-600 bg-cyan-50 text-cyan-900'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                {nm}
              </button>
            ))}
          </div>
          <DeferredNumberInput
            id="laser-nm-input"
            min={200}
            max={2000}
            placeholder="Enter any laser wavelength (nm)..."
            value={params.laserNm}
            onCommit={(val) => update('laserNm', val)}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 font-mono text-xs text-slate-900 tabular-nums focus:border-cyan-600 focus:outline-none"
          />
        </div>

        {/* Grating Groove Density */}
        <div>
          <span className="block text-xs font-medium text-slate-600 mb-1.5">
            Grating Groove Density (lines/mm)
          </span>
          <div className="grid grid-cols-3 gap-1.5">
            {GRATING_OPTIONS.map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => update('gratingLinesPerMm', g)}
                className={`rounded-md border py-1.5 text-xs font-mono font-medium transition-colors whitespace-nowrap ${
                  params.gratingLinesPerMm === g
                    ? 'border-cyan-600 bg-cyan-50 text-cyan-900'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                {g}
              </button>
            ))}
          </div>
        </div>
      </div>

      <hr className="border-slate-200" />

      {/* 2. Filter Type & Raman Shift Range */}
      <div className="space-y-3">
        <div className="text-xs font-semibold text-slate-900">
          02. Filter Rejection & Raman Shift Range
        </div>

        <div className="grid grid-cols-3 gap-1 rounded-lg bg-slate-100 p-1">
          {(
            [
              { id: 'standard', label: 'Standard (4000)' },
              { id: 'rpl_pl', label: 'RPL/PL (8500)' },
              { id: 'custom', label: 'Custom' },
            ] as { id: FilterType; label: string }[]
          ).map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => update('filterType', f.id)}
              className={`rounded-md py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
                params.filterType === f.id
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {params.filterType === 'custom' && (
          <div className="grid grid-cols-2 gap-2 pt-1">
            <div>
              <label
                htmlFor="custom-raman-min"
                className="block text-xs text-slate-600 mb-1"
              >
                Min Shift (cm⁻¹)
              </label>
              <DeferredNumberInput
                id="custom-raman-min"
                min={0}
                max={4000}
                value={params.customRamanMinCm1}
                onCommit={(val) => update('customRamanMinCm1', val)}
                className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 font-mono text-xs tabular-nums focus:border-cyan-600 focus:outline-none"
              />
            </div>
            <div>
              <label
                htmlFor="custom-raman-max"
                className="block text-xs text-slate-600 mb-1"
              >
                Max Shift (cm⁻¹)
              </label>
              <DeferredNumberInput
                id="custom-raman-max"
                min={500}
                max={10000}
                value={params.customRamanMaxCm1}
                onCommit={(val) => update('customRamanMaxCm1', val)}
                className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 font-mono text-xs tabular-nums focus:border-cyan-600 focus:outline-none"
              />
            </div>
          </div>
        )}
      </div>

      <hr className="border-slate-200" />

      {/* 3. Turret Step Size & CCD Occurrences */}
      <div className="space-y-3">
        <div className="text-xs font-semibold text-slate-900">
          03. Grating Step & CCD Line Occurrences
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label
              htmlFor="target-occurrences-slider"
              className="text-xs font-medium text-slate-600"
            >
              Target Occurrences Across CCD
            </label>
            <span className="font-mono text-xs font-semibold text-cyan-700 tabular-nums">
              {params.targetOccurrencesPerLine} hits / line
            </span>
          </div>
          <input
            id="target-occurrences-slider"
            type="range"
            min={4}
            max={24}
            step={1}
            value={params.targetOccurrencesPerLine}
            onChange={(e) =>
              update('targetOccurrencesPerLine', parseInt(e.target.value, 10))
            }
            className="w-full accent-cyan-600"
          />
          <div className="flex justify-between text-[11px] font-mono text-slate-400">
            <span>4 hits/line</span>
            <span>10 hits/line</span>
            <span>16 hits/line (50 cm⁻¹)</span>
            <span>24 hits</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label
              htmlFor="target-line-count-input"
              className="block text-xs font-medium text-slate-600 mb-1"
            >
              Target Cal Lines
            </label>
            <DeferredNumberInput
              id="target-line-count-input"
              integer
              min={5}
              max={16}
              value={params.targetLineCount}
              onCommit={(val) => update('targetLineCount', val)}
              className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 font-mono text-xs tabular-nums focus:border-cyan-600 focus:outline-none"
            />
          </div>
          <div>
            <label
              htmlFor="min-intensity-input"
              className="block text-xs font-medium text-slate-600 mb-1"
            >
              Min Ne Intensity
            </label>
            <DeferredNumberInput
              id="min-intensity-input"
              value={params.minRelativeIntensity}
              onCommit={(val) => update('minRelativeIntensity', val)}
              className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 font-mono text-xs tabular-nums focus:border-cyan-600 focus:outline-none"
            />
          </div>
        </div>
      </div>

      <hr className="border-slate-200" />

      {/* 4. Line-Scan CCD Sensor Architecture */}
      <div className="space-y-3">
        <div className="text-xs font-semibold text-slate-900">
          04. CCD Sensor Architecture & ROI
        </div>

        <div className="grid grid-cols-2 gap-1.5 rounded-lg bg-slate-100 p-1">
          {(
            [
              { id: 'FDA', label: 'FDA (Front-Direct)' },
              { id: 'BDA', label: 'BDA / BI (Back-Thin)' },
            ] as { id: CCDArchitecture; label: string }[]
          ).map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => onChangeParams(applyCcdArchitecture(params, c.id))}
              className={`rounded-md py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
                params.ccdType === c.id
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>

        <div className="space-y-2.5 pt-1">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-medium text-slate-600">
              Active X Pixel Bounds &amp; Zero-Order Centre
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div>
              <label
                htmlFor="ccd-x-min"
                className="block text-[11px] text-slate-600 mb-1"
              >
                X Start (px)
              </label>
              <DeferredNumberInput
                id="ccd-x-min"
                integer
                min={0}
                max={500}
                value={params.ccdActiveXMinPx ?? 18}
                onCommit={(nextMin) => {
                  const currentMax = params.ccdActiveXMaxPx ?? 1032;
                  const nextWidth = Math.max(100, currentMax - nextMin);
                  onChangeParams({
                    ...params,
                    ccdActiveXMinPx: nextMin,
                    ccdActiveXMaxPx: currentMax,
                    ccdActiveWidthPx: nextWidth,
                  });
                }}
                className="w-full rounded-lg border border-slate-300 px-2 py-1.5 font-mono text-xs tabular-nums focus:border-cyan-600 focus:outline-none"
              />
            </div>

            <div>
              <label
                htmlFor="ccd-x-max"
                className="block text-[11px] text-slate-600 mb-1"
              >
                X End (px)
              </label>
              <DeferredNumberInput
                id="ccd-x-max"
                integer
                min={540}
                max={params.ccdTotalWidthPx}
                value={params.ccdActiveXMaxPx ?? 1032}
                onCommit={(nextMax) => {
                  const currentMin = params.ccdActiveXMinPx ?? 18;
                  const nextWidth = Math.max(100, nextMax - currentMin);
                  onChangeParams({
                    ...params,
                    ccdActiveXMinPx: currentMin,
                    ccdActiveXMaxPx: nextMax,
                    ccdActiveWidthPx: nextWidth,
                  });
                }}
                className="w-full rounded-lg border border-slate-300 px-2 py-1.5 font-mono text-xs tabular-nums focus:border-cyan-600 focus:outline-none"
              />
            </div>

            <div>
              <label
                htmlFor="ccd-x-centre"
                className="block text-[11px] text-slate-600 mb-1"
              >
                Centre (px)
              </label>
              <DeferredNumberInput
                id="ccd-x-centre"
                integer
                min={400}
                max={640}
                value={params.ccdZeroOrderCentrePx ?? 517}
                onCommit={(nextCentre) => {
                  onChangeParams({
                    ...params,
                    ccdZeroOrderCentrePx: nextCentre,
                  });
                }}
                className="w-full rounded-lg border border-slate-300 px-2 py-1.5 font-mono text-xs tabular-nums focus:border-cyan-600 focus:outline-none"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label
              htmlFor="ccd-active-width"
              className="block text-xs text-slate-600 mb-1"
            >
              Active Width (of {params.ccdTotalWidthPx} px)
            </label>
            <DeferredNumberInput
              id="ccd-active-width"
              integer
              min={512}
              max={1040}
              value={params.ccdActiveWidthPx}
              onCommit={(nextWidth) => {
                const nextMin = Math.round(
                  (params.ccdTotalWidthPx - nextWidth) / 2
                );
                const nextMax = nextMin + nextWidth;
                onChangeParams({
                  ...params,
                  ccdActiveWidthPx: nextWidth,
                  ccdActiveXMinPx: nextMin,
                  ccdActiveXMaxPx: nextMax,
                });
              }}
              className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 font-mono text-xs tabular-nums focus:border-cyan-600 focus:outline-none"
            />
          </div>
          <div>
            <label
              htmlFor="ccd-active-height"
              className="block text-xs text-slate-600 mb-1"
            >
              {params.spectrograph === 'Virsa'
                ? 'Active Y Rows (125–145)'
                : `Bottom Rows (of ${params.ccdTotalHeightPx} px)`}
            </label>
            <DeferredNumberInput
              id="ccd-active-height"
              integer
              min={10}
              max={256}
              value={params.ccdActiveHeightPx}
              onCommit={(val) => update('ccdActiveHeightPx', val)}
              className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 font-mono text-xs tabular-nums focus:border-cyan-600 focus:outline-none"
            />
          </div>
        </div>

        <label className="flex items-center justify-between gap-2 pt-1 cursor-pointer">
          <span className="text-xs text-slate-600">
            Enforce Silicon CCD Cutoff (~9800 cm⁻¹)
          </span>
          <input
            type="checkbox"
            checked={params.enforceCcdCutoff}
            onChange={(e) => update('enforceCcdCutoff', e.target.checked)}
            className="h-4 w-4 rounded border-slate-300 accent-cyan-600"
          />
        </label>
      </div>
    </aside>
  );
};
