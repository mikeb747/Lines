import { NEON_CATALOG, NeonLine } from './neonCatalog';

export type SpectrographModel = 'inVia' | 'Virsa' | 'Strava';
export type FilterType = 'standard' | 'rpl_pl' | 'custom';
export type CCDArchitecture = 'FDA' | 'BDA';

/**
 * Empirical hardware constants from Renishaw WiRE X Calibration (inVia 532nm / 1800 l/mm reference):
 * - 1316.0 motor steps = 1.00000 degree of grating turret rotation
 *   (100 steps = 0.07599°, 1000 steps = 0.75988°, 10000 steps = 7.59878°)
 * - Default focal length = 250.0 mm (249.2607 mm / 249.278 mm after calibration)
 * - Default included angle = 0.5229 rad / 29.960° (0.523113 rad / 29.970054° after calibration)
 * - CCD Detector Saturation Ceiling = 1,000,000 counts (above 1,000,000 counts at 1s saturates detector)
 */
export const MOTOR_STEPS_PER_DEGREE = 1316.0;
export const DEFAULT_FOCAL_LENGTH_MM = 250.0;
export const CALIBRATED_1800_FOCAL_LENGTH_MM = 249.2607;
export const DEFAULT_INCLUDED_ANGLE_RAD = 0.5229;
export const CALIBRATED_1800_INCLUDED_ANGLE_RAD = 0.523113;
export const CCD_SATURATION_LIMIT_COUNTS = 1_000_000;

export interface EmpiricalCutoffBenchmark {
  cutoffRamanCm1: number;
  motorSteps: number;
  turretDegrees: number;
  viewLowRamanCm1: number;
  viewHighRamanCm1: number;
  viewHighAbsCm1: number;
  viewLowAbsCm1: number;
  viewSpanCm1: number;
}

/**
 * Exact empirical CCD view limits vs. motor steps from the 532nm / 1800 l/mm reference system (update.txt).
 * Laser excitation = 532.096 nm (18793.6 cm^-1 in WiRE X Calibration).
 */
export const EMPIRICAL_1800_CUTOFF_BENCHMARKS: EmpiricalCutoffBenchmark[] = [
  {
    cutoffRamanCm1: 0,
    motorSteps: 36788,
    turretDegrees: 27.95441,
    viewLowRamanCm1: -1081.05,
    viewHighRamanCm1: 928.22,
    viewHighAbsCm1: 19874.65,
    viewLowAbsCm1: 17865.38,
    viewSpanCm1: 2009.27,
  },
  {
    cutoffRamanCm1: 100,
    motorSteps: 37015,
    turretDegrees: 28.1269,
    viewLowRamanCm1: -968.62,
    viewHighRamanCm1: 1017.63,
    viewHighAbsCm1: 19762.22,
    viewLowAbsCm1: 17775.97,
    viewSpanCm1: 1986.25,
  },
  {
    cutoffRamanCm1: 4000,
    motorSteps: 53744,
    turretDegrees: 40.83891,
    viewLowRamanCm1: 3374.49,
    viewHighRamanCm1: 4546.59,
    viewHighAbsCm1: 15419.11,
    viewLowAbsCm1: 14247.01,
    viewSpanCm1: 1172.1,
  },
  {
    cutoffRamanCm1: 8000,
    motorSteps: 81385,
    turretDegrees: 61.84271,
    viewLowRamanCm1: 7742.65,
    viewHighRamanCm1: 8226.22,
    viewHighAbsCm1: 11050.95,
    viewLowAbsCm1: 10567.38,
    viewSpanCm1: 483.57,
  },
];

export interface TurretKinematicsState {
  centreNuCm1: number;
  centreRamanCm1: number;
  wavelengthNm: number;
  turretAngleDeg: number;
  turretAngleRad: number;
  absoluteMotorSteps: number;
  ccdWindowWidthCm1: number;
  windowHighAbsCm1: number;
  windowLowAbsCm1: number;
  windowLowRamanCm1: number;
  windowHighRamanCm1: number;
  cm1PerSingleMotorStep: number;
  cm1Per100MotorSteps: number;
  degPer100MotorSteps: number;
  filterTransmissionPct: number;
}

export interface CcdLineSaturationEntry {
  line: NeonLine;
  pixelCol: number;
  countsPerSec: number;
  countsAtRecommendedExposure: number;
  saturatesAt1s: boolean;
  saturationTimeSec: number;
}

export interface CcdExposureAnalysis {
  recommendedExposureSec: number; // 0.5, 1, 5, or 10 seconds
  maxSafeExposureSec: number; // Exposure where strongest line reaches 800,000 counts
  hardSaturationExposureSec: number; // Exposure where strongest line hits 1,000,000 counts
  limitingLine: NeonLine | null;
  limitingLineCountsPerSec: number;
  isLimitedByStrongPeak: boolean;
  stepsToClearLimitingLine: number; // Motor steps needed for the saturating line to exit the CCD
  cm1ToClearLimitingLine: number;
  visibleEntries: CcdLineSaturationEntry[];
  explanation: string;
}

export interface CalibrationParameters {
  spectrograph: SpectrographModel;
  laserNm: number; // Nominal laser wavelength in nm (e.g., 405, 457, 532, 633, 660, 785, 830)
  gratingLinesPerMm: number; // Groove density in l/mm (e.g., 600, 1200, 1500, 1800, 2400, 3000)
  filterType: FilterType;
  customRamanMinCm1: number; // Used when filterType === 'custom' or overridden
  customRamanMaxCm1: number;
  ccdType: CCDArchitecture; // FDA (Front-side Direct Architecture) vs BDA (Back-Illuminated)
  ccdTotalWidthPx: number; // Default 1040
  ccdActiveWidthPx: number; // Default 1014 (middle 1014 pixels)
  ccdTotalHeightPx: number; // Default 256
  ccdActiveHeightPx: number; // Default 30 (bottom 30 pixels)
  ccdDetectionCutoffCm1: number; // Default 9800 cm^-1 (or 9239 cm^-1 extended NIR tail)
  enforceCcdCutoff: boolean; // Whether to cap Raman range by CCD silicon red-limit
  targetOccurrencesPerLine: number; // Default 8 occurrences across the CCD
  targetLineCount: number; // Desired number of calibration lines across range (e.g., 8 - 14)
  minRelativeIntensity: number; // Minimum neon peak intensity threshold
  manualPclOverrideCm1?: number | null; // Optional manual PCL selection
}

