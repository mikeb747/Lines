import { NEON_CATALOG, NeonLine } from './neonCatalog';

export type SpectrographModel = 'inVia' | 'Virsa' | 'Strada';
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

/**
 * Empirical hardware constants from Renishaw Virsa 532nm / 2400 l/mm calibration (50µm fibre):
 * - CCD total width = 1040 px; Active X range = 10 to 1030 (1020 active pixels), Zero-order centred at pixel 517
 * - Active Y range = 125 to 145 (20 active rows in middle of sensor for 50µm fibre input)
 * - Pixel width and height = -0.026 mm (26 µm pitch)
 * - Environment: CCD cooled to -70 °C, grating in Air at 20 °C room temperature
 * - Motor step size = -1316.000000 steps/deg (negative turret direction: ~ -53,500 to -81,000 steps)
 * - Default focal length = 200.0000000 mm -> Calibrated = 202.7247295 mm (Focal correction = 4.2669245e-5)
 * - Default included angle = 0.663200 rad (37.998561°) -> Calibrated = 0.660570 rad (37.847895°)
 * - Default zero offset = -0.000839 rad -> Calibrated = -0.000340 rad (WiRE X Offset = -0.019473°)
 * - Pre-calibration setup: focused & offset at 17086.75 cm⁻¹ by -12.95 Abs cm⁻¹; 0.1s scan gives 109,074 e⁻/cm⁻¹
 *   (56,960 raw counts/pixel) with FWHM = 2.23 cm⁻¹
 * - Calibration fit: RMS Deviation drops from 12.330609 cm⁻¹ (before) to 0.076815 cm⁻¹ (after)
 * - Most accurate line after calibration: 15619.514 cm⁻¹ (±0.03 cm⁻¹ error across the CCD)
 * - Step size 50 during calibration = 50 cm⁻¹ in absolute wavenumber (14000–19400 cm⁻¹ = 108 scans)
 */
export const VIRSA_MOTOR_STEPS_PER_DEGREE = -1316.0;
export const VIRSA_DEFAULT_FOCAL_LENGTH_MM = 200.0;
export const VIRSA_CALIBRATED_2400_FOCAL_LENGTH_MM = 202.7247295;
export const VIRSA_FOCAL_CORRECTION_2400 = 4.2669245e-5;
export const VIRSA_DEFAULT_INCLUDED_ANGLE_RAD = 0.6632;
export const VIRSA_CALIBRATED_2400_INCLUDED_ANGLE_RAD = 0.66057;
export const VIRSA_PIXEL_PITCH_MM = -0.026;
export const VIRSA_ACTIVE_X_MIN_PX = 18;
export const VIRSA_ACTIVE_X_MAX_PX = 1032;
export const VIRSA_ZERO_ORDER_CENTRE_PX = 517;
export const VIRSA_ACTIVE_Y_MIN_PX = 125;
export const VIRSA_ACTIVE_Y_MAX_PX = 145;
export const VIRSA_CCD_TEMP_CELSIUS = -70;
export const VIRSA_ROOM_TEMP_CELSIUS = 20;
export const REFERENCE_ROOM_TEMP_CELSIUS = 20.0;
/**
 * Linear thermal expansion coefficient of grating substrate (borosilicate / crown glass replica grating):
 * alpha_grating = 8.1e-6 / °C. As room temperature rises by dT = T - 20 °C, groove period expands by (1 + alpha * dT)
 * and effective groove density g_eff(T) = g0 / (1 + alpha * dT) decreases.
 */
export const GRATING_SUBSTRATE_THERMAL_EXPANSION_PER_C = 8.1e-6;
/**
 * Net thermo-optic focal length expansion coefficient of the spectrograph optical bench and focusing lens assembly:
 * alpha_focal = 16.5e-6 / °C. As room temperature rises by dT = T - 20 °C, F_eff(T) = F0 * (1 + alpha_focal * dT).
 */
export const BENCH_FOCAL_THERMAL_EXPANSION_PER_C = 16.5e-6;
export const VIRSA_BEFORE_CAL_RMS_CM1 = 12.330609;
export const VIRSA_AFTER_CAL_RMS_CM1 = 0.076815;
export const VIRSA_INITIAL_PCL_OFFSET_CM1 = -12.95;

export interface ThermalOpticsState {
  roomTemperatureC: number;
  deltaTempFromRefC: number;
  airRefractiveIndex: number;
  deltaAirRefractiveIndex: number;
  effectiveGrooveDensityLmm: number;
  effectiveFocalLengthMm: number;
  thermalWavenumberDriftCm1: number;
  thermalPixelDriftPx: number;
}

export interface VirsaEmpiricalWindowBenchmark {
  centreAbsCm1: number;
  viewLowAbsCm1: number;
  viewHighAbsCm1: number;
  viewSpanCm1: number;
}

