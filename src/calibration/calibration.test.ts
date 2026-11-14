import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CalibrationParameters,
  getLaserWavenumberCm1,
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
  const flawedPreset = FACTORY_PRESETS[0];
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