export interface LineConfusionPair {
  targetLine: NeonLine;
  neighborLine: NeonLine;
  spacingCm1: number;
  maxAllowedDriftCm1: number;
  riskLevel: 'safe' | 'caution' | 'critical';
  explanation: string;
}

export interface BinDistribution {
  binIndex: number;
  rangeHighCm1: number;
  rangeLowCm1: number;
  lines: NeonLine[];
  count: number;
}

export interface CalibrationSolution {
  params: CalibrationParameters;
  laserWavenumberCm1: number;
  effectiveRamanMinCm1: number;
  effectiveRamanMaxCm1: number;
  limitingFactors: string[];
  // Absolute wavenumber range of the Raman shift window
  absHighCm1: number;
  absLowCm1: number;
  absCentreCm1: number;
  // Grating turret scan range (includes CCD half-window + turret over-travel margins)
  scanHighCm1: number;
  scanLowCm1: number;
  scanSpanCm1: number;
  // CCD spectral dispersion metrics
  ccdWindowHighCm1: number;
  ccdWindowCentreCm1: number;
  ccdWindowLowCm1: number;
  dispersionCm1PerPixelCentre: number;
  minRequiredLineSpacingCm1: number;
  // Motor step calculation
  recommendedMotorStepTicks: number; // Rounded standard motor step (e.g. 25, 50, 75, 100)
  exactMotorStepTicks: number;
  wavenumberShiftPerStepCm1: number;
  achievedOccurrencesAtCentre: number;
  totalScanSteps: number;
  // Selected calibration lines
  primaryCalibrationLine: NeonLine | null;
  secondaryCalibrationLine: NeonLine | null;
  focusAnchorLines: NeonLine[]; // e.g., 18516.48 & 15619.12 cm^-1 for near/far lens focusing
  selectedLines: NeonLine[];
  candidatePool: NeonLine[];
  binDistribution: BinDistribution[];
  dispersionUniformityScore: number; // 0 - 100%
  confusionRisks: LineConfusionPair[];
}

/**
 * Converts grating turret motor steps to degrees of rotation.
 * 1316.0 steps = 1.00000 degree (100 steps = 0.07599°, 10,000 steps = 7.59878°).
 */
export function motorStepsToDegrees(steps: number): number {
  return Number((steps / MOTOR_STEPS_PER_DEGREE).toFixed(5));
}

/**
 * Converts grating turret degrees of rotation to motor steps.
 */
export function degreesToMotorSteps(degrees: number): number {
  return Math.round(degrees * MOTOR_STEPS_PER_DEGREE);
}

/**
 * Computes the optical filter transmission percentage as a function of Raman shift (cm^-1).
 * From empirical reference (update.txt):
 * - Below Rayleigh cut-off (~40 cm^-1, e.g. 18758.99 cm^-1 on 532nm): 0% (blocked by edge filter)
 * - 50 to 5000 cm^-1 Raman shift: ~100% passband transmission
 * - Starts dropping off at ~5000 cm^-1, reaching 65% at ~7500 cm^-1 and ~55% at 8000 cm^-1.
 */
export function calculateFilterTransmissionPct(ramanShiftCm1: number): number {
  if (ramanShiftCm1 < 42) {
    return 0;
  }
  if (ramanShiftCm1 <= 5000) {
    return 100;
  }
  if (ramanShiftCm1 <= 7500) {
    // Linearly drops from 100% at 5000 cm^-1 to 65% at 7500 cm^-1
    const ratio = (ramanShiftCm1 - 5000) / 2500;
    return Number((100 - ratio * 35).toFixed(1));
  }
  const extra = (ramanShiftCm1 - 7500) / 1000;
  return Number(Math.max(25, 65 - extra * 18).toFixed(1));
}

/**
 * Updates the CCD architecture and automatically sets `enforceCcdCutoff`:
 * - FDA (Front-side Direct Architecture): ticks `enforceCcdCutoff = true` (~9800 cm^-1 cutoff active)
 * - BDA (Back-Illuminated / Back-Thinned): unticks `enforceCcdCutoff = false`
 */
export function applyCcdArchitecture(
  params: CalibrationParameters,
  ccdType: CCDArchitecture
): CalibrationParameters {
  return {
    ...params,
    ccdType,
    enforceCcdCutoff: ccdType === 'FDA',
  };
}

/**
 * Converts nominal laser wavelength (nm) to exact laser wavenumber (cm^-1)
 * matching factory spectrograph conventions:
 * - 633nm HeNe uses 632.800 nm -> 15802.8 cm^-1
 * - 532nm Nd:YAG uses 531.9999 nm -> 18797.0 cm^-1 (so 50-4000 gives 18747 - 14797)
 * - 785nm Diode -> 12738.85 cm^-1 (so 50-3500 gives 12689 - 9239)
 * - 660nm Diode -> 15151.52 cm^-1 (so 0-4000 gives 15151.52 - 11151.52, centre 13151.52)
 */
export function getLaserWavenumberCm1(laserNm: number): number {
  if (Math.abs(laserNm - 633) < 0.5) {
    return 15802.8;
  }
  if (Math.abs(laserNm - 532) < 0.5) {
    return 18797.0;
  }
  if (Math.abs(laserNm - 785) < 0.5) {
    return 12739.0;
  }
  return Number((1e7 / laserNm).toFixed(2));
}

/**
 * Calculates the spectral window width (cm^-1) across the active CCD width (default 1014 px)
 * at a given wavenumber (cm^-1) and grating groove density (l/mm).
 * Derived from Czerny-Turner diffraction grating dispersion (F = 249.26 mm, Included angle = 0.5231 rad)
 * and calibrated against empirical 1800 l/mm CCD view spans (2009 cm^-1 @ 0 cut-off,
 * 1172 cm^-1 @ 4000 cut-off, 484 cm^-1 @ 8000 cut-off) and factory scan margins.
 */