export const EMPIRICAL_VIRSA_2400_WINDOWS: VirsaEmpiricalWindowBenchmark[] = [
  {
    centreAbsCm1: 14430.7,
    viewLowAbsCm1: 14040.12,
    viewHighAbsCm1: 14883.74,
    viewSpanCm1: 843.62,
  },
  {
    centreAbsCm1: 15370.0,
    viewLowAbsCm1: 14887.42,
    viewHighAbsCm1: 15928.37,
    viewSpanCm1: 1040.95,
  },
  {
    centreAbsCm1: 15651.0,
    viewLowAbsCm1: 15141.26,
    viewHighAbsCm1: 16240.56,
    viewSpanCm1: 1099.3,
  },
  {
    centreAbsCm1: 15872.0,
    viewLowAbsCm1: 15341.09,
    viewHighAbsCm1: 16486.37,
    viewSpanCm1: 1145.28,
  },
  {
    centreAbsCm1: 16278.53,
    viewLowAbsCm1: 15708.31,
    viewHighAbsCm1: 16938.37,
    viewSpanCm1: 1230.06,
  },
  {
    centreAbsCm1: 16821.33,
    viewLowAbsCm1: 16198.53,
    viewHighAbsCm1: 17542.82,
    viewSpanCm1: 1344.29,
  },
  {
    centreAbsCm1: 17086.75,
    viewLowAbsCm1: 16437.37,
    viewHighAbsCm1: 17837.87,
    viewSpanCm1: 1400.5,
  },
  {
    centreAbsCm1: 17835.71,
    viewLowAbsCm1: 17112.73,
    viewHighAbsCm1: 18674.89,
    viewSpanCm1: 1562.16,
  },
  {
    centreAbsCm1: 18159.6,
    viewLowAbsCm1: 17404.18,
    viewHighAbsCm1: 19037.42,
    viewSpanCm1: 1633.24,
  },
  {
    centreAbsCm1: 18516.59,
    viewLowAbsCm1: 17724.85,
    viewHighAbsCm1: 19437.3,
    viewSpanCm1: 1712.45,
  },
  {
    centreAbsCm1: 19200.0,
    viewLowAbsCm1: 18337.79,
    viewHighAbsCm1: 20204.8,
    viewSpanCm1: 1867.01,
  },
  {
    centreAbsCm1: 24000.0,
    viewLowAbsCm1: 22595.37,
    viewHighAbsCm1: 25667.51,
    viewSpanCm1: 3072.14,
  },
];

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
 * Exact empirical CCD view limits vs. motor steps from the inVia 532nm / 1800 l/mm reference system (update.txt).
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
  thermalOptics: ThermalOpticsState;
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
  customAbsLowCm1?: number | null; // Optional manual override for Absolute Calibration Range start (low cm^-1)
  customAbsHighCm1?: number | null; // Optional manual override for Absolute Calibration Range end (high cm^-1)
  ccdType: CCDArchitecture; // FDA (Front-side Direct Architecture) vs BDA (Back-Illuminated)
  ccdTotalWidthPx: number; // Default 1040
  ccdActiveWidthPx: number; // Default 1014 (X: 18 to 1032)
  ccdActiveXMinPx?: number; // Default 18
  ccdActiveXMaxPx?: number; // Default 1032
  ccdZeroOrderCentrePx?: number; // Zero-order centre pixel (e.g., 517 or 520)
  ccdTotalHeightPx: number; // Default 256
  ccdActiveHeightPx: number; // Default 30 (bottom 30 pixels) or 20 (Y: 125-145)
  ccdDetectionCutoffCm1: number; // Default 9800 cm^-1 (or 9239 cm^-1 extended NIR tail)
  enforceCcdCutoff: boolean; // Whether to cap Raman range by CCD silicon red-limit
  targetOccurrencesPerLine: number; // Default 8 occurrences across the CCD (16 on Virsa)
  targetLineCount: number; // Desired number of calibration lines across range (e.g., 8 - 16)
  minRelativeIntensity: number; // Minimum neon peak intensity threshold
  manualPclOverrideCm1?: number | null; // Optional manual PCL selection
  roomTemperatureC?: number; // Ambient room air temperature in °C (default 20.0 °C)
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
  achievedOccurrencesAtHigh: number;
  achievedOccurrencesAtCentre: number;
  achievedOccurrencesAtLow: number;
  totalScanSteps: number;
  wireXStepAbsCm1: number; // Step size in absolute cm^-1 during WiRE X calibration (e.g., 50 cm^-1)
  wireXTotalScanCount: number; // Number of scans across scanSpanCm1 at wireXStepAbsCm1 (e.g., 108 scans for 14000-19400 cm^-1)
  wireXHitsAtHigh: number; // Hits per line at high-wavenumber end (ccdWindowHighCm1 / wireXStepAbsCm1)
  wireXHitsAtCentre: number; // Hits per line at range centre (ccdWindowCentreCm1 / wireXStepAbsCm1)
  wireXHitsAtLow: number; // Hits per line at low-wavenumber end (ccdWindowLowCm1 / wireXStepAbsCm1)
  // Selected calibration lines
  primaryCalibrationLine: NeonLine | null;
  secondaryCalibrationLine: NeonLine | null;
  focusAnchorLines: NeonLine[]; // e.g., 18516.48 & 15619.12 cm^-1 for near/far lens focusing
  selectedLines: NeonLine[];
  candidatePool: NeonLine[];
  binDistribution: BinDistribution[];
  dispersionUniformityScore: number; // 0 - 100%
  confusionRisks: LineConfusionPair[];
  thermalOptics: ThermalOpticsState;
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
 * Computes the standard 50–4000 cm^-1 filter transmission percentage as a function of Raman shift (cm^-1).
 * Note: Neon bulb calibration scans (such as 532nm_1800.lns) are performed without filters in place.
 * When standard 50–4000 cm^-1 filters are installed in the beam path (update.txt):
 * - Below Rayleigh cut-off (<45 cm^-1): 0% (blocked by Rayleigh filter)
 * - 50 to 5000 cm^-1 Raman shift: ~100% passband transmission
 * - Filter transmission starts dropping off at ~5000 cm^-1, reaching 65% at ~7500 cm^-1.
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
 * Updates the Spectrograph model and sets the hardware-accurate CCD active ROI:
 * - Default Active X range for all systems: 18 to 1032 (1014 active pixels)
 * - Default Zero-order centre pixel for all systems: 517
 * - Virsa (50µm fibre): Y range 125–145 (20 rows)
 * - inVia / Strada: bottom 30 rows
 */
export function applySpectrographModel(
  params: CalibrationParameters,
  spectrograph: SpectrographModel
): CalibrationParameters {
  const xMin = params.ccdActiveXMinPx ?? 18;
  const xMax = params.ccdActiveXMaxPx ?? 1032;
  const width = Math.max(100, xMax - xMin);
  if (spectrograph === 'Virsa') {
    return {
      ...params,
      spectrograph,
      ccdActiveXMinPx: xMin,
      ccdActiveXMaxPx: xMax,
      ccdActiveWidthPx: width,
      ccdZeroOrderCentrePx: 517,
      ccdActiveHeightPx: 20,
      targetOccurrencesPerLine:
        params.spectrograph !== 'Virsa' && params.targetOccurrencesPerLine === 8
          ? 16
          : params.targetOccurrencesPerLine,
    };
  }
  return {
    ...params,
    spectrograph,
    ccdActiveXMinPx: xMin,
    ccdActiveXMaxPx: xMax,
    ccdActiveWidthPx: width,
    ccdZeroOrderCentrePx: 517,
    ccdActiveHeightPx: 30,
  };
}

