import test from 'node:test';
import assert from 'node:assert/strict';
import {
  applyCcdArchitecture,
  calculateCcdWindowWidthCm1,
  calculateFilterTransmissionPct,
  CalibrationParameters,
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


