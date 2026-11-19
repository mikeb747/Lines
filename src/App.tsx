import React, { useMemo, useState } from 'react';
import {
  calculateCcdWindowBoundsCm1,
  CalibrationParameters,
  solveCalibration,
} from './calibration/physicsEngine';
import {
  auditCalibrationFile,
  generateCalibrationFileText,
} from './calibration/fileAuditor';
import { FACTORY_PRESETS, FactoryPreset } from './calibration/presets';
import { ParameterSidebar } from './components/ParameterSidebar';
import { FileCheckerView } from './components/FileCheckerView';
import { LinePickerView } from './components/LinePickerView';
import { CcdSimulatorView } from './components/CcdSimulatorView';
import { FactoryMatrixView } from './components/FactoryMatrixView';
import {
  OfflineIndicator,
  PWAInstallModal,
  usePWAInstall,
} from './components/PWAInstallButton';
import { DeferredNumberInput } from './components/DeferredNumberInput';

type WorkspaceTab = 'checker' | 'picker' | 'simulator' | 'matrix';

export default function App() {
  // Default to Virsa · 532 nm · 2400 l/mm (16 TargetCalLines = 3 per zone, MinNeIntensity = 1) on startup
  const initialPreset =
    FACTORY_PRESETS.find((p) => p.id === 'virsa-532-2400-empirical') ||
    FACTORY_PRESETS[0];
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('checker');
  const [activePresetId, setActivePresetId] = useState<string>(
    initialPreset.id
  );
  const [params, setParams] = useState<CalibrationParameters>(
    initialPreset.params
  );
  const [fileName, setFileName] = useState<string>(
    initialPreset.sampleFileName
  );
  const [fileContent, setFileContent] = useState<string>(
    initialPreset.sampleFileContent
  );
  const [isPwaModalOpen, setIsPwaModalOpen] = useState<boolean>(false);
  const [statusBanner, setStatusBanner] = useState<string | null>(null);

  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();

  const auditReport = useMemo(
    () => auditCalibrationFile(fileName, fileContent, params),
    [fileName, fileContent, params]
  );

  const { solution } = auditReport;

  const handleSelectPreset = (preset: FactoryPreset) => {
    setActivePresetId(preset.id);
    setParams(preset.params);
    setFileName(preset.sampleFileName);
    setFileContent(preset.sampleFileContent);
    setStatusBanner(`Loaded preset: ${preset.label}`);
  };

  const handleChangeParams = (nextParams: CalibrationParameters) => {
    setActivePresetId('custom');
    setParams(nextParams);
  };

  const handleResetDefaults = () => {
    const def =
      FACTORY_PRESETS.find((p) => p.id === 'virsa-532-2400-empirical') ||
      FACTORY_PRESETS[0];
    handleSelectPreset(def);
  };

  const handleAutoRepairFile = () => {
    const freshSolution = solveCalibration(params);
    const repairedText = generateCalibrationFileText(freshSolution);
    const cleanName = `${params.laserNm}nm_${params.gratingLinesPerMm}lmm_verified.cal`;
    setFileName(cleanName);
    setFileContent(repairedText);
    setStatusBanner(
      `Auto-repaired calibration file with ${freshSolution.selectedLines.length} evenly dispersed Neon lines and ${freshSolution.recommendedMotorStepTicks}-step motor increment.`
    );
  };

  const handleLoadFlawedDemo = () => {
    const flawed =
      FACTORY_PRESETS.find((p) => p.id === '532-600-flawed-audit') ||
      FACTORY_PRESETS[0];
    handleSelectPreset(flawed);
    setActiveTab('checker');
  };

  const handleLoadEmpirical1800Lns = () => {
    const emp = FACTORY_PRESETS.find(
      (p) => p.id === '532-1800-lns-empirical'
    );
    if (emp) {
      handleSelectPreset(emp);
      setActiveTab('checker');
    }
  };

  const handleLoadEmpiricalVirsa2400 = () => {
    const empVirsa = FACTORY_PRESETS.find(
      (p) => p.id === 'virsa-532-2400-empirical'
    );
    if (empVirsa) {
      handleSelectPreset(empVirsa);
      setActiveTab('checker');
    }
  };

  const triggerDownload = (name: string, content: string, mime: string) => {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleExportCalFile = () => {
    const outText = generateCalibrationFileText(solution);
    const outName = `${params.spectrograph}_${params.laserNm}nm_${params.gratingLinesPerMm}lmm.cal`;
    triggerDownload(outName, outText, 'text/plain;charset=utf-8');
    setStatusBanner(`Downloaded calibration specification ${outName}`);
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      {/* Top Bar Contract: Zone 1 (Brand) — Zone 2 (4 Nav Links) — Zone 3 (1 Primary Action) */}
      <header className="flex items-center justify-between gap-8 px-6 py-3.5 border-b border-slate-200 bg-white">
        <a
          href="#top"
          onClick={(e) => {
            e.preventDefault();
            setActiveTab('checker');
          }}
          className="inline-flex items-center gap-2.5 text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0"
        >
          <img
            src={`${import.meta.env.BASE_URL}assets/aistudio/icon_a27d7601.png`}
            alt="SpectroCal Icon"
            className="w-[55px] h-[51px] pr-0 -mr-[6px] rounded-lg object-contain shrink-0"
          />
          <span>SpectroCal</span>
        </a>

        <nav
          aria-label="Primary Workspace Navigation"
          className="flex items-center gap-6 text-sm font-medium text-slate-600 overflow-x-auto"
        >
          <button
            type="button"
            onClick={() => setActiveTab('checker')}
            className={`py-1 transition-colors whitespace-nowrap shrink-0 border-b-2 ${
              activeTab === 'checker'
                ? 'border-cyan-600 text-slate-900 font-semibold'
                : 'border-transparent hover:text-slate-900'
            }`}
          >
            File Checker
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('picker')}
            className={`py-1 transition-colors whitespace-nowrap shrink-0 border-b-2 ${
              activeTab === 'picker'
                ? 'border-cyan-600 text-slate-900 font-semibold'
                : 'border-transparent hover:text-slate-900'
            }`}
          >
            Line Picker
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('simulator')}
            className={`py-1 transition-colors whitespace-nowrap shrink-0 border-b-2 ${
              activeTab === 'simulator'
                ? 'border-cyan-600 text-slate-900 font-semibold'
                : 'border-transparent hover:text-slate-900'
            }`}
          >
            CCD &amp; Turret Sim
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('matrix')}
            className={`py-1 transition-colors whitespace-nowrap shrink-0 border-b-2 ${
              activeTab === 'matrix'
                ? 'border-cyan-600 text-slate-900 font-semibold'
                : 'border-transparent hover:text-slate-900'
            }`}
          >
            Factory Matrix
          </button>
        </nav>

        <div className="flex items-center gap-3 shrink-0">
          {!isInstalled ? (
            <button
              type="button"
              onClick={() => {
                if (isInstallable) {
                  install();
                } else {
                  setIsPwaModalOpen(true);
                }
              }}
              className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0"
            >
              {isInstallable ? 'Install App' : 'Offline PWA'}
            </button>
          ) : (
            <button
              type="button"
              onClick={handleExportCalFile}
              className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0"
            >
              Export .CAL
            </button>
          )}
        </div>
      </header>

      {/* Main Split Console: Left Parameter Sidebar + Right Scientific Stage */}
      <div className="flex-1 flex flex-col lg:flex-row">
        <ParameterSidebar
          params={params}
          activePresetId={activePresetId}
          onChangeParams={handleChangeParams}
          onSelectPreset={handleSelectPreset}
          onResetDefaults={handleResetDefaults}
        />

        <main className="flex-1 p-5 lg:p-6 space-y-6 min-w-0">
          {/* Context & Telemetry Header Strip */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
              <span className="font-semibold text-slate-900">
                {params.spectrograph} Spectrograph
              </span>
              <span aria-hidden="true">·</span>
              <span>
                {params.laserNm} nm Laser ({solution.laserWavenumberCm1.toFixed(1)}{' '}
                cm⁻¹)
              </span>
              <span aria-hidden="true">·</span>
              <span>{params.gratingLinesPerMm} l/mm Grating</span>
              <span aria-hidden="true">·</span>
              <span>
                {solution.effectiveRamanMinCm1}–{solution.effectiveRamanMaxCm1}{' '}
                cm⁻¹ Raman Shift
              </span>
              <span aria-hidden="true">·</span>
              <span>
                {params.ccdType} CCD ({params.ccdActiveWidthPx}×
                {params.ccdActiveHeightPx} px)
              </span>
            </div>

            {statusBanner && (
              <div
                role="status"
                className="text-xs font-medium text-cyan-800 truncate"
              >
                {statusBanner}
              </div>
            )}
          </div>

          {/* 4-Column Calculated Optical Specification KPI Strip */}
          <section
            aria-label="Calculated Optical Calibration Metrics"
            className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4"
          >
            {/* Card 1: Absolute Calibration Range (Editable on File Checker tab, lower number first, whole numbers) */}
            <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <div className="text-xs text-slate-500">
                  Absolute Calibration Range
                </div>
                {(params.customAbsLowCm1 != null ||
                  params.customAbsHighCm1 != null) && (
                  <button
                    type="button"
                    onClick={() =>
                      handleChangeParams({
                        ...params,
                        customAbsLowCm1: null,
                        customAbsHighCm1: null,
                      })
                    }
                    className="text-[10px] font-medium text-cyan-700 hover:text-cyan-900 underline"
                  >
                    Reset
                  </button>
                )}
              </div>

              {activeTab === 'checker' ? (
                <div className="flex items-center gap-1.5">
                  <DeferredNumberInput
                    ariaLabel="Absolute Calibration Range Start (cm-1)"
                    integer
                    min={1000}
                    max={40000}
                    value={Math.round(solution.absLowCm1)}
                    onCommit={(nextLow) => {
                      handleChangeParams({
                        ...params,
                        customAbsLowCm1: Math.round(nextLow),
                        customAbsHighCm1: Math.round(
                          params.customAbsHighCm1 ?? solution.absHighCm1
                        ),
                      });
                    }}
                    className="w-20 rounded border border-slate-300 bg-slate-50 px-1.5 py-0.5 font-mono text-sm font-bold text-slate-900 tabular-nums focus:border-cyan-600 focus:bg-white focus:outline-none"
                  />
                  <span className="font-mono text-sm font-bold text-slate-400">
                    –
                  </span>
                  <DeferredNumberInput
                    ariaLabel="Absolute Calibration Range End (cm-1)"
                    integer
                    min={1000}
                    max={45000}
                    value={Math.round(solution.absHighCm1)}
                    onCommit={(nextHigh) => {
                      handleChangeParams({
                        ...params,
                        customAbsLowCm1: Math.round(
                          params.customAbsLowCm1 ?? solution.absLowCm1
                        ),
                        customAbsHighCm1: Math.round(nextHigh),
                      });
                    }}
                    className="w-20 rounded border border-slate-300 bg-slate-50 px-1.5 py-0.5 font-mono text-sm font-bold text-slate-900 tabular-nums focus:border-cyan-600 focus:bg-white focus:outline-none"
                  />
                  <span className="text-xs font-mono text-slate-400">cm⁻¹</span>
                </div>
              ) : (
                <div className="flex items-baseline gap-1.5 whitespace-nowrap">
                  <span className="text-lg font-mono font-bold text-slate-900 tabular-nums">
                    {Math.round(solution.absLowCm1)} –{' '}
                    {Math.round(solution.absHighCm1)}
                  </span>
                  <span className="text-xs font-mono text-slate-400">cm⁻¹</span>
                </div>
              )}

              <div className="text-xs font-mono text-slate-500 tabular-nums">
                Centre: {Math.round(solution.absCentreCm1)} cm⁻¹ (
                {Math.round(solution.effectiveRamanMinCm1)}–
                {Math.round(solution.effectiveRamanMaxCm1)} Raman)
              </div>
            </div>

            {/* Card 2: Grating Turret Scan Range (Lower number first, whole numbers) */}
            <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-1">
              <div className="text-xs text-slate-500">
                Grating Turret Scan Range
              </div>
              <div className="flex items-baseline gap-1.5 whitespace-nowrap">
                <span className="text-lg font-mono font-bold text-cyan-800 tabular-nums">
                  {Math.round(solution.scanLowCm1)} –{' '}
                  {Math.round(solution.scanHighCm1)}
                </span>
                <span className="text-xs font-mono text-slate-400">cm⁻¹</span>
              </div>
              <div className="text-xs font-mono text-slate-500 tabular-nums">
                CCD Win: {Math.round(solution.ccdWindowLowCm1)} →{' '}
                {Math.round(solution.ccdWindowCentreCm1)} →{' '}
                {Math.round(solution.ccdWindowHighCm1)} cm⁻¹
              </div>
            </div>

            {/* Card 3: Primary Calibration Line & Lens Focus Architecture */}
            <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-1">
              <div className="text-xs text-slate-500">
                Primary Calibration Line (PCL)
              </div>
              <div className="flex items-baseline gap-1.5 whitespace-nowrap">
                <span className="text-lg font-mono font-bold text-amber-700 tabular-nums">
                  {solution.primaryCalibrationLine
                    ? solution.primaryCalibrationLine.wavenumber.toFixed(2)
                    : '—'}
                </span>
                <span className="text-xs font-mono text-slate-400">cm⁻¹</span>
              </div>
              <div className="text-xs font-mono text-slate-500 tabular-nums truncate">
                {params.spectrograph === 'Virsa'
                  ? `Virsa: 1 Movable Lens · ${solution.selectedLines.length} Picked`
                  : solution.focusAnchorLines.length >= 2
                    ? `inVia Focus: ${solution.focusAnchorLines[0].wavenumber.toFixed(1)} & ${solution.focusAnchorLines[1].wavenumber.toFixed(1)}`
                    : `${solution.selectedLines.length} Picked Lines`}
              </div>
            </div>

            {/* Card 4: Turret Motor Step Size & CCD Occurrences */}
            {(() => {
              const lowestAnalysis = auditReport.lowestLineAnalysis;
              const effectiveStepAbsCm1 =
                lowestAnalysis && activeTab === 'checker'
                  ? lowestAnalysis.recommendedStepCm1AtLowest
                  : solution.wireXStepAbsCm1;
              const effectiveScanCount =
                lowestAnalysis && activeTab === 'checker'
                  ? lowestAnalysis.totalScansWithLowestStep
                  : solution.wireXTotalScanCount;
              const lowWinCm1 =
                lowestAnalysis && activeTab === 'checker'
                  ? lowestAnalysis.ccdWindowAtLowestCm1
                  : solution.ccdWindowLowCm1;
              const hitsLow = Number(
                (lowWinCm1 / Math.max(1, effectiveStepAbsCm1)).toFixed(1)
              );
              const hitsHigh = Number(
                (
                  solution.ccdWindowHighCm1 / Math.max(1, effectiveStepAbsCm1)
                ).toFixed(1)
              );

              return (
                <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-1">
                  <div className="text-xs text-slate-500">
                    Calibration Step Size
                  </div>
                  <div className="flex items-baseline gap-1.5 whitespace-nowrap">
                    <span className="text-lg font-mono font-bold text-slate-900 tabular-nums">
                      {effectiveStepAbsCm1}
                    </span>
                    <span className="text-xs font-mono text-slate-400">
                      Abs cm⁻¹ ({effectiveScanCount} scans)
                    </span>
                  </div>
                  <div className="text-xs font-mono text-emerald-700 tabular-nums">
                    WiRE X Hits: {hitsLow} (low) – {hitsHigh} (high) / line
                  </div>
                </div>
              );
            })()}
          </section>

          {/* Limiting Factors Notice Strip */}
          {solution.limitingFactors.length > 0 && (
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs text-slate-600">
              <span className="font-semibold text-slate-800">
                Active Physical Constraints:
              </span>
              {solution.limitingFactors.map((factor, i) => (
                <React.Fragment key={factor}>
                  {i > 0 && <span aria-hidden="true">·</span>}
                  <span>{factor}</span>
                </React.Fragment>
              ))}
            </div>
          )}

          {/* Active Workspace View */}
          {activeTab === 'checker' && (
            <FileCheckerView
              auditReport={auditReport}
              params={params}
              onChangeParams={handleChangeParams}
              onUpdateFileContent={(name, content) => {
                setFileName(name);
                setFileContent(content);
              }}
              onAutoRepairFile={handleAutoRepairFile}
              onLoadFlawedDemo={handleLoadFlawedDemo}
              onLoadEmpirical1800Lns={handleLoadEmpirical1800Lns}
              onLoadEmpiricalVirsa2400={handleLoadEmpiricalVirsa2400}
              onExportCalFile={handleExportCalFile}
            />
          )}

          {activeTab === 'picker' && (
            <LinePickerView
              solution={solution}
              onSelectManualPcl={(nu) =>
                setParams({ ...params, manualPclOverrideCm1: nu })
              }
            />
          )}

          {activeTab === 'simulator' && (
            <CcdSimulatorView solution={solution} />
          )}

          {activeTab === 'matrix' && (
            <FactoryMatrixView
              activePresetId={activePresetId}
              onSelectPreset={(preset) => {
                handleSelectPreset(preset);
                setActiveTab('checker');
              }}
            />
          )}
        </main>
      </div>

      {/* Quiet Footer */}
      <footer className="border-t border-slate-200 bg-white px-6 py-3 flex flex-wrap items-center justify-between gap-4 text-xs text-slate-500">
        <span>
          SpectroCal Optical Calibration Workbench · Virsa / inVia / Strava
          Dispersive Raman Systems
        </span>
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => setIsPwaModalOpen(true)}
            className="hover:text-slate-900 underline underline-offset-2"
          >
            PWA Offline &amp; GitHub Pages Guide
          </button>
          <span aria-hidden="true">·</span>
          <button
            type="button"
            onClick={handleExportCalFile}
            className="hover:text-slate-900 underline underline-offset-2"
          >
            Download Active .CAL Specification
          </button>
        </div>
      </footer>

      <OfflineIndicator />

      <PWAInstallModal
        isOpen={isPwaModalOpen}
        onClose={() => setIsPwaModalOpen(false)}
        isInstallable={isInstallable}
        isIOS={isIOS}
        onTriggerNativeInstall={install}
      />
    </div>
  );
}
