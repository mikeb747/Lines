import { NEON_CATALOG, NeonLine } from './neonCatalog';
import {
  BinDistribution,
  calculateCcdWindowBoundsCm1,
  CalibrationParameters,
  CalibrationSolution,
  computeBinUniformity,
  evaluateConfusionRisks,
  LineConfusionPair,
  solveCalibration,
} from './physicsEngine';
import {
  analyzeSpectralLineBatch,
  analyzeSpectralLineOrigin,
  BatchSpectralOriginSummary,
  SpectralLineOriginAnalysis,
} from './spectralImpurityAnalyzer';

export interface ParsedLineEntry {
  rawLineNumber: number;
  rawText: string;
  wavenumberCm1: number;
  matchedCatalogLine: NeonLine | null;
  catalogDeltaCm1: number | null;
  originAnalysis: SpectralLineOriginAnalysis;
  declaredRole?: 'PCL' | '2ND' | 'STANDARD';
  declaredIntensity?: number;
  declaredExposureSec?: number;
  estimatedCountsPerSec?: number;
  inlineNote?: string;
  inScanRange: boolean;
  inAbsRamanRange: boolean;
  occurrencesAcrossCcd: number;
  status: 'valid' | 'warning' | 'error';
  issueMessages: string[];
}

export interface DiagnosticCheckItem {
  id: string;
  title: string;
  category:
    | 'Range & Bounds'
    | 'Primary Calibration Line (PCL)'
    | 'Line Confusion & Spacing'
    | 'Dispersion Uniformity'
    | 'Motor Step & CCD Coverage'
    | 'Catalog Fidelity';
  status: 'pass' | 'warning' | 'fail';
  measuredValue: string;
  expectedValue: string;
  summary: string;
  recommendation?: string;
}

export interface FileAuditReport {
  fileName: string;
  rawContent: string;
  detectedHeaders: {
    spectrograph?: string;
    laserNm?: number;
    gratingLinesPerMm?: number;
    filterType?: string;
    pclCm1?: number;
    secondCalLineCm1?: number;
    scanHighCm1?: number;
    scanLowCm1?: number;
    motorStepTicks?: number;
    ccdType?: string;
    exposureSectionsSec?: number[];
  };
  parsedLines: ParsedLineEntry[];
  matchedLines: NeonLine[];
  spectralOriginSummary: BatchSpectralOriginSummary;
  overallStatus: 'PASS' | 'WARN' | 'FAIL';
  passCount: number;
  warnCount: number;
  failCount: number;
  diagnostics: DiagnosticCheckItem[];
  uploadedBinDistribution: BinDistribution[];
  uploadedUniformityScore: number;
  uploadedConfusionRisks: LineConfusionPair[];
  achievedOccurrencesPerLine: number;
  lowestLineAnalysis: {
    lowestWavenumberCm1: number;
    highestWavenumberCm1: number;
    ccdWindowAtLowestCm1: number;
    ccdWindowAtHighestCm1: number;
    exactStepCm1ForTargetHits: number;
    recommendedStepCm1AtLowest: number;
    achievedHitsAtLowestWithRecommendedStep: number;
    achievedHitsAtLowestWithCurrentStep: number;
    totalScansWithLowestStep: number;
  } | null;
  solution: CalibrationSolution;
}

/**
 * Parses an uploaded or pasted calibration text file (.txt, .cal, .lns, .csv, .dat, .cfg)
 * and audits it against the active CalibrationParameters and calculated CalibrationSolution.
 */
