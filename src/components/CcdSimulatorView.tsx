import React, { useEffect, useState } from 'react';
import {
  CALIBRATED_1800_FOCAL_LENGTH_MM,
  CALIBRATED_1800_INCLUDED_ANGLE_RAD,
  CalibrationSolution,
  calculateCcdWindowBoundsCm1,
  calculateTurretKinematicsAtWavenumber,
  CCD_SATURATION_LIMIT_COUNTS,
  DEFAULT_FOCAL_LENGTH_MM,
  DEFAULT_INCLUDED_ANGLE_RAD,
  EMPIRICAL_1800_CUTOFF_BENCHMARKS,
  EMPIRICAL_VIRSA_2400_WINDOWS,
  evaluateCcdExposureAndSaturation,
  MOTOR_STEPS_PER_DEGREE,
  VIRSA_ACTIVE_Y_MAX_PX,
  VIRSA_ACTIVE_Y_MIN_PX,
  VIRSA_AFTER_CAL_RMS_CM1,
  VIRSA_BEFORE_CAL_RMS_CM1,
  VIRSA_CALIBRATED_2400_FOCAL_LENGTH_MM,
  VIRSA_CALIBRATED_2400_INCLUDED_ANGLE_RAD,
  VIRSA_CCD_TEMP_CELSIUS,
  VIRSA_DEFAULT_FOCAL_LENGTH_MM,
  VIRSA_DEFAULT_INCLUDED_ANGLE_RAD,
  VIRSA_FOCAL_CORRECTION_2400,
  VIRSA_INITIAL_PCL_OFFSET_CM1,
  VIRSA_MOTOR_STEPS_PER_DEGREE,
  VIRSA_PIXEL_PITCH_MM,
  VIRSA_ROOM_TEMP_CELSIUS,
  VIRSA_ZERO_ORDER_CENTRE_PX,
} from '../calibration/physicsEngine';
import {
  ChevronLeft,
  ChevronRight,
  Target,
  Zap,
  Focus,
  Sliders,
  Play,
  Pause,
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
    wireXStepAbsCm1,
    wireXTotalScanCount,
    primaryCalibrationLine,
    selectedLines,
  } = solution;

  const isVirsa = params.spectrograph === 'Virsa';
  const activeStepCm1 = Math.max(1, wireXStepAbsCm1);
  const activeTotalScans = Math.max(1, wireXTotalScanCount);
  const roomTempC = params.roomTemperatureC ?? VIRSA_ROOM_TEMP_CELSIUS;

  // Step 0 starts at scanLowCm1 (left side of scan bar) and steps up to scanHighCm1 (right side)
  const defaultStepIdx = Math.max(
    0,
    Math.min(
      activeTotalScans,
      Math.round(
        ((primaryCalibrationLine?.wavenumber ?? absCentreCm1) - scanLowCm1) /
          activeStepCm1
      )
    )
  );

  const [stepIndex, setStepIndex] = useState<number>(defaultStepIdx);
  const [isPlayingScan, setIsPlayingScan] = useState<boolean>(false);
  // Optional direct centre wavenumber override when jumping to empirical benchmarks
  const [customCentreNuCm1, setCustomCentreNuCm1] = useState<number | null>(
    null
  );
  // Allow user to toggle between Virsa 532nm / 2400 l/mm and inVia 532nm / 1800 l/mm empirical tables
  const [empiricalTableMode, setEmpiricalTableMode] = useState<
    'auto' | 'virsa2400' | 'invia1800'
  >('auto');

  useEffect(() => {
    if (!isPlayingScan) return;
    const timer = window.setInterval(() => {
      setCustomCentreNuCm1(null);
      setStepIndex((prev) => {
        if (prev >= activeTotalScans) {
          setIsPlayingScan(false);
          return activeTotalScans;
        }
        return prev + 1;
      });
    }, 180);
    return () => window.clearInterval(timer);
  }, [isPlayingScan, activeTotalScans]);

  const showVirsaEmpiricalTable =
    empiricalTableMode === 'virsa2400' ||
    (empiricalTableMode === 'auto' && isVirsa);

  const clampedStep = Math.max(0, Math.min(activeTotalScans, stepIndex));
  const stepDerivedCentreNuCm1 = Number(
    Math.min(
      scanHighCm1,
      scanLowCm1 + clampedStep * activeStepCm1
    ).toFixed(2)
  );
  const currentCentreNuCm1 =
    customCentreNuCm1 !== null ? customCentreNuCm1 : stepDerivedCentreNuCm1;

  const leftMarginPx =
    params.ccdActiveXMinPx ??
    Math.round((params.ccdTotalWidthPx - params.ccdActiveWidthPx) / 2);
  const rightActiveLimitPx =
    params.ccdActiveXMaxPx ?? leftMarginPx + params.ccdActiveWidthPx;
  const effectiveActiveWidthPx = Math.max(100, rightActiveLimitPx - leftMarginPx);
  const centrePixelCol =
    params.ccdZeroOrderCentrePx ?? VIRSA_ZERO_ORDER_CENTRE_PX;

  const kinematics = calculateTurretKinematicsAtWavenumber(
    currentCentreNuCm1,
    params.gratingLinesPerMm,
    laserWavenumberCm1,
    effectiveActiveWidthPx,
    params.spectrograph,
    leftMarginPx,
    rightActiveLimitPx,
    centrePixelCol,
    roomTempC
  );

  const currentWindowWidthCm1 = kinematics.ccdWindowWidthCm1;
  const windowHighCm1 = kinematics.windowHighAbsCm1;
  const windowLowCm1 = kinematics.windowLowAbsCm1;

  // Evaluate CCD detector count rates & 1,000,000-count saturation guard across all Neon lines in window
  const exposureAnalysis = evaluateCcdExposureAndSaturation(
    windowHighCm1,
    windowLowCm1,
    params.gratingLinesPerMm,
    laserWavenumberCm1,
    effectiveActiveWidthPx,
    leftMarginPx
  );

  // Map a wavenumber in [windowLowCm1, windowHighCm1] to pixel column [leftMarginPx, rightActiveLimitPx]
  // Left edge (leftMarginPx, Px 18) = windowLowCm1; Centre (centrePixelCol, Px 517) = currentCentreNuCm1; Right edge (rightActiveLimitPx, Px 1032) = windowHighCm1.
  // As the scan steps up from scanLowCm1 to scanHighCm1 (moving left-to-right across the scan bar), spectral lines enter on the right and run right-to-left across the CCD.
  const nuToPixelCol = (nuCm1: number) => {
    if (nuCm1 <= currentCentreNuCm1) {
      const lowSpan = Math.max(0.1, currentCentreNuCm1 - windowLowCm1);
      const fracFromLow = (nuCm1 - windowLowCm1) / lowSpan;
      return Math.round(
        leftMarginPx + fracFromLow * (centrePixelCol - leftMarginPx)
      );
    } else {
      const highSpan = Math.max(0.1, windowHighCm1 - currentCentreNuCm1);
      const fracFromCentre = (nuCm1 - currentCentreNuCm1) / highSpan;
      return Math.round(
        centrePixelCol + fracFromCentre * (rightActiveLimitPx - centrePixelCol)
      );
    }
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

  // Calculate all pixel column positions where the Primary Calibration Line hits the CCD across all scan steps (from scanLowCm1 to scanHighCm1)
  const trackedLine = primaryCalibrationLine || selectedLines[0] || null;
  const trackedOccurrences: {
    stepIdx: number;
    motorTicks: number;
    turretCentreCm1: number;
    pixelCol: number;
  }[] = [];

  if (trackedLine) {
    for (let s = 0; s <= activeTotalScans; s++) {
      const centreNu = Math.min(
        scanHighCm1,
        scanLowCm1 + s * activeStepCm1
      );
      const stepKinematics = calculateTurretKinematicsAtWavenumber(
        centreNu,
        params.gratingLinesPerMm,
        laserWavenumberCm1,
        effectiveActiveWidthPx,
        params.spectrograph,
        leftMarginPx,
        rightActiveLimitPx,
        centrePixelCol,
        roomTempC
      );
      let pxCol: number;
      if (trackedLine.wavenumber <= centreNu) {
        const lowSpan = Math.max(0.1, centreNu - stepKinematics.windowLowAbsCm1);
        const fracFromLow =
          (trackedLine.wavenumber - stepKinematics.windowLowAbsCm1) / lowSpan;
        pxCol = Math.round(
          leftMarginPx + fracFromLow * (centrePixelCol - leftMarginPx)
        );
      } else {
        const highSpan = Math.max(0.1, stepKinematics.windowHighAbsCm1 - centreNu);
        const fracFromCentre = (trackedLine.wavenumber - centreNu) / highSpan;
        pxCol = Math.round(
          centrePixelCol +
            fracFromCentre * (rightActiveLimitPx - centrePixelCol)
        );
      }
      if (pxCol >= leftMarginPx && pxCol <= rightActiveLimitPx) {
        trackedOccurrences.push({
          stepIdx: s,
          motorTicks: stepKinematics.absoluteMotorSteps,
          turretCentreCm1: Number(centreNu.toFixed(1)),
          pixelCol: pxCol,
        });
      }
    }
  }

  const jumpToWavenumber = (targetNuCm1: number) => {
    setIsPlayingScan(false);
    const nearestStep = Math.round(
      (targetNuCm1 - scanLowCm1) / activeStepCm1
    );
    if (nearestStep >= 0 && nearestStep <= activeTotalScans) {
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
              {isVirsa ? (
                <>
                  Virsa {params.ccdType} sensor ({params.ccdTotalWidthPx}×
                  {params.ccdTotalHeightPx} px · Active X:{' '}
                  <strong>
                    {leftMarginPx}–{rightActiveLimitPx}
                  </strong>{' '}
                  [{effectiveActiveWidthPx} px, Centre{' '}
                  <strong>Pixel {centrePixelCol}</strong>] × Active Y:{' '}
                  <strong>
                    {VIRSA_ACTIVE_Y_MIN_PX}–{VIRSA_ACTIVE_Y_MAX_PX}
                  </strong>{' '}
                  [{params.ccdActiveHeightPx} rows, 50µm fibre] · Pitch{' '}
                  <strong>{VIRSA_PIXEL_PITCH_MM} mm</strong> · Cooled{' '}
                  <strong>{VIRSA_CCD_TEMP_CELSIUS} °C</strong> in{' '}
                  <strong>{roomTempC.toFixed(1)} °C</strong> Air ·{' '}
                  <strong>{VIRSA_MOTOR_STEPS_PER_DEGREE} steps/deg</strong>)
                </>
              ) : (
                <>
                  {params.ccdType} sensor ({params.ccdTotalWidthPx}×
                  {params.ccdTotalHeightPx} px · Active X:{' '}
                  <strong>
                    {leftMarginPx}–{rightActiveLimitPx}
                  </strong>{' '}
                  [{effectiveActiveWidthPx} px, Centre{' '}
                  <strong>Pixel {centrePixelCol}</strong>] × bottom{' '}
                  {params.ccdActiveHeightPx} rows) ·{' '}
                  <strong>{roomTempC.toFixed(1)} °C</strong> Air · Turret scale:{' '}
                  <strong>{MOTOR_STEPS_PER_DEGREE} steps/deg</strong> (100 steps
                  = 0.07599°)
                </>
              )}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => {
                if (isPlayingScan) {
                  setIsPlayingScan(false);
                } else {
                  setCustomCentreNuCm1(null);
                  if (clampedStep >= activeTotalScans) {
                    setStepIndex(0);
                  }
                  setIsPlayingScan(true);
                }
              }}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap ${
                isPlayingScan
                  ? 'border-rose-300 bg-rose-50 text-rose-800 hover:bg-rose-100'
                  : 'border-cyan-600 bg-cyan-600 text-white hover:bg-cyan-700'
              }`}
            >
              {isPlayingScan ? (
                <>
                  <Pause className="h-3.5 w-3.5" />
                  Pause Scan
                </>
              ) : (
                <>
                  <Play className="h-3.5 w-3.5" />
                  Run Calibration Scan
                </>
              )}
            </button>
            <button
              type="button"
              onClick={() => {
                setIsPlayingScan(false);
                setCustomCentreNuCm1(null);
                setStepIndex(Math.max(0, clampedStep - 1));
              }}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              Prev Step (-{wireXStepAbsCm1} cm⁻¹)
            </button>
            <button
              type="button"
              onClick={() => {
                setIsPlayingScan(false);
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
                setIsPlayingScan(false);
                setCustomCentreNuCm1(null);
                setStepIndex(Math.min(activeTotalScans, clampedStep + 1));
              }}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap"
            >
              Next Step (+{wireXStepAbsCm1} cm⁻¹)
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Quick-Jump Optical Benchmarks Bar (Focus Anchors, Saturation Peaks, Cut-Offs) */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-slate-100">
          <span className="text-[11px] font-semibold text-slate-500 mr-1">
            Quick Jump Turret Position:
          </span>
          {isVirsa ? (
            <>
              <button
                type="button"
                onClick={() => jumpToWavenumber(17086.75)}
                className="inline-flex items-center gap-1 rounded-md border border-amber-200 bg-amber-50/70 px-2 py-1 text-[11px] font-mono text-amber-900 hover:bg-amber-100 whitespace-nowrap"
              >
                <Zap className="h-3 w-3 text-amber-600" />
                PCL 17086.75 (-12.95 offset · 109k e⁻/cm⁻¹ @ 0.1s · FWHM 2.23)
              </button>
              <button
                type="button"
                onClick={() => jumpToWavenumber(15619.51)}
                className="inline-flex items-center gap-1 rounded-md border border-emerald-200 bg-emerald-50/70 px-2 py-1 text-[11px] font-mono text-emerald-900 hover:bg-emerald-100 whitespace-nowrap"
              >
                <Target className="h-3 w-3 text-emerald-600" />
                Best Line 15619.514 (±0.03 cm⁻¹ err)
              </button>
              {[14430.7, 15370.0, 16278.53, 18516.59, 19200.0, 24000.0].map(
                (nu) => (
                  <button
                    key={nu}
                    type="button"
                    onClick={() => jumpToWavenumber(nu)}
                    className="rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] font-mono text-slate-700 hover:bg-slate-50 whitespace-nowrap"
                  >
                    Centre {nu.toFixed(2)} cm⁻¹
                  </button>
                )
              )}
            </>
          ) : (
            <>
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
            </>
          )}
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
              WiRE X Step {wireXStepAbsCm1} Abs cm⁻¹ ({wireXTotalScanCount}{' '}
              scans) · Δ = {kinematics.cm1PerSingleMotorStep.toFixed(3)}{' '}
              cm⁻¹/step
            </span>
          </div>

          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 font-mono text-xs">
            <span className="block font-sans text-[11px] text-slate-500">
              CCD View Window (Abs cm⁻¹)
            </span>
            <span className="text-sm font-bold text-cyan-900 tabular-nums">
              {windowLowCm1.toFixed(2)} – {windowHighCm1.toFixed(2)} cm⁻¹
            </span>
            <span className="block text-[11px] text-slate-500 tabular-nums">
              Centre: {currentCentreNuCm1.toFixed(2)} cm⁻¹ · Span:{' '}
              {currentWindowWidthCm1.toFixed(2)} cm⁻¹
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
              {params.filterType === 'standard'
                ? `Std 50–4000 Filter Trans: ${kinematics.filterTransmissionPct}%`
                : 'Cal Scan: No Filters in Path'}
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
              {isVirsa && Math.abs(currentCentreNuCm1 - 17086.75) < 400
                ? '0.1 s Exposure (109,074 e⁻/cm⁻¹)'
                : `${exposureAnalysis.recommendedExposureSec} s Exposure`}
              {!isVirsa && exposureAnalysis.limitingLine
                ? ` (${exposureAnalysis.limitingLineCountsPerSec.toLocaleString()} cps)`
                : ''}
            </span>
            <span className="block text-[11px] text-slate-600 tabular-nums">
              {isVirsa && Math.abs(currentCentreNuCm1 - 17086.75) < 400
                ? '56,960 raw counts/px @ 17086.75 (FWHM 2.23 cm⁻¹)'
                : exposureAnalysis.isLimitedByStrongPeak &&
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
              WiRE X Step:{' '}
              <strong>{wireXStepAbsCm1} Abs cm⁻¹</strong> ({wireXTotalScanCount}{' '}
              scans across {scanLowCm1.toFixed(0)}–{scanHighCm1.toFixed(0)}{' '}
              cm⁻¹)
            </span>
          </div>
          <input
            type="range"
            aria-label="Grating turret scan step index"
            min={0}
            max={activeTotalScans}
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
            aria-label="1040 by 256 pixel Line-Scan CCD sensor showing active readout region"
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

            {/* Guard bands (left 10px/13px and right 10px/13px) */}
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

            {/* Upper / Masked region label */}
            <text
              x="520"
              y="38"
              textAnchor="middle"
              className="fill-slate-500 font-mono text-[11.5px]"
            >
              {isVirsa
                ? `Virsa · Active X: ${leftMarginPx}–${rightActiveLimitPx} (${params.ccdActiveWidthPx} px) · Active Y: ${VIRSA_ACTIVE_Y_MIN_PX}–${VIRSA_ACTIVE_Y_MAX_PX} (${params.ccdActiveHeightPx} rows) · Pitch ${VIRSA_PIXEL_PITCH_MM} mm · ${VIRSA_CCD_TEMP_CELSIUS} °C`
                : `UPPER SENSOR MASKED REGION (Rows 0 – ${params.ccdTotalHeightPx - params.ccdActiveHeightPx - 1} of ${params.ccdTotalHeightPx} px) · ${params.ccdType} Architecture · Recommended Scan: ${exposureAnalysis.recommendedExposureSec}s`}
            </text>

            {/* Active Readout Strip (Virsa Y: 125-145 in middle vs inVia bottom 30 rows) */}
            <rect
              x={leftMarginPx}
              y={isVirsa ? '105' : '135'}
              width={effectiveActiveWidthPx}
              height={isVirsa ? '48' : '60'}
              fill="#0F172A"
              stroke="#06B6D4"
              strokeWidth="1.5"
            />

            {/* Centre Pixel Crosshair (Pixel 517) */}
            <line
              x1={centrePixelCol}
              y1="15"
              x2={centrePixelCol}
              y2="195"
              stroke="#F59E0B"
              strokeDasharray="4 4"
              strokeWidth="1"
            />

            {/* Active Neon Spectral Lines hitting the CCD at this step */}
            {visibleLinesAtStep.map(
              ({ line, pixelCol, saturatesAt1s }, idx) => {
                const isPcl = primaryCalibrationLine?.id === line.id;
                const tierOffset = (idx % 3) * 16;
                const stripTopY = isVirsa ? 105 : 135;
                const stripBotY = isVirsa ? 153 : 195;
                const stemTopY = Math.max(
                  24,
                  stripTopY - 22 - (line.relativeIntensity / 1000) * 32 - tierOffset
                );
                const strokeColor = isPcl
                  ? '#F59E0B'
                  : saturatesAt1s
                    ? '#FB7185'
                    : '#22D3EE';
                return (
                  <g key={line.id}>
                    {/* Vertical spectral line stripe in active readout rows */}
                    <line
                      x1={pixelCol}
                      y1={stripTopY}
                      x2={pixelCol}
                      y2={stripBotY}
                      stroke={strokeColor}
                      strokeWidth={isPcl || saturatesAt1s ? '4' : '2.5'}
                    />
                    {/* Intensity profile trace in upper HUD */}
                    <line
                      x1={pixelCol}
                      y1={stripTopY}
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

            {/* Pixel Column Axis Labels (Left = Low cm-1, Centre = Centre (Pixel 517 · ...), Right = High cm-1) */}
            <text
              x={leftMarginPx + 6}
              y="218"
              className="fill-cyan-400 font-mono text-[11px]"
            >
              Px {leftMarginPx}: {windowLowCm1.toFixed(2)} cm⁻¹ (
              {kinematics.windowHighRamanCm1.toFixed(1)} Raman)
            </text>
            <text
              x={centrePixelCol}
              y="218"
              textAnchor="middle"
              className="fill-amber-400 font-mono text-[11px]"
            >
              {`Centre (Pixel ${centrePixelCol} · ${currentCentreNuCm1.toFixed(2)} cm⁻¹ · ${kinematics.centreRamanCm1.toFixed(0)} Raman)`}
            </text>
            <text
              x={rightActiveLimitPx - 6}
              y="218"
              textAnchor="end"
              className="fill-cyan-400 font-mono text-[11px]"
            >
              Px {rightActiveLimitPx}: {windowHighCm1.toFixed(2)} cm⁻¹ (
              {kinematics.windowLowRamanCm1.toFixed(1)} Raman)
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
              {isVirsa
                ? 'Virsa 50µm Fibre Calibration Scan: 0.1s (109,074 e⁻/cm⁻¹ @ 17086.75 cm⁻¹)'
                : `Active Scan Duration: ${exposureAnalysis.recommendedExposureSec}s`}
            </span>
          </div>
          <p className="leading-relaxed">
            {isVirsa ? (
              <>
                With a <strong>0.1 s scan</strong> on the Virsa 50µm fibre, the
                neon bulb is positioned to give{' '}
                <strong className="font-mono">109,074 counts</strong> in{' '}
                <em>electrons per wavenumber</em> (or{' '}
                <strong className="font-mono">
                  56,960 raw counts per pixel
                </strong>
                ), just below saturating the CCD, producing a{' '}
                <strong className="font-mono">17086.75 cm⁻¹</strong> line with{' '}
                <strong className="font-mono">FWHM = 2.23 cm⁻¹</strong> (offset
                by <strong className="font-mono">-12.95 Abs cm⁻¹</strong> prior
                to running the 108 calibration scans from 14000–19400 cm⁻¹).
              </>
            ) : (
              exposureAnalysis.explanation
            )}
          </p>
        </div>
      </div>

      {/* Empirical CCD View Windows & Before/After Calibration Comparison */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-stretch">
        {/* Left 7 cols: Empirical CCD View Range Table (Virsa 532nm / 2400 l/mm OR inVia 532nm / 1800 l/mm) */}
        <div className="xl:col-span-7 rounded-xl border border-slate-200 bg-white p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">
                {showVirsaEmpiricalTable
                  ? 'Empirical Virsa CCD View Windows vs. Centre Wavenumber (532 nm · 2400 l/mm)'
                  : 'Empirical Grating Turret Steps vs. Degrees & CCD View Range (inVia 532 nm · 1800 l/mm)'}
              </h3>
              <p className="text-xs text-slate-500">
                {showVirsaEmpiricalTable
                  ? `Active X range ${leftMarginPx}–${rightActiveLimitPx} (${effectiveActiveWidthPx} px, Zero-order Pixel ${centrePixelCol}, Pitch -0.026 mm, F = 202.725 mm, Included angle = 0.660570 rad)`
                  : 'As the grating rotates to higher angles (higher Raman shift), ν²·cos(θ − γ) decreases — compressing the visible wavenumber span'}
              </p>
            </div>
            <div className="inline-flex rounded-lg bg-slate-100 p-0.5 text-xs shrink-0">
              <button
                type="button"
                onClick={() => setEmpiricalTableMode('virsa2400')}
                className={`rounded-md px-2.5 py-1 font-medium transition-colors ${
                  showVirsaEmpiricalTable
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Virsa 532 / 2400
              </button>
              <button
                type="button"
                onClick={() => setEmpiricalTableMode('invia1800')}
                className={`rounded-md px-2.5 py-1 font-medium transition-colors ${
                  !showVirsaEmpiricalTable
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                inVia 532 / 1800
              </button>
            </div>
          </div>

          {showVirsaEmpiricalTable ? (
            <div className="overflow-x-auto max-h-88">
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 bg-white">
                  <tr className="border-b border-slate-200 text-[11px] font-semibold text-slate-500">
                    <th className="py-2 pr-2">Centre (Abs cm⁻¹)</th>
                    <th className="py-2 px-2 text-right">
                      CCD View Window (X: {leftMarginPx}–{rightActiveLimitPx})
                    </th>
                    <th className="py-2 px-2 text-right">CCD Span</th>
                    <th className="py-2 px-2 text-right">
                      Low / High Split (Px {centrePixelCol})
                    </th>
                    <th className="py-2 pl-2 text-right">Simulate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-xs font-mono tabular-nums">
                  {EMPIRICAL_VIRSA_2400_WINDOWS.map((win) => {
                    const liveBounds = calculateCcdWindowBoundsCm1(
                      win.centreAbsCm1,
                      2400,
                      effectiveActiveWidthPx,
                      'Virsa',
                      leftMarginPx,
                      rightActiveLimitPx,
                      centrePixelCol,
                      roomTempC
                    );
                    const lowDelta =
                      win.centreAbsCm1 - liveBounds.windowLowAbsCm1;
                    const highDelta =
                      liveBounds.windowHighAbsCm1 - win.centreAbsCm1;
                    return (
                      <tr key={win.centreAbsCm1} className="hover:bg-slate-50">
                        <td className="py-2 pr-2 font-semibold text-slate-900">
                          {win.centreAbsCm1.toFixed(2)}
                        </td>
                        <td className="py-2 px-2 text-right text-cyan-800 font-semibold">
                          {liveBounds.windowLowAbsCm1.toFixed(2)} –{' '}
                          {liveBounds.windowHighAbsCm1.toFixed(2)}
                        </td>
                        <td className="py-2 px-2 text-right font-semibold text-emerald-700">
                          {liveBounds.windowSpanCm1.toFixed(2)} cm⁻¹
                        </td>
                        <td className="py-2 px-2 text-right text-slate-500">
                          -{lowDelta.toFixed(1)} / +{highDelta.toFixed(1)}
                        </td>
                        <td className="py-2 pl-2 text-right font-sans">
                          <button
                            type="button"
                            onClick={() => jumpToWavenumber(win.centreAbsCm1)}
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
          ) : (
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
          )}
        </div>

        {/* Right 5 cols: WiRE X Calibrated Optical Bench Parameters & Before/After Calibration Fit */}
        <div className="xl:col-span-5 rounded-xl border border-slate-200 bg-white p-5 flex flex-col justify-between space-y-4">
          <div className="space-y-2.5">
            <div className="flex items-center gap-2">
              <Sliders className="h-4 w-4 text-cyan-600 shrink-0" />
              <h3 className="text-sm font-semibold text-slate-900">
                {showVirsaEmpiricalTable
                  ? 'Virsa 532 nm · 2400 l/mm Before vs. After Calibration Fit'
                  : 'WiRE X Calibration Geometry & Exposure Zones (inVia 1800 l/mm)'}
              </h3>
            </div>
            {showVirsaEmpiricalTable ? (
              <>
                <p className="text-xs leading-relaxed text-slate-600">
                  <strong>Virsa 50µm fibre setup:</strong> Neon lines focused
                  with the single Virsa movable lens for maximum signal at{' '}
                  <strong className="font-mono">17086.75 cm⁻¹</strong> and
                  offset by{' '}
                  <strong className="font-mono">
                    {VIRSA_INITIAL_PCL_OFFSET_CM1} Abs cm⁻¹
                  </strong>
                  . At <strong>0.1 s</strong> exposure, the neon bulb gives{' '}
                  <strong className="font-mono">109,074 e⁻/cm⁻¹</strong> (
                  <strong className="font-mono">56,960 raw counts/px</strong>)
                  with <strong className="font-mono">FWHM = 2.23 cm⁻¹</strong>.
                </p>
                <p className="text-xs leading-relaxed text-slate-600">
                  Stepping by <strong className="font-mono">50 Abs cm⁻¹</strong>{' '}
                  across <strong className="font-mono">14000–19400 cm⁻¹</strong>{' '}
                  (<strong className="font-mono">108 scans</strong>, motor
                  positions <strong className="font-mono">-53,500</strong> to{' '}
                  <strong className="font-mono">-81,000 steps</strong>) reduces
                  RMS Deviation from{' '}
                  <strong className="font-mono text-rose-700">
                    {VIRSA_BEFORE_CAL_RMS_CM1} cm⁻¹
                  </strong>{' '}
                  to{' '}
                  <strong className="font-mono text-emerald-700">
                    {VIRSA_AFTER_CAL_RMS_CM1} cm⁻¹
                  </strong>
                  . The most accurate line after calibration is{' '}
                  <strong className="font-mono">15619.514 cm⁻¹</strong> (error{' '}
                  <strong className="font-mono">±0.03 cm⁻¹</strong> across the
                  CCD).
                </p>
              </>
            ) : (
              <>
                <p className="text-xs leading-relaxed text-slate-600">
                  On <strong>inVia</strong>, multiple internal lenses (near
                  &amp; far) are focused by optimising the{' '}
                  <strong>intensity / peak height</strong> of lines at both ends
                  of the spectrum (e.g.{' '}
                  <strong className="font-mono">18516.592 cm⁻¹</strong> &amp;{' '}
                  <strong className="font-mono">15619.514 cm⁻¹</strong> on 532
                  nm), then zeroed on the{' '}
                  <strong className="font-mono">17086.75 cm⁻¹</strong> Primary
                  Calibration Line (0 offset prior to scanning 15300–19300 cm⁻¹
                  Abs in 50 cm⁻¹ steps).
                </p>
                <p className="text-xs leading-relaxed text-slate-600">
                  Because <strong className="font-mono">17086.75 cm⁻¹</strong>{' '}
                  (720,172 cps) and{' '}
                  <strong className="font-mono">14219.7 cm⁻¹</strong> (996,842
                  cps) approach or exceed 1,000,000 counts in 1 second, any weak
                  line sharing the CCD with them is restricted to{' '}
                  <strong>0.5s – 1.0s exposure</strong> until the grating steps
                  far enough for those strong lines to leave the CCD.
                </p>
              </>
            )}
          </div>

          {showVirsaEmpiricalTable ? (
            <div className="grid grid-cols-2 gap-3 border-t border-slate-200 pt-3 font-mono text-xs">
              <div>
                <span className="block font-sans text-[11px] text-slate-500">
                  Focal Length (Before → After)
                </span>
                <span className="text-sm font-bold text-slate-900 tabular-nums">
                  {VIRSA_CALIBRATED_2400_FOCAL_LENGTH_MM.toFixed(4)} mm
                </span>
                <span className="block text-[11px] text-slate-500 tabular-nums">
                  Before: {VIRSA_DEFAULT_FOCAL_LENGTH_MM.toFixed(1)} mm (Corr:{' '}
                  {VIRSA_FOCAL_CORRECTION_2400})
                </span>
              </div>
              <div>
                <span className="block font-sans text-[11px] text-slate-500">
                  Included Angle (Before → After)
                </span>
                <span className="text-sm font-bold text-slate-900 tabular-nums">
                  {VIRSA_CALIBRATED_2400_INCLUDED_ANGLE_RAD.toFixed(6)} rad
                </span>
                <span className="block text-[11px] text-slate-500 tabular-nums">
                  37.847895° (Before: {VIRSA_DEFAULT_INCLUDED_ANGLE_RAD} rad)
                </span>
              </div>
              <div>
                <span className="block font-sans text-[11px] text-slate-500">
                  Zero Offset &amp; Motor Step
                </span>
                <span className="text-sm font-bold text-cyan-800 tabular-nums">
                  -0.000340 rad (-1316/deg)
                </span>
                <span className="block text-[11px] text-slate-500 tabular-nums">
                  Before: -0.000839 rad · Pixel 517
                </span>
              </div>
              <div>
                <span className="block font-sans text-[11px] text-slate-500">
                  RMS Deviation (Before → After)
                </span>
                <span className="text-sm font-bold text-emerald-700 tabular-nums">
                  {VIRSA_AFTER_CAL_RMS_CM1} cm⁻¹ RMS
                </span>
                <span className="block text-[11px] text-slate-500 tabular-nums">
                  Before: {VIRSA_BEFORE_CAL_RMS_CM1} cm⁻¹ (15619.5: ±0.03)
                </span>
              </div>
            </div>
          ) : (
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
                  Std Filter Trans. &amp; Fit RMS
                </span>
                <span className="text-sm font-bold text-emerald-700 tabular-nums">
                  0.1282 cm⁻¹ RMS
                </span>
                <span className="block text-[11px] text-slate-500 tabular-nums">
                  50–4000 filter: 65% @ 7500 cm⁻¹
                </span>
              </div>
            </div>
          )}
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
              As the grating steps in{' '}
              <strong>{wireXStepAbsCm1} Abs cm⁻¹ increments</strong> ({activeTotalScans}{' '}
              scans), this Neon peak strikes the {params.ccdActiveWidthPx} px
              active CCD at{' '}
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