export function calculateCcdWindowWidthCm1(
  wavenumberCm1: number,
  gratingLinesPerMm: number,
  activeWidthPx: number = 1014,
  spectrograph: SpectrographModel = 'inVia'
): number {
  // Wavelength in nm
  const lambdaNm = 1e7 / Math.max(wavenumberCm1, 4000);
  // Half included angle gamma = 0.523113 / 2 = 0.261556 rad (14.985 deg), cos(gamma) = 0.96599
  const halfIncludedRad = CALIBRATED_1800_INCLUDED_ANGLE_RAD / 2;
  const sinTheta = Math.min(
    0.985,
    (gratingLinesPerMm * lambdaNm) / (2e6 * Math.cos(halfIncludedRad))
  );
  const thetaRad = Math.asin(Math.max(0.01, sinTheta));
  // In the Czerny-Turner bench: incidence alpha = theta + gamma, camera diffraction beta = theta - gamma
  const betaRad = thetaRad - halfIncludedRad;
  const cosBeta = Math.max(0.08, Math.cos(betaRad));
  // Small empirical WiRE X focal correction term across high diffraction angles
  const focalCorrectionFactor = 1 + 0.042 * Math.sin(Math.max(0, betaRad));

  // Focal length factor by spectrograph architecture (calibrated 249.2607 mm focal length)
  const focalScale =
    spectrograph === 'inVia' ? 1.0 : spectrograph === 'Virsa' ? 1.12 : 0.94;

  // Linear dispersion d(lambda)/d(pixel) in nm/px across 1014 active pixels
  const dLambdaPerPxNm =
    (101.48 / gratingLinesPerMm) *
    cosBeta *
    focalCorrectionFactor *
    focalScale;
  const totalWindowNm = dLambdaPerPxNm * activeWidthPx;

  // Convert wavelength window (nm) to wavenumber window (cm^-1): |d(nu)| = (nu^2 / 1e7) * d(lambda)
  const windowCm1 = (Math.pow(wavenumberCm1, 2) / 1e7) * totalWindowNm;
  return Number(windowCm1.toFixed(1));
}

/**
 * Computes the complete Czerny-Turner grating turret angle, absolute motor step position,
 * CCD visible wavenumber & Raman shift bounds, and wavenumber shift per motor step.
 * Validated against the empirical 532nm / 1800 l/mm calibration table in update.txt.
 */
export function calculateTurretKinematicsAtWavenumber(
  centreNuCm1: number,
  gratingLinesPerMm: number,
  laserWavenumberCm1: number = 18797.0,
  activeWidthPx: number = 1014,
  spectrograph: SpectrographModel = 'inVia'
): TurretKinematicsState {
  const safeNu = Math.max(4000, centreNuCm1);
  const wavelengthNm = 1e7 / safeNu;
  const halfIncludedRad = CALIBRATED_1800_INCLUDED_ANGLE_RAD / 2;

  // Czerny-Turner grating equation: lambda = (2 * sin(theta) * cos(gamma)) / g
  const sinTheta = Math.min(
    0.995,
    Math.max(
      0.01,
      (gratingLinesPerMm * wavelengthNm) / (2e6 * Math.cos(halfIncludedRad))
    )
  );
  const turretAngleRad = Math.asin(sinTheta);
  const turretAngleDeg = (turretAngleRad * 180) / Math.PI;
  const absoluteMotorSteps = degreesToMotorSteps(turretAngleDeg);

  const ccdWindowWidthCm1 = calculateCcdWindowWidthCm1(
    safeNu,
    gratingLinesPerMm,
    activeWidthPx,
    spectrograph
  );

  const windowHighAbsCm1 = Number((safeNu + ccdWindowWidthCm1 / 2).toFixed(2));
  const windowLowAbsCm1 = Number((safeNu - ccdWindowWidthCm1 / 2).toFixed(2));
  const centreRamanCm1 = Number((laserWavenumberCm1 - safeNu).toFixed(2));
  const windowLowRamanCm1 = Number(
    (laserWavenumberCm1 - windowHighAbsCm1).toFixed(2)
  );
  const windowHighRamanCm1 = Number(
    (laserWavenumberCm1 - windowLowAbsCm1).toFixed(2)
  );

  // Derivative |d(nu)/d(theta)| = nu * cot(theta) per radian
  const cosTheta = Math.sqrt(Math.max(0.01, 1 - sinTheta * sinTheta));
  const dNuPerRad = safeNu * (cosTheta / sinTheta);
  const radPerStep = Math.PI / (180 * MOTOR_STEPS_PER_DEGREE);
  const cm1PerSingleMotorStep = Number((dNuPerRad * radPerStep).toFixed(4));
  const cm1Per100MotorSteps = Number((cm1PerSingleMotorStep * 100).toFixed(2));
  const degPer100MotorSteps = motorStepsToDegrees(100);
  const filterTransmissionPct = calculateFilterTransmissionPct(centreRamanCm1);

  return {
    centreNuCm1: Number(safeNu.toFixed(2)),
    centreRamanCm1,
    wavelengthNm: Number(wavelengthNm.toFixed(3)),
    turretAngleDeg: Number(turretAngleDeg.toFixed(5)),
    turretAngleRad: Number(turretAngleRad.toFixed(6)),
    absoluteMotorSteps,
    ccdWindowWidthCm1,
    windowHighAbsCm1,
    windowLowAbsCm1,
    windowLowRamanCm1,
    windowHighRamanCm1,
    cm1PerSingleMotorStep,
    cm1Per100MotorSteps,
    degPer100MotorSteps,
    filterTransmissionPct,
  };
}

/**
 * Evaluates CCD detector count rates, saturation risk (>1,000,000 counts),
 * recommended scan exposure duration (0.5s, 1s, 5s, 10s), and how many motor steps
 * are required to move saturating lines (such as 17086.75 or 14219.7 cm^-1) off the CCD
 * before increasing exposure time for weak lines.
 */
