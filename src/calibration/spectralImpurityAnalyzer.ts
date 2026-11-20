import { NEON_CATALOG, NeonLine } from './neonCatalog';

export type SpectralEmitterSpecies =
  | 'Ne I'
  | 'Ne II'
  | 'Ar I'
  | 'Ar II'
  | 'Hg I'
  | 'Kr I'
  | 'Unknown';

export type SpectralLineOriginClassification =
  | 'authentic_ne1_first_order'
  | 'ne1_with_coincidental_overlap'
  | 'trace_gas_impurity'
  | 'second_order_diffraction'
  | 'third_order_diffraction'
  | 'unidentified_peak';

export interface ImpurityOrHigherOrderReference {
  id: string;
  species: SpectralEmitterSpecies;
  diffractionOrder: 1 | 2 | 3;
  trueWavelengthAirNm: number;
  trueWavenumberAirCm1: number;
  trueWavenumberVacCm1: number;
  apparentWavelengthAirNm: number;
  apparentWavenumberAirCm1: number;
  relativeIntensity: number;
  transition: string;
  originNote: string;
  uvAttenuatedInGlassOrFibre?: boolean;
}

export interface SpectralLineOriginAnalysis {
  observedWavenumberCm1: number;
  observedWavelengthAirNm: number;
  declaredIntensity?: number;
  classification: SpectralLineOriginClassification;
  isFlaggedAnomaly: boolean;
  flagSeverity: 'nominal' | 'info' | 'warning' | 'critical';
  diffractionOrder: 1 | 2 | 3;
  primarySpecies: SpectralEmitterSpecies;
  badgeLabel: string;
  // NIST Air (20 C) vs Vacuum comparison for matched 1st-order or impurity line
  nistWavelengthAirNm: number | null;
  nistWavenumberAirCm1: number | null;
  nistWavenumberVacCm1: number | null;
  deltaFromNistAirCm1: number | null;
  deltaFromNistVacCm1: number | null;
  matchedNe1Line: NeonLine | null;
  matchedImpurityOrOrderRef: ImpurityOrHigherOrderReference | null;
  explanation: string;
}

export interface BatchSpectralOriginSummary {
  totalAnalyzed: number;
  authenticNe1Count: number;
  coincidentalOverlapCount: number;
  traceImpurityCount: number;
  secondOrderCount: number;
  thirdOrderCount: number;
  unidentifiedCount: number;
  entries: SpectralLineOriginAnalysis[];
  overallAssessment: string;
}

/**
 * Standard Ciddor / Edlen refractive index of standard dry air at 20 °C, 101.325 kPa
 * as a function of wavelength in nm.
 * Converts air wavelength (nm) -> air wavenumber (1e7 / lambda_air) and vacuum wavenumber (1e7 / (n * lambda_air)).
 */
export function getAirRefractiveIndex20C(wavelengthNm: number): number {
  const safeLambdaUm = Math.max(0.2, wavelengthNm / 1000);
  const s2 = 1 / (safeLambdaUm * safeLambdaUm);
  // Edlen dispersion formula adjusted to 20 C
  const nMinus1 =
    (8342.54 + 2406147 / (130 - s2) + 15998 / (38.9 - s2)) * 1e-8 * (288.15 / 293.15);
  return 1 + nMinus1;
}

export function airNmToAirWavenumberCm1(wavelengthAirNm: number): number {
  return Number((1e7 / wavelengthAirNm).toFixed(2));
}

export function airNmToVacuumWavenumberCm1(wavelengthAirNm: number): number {
  const n = getAirRefractiveIndex20C(wavelengthAirNm);
  return Number((1e7 / (wavelengthAirNm * n)).toFixed(2));
}

/**
 * Reference catalog of Trace Gas Impurities (Argon I Penning gas in Neon bulbs,
 * Mercury I ambient/calibration lines, Krypton I) in 1st order (m = 1).
 */
