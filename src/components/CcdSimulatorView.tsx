import React, { useState } from 'react';
import {
  CALIBRATED_1800_FOCAL_LENGTH_MM,
  CALIBRATED_1800_INCLUDED_ANGLE_RAD,
  CalibrationSolution,
  calculateCcdWindowWidthCm1,
  calculateTurretKinematicsAtWavenumber,
  CCD_SATURATION_LIMIT_COUNTS,
  DEFAULT_FOCAL_LENGTH_MM,
  DEFAULT_INCLUDED_ANGLE_RAD,
  EMPIRICAL_1800_CUTOFF_BENCHMARKS,
  evaluateCcdExposureAndSaturation,
  MOTOR_STEPS_PER_DEGREE,
} from '../calibration/physicsEngine';
import {
  ChevronLeft,
  ChevronRight,
  Target,
  Zap,
  Focus,
  Sliders,
} from 'lucide-react';

interface CcdSimulatorViewProps {
  solution: CalibrationSolution;
}

export const CcdSimulatorView: React.FC<CcdSimulatorViewProps> = ({
  solution,
}) => {
  const {
    params,
    laserWavenumberCm1,
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
  // Optional direct centre wavenumber override when jumping to 0/100/4000/8000 empirical cut-offs
  const [customCentreNuCm1, setCustomCentreNuCm1] = useState<number | null>(
    null
  );

  const clampedStep = Math.max(0, Math.min(totalScanSteps, stepIndex));
  const stepDerivedCentreNuCm1 = Number(
    (scanHighCm1 - clampedStep * wavenumberShiftPerStepCm1).toFixed(2)
  );
  const currentCentreNuCm1 =
    customCentreNuCm1 !== null ? customCentreNuCm1 : stepDerivedCentreNuCm1;

  const kinematics = calculateTurretKinematicsAtWavenumber(
    currentCentreNuCm1,
    params.gratingLinesPerMm,
    laserWavenumberCm1,
    params.ccdActiveWidthPx,
    params.spectrograph
  );

  const currentWindowWidthCm1 = kinematics.ccdWindowWidthCm1;
  const windowHighCm1 = kinematics.windowHighAbsCm1;
  const windowLowCm1 = kinematics.windowLowAbsCm1;

  const leftMarginPx = Math.round(
    (params.ccdTotalWidthPx - params.ccdActiveWidthPx) / 2
  );
  const rightActiveLimitPx = leftMarginPx + params.ccdActiveWidthPx;

  // Evaluate CCD detector count rates & 1,000,000-count saturation guard across all Neon lines in window
  const exposureAnalysis = evaluateCcdExposureAndSaturation(
    windowHighCm1,
    windowLowCm1,
    params.gratingLinesPerMm,
    laserWavenumberCm1,
    params.ccdActiveWidthPx,
    leftMarginPx
  );

  // Map a wavenumber in [windowLowCm1, windowHighCm1] to pixel column [leftMarginPx, rightActiveLimitPx]
  const nuToPixelCol = (nuCm1: number) => {
    const ratio = (windowHighCm1 - nuCm1) / Math.max(1, currentWindowWidthCm1);
    return Math.round(leftMarginPx + ratio * params.ccdActiveWidthPx);
  };

  // Show both selected calibration lines AND any high-intensity saturating catalog lines (like 14219.7 or 17086.75) on the sensor
  const visibleLinesAtStep = exposureAnalysis.visibleEntries
    .filter(
      (entry) =>
        selectedLines.some((s) => s.id === entry.line.id) ||
        entry.countsPerSec >= 100_000 ||
        entry.line.isFocusAnchor
    )
    .map((entry) => ({
      line: entry.line,
      pixelCol: nuToPixelCol(entry.line.wavenumber),
      countsPerSec: entry.countsPerSec,
      saturatesAt1s: entry.saturatesAt1s,
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

  const jumpToWavenumber = (targetNuCm1: number) => {
    const nearestStep = Math.round(
      (scanHighCm1 - targetNuCm1) / Math.max(1, wavenumberShiftPerStepCm1)
    );
    if (nearestStep >= 0 && nearestStep <= totalScanSteps) {
      setStepIndex(nearestStep);
    }
    setCustomCentreNuCm1(Number(targetNuCm1.toFixed(2)));
  };

  return (
    <div className="space-y-6">
      {/* Turret Step Controller & Sensor Geometry Summary */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">
              Line-Scan CCD Sensor, Grating Turret Steps &amp; Exposure
              Saturation Simulator
            </h3>
            <p className="text-xs text-slate-500">
              {params.ccdType} sensor ({params.ccdTotalWidthPx}×
              {params.ccdTotalHeightPx} px · Active ROI: middle{' '}
              {params.ccdActiveWidthPx} px [cols {leftMarginPx}–
              {rightActiveLimitPx}] × bottom {params.ccdActiveHeightPx} rows) ·
              Turret scale: <strong>{MOTOR_STEPS_PER_DEGREE} steps/deg</strong>{' '}
              (100 steps = 0.07599°)
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => {
                setCustomCentreNuCm1(null);
                setStepIndex(Math.max(0, clampedStep - 1));
              }}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              Prev Step (-{recommendedMotorStepTicks} ticks)
            </button>
            <button
              type="button"
              onClick={() => {
                setCustomCentreNuCm1(null);
                setStepIndex(defaultStepIdx);
              }}
              className="inline-flex items-center gap-1.5 rounded-lg bg-amber-50 border border-amber-300 px-3 py-1.5 text-xs font-semibold text-amber-900 hover:bg-amber-100 whitespace-nowrap"
            >
              <Target className="h-3.5 w-3.5" />
              Center on PCL ({primaryCalibrationLine?.wavenumber.toFixed(2)}{' '}
              cm⁻¹)
            </button>
            <button
              type="button"
              onClick={() => {
                setCustomCentreNuCm1(null);
                setStepIndex(Math.min(totalScanSteps, clampedStep + 1));
              }}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap"
            >
              Next Step (+{recommendedMotorStepTicks} ticks)
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Quick-Jump Optical Benchmarks Bar (Focus Anchors, Saturation Peaks, Cut-Offs) */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-slate-100">
          <span className="text-[11px] font-semibold text-slate-500 mr-1">
            Quick Jump Turret Position:
          </span>
          <button
            type="button"
            onClick={() => jumpToWavenumber(18516.59)}
            className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-mono text-slate-700 hover:bg-slate-100 whitespace-nowrap"
          >
            <Focus className="h-3 w-3 text-cyan-600" />
            Focus High (18516.6)
          </button>
          <button
            type="button"
            onClick={() => jumpToWavenumber(17086.75)}
            className="inline-flex items-center gap-1 rounded-md border border-amber-200 bg-amber-50/70 px-2 py-1 text-[11px] font-mono text-amber-900 hover:bg-amber-100 whitespace-nowrap"
          >
            <Zap className="h-3 w-3 text-amber-600" />
            PCL 17086.75 (0.5s Sat.)
          </button>
          <button
            type="button"
            onClick={() => jumpToWavenumber(15619.51)}
            className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-mono text-slate-700 hover:bg-slate-100 whitespace-nowrap"
          >
            <Focus className="h-3 w-3 text-cyan-600" />
            Focus Low (15619.5)
          </button>
          <button
            type="button"
            onClick={() => jumpToWavenumber(14219.12)}
            className="inline-flex items-center gap-1 rounded-md border border-rose-200 bg-rose-50/70 px-2 py-1 text-[11px] font-mono text-rose-900 hover:bg-rose-100 whitespace-nowrap"
          >
            <Zap className="h-3 w-3 text-rose-600" />
            14219.7 Peak (997k cps!)
          </button>
          {EMPIRICAL_1800_CUTOFF_BENCHMARKS.map((bm) => {
            const bmCentreAbs = (bm.viewHighAbsCm1 + bm.viewLowAbsCm1) / 2;
            return (
              <button
                key={bm.cutoffRamanCm1}
                type="button"
                onClick={() => jumpToWavenumber(bmCentreAbs)}
                className="rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] font-mono text-slate-700 hover:bg-slate-50 whitespace-nowrap"
              >
                {bm.cutoffRamanCm1} Cut-Off ({bm.motorSteps.toLocaleString()}{' '}
                steps)
              </button>
            );
          })}
        </div>

        {/* Live Kinematics & CCD View Telemetry Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 pt-1">
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 font-mono text-xs">
            <span className="block font-sans text-[11px] text-slate-500">
              Absolute Turret Motor Position
            </span>
            <span className="text-sm font-bold text-slate-900 tabular-nums">
              {kinematics.absoluteMotorSteps.toLocaleString()} steps (
              {kinematics.turretAngleDeg.toFixed(4)}°)
            </span>
            <span className="block text-[11px] text-slate-500 tabular-nums">
              Scan Step {clampedStep}/{totalScanSteps} · Δ ={' '}
              {kinematics.cm1PerSingleMotorStep.toFixed(3)} cm⁻¹/step
            </span>
          </div>

          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 font-mono text-xs">
            <span className="block font-sans text-[11px] text-slate-500">
              CCD Visible Range (Abs cm⁻¹)
            </span>
            <span className="text-sm font-bold text-cyan-900 tabular-nums">
              {windowHighCm1.toFixed(1)} – {windowLowCm1.toFixed(1)} cm⁻¹
            </span>
            <span className="block text-[11px] text-slate-500 tabular-nums">
              Centre: {currentCentreNuCm1.toFixed(1)} cm⁻¹ · Span:{' '}
              {currentWindowWidthCm1.toFixed(1)} cm⁻¹
            </span>
          </div>

          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 font-mono text-xs">
            <span className="block font-sans text-[11px] text-slate-500">
              CCD Visible Range (Raman Shift)
            </span>
            <span className="text-sm font-bold text-slate-900 tabular-nums">
              {kinematics.windowLowRamanCm1.toFixed(1)} to{' '}
              {kinematics.windowHighRamanCm1.toFixed(1)} cm⁻¹
            </span>
            <span className="block text-[11px] text-slate-500 tabular-nums">
              Filter Passband: {kinematics.filterTransmissionPct}% transmission
            </span>
          </div>

          <div
            className={`rounded-lg border p-3 font-mono text-xs ${
              exposureAnalysis.isLimitedByStrongPeak
                ? 'border-amber-300 bg-amber-50/70'
                : 'border-emerald-200 bg-emerald-50/50'
            }`}
          >
            <span className="block font-sans text-[11px] text-slate-600">
              Max Safe Scan Duration (&lt;1M Counts)
            </span>
            <span className="text-sm font-bold text-slate-900 tabular-nums">
              {exposureAnalysis.recommendedExposureSec} s Exposure
              {exposureAnalysis.limitingLine
                ? ` (${exposureAnalysis.limitingLineCountsPerSec.toLocaleString()} cps)`
                : ''}
            </span>
            <span className="block text-[11px] text-slate-600 tabular-nums">
              {exposureAnalysis.isLimitedByStrongPeak &&
              exposureAnalysis.limitingLine
                ? `Limited by ${exposureAnalysis.limitingLine.wavenumber.toFixed(1)} (${exposureAnalysis.stepsToClearLimitingLine} steps to clear)`
                : `Saturates >1M at ${exposureAnalysis.hardSaturationExposureSec}s`}
            </span>
          </div>
        </div>

        {/* Step Scrubber Bar */}
        <div className="space-y-1.5 pt-1">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
            <span className="text-slate-700">
              100 Motor Steps = <strong>0.07599°</strong> (shifts CCD view by{' '}
              <strong>{kinematics.cm1Per100MotorSteps} cm⁻¹</strong> at this
              angle)
            </span>
            <span className="text-slate-700">
              Step Increment: <strong>{recommendedMotorStepTicks} steps</strong>{' '}
              ({wavenumberShiftPerStepCm1} cm⁻¹/scan)
            </span>
          </div>
          <input
            type="range"
            aria-label="Grating turret scan step index"
            min={0}
            max={totalScanSteps}
            value={clampedStep}
            onChange={(e) => {
              setCustomCentreNuCm1(null);
              setStepIndex(parseInt(e.target.value, 10));
            }}
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
              y="48"
              textAnchor="middle"
              className="fill-slate-600 font-mono text-[12px]"
            >
              UPPER SENSOR MASKED REGION (Rows 0 –{' '}
              {params.ccdTotalHeightPx - params.ccdActiveHeightPx - 1} of{' '}
              {params.ccdTotalHeightPx} px) · {params.ccdType} Architecture ·
              Recommended Scan: {exposureAnalysis.recommendedExposureSec}s
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
              CCD Centre Pixel (Col 520 · {currentCentreNuCm1.toFixed(1)} cm⁻¹ ·{' '}
              {kinematics.centreRamanCm1.toFixed(0)} Raman)
            </text>

            {/* Active Neon Spectral Lines hitting the CCD at this step */}
            {visibleLinesAtStep.map(
              ({ line, pixelCol, saturatesAt1s }, idx) => {
                const isPcl = primaryCalibrationLine?.id === line.id;
                const tierOffset = (idx % 3) * 18;
                const stemTopY = Math.max(
                  26,
                  110 - (line.relativeIntensity / 1000) * 42 - tierOffset
                );
                const strokeColor = isPcl
                  ? '#F59E0B'
                  : saturatesAt1s
                    ? '#FB7185'
                    : '#22D3EE';
                return (
                  <g key={line.id}>
                    {/* Vertical spectral line stripe in active bottom 30 rows */}
                    <line
                      x1={pixelCol}
                      y1="135"
                      x2={pixelCol}
                      y2="195"
                      stroke={strokeColor}
                      strokeWidth={isPcl || saturatesAt1s ? '4' : '2.5'}
                    />
                    {/* Intensity profile trace in upper HUD */}
                    <line
                      x1={pixelCol}
                      y1="135"
                      x2={pixelCol}
                      y2={stemTopY}
                      stroke={strokeColor}
                      strokeWidth="1.5"
                      strokeDasharray="2 2"
                    />
                    <circle
                      cx={pixelCol}
                      cy={stemTopY}
                      r="3.5"
                      fill={strokeColor}
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
              }
            )}

            {/* Pixel Column Axis Labels */}
            <text
              x={leftMarginPx + 6}
              y="218"
              className="fill-cyan-400 font-mono text-[11px]"
            >
              Col {leftMarginPx}: {windowHighCm1.toFixed(1)} cm⁻¹ (
              {kinematics.windowLowRamanCm1.toFixed(1)} Raman)
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
              Col {rightActiveLimitPx}: {windowLowCm1.toFixed(1)} cm⁻¹ (
              {kinematics.windowHighRamanCm1.toFixed(1)} Raman)
            </text>
          </svg>
        </div>

        {/* Dynamic Exposure & CCD Saturation Banner */}
        <div
          className={`rounded-lg border p-3.5 text-xs ${
            exposureAnalysis.isLimitedByStrongPeak
              ? 'border-amber-300 bg-amber-50 text-amber-950'
              : 'border-slate-200 bg-slate-50 text-slate-700'
          }`}
        >
          <div className="flex flex-wrap items-center justify-between gap-2 font-semibold mb-1">
            <span>
              CCD Detector Dynamic Range &amp; Saturation Analysis (Ceiling:{' '}
              {CCD_SATURATION_LIMIT_COUNTS.toLocaleString()} counts @ 1s)
            </span>
            <span className="font-mono">
              Active Scan Duration: {exposureAnalysis.recommendedExposureSec}s
            </span>
          </div>
          <p className="leading-relaxed">{exposureAnalysis.explanation}</p>
        </div>
      </div>

      {/* Empirical 1800 Grating Steps vs. Degrees vs. CCD View Range & WiRE X Calibrated Geometry */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-stretch">
        {/* Left 7 cols: Empirical Motor Steps vs. CCD View Cut-Off Table */}
        <div className="xl:col-span-7 rounded-xl border border-slate-200 bg-white p-5 space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">
              Empirical Grating Turret Steps vs. Degrees &amp; CCD View Range
              (532 nm · 1800 l/mm)
            </h3>
            <p className="text-xs text-slate-500">
              As the grating rotates to higher angles (higher Raman shift),{' '}
              <code className="font-mono">ν²·cos(θ − γ)</code> decreases —
              compressing the visible wavenumber span across the 1014-pixel CCD
              from 2009.3 cm⁻¹ down to 483.6 cm⁻¹
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-[11px] font-semibold text-slate-500">
                  <th className="py-2 pr-2">Cut-Off Shift</th>
                  <th className="py-2 px-2 text-right">Motor Steps</th>
                  <th className="py-2 px-2 text-right">Turret Angle</th>
                  <th className="py-2 px-2 text-right">
                    CCD View (Raman cm⁻¹)
                  </th>
                  <th className="py-2 px-2 text-right">CCD View (Abs cm⁻¹)</th>
                  <th className="py-2 px-2 text-right">CCD Span</th>
                  <th className="py-2 pl-2 text-right">Simulate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-xs font-mono tabular-nums">
                {EMPIRICAL_1800_CUTOFF_BENCHMARKS.map((bm) => {
                  const bmCentreAbs =
                    (bm.viewHighAbsCm1 + bm.viewLowAbsCm1) / 2;
                  return (
                    <tr key={bm.cutoffRamanCm1} className="hover:bg-slate-50">
                      <td className="py-2.5 pr-2 font-semibold text-slate-900">
                        {bm.cutoffRamanCm1} cm⁻¹
                      </td>
                      <td className="py-2.5 px-2 text-right text-cyan-800 font-semibold">
                        {bm.motorSteps.toLocaleString()}
                      </td>
                      <td className="py-2.5 px-2 text-right text-slate-700">
                        {bm.turretDegrees.toFixed(5)}°
                      </td>
                      <td className="py-2.5 px-2 text-right text-slate-800">
                        ({bm.viewLowRamanCm1.toFixed(2)}) –{' '}
                        {bm.viewHighRamanCm1.toFixed(2)}
                      </td>
                      <td className="py-2.5 px-2 text-right text-slate-600">
                        {bm.viewHighAbsCm1.toFixed(1)} –{' '}
                        {bm.viewLowAbsCm1.toFixed(1)}
                      </td>
                      <td className="py-2.5 px-2 text-right font-semibold text-emerald-700">
                        {bm.viewSpanCm1.toFixed(2)} cm⁻¹
                      </td>
                      <td className="py-2.5 pl-2 text-right font-sans">
                        <button
                          type="button"
                          onClick={() => jumpToWavenumber(bmCentreAbs)}
                          className="rounded-md border border-slate-300 bg-white px-2 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-100 whitespace-nowrap"
                        >
                          View on CCD
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right 5 cols: WiRE X Calibrated Optical Bench Parameters & Saturation Rules */}
        <div className="xl:col-span-5 rounded-xl border border-slate-200 bg-white p-5 flex flex-col justify-between space-y-4">
          <div className="space-y-2.5">
            <div className="flex items-center gap-2">
              <Sliders className="h-4 w-4 text-cyan-600 shrink-0" />
              <h3 className="text-sm font-semibold text-slate-900">
                WiRE X Calibration Geometry &amp; Exposure Zones (1800 l/mm)
              </h3>
            </div>
            <p className="text-xs leading-relaxed text-slate-600">
              Near and far internal lenses are focused using{' '}
              <strong className="font-mono">18516.592 cm⁻¹</strong> and{' '}
              <strong className="font-mono">15619.514 cm⁻¹</strong>, then zeroed
              on the <strong className="font-mono">17086.75 cm⁻¹</strong>{' '}
              Primary Calibration Line (0 offset prior to scanning 15300–19300
              cm⁻¹ Abs in 50 cm⁻¹ steps).
            </p>
            <p className="text-xs leading-relaxed text-slate-600">
              Because <strong className="font-mono">17086.75 cm⁻¹</strong>{' '}
              (720,172 cps) and{' '}
              <strong className="font-mono">14219.7 cm⁻¹</strong> (996,842 cps)
              approach or exceed 1,000,000 counts in 1 second, any weak line
              sharing the CCD with them is restricted to{' '}
              <strong>0.5s – 1.0s exposure</strong> until the grating steps far
              enough for those strong lines to leave the CCD.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 border-t border-slate-200 pt-3 font-mono text-xs">
            <div>
              <span className="block font-sans text-[11px] text-slate-500">
                Calibrated Focal Length
              </span>
              <span className="text-sm font-bold text-slate-900 tabular-nums">
                {CALIBRATED_1800_FOCAL_LENGTH_MM} mm
              </span>
              <span className="block text-[11px] text-slate-500 tabular-nums">
                Default: {DEFAULT_FOCAL_LENGTH_MM.toFixed(1)} mm
              </span>
            </div>
            <div>
              <span className="block font-sans text-[11px] text-slate-500">
                Calibrated Included Angle
              </span>
              <span className="text-sm font-bold text-slate-900 tabular-nums">
                {CALIBRATED_1800_INCLUDED_ANGLE_RAD} rad (29.970°)
              </span>
              <span className="block text-[11px] text-slate-500 tabular-nums">
                Default: {DEFAULT_INCLUDED_ANGLE_RAD} rad
              </span>
            </div>
            <div>
              <span className="block font-sans text-[11px] text-slate-500">
                Turret Step Ratio
              </span>
              <span className="text-sm font-bold text-cyan-800 tabular-nums">
                1316.0 steps/deg
              </span>
              <span className="block text-[11px] text-slate-500 tabular-nums">
                10,000 steps = 7.59878°
              </span>
            </div>
            <div>
              <span className="block font-sans text-[11px] text-slate-500">
                Filter Roll-Off &amp; Fit RMS
              </span>
              <span className="text-sm font-bold text-emerald-700 tabular-nums">
                0.1282 cm⁻¹ RMS
              </span>
              <span className="block text-[11px] text-slate-500 tabular-nums">
                65% signal @ 7500 cm⁻¹ shift
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Multi-Point CCD Occurrence Map for Primary Calibration Line */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">
              Multi-Point CCD Traversal &amp; Lens Calibration Occurrences (
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
              const isCurrentStep =
                customCentreNuCm1 === null && occ.stepIdx === clampedStep;
              return (
                <button
                  key={occ.stepIdx}
                  type="button"
                  onClick={() => {
                    setCustomCentreNuCm1(null);
                    setStepIndex(occ.stepIdx);
                  }}
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
                onClick={() => {
                  setCustomCentreNuCm1(null);
                  setStepIndex(occ.stepIdx);
                }}
                className={`rounded-lg border p-2 text-left font-mono text-xs transition-colors tabular-nums ${
                  customCentreNuCm1 === null && occ.stepIdx === clampedStep
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
