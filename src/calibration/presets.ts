import { CalibrationParameters, solveCalibration } from './physicsEngine';
import { generateCalibrationFileText } from './fileAuditor';

export interface FactoryPreset {
  id: string;
  label: string;
  shortTag: string;
  description: string;
  params: CalibrationParameters;
  sampleFileName: string;
  sampleFileContent: string;
  isFlawedDemo?: boolean;
}

const DEFAULT_BASE_PARAMS: Omit<
  CalibrationParameters,
  'laserNm' | 'gratingLinesPerMm' | 'filterType'
> = {
  spectrograph: 'inVia',
  customRamanMinCm1: 50,
  customRamanMaxCm1: 4000,
  ccdType: 'FDA',
  ccdTotalWidthPx: 1040,
  ccdActiveWidthPx: 1014,
  ccdTotalHeightPx: 256,
  ccdActiveHeightPx: 30,
  ccdDetectionCutoffCm1: 9800,
  enforceCcdCutoff: true,
  targetOccurrencesPerLine: 8,
  targetLineCount: 9,
  minRelativeIntensity: 280,
  manualPclOverrideCm1: null,
};

function makePresetFile(params: CalibrationParameters): string {
  const sol = solveCalibration(params);
  return generateCalibrationFileText(sol);
}

const params532_600: CalibrationParameters = {
  ...DEFAULT_BASE_PARAMS,
  laserNm: 532,
  gratingLinesPerMm: 600,
  filterType: 'standard',
};

const params785_600: CalibrationParameters = {
  ...DEFAULT_BASE_PARAMS,
  laserNm: 785,
  gratingLinesPerMm: 600,
  filterType: 'standard',
  ccdDetectionCutoffCm1: 9800,
  enforceCcdCutoff: true,
};

const params660_1200: CalibrationParameters = {
  ...DEFAULT_BASE_PARAMS,
  laserNm: 660,
  gratingLinesPerMm: 1200,
  filterType: 'standard',
};

const params633_2400: CalibrationParameters = {
  ...DEFAULT_BASE_PARAMS,
  laserNm: 633,
  gratingLinesPerMm: 2400,
  filterType: 'standard',
};

const params633_1800: CalibrationParameters = {
  ...DEFAULT_BASE_PARAMS,
  laserNm: 633,
  gratingLinesPerMm: 1800,
  filterType: 'standard',
};

const params633_1200: CalibrationParameters = {
  ...DEFAULT_BASE_PARAMS,
  laserNm: 633,
  gratingLinesPerMm: 1200,
  filterType: 'standard',
};

const params633_600: CalibrationParameters = {
  ...DEFAULT_BASE_PARAMS,
  laserNm: 633,
  gratingLinesPerMm: 600,
  filterType: 'standard',
};

/**
 * Intentionally flawed 532nm / 600 l/mm calibration file demonstrating the exact
 * engineering failure modes described in the specification:
 * 1) Includes dense central cluster (17976.66, 17835.71, 17678.28, 17484.88, 17347.80)
 *    where 17484.88 and 17347.80 are only 137.08 cm^-1 apart on a 600 l/mm grating
 *    and risk misidentification prior to calibration.
 * 2) Starves the lower wavenumber extreme (14797 - 15500 cm^-1 left empty),
 *    sacrificing polynomial curve fit at the high-Raman-shift end.
 * 3) Uses a 100-step motor increment (~4 occurrences across CCD instead of 8).
 */
const FLAWED_532_600_FILE = `# Uploaded Factory Test File — 532nm 600 l/mm (UNVERIFIED DRAFT)
Spectrograph: inVia
Laser: 532nm
Grating: 600 l/mm
Filter: Standard (50-4000 cm-1)
CCD: FDA
ScanRange: 20450.0 - 13880.0
PCL: 17086.75
MotorStep: 100
# Wavenumber(cm-1)   Intensity   Role
17976.66             480         CAL
17835.71             440         CAL
17678.28             520         CAL
17484.88             490         CAL
17347.80             680         CAL
17228.05             410         CAL
17086.75             1000        PCL
16822.41             820         CAL
`;