/**
 * Computes the refractive index of standard dry air (n_air) at 101.325 kPa
 * as a function of wavelength (nm) and room temperature T (°C) using the Edlén / Ciddor dispersion equation.
 * At T = 20.0 °C and lambda = 585.249 nm (17086.75 cm^-1), n_air ≈ 1.0002725.
 * Temperature sensitivity: dn_air / dT ≈ -0.92e-6 / °C near 20 °C.
 */
export function calculateAirRefractiveIndex(
  wavelengthNm: number = 585.249,
  roomTemperatureC: number = REFERENCE_ROOM_TEMP_CELSIUS
): number {
  const safeLambdaUm = Math.max(0.2, Math.min(2.5, wavelengthNm / 1000));
  const sigma2 = 1 / (safeLambdaUm * safeLambdaUm);
  // Standard Edlén refractivity (n - 1)_15C at 15 °C, 101.325 kPa
  const nMinus1At15C =
    1e-8 *
    (8342.54 + 2406147 / (130 - sigma2) + 15998 / (38.9 - sigma2));
  const tempScale =
    (288.15 / Math.max(150, 273.15 + roomTemperatureC)) *
    ((1 + 1e-6 * (0.601 - 0.00972 * roomTemperatureC)) /
      (1 + 1e-6 * (0.601 - 0.00972 * 15.0)));
  return Number((1 + nMinus1At15C * tempScale).toFixed(8));
}

/**
 * Computes the thermo-optic state of the spectrograph optical bench, diffraction grating,
 * and room air at ambient temperature `roomTemperatureC` relative to the 20.0 °C calibration reference.
 */
export function calculateThermalOpticsState(
  wavenumberCm1: number,
  gratingLinesPerMm: number,
  spectrograph: SpectrographModel = 'inVia',
  roomTemperatureC: number = REFERENCE_ROOM_TEMP_CELSIUS
): ThermalOpticsState {
  const safeTempC =
    typeof roomTemperatureC === 'number' && !Number.isNaN(roomTemperatureC)
      ? roomTemperatureC
      : REFERENCE_ROOM_TEMP_CELSIUS;
  const deltaTempFromRefC = Number(
    (safeTempC - REFERENCE_ROOM_TEMP_CELSIUS).toFixed(2)
  );
  const safeNu = Math.max(4000, wavenumberCm1);
  const lambdaNm = 1e7 / safeNu;

  const nAirAtT = calculateAirRefractiveIndex(lambdaNm, safeTempC);
  const nAirAt20 = calculateAirRefractiveIndex(
    lambdaNm,
    REFERENCE_ROOM_TEMP_CELSIUS
  );
  const deltaAirRefractiveIndex = Number((nAirAtT - nAirAt20).toFixed(8));

  const effectiveGrooveDensityLmm = Number(
    (
      gratingLinesPerMm /
      (1 + GRATING_SUBSTRATE_THERMAL_EXPANSION_PER_C * deltaTempFromRefC)
    ).toFixed(5)
  );

  const baseFocalMm =
    spectrograph === 'Virsa'
      ? VIRSA_CALIBRATED_2400_FOCAL_LENGTH_MM
      : spectrograph === 'inVia'
        ? CALIBRATED_1800_FOCAL_LENGTH_MM
        : CALIBRATED_1800_FOCAL_LENGTH_MM * 0.94;
  const effectiveFocalLengthMm = Number(
    (
      baseFocalMm *
      (1 + BENCH_FOCAL_THERMAL_EXPANSION_PER_C * deltaTempFromRefC)
    ).toFixed(4)
  );

  // Fractional wavenumber shift at fixed 20 °C turret angle when temperature shifts by deltaTempFromRefC:
  // d(nu)/nu = -alpha_grating * dT + (n_air(T) - n_air(20°C)) / n_air(20°C)
  const fractionalShift =
    -GRATING_SUBSTRATE_THERMAL_EXPANSION_PER_C * deltaTempFromRefC +
    (nAirAtT - nAirAt20) / nAirAt20;
  const thermalWavenumberDriftCm1 = Number(
    (safeNu * fractionalShift).toFixed(3)
  );

  // Estimate corresponding pixel shift across the CCD sensor
  const approxDispersionCm1PerPx =
    (Math.pow(safeNu, 2) / 1e7) *
    ((spectrograph === 'Virsa' ? 115 : 101.5) / Math.max(300, gratingLinesPerMm));
  const thermalPixelDriftPx = Number(
    (
      thermalWavenumberDriftCm1 / Math.max(0.1, approxDispersionCm1PerPx)
    ).toFixed(2)
  );

  return {
    roomTemperatureC: safeTempC,
    deltaTempFromRefC,
    airRefractiveIndex: nAirAtT,
    deltaAirRefractiveIndex,
    effectiveGrooveDensityLmm,
    effectiveFocalLengthMm,
    thermalWavenumberDriftCm1,
    thermalPixelDriftPx,
  };
}

/**
 * Converts laser wavelength (nm) to exact laser wavenumber (cm^-1).
 * For the exact integer nominal presets (532, 633, 785), matches the standard factory calibration
 * reference wavenumbers (18797.0, 15802.8, 12739.0 cm^-1). For any custom or decimal laser wavelength
 * entered by the user (e.g. 532.096 nm), computes the exact physical wavenumber 1e7 / laserNm.
 */
export function getLaserWavenumberCm1(laserNm: number): number {
  if (Math.abs(laserNm - 633) < 1e-4) {
    return 15802.8;
  }
  if (Math.abs(laserNm - 532) < 1e-4) {
    return 18797.0;
  }
  if (Math.abs(laserNm - 785) < 1e-4) {
    return 12739.0;
  }
  return Number((1e7 / Math.max(100, laserNm)).toFixed(2));
}

/**
 * Computes the exact asymmetric Low and High CCD View Window bounds (Abs cm^-1)
 * at a given centre wavenumber using the continuous two-edge Czerny-Turner diffraction ray-trace:
 *   lambda(x, T) = [sin(theta(T) + gamma) + sin(theta(T) - gamma + dBeta(x, T))] / g_eff(T)
 * Supports custom active X pixel bounds (e.g., X: 18 to 1032), custom zero-order centre pixel
 * (e.g., Pixel 517), and ambient Room Temperature T (°C, default 20.0 °C).
 * No lookup table shortcuts are used — every wavenumber, pixel bound, grating, and temperature
 * is evaluated directly from the physical Czerny-Turner ray-trace.
 */
