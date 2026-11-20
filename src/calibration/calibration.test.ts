import test from 'node:test';
import assert from 'node:assert/strict';
import {
  applyCcdArchitecture,
  applySpectrographModel,
  calculateCcdWindowBoundsCm1,
  calculateCcdWindowWidthCm1,
  calculateFilterTransmissionPct,
  calculateAirRefractiveIndex,
  calculateThermalOpticsState,
  CalibrationParameters,
  EMPIRICAL_VIRSA_2400_WINDOWS,
  evaluateCcdExposureAndSaturation,
  getLaserWavenumberCm1,
  motorStepsToDegrees,
  solveCalibration,
} from './physicsEngine';
import {
  auditCalibrationFile,
  generateCalibrationFileText,
} from './fileAuditor';
import { FACTORY_PRESETS } from './presets';

const BASE_PARAMS: CalibrationParameters = {
  spectrograph: 'inVia',
  laserNm: 532,
  gratingLinesPerMm: 600,
  filterType: 'standard',
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

test('532nm 600 l/mm standard filter yields 18747-14797 Abs cm-1 and 17086.75 PCL', () => {
  const sol = solveCalibration(BASE_PARAMS);
  assert.equal(sol.absHighCm1, 18747.0);
  assert.equal(sol.absLowCm1, 14797.0);
  assert.equal(sol.primaryCalibrationLine?.wavenumber, 17086.75);
  assert.equal(sol.recommendedMotorStepTicks, 50);
});

test('785nm 600 l/mm standard filter is capped at 50-3500 cm-1 by CCD cutoff (12689-9239 Abs, 13100-8700 Scan)', () => {
  const sol = solveCalibration({
    ...BASE_PARAMS,
    laserNm: 785,
    gratingLinesPerMm: 600,
  });
  assert.equal(sol.effectiveRamanMinCm1, 50);
  assert.equal(sol.effectiveRamanMaxCm1, 3500);
  assert.equal(sol.absHighCm1, 12689.0);
  assert.equal(sol.absLowCm1, 9239.0);
  assert.equal(sol.scanHighCm1, 13100.0);
  assert.equal(sol.scanLowCm1, 8700.0);
});

test('660nm laser yields 15151.5 - 11151.5 cm-1 with centre 13151.52 cm-1', () => {
  const laserNu = getLaserWavenumberCm1(660);
  assert.equal(laserNu, 15151.52);
  const sol = solveCalibration({
    ...BASE_PARAMS,
    laserNm: 660,
    gratingLinesPerMm: 1200,
  });
  assert.equal(sol.absHighCm1, 15151.5);
  assert.equal(sol.absLowCm1, 11151.5);
  assert.equal(sol.absCentreCm1, 13151.5);
});

test('633nm grating series matches exact factory Abs and Scan ranges (2400, 1800, 1200, 600 l/mm)', () => {
  const sol2400 = solveCalibration({
    ...BASE_PARAMS,
    laserNm: 633,
    gratingLinesPerMm: 2400,
  });
  assert.equal(sol2400.effectiveRamanMaxCm1, 2500);
  assert.equal(sol2400.absHighCm1, 15802.8);
  assert.equal(sol2400.absLowCm1, 13302.8);
  assert.equal(sol2400.scanHighCm1, 16270.6);
  assert.equal(sol2400.scanLowCm1, 13089.9);
  assert.equal(sol2400.secondaryCalibrationLine?.wavenumber, 13353.03);

  const sol1800 = solveCalibration({
    ...BASE_PARAMS,
    laserNm: 633,
    gratingLinesPerMm: 1800,
  });
  assert.equal(sol1800.absHighCm1, 15802.8);
  assert.equal(sol1800.absLowCm1, 11802.8);
  assert.equal(sol1800.scanHighCm1, 16534.4);
  assert.equal(sol1800.scanLowCm1, 11497.5);

  const sol1200 = solveCalibration({
    ...BASE_PARAMS,
    laserNm: 633,
    gratingLinesPerMm: 1200,
  });
  assert.equal(sol1200.scanHighCm1, 16992.2);
  assert.equal(sol1200.scanLowCm1, 11257.7);

  const sol600 = solveCalibration({
    ...BASE_PARAMS,
    laserNm: 633,
    gratingLinesPerMm: 600,
  });
  assert.equal(sol600.scanHighCm1, 17800.0);
  assert.equal(sol600.scanLowCm1, 10821.0);
});

test('Target CCD occurrences accurately scales turret motor step size (8 hits -> 50 steps, 4 hits -> 100 steps)', () => {
  const sol8 = solveCalibration({
    ...BASE_PARAMS,
    targetOccurrencesPerLine: 8,
  });
  assert.equal(sol8.recommendedMotorStepTicks, 50);

  const sol4 = solveCalibration({
    ...BASE_PARAMS,
    targetOccurrencesPerLine: 4,
  });
  assert.equal(sol4.recommendedMotorStepTicks, 100);
});

test('File auditor flags confusion risk (17484.88 vs 17347.80), clustering, and 100-step motor mismatch on flawed demo file, and passes on repaired file', () => {
  const flawedPreset = FACTORY_PRESETS.find(
    (p) => p.id === '532-600-flawed-audit'
  )!;
  const auditFlawed = auditCalibrationFile(
    flawedPreset.sampleFileName,
    flawedPreset.sampleFileContent,
    flawedPreset.params
  );

  assert.equal(auditFlawed.overallStatus, 'FAIL');
  assert.ok(auditFlawed.failCount >= 2);
  assert.ok(
    auditFlawed.uploadedConfusionRisks.some(
      (r) =>
        (r.targetLine.wavenumber === 17484.88 &&
          r.neighborLine.wavenumber === 17347.8) ||
        (r.targetLine.wavenumber === 17347.8 &&
          r.neighborLine.wavenumber === 17484.88)
    )
  );

  const repairedText = generateCalibrationFileText(auditFlawed.solution);
  const auditRepaired = auditCalibrationFile(
    'repaired.cal',
    repairedText,
    flawedPreset.params
  );
  assert.equal(auditRepaired.overallStatus, 'PASS');
  assert.equal(auditRepaired.failCount, 0);
});

test('Selecting BDA automatically unticks enforceCcdCutoff and selecting FDA ticks enforceCcdCutoff', () => {
  const bdaParams = applyCcdArchitecture(
    { ...BASE_PARAMS, laserNm: 785 },
    'BDA'
  );
  assert.equal(bdaParams.ccdType, 'BDA');
  assert.equal(bdaParams.enforceCcdCutoff, false);
  const solBda = solveCalibration(bdaParams);
  assert.equal(solBda.effectiveRamanMaxCm1, 4000);

  const fdaParams = applyCcdArchitecture(bdaParams, 'FDA');
  assert.equal(fdaParams.ccdType, 'FDA');
  assert.equal(fdaParams.enforceCcdCutoff, true);
  const solFda = solveCalibration(fdaParams);
  assert.equal(solFda.effectiveRamanMaxCm1, 3500);
});

test('405nm and 457nm lasers and 1500 l/mm grating produce uniform 5-zone calibration solutions', () => {
  const sol457_1500 = solveCalibration({
    ...BASE_PARAMS,
    laserNm: 457,
    gratingLinesPerMm: 1500,
  });
  assert.equal(sol457_1500.absHighCm1, 21831.8);
  assert.equal(sol457_1500.absLowCm1, 17881.8);
  assert.equal(sol457_1500.minRequiredLineSpacingCm1, 120);
  assert.equal(sol457_1500.primaryCalibrationLine?.wavenumber, 19874.61);
  assert.ok(sol457_1500.selectedLines.length >= 8);
  assert.ok(sol457_1500.dispersionUniformityScore >= 85);

  const sol405_2400 = solveCalibration({
    ...BASE_PARAMS,
    laserNm: 405,
    gratingLinesPerMm: 2400,
  });
  assert.equal(sol405_2400.absHighCm1, 24641.4);
  assert.equal(sol405_2400.absLowCm1, 20691.4);
  assert.equal(sol405_2400.primaryCalibrationLine?.wavenumber, 22668.42);
  assert.ok(sol405_2400.selectedLines.length >= 8);
  assert.ok(sol405_2400.dispersionUniformityScore >= 85);
});

test('Empirical 1800 l/mm grating motor steps, degrees, CCD view compression, and exposure saturation match reference data', () => {
  // 1316.0 steps/deg -> 100 steps = 0.07599°, 1000 steps = 0.75988°, 10000 steps = 7.59878°
  assert.equal(motorStepsToDegrees(100), 0.07599);
  assert.equal(motorStepsToDegrees(1000), 0.75988);
  assert.equal(motorStepsToDegrees(10000), 7.59878);
  assert.equal(motorStepsToDegrees(36788), 27.95441);
  assert.equal(motorStepsToDegrees(53744), 40.83891);
  assert.equal(motorStepsToDegrees(81385), 61.84271);

  // Filter roll-off: 100% at 4000 cm-1, 65% at 7500 cm-1
  assert.equal(calculateFilterTransmissionPct(4000), 100);
  assert.equal(calculateFilterTransmissionPct(7500), 65);

  // CCD window width compresses from ~2009 cm-1 (at 18870 cm-1 / 0 cut-off) to ~1172 cm-1 (at 14833 cm-1 / 4000 cut-off) to ~484 cm-1 (at 10809 cm-1 / 8000 cut-off)
  const win0 = calculateCcdWindowWidthCm1(18870, 1800, 1014, 'inVia');
  const win4000 = calculateCcdWindowWidthCm1(14833, 1800, 1014, 'inVia');
  const win8000 = calculateCcdWindowWidthCm1(10809, 1800, 1014, 'inVia');
  assert.ok(Math.abs(win0 - 2009.3) < 25, `win0=${win0}`);
  assert.ok(Math.abs(win4000 - 1172.1) < 25, `win4000=${win4000}`);
  assert.ok(Math.abs(win8000 - 483.6) < 25, `win8000=${win8000}`);

  // Exposure saturation guard: when 17086.75 or 14219.12 is on the CCD, exposure is capped at 0.5s
  const expAtPcl = evaluateCcdExposureAndSaturation(17800, 16300, 1800);
  assert.equal(expAtPcl.recommendedExposureSec, 0.5);
  assert.equal(expAtPcl.limitingLine?.wavenumber, 17086.75);
  assert.ok(expAtPcl.stepsToClearLimitingLine > 0);

  const expAt14219 = evaluateCcdExposureAndSaturation(14450, 13320, 1800);
  assert.equal(expAt14219.recommendedExposureSec, 0.5);
  assert.equal(expAt14219.limitingLine?.wavenumber, 14219.12);

  // Once turret steps below 14219.12 (e.g. 13310 - 12400 cm-1), exposure increases to 5s
  const expBelow14219 = evaluateCcdExposureAndSaturation(13310, 12400, 1800);
  assert.equal(expBelow14219.recommendedExposureSec, 5);

  // Audit the empirical 532nm_1800.lns preset
  const lnsPreset = FACTORY_PRESETS.find(
    (p) => p.id === '532-1800-lns-empirical'
  )!;
  const auditLns = auditCalibrationFile(
    lnsPreset.sampleFileName,
    lnsPreset.sampleFileContent,
    lnsPreset.params
  );
  assert.equal(auditLns.parsedLines.length, 80);
  assert.deepEqual(auditLns.detectedHeaders.exposureSectionsSec, [
    10, 1, 0.5, 5,
  ]);
  // Verify close doublets (11388.5/11384.5 and 10740.1/10736.3) are flagged
  assert.ok(
    auditLns.uploadedConfusionRisks.some((r) => r.spacingCm1 <= 5.0),
    'Should flag 4.0 cm-1 and 3.8 cm-1 doublets in 532nm_1800.lns'
  );
});

test('Empirical Virsa 532nm 2400 l/mm 50um fibre matches all 12 asymmetric CCD view windows, 14000-19400 cm-1 (108 scans @ 50 cm-1 step), and 29 post-calibration lines', () => {
  const virsaParams = applySpectrographModel(
    { ...BASE_PARAMS, laserNm: 532, gratingLinesPerMm: 2400 },
    'Virsa'
  );
  // Default active X range is now 18 to 1032 (1014 active pixels) for all systems
  assert.equal(virsaParams.ccdActiveXMinPx, 18);
  assert.equal(virsaParams.ccdActiveXMaxPx, 1032);
  assert.equal(virsaParams.ccdActiveWidthPx, 1014);
  assert.equal(virsaParams.ccdActiveHeightPx, 20);

  const solVirsa = solveCalibration(virsaParams);
  assert.equal(solVirsa.scanHighCm1, 19400.0);
  assert.equal(solVirsa.scanLowCm1, 14000.0);
  assert.equal(solVirsa.scanSpanCm1, 5400.0);
  assert.equal(solVirsa.wireXStepAbsCm1, 50);
  assert.equal(solVirsa.wireXTotalScanCount, 108);
  assert.equal(solVirsa.focusAnchorLines.length, 0); // Virsa has 1 movable lens

  // Verify all 12 empirical Virsa 532nm / 2400 l/mm asymmetric CCD view windows (recorded at ROI 10..1030, Centre 517) match the pure physical ray-trace
  for (const bm of EMPIRICAL_VIRSA_2400_WINDOWS) {
    const bounds = calculateCcdWindowBoundsCm1(
      bm.centreAbsCm1,
      2400,
      1020,
      'Virsa',
      10,
      1030,
      517,
      20
    );
    assert.ok(
      Math.abs(bounds.windowLowAbsCm1 - bm.viewLowAbsCm1) < 2.0,
      `Centre ${bm.centreAbsCm1}: expected low ${bm.viewLowAbsCm1}, got ${bounds.windowLowAbsCm1}`
    );
    assert.ok(
      Math.abs(bounds.windowHighAbsCm1 - bm.viewHighAbsCm1) < 2.0,
      `Centre ${bm.centreAbsCm1}: expected high ${bm.viewHighAbsCm1}, got ${bounds.windowHighAbsCm1}`
    );
  }

  // Verify default active X range 18 to 1032 (1014 px) with 517 as centre pixel physically reflects the 499 low / 515 high pixel geometry
  const bounds18_1032 = calculateCcdWindowBoundsCm1(
    17086.75,
    2400,
    1014,
    'Virsa',
    18,
    1032,
    517,
    20
  );
  assert.ok(bounds18_1032.windowLowAbsCm1 > 16437.37);
  assert.ok(Math.abs(bounds18_1032.windowLowAbsCm1 - 16447.55) < 1.5);
  assert.ok(Math.abs(bounds18_1032.windowHighAbsCm1 - 17840.91) < 1.5);

  // Verify manual override of Absolute Calibration Range recalculates Grating Turret Scan Range, Centre, and Raman Shift
  // and does NOT snap numbers between 14738 and 14856 back to 14000
  const sol14397 = solveCalibration({
    ...virsaParams,
    customAbsLowCm1: 14397,
    customAbsHighCm1: 18747,
  });
  const sol14737 = solveCalibration({
    ...virsaParams,
    customAbsLowCm1: 14737,
    customAbsHighCm1: 18747,
  });
  const sol14738 = solveCalibration({
    ...virsaParams,
    customAbsLowCm1: 14738,
    customAbsHighCm1: 18747,
  });
  const sol14856 = solveCalibration({
    ...virsaParams,
    customAbsLowCm1: 14856,
    customAbsHighCm1: 18747,
  });
  const sol14857 = solveCalibration({
    ...virsaParams,
    customAbsLowCm1: 14857,
    customAbsHighCm1: 18747,
  });
  assert.equal(Math.round(sol14397.scanLowCm1), 14000);
  assert.equal(Math.round(sol14737.scanLowCm1), 14306);
  assert.equal(Math.round(sol14738.scanLowCm1), 14307);
  assert.equal(Math.round(sol14856.scanLowCm1), 14413);
  assert.equal(Math.round(sol14857.scanLowCm1), 14414);

  const solCustomAbs = solveCalibration({
    ...virsaParams,
    customAbsLowCm1: 14431,
    customAbsHighCm1: 18517,
  });
  assert.equal(solCustomAbs.absLowCm1, 14431);
  assert.equal(solCustomAbs.absHighCm1, 18517);
  assert.equal(Math.round(solCustomAbs.absCentreCm1), 16474);
  assert.ok(solCustomAbs.scanLowCm1 < 14431);
  assert.ok(solCustomAbs.scanHighCm1 > 18517);

  // Audit the 29-line empirical Virsa 532nm 2400 preset and verify lowest-line step calculation
  const virsaPreset = FACTORY_PRESETS.find(
    (p) => p.id === 'virsa-532-2400-empirical'
  )!;
  assert.equal(virsaPreset.params.spectrograph, 'Virsa');
  assert.equal(virsaPreset.params.laserNm, 532);
  assert.equal(virsaPreset.params.gratingLinesPerMm, 2400);
  assert.equal(virsaPreset.params.targetLineCount, 16);
  assert.equal(virsaPreset.params.targetOccurrencesPerLine, 16);
  assert.equal(virsaPreset.params.minRelativeIntensity, 1);
  assert.equal(virsaPreset.params.ccdZeroOrderCentrePx, 517);
  assert.equal(
    applySpectrographModel(BASE_PARAMS, 'inVia').ccdZeroOrderCentrePx,
    517
  );

  const auditVirsa = auditCalibrationFile(
    virsaPreset.sampleFileName,
    virsaPreset.sampleFileContent,
    virsaPreset.params
  );
  assert.equal(auditVirsa.parsedLines.length, 29);
  assert.equal(auditVirsa.solution.selectedLines.length, 16);
  for (const bin of auditVirsa.solution.binDistribution) {
    assert.ok(
      bin.count >= 3,
      `Zone ${bin.binIndex} should have at least 3 lines, got ${bin.count}`
    );
  }
  assert.ok(auditVirsa.lowestLineAnalysis !== null);
  assert.equal(auditVirsa.lowestLineAnalysis?.lowestWavenumberCm1, 14430.7);
  assert.equal(auditVirsa.lowestLineAnalysis?.recommendedStepCm1AtLowest, 50);

  // Test lowest wavenumber 14430.70 cm^-1 uploaded file step-size calculation for 16 hits vs 10 hits
  const customAudit14430 = auditCalibrationFile(
    'custom_14430.txt',
    '14430.70\n17086.75\n18516.59',
    { ...virsaParams, targetOccurrencesPerLine: 16 }
  );
  assert.equal(
    customAudit14430.lowestLineAnalysis?.lowestWavenumberCm1,
    14430.7
  );
  assert.equal(
    customAudit14430.lowestLineAnalysis?.recommendedStepCm1AtLowest,
    50
  );

  const customAudit10Hits = auditCalibrationFile(
    'custom_14430_10hits.txt',
    '14430.70\n17086.75\n18516.59',
    { ...virsaParams, targetOccurrencesPerLine: 10 }
  );
  assert.equal(
    customAudit10Hits.lowestLineAnalysis?.exactStepCm1ForTargetHits,
    83.9
  );
  assert.equal(
    customAudit10Hits.lowestLineAnalysis?.recommendedStepCm1AtLowest,
    80
  );

  // Verify automated spectral origin analysis on Virsa 29-line empirical dataset:
  // All 29 lines are 1st-order Ne I (m=1): 28 authentic_ne1_first_order + 1 ne1_with_coincidental_overlap (17835.71 cm^-1)
  assert.equal(auditVirsa.spectralOriginSummary.totalAnalyzed, 29);
  assert.equal(auditVirsa.spectralOriginSummary.authenticNe1Count, 28);
  assert.equal(auditVirsa.spectralOriginSummary.coincidentalOverlapCount, 1);
  assert.equal(auditVirsa.spectralOriginSummary.secondOrderCount, 0);
  assert.equal(auditVirsa.spectralOriginSummary.thirdOrderCount, 0);
  assert.equal(auditVirsa.spectralOriginSummary.traceImpurityCount, 0);

  const line15619 = auditVirsa.spectralOriginSummary.entries.find(
    (e) => Math.abs(e.observedWavenumberCm1 - 15619.51) < 0.05
  );
  assert.ok(line15619);
  assert.equal(line15619.classification, 'authentic_ne1_first_order');
  assert.equal(line15619.diffractionOrder, 1);
  assert.equal(line15619.primarySpecies, 'Ne I');
  assert.ok(Math.abs((line15619.deltaFromNistAirCm1 ?? 99) - 0) <= 0.05);
  assert.ok(
    (line15619.nistWavenumberAirCm1 ?? 0) >
      (line15619.nistWavenumberVacCm1 ?? 0),
    'Air wavenumber should exceed vacuum wavenumber by index of refraction factor n_air ~ 1.000277'
  );
});

test('Automated Spectral Impurity & Higher-Order Diffraction Analyzer flags m=2, m=3 diffraction ghosts and Ar I / Hg I trace gas lines', () => {
  const virsaParams = applySpectrographModel(
    { ...BASE_PARAMS, laserNm: 532, gratingLinesPerMm: 2400 },
    'Virsa'
  );

  // Audit a mixed file containing authentic 1st-order Ne I, 2nd-order Ne I (344.770 nm -> 14502.42 cm-1),
  // 2nd-order Ne II (332.374 nm -> 15043.30 cm-1), 3rd-order Hg I (253.652 nm -> 13141.37 cm-1),
  // and trace Penning Argon I (696.543 nm -> 14356.61 cm-1 and 675.283 nm -> 14808.61 cm-1)
  const mixedFileContent = [
    '17086.75\t109074', // Authentic 1st-order Ne I PCL (585.249 nm)
    '15619.51\t200222', // Authentic 1st-order Ne I (640.225 nm)
    '15043.30\t420', // 2nd-order (m=2) Ne II 332.374 nm UV line
    '14502.42\t880', // 2nd-order (m=2) Ne I 344.770 nm UV line
    '14356.61\t1450', // 1st-order Trace Argon I 696.543 nm Penning gas line
    '14808.40\t1626', // 1st-order Trace Argon I 675.283 nm Penning gas line (present in 1800 .lns)
    '13141.37\t310', // 3rd-order (m=3) Hg I 253.652 nm UV line
  ].join('\n');

  const mixedAudit = auditCalibrationFile(
    'mixed_orders_and_argon.txt',
    mixedFileContent,
    virsaParams
  );

  const summary = mixedAudit.spectralOriginSummary;
  assert.equal(summary.totalAnalyzed, 7);
  assert.equal(summary.authenticNe1Count, 2);
  assert.equal(summary.secondOrderCount, 2);
  assert.equal(summary.thirdOrderCount, 1);
  assert.equal(summary.traceImpurityCount, 2);

  const ne2SecondOrder = summary.entries.find(
    (e) => Math.abs(e.observedWavenumberCm1 - 15043.3) < 0.1
  );
  assert.ok(ne2SecondOrder);
  assert.equal(ne2SecondOrder.classification, 'second_order_diffraction');
  assert.equal(ne2SecondOrder.diffractionOrder, 2);
  assert.equal(ne2SecondOrder.primarySpecies, 'Ne II');
  assert.ok(Math.abs((ne2SecondOrder.nistWavelengthAirNm ?? 0) - 332.374) < 0.05);

  const ne1SecondOrder = summary.entries.find(
    (e) => Math.abs(e.observedWavenumberCm1 - 14502.42) < 0.1
  );
  assert.ok(ne1SecondOrder);
  assert.equal(ne1SecondOrder.classification, 'second_order_diffraction');
  assert.equal(ne1SecondOrder.diffractionOrder, 2);
  assert.equal(ne1SecondOrder.primarySpecies, 'Ne I');
  assert.ok(Math.abs((ne1SecondOrder.nistWavelengthAirNm ?? 0) - 344.77) < 0.05);

  const hgThirdOrder = summary.entries.find(
    (e) => Math.abs(e.observedWavenumberCm1 - 13141.37) < 0.1
  );
  assert.ok(hgThirdOrder);
  assert.equal(hgThirdOrder.classification, 'third_order_diffraction');
  assert.equal(hgThirdOrder.diffractionOrder, 3);
  assert.equal(hgThirdOrder.primarySpecies, 'Hg I');
  assert.ok(Math.abs((hgThirdOrder.nistWavelengthAirNm ?? 0) - 253.652) < 0.05);

  const ar696 = summary.entries.find(
    (e) => Math.abs(e.observedWavenumberCm1 - 14356.61) < 0.1
  );
  assert.ok(ar696);
  assert.equal(ar696.classification, 'trace_gas_impurity');
  assert.equal(ar696.primarySpecies, 'Ar I');
  assert.equal(ar696.diffractionOrder, 1);

  // Verify the empirical 532nm_1800.lns file (which extends into the NIR down to 10474 cm^-1)
  // has its Penning Argon lines (14808.4, 13542.7, 13326.3, 13097.2, 12322.2 cm^-1, etc.) flagged
  const lnsPreset = FACTORY_PRESETS.find(
    (p) => p.id === '532-1800-lns-empirical'
  )!;
  const auditLns = auditCalibrationFile(
    lnsPreset.sampleFileName,
    lnsPreset.sampleFileContent,
    lnsPreset.params
  );
  assert.ok(
    auditLns.spectralOriginSummary.traceImpurityCount >= 10,
    `Expected >= 10 trace Ar I Penning gas lines in 532nm_1800.lns, got ${auditLns.spectralOriginSummary.traceImpurityCount}`
  );
});

test('Room Temperature thermo-optic & Edlen air refractive index model dynamically adjusts CCD view windows, grating density, and scan range, and Strada model is supported', () => {
  const n20 = calculateAirRefractiveIndex(585.249, 20);
  const n25 = calculateAirRefractiveIndex(585.249, 25);
  const n15 = calculateAirRefractiveIndex(585.249, 15);
  assert.ok(n25 < n20, 'Warmer air at 25°C must have lower refractive index than 20°C');
  assert.ok(n15 > n20, 'Cooler air at 15°C must have higher refractive index than 20°C');

  const thermal20 = calculateThermalOpticsState(17086.75, 2400, 'Virsa', 20);
  const thermal25 = calculateThermalOpticsState(17086.75, 2400, 'Virsa', 25);
  assert.equal(thermal20.thermalWavenumberDriftCm1, 0);
  assert.ok(
    thermal25.thermalWavenumberDriftCm1 < -0.5,
    `Expected negative wavenumber drift at +5°C, got ${thermal25.thermalWavenumberDriftCm1}`
  );
  assert.ok(
    thermal25.effectiveGrooveDensityLmm < 2400,
    'Grating thermal expansion at 25°C reduces effective lines/mm'
  );

  // Verify CCD view window shifts when room temperature changes from 20°C to 25°C or when X bounds change from 18..1032 to 10..1030
  const win20 = calculateCcdWindowBoundsCm1(17086.75, 2400, 1014, 'Virsa', 18, 1032, 517, 20);
  const win25 = calculateCcdWindowBoundsCm1(17086.75, 2400, 1014, 'Virsa', 18, 1032, 517, 25);
  const win10_1030 = calculateCcdWindowBoundsCm1(17086.75, 2400, 1020, 'Virsa', 10, 1030, 517, 20);
  assert.notEqual(win20.windowLowAbsCm1, win25.windowLowAbsCm1);
  assert.ok(
    win10_1030.windowLowAbsCm1 < win20.windowLowAbsCm1,
    'Extending X Start from 18 down to 10 physically widens the low-wavenumber view edge'
  );

  // Verify Strada spectrograph model works cleanly
  const stradaParams = applySpectrographModel(BASE_PARAMS, 'Strada');
  assert.equal(stradaParams.spectrograph, 'Strada');
  assert.equal(stradaParams.ccdZeroOrderCentrePx, 517);
  const solStrada = solveCalibration({ ...stradaParams, roomTemperatureC: 25 });
  assert.ok(
    solStrada.limitingFactors.some((f) => f.includes('Room Temp 25.0 °C')),
    'Should include Room Temp constraint when T != 20°C'
  );
});

test('Empirical Virsa 785nm 1500 l/mm NIR calibration matches 9300-13400 cm-1 scan range, 20 lines (12 Ne I + 8 Penning Ar I), and parses WiRE X GratingCalData report', () => {
  const preset785 = FACTORY_PRESETS.find(
    (p) => p.id === 'virsa-785-1500-empirical'
  )!;
  assert.ok(preset785);
  const sol785 = solveCalibration(preset785.params);
  assert.equal(sol785.scanLowCm1, 9300.0);
  assert.equal(sol785.scanHighCm1, 13400.0);
  assert.equal(sol785.scanSpanCm1, 4100.0);

  const audit785 = auditCalibrationFile(
    preset785.sampleFileName,
    preset785.sampleFileContent,
    preset785.params
  );
  assert.equal(audit785.parsedLines.length, 20);
  assert.equal(audit785.spectralOriginSummary.totalAnalyzed, 20);
  assert.equal(audit785.spectralOriginSummary.authenticNe1Count, 12);
  assert.equal(audit785.spectralOriginSummary.traceImpurityCount, 8);
  assert.equal(audit785.lowestLineAnalysis?.lowestWavenumberCm1, 9551.05);

  // Verify WiRE X GratingCalData report parser extracts headers and aggregates error table rows
  const sampleGratingCalData = `785 P2 HiRes // Laser name
1500 // Grating groove density (lines / mm)
9300 // Wavenumber start
13400 // Wavenumber end
50 // Wavenumber step
// Resulting calibration parameters
-0.010755 // Zero offset
-1316.00 // Motor step size
37.7200 // Included angle
197.00 // Focal length
0.0573 // RMS deviation
// Error data
// Line\tPixel\tStep\tError
9551.05\t65.75\t-70519\t-0.2584
9551.05\t936.26\t-76957\t-0.1710
10609.65\t21.92\t-62614\t0.0258
10609.65\t985.39\t-68937\t0.0029
12581.50\t23.44\t-48324\t-0.0297
12581.50\t992.56\t-54383\t-0.0680`;

  const auditCalData = auditCalibrationFile(
    '785nm_1500_GratingCalData.txt',
    sampleGratingCalData,
    preset785.params
  );
  assert.equal(auditCalData.detectedHeaders.laserNm, 785);
  assert.equal(auditCalData.detectedHeaders.gratingLinesPerMm, 1500);
  assert.equal(auditCalData.detectedHeaders.scanLowCm1, 9300);
  assert.equal(auditCalData.detectedHeaders.scanHighCm1, 13400);
  assert.equal(auditCalData.detectedHeaders.motorStepTicks, 50);
  assert.equal(auditCalData.parsedLines.length, 3);
  const line9551 = auditCalData.parsedLines.find(
    (p) => Math.abs(p.wavenumberCm1 - 9551.05) < 0.01
  )!;
  assert.equal(line9551.occurrencesAcrossCcd, 2);
  assert.equal(line9551.originAnalysis.primarySpecies, 'Ar I');
});