export const TRACE_GAS_IMPURITY_CATALOG: ImpurityOrHigherOrderReference[] = [
  // Trace Argon I (Ar I) — Penning mixture (0.1%–1% Ar in commercial Neon bulbs to lower breakdown voltage)
  // Visible Ar I (4p -> 5d / 6s transitions, typically weak unless long exposure)
  {
    id: 'ar1-518.78',
    species: 'Ar I',
    diffractionOrder: 1,
    trueWavelengthAirNm: 518.775,
    trueWavenumberAirCm1: 19276.18,
    trueWavenumberVacCm1: airNmToVacuumWavenumberCm1(518.775),
    apparentWavelengthAirNm: 518.775,
    apparentWavenumberAirCm1: 19276.18,
    relativeIntensity: 90,
    transition: '4p[1/2]1 - 5d[1/2]1',
    originNote: 'Trace Argon I visible emission line (Penning gas additive in Neon bulbs)',
  },
  {
    id: 'ar1-549.59',
    species: 'Ar I',
    diffractionOrder: 1,
    trueWavelengthAirNm: 549.587,
    trueWavenumberAirCm1: 18195.48,
    trueWavenumberVacCm1: airNmToVacuumWavenumberCm1(549.587),
    apparentWavelengthAirNm: 549.587,
    apparentWavenumberAirCm1: 18195.48,
    relativeIntensity: 140,
    transition: '4p[5/2]3 - 6d[7/2]4',
    originNote: 'Trace Argon I visible line at 549.587 nm (close to Ne I 549.442 nm / 18192.4 cm⁻¹)',
  },
  {
    id: 'ar1-555.87',
    species: 'Ar I',
    diffractionOrder: 1,
    trueWavelengthAirNm: 555.870,
    trueWavenumberAirCm1: 17989.82,
    trueWavenumberVacCm1: airNmToVacuumWavenumberCm1(555.870),
    apparentWavelengthAirNm: 555.870,
    apparentWavenumberAirCm1: 17989.82,
    relativeIntensity: 130,
    transition: '4p[3/2]2 - 5d[5/2]3',
    originNote: 'Trace Argon I visible line at 555.870 nm',
  },
  {
    id: 'ar1-560.67',
    species: 'Ar I',
    diffractionOrder: 1,
    trueWavelengthAirNm: 560.673,
    trueWavenumberAirCm1: 17835.71,
    trueWavenumberVacCm1: airNmToVacuumWavenumberCm1(560.673),
    apparentWavelengthAirNm: 560.673,
    apparentWavenumberAirCm1: 17835.71,
    relativeIntensity: 110,
    transition: '4p[1/2]1 - 5d[3/2]2',
    originNote: 'Coincidental wavelength overlap with authentic Ne I 560.673 nm (17835.71 cm⁻¹); dominated by Ne I in Neon lamps',
  },
  {
    id: 'ar1-565.07',
    species: 'Ar I',
    diffractionOrder: 1,
    trueWavelengthAirNm: 565.070,
    trueWavenumberAirCm1: 17696.92,
    trueWavenumberVacCm1: airNmToVacuumWavenumberCm1(565.070),
    apparentWavelengthAirNm: 565.070,
    apparentWavenumberAirCm1: 17696.92,
    relativeIntensity: 115,
    transition: '4p[1/2]1 - 5d[1/2]0',
    originNote: 'Trace Argon I visible line at 565.070 nm',
  },
  {
    id: 'ar1-591.21',
    species: 'Ar I',
    diffractionOrder: 1,
    trueWavelengthAirNm: 591.209,
    trueWavenumberAirCm1: 16914.49,
    trueWavenumberVacCm1: airNmToVacuumWavenumberCm1(591.209),
    apparentWavelengthAirNm: 591.209,
    apparentWavenumberAirCm1: 16914.49,
    relativeIntensity: 160,
    transition: '4p[1/2]1 - 4d\'[3/2]1',
    originNote: 'Trace Argon I visible line at 591.209 nm',
  },
  {
    id: 'ar1-603.21',
    species: 'Ar I',
    diffractionOrder: 1,
    trueWavelengthAirNm: 603.213,
    trueWavenumberAirCm1: 16577.89,
    trueWavenumberVacCm1: airNmToVacuumWavenumberCm1(603.213),
    apparentWavelengthAirNm: 603.213,
    apparentWavenumberAirCm1: 16577.89,
    relativeIntensity: 190,
    transition: '4p[5/2]3 - 5d[7/2]4',
    originNote: 'Trace Argon I orange-red line at 603.213 nm (near Ne I 16583.75 cm⁻¹)',
  },
  {
    id: 'ar1-641.63',
    species: 'Ar I',
    diffractionOrder: 1,
    trueWavelengthAirNm: 641.631,
    trueWavenumberAirCm1: 15585.28,
    trueWavenumberVacCm1: airNmToVacuumWavenumberCm1(641.631),
    apparentWavelengthAirNm: 641.631,
    apparentWavenumberAirCm1: 15585.28,
    relativeIntensity: 210,
    transition: '4p[1/2]1 - 6s[3/2]2',
    originNote: 'Trace Argon I red emission line at 641.631 nm',
  },
  {
    id: 'ar1-675.28',
    species: 'Ar I',
    diffractionOrder: 1,
    trueWavelengthAirNm: 675.283,
    trueWavenumberAirCm1: 14808.61,
    trueWavenumberVacCm1: airNmToVacuumWavenumberCm1(675.283),
    apparentWavelengthAirNm: 675.283,
    apparentWavenumberAirCm1: 14808.61,
    relativeIntensity: 260,
    transition: '4p[1/2]1 - 4d[3/2]2',
    originNote: 'Trace Argon I 675.283 nm peak (recorded at 14808.4 cm⁻¹ in uncalibrated Neon-Argon Penning bulbs)',
  },
  // Strong Red / Near-IR Argon I (4s - 4p manifold, intense in Penning Neon-Argon bulbs below 14,400 cm^-1)
  {
    id: 'ar1-696.54',
    species: 'Ar I',
    diffractionOrder: 1,
    trueWavelengthAirNm: 696.543,
    trueWavenumberAirCm1: 14356.61,
    trueWavenumberVacCm1: airNmToVacuumWavenumberCm1(696.543),
    apparentWavelengthAirNm: 696.543,
    apparentWavenumberAirCm1: 14356.61,
    relativeIntensity: 880,
    transition: '4s[3/2]2 - 4p\'[1/2]1',
    originNote: 'Principal Argon I 4s–4p line at 696.543 nm from Penning Argon gas in Neon bulb',
  },
  {
    id: 'ar1-706.72',
    species: 'Ar I',
    diffractionOrder: 1,
    trueWavelengthAirNm: 706.722,
    trueWavenumberAirCm1: 14149.84,
    trueWavenumberVacCm1: airNmToVacuumWavenumberCm1(706.722),
    apparentWavelengthAirNm: 706.722,
    apparentWavenumberAirCm1: 14149.84,
    relativeIntensity: 840,
    transition: '4s[3/2]2 - 4p\'[3/2]2',
    originNote: 'Strong Argon I 4s–4p line at 706.722 nm from trace Argon gas',
  },
  {
    id: 'ar1-727.29',
    species: 'Ar I',
    diffractionOrder: 1,
    trueWavelengthAirNm: 727.294,
    trueWavenumberAirCm1: 13749.60,
    trueWavenumberVacCm1: airNmToVacuumWavenumberCm1(727.294),
    apparentWavelengthAirNm: 727.294,
    apparentWavenumberAirCm1: 13749.60,
    relativeIntensity: 620,
    transition: '4s[3/2]1 - 4p\'[1/2]1',
    originNote: 'Argon I 4s–4p line at 727.294 nm',
  },
  {
    id: 'ar1-738.40',
    species: 'Ar I',
    diffractionOrder: 1,
    trueWavelengthAirNm: 738.398,
    trueWavenumberAirCm1: 13542.83,
    trueWavenumberVacCm1: airNmToVacuumWavenumberCm1(738.398),
    apparentWavelengthAirNm: 738.398,
    apparentWavenumberAirCm1: 13542.83,
    relativeIntensity: 860,
    transition: '4s[3/2]1 - 4p\'[3/2]2',
    originNote: 'Strong Argon I 4s–4p line at 738.398 nm (observed at 13542.7 cm⁻¹ in 532nm_1800.lns from trace Argon in Neon bulb)',
  },
  {
    id: 'ar1-750.39',
    species: 'Ar I',
    diffractionOrder: 1,
    trueWavelengthAirNm: 750.387,
    trueWavenumberAirCm1: 13326.46,
    trueWavenumberVacCm1: airNmToVacuumWavenumberCm1(750.387),
    apparentWavelengthAirNm: 750.387,
    apparentWavenumberAirCm1: 13326.46,
    relativeIntensity: 940,
    transition: '4s\'[1/2]1 - 4p\'[1/2]0',
    originNote: 'Intense Argon I 4s–4p line at 750.387 nm (observed at 13326.3 cm⁻¹ in 532nm_1800.lns from trace Argon in Neon bulb)',
  },
  {
    id: 'ar1-751.47',
    species: 'Ar I',
    diffractionOrder: 1,
    trueWavelengthAirNm: 751.465,
    trueWavenumberAirCm1: 13307.34,
    trueWavenumberVacCm1: airNmToVacuumWavenumberCm1(751.465),
    apparentWavelengthAirNm: 751.465,
    apparentWavenumberAirCm1: 13307.34,
    relativeIntensity: 910,
    transition: '4s[3/2]1 - 4p[1/2]0',
    originNote: 'Intense Argon I 4s–4p line at 751.465 nm (observed at 13307.2 cm⁻¹ in 532nm_1800.lns from trace Argon in Neon bulb)',
  },
  {
    id: 'ar1-763.51',
    species: 'Ar I',
    diffractionOrder: 1,
    trueWavelengthAirNm: 763.511,
    trueWavenumberAirCm1: 13097.39,
    trueWavenumberVacCm1: airNmToVacuumWavenumberCm1(763.511),
    apparentWavelengthAirNm: 763.511,
    apparentWavenumberAirCm1: 13097.39,
    relativeIntensity: 990,
    transition: '4s[3/2]2 - 4p[3/2]2',
    originNote: 'Dominant Argon I 4s–4p line at 763.511 nm (observed at 13097.2 cm⁻¹, 442,270 counts @ 5s in 532nm_1800.lns from trace Argon)',
  },
  {
    id: 'ar1-772.38',
    species: 'Ar I',
    diffractionOrder: 1,
    trueWavelengthAirNm: 772.376,
    trueWavenumberAirCm1: 12947.06,
    trueWavenumberVacCm1: airNmToVacuumWavenumberCm1(772.376),
    apparentWavelengthAirNm: 772.376,
    apparentWavenumberAirCm1: 12947.06,
    relativeIntensity: 890,
    transition: '4s[3/2]2 - 4p[3/2]1',
    originNote: 'Strong Argon I 4s–4p doublet at 772.376 / 772.421 nm (observed at 12946.4 cm⁻¹ in 532nm_1800.lns from trace Argon)',
  },
  {
    id: 'ar1-794.82',
    species: 'Ar I',
    diffractionOrder: 1,
    trueWavelengthAirNm: 794.818,
    trueWavenumberAirCm1: 12581.49,
    trueWavenumberVacCm1: airNmToVacuumWavenumberCm1(794.818),
    apparentWavelengthAirNm: 794.818,
    apparentWavenumberAirCm1: 12581.49,
    relativeIntensity: 880,
    transition: '4s\'[1/2]0 - 4p\'[3/2]1',
    originNote: 'Strong Argon I 4s–4p line at 794.818 nm (observed at 12581.4 cm⁻¹ in 532nm_1800.lns from trace Argon)',
  },
  {
    id: 'ar1-800.62',
    species: 'Ar I',
    diffractionOrder: 1,
    trueWavelengthAirNm: 800.616,
    trueWavenumberAirCm1: 12490.38,
    trueWavenumberVacCm1: airNmToVacuumWavenumberCm1(800.616),
    apparentWavelengthAirNm: 800.616,
    apparentWavenumberAirCm1: 12490.38,
    relativeIntensity: 820,
    transition: '4s[3/2]1 - 4p[3/2]2',
    originNote: 'Argon I 4s–4p line at 800.616 nm (observed at 12490.2 cm⁻¹ in 532nm_1800.lns from trace Argon)',
  },
  {
    id: 'ar1-801.48',
    species: 'Ar I',
    diffractionOrder: 1,
    trueWavelengthAirNm: 801.479,
    trueWavenumberAirCm1: 12476.93,
    trueWavenumberVacCm1: airNmToVacuumWavenumberCm1(801.479),
    apparentWavelengthAirNm: 801.479,
    apparentWavenumberAirCm1: 12476.93,
    relativeIntensity: 920,
    transition: '4s[3/2]2 - 4p[5/2]2',
    originNote: 'Strong Argon I 4s–4p line at 801.479 nm (observed at 12476.7 cm⁻¹ in 532nm_1800.lns from trace Argon)',
  },
  {
    id: 'ar1-810.37',
    species: 'Ar I',
    diffractionOrder: 1,
    trueWavelengthAirNm: 810.369,
    trueWavenumberAirCm1: 12340.06,
    trueWavenumberVacCm1: airNmToVacuumWavenumberCm1(810.369),
    apparentWavelengthAirNm: 810.369,
    apparentWavenumberAirCm1: 12340.06,
    relativeIntensity: 930,
    transition: '4s[3/2]1 - 4p[3/2]1',
    originNote: 'Strong Argon I 4s–4p line at 810.369 nm (observed at 12339.8 cm⁻¹ in 532nm_1800.lns from trace Argon)',
  },
  {
    id: 'ar1-811.53',
    species: 'Ar I',
    diffractionOrder: 1,
    trueWavelengthAirNm: 811.531,
    trueWavenumberAirCm1: 12322.39,
    trueWavenumberVacCm1: airNmToVacuumWavenumberCm1(811.531),
    apparentWavelengthAirNm: 811.531,
    apparentWavenumberAirCm1: 12322.39,
    relativeIntensity: 1000,
    transition: '4s[3/2]2 - 4p[5/2]3',
    originNote: 'Strongest NIR Argon I 4s–4p line at 811.531 nm (observed at 12322.2 cm⁻¹, 625,959 counts @ 5s in 532nm_1800.lns from trace Argon)',
  },
  {
    id: 'ar1-840.82',
    species: 'Ar I',
    diffractionOrder: 1,
    trueWavelengthAirNm: 840.821,
    trueWavenumberAirCm1: 11893.14,
    trueWavenumberVacCm1: airNmToVacuumWavenumberCm1(840.821),
    apparentWavelengthAirNm: 840.821,
    apparentWavenumberAirCm1: 11893.14,
    relativeIntensity: 900,
    transition: '4s\'[1/2]1 - 4p\'[3/2]2',
    originNote: 'Strong Argon I 4s–4p line at 840.821 nm (observed at 11893.14 cm⁻¹, intensity 10,400 in Virsa_785_1500.lns from Penning Argon)',
  },
  {
    id: 'ar1-842.46',
    species: 'Ar I',
    diffractionOrder: 1,
    trueWavelengthAirNm: 842.465,
    trueWavenumberAirCm1: 11869.93,
    trueWavenumberVacCm1: airNmToVacuumWavenumberCm1(842.465),
    apparentWavelengthAirNm: 842.465,
    apparentWavenumberAirCm1: 11869.93,
    relativeIntensity: 910,
    transition: '4s[3/2]1 - 4p[5/2]2',
    originNote: 'Strong Argon I 4s–4p line at 842.465 nm (observed at 11869.8 cm⁻¹ in 532nm_1800.lns from trace Argon)',
  },
  {
    id: 'ar1-852.14',
    species: 'Ar I',
    diffractionOrder: 1,
    trueWavelengthAirNm: 852.144,
    trueWavenumberAirCm1: 11735.11,
    trueWavenumberVacCm1: airNmToVacuumWavenumberCm1(852.144),
    apparentWavelengthAirNm: 852.144,
    apparentWavenumberAirCm1: 11735.11,
    relativeIntensity: 850,
    transition: '4s\'[1/2]1 - 4p\'[3/2]2',
    originNote: 'Strong Argon I 4s–4p line at 852.144 nm (observed at 11734.9 cm⁻¹ in 532nm_1800.lns from trace Argon)',
  },
  {
    id: 'ar1-912.30',
    species: 'Ar I',
    diffractionOrder: 1,
    trueWavelengthAirNm: 912.297,
    trueWavenumberAirCm1: 10961.34,
    trueWavenumberVacCm1: airNmToVacuumWavenumberCm1(912.297),
    apparentWavelengthAirNm: 912.297,
    apparentWavenumberAirCm1: 10961.34,
    relativeIntensity: 920,
    transition: '4s[3/2]2 - 4p[1/2]1',
    originNote: 'Strong Argon I 4s–4p line at 912.297 nm (observed at 10961.35 cm⁻¹ in Virsa_785_1500.lns and 10961.1 cm⁻¹ in 532nm_1800.lns from trace Argon)',
  },
  {
    id: 'ar1-965.78',
    species: 'Ar I',
    diffractionOrder: 1,
    trueWavelengthAirNm: 965.779,
    trueWavenumberAirCm1: 10354.34,
    trueWavenumberVacCm1: airNmToVacuumWavenumberCm1(965.779),
    apparentWavelengthAirNm: 965.779,
    apparentWavenumberAirCm1: 10354.34,
    relativeIntensity: 870,
    transition: '4s[3/2]1 - 4p[1/2]1',
    originNote: 'Strong NIR Argon I 4s–4p line at 965.779 nm (observed at 10354.34 cm⁻¹, intensity 3,900 in Virsa_785_1500.lns from Penning Argon)',
  },
  {
    id: 'ar1-978.45',
    species: 'Ar I',
    diffractionOrder: 1,
    trueWavelengthAirNm: 978.450,
    trueWavenumberAirCm1: 10220.24,
    trueWavenumberVacCm1: airNmToVacuumWavenumberCm1(978.450),
    apparentWavelengthAirNm: 978.450,
    apparentWavenumberAirCm1: 10220.24,
    relativeIntensity: 540,
    transition: '4s\'[1/2]1 - 4p[5/2]2',
    originNote: 'NIR Argon I 4s–4p line at 978.450 nm (observed at 10220.24 cm⁻¹, intensity 150 in Virsa_785_1500.lns from Penning Argon)',
  },
  {
    id: 'ar1-1047.01',
    species: 'Ar I',
    diffractionOrder: 1,
    trueWavelengthAirNm: 1047.005,
    trueWavenumberAirCm1: 9551.05,
    trueWavenumberVacCm1: airNmToVacuumWavenumberCm1(1047.005),
    apparentWavelengthAirNm: 1047.005,
    apparentWavenumberAirCm1: 9551.05,
    relativeIntensity: 420,
    transition: '4s[3/2]1 - 4p[1/2]0',
    originNote: 'Deep-NIR Argon I 4s–4p line at 1047.005 nm near Silicon CCD cutoff (observed at 9551.05 cm⁻¹, intensity 50 in Virsa_785_1500.lns from Penning Argon)',
  },
  // Mercury I (Hg I) ambient fluorescent lamp / Hg-Ar lamp lines
  {
    id: 'hg1-546.07',
    species: 'Hg I',
    diffractionOrder: 1,
    trueWavelengthAirNm: 546.074,
    trueWavenumberAirCm1: 18312.54,
    trueWavenumberVacCm1: airNmToVacuumWavenumberCm1(546.074),
    apparentWavelengthAirNm: 546.074,
    apparentWavenumberAirCm1: 18312.54,
    relativeIntensity: 980,
    transition: '6s6p 3P2 - 6s7s 3S1',
    originNote: 'Mercury I green line (546.074 nm) — room fluorescent light contamination or Hg-Ar source',
  },
  {
    id: 'hg1-576.96',
    species: 'Hg I',
    diffractionOrder: 1,
    trueWavelengthAirNm: 576.960,
    trueWavenumberAirCm1: 17332.22,
    trueWavenumberVacCm1: airNmToVacuumWavenumberCm1(576.960),
    apparentWavelengthAirNm: 576.960,
    apparentWavenumberAirCm1: 17332.22,
    relativeIntensity: 860,
    transition: '6s6p 1P1 - 6s6d 3D2',
    originNote: 'Mercury I yellow doublet line (576.960 nm)',
  },
  {
    id: 'hg1-579.07',
    species: 'Hg I',
    diffractionOrder: 1,
    trueWavelengthAirNm: 579.066,
    trueWavenumberAirCm1: 17269.19,
    trueWavenumberVacCm1: airNmToVacuumWavenumberCm1(579.066),
    apparentWavelengthAirNm: 579.066,
    apparentWavenumberAirCm1: 17269.19,
    relativeIntensity: 880,
    transition: '6s6p 1P1 - 6s6d 1D2',
    originNote: 'Mercury I yellow doublet line (579.066 nm)',
  },
  {
    id: 'hg1-435.83',
    species: 'Hg I',
    diffractionOrder: 1,
    trueWavelengthAirNm: 435.833,
    trueWavenumberAirCm1: 22944.57,
    trueWavenumberVacCm1: airNmToVacuumWavenumberCm1(435.833),
    apparentWavelengthAirNm: 435.833,
    apparentWavenumberAirCm1: 22944.57,
    relativeIntensity: 950,
    transition: '6s6p 3P1 - 6s7s 3S1',
    originNote: 'Mercury I blue line (435.833 nm) — ambient fluorescent lamp or Hg-Ar lamp',
  },
];