export function calculateCcdWindowBoundsCm1(
  centreNuCm1: number,
  gratingLinesPerMm: number,
  activeWidthPx: number = 1014,
  spectrograph: SpectrographModel = 'inVia',
  activeXMinPx?: number,
  activeXMaxPx?: number,
  zeroOrderCentrePx?: number,
  roomTemperatureC: number = REFERENCE_ROOM_TEMP_CELSIUS
): { windowLowAbsCm1: number; windowHighAbsCm1: number; windowSpanCm1: number } {
  const safeNu = Math.max(4000, centreNuCm1);
  const thermal = calculateThermalOpticsState(
    safeNu,
    gratingLinesPerMm,
    spectrograph,
    roomTemperatureC
  );

  // Effective centre wavenumber shifted by thermo-optic grating expansion & air refractive index at T (°C)
  const effectiveCentreNu = safeNu + thermal.thermalWavenumberDriftCm1;
  const lambdaNm = 1e7 / effectiveCentreNu;
  const focalThermalFactor =
    1 + BENCH_FOCAL_THERMAL_EXPANSION_PER_C * thermal.deltaTempFromRefC;

  if (spectrograph === 'Virsa') {
    const xMin = activeXMinPx ?? VIRSA_ACTIVE_X_MIN_PX;
    const xMax =
      activeXMaxPx ??
      (activeXMinPx !== undefined
        ? activeXMinPx + activeWidthPx
        : VIRSA_ACTIVE_X_MAX_PX);
    const xCentre = zeroOrderCentrePx ?? VIRSA_ZERO_ORDER_CENTRE_PX;

    // Continuous Virsa Czerny-Turner ray-trace (F = 202.7247295 mm, Included angle = 0.660570 rad,
    // pixel pitch = -0.026 mm, active X = [xMin..xMax] around zero-order centre pixel xCentre, at T °C)
    const gPerNm = gratingLinesPerMm / 1e6;
    const gamma = VIRSA_CALIBRATED_2400_INCLUDED_ANGLE_RAD / 2;
    const sinTheta = Math.min(
      0.992,
      Math.max(0.01, (gPerNm * lambdaNm) / (2 * Math.cos(gamma)))
    );
    const theta = Math.asin(sinTheta);
    const alpha = theta + gamma;
    const betaC = theta - gamma;

    const fScale =
      (1 + 2.85e-5 * (585.25 - lambdaNm)) * focalThermalFactor;
    // Active pixel distances from zero-order centre pixel (physical 0.026 mm pixel pitch calibrated at 507 low px / 513 high px)
    const lowPxFromCentre = Math.max(1, xCentre - xMin);
    const highPxFromCentre = Math.max(1, xMax - xCentre);
    const dBetaLow = (0.0646326 * (lowPxFromCentre / 507)) / fScale;
    const dBetaHigh = (-0.0664751 * (highPxFromCentre / 513)) / fScale;

    const sinBetaLow = Math.min(
      0.998,
      Math.max(-0.998, Math.sin(betaC + dBetaLow))
    );
    const sinBetaHigh = Math.min(
      0.998,
      Math.max(-0.998, Math.sin(betaC + dBetaHigh))
    );

    const lambdaLowNm = (Math.sin(alpha) + sinBetaLow) / gPerNm;
    const lambdaHighNm = (Math.sin(alpha) + sinBetaHigh) / gPerNm;

    const windowLowAbsCm1 = Number((1e7 / lambdaLowNm).toFixed(2));
    const windowHighAbsCm1 = Number((1e7 / lambdaHighNm).toFixed(2));
    const windowSpanCm1 = Number(
      (windowHighAbsCm1 - windowLowAbsCm1).toFixed(2)
    );

    return { windowLowAbsCm1, windowHighAbsCm1, windowSpanCm1 };
  }

  // inVia / Strada Czerny-Turner dispersion (F_inVia = 249.2607 mm, F_Strada = 234.305 mm, Included angle = 0.523113 rad)
  const xMin = activeXMinPx ?? Math.round((1040 - activeWidthPx) / 2);
  const xMax = activeXMaxPx ?? xMin + activeWidthPx;
  const xCentre = zeroOrderCentrePx ?? 517;
  const effectiveWidth = Math.max(100, xMax - xMin);

  const halfIncludedRad = CALIBRATED_1800_INCLUDED_ANGLE_RAD / 2;
  const sinTheta = Math.min(
    0.985,
    (gratingLinesPerMm * lambdaNm) / (2e6 * Math.cos(halfIncludedRad))
  );
  const thetaRad = Math.asin(Math.max(0.01, sinTheta));
  const betaRad = thetaRad - halfIncludedRad;
  const cosBeta = Math.max(0.08, Math.cos(betaRad));
  const focalCorrectionFactor =
    (1 + 0.042 * Math.sin(Math.max(0, betaRad))) / focalThermalFactor;
  const focalScale = spectrograph === 'inVia' ? 1.0 : 0.94;

  const dLambdaPerPxNm =
    (101.48 / gratingLinesPerMm) *
    cosBeta *
    focalCorrectionFactor *
    focalScale;
  const totalWindowNm = dLambdaPerPxNm * effectiveWidth;
  const windowSpanCm1 = Number(
    ((Math.pow(effectiveCentreNu, 2) / 1e7) * totalWindowNm).toFixed(2)
  );
  const lowFraction = Math.max(
    0.05,
    Math.min(0.95, (xCentre - xMin) / effectiveWidth)
  );
  const highFraction = 1 - lowFraction;
  const windowLowAbsCm1 = Number(
    (effectiveCentreNu - windowSpanCm1 * lowFraction).toFixed(2)
  );
  const windowHighAbsCm1 = Number(
    (effectiveCentreNu + windowSpanCm1 * highFraction).toFixed(2)
  );

  return { windowLowAbsCm1, windowHighAbsCm1, windowSpanCm1 };
}

/**
 * Calculates the spectral window width (cm^-1) across the active CCD width
 * at a given wavenumber (cm^-1), grating groove density (l/mm), and room temperature (°C).
 */
