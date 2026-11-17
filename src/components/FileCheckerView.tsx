import React, { useRef } from 'react';
import {
  FileAuditReport,
  generateCalibrationFileText,
} from '../calibration/fileAuditor';
import { SpectralDispersionChart } from './SpectralDispersionChart';
import {
  Upload,
  Wand2,
  Download,
  AlertTriangle,
  CheckCircle2,
  XCircle,
} from 'lucide-react';

interface FileCheckerViewProps {
  auditReport: FileAuditReport;
  onUpdateFileContent: (fileName: string, content: string) => void;
  onAutoRepairFile: () => void;
  onLoadFlawedDemo: () => void;
  onLoadEmpirical1800Lns?: () => void;
  onExportCalFile: () => void;
}

export const FileCheckerView: React.FC<FileCheckerViewProps> = ({
  auditReport,
  onUpdateFileContent,
  onAutoRepairFile,
  onLoadFlawedDemo,
  onLoadEmpirical1800Lns,
  onExportCalFile,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const { solution, diagnostics, parsedLines } = auditReport;

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
              {solution.absHighCm1.toFixed(1)}–{solution.absLowCm1.toFixed(1)}{' '}
              cm⁻¹
            </span>
            , Scan Range{' '}
            <span className="font-mono tabular-nums">
              {solution.scanHighCm1.toFixed(1)}–{solution.scanLowCm1.toFixed(1)}{' '}
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
            {onLoadEmpirical1800Lns && (
              <button
                type="button"
                onClick={onLoadEmpirical1800Lns}
                className="text-xs font-medium text-amber-800 hover:text-amber-950 underline underline-offset-2 whitespace-nowrap"
              >
                Load Empirical 532nm 1800 .LNS (Multi-Exposure & Close Doublets)
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
                Cross-checked against NIST Neon I catalog, scan bounds, and
                pre-calibration drift tolerance
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
                  <th className="py-2 px-3 text-right">Counts / Int.</th>
                  <th className="py-2 px-3 text-right">Scan Exp.</th>
                  <th className="py-2 px-3">Role</th>
                  <th className="py-2 pl-3">Audit Status & Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-xs font-mono tabular-nums">
                {parsedLines.length === 0 ? (
                  <tr>
                    <td
                      colSpan={9}
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
                            : 'Unmatched'}
                        </td>
                        <td className="py-2 px-3 text-right text-slate-500">
                          {row.catalogDeltaCm1 !== null
                            ? (row.catalogDeltaCm1 >= 0 ? '+' : '') +
                              row.catalogDeltaCm1.toFixed(2)
                            : '—'}
                        </td>
                        <td className="py-2 px-3 text-right text-slate-600">
                          {row.matchedCatalogLine
                            ? row.matchedCatalogLine.wavelengthAirNm.toFixed(3)
                            : (1e7 / row.wavenumberCm1).toFixed(3)}
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