export function evaluateCcdExposureAndSaturation(
  windowHighCm1: number,
  windowLowCm1: number,
  gratingLinesPerMm: number,
  laserWavenumberCm1: number = 18797.0,
  activeWidthPx: number = 1014,
  leftMarginPx: number = 13
): CcdExposureAnalysis {
  const span = Math.max(1, windowHighCm1 - windowLowCm1);
  const centreNu = (windowHighCm1 + windowLowCm1) / 2;
  const kinematics = calculateTurretKinematicsAtWavenumber(
    centreNu,
    gratingLinesPerMm,
    laserWavenumberCm1,
    activeWidthPx
  );

  // Grating efficiency scaling relative to 1800 l/mm reference
  const gratingScale =
    gratingLinesPerMm <= 600
      ? 1.45
      : gratingLinesPerMm <= 1200
        ? 1.2
        : gratingLinesPerMm <= 1800
          ? 1.0
          : 0.78;

  const visibleCatalogLines = NEON_CATALOG.filter(
    (l) => l.wavenumber <= windowHighCm1 && l.wavenumber >= windowLowCm1
  );

  const rawEntries = visibleCatalogLines.map((line) => {
    const ratio = (windowHighCm1 - line.wavenumber) / span;
    const pixelCol = Math.round(leftMarginPx + ratio * activeWidthPx);
    const ramanShift = laserWavenumberCm1 - line.wavenumber;
    const transFactor = calculateFilterTransmissionPct(ramanShift) / 100;

    // Use exact empirical 1s count rate when available, or scale from relativeIntensity and wavenumber region
    const regionalMaxCps = line.wavenumber < 13500 ? 75_000 : 280_000;
    const baseCps =
      line.countsAt1s1800 !== undefined
        ? line.countsAt1s1800
        : Math.round(
            Math.pow(line.relativeIntensity / 1000, 2.4) * regionalMaxCps
          );

    const countsPerSec = Math.round(
      baseCps * gratingScale * (line.countsAt1s1800 !== undefined ? 1 : transFactor)
    );
    const saturatesAt1s = countsPerSec >= CCD_SATURATION_LIMIT_COUNTS * 0.7;
    const saturationTimeSec =
      countsPerSec > 0
        ? Number((CCD_SATURATION_LIMIT_COUNTS / countsPerSec).toFixed(2))
        : 999;

    return {
      line,
      pixelCol,
      countsPerSec,
      saturatesAt1s,
      saturationTimeSec,
    };
  });

  // Sort by highest countsPerSec to find the limiting line on the CCD
  const sortedByCps = [...rawEntries].sort(
    (a, b) => b.countsPerSec - a.countsPerSec
  );
  const topEntry = sortedByCps[0] || null;
  const maxCps = topEntry ? topEntry.countsPerSec : 0;

  // Choose standard WiRE X / .lns scan exposure duration (0.5s, 1s, 5s, 10s)
  // keeping max counts safely below the 1,000,000 count saturation ceiling (target <= 650,000 counts)
  let recommendedExposureSec = 10;
  if (maxCps > 650_000) {
    recommendedExposureSec = 0.5;
  } else if (maxCps > 135_000) {
    recommendedExposureSec = 1;
  } else if (maxCps > 25_000) {
    recommendedExposureSec = 5;
  } else {
    recommendedExposureSec = 10;
  }

  const maxSafeExposureSec =
    maxCps > 0 ? Number((650_000 / maxCps).toFixed(2)) : 20;
  const hardSaturationExposureSec =
    maxCps > 0 ? Number((CCD_SATURATION_LIMIT_COUNTS / maxCps).toFixed(2)) : 20;

  const visibleEntries: CcdLineSaturationEntry[] = rawEntries.map((e) => ({
    ...e,
    countsAtRecommendedExposure: Math.round(
      e.countsPerSec * recommendedExposureSec
    ),
  }));

  // Calculate how many motor steps are needed to push the limiting strong line off the CCD
  // When scanning toward lower wavenumbers (higher Raman shift), lines exit the high-wavenumber edge (windowHighCm1).
  // When scanning toward higher wavenumbers, lines exit the low-wavenumber edge (windowLowCm1).
  let stepsToClearLimitingLine = 0;
  let cm1ToClearLimitingLine = 0;
  const isLimitedByStrongPeak = recommendedExposureSec <= 1 && maxCps > 135_000;

  if (topEntry && isLimitedByStrongPeak) {
    const distToHighEdge = Math.abs(windowHighCm1 - topEntry.line.wavenumber);
    const distToLowEdge = Math.abs(topEntry.line.wavenumber - windowLowCm1);
    cm1ToClearLimitingLine = Number(
      (Math.min(distToHighEdge, distToLowEdge) + 15).toFixed(1)
    );
    stepsToClearLimitingLine = Math.ceil(
      cm1ToClearLimitingLine / Math.max(0.05, kinematics.cm1PerSingleMotorStep)
    );
  }

  const explanation = topEntry
    ? isLimitedByStrongPeak
      ? `Exposure capped at ${recommendedExposureSec}s because intense peak ${topEntry.line.wavenumber.toFixed(2)} cm⁻¹ (${topEntry.countsPerSec.toLocaleString()} counts/s) is on the CCD (saturates >1,000,000 counts at ${hardSaturationExposureSec}s). Move turret ≥ ${stepsToClearLimitingLine} motor steps (${cm1ToClearLimitingLine} cm⁻¹) to push ${topEntry.line.wavenumber.toFixed(2)} cm⁻¹ off the CCD before increasing scan duration.`
      : `Max peak on CCD is ${topEntry.line.wavenumber.toFixed(2)} cm⁻¹ (${topEntry.countsPerSec.toLocaleString()} counts/s). Safe to run ${recommendedExposureSec}s scan (${Math.round(topEntry.countsPerSec * recommendedExposureSec).toLocaleString()} counts, well below 1,000,000 saturation limit).`
    : 'No catalog Neon lines on active CCD window.';

  return {
    recommendedExposureSec,
    maxSafeExposureSec,
    hardSaturationExposureSec,
    limitingLine: topEntry?.line || null,
    limitingLineCountsPerSec: maxCps,
    isLimitedByStrongPeak,
    stepsToClearLimitingLine,
    cm1ToClearLimitingLine,
    visibleEntries,
    explanation,
  };
}

/**
 * Computes the upper and lower Grating Scan Range bounds (cm^-1) from the absolute Raman range.
 * Matches exact factory reference scan bounds for 633nm (2400, 1800, 1200, 600 l/mm), 785nm (600 l/mm),
 * and 532nm (600 l/mm) while generalizing smoothly across all laser/grating combinations.
 */
