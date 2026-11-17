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

const params532_1800: CalibrationParameters = {
  ...DEFAULT_BASE_PARAMS,
  laserNm: 532,
  gratingLinesPerMm: 1800,
  filterType: 'standard',
};

const params532_1800_lns: CalibrationParameters = {
  ...DEFAULT_BASE_PARAMS,
  laserNm: 532,
  gratingLinesPerMm: 1800,
  filterType: 'rpl_pl',
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

const params405_2400: CalibrationParameters = {
  ...DEFAULT_BASE_PARAMS,
  laserNm: 405,
  gratingLinesPerMm: 2400,
  filterType: 'standard',
};

const params457_1500: CalibrationParameters = {
  ...DEFAULT_BASE_PARAMS,
  laserNm: 457,
  gratingLinesPerMm: 1500,
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

const EMPIRICAL_532_1800_LNS_FILE = `10 Seconds
18758.990\t0 (Not visible with 1800 grating, on FDA camera with visible lenses)
18516.592\t76439
18403.8\t\t383
18343.06 0\t78
18353.5\t\t170
17976.668 \t1014
17835.71 0\t183
17678.280\t3707

1 Second
17484.887\t178
17347.803\t2574
17228.0\t\t453
17181.85\t1524

0.5 Seconds
17086.750\t360086
17001.3\t\t52340
16821.327\t57789
16734.7\t\t37735
16583.756\t17933
16462.700\t59327
16403.761\t92605

1 second
16278.525\t371012
16224.2\t\t107849
16084.201\t259375
15957.884\t227768
15860.7\t\t47177
15666.635\t324699
15619.514\t468176
15369.180\t210282
15307.179\t119474
15153.919\t155798
14887.503\t312093
14808.4\t\t2555
14553.1\t\t1635\t

0.5 seconds
14430.9\t\t166693
14219.7\t\t498421
13939.1\t\t28885
13802.1\t\t28853


13542.7\t\t10849
13442.7\t\t52860
13353.0\t\t30592
13326.3\t\t43857

5 seconds
13307.2\t\t202287
13269.8\t\t290076
13255.4\t\t191000
13097.2\t\t442270
12946.4\t\t108532
12581.4\t\t150753
12490.2\t\t60361
12476.7\t\t120892
12339.8\t\t148421
12322.2\t\t625959\t
11936.4\t\t632699
11869.8\t\t140343
11771.0\t\t416560
11734.9\t\t110622
11639.5\t\t64323
11581.2\t\t164995
11388.5\t\t183347 \t(Too close to 11384.5)
11384.5\t\t50211\t(Too close to 11388.5)
11294.3\t\t81358
11279.2\t\t52118
11211.2\t\t23465
11125.0\t\t5773
11018.6\t\t922
10961.1\t\t251882
10930.3\t\t18742
10875.7\t\t2495
10867.3\t\t14349


10 seconds
10780.7\t\t2854
10762.2\t\t3398 (Quite close to 10751.4 but much lower intensity)
10751.4\t\t23126
10740.1\t\t3806 (Too close to other peak at 10736.3)
10736.3\t\t8380 (Too close to other peak at 10740.1)
10721.8\t\t20000
10690.1\t\t4769
10668.4\t\t6448
10609.5\t\t15907
10571.6\t\t6919
10540.9\t\t5971
10488.5\t\t19493
10474.0\t\t9196
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
    id: '532-1800-lns-empirical',
    label: '532 nm · 1800 l/mm — Empirical Multi-Exposure .LNS (532nm_1800.lns)',
    shortTag: '532nm / 1800 (.LNS Empirical)',
    description:
      'Full empirical 80-line 532nm 1800 l/mm scan across 0.5s, 1s, 5s, and 10s exposure zones. Highlights saturation limits from 17086.75 & 14219.7 cm⁻¹, lens focus anchors (18516.592 & 15619.514), and close doublets (11388.5/11384.5 & 10740.1/10736.3).',
    params: params532_1800_lns,
    sampleFileName: '532nm_1800.lns',
    sampleFileContent: EMPIRICAL_532_1800_LNS_FILE,
    isFlawedDemo: true,
  },
  {
    id: '532-1800-std',
    label: '532 nm · 1800 l/mm — Standard Filter (50–4000 cm⁻¹ / WiRE X Reference)',
    shortTag: '532nm / 1800 l/mm',
    description:
      'inVia 532 nm + 1800 l/mm grating (F = 249.2607 mm, Included angle = 0.523113 rad, 1316 steps/deg). Focused on 18516.592 & 15619.514 cm⁻¹, PCL 17086.75 cm⁻¹.',
    params: params532_1800,
    sampleFileName: '532nm_1800lmm_validated.cal',
    sampleFileContent: makePresetFile(params532_1800),
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
  {
    id: '457-1500-std',
    label: '457 nm · 1500 l/mm — Standard Filter (50–4000 cm⁻¹)',
    shortTag: '457nm / 1500 l/mm',
    description:
      'Blue 457 nm excitation with 1500 l/mm grating. Abs range 21831.8–17881.8 cm⁻¹, Primary Calibration Line (PCL) at 19874.61 cm⁻¹.',
    params: params457_1500,
    sampleFileName: '457nm_1500lmm_cal.cal',
    sampleFileContent: makePresetFile(params457_1500),
  },
  {
    id: '405-2400-std',
    label: '405 nm · 2400 l/mm — Standard Filter (50–4000 cm⁻¹)',
    shortTag: '405nm / 2400 l/mm',
    description:
      'Violet-UV 405 nm excitation with 2400 l/mm high-density grating. Abs range 24641.4–20691.4 cm⁻¹, Primary Calibration Line (PCL) at 22668.42 cm⁻¹.',
    params: params405_2400,
    sampleFileName: '405nm_2400lmm_cal.cal',
    sampleFileContent: makePresetFile(params405_2400),
  },
];
