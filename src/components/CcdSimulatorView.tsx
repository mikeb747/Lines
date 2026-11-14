import React, { useState } from 'react';
import {
  CalibrationSolution,
  calculateCcdWindowWidthCm1,
} from '../calibration/physicsEngine';
import { ChevronLeft, ChevronRight, Target } from 'lucide-react';

interface CcdSimulatorViewProps {
  solution: CalibrationSolution;
}

export const CcdSimulatorView: React.FC<CcdSimulatorViewProps> = ({
  solution,
}) => {
  const {
    params,
    scanHighCm1,
    scanLowCm1,
    absCentreCm1,
    wavenumberShiftPerStepCm1,
    recommendedMotorStepTicks,
    totalScanSteps,
    primaryCalibrationLine,
    selectedLines,
  } = solution;

  // Find the step index where the grating is centred near the PCL / range centre
  const defaultStepIdx = Math.max(
    0,
    Math.min(
      totalScanSteps,
      Math.round(
        (scanHighCm1 - (primaryCalibrationLine?.wavenumber ?? absCentreCm1)) /
          Math.max(1, wavenumberShiftPerStepCm1)
      )
    )
  );

  const [stepIndex, setStepIndex] = useState<number>(defaultStepIdx);

  const clampedStep = Math.max(0, Math.min(totalScanSteps, stepIndex));
  const currentCentreNuCm1 = Number(
    (scanHighCm1 - clampedStep * wavenumberShiftPerStepCm1).toFixed(2)
  );
  const currentWindowWidthCm1 = calculateCcdWindowWidthCm1(
    currentCentreNuCm1,
    params.gratingLinesPerMm,
    params.ccdActiveWidthPx,
    params.spectrograph
  );

  const windowHighCm1 = currentCentreNuCm1 + currentWindowWidthCm1 / 2;
  const windowLowCm1 = currentCentreNuCm1 - currentWindowWidthCm1 / 2;

  const leftMarginPx = Math.round(
    (params.ccdTotalWidthPx - params.ccdActiveWidthPx) / 2
  );
  const rightActiveLimitPx = leftMarginPx + params.ccdActiveWidthPx;

  // Map a wavenumber in [windowLowCm1, windowHighCm1] to pixel column [leftMarginPx, rightActiveLimitPx]
  const nuToPixelCol = (nuCm1: number) => {
    const ratio = (windowHighCm1 - nuCm1) / Math.max(1, currentWindowWidthCm1);
    return Math.round(leftMarginPx + ratio * params.ccdActiveWidthPx);
  };

  // Lines hitting the active CCD ROI at the current turret step
  const visibleLinesAtStep = selectedLines
    .map((line) => ({
      line,
      pixelCol: nuToPixelCol(line.wavenumber),
    }))
    .filter(
      (item) =>
        item.pixelCol >= leftMarginPx && item.pixelCol <= rightActiveLimitPx
    );

  // Calculate all pixel column positions where the Primary Calibration Line hits the CCD across all scan steps
  const trackedLine = primaryCalibrationLine || selectedLines[0] || null;
  const trackedOccurrences: {
    stepIdx: number;
    motorTicks: number;
    turretCentreCm1: number;
    pixelCol: number;
  }[] = [];

  if (trackedLine) {
    for (let s = 0; s <= totalScanSteps; s++) {
      const centreNu = scanHighCm1 - s * wavenumberShiftPerStepCm1;
      const winW = calculateCcdWindowWidthCm1(
        centreNu,
        params.gratingLinesPerMm,
        params.ccdActiveWidthPx,
        params.spectrograph
      );
      const high = centreNu + winW / 2;
      const ratio = (high - trackedLine.wavenumber) / Math.max(1, winW);
      const pxCol = Math.round(leftMarginPx + ratio * params.ccdActiveWidthPx);
      if (pxCol >= leftMarginPx && pxCol <= rightActiveLimitPx) {
        trackedOccurrences.push({
          stepIdx: s,
          motorTicks: s * recommendedMotorStepTicks,
          turretCentreCm1: Number(centreNu.toFixed(1)),
          pixelCol: pxCol,
        });
      }
    }
  }

  return (
    <div className="space-y-6">
      {/* Turret Step Controller & Sensor Geometry Summary */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">
              Line-Scan CCD Sensor & Grating Turret Rotation Simulator
            </h3>
            <p className="text-xs text-slate-500">
              Simulating {params.ccdType} sensor ({params.ccdTotalWidthPx}×
              {params.ccdTotalHeightPx} total pixels · Active ROI: middle{' '}
              {params.ccdActiveWidthPx} px wide [cols {leftMarginPx}–
              {rightActiveLimitPx}] × bottom {params.ccdActiveHeightPx} px high
              [rows {params.ccdTotalHeightPx - params.ccdActiveHeightPx}–
              {params.ccdTotalHeightPx}])
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setStepIndex(Math.max(0, clampedStep - 1))}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              Prev Step (-{recommendedMotorStepTicks} ticks)
            </button>
            <button
              type="button"
              onClick={() => setStepIndex(defaultStepIdx)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-amber-50 border border-amber-300 px-3 py-1.5 text-xs font-semibold text-amber-900 hover:bg-amber-100"
            >
              <Target className="h-3.5 w-3.5" />
              Center on PCL ({primaryCalibrationLine?.wavenumber.toFixed(2)}{' '}
              cm⁻¹)
            </button>
            <button
              type="button"
              onClick={() =>
                setStepIndex(Math.min(totalScanSteps, clampedStep + 1))
              }
              className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
            >
              Next Step (+{recommendedMotorStepTicks} ticks)
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Step Scrubber Bar */}
        <div className="space-y-1.5 pt-1">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
            <span className="text-slate-700">
              Scan Step:{' '}
              <strong className="text-slate-900">
                {clampedStep} / {totalScanSteps}
              </strong>{' '}
              (Turret Motor Counter:{' '}
              <strong className="text-cyan-700">
                {clampedStep * recommendedMotorStepTicks} ticks
              </strong>{' '}
              @ {recommendedMotorStepTicks} steps/scan)
            </span>
            <span className="text-slate-700">
              CCD Window:{' '}
              <strong className="text-slate-900">
                {windowHighCm1.toFixed(1)} – {windowLowCm1.toFixed(1)} cm⁻¹
              </strong>{' '}
              (Centre: {currentCentreNuCm1.toFixed(1)} cm⁻¹ · Span:{' '}
              {currentWindowWidthCm1.toFixed(1)} cm⁻¹)
            </span>
          </div>
          <input
            type="range"
            aria-label="Grating turret scan step index"
            min={0}
            max={totalScanSteps}
            value={clampedStep}
            onChange={(e) => setStepIndex(parseInt(e.target.value, 10))}
            className="w-full accent-cyan-600"
          />
        </div>

        {/* 1040 x 256 CCD Sensor Canvas */}
        <div className="overflow-x-auto pt-2">
          <svg
            viewBox="0 0 1040 240"
            className="w-full h-auto rounded-lg border border-slate-800 bg-slate-950"
            role="img"
            aria-label="1040 by 256 pixel Line-Scan CCD sensor showing middle 1014 pixels and bottom 30 rows active readout region"
          >
            {/* Inactive full 1040x256 silicon sensor frame */}
            <rect
              x="0"
              y="0"
              width="1040"
              height="195"
              fill="#090D16"
              stroke="#1E293B"
              strokeWidth="1"
            />

            {/* Guard bands (left 13px and right 13px) */}
            <rect
              x="0"
              y="0"
              width={leftMarginPx}
              height="195"
              fill="#1E1B4B"
              fillOpacity="0.45"
            />
            <rect
              x={rightActiveLimitPx}
              y="0"
              width={Math.max(0, 1040 - rightActiveLimitPx)}
              height="195"
              fill="#1E1B4B"
              fillOpacity="0.45"
            />

            {/* Upper unbinned/masked rows (rows 0 - 225) */}
            <text
              x="520"
              y="55"
              textAnchor="middle"
              className="fill-slate-600 font-mono text-[12px]"
            >
              UPPER SENSOR MASKED REGION (Rows 0 –{' '}
              {params.ccdTotalHeightPx - params.ccdActiveHeightPx - 1} of{' '}
              {params.ccdTotalHeightPx} px) · {params.ccdType} Architecture
            </text>

            {/* Active Bottom 30-Pixel Readout Strip (Middle 1014 px wide) */}
            <rect
              x={leftMarginPx}
              y="135"
              width={params.ccdActiveWidthPx}
              height="60"
              fill="#0F172A"
              stroke="#06B6D4"
              strokeWidth="1.5"
            />

            {/* Centre Pixel Crosshair (Column 520) */}
            <line
              x1="520"
              y1="15"
              x2="520"
              y2="195"
              stroke="#F59E0B"
              strokeDasharray="4 4"
              strokeWidth="1"
            />
            <text
              x="520"
              y="128"
              textAnchor="middle"
              className="fill-amber-400 font-mono text-[11px]"
            >
              CCD Centre Pixel (Col 520 · {currentCentreNuCm1.toFixed(1)} cm⁻¹)
            </text>

            {/* Active Neon Spectral Lines hitting the CCD at this step */}
            {visibleLinesAtStep.map(({ line, pixelCol }, idx) => {
              const isPcl = primaryCalibrationLine?.id === line.id;
              const tierOffset = (idx % 3) * 18;
              const stemTopY = Math.max(
                28,
                110 - (line.relativeIntensity / 1000) * 42 - tierOffset
              );
              return (
                <g key={line.id}>
                  {/* Vertical spectral line stripe in active bottom 30 rows */}
                  <line
                    x1={pixelCol}
                    y1="135"
                    x2={pixelCol}
                    y2="195"
                    stroke={isPcl ? '#F59E0B' : '#22D3EE'}
                    strokeWidth={isPcl ? '4' : '2.5'}
                  />
                  {/* Intensity profile trace in upper HUD */}
                  <line
                    x1={pixelCol}
                    y1="135"
                    x2={pixelCol}
                    y2={stemTopY}
                    stroke={isPcl ? '#F59E0B' : '#06B6D4'}
                    strokeWidth="1.5"
                    strokeDasharray="2 2"
                  />
                  <circle
                    cx={pixelCol}
                    cy={stemTopY}
                    r="3.5"
                    fill={isPcl ? '#F59E0B' : '#22D3EE'}
                  />
                  <text
                    x={pixelCol}
                    y={stemTopY - 6}
                    textAnchor="middle"
                    className="fill-slate-200 font-mono text-[10px]"
                  >
                    {line.wavenumber.toFixed(1)} (px {pixelCol})
                  </text>
                </g>
              );
            })}

            {/* Pixel Column Axis Labels */}
            <text
              x={leftMarginPx + 6}
              y="218"
              className="fill-cyan-400 font-mono text-[11px]"
            >
              Col {leftMarginPx} ({windowHighCm1.toFixed(1)} cm⁻¹)
            </text>
            <text
              x="520"
              y="218"
              textAnchor="middle"
              className="fill-slate-300 font-mono text-[11px]"
            >
              Active ROI: {params.ccdActiveWidthPx} px Wide × Bottom{' '}
              {params.ccdActiveHeightPx} px High
            </text>
            <text
              x={rightActiveLimitPx - 6}
              y="218"
              textAnchor="end"
              className="fill-cyan-400 font-mono text-[11px]"
            >
              Col {rightActiveLimitPx} ({windowLowCm1.toFixed(1)} cm⁻¹)
            </text>
          </svg>
        </div>
      </div>

      {/* Multi-Point CCD Occurrence Map for Primary Calibration Line */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">
              Multi-Point CCD Traversal & Lens Calibration Occurrences (
              {trackedLine?.wavenumber.toFixed(2)} cm⁻¹)
            </h3>
            <p className="text-xs text-slate-500">
              As the grating rotates in{' '}
              <strong>{recommendedMotorStepTicks}-step increments</strong>, this
              Neon peak strikes the {params.ccdActiveWidthPx} px active CCD at{' '}
              <strong>{trackedOccurrences.length} distinct positions</strong>{' '}
              through the spectrograph lenses
            </p>
          </div>
          <span className="font-mono text-xs font-semibold text-cyan-700 tabular-nums">
            Target: {params.targetOccurrencesPerLine} hits · Achieved:{' '}
            {trackedOccurrences.length} hits
          </span>
        </div>

        {/* Visual Pixel Bar showing all hits across the 1014 pixels */}
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 space-y-3">
          <div className="relative h-10 w-full rounded-md bg-slate-900 border border-slate-700 overflow-hidden">
            {trackedOccurrences.map((occ, idx) => {
              const pct =
                ((occ.pixelCol - leftMarginPx) /
                  Math.max(1, params.ccdActiveWidthPx)) *
                100;
              const isCurrentStep = occ.stepIdx === clampedStep;
              return (
                <button
                  key={occ.stepIdx}
                  type="button"
                  onClick={() => setStepIndex(occ.stepIdx)}
                  style={{ left: `${Math.max(1, Math.min(99, pct))}%` }}
                  title={`Occurrence #${idx + 1}: Step ${occ.stepIdx} (${occ.motorTicks} ticks) -> Pixel Col ${occ.pixelCol}`}
                  className={`absolute top-1 bottom-1 -translate-x-1/2 w-2.5 rounded-xs transition-transform ${
                    isCurrentStep
                      ? 'bg-amber-400 scale-y-110 ring-2 ring-white'
                      : 'bg-cyan-400/85 hover:bg-cyan-300'
                  }`}
                />
              );
            })}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
            {trackedOccurrences.map((occ, idx) => (
              <button
                key={occ.stepIdx}
                type="button"
                onClick={() => setStepIndex(occ.stepIdx)}
                className={`rounded-lg border p-2 text-left font-mono text-xs transition-colors tabular-nums ${
                  occ.stepIdx === clampedStep
                    ? 'border-amber-500 bg-amber-50 text-amber-950'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center justify-between text-[10px] text-slate-500">
                  <span>Hit #{idx + 1}</span>
                  <span>Step {occ.stepIdx}</span>
                </div>
                <div className="font-semibold text-slate-900 mt-0.5">
                  Px {occ.pixelCol}
                </div>
                <div className="text-[10px] text-slate-500">
                  {occ.motorTicks} ticks
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