export function auditCalibrationFile(
  fileName: string,
  rawContent: string,
  params: CalibrationParameters
): FileAuditReport {
  const solution = solveCalibration(params);
  const lines = rawContent.split(/\r?\n/);

  const detectedHeaders: FileAuditReport['detectedHeaders'] = {
    exposureSectionsSec: [],
  };
  const parsedLines: ParsedLineEntry[] = [];
  let activeExposureSec: number | undefined = undefined;

  for (let idx = 0; idx < lines.length; idx++) {
    const raw = lines[idx].trim();
    if (!raw) continue;

    // Check for multi-exposure section headers in .lns files: e.g. "10 Seconds", "1 Second", "0.5 Seconds", "5 seconds"
    const exposureHeaderMatch = raw.match(
      /^(\d+(?:\.\d+)?)\s*(?:seconds?|secs?|s)\b/i
    );
    if (exposureHeaderMatch && !/^\d{4,5}/.test(raw)) {
      activeExposureSec = parseFloat(exposureHeaderMatch[1]);
      if (
        activeExposureSec > 0 &&
        !detectedHeaders.exposureSectionsSec?.includes(activeExposureSec)
      ) {
        detectedHeaders.exposureSectionsSec?.push(activeExposureSec);
      }
      continue;
    }

    // Check for metadata / header lines (e.g., "# Laser: 532nm", "Grating = 600 l/mm", "PCL: 17086.75", "MotorStep: 50")
    const lower = raw.toLowerCase();

    const laserMatch = lower.match(/laser\s*[:=]\s*(\d+(?:\.\d+)?)\s*(?:nm)?/);
    if (laserMatch) {
      detectedHeaders.laserNm = parseFloat(laserMatch[1]);
      continue;
    }

    const gratingMatch = lower.match(
      /grating\s*[:=]\s*(\d+)\s*(?:l\/mm|g\/mm)?/
    );
    if (gratingMatch) {
      detectedHeaders.gratingLinesPerMm = parseInt(gratingMatch[1], 10);
      continue;
    }

    const specMatch = raw.match(
      /(?:spectrograph|system|instrument)\s*[:=]\s*(inVia|Virsa|Strada|Strava)/i
    );
    if (specMatch) {
      detectedHeaders.spectrograph =
        specMatch[1].toLowerCase() === 'strava' ? 'Strada' : specMatch[1];
      continue;
    }

    const filterMatch = raw.match(/filter\s*[:=]\s*([A-Za-z0-9_/\-\s]+)/i);
    if (filterMatch && !/^\d/.test(filterMatch[1].trim())) {
      detectedHeaders.filterType = filterMatch[1].trim();
      continue;
    }

    const ccdMatch = raw.match(/ccd\s*[:=]\s*(FDA|BDA|BI)/i);
    if (ccdMatch) {
      detectedHeaders.ccdType = ccdMatch[1].toUpperCase();
      continue;
    }

    const stepMatch = lower.match(
      /(?:motor[_\s]*step|step[_\s]*size|tick[_\s]*step|steps)\s*[:=]\s*(\d+(?:\.\d+)?)/
    );
    if (stepMatch) {
      detectedHeaders.motorStepTicks = parseFloat(stepMatch[1]);
      continue;
    }

    const scanMatch = lower.match(
      /scan[_\s]*range\s*[:=]\s*(\d+(?:\.\d+)?)\s*[-–to]+\s*(\d+(?:\.\d+)?)/
    );
    if (scanMatch) {
      const v1 = parseFloat(scanMatch[1]);
      const v2 = parseFloat(scanMatch[2]);
      detectedHeaders.scanHighCm1 = Math.max(v1, v2);
      detectedHeaders.scanLowCm1 = Math.min(v1, v2);
      continue;
    }

    const pclHeaderMatch = lower.match(
      /^(?:#\s*)?(?:pcl|primary[_\s]*calibration[_\s]*line)\s*[:=]\s*(\d{4,5}(?:\.\d+)?)/
    );
    if (pclHeaderMatch) {
      detectedHeaders.pclCm1 = parseFloat(pclHeaderMatch[1]);
      if (!raw.includes(',') && !raw.includes('\t')) {
        continue;
      }
    }

    const secHeaderMatch = lower.match(
      /^(?:#\s*)?(?:2nd[_\s]*cal(?:ibration)?[_\s]*line|secondary[_\s]*line)\s*[:=]\s*(\d{4,5}(?:\.\d+)?)/
    );
    if (secHeaderMatch) {
      detectedHeaders.secondCalLineCm1 = parseFloat(secHeaderMatch[1]);
      if (!raw.includes(',') && !raw.includes('\t')) {
        continue;
      }
    }

    // Skip pure comment or column header rows that don't start with a wavenumber
    if (
      raw.startsWith('#') ||
      raw.startsWith('//') ||
      raw.startsWith(';') ||
      /^[a-zA-Z]/.test(raw)
    ) {
      continue;
    }

    // Parse numerical wavenumber row: e.g. "17086.75, 1000, PCL" or "18343.06 0   78" or "11388.5   183347 (Too close to 11384.5)"
    const numMatch = raw.match(/^(\d{4,5}(?:\.\d+)?)/);
    if (!numMatch) continue;

    const wavenumberCm1 = parseFloat(numMatch[1]);
    if (wavenumberCm1 < 4000 || wavenumberCm1 > 26000) continue;

    // Extract optional parenthetical note e.g. "(Too close to 11384.5)"
    const parenMatch = raw.match(/\(([^)]+)\)/);
    const inlineNote = parenMatch ? parenMatch[1].trim() : undefined;

    let declaredRole: 'PCL' | '2ND' | 'STANDARD' = 'STANDARD';
    if (/\b(?:pcl|primary)\b/i.test(raw)) {
      declaredRole = 'PCL';
      if (!detectedHeaders.pclCm1) detectedHeaders.pclCm1 = wavenumberCm1;
    } else if (/\b(?:2nd|secondary)\b/i.test(raw)) {
      declaredRole = '2ND';
      if (!detectedHeaders.secondCalLineCm1)
        detectedHeaders.secondCalLineCm1 = wavenumberCm1;
    }

    // Parse intensity or raw detector counts (supporting both 0-1000 normalized intensity and 0-2,000,000 raw detector counts)
    const cleanWithoutParen = raw.replace(/\([^)]*\)/g, '').replace(/#.*$/, '');
    const tokens = cleanWithoutParen.trim().split(/[\s,;|\t]+/);
    let declaredIntensity: number | undefined;
    if (tokens.length >= 2) {
      // Handle cases like "18343.06 0\t78" where a stray '0' digit after space precedes the tab-delimited count
      const secondToken = parseFloat(tokens[1]);
      const thirdToken = tokens.length >= 3 ? parseFloat(tokens[2]) : NaN;
      if (
        tokens[1] === '0' &&
        !isNaN(thirdToken) &&
        thirdToken > 0
      ) {
        declaredIntensity = thirdToken;
      } else if (!isNaN(secondToken) && secondToken >= 0 && secondToken <= 5_000_000) {
        declaredIntensity = secondToken;
      }
    }

    // Find closest Neon line in NEON_CATALOG
    let closestCat: NeonLine | null = null;
    let minDiff = Infinity;
    for (const cat of NEON_CATALOG) {
      const diff = Math.abs(cat.wavenumber - wavenumberCm1);
      if (diff < minDiff) {
        minDiff = diff;
        closestCat = cat;
      }
    }

    const matchedCatalogLine = minDiff <= 3.5 ? closestCat : null;
    const catalogDeltaCm1 = closestCat
      ? Number((wavenumberCm1 - closestCat.wavenumber).toFixed(2))
      : null;

    const inScanRange =
      wavenumberCm1 <= solution.scanHighCm1 + 5 &&
      wavenumberCm1 >= solution.scanLowCm1 - 5;
    const inAbsRamanRange =
      wavenumberCm1 <= solution.absHighCm1 + 5 &&
      wavenumberCm1 >= solution.absLowCm1 - 5;

    const effectiveStepTicks =
      detectedHeaders.motorStepTicks ||
      (params.spectrograph === 'Virsa'
        ? solution.wireXStepAbsCm1
        : solution.recommendedMotorStepTicks);
    const lineWindowBounds = calculateCcdWindowBoundsCm1(
      wavenumberCm1,
      params.gratingLinesPerMm,
      params.ccdActiveWidthPx,
      params.spectrograph,
      params.ccdActiveXMinPx,
      params.ccdActiveXMaxPx,
      params.ccdZeroOrderCentrePx,
      params.roomTemperatureC
    );
    const stepShiftCm1 =
      params.spectrograph === 'Virsa'
        ? effectiveStepTicks
        : effectiveStepTicks * (solution.ccdWindowCentreCm1 / 400);
    const occurrencesAcrossCcd = Number(
      (
        (params.spectrograph === 'Virsa'
          ? lineWindowBounds.windowSpanCm1
          : solution.ccdWindowCentreCm1) / Math.max(1, stepShiftCm1)
      ).toFixed(1)
    );

    const effectiveExposureSec =
      activeExposureSec ?? matchedCatalogLine?.empiricalScanSec1800;
    const estimatedCountsPerSec =
      declaredIntensity !== undefined && effectiveExposureSec
        ? Math.round(declaredIntensity / effectiveExposureSec)
        : matchedCatalogLine?.countsAt1s1800;

    const issueMessages: string[] = [];
    let status: 'valid' | 'warning' | 'error' = 'valid';
    const originAnalysis = analyzeSpectralLineOrigin(
      wavenumberCm1,
      declaredIntensity
    );

    if (!matchedCatalogLine) {
      status = 'error';
      if (
        originAnalysis.classification === 'second_order_diffraction' ||
        originAnalysis.classification === 'third_order_diffraction' ||
        originAnalysis.classification === 'trace_gas_impurity'
      ) {
        issueMessages.push(originAnalysis.explanation);
      } else {
        issueMessages.push(
          `No known Neon I emission line within ±3.5 cm⁻¹ (closest is ${closestCat?.wavenumber.toFixed(2)} cm⁻¹, Δ=${catalogDeltaCm1} cm⁻¹).`
        );
      }
    } else if (Math.abs(catalogDeltaCm1 || 0) > 1.2) {
      status = 'warning';
      issueMessages.push(
        `Wavenumber deviates by ${catalogDeltaCm1} cm⁻¹ from NIST reference (${matchedCatalogLine.wavenumber.toFixed(2)} cm⁻¹).`
      );
    }

    if (
      matchedCatalogLine &&
      originAnalysis.classification === 'trace_gas_impurity'
    ) {
      issueMessages.push(originAnalysis.explanation);
    }

    // Check for 0-count / unobservable line (e.g. 18758.990 with 0 counts on 1800 grating with FDA camera & visible lenses)
    if (
      declaredIntensity === 0 ||
      (inlineNote && /not visible/i.test(inlineNote))
    ) {
      status = 'warning';
      issueMessages.push(
        inlineNote ||
          matchedCatalogLine?.closeNeighborWarning ||
          `0 counts recorded — not visible with ${params.gratingLinesPerMm} l/mm grating on ${params.ccdType} camera with visible lenses.`
      );
    }

    // Check for explicit close-neighbor annotations from .lns or catalog
    if (inlineNote && /too close|quite close/i.test(inlineNote)) {
      if (status !== 'error') status = 'warning';
      issueMessages.push(
        matchedCatalogLine?.closeNeighborWarning || inlineNote
      );
    } else if (matchedCatalogLine?.closeNeighborWarning && declaredIntensity !== 0) {
      // Only warn if the neighbor is also present in the file or if it's a known unobservable line
      if (/0 counts/i.test(matchedCatalogLine.closeNeighborWarning) && params.gratingLinesPerMm >= 1800) {
        if (status !== 'error') status = 'warning';
        issueMessages.push(matchedCatalogLine.closeNeighborWarning);
      }
    }

    // Check if raw counts at the declared exposure exceed 1,000,000 CCD saturation limit
    if (declaredIntensity !== undefined && declaredIntensity >= 1_000_000) {
      status = 'error';
      issueMessages.push(
        `Detector saturation (${declaredIntensity.toLocaleString()} counts ≥ 1,000,000 ceiling) — reduce scan duration!`
      );
    }

    if (!inScanRange) {
      if (status !== 'error') status = 'warning';
      issueMessages.push(
        `Outside active ${solution.effectiveRamanMinCm1}–${solution.effectiveRamanMaxCm1} cm⁻¹ Grating Scan Range (${solution.scanHighCm1.toFixed(1)} – ${solution.scanLowCm1.toFixed(1)} cm⁻¹); requires extended RPL/PL scan.`
      );
    }

    // Only apply normalized 1-1000 relativeIntensity threshold when not parsing raw multi-second .lns counts
    if (
      activeExposureSec === undefined &&
      declaredIntensity !== undefined &&
      declaredIntensity > 0 &&
      declaredIntensity < params.minRelativeIntensity
    ) {
      if (status !== 'error') status = 'warning';
      issueMessages.push(
        `Low relative intensity (${declaredIntensity}) below threshold (${params.minRelativeIntensity}) for ${params.gratingLinesPerMm} l/mm grating.`
      );
    }

    parsedLines.push({
      rawLineNumber: idx + 1,
      rawText: raw,
      wavenumberCm1,
      matchedCatalogLine,
      catalogDeltaCm1,
      originAnalysis,
      declaredRole,
      declaredIntensity,
      declaredExposureSec: effectiveExposureSec,
      estimatedCountsPerSec,
      inlineNote,
      inScanRange,
      inAbsRamanRange,
      occurrencesAcrossCcd,
      status,
      issueMessages,
    });
  }

  // Sort parsed lines high-to-low wavenumber for analysis
  const sortedParsed = [...parsedLines].sort(
    (a, b) => b.wavenumberCm1 - a.wavenumberCm1
  );

  // Convert parsed entries to NeonLine objects for uniformity & confusion checks
  const matchedLines: NeonLine[] = sortedParsed.map((p, idx) =>
    p.matchedCatalogLine
      ? p.matchedCatalogLine
      : {
          id: `custom-${idx}`,
          wavenumber: p.wavenumberCm1,
          wavelengthAirNm: Number((1e7 / p.wavenumberCm1).toFixed(3)),
          relativeIntensity: p.declaredIntensity || 300,
          fwhmCm1: 0.9,
          transition: 'Uploaded Line',
          isPrimaryCandidate: false,
        }
  );

  // Determine active PCL in uploaded file
  const explicitPclValue =
    detectedHeaders.pclCm1 ??
    parsedLines.find((p) => p.declaredRole === 'PCL')?.wavenumberCm1 ??
    solution.primaryCalibrationLine?.wavenumber;

  const uploadedPclLine =
    matchedLines.find(
      (l) => explicitPclValue && Math.abs(l.wavenumber - explicitPclValue) < 2.0
    ) ||
    solution.primaryCalibrationLine;

  // Evaluate confusion risks on uploaded lines
  const uploadedConfusionRisks = evaluateConfusionRisks(
    matchedLines,
    uploadedPclLine,
    params.gratingLinesPerMm
  );

  // Annotate individual parsed lines if they are involved in a confusion risk
  for (const risk of uploadedConfusionRisks) {
    const entry = parsedLines.find(
      (p) => Math.abs(p.wavenumberCm1 - risk.targetLine.wavenumber) < 1.0
    );
    if (entry) {
      if (risk.riskLevel === 'critical') {
        entry.status = 'error';
      } else if (entry.status === 'valid') {
        entry.status = 'warning';
      }
      if (!entry.issueMessages.includes(risk.explanation)) {
        entry.issueMessages.push(risk.explanation);
      }
    }
  }

  // Compute bin uniformity of uploaded lines across the calibration range
  const {
    bins: uploadedBinDistribution,
    uniformityScore: uploadedUniformityScore,
  } = computeBinUniformity(
    matchedLines.filter(
      (l) =>
        l.wavenumber <= solution.scanHighCm1 + 5 &&
        l.wavenumber >= solution.scanLowCm1 - 5
    ),
    solution.absHighCm1,
    solution.absLowCm1,
    5
  );

  // Build the 6-Point Engineering Diagnostic Checklist
  const diagnostics: DiagnosticCheckItem[] = [];

  // Check 1: Spectral Range & Scan Bounds Coverage
  const outOfRangeCount = parsedLines.filter((p) => !p.inScanRange).length;
  const headerScanMismatch =
    detectedHeaders.scanHighCm1 !== undefined &&
    detectedHeaders.scanLowCm1 !== undefined &&
    (Math.abs(detectedHeaders.scanHighCm1 - solution.scanHighCm1) > 45 ||
      Math.abs(detectedHeaders.scanLowCm1 - solution.scanLowCm1) > 45);

  const highestUploaded =
    sortedParsed.length > 0 ? sortedParsed[0].wavenumberCm1 : 0;
  const lowestUploaded =
    sortedParsed.length > 0
      ? sortedParsed[sortedParsed.length - 1].wavenumberCm1
      : 0;

  if (parsedLines.length === 0) {
    diagnostics.push({
      id: 'chk-range',
      title: 'Spectral Scan Range & Line Coverage',
      category: 'Range & Bounds',
      status: 'fail',
      measuredValue: '0 valid neon lines found',
      expectedValue: `${solution.scanHighCm1.toFixed(1)} – ${solution.scanLowCm1.toFixed(1)} cm⁻¹`,
      summary: 'No valid Neon calibration wavenumbers were parsed from the uploaded text file.',
      recommendation: 'Include Neon emission wavenumbers (cm⁻¹) spanning the required grating scan range.',
    });
  } else if (outOfRangeCount > 0 || headerScanMismatch) {
    diagnostics.push({
      id: 'chk-range',
      title: 'Spectral Scan Range & Line Coverage',
      category: 'Range & Bounds',
      status: outOfRangeCount > 0 ? 'fail' : 'warning',
      measuredValue:
        detectedHeaders.scanHighCm1 && detectedHeaders.scanLowCm1
          ? `Header Scan ${detectedHeaders.scanHighCm1.toFixed(1)}–${detectedHeaders.scanLowCm1.toFixed(1)} cm⁻¹ (${outOfRangeCount} out-of-bounds)`
          : `Lines span ${highestUploaded.toFixed(1)}–${lowestUploaded.toFixed(1)} cm⁻¹ (${outOfRangeCount} out-of-bounds)`,
      expectedValue: `Scan ${solution.scanHighCm1.toFixed(1)}–${solution.scanLowCm1.toFixed(1)} cm⁻¹ (Abs ${solution.absHighCm1.toFixed(1)}–${solution.absLowCm1.toFixed(1)})`,
      summary:
        outOfRangeCount > 0
          ? `${outOfRangeCount} line(s) in the file fall outside the grating scan range for ${params.laserNm}nm + ${params.gratingLinesPerMm} l/mm.`
          : `Declared scan range in file header differs from calculated optical scan range.`,
      recommendation: `Restrict neon peaks to ${solution.scanHighCm1.toFixed(1)} – ${solution.scanLowCm1.toFixed(1)} cm⁻¹.`,
    });
  } else {
    diagnostics.push({
      id: 'chk-range',
      title: 'Spectral Scan Range & Line Coverage',
      category: 'Range & Bounds',
      status: 'pass',
      measuredValue: `${highestUploaded.toFixed(2)} – ${lowestUploaded.toFixed(2)} cm⁻¹ (${parsedLines.length} lines)`,
      expectedValue: `Scan ${solution.scanHighCm1.toFixed(1)} – ${solution.scanLowCm1.toFixed(1)} cm⁻¹`,
      summary: `All ${parsedLines.length} calibration lines lie within the active grating scan window for ${params.laserNm}nm / ${params.gratingLinesPerMm} l/mm.`,
    });
  }

  // Check 2: Primary Calibration Line (PCL) Centrality & Alignment Offset
  if (!uploadedPclLine) {
    diagnostics.push({
      id: 'chk-pcl',
      title: 'Primary Calibration Line (PCL) Centrality',
      category: 'Primary Calibration Line (PCL)',
      status: 'fail',
      measuredValue: 'None defined',
      expectedValue: `${solution.primaryCalibrationLine?.wavenumber.toFixed(2) || solution.absCentreCm1.toFixed(2)} cm⁻¹`,
      summary: 'No Primary Calibration Line (PCL) could be identified near the centre of the range.',
      recommendation: `Set PCL to ${solution.primaryCalibrationLine?.wavenumber.toFixed(2)} cm⁻¹ near range centre (${solution.absCentreCm1.toFixed(1)} cm⁻¹).`,
    });
  } else {
    const pclOffsetFromCentre = Math.abs(
      uploadedPclLine.wavenumber - solution.absCentreCm1
    );
    const maxCentralOffset = (solution.absHighCm1 - solution.absLowCm1) * 0.25;
    const isPclInFile = parsedLines.some(
      (p) => Math.abs(p.wavenumberCm1 - uploadedPclLine.wavenumber) < 1.5
    );
    if (!isPclInFile || pclOffsetFromCentre > maxCentralOffset) {
      diagnostics.push({
        id: 'chk-pcl',
        title: 'Primary Calibration Line (PCL) Centrality',
        category: 'Primary Calibration Line (PCL)',
        status: pclOffsetFromCentre > maxCentralOffset * 1.4 ? 'fail' : 'warning',
        measuredValue: `${uploadedPclLine.wavenumber.toFixed(2)} cm⁻¹ (Δ${pclOffsetFromCentre.toFixed(0)} cm⁻¹ from centre)`,
        expectedValue: `${solution.primaryCalibrationLine?.wavenumber.toFixed(2)} cm⁻¹ (Centre: ${solution.absCentreCm1.toFixed(1)} cm⁻¹)`,
        summary: !isPclInFile
          ? `Recommended PCL (${uploadedPclLine.wavenumber.toFixed(2)} cm⁻¹) is missing from the uploaded peak list.`
          : `PCL at ${uploadedPclLine.wavenumber.toFixed(2)} cm⁻¹ is displaced by ${pclOffsetFromCentre.toFixed(0)} cm⁻¹ from the calibration range centre (${solution.absCentreCm1.toFixed(1)} cm⁻¹), increasing uncalibrated drift at the far extreme.`,
        recommendation: `Align and offset the spectrograph on ${solution.primaryCalibrationLine?.wavenumber.toFixed(2)} cm⁻¹ so extreme lines do not drift beyond software capture bounds.`,
      });
    } else {
      diagnostics.push({
        id: 'chk-pcl',
        title: 'Primary Calibration Line (PCL) Centrality',
        category: 'Primary Calibration Line (PCL)',
        status: 'pass',
        measuredValue: `${uploadedPclLine.wavenumber.toFixed(2)} cm⁻¹ (${uploadedPclLine.wavelengthAirNm.toFixed(2)} nm)`,
        expectedValue: `Centre ${solution.absCentreCm1.toFixed(1)} cm⁻¹ (±${maxCentralOffset.toFixed(0)} cm⁻¹)`,
        summary: `PCL ${uploadedPclLine.wavenumber.toFixed(2)} cm⁻¹ is well-centered (offset ${pclOffsetFromCentre.toFixed(1)} cm⁻¹) with strong relative intensity (${uploadedPclLine.relativeIntensity}).`,
      });
    }
  }

  // Check 3: Adjacent Line Confusion & Misidentification Risk (e.g. 17484.88 vs 17347.80)
  const criticalConfusions = uploadedConfusionRisks.filter(
    (r) => r.riskLevel === 'critical'
  );
  const cautionConfusions = uploadedConfusionRisks.filter(
    (r) => r.riskLevel === 'caution'
  );

  if (criticalConfusions.length > 0) {
    const first = criticalConfusions[0];
    diagnostics.push({
      id: 'chk-confusion',
      title: 'Line Confusion & Pre-Calibration Drift Guard',
      category: 'Line Confusion & Spacing',
      status: 'fail',
      measuredValue: `${criticalConfusions.length} critical pair(s) (min Δ=${first.spacingCm1.toFixed(2)} cm⁻¹)`,
      expectedValue: `Spacing ≥ ${solution.minRequiredLineSpacingCm1.toFixed(0)} cm⁻¹`,
      summary: first.explanation,
      recommendation: `Remove one of the closely spaced lines (${first.targetLine.wavenumber.toFixed(2)} or ${first.neighborLine.wavenumber.toFixed(2)} cm⁻¹) so pre-calibration drift cannot swap peak identities.`,
    });
  } else if (cautionConfusions.length > 0) {
    const first = cautionConfusions[0];
    diagnostics.push({
      id: 'chk-confusion',
      title: 'Line Confusion & Pre-Calibration Drift Guard',
      category: 'Line Confusion & Spacing',
      status: 'warning',
      measuredValue: `${cautionConfusions.length} close pair(s) (Δ=${first.spacingCm1.toFixed(2)} cm⁻¹)`,
      expectedValue: `Spacing ≥ ${solution.minRequiredLineSpacingCm1.toFixed(0)} cm⁻¹`,
      summary: first.explanation,
      recommendation: `Verify manual PCL zeroing accuracy before scanning or prune ${first.neighborLine.wavenumber.toFixed(2)} cm⁻¹.`,
    });
  } else {
    diagnostics.push({
      id: 'chk-confusion',
      title: 'Line Confusion & Pre-Calibration Drift Guard',
      category: 'Line Confusion & Spacing',
      status: 'pass',
      measuredValue: '0 ambiguous peak pairs',
      expectedValue: `Spacing ≥ ${solution.minRequiredLineSpacingCm1.toFixed(0)} cm⁻¹`,
      summary: `All uploaded Neon lines have sufficient separation to prevent peak misidentification prior to polynomial calibration.`,
    });
  }

  // Check 4: Equal Dispersion & Anti-Clustering Across Calibration Range
  const emptyBins = uploadedBinDistribution.filter((b) => b.count === 0).length;
  const maxBinCount = Math.max(
    0,
    ...uploadedBinDistribution.map((b) => b.count)
  );
  if (uploadedUniformityScore < 60 || emptyBins >= 2) {
    diagnostics.push({
      id: 'chk-uniformity',
      title: 'Dispersion Uniformity Across Range (Unweighted Fit)',
      category: 'Dispersion Uniformity',
      status: 'fail',
      measuredValue: `${uploadedUniformityScore}% Uniformity (${emptyBins}/5 spectral zones empty)`,
      expectedValue: `≥ 78% Uniformity (all 5 spectral zones populated)`,
      summary: `Lines are heavily clustered (${maxBinCount} lines in one zone while ${emptyBins} zones are empty). Because the calibration fit is unweighted, central clustering degrades polynomial accuracy at the spectral extremes.`,
      recommendation: `Redistribute lines evenly across all 5 wavenumber bins (${solution.scanHighCm1.toFixed(0)} to ${solution.scanLowCm1.toFixed(0)} cm⁻¹).`,
    });
  } else if (uploadedUniformityScore < 78 || emptyBins === 1) {
    diagnostics.push({
      id: 'chk-uniformity',
      title: 'Dispersion Uniformity Across Range (Unweighted Fit)',
      category: 'Dispersion Uniformity',
      status: 'warning',
      measuredValue: `${uploadedUniformityScore}% Uniformity (${5 - emptyBins}/5 zones covered)`,
      expectedValue: `≥ 78% Uniformity (even spread)`,
      summary: `Moderate line density imbalance across the calibration span; ${emptyBins === 1 ? '1 spectral zone has no anchor line' : 'central bins have higher density than extremes'}.`,
      recommendation: 'Use Auto-Repair to balance Neon line spacing across all 5 spectral zones.',
    });
  } else {
    diagnostics.push({
      id: 'chk-uniformity',
      title: 'Dispersion Uniformity Across Range (Unweighted Fit)',
      category: 'Dispersion Uniformity',
      status: 'pass',
      measuredValue: `${uploadedUniformityScore}% Uniformity (5/5 zones populated)`,
      expectedValue: `≥ 78% Uniformity`,
      summary: 'Calibration lines are evenly dispersed across the full scan range, preventing polynomial edge warping.',
    });
  }

  // Compute lowest-wavenumber line CCD window and required step size for target hits/line
  let lowestLineAnalysis: FileAuditReport['lowestLineAnalysis'] = null;
  if (sortedParsed.length > 0) {
    const lowestWavenumberCm1 =
      sortedParsed[sortedParsed.length - 1].wavenumberCm1;
    const highestWavenumberCm1 = sortedParsed[0].wavenumberCm1;
    const boundsAtLowest = calculateCcdWindowBoundsCm1(
      lowestWavenumberCm1,
      params.gratingLinesPerMm,
      params.ccdActiveWidthPx,
      params.spectrograph,
      params.ccdActiveXMinPx,
      params.ccdActiveXMaxPx,
      params.ccdZeroOrderCentrePx,
      params.roomTemperatureC
    );
    const boundsAtHighest = calculateCcdWindowBoundsCm1(
      highestWavenumberCm1,
      params.gratingLinesPerMm,
      params.ccdActiveWidthPx,
      params.spectrograph,
      params.ccdActiveXMinPx,
      params.ccdActiveXMaxPx,
      params.ccdZeroOrderCentrePx,
      params.roomTemperatureC
    );
    const ccdWindowAtLowestCm1 = Number(boundsAtLowest.windowSpanCm1.toFixed(1));
    const ccdWindowAtHighestCm1 = Number(
      boundsAtHighest.windowSpanCm1.toFixed(1)
    );
    const targetHits = Math.max(2, params.targetOccurrencesPerLine);
    const exactStepCm1ForTargetHits = Number(
      (ccdWindowAtLowestCm1 / targetHits).toFixed(1)
    );
    const standardSteps = [
      10, 15, 20, 25, 30, 40, 50, 60, 75, 80, 100, 125, 150,
    ];
    const recommendedStepCm1AtLowest = standardSteps.reduce((prev, curr) =>
      Math.abs(curr - exactStepCm1ForTargetHits) <
      Math.abs(prev - exactStepCm1ForTargetHits)
        ? curr
        : prev
    );
    const achievedHitsAtLowestWithRecommendedStep = Number(
      (ccdWindowAtLowestCm1 / recommendedStepCm1AtLowest).toFixed(1)
    );
    const achievedHitsAtLowestWithCurrentStep = Number(
      (ccdWindowAtLowestCm1 / Math.max(1, solution.wireXStepAbsCm1)).toFixed(1)
    );
    const totalScansWithLowestStep = Math.round(
      solution.scanSpanCm1 / Math.max(1, recommendedStepCm1AtLowest)
    );

    lowestLineAnalysis = {
      lowestWavenumberCm1,
      highestWavenumberCm1,
      ccdWindowAtLowestCm1,
      ccdWindowAtHighestCm1,
      exactStepCm1ForTargetHits,
      recommendedStepCm1AtLowest,
      achievedHitsAtLowestWithRecommendedStep,
      achievedHitsAtLowestWithCurrentStep,
      totalScansWithLowestStep,
    };
  }

  // Check 5: Grating Turret Motor Step Size & CCD Occurrences
  const isVirsaAbsStep = params.spectrograph === 'Virsa';
  const expectedStepValue = isVirsaAbsStep
    ? (lowestLineAnalysis?.recommendedStepCm1AtLowest ??
      solution.wireXStepAbsCm1)
    : solution.recommendedMotorStepTicks;
  const fileStepTicks = detectedHeaders.motorStepTicks ?? expectedStepValue;
  const referenceWindowCm1 = isVirsaAbsStep
    ? (lowestLineAnalysis?.ccdWindowAtLowestCm1 ?? solution.ccdWindowLowCm1)
    : solution.ccdWindowCentreCm1;
  const shiftPerStep = isVirsaAbsStep
    ? fileStepTicks
    : fileStepTicks * (solution.ccdWindowCentreCm1 / 400);
  const achievedOccurrences = Number(
    (referenceWindowCm1 / Math.max(1, shiftPerStep)).toFixed(1)
  );
  const stepUnitLabel = isVirsaAbsStep ? 'Abs cm⁻¹/scan' : 'steps/scan';

  if (achievedOccurrences < params.targetOccurrencesPerLine * 0.75) {
    diagnostics.push({
      id: 'chk-step',
      title: 'Turret Motor Step Size & CCD Peak Occurrences',
      category: 'Motor Step & CCD Coverage',
      status: 'fail',
      measuredValue: `${fileStepTicks} ${stepUnitLabel} → ${achievedOccurrences} hits/CCD`,
      expectedValue: `≤ ${expectedStepValue} ${stepUnitLabel} (≥ ${params.targetOccurrencesPerLine} hits across ${params.ccdActiveWidthPx} px)`,
      summary: `Step size of ${fileStepTicks} (${shiftPerStep.toFixed(1)} cm⁻¹ per scan) yields only ${achievedOccurrences} occurrences of each line across the ${params.ccdActiveWidthPx} px active CCD window (target: ${params.targetOccurrencesPerLine}).`,
      recommendation: `Reduce turret step size to ${expectedStepValue} so each Neon peak is sampled ≥ ${params.targetOccurrencesPerLine} times across the lens/CCD field.`,
    });
  } else if (achievedOccurrences > params.targetOccurrencesPerLine * 1.8) {
    diagnostics.push({
      id: 'chk-step',
      title: 'Turret Motor Step Size & CCD Peak Occurrences',
      category: 'Motor Step & CCD Coverage',
      status: 'warning',
      measuredValue: `${fileStepTicks} ${stepUnitLabel} → ${achievedOccurrences} hits/CCD`,
      expectedValue: `${expectedStepValue} ${stepUnitLabel} (${params.targetOccurrencesPerLine} hits/CCD)`,
      summary: `Step size of ${fileStepTicks} oversamples each peak (${achievedOccurrences} occurrences), unnecessarily increasing calibration scan time.`,
      recommendation: `Increase step size to ${expectedStepValue} to achieve ${params.targetOccurrencesPerLine} occurrences with faster calibration throughput.`,
    });
  } else {
    diagnostics.push({
      id: 'chk-step',
      title: 'Turret Motor Step Size & CCD Peak Occurrences',
      category: 'Motor Step & CCD Coverage',
      status: 'pass',
      measuredValue: `${fileStepTicks} ${stepUnitLabel} (${achievedOccurrences} hits across ${params.ccdActiveWidthPx} px)`,
      expectedValue: `${expectedStepValue} ${stepUnitLabel} (${params.targetOccurrencesPerLine} hits target)`,
      summary: `Step size achieves ${achievedOccurrences} repetitions of each Neon peak across the ${params.ccdActiveWidthPx}×${params.ccdActiveHeightPx} px (${params.ccdType}) active sensor region.`,
    });
  }

  // Check 6: NIST Neon Catalog Wavenumber Fidelity
  const unrecognizedLines = parsedLines.filter((p) => !p.matchedCatalogLine);
  const driftedCatalogLines = parsedLines.filter(
    (p) => p.matchedCatalogLine && Math.abs(p.catalogDeltaCm1 || 0) > 0.6
  );

  if (unrecognizedLines.length > 0) {
    diagnostics.push({
      id: 'chk-catalog',
      title: 'NIST Neon I Reference Catalog Verification',
      category: 'Catalog Fidelity',
      status: 'fail',
      measuredValue: `${unrecognizedLines.length} unrecognized peak(s)`,
      expectedValue: '100% matched within ±0.50 cm⁻¹',
      summary: `${unrecognizedLines.length} wavenumber(s) (${unrecognizedLines.map((u) => u.wavenumberCm1).join(', ')} cm⁻¹) do not match known Neon I emission lines.`,
      recommendation: 'Replace unrecognized values with verified NIST Neon I emission wavenumbers.',
    });
  } else if (driftedCatalogLines.length > 0) {
    diagnostics.push({
      id: 'chk-catalog',
      title: 'NIST Neon I Reference Catalog Verification',
      category: 'Catalog Fidelity',
      status: 'warning',
      measuredValue: `${driftedCatalogLines.length} slightly rounded line(s)`,
      expectedValue: 'Exact 2-decimal NIST wavenumbers',
      summary: `${driftedCatalogLines.length} line(s) deviate by >0.6 cm⁻¹ from standard vacuum/air-corrected Neon reference values.`,
      recommendation: 'Snap wavenumbers to exact 2-decimal reference catalog values.',
    });
  } else {
    diagnostics.push({
      id: 'chk-catalog',
      title: 'NIST Neon I Reference Catalog Verification',
      category: 'Catalog Fidelity',
      status: 'pass',
      measuredValue: `${parsedLines.length}/${parsedLines.length} verified Ne I peaks`,
      expectedValue: '100% matched within ±0.50 cm⁻¹',
      summary: 'Every wavenumber in the file matches an authentic Neon I atomic emission line with sufficient intensity.',
    });
  }

  const passCount = diagnostics.filter((d) => d.status === 'pass').length;
  const warnCount = diagnostics.filter((d) => d.status === 'warning').length;
  const failCount = diagnostics.filter((d) => d.status === 'fail').length;
  const overallStatus =
    failCount > 0 ? 'FAIL' : warnCount > 0 ? 'WARN' : 'PASS';

  const spectralOriginSummary = analyzeSpectralLineBatch(parsedLines);

  return {
    fileName,
    rawContent,
    detectedHeaders,
    parsedLines,
    matchedLines,
    spectralOriginSummary,
    overallStatus,
    passCount,
    warnCount,
    failCount,
    diagnostics,
    uploadedBinDistribution,
    uploadedUniformityScore,
    uploadedConfusionRisks,
    achievedOccurrencesPerLine: achievedOccurrences,
    lowestLineAnalysis,
    solution,
  };
}

/**
 * Generates a clean, standardized factory calibration file (.cal / .txt)
 * from a solved CalibrationSolution.
 */
export function generateCalibrationFileText(
  solution: CalibrationSolution
): string {
  const { params } = solution;
  const headerLines = [
    `# ============================================================================`,
    `# SPECTROGRAPH NEON CALIBRATION SPECIFICATION`,
    `# ============================================================================`,
    `Spectrograph: ${params.spectrograph}`,
    `Laser: ${params.laserNm}nm (${solution.laserWavenumberCm1.toFixed(1)} cm-1)`,
    `Grating: ${params.gratingLinesPerMm} l/mm`,
    `Filter: ${params.filterType === 'standard' ? 'Standard' : params.filterType === 'rpl_pl' ? 'RPL/PL Extended' : 'Custom'} (${solution.effectiveRamanMinCm1}-${solution.effectiveRamanMaxCm1} cm-1 Raman Shift)`,
    `CCD: ${params.ccdType} (${params.ccdActiveWidthPx}x${params.ccdActiveHeightPx} active ROI of ${params.ccdTotalWidthPx}x${params.ccdTotalHeightPx} px)`,
    `AbsRange: ${solution.absHighCm1.toFixed(1)} - ${solution.absLowCm1.toFixed(1)} cm-1 (Centre: ${solution.absCentreCm1.toFixed(2)} cm-1)`,
    `ScanRange: ${solution.scanHighCm1.toFixed(1)} - ${solution.scanLowCm1.toFixed(1)} cm-1`,
    `PCL: ${solution.primaryCalibrationLine ? solution.primaryCalibrationLine.wavenumber.toFixed(2) : 'N/A'}`,
    `2ndCalLine: ${solution.secondaryCalibrationLine ? solution.secondaryCalibrationLine.wavenumber.toFixed(2) : 'N/A'}`,
    `MotorStep: ${solution.recommendedMotorStepTicks}`,
    `TargetOccurrences: ${params.targetOccurrencesPerLine} (Achieved: ${solution.achievedOccurrencesAtCentre} hits/line across CCD)`,
    `DispersionUniformity: ${solution.dispersionUniformityScore}%`,
    `# ----------------------------------------------------------------------------`,
    `# Wavenumber(cm-1)   Intensity   Wavelength(nm)   Role        Transition`,
    `# ----------------------------------------------------------------------------`,
  ];

  const rows = solution.selectedLines.map((line) => {
    const isPcl = solution.primaryCalibrationLine?.id === line.id;
    const isSec =
      !isPcl && solution.secondaryCalibrationLine?.id === line.id;
    const role = isPcl ? 'PCL' : isSec ? '2ND' : 'CAL';
    return `${line.wavenumber.toFixed(2).padEnd(20)} ${String(line.relativeIntensity).padEnd(11)} ${line.wavelengthAirNm.toFixed(3).padEnd(16)} ${role.padEnd(11)} # ${line.transition}`;
  });

  return [...headerLines, ...rows, ''].join('\n');
}