/**
 * Higher-order diffraction reference catalog (m = 2 Second Order & m = 3 Third Order).
 * According to the grating equation m * lambda = d * (sin(alpha) + sin(beta)),
 * a UV/Violet emission line of true wavelength lambda_true (wavenumber nu_true)
 * diffracted in order m appears at apparent first-order wavelength m * lambda_true
 * and apparent first-order wavenumber nu_app = nu_true / m.
 */
export const HIGHER_ORDER_DIFFRACTION_CATALOG: ImpurityOrHigherOrderReference[] = [
  // 2nd-Order (m = 2) UV Neon I & Neon II lines appearing in the 13,400–15,100 cm^-1 window
  {
    id: 'ne2-m2-332.37',
    species: 'Ne II',
    diffractionOrder: 2,
    trueWavelengthAirNm: 332.374,
    trueWavenumberAirCm1: 30086.59,
    trueWavenumberVacCm1: airNmToVacuumWavenumberCm1(332.374),
    apparentWavelengthAirNm: 664.748,
    apparentWavenumberAirCm1: 15043.30,
    relativeIntensity: 450,
    transition: '3s 2P3/2 - 3p 2P3/2 (m=2)',
    originNote: '2nd-order diffraction (m=2) of Ne II 332.374 nm UV line (30086.6 cm⁻¹ ÷ 2 = 15043.30 cm⁻¹)',
    uvAttenuatedInGlassOrFibre: true,
  },
  {
    id: 'ne1-m2-336.99',
    species: 'Ne I',
    diffractionOrder: 2,
    trueWavelengthAirNm: 336.991,
    trueWavenumberAirCm1: 29674.38,
    trueWavenumberVacCm1: airNmToVacuumWavenumberCm1(336.991),
    apparentWavelengthAirNm: 673.982,
    apparentWavenumberAirCm1: 14837.19,
    relativeIntensity: 480,
    transition: '3s[3/2]2 - 4p[1/2]1 (m=2)',
    originNote: '2nd-order diffraction (m=2) of Ne I 336.991 nm UV line (29674.4 cm⁻¹ ÷ 2 = 14837.19 cm⁻¹)',
    uvAttenuatedInGlassOrFibre: true,
  },
  {
    id: 'ne2-m2-337.82',
    species: 'Ne II',
    diffractionOrder: 2,
    trueWavelengthAirNm: 337.822,
    trueWavenumberAirCm1: 29601.39,
    trueWavenumberVacCm1: airNmToVacuumWavenumberCm1(337.822),
    apparentWavelengthAirNm: 675.644,
    apparentWavenumberAirCm1: 14800.69,
    relativeIntensity: 420,
    transition: '3s 2P1/2 - 3p 2P1/2 (m=2)',
    originNote: '2nd-order diffraction (m=2) of Ne II 337.822 nm UV line (29601.4 cm⁻¹ ÷ 2 = 14800.69 cm⁻¹)',
    uvAttenuatedInGlassOrFibre: true,
  },
  {
    id: 'ne1-m2-341.79',
    species: 'Ne I',
    diffractionOrder: 2,
    trueWavelengthAirNm: 341.790,
    trueWavenumberAirCm1: 29257.73,
    trueWavenumberVacCm1: airNmToVacuumWavenumberCm1(341.790),
    apparentWavelengthAirNm: 683.580,
    apparentWavenumberAirCm1: 14628.87,
    relativeIntensity: 550,
    transition: '3s[3/2]1 - 4p\'[3/2]2 (m=2)',
    originNote: '2nd-order diffraction (m=2) of Ne I 341.790 nm UV line (29257.7 cm⁻¹ ÷ 2 = 14628.87 cm⁻¹)',
    uvAttenuatedInGlassOrFibre: true,
  },
  {
    id: 'ne1-m2-344.77',
    species: 'Ne I',
    diffractionOrder: 2,
    trueWavelengthAirNm: 344.770,
    trueWavenumberAirCm1: 29004.84,
    trueWavenumberVacCm1: airNmToVacuumWavenumberCm1(344.770),
    apparentWavelengthAirNm: 689.540,
    apparentWavenumberAirCm1: 14502.42,
    relativeIntensity: 620,
    transition: '3s[3/2]2 - 4p[3/2]2 (m=2)',
    originNote: '2nd-order diffraction (m=2) of Ne I 344.770 nm UV line (29004.8 cm⁻¹ ÷ 2 = 14502.42 cm⁻¹)',
    uvAttenuatedInGlassOrFibre: true,
  },
  {
    id: 'ne1-m2-345.42',
    species: 'Ne I',
    diffractionOrder: 2,
    trueWavelengthAirNm: 345.419,
    trueWavenumberAirCm1: 28950.35,
    trueWavenumberVacCm1: airNmToVacuumWavenumberCm1(345.419),
    apparentWavelengthAirNm: 690.838,
    apparentWavenumberAirCm1: 14475.17,
    relativeIntensity: 580,
    transition: '3s[3/2]1 - 4p[1/2]0 (m=2)',
    originNote: '2nd-order diffraction (m=2) of Ne I 345.419 nm UV line (28950.4 cm⁻¹ ÷ 2 = 14475.17 cm⁻¹)',
    uvAttenuatedInGlassOrFibre: true,
  },
  {
    id: 'ne1-m2-346.66',
    species: 'Ne I',
    diffractionOrder: 2,
    trueWavelengthAirNm: 346.658,
    trueWavenumberAirCm1: 28846.88,
    trueWavenumberVacCm1: airNmToVacuumWavenumberCm1(346.658),
    apparentWavelengthAirNm: 693.316,
    apparentWavenumberAirCm1: 14423.44,
    relativeIntensity: 560,
    transition: '3s\'[1/2]0 - 4p\'[3/2]1 (m=2)',
    originNote: '2nd-order diffraction (m=2) of Ne I 346.658 nm UV line (28846.9 cm⁻¹ ÷ 2 = 14423.44 cm⁻¹)',
    uvAttenuatedInGlassOrFibre: true,
  },
  {
    id: 'ne1-m2-347.26',
    species: 'Ne I',
    diffractionOrder: 2,
    trueWavelengthAirNm: 347.257,
    trueWavenumberAirCm1: 28797.11,
    trueWavenumberVacCm1: airNmToVacuumWavenumberCm1(347.257),
    apparentWavelengthAirNm: 694.514,
    apparentWavenumberAirCm1: 14398.56,
    relativeIntensity: 680,
    transition: '3s[3/2]2 - 4p[5/2]3 (m=2)',
    originNote: '2nd-order diffraction (m=2) of Ne I 347.257 nm UV line (28797.1 cm⁻¹ ÷ 2 = 14398.56 cm⁻¹)',
    uvAttenuatedInGlassOrFibre: true,
  },
  {
    id: 'ne1-m2-352.05',
    species: 'Ne I',
    diffractionOrder: 2,
    trueWavelengthAirNm: 352.047,
    trueWavenumberAirCm1: 28405.30,
    trueWavenumberVacCm1: airNmToVacuumWavenumberCm1(352.047),
    apparentWavelengthAirNm: 704.094,
    apparentWavenumberAirCm1: 14202.65,
    relativeIntensity: 750,
    transition: '3s\'[1/2]1 - 4p\'[1/2]0 (m=2)',
    originNote: '2nd-order diffraction (m=2) of strong Ne I 352.047 nm UV line (28405.3 cm⁻¹ ÷ 2 = 14202.65 cm⁻¹)',
  },
  {
    id: 'ne1-m2-359.35',
    species: 'Ne I',
    diffractionOrder: 2,
    trueWavelengthAirNm: 359.353,
    trueWavenumberAirCm1: 27827.81,
    trueWavenumberVacCm1: airNmToVacuumWavenumberCm1(359.353),
    apparentWavelengthAirNm: 718.706,
    apparentWavenumberAirCm1: 13913.90,
    relativeIntensity: 640,
    transition: '3s\'[1/2]1 - 4p\'[3/2]2 (m=2)',
    originNote: '2nd-order diffraction (m=2) of Ne I 359.353 nm UV line (27827.8 cm⁻¹ ÷ 2 = 13913.90 cm⁻¹)',
  },
  // 2nd-Order (m = 2) and 3rd-Order (m = 3) Mercury I UV lines
  {
    id: 'hg1-m2-253.65',
    species: 'Hg I',
    diffractionOrder: 2,
    trueWavelengthAirNm: 253.652,
    trueWavenumberAirCm1: 39424.10,
    trueWavenumberVacCm1: airNmToVacuumWavenumberCm1(253.652),
    apparentWavelengthAirNm: 507.304,
    apparentWavenumberAirCm1: 19712.05,
    relativeIntensity: 990,
    transition: '6s2 1S0 - 6s6p 3P1 (m=2)',
    originNote: '2nd-order diffraction (m=2) of Hg I 253.652 nm deep-UV resonance line (39424.1 cm⁻¹ ÷ 2 = 19712.05 cm⁻¹)',
    uvAttenuatedInGlassOrFibre: true,
  },
  {
    id: 'hg1-m3-253.65',
    species: 'Hg I',
    diffractionOrder: 3,
    trueWavelengthAirNm: 253.652,
    trueWavenumberAirCm1: 39424.10,
    trueWavenumberVacCm1: airNmToVacuumWavenumberCm1(253.652),
    apparentWavelengthAirNm: 760.956,
    apparentWavenumberAirCm1: 13141.37,
    relativeIntensity: 650,
    transition: '6s2 1S0 - 6s6p 3P1 (m=3)',
    originNote: '3rd-order diffraction (m=3) of Hg I 253.652 nm deep-UV resonance line (39424.1 cm⁻¹ ÷ 3 = 13141.37 cm⁻¹)',
    uvAttenuatedInGlassOrFibre: true,
  },
  {
    id: 'hg1-m2-296.73',
    species: 'Hg I',
    diffractionOrder: 2,
    trueWavelengthAirNm: 296.728,
    trueWavenumberAirCm1: 33700.90,
    trueWavenumberVacCm1: airNmToVacuumWavenumberCm1(296.728),
    apparentWavelengthAirNm: 593.456,
    apparentWavenumberAirCm1: 16850.45,
    relativeIntensity: 780,
    transition: '6s6p 3P0 - 6s6d 3D1 (m=2)',
    originNote: '2nd-order diffraction (m=2) of Hg I 296.728 nm UV line (33700.9 cm⁻¹ ÷ 2 = 16850.45 cm⁻¹)',
    uvAttenuatedInGlassOrFibre: true,
  },
  {
    id: 'hg1-m2-312.57',
    species: 'Hg I',
    diffractionOrder: 2,
    trueWavelengthAirNm: 312.567,
    trueWavenumberAirCm1: 31993.14,
    trueWavenumberVacCm1: airNmToVacuumWavenumberCm1(312.567),
    apparentWavelengthAirNm: 625.134,
    apparentWavenumberAirCm1: 15996.57,
    relativeIntensity: 840,
    transition: '6s6p 3P1 - 6s6d 3D2 (m=2)',
    originNote: '2nd-order diffraction (m=2) of Hg I 312.567 nm UV line (31993.1 cm⁻¹ ÷ 2 = 15996.57 cm⁻¹)',
    uvAttenuatedInGlassOrFibre: true,
  },
  {
    id: 'hg1-m2-365.02',
    species: 'Hg I',
    diffractionOrder: 2,
    trueWavelengthAirNm: 365.015,
    trueWavenumberAirCm1: 27396.13,
    trueWavenumberVacCm1: airNmToVacuumWavenumberCm1(365.015),
    apparentWavelengthAirNm: 730.030,
    apparentWavenumberAirCm1: 13698.07,
    relativeIntensity: 950,
    transition: '6s6p 3P2 - 6s6d 3D3 (m=2)',
    originNote: '2nd-order diffraction (m=2) of Hg I 365.015 nm near-UV line (27396.1 cm⁻¹ ÷ 2 = 13698.07 cm⁻¹)',
  },
  {
    id: 'hg1-m3-312.57',
    species: 'Hg I',
    diffractionOrder: 3,
    trueWavelengthAirNm: 312.567,
    trueWavenumberAirCm1: 31993.14,
    trueWavenumberVacCm1: airNmToVacuumWavenumberCm1(312.567),
    apparentWavelengthAirNm: 937.701,
    apparentWavenumberAirCm1: 10664.38,
    relativeIntensity: 520,
    transition: '6s6p 3P1 - 6s6d 3D2 (m=3)',
    originNote: '3rd-order diffraction (m=3) of Hg I 312.567 nm UV line (31993.1 cm⁻¹ ÷ 3 = 10664.38 cm⁻¹)',
    uvAttenuatedInGlassOrFibre: true,
  },
];