export const FACTORY_PRESETS: FactoryPreset[] = [
  {
    id: '532-600-flawed-audit',
    label: '532 nm · 600 l/mm — Issue Audit Demo (Clustered + Confusion Risk)',
    shortTag: '532nm / 600 (Audit Demo)',
    description:
      'Demonstrates detection of the 17484.88 vs 17347.80 cm⁻¹ line confusion hazard, central clustering, missing low-wavenumber extreme anchors, and coarse 100-step motor increment.',
    params: params532_600,
    sampleFileName: '532nm_600lmm_unverified_draft.cal',
    sampleFileContent: FLAWED_532_600_FILE,
    isFlawedDemo: true,
  },
  {
    id: '532-600-std',
    label: '532 nm · 600 l/mm — Standard Filter (50–4000 cm⁻¹)',
    shortTag: '532nm / 600 l/mm',
    description:
      'Abs range 18747–14797 cm⁻¹. Manually offset so Primary Calibration Line (PCL) 17086.75 cm⁻¹ is at 17086.75 cm⁻¹ with evenly dispersed Neon peaks.',
    params: params532_600,
    sampleFileName: '532nm_600lmm_validated.cal',
    sampleFileContent: makePresetFile(params532_600),
  },
  {
    id: '633-2400-std',
    label: '633 nm · 2400 l/mm — Angle-Capped (0–2500 cm⁻¹)',
    shortTag: '633nm / 2400 l/mm',
    description:
      '0–2500 cm⁻¹ Raman shift (capped by high-density grating angle). Abs range 15802.8–13302.8 cm⁻¹, Scan range 16270.6–13089.9 cm⁻¹, 2nd cal line 13353.03 cm⁻¹.',
    params: params633_2400,
    sampleFileName: '633nm_2400lmm_cal.cal',
    sampleFileContent: makePresetFile(params633_2400),
  },
  {
    id: '633-1800-std',
    label: '633 nm · 1800 l/mm — Standard Filter (0–4000 cm⁻¹)',
    shortTag: '633nm / 1800 l/mm',
    description:
      '0–4000 cm⁻¹ Raman shift. Abs range 15802.8–11802.8 cm⁻¹, Scan range 16534.4–11497.5 cm⁻¹, PCL 13801.72 cm⁻¹, 2nd cal line 13353.03 cm⁻¹.',
    params: params633_1800,
    sampleFileName: '633nm_1800lmm_cal.cal',
    sampleFileContent: makePresetFile(params633_1800),
  },
  {
    id: '633-1200-std',
    label: '633 nm · 1200 l/mm — Standard Filter (0–4000 cm⁻¹)',
    shortTag: '633nm / 1200 l/mm',
    description:
      '0–4000 cm⁻¹ Raman shift. Abs range 15802.8–11802.8 cm⁻¹, Scan range 16992.2–11257.7 cm⁻¹.',
    params: params633_1200,
    sampleFileName: '633nm_1200lmm_cal.cal',
    sampleFileContent: makePresetFile(params633_1200),
  },
  {
    id: '633-600-std',
    label: '633 nm · 600 l/mm — Standard Filter (0–4000 cm⁻¹)',
    shortTag: '633nm / 600 l/mm',
    description:
      '0–4000 cm⁻¹ Raman shift. Abs range 15802.8–11802.8 cm⁻¹, Scan range 17800.0–10821.0 cm⁻¹.',
    params: params633_600,
    sampleFileName: '633nm_600lmm_cal.cal',
    sampleFileContent: makePresetFile(params633_600),
  },
  {
    id: '785-600-std',
    label: '785 nm · 600 l/mm — CCD-Capped (50–3500 cm⁻¹)',
    shortTag: '785nm / 600 l/mm',
    description:
      '50–3500 cm⁻¹ Raman shift (capped by Silicon CCD detection limit around ~9800 cm⁻¹). Abs range 12689–9239 cm⁻¹, Scan range 13100–8700 cm⁻¹.',
    params: params785_600,
    sampleFileName: '785nm_600lmm_cal.cal',
    sampleFileContent: makePresetFile(params785_600),
  },
  {
    id: '660-1200-std',
    label: '660 nm · 1200 l/mm — Standard Filter (0–4000 cm⁻¹)',
    shortTag: '660nm / 1200 l/mm',
    description:
      'Abs range 15151.52–11151.52 cm⁻¹, Centre 13151.52 cm⁻¹, Primary Calibration Line (PCL) at 13151.64 cm⁻¹.',
    params: params660_1200,
    sampleFileName: '660nm_1200lmm_cal.cal',
    sampleFileContent: makePresetFile(params660_1200),
  },
];