export function calculateScanRangeBounds(
  laserNm: number,
  gratingLinesPerMm: number,
  absHighCm1: number,
  absLowCm1: number,
  activeWidthPx: number = 1014,
  spectrograph: SpectrographModel = 'inVia'
): { scanHighCm1: number; scanLowCm1: number } {
  const pixelScale = activeWidthPx / 1014;

  // Check exact factory reference combinations first for 100% fidelity to documented tables
  if (
    spectrograph === 'inVia' &&
    Math.abs(pixelScale - 1) < 0.01 &&
    Math.abs(laserNm - 633) < 0.5 &&
    Math.abs(absHighCm1 - 15802.8) < 1.5
  ) {
    if (gratingLinesPerMm === 2400 && Math.abs(absLowCm1 - 13302.8) < 2) {
      return { scanHighCm1: 16270.6, scanLowCm1: 13089.9 };
    }
    if (gratingLinesPerMm === 1800 && Math.abs(absLowCm1 - 11802.8) < 2) {
      return { scanHighCm1: 16534.4, scanLowCm1: 11497.5 };
    }
    if (gratingLinesPerMm === 1200 && Math.abs(absLowCm1 - 11802.8) < 2) {
      return { scanHighCm1: 16992.2, scanLowCm1: 11257.7 };
    }
    if (gratingLinesPerMm === 600 && Math.abs(absLowCm1 - 11802.8) < 2) {
      return { scanHighCm1: 17800.0, scanLowCm1: 10821.0 };
    }
  }

  if (
    spectrograph === 'inVia' &&
    Math.abs(pixelScale - 1) < 0.01 &&
    Math.abs(laserNm - 785) < 0.5 &&
    gratingLinesPerMm === 600 &&
    Math.abs(absHighCm1 - 12689) < 3 &&
    Math.abs(absLowCm1 - 9239) < 3
  ) {
    return { scanHighCm1: 13100.0, scanLowCm1: 8700.0 };
  }

  if (
    spectrograph === 'inVia' &&
    Math.abs(pixelScale - 1) < 0.01 &&
    Math.abs(laserNm - 532) < 0.5 &&
    gratingLinesPerMm === 600 &&
    Math.abs(absHighCm1 - 18747) < 3 &&
    Math.abs(absLowCm1 - 14797) < 3
  ) {
    return { scanHighCm1: 20450.0, scanLowCm1: 13880.0 };
  }

  // General physical dispersion margin model:
  const winHigh = calculateCcdWindowWidthCm1(
    absHighCm1,
    gratingLinesPerMm,
    activeWidthPx,
    spectrograph
  );
  const winLow = calculateCcdWindowWidthCm1(
    absLowCm1,
    gratingLinesPerMm,
    activeWidthPx,
    spectrograph
  );

  const upperMargin = winHigh * 0.55;
  const lowerMargin = winLow * 0.52;

  return {
    scanHighCm1: Number((absHighCm1 + upperMargin).toFixed(1)),
    scanLowCm1: Number(Math.max(4000, absLowCm1 - lowerMargin).toFixed(1)),
  };
}

/**
 * Evaluates line confusion / misidentification risk between adjacent lines.
 * Covers both:
 * 1) Close doublets on high-resolution gratings (e.g. 11388.5 vs 11384.5 cm^-1 [4.0 cm^-1],
 *    10740.1 vs 10736.3 cm^-1 [3.8 cm^-1], 10762.2 vs 10751.4 cm^-1 [10.8 cm^-1] noted in 532nm_1800.lns).
 * 2) Pre-calibration drift confusion on lower-density gratings (e.g. 17484.88 vs 17347.80 cm^-1 on 600 l/mm).
 */
export function evaluateConfusionRisks(
  selectedLines: NeonLine[],
  pclLine: NeonLine | null,
  gratingLinesPerMm: number
): LineConfusionPair[] {
  if (!pclLine || selectedLines.length < 2) return [];

  const risks: LineConfusionPair[] = [];
  const sorted = [...selectedLines].sort((a, b) => b.wavenumber - a.wavenumber);

  // Low density gratings (e.g., 600 l/mm) have coarser cm^-1 per pixel and larger uncalibrated drift
  const driftRatePerCm1 =
    gratingLinesPerMm <= 600
      ? 0.035
      : gratingLinesPerMm <= 1200
        ? 0.022
        : gratingLinesPerMm <= 1500
          ? 0.018
          : 0.012;
  const baseToleranceCm1 =
    gratingLinesPerMm <= 600
      ? 138
      : gratingLinesPerMm <= 1200
        ? 78
        : gratingLinesPerMm <= 1500
          ? 62
          : 28;

  for (let i = 0; i < sorted.length - 1; i++) {
    const line = sorted[i];
    const neighbor = sorted[i + 1];
    const distFromPcl = Math.max(
      Math.abs(line.wavenumber - pclLine.wavenumber),
      Math.abs(neighbor.wavenumber - pclLine.wavenumber)
    );
    const maxExpectedDriftCm1 = Number(
      (baseToleranceCm1 + distFromPcl * driftRatePerCm1).toFixed(1)
    );

    const spacing = Number(
      Math.abs(line.wavenumber - neighbor.wavenumber).toFixed(2)
    );

    // Explicit close-doublet check (e.g., <= 12 cm^-1 on any grating, like 11388.5/11384.5 or 10740.1/10736.3 or 10762.2/10751.4)
    if (spacing <= 12.0) {
      const isVeryTight = spacing <= 6.0;
      risks.push({
        targetLine: line,
        neighborLine: neighbor,
        spacingCm1: spacing,
        maxAllowedDriftCm1: maxExpectedDriftCm1,
        riskLevel: isVeryTight ? 'critical' : 'caution',
        explanation:
          line.closeNeighborWarning ||
          neighbor.closeNeighborWarning ||
          `${line.wavenumber.toFixed(2)} cm⁻¹ is only ${spacing.toFixed(2)} cm⁻¹ from ${neighbor.wavenumber.toFixed(2)} cm⁻¹ — too close for reliable single-peak centroiding.`,
      });
      continue;
    }

    if (spacing <= maxExpectedDriftCm1 * 1.12) {
      const isCritical = spacing <= maxExpectedDriftCm1 * 0.96;
      risks.push({
        targetLine: line,
        neighborLine: neighbor,
        spacingCm1: spacing,
        maxAllowedDriftCm1: maxExpectedDriftCm1,
        riskLevel: isCritical ? 'critical' : 'caution',
        explanation: isCritical
          ? `${line.wavenumber.toFixed(2)} cm⁻¹ is only ${spacing.toFixed(2)} cm⁻¹ from ${neighbor.wavenumber.toFixed(2)} cm⁻¹ (drift window ±${maxExpectedDriftCm1} cm⁻¹ at ${distFromPcl.toFixed(0)} cm⁻¹ from PCL) — high risk of software misidentification.`
          : `${line.wavenumber.toFixed(2)} cm⁻¹ and ${neighbor.wavenumber.toFixed(2)} cm⁻¹ are separated by ${spacing.toFixed(2)} cm⁻¹ near the ±${maxExpectedDriftCm1} cm⁻¹ pre-calibration capture window.`,
      });
    }
  }

  return risks;
}

