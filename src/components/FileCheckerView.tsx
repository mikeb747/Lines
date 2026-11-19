import React, { useRef, useState } from 'react';
import {
  FileAuditReport,
} from '../calibration/fileAuditor';
import {
  calculateCcdWindowBoundsCm1,
  CalibrationParameters,
} from '../calibration/physicsEngine';
import { SpectralDispersionChart } from './SpectralDispersionChart';
import { DeferredNumberInput } from './DeferredNumberInput';
import {
  Upload,
  Wand2,
  Download,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Sparkles,
  Filter,
  Trash2,
} from 'lucide-react';

interface FileCheckerViewProps {
  auditReport: FileAuditReport;
  params: CalibrationParameters;
  onChangeParams: (nextParams: CalibrationParameters) => void;
  onUpdateFileContent: (fileName: string, content: string) => void;
  onAutoRepairFile: () => void;
  onLoadFlawedDemo: () => void;
  onLoadEmpirical1800Lns?: () => void;
  onLoadEmpiricalVirsa2400?: () => void;
  onExportCalFile: () => void;
}

export const FileCheckerView: React.FC<FileCheckerViewProps> = ({
  auditReport,
  params,
  onChangeParams,
  onUpdateFileContent,
  onAutoRepairFile,
  onLoadFlawedDemo,
  onLoadEmpirical1800Lns,
  onLoadEmpiricalVirsa2400,
  onExportCalFile,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [originFilter, setOriginFilter] = useState<'all' | 'flagged' | 'ne1'>('all');
  const [showNistComparisonTable, setShowNistComparisonTable] = useState<boolean>(true);
  const {
    solution,
    diagnostics,
    parsedLines,
    lowestLineAnalysis,
    spectralOriginSummary,
  } = auditReport;

  const flaggedLineCount =
    spectralOriginSummary.secondOrderCount +
    spectralOriginSummary.thirdOrderCount +
    spectralOriginSummary.traceImpurityCount +
    spectralOriginSummary.unidentifiedCount;

  const totalFirstOrderNe1Count =
    spectralOriginSummary.authenticNe1Count +
    spectralOriginSummary.coincidentalOverlapCount;

  const handleInjectTestImpurities = () => {
    const sampleBlock = [
      '',
      '# --- TEST INJECTED HIGHER-ORDER DIFFRACTION & TRACE ARGON IMPURITIES ---',
      '15043.30\t420',
      '14502.42\t880',
      '14356.61\t1450',
      '13141.37\t310',
    ].join('\n');
    const nextContent = auditReport.rawContent.trimEnd() + '\n' + sampleBlock + '\n';
    onUpdateFileContent(auditReport.fileName, nextContent);
    setOriginFilter('flagged');
    setShowNistComparisonTable(true);
  };

  const handlePruneFlaggedImpurities = () => {
    const flaggedLineNumbers = new Set(
      parsedLines
        .filter((p) => p.originAnalysis.isFlaggedAnomaly)
        .map((p) => p.rawLineNumber)
    );
    const rawRows = auditReport.rawContent.split(/\r?\n/);
    const cleanedRows = rawRows.filter(
      (line, idx) =>
        !flaggedLineNumbers.has(idx + 1) &&
        !line.includes('TEST INJECTED HIGHER-ORDER DIFFRACTION')
    );
    onUpdateFileContent(auditReport.fileName, cleanedRows.join('\n'));
    setOriginFilter('all');
  };

  const filteredOriginEntries = spectralOriginSummary.entries.filter((entry) => {
    if (originFilter === 'flagged') {
      return (
        entry.isFlaggedAnomaly ||
        entry.classification === 'ne1_with_coincidental_overlap'
      );
    }
    if (originFilter === 'ne1') {
      return (
        entry.classification === 'authentic_ne1_first_order' ||
        entry.classification === 'ne1_with_coincidental_overlap'
      );
    }
    return true;
  });

  const startViewBounds = calculateCcdWindowBoundsCm1(
    solution.absLowCm1,
    params.gratingLinesPerMm,
    params.ccdActiveWidthPx,
    params.spectrograph,
    params.ccdActiveXMinPx,
    params.ccdActiveXMaxPx,
    params.ccdZeroOrderCentrePx,
    params.roomTemperatureC
  );

  const endViewBounds = calculateCcdWindowBoundsCm1(
    solution.absHighCm1,
    params.gratingLinesPerMm,
    params.ccdActiveWidthPx,
    params.spectrograph,
    params.ccdActiveXMinPx,
    params.ccdActiveXMaxPx,
    params.ccdZeroOrderCentrePx,
    params.roomTemperatureC
  );

  const lowestLineViewBounds = lowestLineAnalysis
    ? calculateCcdWindowBoundsCm1(
        lowestLineAnalysis.lowestWavenumberCm1,
        params.gratingLinesPerMm,
        params.ccdActiveWidthPx,
        params.spectrograph,
        params.ccdActiveXMinPx,
        params.ccdActiveXMaxPx,
        params.ccdZeroOrderCentrePx,
        params.roomTemperatureC
      )
    : null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const content = String(ev.target?.result || '');
      onUpdateFileContent(file.name, content);
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-6">
      {/* Top Action & Audit Status Banner */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-5">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-3">
            <span
              className={`inline-flex items-center gap-1.5 text-sm font-mono font-semibold ${
                auditReport.overallStatus === 'PASS'
                  ? 'text-emerald-700'
                  : auditReport.overallStatus === 'WARN'
                    ? 'text-amber-700'
                    : 'text-rose-700'
              }`}
            >
              {auditReport.overallStatus === 'PASS' && (
                <CheckCircle2 className="h-4 w-4 shrink-0" />
              )}
              {auditReport.overallStatus === 'WARN' && (
                <AlertTriangle className="h-4 w-4 shrink-0" />
              )}
              {auditReport.overallStatus === 'FAIL' && (
                <XCircle className="h-4 w-4 shrink-0" />
              )}
              <span>
                {auditReport.overallStatus === 'PASS'
                  ? '● CALIBRATION FILE VERIFIED (PASS)'
                  : auditReport.overallStatus === 'WARN'
                    ? '▲ CALIBRATION WARNINGS DETECTED'
                    : '✖ CALIBRATION SPECIFICATION FAILED'}
              </span>
            </span>
            <span className="text-slate-300" aria-hidden="true">
              ·
            </span>
            <span className="font-mono text-xs text-slate-600">
              File: {auditReport.fileName}
            </span>
            <span className="text-slate-300" aria-hidden="true">
              ·
            </span>
            <span className="font-mono text-xs text-slate-600 tabular-nums">
              {auditReport.passCount} Pass / {auditReport.warnCount} Warn /{' '}
              {auditReport.failCount} Fail
            </span>
          </div>
          <p className="text-xs text-slate-600">
            Auditing uploaded file against calculated{' '}
            <strong>
              {solution.params.spectrograph} · {solution.params.laserNm} nm ·{' '}
              {solution.params.gratingLinesPerMm} l/mm
            </strong>{' '}
            parameters (Abs Range{' '}
            <span className="font-mono tabular-nums">
              {Math.round(solution.absLowCm1)}–{Math.round(solution.absHighCm1)}{' '}
              cm⁻¹
            </span>
            , Scan Range{' '}
            <span className="font-mono tabular-nums">
              {Math.round(solution.scanLowCm1)}–{Math.round(solution.scanHighCm1)}{' '}
              cm⁻¹
            </span>
            ).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <input
            ref={fileInputRef}
            type="file"
            accept=".txt,.cal,.lns,.csv,.dat,.cfg"
            onChange={handleFileUpload}
            className="hidden"
            aria-label="Upload Calibration Text File"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-medium text-slate-800 hover:bg-slate-50 transition-colors whitespace-nowrap"
          >
            <Upload className="h-3.5 w-3.5" />
            Upload Text File
          </button>

          <button
            type="button"
            onClick={onAutoRepairFile}
            className="inline-flex items-center gap-1.5 rounded-lg bg-cyan-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-cyan-700 transition-colors whitespace-nowrap"
          >
            <Wand2 className="h-3.5 w-3.5" />
            Auto-Repair & Apply Optimal Lines
          </button>
        </div>
      </div>

      {/* Interactive Range & Uploaded Lowest-Wavenumber Step Size Calculator */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Left Card: Manual Absolute Calibration Range & Grating Turret Scan Range Recalculation */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">
                Absolute Calibration Range &amp; Turret View Calculator
              </h3>
              <p className="text-xs text-slate-500">
                Edit Start &amp; End (lower number first, nearest whole number)
                to recalculate Grating Turret Scan Range, View Windows &amp;
                Raman Shift
              </p>
            </div>
            {(params.customAbsLowCm1 != null ||
              params.customAbsHighCm1 != null) && (
              <button
                type="button"
                onClick={() =>
                  onChangeParams({
                    ...params,
                    customAbsLowCm1: null,
                    customAbsHighCm1: null,
                  })
                }
                className="rounded-md border border-slate-200 px-2.5 py-1 text-xs font-medium text-cyan-700 hover:bg-slate-50 whitespace-nowrap"
              >
                Reset to Filter Default
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3 pt-1">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Start (Lower Abs cm⁻¹)
              </label>
              <DeferredNumberInput
                integer
                min={1000}
                max={40000}
                ariaLabel="Start (Lower Abs cm-1)"
                value={Math.round(solution.absLowCm1)}
                onCommit={(val) => {
                  onChangeParams({
                    ...params,
                    customAbsLowCm1: Math.round(val),
                    customAbsHighCm1: Math.round(
                      params.customAbsHighCm1 ?? solution.absHighCm1
                    ),
                  });
                }}
                className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-sm font-mono font-bold text-slate-900 focus:border-cyan-600 focus:outline-none tabular-nums"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                End (Higher Abs cm⁻¹)
              </label>
              <DeferredNumberInput
                integer
                min={1000}
                max={45000}
                ariaLabel="End (Higher Abs cm-1)"
                value={Math.round(solution.absHighCm1)}
                onCommit={(val) => {
                  onChangeParams({
                    ...params,
                    customAbsLowCm1: Math.round(
                      params.customAbsLowCm1 ?? solution.absLowCm1
                    ),
                    customAbsHighCm1: Math.round(val),
                  });
                }}
                className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-sm font-mono font-bold text-slate-900 focus:border-cyan-600 focus:outline-none tabular-nums"
              />
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 space-y-1.5 text-xs font-mono tabular-nums">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-slate-500">
                Absolute Calibration Range:
              </span>
              <span className="font-bold text-slate-900">
                {Math.round(solution.absLowCm1)} –{' '}
                {Math.round(solution.absHighCm1)} cm⁻¹
              </span>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-slate-500">Centre &amp; Raman Shift:</span>
              <span className="font-semibold text-slate-800">
                Centre: {Math.round(solution.absCentreCm1)} cm⁻¹ (
                {Math.round(solution.effectiveRamanMinCm1)}–
                {Math.round(solution.effectiveRamanMaxCm1)} Raman)
              </span>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 pt-1.5">
              <span className="text-slate-500">
                Grating Turret Scan Range:
              </span>
              <span className="font-bold text-cyan-800">
                {Math.round(solution.scanLowCm1)} –{' '}
                {Math.round(solution.scanHighCm1)} cm⁻¹
              </span>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-600">
              <span>
                Start View (@ {Math.round(solution.absLowCm1)} cm⁻¹):
              </span>
              <span>
                {Math.round(startViewBounds.windowLowAbsCm1)} –{' '}
                {Math.round(startViewBounds.windowHighAbsCm1)} cm⁻¹ (Win:{' '}
                {Math.round(startViewBounds.windowSpanCm1)} cm⁻¹)
              </span>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-600">
              <span>
                End View (@ {Math.round(solution.absHighCm1)} cm⁻¹):
              </span>
              <span>
                {Math.round(endViewBounds.windowLowAbsCm1)} –{' '}
                {Math.round(endViewBounds.windowHighAbsCm1)} cm⁻¹ (Win:{' '}
                {Math.round(endViewBounds.windowSpanCm1)} cm⁻¹)
              </span>
            </div>
          </div>
        </div>

        {/* Right Card: Uploaded Text File Lowest Wavenumber Step-Size Calculator */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">
                Lowest File Wavenumber Step-Size Calculator
              </h3>
              <p className="text-xs text-slate-500">
                Uses the lowest wavenumber in{' '}
                <span className="font-mono font-medium text-slate-700">
                  {auditReport.fileName}
                </span>{' '}
                (narrowest CCD view window) to calculate the step size required
                for your target hits/line
              </p>
            </div>
          </div>

          {lowestLineAnalysis && lowestLineViewBounds ? (
            <>
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                  <div className="text-[11px] text-slate-500">
                    Lowest Wavenumber in File
                  </div>
                  <div className="text-base font-mono font-bold text-slate-900 tabular-nums">
                    {lowestLineAnalysis.lowestWavenumberCm1.toFixed(2)}{' '}
                    <span className="text-xs font-normal text-slate-500">
                      cm⁻¹
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Required Target Hits / Line
                  </label>
                  <DeferredNumberInput
                    integer
                    min={1}
                    max={40}
                    ariaLabel="Required Target Hits / Line"
                    value={params.targetOccurrencesPerLine}
                    onCommit={(val) =>
                      onChangeParams({
                        ...params,
                        targetOccurrencesPerLine: val,
                      })
                    }
                    className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-sm font-mono font-bold text-slate-900 focus:border-cyan-600 focus:outline-none tabular-nums"
                  />
                </div>
              </div>

              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 space-y-1.5 text-xs font-mono tabular-nums">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-slate-500">
                    CCD View @ {lowestLineAnalysis.lowestWavenumberCm1.toFixed(2)}{' '}
                    cm⁻¹:
                  </span>
                  <span className="font-semibold text-slate-900">
                    {Math.round(lowestLineViewBounds.windowLowAbsCm1)} –{' '}
                    {Math.round(lowestLineViewBounds.windowHighAbsCm1)} cm⁻¹ (
                    {lowestLineAnalysis.ccdWindowAtLowestCm1.toFixed(1)} cm⁻¹
                    wide)
                  </span>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-slate-500">
                    Exact Step for {params.targetOccurrencesPerLine} Hits /
                    Line:
                  </span>
                  <span className="font-semibold text-cyan-800">
                    {lowestLineAnalysis.exactStepCm1ForTargetHits.toFixed(1)}{' '}
                    cm⁻¹ ({lowestLineAnalysis.ccdWindowAtLowestCm1.toFixed(1)} ÷{' '}
                    {params.targetOccurrencesPerLine})
                  </span>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 pt-1.5">
                  <span className="text-slate-500">
                    Recommended Turret Step Size:
                  </span>
                  <span className="font-bold text-emerald-700">
                    {lowestLineAnalysis.recommendedStepCm1AtLowest} cm⁻¹ →{' '}
                    {lowestLineAnalysis.achievedHitsAtLowestWithRecommendedStep}{' '}
                    hits/line ({lowestLineAnalysis.totalScansWithLowestStep}{' '}
                    scans)
                  </span>
                </div>
                {(() => {
                  const fileStepCm1 =
                    auditReport.detectedHeaders.motorStepTicks ??
                    solution.wireXStepAbsCm1;
                  const hitsAtLowestWithFileStep = Number(
                    (
                      lowestLineAnalysis.ccdWindowAtLowestCm1 /
                      Math.max(1, fileStepCm1)
                    ).toFixed(1)
                  );
                  const hitsAtHighestWithFileStep = Number(
                    (
                      lowestLineAnalysis.ccdWindowAtHighestCm1 /
                      Math.max(1, fileStepCm1)
                    ).toFixed(1)
                  );
                  return (
                    <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-600">
                      <span>
                        File Header Step ({fileStepCm1} cm⁻¹) @{' '}
                        {lowestLineAnalysis.lowestWavenumberCm1.toFixed(2)} cm⁻¹:
                      </span>
                      <span>
                        {hitsAtLowestWithFileStep} hits/line at lowest vs{' '}
                        {hitsAtHighestWithFileStep} hits/line at{' '}
                        {lowestLineAnalysis.highestWavenumberCm1.toFixed(2)}{' '}
                        cm⁻¹
                      </span>
                    </div>
                  );
                })()}
              </div>
            </>
          ) : (
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-xs text-slate-500">
              Upload or paste a calibration text file containing at least one
              wavenumber line to calculate the CCD view window and optimal step
              size at the lowest wavenumber.
            </div>
          )}
        </div>
      </div>

      {/* 6-Point Engineering Audit Grid */}
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 p-5 border-b border-slate-200">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">
              6-Point Optical Calibration Verification Checks
            </h3>
            <p className="text-xs text-slate-500">
              Evaluates range bounds, PCL centrality, adjacent peak confusion
              drift, unweighted dispersion uniformity, and CCD step occurrences
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {onLoadEmpiricalVirsa2400 && (
              <button
                type="button"
                onClick={onLoadEmpiricalVirsa2400}
                className="text-xs font-medium text-emerald-800 hover:text-emerald-950 underline underline-offset-2 whitespace-nowrap"
              >
                Load Empirical Virsa 532nm 2400 (50µm Fibre · 29 Calibrated Lines)
              </button>
            )}
            {onLoadEmpirical1800Lns && (
              <button
                type="button"
                onClick={onLoadEmpirical1800Lns}
                className="text-xs font-medium text-amber-800 hover:text-amber-950 underline underline-offset-2 whitespace-nowrap"
              >
                Load Empirical inVia 532nm 1800 .LNS (Multi-Exposure)
              </button>
            )}
            <button
              type="button"
              onClick={onLoadFlawedDemo}
              className="text-xs font-medium text-cyan-700 hover:text-cyan-900 underline underline-offset-2 whitespace-nowrap"
            >
              Load 532nm Flawed Draft (17484.88 vs 17347.80 Confusion Demo)
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-slate-200">
          {diagnostics.map((chk, idx) => {
            const statusText =
              chk.status === 'pass'
                ? '● Nominal'
                : chk.status === 'warning'
                  ? '▲ Warning'
                  : '✖ Failed';
            const statusColor =
              chk.status === 'pass'
                ? 'text-emerald-700'
                : chk.status === 'warning'
                  ? 'text-amber-700'
                  : 'text-rose-700';

            return (
              <div
                key={chk.id}
                className={`flex flex-col justify-between p-5 space-y-3 ${
                  idx >= 3 ? 'xl:border-t xl:border-slate-200' : ''
                } ${idx >= 2 ? 'md:border-t xl:border-t-0 md:border-slate-200' : ''}`}
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-medium text-slate-500">
                      {chk.category}
                    </span>
                    <span
                      className={`font-mono text-xs font-semibold ${statusColor}`}
                    >
                      {statusText}
                    </span>
                  </div>
                  <h4 className="text-xs font-semibold text-slate-900">
                    {chk.title}
                  </h4>
                  <p className="text-xs leading-relaxed text-slate-600">
                    {chk.summary}
                  </p>
                </div>

                <div className="space-y-1.5 border-t border-slate-100 pt-2.5 text-[11px] font-mono">
                  <div className="flex justify-between gap-2">
                    <span className="text-slate-500">Measured:</span>
                    <span className="font-medium text-slate-900 text-right tabular-nums">
                      {chk.measuredValue}
                    </span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-slate-500">Expected:</span>
                    <span className="text-cyan-800 text-right tabular-nums">
                      {chk.expectedValue}
                    </span>
                  </div>
                  {chk.recommendation && (
                    <p className="pt-1 font-sans text-[11px] font-medium text-amber-800">
                      Fix: {chk.recommendation}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Automated Diffraction Order (m=1, 2, 3) & Trace Gas Impurity (Ar I / Hg I) Analyzer */}
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-5 border-b border-slate-200 bg-slate-50/70">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2.5">
              <Sparkles className="h-4 w-4 text-cyan-700 shrink-0" />
              <h3 className="text-sm font-semibold text-slate-900">
                Automated Diffraction Order (m=1, 2, 3) &amp; Trace Gas Impurity (Ar I / Hg I) Analyzer
              </h3>
              <span
                className={`font-mono text-xs font-semibold ${
                  flaggedLineCount === 0
                    ? 'text-emerald-700'
                    : 'text-amber-700'
                }`}
              >
                {flaggedLineCount === 0
                  ? '● 100% Pure 1st-Order Ne I'
                  : `▲ ${flaggedLineCount} Impurity / Higher-Order Line(s) Flagged`}
              </span>
            </div>
            <p className="text-xs text-slate-600">
              {spectralOriginSummary.overallAssessment}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleInjectTestImpurities}
              className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-900 hover:bg-amber-100 transition-colors whitespace-nowrap"
            >
              <Filter className="h-3.5 w-3.5" />
              Test-Inject m=2/3 Orders &amp; Ar I Peaks
            </button>
            {flaggedLineCount > 0 && (
              <button
                type="button"
                onClick={handlePruneFlaggedImpurities}
                className="inline-flex items-center gap-1.5 rounded-lg border border-rose-300 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-800 hover:bg-rose-100 transition-colors whitespace-nowrap"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Prune Flagged Impurities ({flaggedLineCount})
              </button>
            )}
            <button
              type="button"
              onClick={() =>
                setShowNistComparisonTable((prev) => !prev)
              }
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors whitespace-nowrap"
            >
              {showNistComparisonTable
                ? 'Hide NIST Air/Vac Table'
                : 'Show NIST Air/Vac Table'}
            </button>
          </div>
        </div>

        {/* Summary KPI Strip */}
        <div className="grid grid-cols-2 lg:grid-cols-4 divide-y lg:divide-y-0 lg:divide-x divide-slate-200 border-b border-slate-200">
          <div className="p-4">
            <div className="text-[11px] font-medium text-slate-500">
              1st-Order Neon I (m = 1)
            </div>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="text-lg font-mono font-bold text-emerald-700 tabular-nums">
                {totalFirstOrderNe1Count} /{' '}
                {spectralOriginSummary.totalAnalyzed}
              </span>
              <span className="text-[11px] font-mono text-slate-500">
                Ne I 3s–3p / 3p–4d
              </span>
            </div>
          </div>

          <div className="p-4">
            <div className="text-[11px] font-medium text-slate-500">
              2nd &amp; 3rd-Order Diffraction (m = 2, 3)
            </div>
            <div className="mt-1 flex items-baseline justify-between">
              <span
                className={`text-lg font-mono font-bold tabular-nums ${
                  spectralOriginSummary.secondOrderCount +
                    spectralOriginSummary.thirdOrderCount >
                  0
                    ? 'text-rose-700'
                    : 'text-slate-900'
                }`}
              >
                {spectralOriginSummary.secondOrderCount +
                  spectralOriginSummary.thirdOrderCount}
              </span>
              <span className="text-[11px] font-mono text-slate-500">
                m=2: {spectralOriginSummary.secondOrderCount} · m=3:{' '}
                {spectralOriginSummary.thirdOrderCount}
              </span>
            </div>
          </div>

          <div className="p-4">
            <div className="text-[11px] font-medium text-slate-500">
              Trace Gas Impurities (Ar I / Hg I)
            </div>
            <div className="mt-1 flex items-baseline justify-between">
              <span
                className={`text-lg font-mono font-bold tabular-nums ${
                  spectralOriginSummary.traceImpurityCount > 0
                    ? 'text-amber-700'
                    : 'text-slate-900'
                }`}
              >
                {spectralOriginSummary.traceImpurityCount}
              </span>
              <span className="text-[11px] font-mono text-slate-500">
                Penning Ar (~0.5%) / Hg
              </span>
            </div>
          </div>

          <div className="p-4">
            <div className="text-[11px] font-medium text-slate-500">
              Coincidental Ne I + Ar I Overlaps
            </div>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="text-lg font-mono font-bold text-cyan-800 tabular-nums">
                {spectralOriginSummary.coincidentalOverlapCount}
              </span>
              <span className="text-[11px] font-mono text-slate-500">
                e.g. 17835.71 cm⁻¹ (560.67 nm)
              </span>
            </div>
          </div>
        </div>

        {/* Collapsible NIST Air (20 °C) vs Vacuum Wavenumber & Origin Table */}
        {showNistComparisonTable && (
          <div className="p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-xs text-slate-600">
                Comparing measured wavenumbers against{' '}
                <strong>
                  NIST Air ({(params.roomTemperatureC ?? 20).toFixed(1)} °C, 1
                  atm, n ≈ {solution.thermalOptics.airRefractiveIndex.toFixed(6)})
                </strong>{' '}
                and <strong>NIST Vacuum (ν̃_vac = ν̃_air / n_air)</strong> plus
                diffraction order folding (ν̃_app = ν̃_true / m).
              </div>

              <div className="inline-flex rounded-lg border border-slate-200 bg-slate-100 p-0.5 text-xs">
                <button
                  type="button"
                  onClick={() => setOriginFilter('all')}
                  className={`rounded-md px-2.5 py-1 font-medium transition-colors ${
                    originFilter === 'all'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  All Lines ({spectralOriginSummary.totalAnalyzed})
                </button>
                <button
                  type="button"
                  onClick={() => setOriginFilter('flagged')}
                  className={`rounded-md px-2.5 py-1 font-medium transition-colors ${
                    originFilter === 'flagged'
                      ? 'bg-white text-amber-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Flagged &amp; Overlaps (
                  {flaggedLineCount +
                    spectralOriginSummary.coincidentalOverlapCount}
                  )
                </button>
                <button
                  type="button"
                  onClick={() => setOriginFilter('ne1')}
                  className={`rounded-md px-2.5 py-1 font-medium transition-colors ${
                    originFilter === 'ne1'
                      ? 'bg-white text-emerald-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  1st-Order Ne I ({totalFirstOrderNe1Count})
                </button>
              </div>
            </div>

            <div className="overflow-x-auto max-h-96 border border-slate-200 rounded-lg">
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 bg-slate-100 border-b border-slate-200 text-[11px] font-semibold text-slate-600">
                  <tr>
                    <th className="py-2 px-3 text-right">File (cm⁻¹)</th>
                    <th className="py-2 px-3 text-right">
                      NIST Air 20°C (cm⁻¹)
                    </th>
                    <th className="py-2 px-3 text-right">Δ_Air (cm⁻¹)</th>
                    <th className="py-2 px-3 text-right">NIST Vac (cm⁻¹)</th>
                    <th className="py-2 px-3 text-right">Δ_Vac (cm⁻¹)</th>
                    <th className="py-2 px-3 text-right">True λ_air (nm)</th>
                    <th className="py-2 px-3 text-center">Order (m)</th>
                    <th className="py-2 px-3">Species &amp; Origin</th>
                    <th className="py-2 px-3">Spectroscopic Diagnostic</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-xs font-mono tabular-nums">
                  {filteredOriginEntries.length === 0 ? (
                    <tr>
                      <td
                        colSpan={9}
                        className="py-6 text-center font-sans text-xs text-slate-500"
                      >
                        No lines match the selected filter.
                      </td>
                    </tr>
                  ) : (
                    filteredOriginEntries.map((entry, idx) => {
                      const isHigherOrder =
                        entry.classification === 'second_order_diffraction' ||
                        entry.classification === 'third_order_diffraction';
                      const isImpurity =
                        entry.classification === 'trace_gas_impurity';
                      const isUnrecognized =
                        entry.classification === 'unidentified_peak';

                      const badgeColor = isHigherOrder
                        ? 'text-rose-700 font-bold'
                        : isImpurity
                          ? 'text-amber-700 font-bold'
                          : isUnrecognized
                            ? 'text-rose-700'
                            : entry.classification ===
                                'ne1_with_coincidental_overlap'
                              ? 'text-cyan-800 font-semibold'
                              : 'text-emerald-700 font-semibold';

                      const trueLambda =
                        entry.nistWavelengthAirNm ??
                        entry.observedWavelengthAirNm;

                      return (
                        <tr
                          key={`${entry.observedWavenumberCm1}-${idx}`}
                          className={
                            isHigherOrder
                              ? 'bg-rose-50/50 hover:bg-rose-50'
                              : isImpurity
                                ? 'bg-amber-50/50 hover:bg-amber-50'
                                : 'hover:bg-slate-50'
                          }
                        >
                          <td className="py-2 px-3 text-right font-semibold text-slate-900">
                            {entry.observedWavenumberCm1.toFixed(2)}
                          </td>
                          <td className="py-2 px-3 text-right text-slate-700">
                            {entry.nistWavenumberAirCm1 !== null
                              ? entry.nistWavenumberAirCm1.toFixed(2)
                              : '—'}
                          </td>
                          <td className="py-2 px-3 text-right text-slate-600">
                            {entry.deltaFromNistAirCm1 !== null
                              ? (entry.deltaFromNistAirCm1 >= 0 ? '+' : '') +
                                entry.deltaFromNistAirCm1.toFixed(2)
                              : '—'}
                          </td>
                          <td className="py-2 px-3 text-right text-slate-500">
                            {entry.nistWavenumberVacCm1 !== null
                              ? entry.nistWavenumberVacCm1.toFixed(2)
                              : '—'}
                          </td>
                          <td className="py-2 px-3 text-right text-slate-500">
                            {entry.deltaFromNistVacCm1 !== null
                              ? (entry.deltaFromNistVacCm1 >= 0 ? '+' : '') +
                                entry.deltaFromNistVacCm1.toFixed(2)
                              : '—'}
                          </td>
                          <td className="py-2 px-3 text-right text-slate-700">
                            {trueLambda.toFixed(3)}
                            {entry.diffractionOrder > 1 && (
                              <span className="ml-1 text-[10px] text-rose-700">
                                (app {entry.observedWavelengthAirNm.toFixed(1)})
                              </span>
                            )}
                          </td>
                          <td className="py-2 px-3 text-center font-semibold">
                            m={entry.diffractionOrder}
                          </td>
                          <td className={`py-2 px-3 font-sans text-xs ${badgeColor}`}>
                            {entry.badgeLabel}
                          </td>
                          <td className="py-2 px-3 font-sans text-[11px] text-slate-600">
                            {entry.explanation}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Spectral Dispersion Comparison Map */}
      <SpectralDispersionChart
        solution={solution}
        uploadedLines={parsedLines}
        showUploadedComparison={true}
      />

      {/* Split Panel: Uploaded Text File Editor + Line-by-Line Verification Table */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-stretch">
        {/* Left: Raw Calibration File Editor */}
        <div className="xl:col-span-5 flex flex-col rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex items-center justify-between gap-2 mb-2.5">
            <div>
              <label
                htmlFor="calibration-file-textarea"
                className="block text-sm font-semibold text-slate-900"
              >
                Uploaded / Active Calibration File Content
              </label>
              <p className="text-xs text-slate-500">
                Edit wavenumbers, PCL, or MotorStep below to re-audit in real
                time
              </p>
            </div>
            <button
              type="button"
              onClick={onExportCalFile}
              className="inline-flex items-center gap-1 rounded-md border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap"
            >
              <Download className="h-3 w-3" />
              Save .CAL
            </button>
          </div>

          <textarea
            id="calibration-file-textarea"
            rows={16}
            value={auditReport.rawContent}
            onChange={(e) =>
              onUpdateFileContent(auditReport.fileName, e.target.value)
            }
            spellCheck={false}
            className="w-full flex-1 rounded-lg border border-slate-300 bg-slate-950 p-3 font-mono text-xs leading-relaxed text-slate-100 focus:border-cyan-500 focus:outline-none tabular-nums"
          />
        </div>

        {/* Right: Parsed Line-by-Line Inspection Table */}
        <div className="xl:col-span-7 flex flex-col rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">
                Parsed Neon Peak Verification Table ({parsedLines.length} lines)
              </h3>
              <p className="text-xs text-slate-500">
                Cross-checked against NIST Neon I catalog, scan bounds,
                diffraction order (m=1,2,3), and trace gas impurities
              </p>
            </div>
            <span className="font-mono text-xs text-slate-600 tabular-nums">
              Uniformity: {auditReport.uploadedUniformityScore}% · Hits/CCD:{' '}
              {auditReport.achievedOccurrencesPerLine}
            </span>
          </div>

          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-[11px] font-semibold text-slate-500">
                  <th className="py-2 pr-3">Line #</th>
                  <th className="py-2 px-3 text-right">File (cm⁻¹)</th>
                  <th className="py-2 px-3 text-right">NIST Ref (cm⁻¹)</th>
                  <th className="py-2 px-3 text-right">Δ (cm⁻¹)</th>
                  <th className="py-2 px-3 text-right">Air λ (nm)</th>
                  <th className="py-2 px-3">Origin / Order</th>
                  <th className="py-2 px-3 text-right">Counts / Int.</th>
                  <th className="py-2 px-3 text-right">Scan Exp.</th>
                  <th className="py-2 px-3">Role</th>
                  <th className="py-2 pl-3">Audit Status &amp; Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-xs font-mono tabular-nums">
                {parsedLines.length === 0 ? (
                  <tr>
                    <td
                      colSpan={10}
                      className="py-8 text-center font-sans text-xs text-slate-500"
                    >
                      No valid Neon wavenumber lines found in file. Click
                      &ldquo;Auto-Repair &amp; Apply Optimal Lines&rdquo; to
                      populate verified lines.
                    </td>
                  </tr>
                ) : (
                  parsedLines.map((row) => {
                    const statusLabel =
                      row.status === 'valid'
                        ? '● Valid'
                        : row.status === 'warning'
                          ? '▲ Warn'
                          : '✖ Error';
                    const statusClass =
                      row.status === 'valid'
                        ? 'text-emerald-700'
                        : row.status === 'warning'
                          ? 'text-amber-700'
                          : 'text-rose-700';

                    const countVal =
                      row.declaredIntensity ??
                      row.matchedCatalogLine?.relativeIntensity;

                    const orig = row.originAnalysis;
                    const originClass =
                      orig.classification === 'second_order_diffraction' ||
                      orig.classification === 'third_order_diffraction'
                        ? 'text-rose-700 font-bold'
                        : orig.classification === 'trace_gas_impurity'
                          ? 'text-amber-700 font-bold'
                          : orig.classification ===
                              'ne1_with_coincidental_overlap'
                            ? 'text-cyan-800 font-semibold'
                            : 'text-emerald-700';

                    return (
                      <tr
                        key={`${row.rawLineNumber}-${row.wavenumberCm1}`}
                        className="hover:bg-slate-50"
                      >
                        <td className="py-2 pr-3 text-slate-400">
                          #{row.rawLineNumber}
                        </td>
                        <td className="py-2 px-3 text-right font-semibold text-slate-900">
                          {row.wavenumberCm1.toFixed(2)}
                        </td>
                        <td className="py-2 px-3 text-right text-slate-600">
                          {row.matchedCatalogLine
                            ? row.matchedCatalogLine.wavenumber.toFixed(2)
                            : orig.nistWavenumberAirCm1 !== null
                              ? orig.nistWavenumberAirCm1.toFixed(2)
                              : 'Unmatched'}
                        </td>
                        <td className="py-2 px-3 text-right text-slate-500">
                          {row.catalogDeltaCm1 !== null
                            ? (row.catalogDeltaCm1 >= 0 ? '+' : '') +
                              row.catalogDeltaCm1.toFixed(2)
                            : orig.deltaFromNistAirCm1 !== null
                              ? (orig.deltaFromNistAirCm1 >= 0 ? '+' : '') +
                                orig.deltaFromNistAirCm1.toFixed(2)
                              : '—'}
                        </td>
                        <td className="py-2 px-3 text-right text-slate-600">
                          {(
                            orig.nistWavelengthAirNm ??
                            orig.observedWavelengthAirNm
                          ).toFixed(3)}
                        </td>
                        <td className={`py-2 px-3 font-sans text-[11px] whitespace-nowrap ${originClass}`}>
                          {orig.badgeLabel}
                        </td>
                        <td className="py-2 px-3 text-right text-slate-700">
                          {countVal !== undefined
                            ? countVal.toLocaleString()
                            : '—'}
                        </td>
                        <td className="py-2 px-3 text-right text-cyan-800">
                          {row.declaredExposureSec
                            ? `${row.declaredExposureSec}s`
                            : '—'}
                        </td>
                        <td className="py-2 px-3 font-semibold text-slate-700">
                          {row.declaredRole}
                        </td>
                        <td className="py-2 pl-3 font-sans">
                          <div className="flex flex-col gap-0.5">
                            <span
                              className={`font-mono text-xs font-semibold ${statusClass}`}
                            >
                              {statusLabel}
                            </span>
                            {row.issueMessages.length > 0 ? (
                              <span className="text-[11px] text-slate-600">
                                {row.issueMessages[0]}
                              </span>
                            ) : (
                              <span className="text-[11px] text-slate-500">
                                {row.matchedCatalogLine?.notes ||
                                  `In scan bounds · ${row.occurrencesAcrossCcd} hits across CCD`}
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