/**
 * Set of wavenumbers in NEON_CATALOG (from 532nm_1800.lns) that physically originate
 * from trace Argon I (Ar I) Penning gas inside commercial Neon indicator bulbs.
 * In the 14,430–18,760 cm^-1 range (e.g. Virsa 532nm / 2400 l/mm 29 lines), all lines
 * are authentic 1st-order Ne I except 14808.4 cm^-1 (Ar I 675.283 nm) in the 1800 .lns file
 * and the strong NIR Ar I 4s-4p lines below 13,600 cm^-1.
 */
const PENNING_ARGON_LINES_IN_LNS_CM1 = [
  14808.4, // Ar I 675.283 nm (14808.61 cm^-1 air)
  13542.7, // Ar I 738.398 nm (13542.83 cm^-1 air)
  13326.3, // Ar I 750.387 nm (13326.46 cm^-1 air)
  13307.2, // Ar I 751.465 nm (13307.34 cm^-1 air)
  13097.2, // Ar I 763.511 nm (13097.39 cm^-1 air)
  12946.4, // Ar I 772.376 nm (12947.06 cm^-1 air)
  12581.4, // Ar I 794.818 nm (12581.49 cm^-1 air; 12581.50 in Virsa_785_1500.lns)
  12490.2, // Ar I 800.616 nm (12490.38 cm^-1 air)
  12476.7, // Ar I 801.479 nm (12476.93 cm^-1 air)
  12339.8, // Ar I 810.369 nm (12340.06 cm^-1 air; 12340.05 in Virsa_785_1500.lns)
  12322.2, // Ar I 811.531 nm (12322.39 cm^-1 air; 12322.39 in Virsa_785_1500.lns)
  11893.14, // Ar I 840.821 nm (11893.14 cm^-1 air in Virsa_785_1500.lns)
  11869.8, // Ar I 842.465 nm (11869.93 cm^-1 air)
  11734.9, // Ar I 852.144 nm (11735.11 cm^-1 air)
  10961.1, // Ar I 912.297 nm (10961.34 cm^-1 air; 10961.35 in Virsa_785_1500.lns)
  10354.34, // Ar I 965.779 nm (10354.34 cm^-1 air in Virsa_785_1500.lns)
  10220.24, // Ar I 978.450 nm (10220.24 cm^-1 air in Virsa_785_1500.lns)
  9551.05, // Ar I 1047.005 nm (9551.05 cm^-1 air in Virsa_785_1500.lns)
];