/**
 * Computes a 0-100% dispersion uniformity score across equal spectral bins.
 * Penalizes empty edge bins and excessive central clustering.
 */
export function computeBinUniformity(
  lines: NeonLine[],
  rangeHighCm1: number,
  rangeLowCm1: number,
  binCount: number = 5
): { bins: BinDistribution[]; uniformityScore: number } {
  const span = Math.max(100, rangeHighCm1 - rangeLowCm1);
  const binWidth = span / binCount;
  const bins: BinDistribution[] = [];

  for (let i = 0; i < binCount; i++) {
    const high = Number((rangeHighCm1 - i * binWidth).toFixed(1));
    const low = Number(
      (i === binCount - 1 ? rangeLowCm1 : rangeHighCm1 - (i + 1) * binWidth).toFixed(1)
    );
    const inBin = lines.filter(
      (l) =>
        l.wavenumber <= high + (i === 0 ? 5 : 0) &&
        l.wavenumber >= low - (i === binCount - 1 ? 5 : 0)
    );
    bins.push({
      binIndex: i + 1,
      rangeHighCm1: high,
      rangeLowCm1: low,
      lines: inBin,
      count: inBin.length,
    });
  }

  if (lines.length === 0) {
    return { bins, uniformityScore: 0 };
  }

  const nonEmptyBins = bins.filter((b) => b.count > 0).length;
  const coverageRatio = nonEmptyBins / binCount;

  const meanPerBin = lines.length / binCount;
  const variance =
    bins.reduce((acc, b) => acc + Math.pow(b.count - meanPerBin, 2), 0) /
    binCount;
  const stdDev = Math.sqrt(variance);
  const cvPenalty = Math.min(1, stdDev / Math.max(1, meanPerBin * 1.25));

  // Extra penalty if either extreme bin (bin 0 or last bin) has 0 lines
  const edgePenalty =
    (bins[0].count === 0 ? 0.18 : 0) +
    (bins[binCount - 1].count === 0 ? 0.18 : 0);

  const rawScore = (coverageRatio * 0.65 + (1 - cvPenalty) * 0.35 - edgePenalty) * 100;
  const uniformityScore = Math.round(Math.max(0, Math.min(100, rawScore)));

  return { bins, uniformityScore };
}

/**
 * Main solver that calculates the complete spectrograph calibration specification,
 * optimal Neon line selection, PCL, 2nd calibration line, lens focusing lines, and motor step size.
 */
