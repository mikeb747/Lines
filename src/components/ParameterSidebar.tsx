import React from 'react';
import {
  applyCcdArchitecture,
  CalibrationParameters,
  CCDArchitecture,
  FilterType,
  SpectrographModel,
} from '../calibration/physicsEngine';
import { FACTORY_PRESETS, FactoryPreset } from '../calibration/presets';
import { Sliders, RotateCcw } from 'lucide-react';

interface ParameterSidebarProps {
  params: CalibrationParameters;
  activePresetId: string;
  onChangeParams: (next: CalibrationParameters) => void;
  onSelectPreset: (preset: FactoryPreset) => void;
  onResetDefaults: () => void;
}

const LASER_OPTIONS = [532, 633, 660, 785, 830];
const GRATING_OPTIONS = [600, 1200, 1800, 2400, 3000];
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
                onClick={() => update('spectrograph', model)}
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
              {(1e7 / params.laserNm).toFixed(1)} cm⁻¹
            </span>
          </div>
          <div className="grid grid-cols-5 gap-1 mb-2">
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
          <input
            id="laser-nm-input"
            type="number"
            min={325}
            max={1064}
            step={0.1}
            value={params.laserNm}
            onChange={(e) => {
              const val = parseFloat(e.target.value);
              if (!isNaN(val) && val > 200 && val < 2000) {
                update('laserNm', val);
              }
            }}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 font-mono text-xs text-slate-900 tabular-nums focus:border-cyan-600 focus:outline-none"
          />
        </div>

        {/* Grating Groove Density */}
        <div>
          <span className="block text-xs font-medium text-slate-600 mb-1.5">
            Grating Groove Density (lines/mm)
          </span>
          <div className="grid grid-cols-5 gap-1">
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
              <input
                id="custom-raman-min"
                type="number"
                min={0}
                max={4000}
                step={10}
                value={params.customRamanMinCm1}
                onChange={(e) =>
                  update('customRamanMinCm1', Number(e.target.value) || 0)
                }
                className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 font-mono text-xs tabular-nums"
              />
            </div>
            <div>
              <label
                htmlFor="custom-raman-max"
                className="block text-xs text-slate-600 mb-1"
              >
                Max Shift (cm⁻¹)
              </label>
              <input
                id="custom-raman-max"
                type="number"
                min={500}
                max={10000}
                step={50}
                value={params.customRamanMaxCm1}
                onChange={(e) =>
                  update('customRamanMaxCm1', Number(e.target.value) || 4000)
                }
                className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 font-mono text-xs tabular-nums"
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
            max={16}
            step={1}
            value={params.targetOccurrencesPerLine}
            onChange={(e) =>
              update('targetOccurrencesPerLine', parseInt(e.target.value, 10))
            }
            className="w-full accent-cyan-600"
          />
          <div className="flex justify-between text-[11px] font-mono text-slate-400">
            <span>4 hits (100 steps)</span>
            <span>8 hits (50 steps)</span>
            <span>16 hits (25 steps)</span>
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
            <input
              id="target-line-count-input"
              type="number"
              min={5}
              max={16}
              value={params.targetLineCount}
              onChange={(e) =>
                update(
                  'targetLineCount',
                  Math.max(5, Math.min(16, parseInt(e.target.value, 10) || 9))
                )
              }
              className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 font-mono text-xs tabular-nums"
            />
          </div>
          <div>
            <label
              htmlFor="min-intensity-input"
              className="block text-xs font-medium text-slate-600 mb-1"
            >
              Min Ne Intensity
            </label>
            <input
              id="min-intensity-input"
              type="number"
              min={100}
              max={700}
              step={20}
              value={params.minRelativeIntensity}
              onChange={(e) =>
                update(
                  'minRelativeIntensity',
                  Math.max(100, parseInt(e.target.value, 10) || 280)
                )
              }
              className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 font-mono text-xs tabular-nums"
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

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label
              htmlFor="ccd-active-width"
              className="block text-xs text-slate-600 mb-1"
            >
              Active Width (of {params.ccdTotalWidthPx} px)
            </label>
            <input
              id="ccd-active-width"
              type="number"
              min={512}
              max={1040}
              value={params.ccdActiveWidthPx}
              onChange={(e) =>
                update(
                  'ccdActiveWidthPx',
                  Math.max(512, Math.min(1040, parseInt(e.target.value, 10) || 1014))
                )
              }
              className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 font-mono text-xs tabular-nums"
            />
          </div>
          <div>
            <label
              htmlFor="ccd-active-height"
              className="block text-xs text-slate-600 mb-1"
            >
              Bottom Rows (of {params.ccdTotalHeightPx} px)
            </label>
            <input
              id="ccd-active-height"
              type="number"
              min={10}
              max={256}
              value={params.ccdActiveHeightPx}
              onChange={(e) =>
                update(
                  'ccdActiveHeightPx',
                  Math.max(10, Math.min(256, parseInt(e.target.value, 10) || 30))
                )
              }
              className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 font-mono text-xs tabular-nums"
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