export function calculateCcdWindowWidthCm1(
  wavenumberCm1: number,
  gratingLinesPerMm: number,
  activeWidthPx: number = 1014,
  spectrograph: SpectrographModel = 'inVia',
  activeXMinPx?: number,
  activeXMaxPx?: number,
  zeroOrderCentrePx?: number,
  roomTemperatureC: number = REFERENCE_ROOM_TEMP_CELSIUS
): number {
  const { windowSpanCm1 } = calculateCcdWindowBoundsCm1(
    wavenumberCm1,
    gratingLinesPerMm,
    activeWidthPx,
    spectrograph,
    activeXMinPx,
    activeXMaxPx,
    zeroOrderCentrePx,
    roomTemperatureC
  );
  return Number(windowSpanCm1.toFixed(1));
}

/**
 * Computes the complete Czerny-Turner grating turret angle, absolute motor step position,
 * CCD visible wavenumber & Raman shift bounds, and wavenumber shift per motor step.
 * Validated against both the inVia 532nm / 1800 l/mm table (update.txt) and the
 * Virsa 532nm / 2400 l/mm table (532nm_2400_notes.txt).
 */
export function calculateTurretKinematicsAtWavenumber(
  centreNuCm1: number,
  gratingLinesPerMm: number,
  laserWavenumberCm1: number = 18797.0,
  activeWidthPx: number = 1014,
  spectrograph: SpectrographModel = 'inVia',
  activeXMinPx?: number,
  activeXMaxPx?: number,
  zeroOrderCentrePx?: number,
  roomTemperatureC: number = REFERENCE_ROOM_TEMP_CELSIUS
): TurretKinematicsState {
  const safeNu = Math.max(4000, centreNuCm1);
  const thermalOptics = calculateThermalOpticsState(
    safeNu,
    gratingLinesPerMm,
    spectrograph,
    roomTemperatureC
  );
  const effectiveNu = safeNu + thermalOptics.thermalWavenumberDriftCm1;
  const wavelengthNm = 1e7 / effectiveNu;
  const includedAngleRad =
    spectrograph === 'Virsa'
      ? VIRSA_CALIBRATED_2400_INCLUDED_ANGLE_RAD
      : CALIBRATED_1800_INCLUDED_ANGLE_RAD;
  const halfIncludedRad = includedAngleRad / 2;

  // Czerny-Turner grating equation: lambda = (2 * sin(theta) * cos(gamma)) / g_eff(T)
  const sinTheta = Math.min(
    0.995,
    Math.max(
      0.01,
      (gratingLinesPerMm * wavelengthNm) / (2e6 * Math.cos(halfIncludedRad))
    )
  );
  const turretAngleRad = Math.asin(sinTheta);
  const turretAngleDeg = (turretAngleRad * 180) / Math.PI;
  const stepsPerDeg =
    spectrograph === 'Virsa'
      ? VIRSA_MOTOR_STEPS_PER_DEGREE
      : MOTOR_STEPS_PER_DEGREE;
  const absoluteMotorSteps = Math.round(turretAngleDeg * stepsPerDeg);

  const { windowLowAbsCm1, windowHighAbsCm1, windowSpanCm1 } =
    calculateCcdWindowBoundsCm1(
      safeNu,
      gratingLinesPerMm,
      activeWidthPx,
      spectrograph,
      activeXMinPx,
      activeXMaxPx,
      zeroOrderCentrePx,
      roomTemperatureC
    );

  const ccdWindowWidthCm1 = Number(windowSpanCm1.toFixed(2));
  const centreRamanCm1 = Number((laserWavenumberCm1 - safeNu).toFixed(2));
  const windowLowRamanCm1 = Number(
    (laserWavenumberCm1 - windowHighAbsCm1).toFixed(2)
  );
  const windowHighRamanCm1 = Number(
    (laserWavenumberCm1 - windowLowAbsCm1).toFixed(2)
  );

  // Derivative |d(nu)/d(theta)| = nu * cot(theta) per radian
  const cosTheta = Math.sqrt(Math.max(0.01, 1 - sinTheta * sinTheta));
  const dNuPerRad = effectiveNu * (cosTheta / sinTheta);
  const radPerStep = Math.PI / (180 * Math.abs(stepsPerDeg));
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
    thermalOptics,
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
 * Matches exact factory reference scan bounds for Virsa 532nm (2400 l/mm: 19400 - 14000 cm^-1 -> 108 scans @ 50 cm^-1),
 * inVia 633nm (2400, 1800, 1200, 600 l/mm), 785nm (600 l/mm), and 532nm (600 & 1800 l/mm).
 */
export function calculateScanRangeBounds(
  laserNm: number,
  gratingLinesPerMm: number,
  absHighCm1: number,
  absLowCm1: number,
  activeWidthPx: number = 1014,
  spectrograph: SpectrographModel = 'inVia',
  isManualAbsRange: boolean = false,
  activeXMinPx?: number,
  activeXMaxPx?: number,
  zeroOrderCentrePx?: number,
  roomTemperatureC: number = REFERENCE_ROOM_TEMP_CELSIUS
): { scanHighCm1: number; scanLowCm1: number } {
  const pixelScale = activeWidthPx / 1014;
  const isDefaultRoi =
    (activeXMinPx === undefined || activeXMinPx === 18) &&
    (activeXMaxPx === undefined || activeXMaxPx === 1032) &&
    (zeroOrderCentrePx === undefined || zeroOrderCentrePx === 517);

  // Compute thermal shift at low and high bounds when roomTemperatureC != 20.0 °C
  const thermalLow = calculateThermalOpticsState(
    absLowCm1,
    gratingLinesPerMm,
    spectrograph,
    roomTemperatureC
  );
  const thermalHigh = calculateThermalOpticsState(
    absHighCm1,
    gratingLinesPerMm,
    spectrograph,
    roomTemperatureC
  );

  // Only apply exact factory reference scan bounds when the user has NOT manually edited the Absolute Calibration Range or ROI
  if (!isManualAbsRange && isDefaultRoi) {
    // Virsa 532nm / 2400 l/mm empirical scan range: 14000 to 19400 cm^-1 (shifted physically by thermal drift when T != 20°C)
    if (
      spectrograph === 'Virsa' &&
      Math.abs(laserNm - 532) < 0.5 &&
      gratingLinesPerMm === 2400 &&
      Math.abs(absHighCm1 - 18747) < 0.5 &&
      Math.abs(absLowCm1 - 14797) < 0.5
    ) {
      return {
        scanHighCm1: Number(
          (19400.0 + thermalHigh.thermalWavenumberDriftCm1).toFixed(1)
        ),
        scanLowCm1: Number(
          (14000.0 + thermalLow.thermalWavenumberDriftCm1).toFixed(1)
        ),
      };
    }

    // inVia 532nm / 1800 l/mm WiRE X reference scan range: 15300 to 19300 cm^-1
    if (
      spectrograph === 'inVia' &&
      Math.abs(laserNm - 532) < 0.5 &&
      gratingLinesPerMm === 1800 &&
      Math.abs(absHighCm1 - 18747) < 0.5 &&
      Math.abs(absLowCm1 - 14797) < 0.5
    ) {
      return {
        scanHighCm1: Number(
          (19300.0 + thermalHigh.thermalWavenumberDriftCm1).toFixed(1)
        ),
        scanLowCm1: Number(
          (15300.0 + thermalLow.thermalWavenumberDriftCm1).toFixed(1)
        ),
      };
    }

    // Check exact factory reference combinations for 100% fidelity to documented tables
    if (
      spectrograph === 'inVia' &&
      Math.abs(pixelScale - 1) < 0.01 &&
      Math.abs(laserNm - 633) < 0.5 &&
      Math.abs(absHighCm1 - 15802.8) < 0.5
    ) {
      if (gratingLinesPerMm === 2400 && Math.abs(absLowCm1 - 13302.8) < 0.5) {
        return {
          scanHighCm1: Number(
            (16270.6 + thermalHigh.thermalWavenumberDriftCm1).toFixed(1)
          ),
          scanLowCm1: Number(
            (13089.9 + thermalLow.thermalWavenumberDriftCm1).toFixed(1)
          ),
        };
      }
      if (gratingLinesPerMm === 1800 && Math.abs(absLowCm1 - 11802.8) < 0.5) {
        return {
          scanHighCm1: Number(
            (16534.4 + thermalHigh.thermalWavenumberDriftCm1).toFixed(1)
          ),
          scanLowCm1: Number(
            (11497.5 + thermalLow.thermalWavenumberDriftCm1).toFixed(1)
          ),
        };
      }
      if (gratingLinesPerMm === 1200 && Math.abs(absLowCm1 - 11802.8) < 0.5) {
        return {
          scanHighCm1: Number(
            (16992.2 + thermalHigh.thermalWavenumberDriftCm1).toFixed(1)
          ),
          scanLowCm1: Number(
            (11257.7 + thermalLow.thermalWavenumberDriftCm1).toFixed(1)
          ),
        };
      }
      if (gratingLinesPerMm === 600 && Math.abs(absLowCm1 - 11802.8) < 0.5) {
        return {
          scanHighCm1: Number(
            (17800.0 + thermalHigh.thermalWavenumberDriftCm1).toFixed(1)
          ),
          scanLowCm1: Number(
            (10821.0 + thermalLow.thermalWavenumberDriftCm1).toFixed(1)
          ),
        };
      }
    }

    if (
      spectrograph === 'inVia' &&
      Math.abs(pixelScale - 1) < 0.01 &&
      Math.abs(laserNm - 785) < 0.5 &&
      gratingLinesPerMm === 600 &&
      Math.abs(absHighCm1 - 12689) < 0.5 &&
      Math.abs(absLowCm1 - 9239) < 0.5
    ) {
      return {
        scanHighCm1: Number(
          (13100.0 + thermalHigh.thermalWavenumberDriftCm1).toFixed(1)
        ),
        scanLowCm1: Number(
          (8700.0 + thermalLow.thermalWavenumberDriftCm1).toFixed(1)
        ),
      };
    }

    if (
      spectrograph === 'inVia' &&
      Math.abs(pixelScale - 1) < 0.01 &&
      Math.abs(laserNm - 532) < 0.5 &&
      gratingLinesPerMm === 600 &&
      Math.abs(absHighCm1 - 18747) < 0.5 &&
      Math.abs(absLowCm1 - 14797) < 0.5
    ) {
      return {
        scanHighCm1: Number(
          (20450.0 + thermalHigh.thermalWavenumberDriftCm1).toFixed(1)
        ),
        scanLowCm1: Number(
          (13880.0 + thermalLow.thermalWavenumberDriftCm1).toFixed(1)
        ),
      };
    }
  }

  // General physical dispersion margin model:
  // Calculate the exact CCD view range at the start (absLowCm1) and end (absHighCm1) wavenumbers
  const boundsLow = calculateCcdWindowBoundsCm1(
    absLowCm1,
    gratingLinesPerMm,
    activeWidthPx,
    spectrograph,
    activeXMinPx,
    activeXMaxPx,
    zeroOrderCentrePx,
    roomTemperatureC
  );
  const boundsHigh = calculateCcdWindowBoundsCm1(
    absHighCm1,
    gratingLinesPerMm,
    activeWidthPx,
    spectrograph,
    activeXMinPx,
    activeXMaxPx,
    zeroOrderCentrePx,
    roomTemperatureC
  );

  // The turret scan range extends by the CCD view half-window below absLowCm1 and above absHighCm1
  const lowerMargin = Math.max(
    200,
    (absLowCm1 - boundsLow.windowLowAbsCm1) * 1.04
  );
  const upperMargin = Math.max(
    200,
    (boundsHigh.windowHighAbsCm1 - absHighCm1) * 1.04
  );

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
      'RPL / PL Extended Filter (50–8500 cm⁻¹ Raman shift)'
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
  let absHighCm1 = Number((laserWavenumberCm1 - ramanMin).toFixed(1));
  let absLowCm1 = Number((laserWavenumberCm1 - ramanMax).toFixed(1));
  const isManualAbsRange =
    typeof params.customAbsLowCm1 === 'number' &&
    typeof params.customAbsHighCm1 === 'number' &&
    !isNaN(params.customAbsLowCm1) &&
    !isNaN(params.customAbsHighCm1);

  if (isManualAbsRange) {
    const manualLow = Math.min(params.customAbsLowCm1!, params.customAbsHighCm1!);
    const manualHigh = Math.max(
      manualLow + 100,
      Math.max(params.customAbsLowCm1!, params.customAbsHighCm1!)
    );
    absLowCm1 = Number(manualLow.toFixed(1));
    absHighCm1 = Number(manualHigh.toFixed(1));
    ramanMin = Math.round(laserWavenumberCm1 - absHighCm1);
    ramanMax = Math.round(laserWavenumberCm1 - absLowCm1);
    limitingFactors.push(
      `Manual Absolute Calibration Range (${Math.round(absLowCm1)}–${Math.round(absHighCm1)} cm⁻¹ · ${ramanMin}–${ramanMax} cm⁻¹ Raman shift)`
    );
  }

  const absCentreCm1 = Number(((absHighCm1 + absLowCm1) / 2).toFixed(2));
  const roomTemperatureC =
    typeof params.roomTemperatureC === 'number' &&
    !Number.isNaN(params.roomTemperatureC)
      ? params.roomTemperatureC
      : REFERENCE_ROOM_TEMP_CELSIUS;

  const thermalOptics = calculateThermalOpticsState(
    absCentreCm1,
    params.gratingLinesPerMm,
    params.spectrograph,
    roomTemperatureC
  );

  if (Math.abs(thermalOptics.deltaTempFromRefC) >= 0.05) {
    const sign = thermalOptics.deltaTempFromRefC > 0 ? '+' : '';
    const driftSign = thermalOptics.thermalWavenumberDriftCm1 > 0 ? '+' : '';
    const pxSign = thermalOptics.thermalPixelDriftPx > 0 ? '+' : '';
    limitingFactors.push(
      `Room Temp ${roomTemperatureC.toFixed(1)} °C (ΔT = ${sign}${thermalOptics.deltaTempFromRefC.toFixed(1)} °C vs 20 °C ref · n_air = ${thermalOptics.airRefractiveIndex.toFixed(6)} · Thermal shift = ${driftSign}${thermalOptics.thermalWavenumberDriftCm1.toFixed(2)} cm⁻¹ / ${pxSign}${thermalOptics.thermalPixelDriftPx.toFixed(2)} px)`
    );
  }

  // 5. Calculate Grating Scan Range Bounds (cm^-1)
  const { scanHighCm1, scanLowCm1 } = calculateScanRangeBounds(
    params.laserNm,
    params.gratingLinesPerMm,
    absHighCm1,
    absLowCm1,
    params.ccdActiveWidthPx,
    params.spectrograph,
    isManualAbsRange,
    params.ccdActiveXMinPx,
    params.ccdActiveXMaxPx,
    params.ccdZeroOrderCentrePx,
    roomTemperatureC
  );
  const scanSpanCm1 = Number((scanHighCm1 - scanLowCm1).toFixed(1));

  // 6. Calculate CCD Spectral Window Width across active pixels (default 1014 px)
  const ccdWindowHighCm1 = calculateCcdWindowWidthCm1(
    absHighCm1,
    params.gratingLinesPerMm,
    params.ccdActiveWidthPx,
    params.spectrograph,
    params.ccdActiveXMinPx,
    params.ccdActiveXMaxPx,
    params.ccdZeroOrderCentrePx,
    roomTemperatureC
  );
  const ccdWindowCentreCm1 = calculateCcdWindowWidthCm1(
    absCentreCm1,
    params.gratingLinesPerMm,
    params.ccdActiveWidthPx,
    params.spectrograph,
    params.ccdActiveXMinPx,
    params.ccdActiveXMaxPx,
    params.ccdZeroOrderCentrePx,
    roomTemperatureC
  );
  const ccdWindowLowCm1 = calculateCcdWindowWidthCm1(
    absLowCm1,
    params.gratingLinesPerMm,
    params.ccdActiveWidthPx,
    params.spectrograph,
    params.ccdActiveXMinPx,
    params.ccdActiveXMaxPx,
    params.ccdZeroOrderCentrePx,
    roomTemperatureC
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
  const achievedOccurrencesAtHigh = Number(
    (ccdWindowHighCm1 / wavenumberShiftPerStepCm1).toFixed(1)
  );
  const achievedOccurrencesAtCentre = Number(
    (ccdWindowCentreCm1 / wavenumberShiftPerStepCm1).toFixed(1)
  );
  const achievedOccurrencesAtLow = Number(
    (ccdWindowLowCm1 / wavenumberShiftPerStepCm1).toFixed(1)
  );
  const totalScanSteps = Math.ceil(scanSpanCm1 / wavenumberShiftPerStepCm1);

  // In WiRE X Calibration ("Step: 50 (abs. cm-1)"), the step size is in absolute cm^-1.
  // Because the CCD view window is narrowest at the low-wavenumber end (ccdWindowLowCm1),
  // we calculate the step size in Abs cm^-1 from ccdWindowLowCm1 / targetHits so that
  // even the lowest wavenumber achieves the requested targetHits across the CCD.
  const exactWireXStepAbsCm1 = Number((ccdWindowLowCm1 / targetHits).toFixed(1));
  const wireXStandardSteps = [
    10, 15, 20, 25, 30, 40, 50, 75, 80, 100, 125, 150, 200, 250, 300, 400, 500,
  ];
  const wireXStepAbsCm1 = wireXStandardSteps.reduce((prev, curr) =>
    Math.abs(curr - exactWireXStepAbsCm1) < Math.abs(prev - exactWireXStepAbsCm1)
      ? curr
      : prev
  );
  const wireXTotalScanCount = Math.round(scanSpanCm1 / Math.max(1, wireXStepAbsCm1));
  const wireXHitsAtHigh = Number((ccdWindowHighCm1 / Math.max(1, wireXStepAbsCm1)).toFixed(1));
  const wireXHitsAtCentre = Number((ccdWindowCentreCm1 / Math.max(1, wireXStepAbsCm1)).toFixed(1));
  const wireXHitsAtLow = Number((ccdWindowLowCm1 / Math.max(1, wireXStepAbsCm1)).toFixed(1));

  // 8. Filter Candidate Neon Lines within Calibration Range
  const effectiveMinIntensity =
    params.ccdType === 'BDA'
      ? Math.max(100, params.minRelativeIntensity * 0.8)
      : params.minRelativeIntensity;

  const calMarginHigh = Math.min(scanHighCm1, absHighCm1 + 260);
  const calMarginLow = Math.max(scanLowCm1, absLowCm1 - 260);

  const candidatePool = NEON_CATALOG.filter((line) => {
    if (line.excludeFromAutoPick) return false;
    // On inVia 532nm + 1800 l/mm with FDA camera and visible lenses, 18758.92 cm^-1 has 0 counts (not visible).
    // On Virsa 532nm + 2400 l/mm (50um fibre), 18758.99 cm^-1 is detected at 42.3 e-/cm^-1.
    if (
      params.spectrograph === 'inVia' &&
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

  // Identify near/far lens focus anchor lines at both ends of the spectrum for multi-lens systems (inVia).
  // Virsa has only 1 movable lens and does not use dual near/far lens focus lines.
  let focusAnchorLines: NeonLine[] = [];
  if (params.spectrograph !== 'Virsa') {
    const explicitFocus = NEON_CATALOG.filter(
      (l) =>
        l.isFocusAnchor &&
        l.wavenumber <= scanHighCm1 &&
        l.wavenumber >= scanLowCm1
    ).sort((a, b) => b.wavenumber - a.wavenumber);

    if (explicitFocus.length >= 2 && Math.abs(params.laserNm - 532) < 1.5) {
      focusAnchorLines = explicitFocus;
    } else if (candidatePool.length >= 2) {
      const span = Math.max(200, absHighCm1 - absLowCm1);
      const highEndCandidates = candidatePool.filter(
        (l) => l.wavenumber >= absHighCm1 - span * 0.28
      );
      const lowEndCandidates = candidatePool.filter(
        (l) => l.wavenumber <= absLowCm1 + span * 0.28
      );
      const bestHigh = [...(highEndCandidates.length ? highEndCandidates : candidatePool)].sort(
        (a, b) => b.relativeIntensity - a.relativeIntensity
      )[0];
      const bestLow = [...(lowEndCandidates.length ? lowEndCandidates : candidatePool)]
        .filter((l) => l.id !== bestHigh?.id)
        .sort((a, b) => b.relativeIntensity - a.relativeIntensity)[0];
      focusAnchorLines = [bestHigh, bestLow].filter(Boolean);
    }
  }

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

  const desiredCount = Math.max(5, Math.min(25, params.targetLineCount));
  // When requesting higher line density (e.g. 16 lines = 3 per zone), scale spacing threshold so each zone can hold 3 lines
  const effectivePickSpacingCm1 =
    desiredCount > 10
      ? Math.min(
          minRequiredLineSpacingCm1,
          Math.max(40, Math.floor((absHighCm1 - absLowCm1) / (desiredCount * 2.25)))
        )
      : minRequiredLineSpacingCm1;

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
        (s) => Math.abs(s.wavenumber - line13353.wavenumber) >= effectivePickSpacingCm1 * 0.75
      )
    ) {
      selectedLines.push(line13353);
    }
  }

  // First pass: distribute targetPerBin = Math.max(1, Math.floor(desiredCount / 5)) lines in each of the 5 equal calibration zones
  // (e.g., for desiredCount = 16, targetPerBin = 3 lines per zone across 5 zones + PCL = 16 lines)
  const targetPerBin = Math.max(1, Math.floor(desiredCount / 5));
  const binSpan = (absHighCm1 - absLowCm1) / 5;
  for (let b = 0; b < 5; b++) {
    const binTop = absHighCm1 - b * binSpan + (b === 0 ? 180 : 0);
    const binBot = absHighCm1 - (b + 1) * binSpan - (b === 4 ? 180 : 0);

    for (let slot = 0; slot < targetPerBin; slot++) {
      if (selectedLines.length >= desiredCount) break;
      const currentInBin = selectedLines.filter(
        (s) => s.wavenumber <= binTop && s.wavenumber >= binBot
      );
      if (currentInBin.length > slot) continue;

      const slotTargetNu =
        targetPerBin === 1
          ? (binTop + binBot) / 2
          : binTop - ((slot + 0.5) / targetPerBin) * (binTop - binBot);

      const binCandidates = candidatePool.filter(
        (cand) =>
          cand.wavenumber <= binTop &&
          cand.wavenumber >= binBot &&
          !selectedLines.some((s) => s.id === cand.id) &&
          selectedLines.every(
            (s) => Math.abs(s.wavenumber - cand.wavenumber) >= effectivePickSpacingCm1
          )
      );
      if (binCandidates.length > 0) {
        const bestInBin = binCandidates.sort((a, c) => {
          const distA = Math.abs(a.wavenumber - slotTargetNu);
          const distC = Math.abs(c.wavenumber - slotTargetNu);
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

  // Second pass: fill any remaining desiredCount slots uniformly across [absLowCm1, absHighCm1]
  const targetStep = (absHighCm1 - absLowCm1) / Math.max(1, desiredCount - 1);
  for (let i = 0; i < desiredCount; i++) {
    if (selectedLines.length >= desiredCount) break;
    const targetNu = absHighCm1 - i * targetStep;
    const validCandidates = candidatePool.filter(
      (cand) =>
        !selectedLines.some((s) => s.id === cand.id) &&
        selectedLines.every(
          (s) => Math.abs(s.wavenumber - cand.wavenumber) >= effectivePickSpacingCm1
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
      if (
        desiredCount > 10 ||
        Math.abs(best.wavenumber - targetNu) <= targetStep * 1.35
      ) {
        selectedLines.push(best);
      }
    }
  }

  // Fallback fill if still short of desiredCount and valid spaced candidates exist
  while (selectedLines.length < desiredCount) {
    const remaining = candidatePool.filter(
      (cand) =>
        !selectedLines.some((s) => s.id === cand.id) &&
        selectedLines.every(
          (s) =>
            Math.abs(s.wavenumber - cand.wavenumber) >=
            effectivePickSpacingCm1 * 0.75
        )
    );
    if (remaining.length === 0) break;
    selectedLines.push(remaining[0]);
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
    achievedOccurrencesAtHigh,
    achievedOccurrencesAtCentre,
    achievedOccurrencesAtLow,
    totalScanSteps,
    wireXStepAbsCm1,
    wireXTotalScanCount,
    wireXHitsAtHigh,
    wireXHitsAtCentre,
    wireXHitsAtLow,
    primaryCalibrationLine,
    secondaryCalibrationLine,
    focusAnchorLines,
    selectedLines,
    candidatePool,
    binDistribution,
    dispersionUniformityScore,
    confusionRisks,
    thermalOptics,
  };
}