/**
 * Analyzes a single detected spectral line (wavenumber in cm^-1 and optional intensity)
 * to determine whether it is:
 * 1) An authentic 1st-order Neon I (Ne I, m=1) emission line,
 * 2) A 1st-order Ne I line that coincidentally shares its wavelength with a weak trace-gas line (e.g. 17835.71 cm^-1),
 * 3) A trace gas impurity line (e.g. Argon I Penning gas additive in Neon bulbs, or Hg I ambient leak),
 * 4) A higher-order diffraction ghost peak (2nd order m=2 at 2*nu_obs or 3rd order m=3 at 3*nu_obs), or
 * 5) An unidentified peak.
 */
export function analyzeSpectralLineOrigin(
  wavenumberCm1: number,
  declaredIntensity?: number
): SpectralLineOriginAnalysis {
  const observedWavelengthAirNm = Number((1e7 / Math.max(100, wavenumberCm1)).toFixed(3));

  // 1. Check if this wavenumber is one of the known Penning Argon I lines present in extended .lns scans
  const isKnownPenningAr = PENNING_ARGON_LINES_IN_LNS_CM1.some(
    (arNu) => Math.abs(arNu - wavenumberCm1) <= 0.85
  );
  if (isKnownPenningAr) {
    const arRef =
      TRACE_GAS_IMPURITY_CATALOG.find(
        (ref) => Math.abs(ref.apparentWavenumberAirCm1 - wavenumberCm1) <= 1.5
      ) || null;
    if (arRef) {
      const deltaAir = Number(
        (wavenumberCm1 - arRef.trueWavenumberAirCm1).toFixed(2)
      );
      const deltaVac = Number(
        (wavenumberCm1 - arRef.trueWavenumberVacCm1).toFixed(2)
      );
      return {
        observedWavenumberCm1: wavenumberCm1,
        observedWavelengthAirNm,
        declaredIntensity,
        classification: 'trace_gas_impurity',
        isFlaggedAnomaly: true,
        flagSeverity: 'warning',
        diffractionOrder: 1,
        primarySpecies: arRef.species,
        badgeLabel: `Trace ${arRef.species} (${arRef.trueWavelengthAirNm.toFixed(2)} nm)`,
        nistWavelengthAirNm: arRef.trueWavelengthAirNm,
        nistWavenumberAirCm1: arRef.trueWavenumberAirCm1,
        nistWavenumberVacCm1: arRef.trueWavenumberVacCm1,
        deltaFromNistAirCm1: deltaAir,
        deltaFromNistVacCm1: deltaVac,
        matchedNe1Line: null,
        matchedImpurityOrOrderRef: arRef,
        explanation: `${arRef.originNote}. NIST Air (20 °C): ${arRef.trueWavenumberAirCm1.toFixed(2)} cm⁻¹ (Δ=${deltaAir >= 0 ? '+' : ''}${deltaAir.toFixed(2)}), Vacuum: ${arRef.trueWavenumberVacCm1.toFixed(2)} cm⁻¹.`,
      };
    }
  }

  // 2. Find closest authentic 1st-order Neon I line in NEON_CATALOG (excluding known Penning Ar entries)
  let closestNe1: NeonLine | null = null;
  let minNe1Diff = Infinity;
  for (const cat of NEON_CATALOG) {
    if (
      PENNING_ARGON_LINES_IN_LNS_CM1.some(
        (arNu) => Math.abs(arNu - cat.wavenumber) <= 0.6
      )
    ) {
      continue;
    }
    const diff = Math.abs(cat.wavenumber - wavenumberCm1);
    if (diff < minNe1Diff) {
      minNe1Diff = diff;
      closestNe1 = cat;
    }
  }

  // 3. Check closest Trace Gas Impurity (Ar I, Hg I)
  let closestImpurity: ImpurityOrHigherOrderReference | null = null;
  let minImpurityDiff = Infinity;
  for (const imp of TRACE_GAS_IMPURITY_CATALOG) {
    const diff = Math.abs(imp.apparentWavenumberAirCm1 - wavenumberCm1);
    if (diff < minImpurityDiff) {
      minImpurityDiff = diff;
      closestImpurity = imp;
    }
  }

  // 4. Check Higher-Order Diffraction Catalog (m = 2 and m = 3)
  let closestHigherOrder: ImpurityOrHigherOrderReference | null = null;
  let minHigherOrderDiff = Infinity;
  for (const ho of HIGHER_ORDER_DIFFRACTION_CATALOG) {
    const diff = Math.abs(ho.apparentWavenumberAirCm1 - wavenumberCm1);
    if (diff < minHigherOrderDiff) {
      minHigherOrderDiff = diff;
      closestHigherOrder = ho;
    }
  }

  // Also check dynamic 2nd-order (2 * nu) or 3rd-order (3 * nu) of any high-wavenumber line in NEON_CATALOG (>20,000 cm^-1)
  if (minHigherOrderDiff > 1.8) {
    for (const order of [2, 3] as const) {
      const trueNuCandidate = wavenumberCm1 * order;
      const uvMatch = NEON_CATALOG.find(
        (l) => l.wavenumber >= 21500 && Math.abs(l.wavenumber - trueNuCandidate) <= 2.2 * order
      );
      if (uvMatch) {
        const appNu = Number((uvMatch.wavenumber / order).toFixed(2));
        const appNm = Number((uvMatch.wavelengthAirNm * order).toFixed(3));
        const diff = Math.abs(appNu - wavenumberCm1);
        if (diff < minHigherOrderDiff) {
          minHigherOrderDiff = diff;
          closestHigherOrder = {
            id: `dyn-m${order}-${uvMatch.id}`,
            species: 'Ne I',
            diffractionOrder: order,
            trueWavelengthAirNm: uvMatch.wavelengthAirNm,
            trueWavenumberAirCm1: uvMatch.wavenumber,
            trueWavenumberVacCm1: airNmToVacuumWavenumberCm1(uvMatch.wavelengthAirNm),
            apparentWavelengthAirNm: appNm,
            apparentWavenumberAirCm1: appNu,
            relativeIntensity: uvMatch.relativeIntensity,
            transition: `${uvMatch.transition} (m=${order})`,
            originNote: `${order === 2 ? '2nd' : '3rd'}-order diffraction (m=${order}) of Ne I ${uvMatch.wavelengthAirNm.toFixed(3)} nm line (${uvMatch.wavenumber.toFixed(2)} cm⁻¹ ÷ ${order} = ${appNu.toFixed(2)} cm⁻¹)`,
          };
        }
      }
    }
  }

  // Case A: Matches an authentic 1st-order Neon I line within ±1.5 cm^-1
  if (closestNe1 && minNe1Diff <= 1.5) {
    const nistAirCm1 = airNmToAirWavenumberCm1(closestNe1.wavelengthAirNm);
    const nistVacCm1 = airNmToVacuumWavenumberCm1(closestNe1.wavelengthAirNm);
    const deltaAir = Number((wavenumberCm1 - nistAirCm1).toFixed(2));
    const deltaVac = Number((wavenumberCm1 - nistVacCm1).toFixed(2));

    // Check if there is a coincidental overlap with a trace Ar I line (e.g. 17835.71 cm^-1 = 560.673 nm)
    if (closestImpurity && minImpurityDiff <= 0.8) {
      return {
        observedWavenumberCm1: wavenumberCm1,
        observedWavelengthAirNm,
        declaredIntensity,
        classification: 'ne1_with_coincidental_overlap',
        isFlaggedAnomaly: false,
        flagSeverity: 'info',
        diffractionOrder: 1,
        primarySpecies: 'Ne I',
        badgeLabel: '1st-Order Ne I (Ar I Overlap)',
        nistWavelengthAirNm: closestNe1.wavelengthAirNm,
        nistWavenumberAirCm1: nistAirCm1,
        nistWavenumberVacCm1: nistVacCm1,
        deltaFromNistAirCm1: deltaAir,
        deltaFromNistVacCm1: deltaVac,
        matchedNe1Line: closestNe1,
        matchedImpurityOrOrderRef: closestImpurity,
        explanation: `Authentic 1st-order Ne I (${closestNe1.wavelengthAirNm.toFixed(3)} nm, ${closestNe1.transition}). Coincidentally overlaps weak ${closestImpurity.species} ${closestImpurity.trueWavelengthAirNm.toFixed(3)} nm, but dominated by Ne I emission.`,
      };
    }

    return {
      observedWavenumberCm1: wavenumberCm1,
      observedWavelengthAirNm,
      declaredIntensity,
      classification: 'authentic_ne1_first_order',
      isFlaggedAnomaly: false,
      flagSeverity: 'nominal',
      diffractionOrder: 1,
      primarySpecies: 'Ne I',
      badgeLabel: '1st-Order Ne I (m=1)',
      nistWavelengthAirNm: closestNe1.wavelengthAirNm,
      nistWavenumberAirCm1: nistAirCm1,
      nistWavenumberVacCm1: nistVacCm1,
      deltaFromNistAirCm1: deltaAir,
      deltaFromNistVacCm1: deltaVac,
      matchedNe1Line: closestNe1,
      matchedImpurityOrOrderRef: null,
      explanation: `Verified 1st-order Ne I (${closestNe1.wavelengthAirNm.toFixed(3)} nm, ${closestNe1.transition}). NIST Air (20 °C): ${nistAirCm1.toFixed(2)} cm⁻¹ (Δ=${deltaAir >= 0 ? '+' : ''}${deltaAir.toFixed(2)}), Vacuum: ${nistVacCm1.toFixed(2)} cm⁻¹ (Δ=${deltaVac >= 0 ? '+' : ''}${deltaVac.toFixed(2)}).`,
    };
  }

  // Case B: Matches a 2nd-Order (m=2) or 3rd-Order (m=3) Diffraction Peak within ±2.2 cm^-1
  if (closestHigherOrder && minHigherOrderDiff <= 2.2) {
    const is2nd = closestHigherOrder.diffractionOrder === 2;
    const deltaAir = Number(
      (wavenumberCm1 - closestHigherOrder.apparentWavenumberAirCm1).toFixed(2)
    );
    return {
      observedWavenumberCm1: wavenumberCm1,
      observedWavelengthAirNm,
      declaredIntensity,
      classification: is2nd
        ? 'second_order_diffraction'
        : 'third_order_diffraction',
      isFlaggedAnomaly: true,
      flagSeverity: 'critical',
      diffractionOrder: closestHigherOrder.diffractionOrder,
      primarySpecies: closestHigherOrder.species,
      badgeLabel: `${is2nd ? '2nd' : '3rd'}-Order (m=${closestHigherOrder.diffractionOrder}) ${closestHigherOrder.species}`,
      nistWavelengthAirNm: closestHigherOrder.trueWavelengthAirNm,
      nistWavenumberAirCm1: closestHigherOrder.apparentWavenumberAirCm1,
      nistWavenumberVacCm1: Number(
        (
          closestHigherOrder.trueWavenumberVacCm1 /
          closestHigherOrder.diffractionOrder
        ).toFixed(2)
      ),
      deltaFromNistAirCm1: deltaAir,
      deltaFromNistVacCm1: null,
      matchedNe1Line: null,
      matchedImpurityOrOrderRef: closestHigherOrder,
      explanation: `${closestHigherOrder.originNote} (Apparent λ = ${closestHigherOrder.apparentWavelengthAirNm.toFixed(3)} nm, Δ=${deltaAir >= 0 ? '+' : ''}${deltaAir.toFixed(2)} cm⁻¹). Exclude from 1st-order polynomial fit or insert long-pass order-sorting filter.`,
    };
  }

  // Case C: Matches a Trace Gas Impurity (Ar I, Hg I, Kr I) within ±2.2 cm^-1
  if (closestImpurity && minImpurityDiff <= 2.2) {
    const deltaAir = Number(
      (wavenumberCm1 - closestImpurity.trueWavenumberAirCm1).toFixed(2)
    );
    const deltaVac = Number(
      (wavenumberCm1 - closestImpurity.trueWavenumberVacCm1).toFixed(2)
    );
    return {
      observedWavenumberCm1: wavenumberCm1,
      observedWavelengthAirNm,
      declaredIntensity,
      classification: 'trace_gas_impurity',
      isFlaggedAnomaly: true,
      flagSeverity: 'warning',
      diffractionOrder: 1,
      primarySpecies: closestImpurity.species,
      badgeLabel: `Trace ${closestImpurity.species} (${closestImpurity.trueWavelengthAirNm.toFixed(2)} nm)`,
      nistWavelengthAirNm: closestImpurity.trueWavelengthAirNm,
      nistWavenumberAirCm1: closestImpurity.trueWavenumberAirCm1,
      nistWavenumberVacCm1: closestImpurity.trueWavenumberVacCm1,
      deltaFromNistAirCm1: deltaAir,
      deltaFromNistVacCm1: deltaVac,
      matchedNe1Line: null,
      matchedImpurityOrOrderRef: closestImpurity,
      explanation: `${closestImpurity.originNote}. NIST Air (20 °C): ${closestImpurity.trueWavenumberAirCm1.toFixed(2)} cm⁻¹ (Δ=${deltaAir >= 0 ? '+' : ''}${deltaAir.toFixed(2)}), Vacuum: ${closestImpurity.trueWavenumberVacCm1.toFixed(2)} cm⁻¹.`,
    };
  }

  // Case D: Loose 1st-order Ne I match (±3.5 cm^-1)
  if (closestNe1 && minNe1Diff <= 3.5) {
    const nistAirCm1 = airNmToAirWavenumberCm1(closestNe1.wavelengthAirNm);
    const nistVacCm1 = airNmToVacuumWavenumberCm1(closestNe1.wavelengthAirNm);
    const deltaAir = Number((wavenumberCm1 - nistAirCm1).toFixed(2));
    const deltaVac = Number((wavenumberCm1 - nistVacCm1).toFixed(2));
    return {
      observedWavenumberCm1: wavenumberCm1,
      observedWavelengthAirNm,
      declaredIntensity,
      classification: 'authentic_ne1_first_order',
      isFlaggedAnomaly: false,
      flagSeverity: 'info',
      diffractionOrder: 1,
      primarySpecies: 'Ne I',
      badgeLabel: '1st-Order Ne I (Drifted)',
      nistWavelengthAirNm: closestNe1.wavelengthAirNm,
      nistWavenumberAirCm1: nistAirCm1,
      nistWavenumberVacCm1: nistVacCm1,
      deltaFromNistAirCm1: deltaAir,
      deltaFromNistVacCm1: deltaVac,
      matchedNe1Line: closestNe1,
      matchedImpurityOrOrderRef: null,
      explanation: `Matches 1st-order Ne I (${closestNe1.wavelengthAirNm.toFixed(3)} nm) with ${deltaAir >= 0 ? '+' : ''}${deltaAir.toFixed(2)} cm⁻¹ offset from NIST Air (${nistAirCm1.toFixed(2)} cm⁻¹).`,
    };
  }

  // Case E: Unidentified peak
  return {
    observedWavenumberCm1: wavenumberCm1,
    observedWavelengthAirNm,
    declaredIntensity,
    classification: 'unidentified_peak',
    isFlaggedAnomaly: true,
    flagSeverity: 'critical',
    diffractionOrder: 1,
    primarySpecies: 'Unknown',
    badgeLabel: 'Unidentified Peak',
    nistWavelengthAirNm: null,
    nistWavenumberAirCm1: null,
    nistWavenumberVacCm1: null,
    deltaFromNistAirCm1: null,
    deltaFromNistVacCm1: null,
    matchedNe1Line: null,
    matchedImpurityOrOrderRef: null,
    explanation: `No matching 1st-order Ne I, 2nd/3rd-order diffraction peak, or Ar I / Hg I trace gas line found within ±3.5 cm⁻¹.`,
  };
}