export function solveCalibration(
  params: CalibrationParameters
): CalibrationSolution {
  const laserWavenumberCm1 = getLaserWavenumberCm1(params.laserNm);
  const limitingFactors: string[] = [];

  // 1. Determine nominal Raman shift bounds from Filter Type
  let ramanMin = 50;
  let ramanMax = 4000;
  if (params.filterType === 'standard') {
    // 633nm and 660nm factory tables often quote 0-4000 or 50-4000
    ramanMin =
      Math.abs(params.laserNm - 633) < 0.5 || Math.abs(params.laserNm - 660) < 0.5
        ? 0
        : 50;
    ramanMax = 4000;
    limitingFactors.push(
      `Standard Rayleigh Rejection Filter (${ramanMin}–4000 cm⁻¹ Raman shift)`
    );
  } else if (params.filterType === 'rpl_pl') {
    ramanMin = 50;
    ramanMax = 8500;
    limitingFactors.push(
      'RPL / PL Extended Filter (50–8500 cm⁻¹ Raman shift; signal rolls off above ~5000 cm⁻¹ to ~65% at 7500 cm⁻¹)'
    );
  } else {
    ramanMin = Math.max(0, params.customRamanMinCm1);
    ramanMax = Math.max(ramanMin + 200, params.customRamanMaxCm1);
    limitingFactors.push(
      `Custom User Raman Shift Window (${ramanMin}–${ramanMax} cm⁻¹)`
    );
  }

  // 2. Check Grating Mechanical Diffraction Angle Limit
  if (params.gratingLinesPerMm >= 2400 && Math.abs(params.laserNm - 633) < 0.5) {
    if (ramanMax > 2500) {
      ramanMax = 2500;
      limitingFactors.push(
        'Grating Turret Mechanical Angle Limit (2400 l/mm @ 633nm capped at 2500 cm⁻¹ Raman shift)'
      );
    }
  } else {
    const maxDiffractionLambdaNm = 1.804e6 / params.gratingLinesPerMm;
    const minGratingWavenumberCm1 = 1e7 / maxDiffractionLambdaNm;
    const maxAllowedRamanByGrating = Math.floor(
      laserWavenumberCm1 - minGratingWavenumberCm1
    );
    if (ramanMax > maxAllowedRamanByGrating && maxAllowedRamanByGrating > ramanMin) {
      ramanMax = maxAllowedRamanByGrating;
      limitingFactors.push(
        `Grating Angle Limit (${params.gratingLinesPerMm} l/mm mechanical stop at ${minGratingWavenumberCm1.toFixed(0)} cm⁻¹ Abs)`
      );
    }
  }

  // 3. Check Silicon CCD Long-Wavelength Detection Cutoff
  if (params.enforceCcdCutoff) {
    const effectiveCcdLimitCm1 =
      Math.abs(params.laserNm - 785) < 0.5 && params.ccdDetectionCutoffCm1 >= 9239
        ? 9239
        : params.ccdDetectionCutoffCm1;
    const maxRamanByCcd = Math.round(laserWavenumberCm1 - effectiveCcdLimitCm1);
    if (ramanMax > maxRamanByCcd && maxRamanByCcd > ramanMin) {
      ramanMax = maxRamanByCcd;
      limitingFactors.push(
        `CCD Silicon Detection Limit (${params.ccdType} sensor roll-off ~${params.ccdDetectionCutoffCm1} cm⁻¹ caps Raman shift at ${ramanMax} cm⁻¹)`
      );
    }
  }

  // 4. Calculate Absolute Wavenumber Range (cm^-1)
  const absHighCm1 = Number((laserWavenumberCm1 - ramanMin).toFixed(1));
  const absLowCm1 = Number((laserWavenumberCm1 - ramanMax).toFixed(1));
  const absCentreCm1 = Number(((absHighCm1 + absLowCm1) / 2).toFixed(2));

  // 5. Calculate Grating Scan Range Bounds (cm^-1)
  const { scanHighCm1, scanLowCm1 } = calculateScanRangeBounds(
    params.laserNm,
    params.gratingLinesPerMm,
    absHighCm1,
    absLowCm1,
    params.ccdActiveWidthPx,
    params.spectrograph
  );
  const scanSpanCm1 = Number((scanHighCm1 - scanLowCm1).toFixed(1));

  // 6. Calculate CCD Spectral Window Width across active pixels (default 1014 px)
  const ccdWindowHighCm1 = calculateCcdWindowWidthCm1(
    absHighCm1,
    params.gratingLinesPerMm,
    params.ccdActiveWidthPx,
    params.spectrograph
  );
  const ccdWindowCentreCm1 = calculateCcdWindowWidthCm1(
    absCentreCm1,
    params.gratingLinesPerMm,
    params.ccdActiveWidthPx,
    params.spectrograph
  );
  const ccdWindowLowCm1 = calculateCcdWindowWidthCm1(
    absLowCm1,
    params.gratingLinesPerMm,
    params.ccdActiveWidthPx,
    params.spectrograph
  );
  const dispersionCm1PerPixelCentre = Number(
    (ccdWindowCentreCm1 / params.ccdActiveWidthPx).toFixed(3)
  );

  // 7. Calculate Grating Turret Motor Step Size to achieve targetOccurrencesPerLine across the CCD
  const targetHits = Math.max(2, params.targetOccurrencesPerLine);
  const requiredStepCm1 = ccdWindowCentreCm1 / targetHits;
  const cm1PerMotorTick = ccdWindowCentreCm1 / 400; // 400 motor ticks spans 1 full active CCD window
  const exactMotorStepTicks = Number(
    (requiredStepCm1 / cm1PerMotorTick).toFixed(1)
  );

  const standardSteps = [20, 25, 40, 50, 60, 75, 80, 100, 125, 150];
  const recommendedMotorStepTicks = standardSteps.reduce((prev, curr) =>
    Math.abs(curr - exactMotorStepTicks) < Math.abs(prev - exactMotorStepTicks)
      ? curr
      : prev
  );

  const wavenumberShiftPerStepCm1 = Number(
    (recommendedMotorStepTicks * cm1PerMotorTick).toFixed(1)
  );
  const achievedOccurrencesAtCentre = Number(
    (ccdWindowCentreCm1 / wavenumberShiftPerStepCm1).toFixed(1)
  );
  const totalScanSteps = Math.ceil(scanSpanCm1 / wavenumberShiftPerStepCm1);

  // 8. Filter Candidate Neon Lines within Calibration Range
  const effectiveMinIntensity =
    params.ccdType === 'BDA'
      ? Math.max(100, params.minRelativeIntensity * 0.8)
      : params.minRelativeIntensity;

  const calMarginHigh = Math.min(scanHighCm1, absHighCm1 + 260);
  const calMarginLow = Math.max(scanLowCm1, absLowCm1 - 260);

  const candidatePool = NEON_CATALOG.filter((line) => {
    if (line.excludeFromAutoPick) return false;
    // On 532nm + 1800 l/mm with FDA camera, 18758.92 cm^-1 has 0 counts (blocked by 50 cm^-1 filter edge)
    if (
      Math.abs(params.laserNm - 532) < 0.5 &&
      params.gratingLinesPerMm >= 1800 &&
      params.ccdType === 'FDA' &&
      Math.abs(line.wavenumber - 18758.92) < 1.0
    ) {
      return false;
    }
    return (
      line.wavenumber <= calMarginHigh &&
      line.wavenumber >= calMarginLow &&
      line.relativeIntensity >= effectiveMinIntensity
    );
  }).sort((a, b) => b.wavenumber - a.wavenumber);

  // Identify near/far lens focus anchor lines inside scan range (e.g., 18516.48 & 15619.12 for 532nm)
  const focusAnchorLines = NEON_CATALOG.filter(
    (l) =>
      l.isFocusAnchor &&
      l.wavenumber <= scanHighCm1 &&
      l.wavenumber >= scanLowCm1
  );

  // 9. Select Primary Calibration Line (PCL) near centre of calibration range
  let primaryCalibrationLine: NeonLine | null = null;
  if (params.manualPclOverrideCm1) {
    primaryCalibrationLine =
      NEON_CATALOG.find(
        (l) => Math.abs(l.wavenumber - params.manualPclOverrideCm1!) < 1.5
      ) || null;
  }

  if (!primaryCalibrationLine) {
    if (
      Math.abs(params.laserNm - 532) < 0.5 &&
      calMarginHigh >= 17086.75 &&
      calMarginLow <= 17086.75
    ) {
      primaryCalibrationLine =
        NEON_CATALOG.find((l) => Math.abs(l.wavenumber - 17086.75) < 0.5) ||
        null;
    } else if (
      Math.abs(params.laserNm - 660) < 0.5 &&
      calMarginHigh >= 13151.64 &&
      calMarginLow <= 13151.64
    ) {
      primaryCalibrationLine =
        NEON_CATALOG.find((l) => Math.abs(l.wavenumber - 13151.64) < 0.5) ||
        null;
    }

    if (!primaryCalibrationLine && candidatePool.length > 0) {
      const span = Math.max(500, absHighCm1 - absLowCm1);
      primaryCalibrationLine = [...candidatePool].sort((a, b) => {
        const distScoreA = 1 - Math.abs(a.wavenumber - absCentreCm1) / (span * 0.6);
        const distScoreB = 1 - Math.abs(b.wavenumber - absCentreCm1) / (span * 0.6);
        const scoreA =
          distScoreA * 65 +
          (a.relativeIntensity / 1000) * 25 +
          (a.isPrimaryCandidate ? 10 : 0);
        const scoreB =
          distScoreB * 65 +
          (b.relativeIntensity / 1000) * 25 +
          (b.isPrimaryCandidate ? 10 : 0);
        return scoreB - scoreA;
      })[0];
    }
  }

  // 10. Select Equal-Dispersion Lines across the Calibration Range [absLowCm1, absHighCm1]
  // Note: 1800 l/mm grating provides narrow FWHM and good resolution, allowing closer spacing than 600 l/mm
  const minRequiredLineSpacingCm1 = Number(
    Math.max(
      85,
      params.gratingLinesPerMm <= 600
        ? 220
        : params.gratingLinesPerMm <= 1200
          ? 145
          : params.gratingLinesPerMm <= 1500
            ? 120
            : 95
    ).toFixed(1)
  );

  const desiredCount = Math.max(5, Math.min(16, params.targetLineCount));
  const selectedLines: NeonLine[] = [];
  if (primaryCalibrationLine) {
    selectedLines.push(primaryCalibrationLine);
  }

  // Ensure 13353.03 cm^-1 is prioritized as 2nd calibration line for 633nm if inside range
  if (Math.abs(params.laserNm - 633) < 0.5) {
    const line13353 = candidatePool.find(
      (l) => Math.abs(l.wavenumber - 13353.03) < 1.0
    );
    if (
      line13353 &&
      !selectedLines.some((s) => s.id === line13353.id) &&
      selectedLines.every(
        (s) => Math.abs(s.wavenumber - line13353.wavenumber) >= minRequiredLineSpacingCm1 * 0.75
      )
    ) {
      selectedLines.push(line13353);
    }
  }

  // First pass: guarantee at least 1 strong anchor in each of the 5 equal calibration bins
  const binSpan = (absHighCm1 - absLowCm1) / 5;
  for (let b = 0; b < 5; b++) {
    const binTop = absHighCm1 - b * binSpan + (b === 0 ? 180 : 0);
    const binBot = absHighCm1 - (b + 1) * binSpan - (b === 4 ? 180 : 0);
    const binMid = (binTop + binBot) / 2;

    const alreadyHasInBin = selectedLines.some(
      (s) => s.wavenumber <= binTop && s.wavenumber >= binBot
    );
    if (!alreadyHasInBin) {
      const binCandidates = candidatePool.filter(
        (cand) =>
          cand.wavenumber <= binTop &&
          cand.wavenumber >= binBot &&
          !selectedLines.some((s) => s.id === cand.id) &&
          selectedLines.every(
            (s) => Math.abs(s.wavenumber - cand.wavenumber) >= minRequiredLineSpacingCm1
          )
      );
      if (binCandidates.length > 0) {
        const bestInBin = binCandidates.sort((a, c) => {
          const distA = Math.abs(a.wavenumber - binMid);
          const distC = Math.abs(c.wavenumber - binMid);
          return (
            distA -
            (a.relativeIntensity / 1000) * 80 -
            (distC - (c.relativeIntensity / 1000) * 80)
          );
        })[0];
        selectedLines.push(bestInBin);
      }
    }
  }

  // Second pass: fill remaining desiredCount uniformly across [absLowCm1, absHighCm1]
  const targetStep = (absHighCm1 - absLowCm1) / Math.max(1, desiredCount - 1);
  for (let i = 0; i < desiredCount; i++) {
    if (selectedLines.length >= desiredCount) break;
    const targetNu = absHighCm1 - i * targetStep;
    const validCandidates = candidatePool.filter(
      (cand) =>
        !selectedLines.some((s) => s.id === cand.id) &&
        selectedLines.every(
          (s) => Math.abs(s.wavenumber - cand.wavenumber) >= minRequiredLineSpacingCm1
        )
    );
    if (validCandidates.length > 0) {
      const best = validCandidates.sort((a, b) => {
        const distA = Math.abs(a.wavenumber - targetNu);
        const distB = Math.abs(b.wavenumber - targetNu);
        const costA = distA - (a.relativeIntensity / 1000) * 65;
        const costB = distB - (b.relativeIntensity / 1000) * 65;
        return costA - costB;
      })[0];
      if (Math.abs(best.wavenumber - targetNu) <= targetStep * 1.35) {
        selectedLines.push(best);
      }
    }
  }

  selectedLines.sort((a, b) => b.wavenumber - a.wavenumber);

  // Identify 2nd Calibration Line
  let secondaryCalibrationLine: NeonLine | null = null;
  if (Math.abs(params.laserNm - 633) < 0.5) {
    secondaryCalibrationLine =
      selectedLines.find((l) => Math.abs(l.wavenumber - 13353.03) < 1.0) ||
      NEON_CATALOG.find(
        (l) =>
          Math.abs(l.wavenumber - 13353.03) < 1.0 &&
          l.wavenumber >= scanLowCm1 &&
          l.wavenumber <= scanHighCm1
      ) ||
      null;
  }
  if (!secondaryCalibrationLine && selectedLines.length >= 2) {
    const targetSecondNu = absLowCm1 + (absHighCm1 - absLowCm1) * 0.18;
    secondaryCalibrationLine =
      [...selectedLines]
        .filter((l) => l.id !== primaryCalibrationLine?.id)
        .sort(
          (a, b) =>
            Math.abs(a.wavenumber - targetSecondNu) -
            Math.abs(b.wavenumber - targetSecondNu)
        )[0] || null;
  }

  // 11. Compute Bin Distribution & Uniformity Score across 5 equal calibration zones
  const { bins: binDistribution, uniformityScore: dispersionUniformityScore } =
    computeBinUniformity(selectedLines, absHighCm1, absLowCm1, 5);

  // 12. Evaluate Confusion / Misidentification Risks
  const confusionRisks = evaluateConfusionRisks(
    selectedLines,
    primaryCalibrationLine,
    params.gratingLinesPerMm
  );

  return {
    params,
    laserWavenumberCm1,
    effectiveRamanMinCm1: ramanMin,
    effectiveRamanMaxCm1: ramanMax,
    limitingFactors,
    absHighCm1,
    absLowCm1,
    absCentreCm1,
    scanHighCm1,
    scanLowCm1,
    scanSpanCm1,
    ccdWindowHighCm1,
    ccdWindowCentreCm1,
    ccdWindowLowCm1,
    dispersionCm1PerPixelCentre,
    minRequiredLineSpacingCm1,
    recommendedMotorStepTicks,
    exactMotorStepTicks,
    wavenumberShiftPerStepCm1,
    achievedOccurrencesAtCentre,
    totalScanSteps,
    primaryCalibrationLine,
    secondaryCalibrationLine,
    focusAnchorLines,
    selectedLines,
    candidatePool,
    binDistribution,
    dispersionUniformityScore,
    confusionRisks,
  };
}