/**
 * Analyzes an entire list of detected spectral lines and summarizes:
 * - Authentic 1st-order Ne I lines (m=1)
 * - Coincidental Ne I / Ar I overlaps
 * - Trace gas impurity lines (Ar I Penning gas, Hg I ambient leak)
 * - Higher-order diffraction ghosts (2nd order m=2, 3rd order m=3)
 */
export function analyzeSpectralLineBatch(
  lines: { wavenumberCm1: number; declaredIntensity?: number }[]
): BatchSpectralOriginSummary {
  const entries = lines.map((l) =>
    analyzeSpectralLineOrigin(l.wavenumberCm1, l.declaredIntensity)
  );

  const authenticNe1Count = entries.filter(
    (e) => e.classification === 'authentic_ne1_first_order'
  ).length;
  const coincidentalOverlapCount = entries.filter(
    (e) => e.classification === 'ne1_with_coincidental_overlap'
  ).length;
  const traceImpurityCount = entries.filter(
    (e) => e.classification === 'trace_gas_impurity'
  ).length;
  const secondOrderCount = entries.filter(
    (e) => e.classification === 'second_order_diffraction'
  ).length;
  const thirdOrderCount = entries.filter(
    (e) => e.classification === 'third_order_diffraction'
  ).length;
  const unidentifiedCount = entries.filter(
    (e) => e.classification === 'unidentified_peak'
  ).length;

  let overallAssessment = '';
  if (entries.length === 0) {
    overallAssessment = 'No spectral lines loaded for diffraction order & trace gas analysis.';
  } else if (
    traceImpurityCount === 0 &&
    secondOrderCount === 0 &&
    thirdOrderCount === 0 &&
    unidentifiedCount === 0
  ) {
    overallAssessment = `All ${entries.length} lines are verified 1st-order (m=1) Neon I atomic transitions (0 higher-order diffraction ghosts, 0 pure Argon/Mercury impurity peaks).${
      coincidentalOverlapCount > 0
        ? ` Note: ${coincidentalOverlapCount} line(s) (e.g. 17835.71 cm⁻¹ / 560.673 nm) coincidentally share wavelength with a weak Ar I transition but are dominated by 1st-order Ne I.`
        : ''
    }`;
  } else {
    const parts: string[] = [];
    if (secondOrderCount > 0 || thirdOrderCount > 0) {
      parts.push(
        `${secondOrderCount} second-order (m=2) and ${thirdOrderCount} third-order (m=3) diffraction peak(s)`
      );
    }
    if (traceImpurityCount > 0) {
      parts.push(
        `${traceImpurityCount} trace gas impurity peak(s) (e.g. Argon I Penning gas additive or Mercury I)`
      );
    }
    if (unidentifiedCount > 0) {
      parts.push(`${unidentifiedCount} unidentified peak(s)`);
    }
    overallAssessment = `Flagged ${parts.join(', ')} out of ${entries.length} total lines (${authenticNe1Count + coincidentalOverlapCount} verified 1st-order Ne I lines).`;
  }

  return {
    totalAnalyzed: entries.length,
    authenticNe1Count,
    coincidentalOverlapCount,
    traceImpurityCount,
    secondOrderCount,
    thirdOrderCount,
    unidentifiedCount,
    entries,
    overallAssessment,
  };
}
