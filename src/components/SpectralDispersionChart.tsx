import React, { useState } from 'react';
import { CalibrationSolution } from '../calibration/physicsEngine';
import { ParsedLineEntry } from '../calibration/fileAuditor';
import { NeonLine } from '../calibration/neonCatalog';

interface SpectralDispersionChartProps {
  solution: CalibrationSolution;
  uploadedLines?: ParsedLineEntry[];
  showUploadedComparison?: boolean;
  onSelectPcl?: (line: NeonLine) => void;
}

export const SpectralDispersionChart: React.FC<SpectralDispersionChartProps> = ({
  solution,
  uploadedLines = [],
  showUploadedComparison = false,
  onSelectPcl,
}) => {
  const [hoveredLine, setHoveredLine] = useState<{
    wavenumber: number;
    intensity: number;
    label: string;
    source: string;
  } | null>(null);

  const {
    scanHighCm1,
    scanLowCm1,
    absHighCm1,
    absLowCm1,
    absCentreCm1,
    primaryCalibrationLine,
    secondaryCalibrationLine,
    selectedLines,
    binDistribution,
  } = solution;

  const padHigh = scanHighCm1 + (scanHighCm1 - scanLowCm1) * 0.04;
  const padLow = Math.max(4000, scanLowCm1 - (scanHighCm1 - scanLowCm1) * 0.04);
  const totalSpan = Math.max(200, padHigh - padLow);

  // Wavenumber runs High (left) to Low (right), matching standard Raman Stokes shift (0 -> 4000 cm^-1)
  const toX = (nuCm1: number) => {
    const ratio = (padHigh - nuCm1) / totalSpan;
    return Math.max(40, Math.min(860, 48 + ratio * 804));
  };

  const scanLeftX = toX(scanHighCm1);
  const scanRightX = toX(scanLowCm1);
  const absLeftX = toX(absHighCm1);
  const absRightX = toX(absLowCm1);
  const centreX = toX(absCentreCm1);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">
            Spectral Dispersion & Equal-Bin Calibration Map
          </h3>
          <p className="text-xs text-slate-500">
            Stokes direction: High Absolute Wavenumber (left) → Low Absolute Wavenumber (right) · 5 Equal Dispersion Zones
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-xs bg-amber-500" />
            PCL ({primaryCalibrationLine?.wavenumber.toFixed(2) ?? '—'} cm⁻¹)
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-xs bg-cyan-600" />
            Optimal Picked ({selectedLines.length})
          </span>
          {showUploadedComparison && (
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-xs bg-rose-600" />
              Uploaded File ({uploadedLines.length})
            </span>
          )}
        </div>
      </div>

      <div className="relative overflow-x-auto">
        <svg
          viewBox="0 0 900 235"
          className="w-full h-auto select-none cursor-crosshair"
          role="img"
          aria-label="Spectral dispersion map showing Grating Scan Range, Absolute Raman Range, 5 equal wavenumber bins, and Neon emission lines"
        >
          {/* Background canvas */}
          <rect
            x="48"
            y="16"
            width="804"
            height="174"
            rx="4"
            fill="#F8FAFC"
            stroke="#E2E8F0"
            strokeWidth="1"
          />

          {/* Grating Scan Range region */}
          <rect
            x={scanLeftX}
            y="16"
            width={Math.max(4, scanRightX - scanLeftX)}
            height="174"
            fill="#F1F5F9"
          />

          {/* Active Absolute Raman Shift region */}
          <rect
            x={absLeftX}
            y="16"
            width={Math.max(4, absRightX - absLeftX)}
            height="174"
            fill="#ECFEFF"
            fillOpacity="0.55"
          />

          {/* 5 Equal Spectral Dispersion Bins */}
          {binDistribution.map((bin, idx) => {
            const bx1 = toX(bin.rangeHighCm1);
            const bx2 = toX(bin.rangeLowCm1);
            return (
              <g key={bin.binIndex}>
                <line
                  x1={bx1}
                  y1="16"
                  x2={bx1}
                  y2="190"
                  stroke="#CBD5E1"
                  strokeDasharray="3 3"
                  strokeWidth="1"
                />
                <text
                  x={(bx1 + bx2) / 2}
                  y="30"
                  textAnchor="middle"
                  className="fill-slate-400 font-mono text-[9px]"
                >
                  Zone {idx + 1} ({bin.count} cal)
                </text>
              </g>
            );
          })}

          {/* Scan Range Boundary Lines */}
          <line
            x1={scanLeftX}
            y1="16"
            x2={scanLeftX}
            y2="190"
            stroke="#475569"
            strokeWidth="1.5"
          />
          <line
            x1={scanRightX}
            y1="16"
            x2={scanRightX}
            y2="190"
            stroke="#475569"
            strokeWidth="1.5"
          />

          {/* Abs Range Boundary Lines */}
          <line
            x1={absLeftX}
            y1="16"
            x2={absLeftX}
            y2="190"
            stroke="#0891B2"
            strokeWidth="1.2"
            strokeDasharray="5 3"
          />
          <line
            x1={absRightX}
            y1="16"
            x2={absRightX}
            y2="190"
            stroke="#0891B2"
            strokeWidth="1.2"
            strokeDasharray="5 3"
          />

          {/* Centre of Calibration Range marker */}
          <line
            x1={centreX}
            y1="38"
            x2={centreX}
            y2="190"
            stroke="#D97706"
            strokeWidth="1"
            strokeDasharray="2 2"
          />

          {/* Track Divider if showing uploaded vs optimal */}
          {showUploadedComparison && (
            <line
              x1="48"
              y1="112"
              x2="852"
              y2="112"
              stroke="#E2E8F0"
              strokeWidth="1"
            />
          )}

          {/* Track Labels */}
          <text
            x="54"
            y="50"
            className="fill-slate-500 font-mono text-[9px] font-medium"
          >
            OPTIMAL PICKED NEON LINES
          </text>
          {showUploadedComparison && (
            <text
              x="54"
              y="126"
              className="fill-slate-500 font-mono text-[9px] font-medium"
            >
              UPLOADED FILE PEAKS
            </text>
          )}

          {/* Render Optimal Selected Lines */}
          {selectedLines.map((line) => {
            const x = toX(line.wavenumber);
            const isPcl = primaryCalibrationLine?.id === line.id;
            const isSec = secondaryCalibrationLine?.id === line.id;
            const baseY = showUploadedComparison ? 106 : 184;
            const maxH = showUploadedComparison ? 50 : 120;
            const h = Math.max(14, (line.relativeIntensity / 1000) * maxH);
            const topY = baseY - h;

            return (
              <g
                key={line.id}
                onClick={() => onSelectPcl && onSelectPcl(line)}
                onMouseEnter={() =>
                  setHoveredLine({
                    wavenumber: line.wavenumber,
                    intensity: line.relativeIntensity,
                    label: isPcl
                      ? 'Primary Calibration Line (PCL)'
                      : isSec
                        ? '2nd Calibration Line'
                        : 'Optimal Calibration Line',
                    source: `${line.wavelengthAirNm.toFixed(2)} nm`,
                  })
                }
                onMouseLeave={() => setHoveredLine(null)}
                className="cursor-pointer"
              >
                <line
                  x1={x}
                  y1={baseY}
                  x2={x}
                  y2={topY}
                  stroke={
                    isPcl ? '#D97706' : isSec ? '#2563EB' : '#0891B2'
                  }
                  strokeWidth={isPcl ? '3' : '2.2'}
                />
                <circle
                  cx={x}
                  cy={topY}
                  r={isPcl ? 4.5 : 3}
                  fill={isPcl ? '#F59E0B' : isSec ? '#3B82F6' : '#06B6D4'}
                />
                {isPcl && (
                  <text
                    x={x}
                    y={Math.max(46, topY - 6)}
                    textAnchor="middle"
                    className="fill-amber-700 font-mono text-[9px] font-semibold"
                  >
                    PCL {line.wavenumber.toFixed(2)}
                  </text>
                )}
              </g>
            );
          })}

          {/* Render Uploaded File Lines (Bottom Track) */}
          {showUploadedComparison &&
            uploadedLines.map((u, idx) => {
              const x = toX(u.wavenumberCm1);
              const baseY = 184;
              const intensity =
                u.declaredIntensity ??
                u.matchedCatalogLine?.relativeIntensity ??
                450;
              const h = Math.max(12, Math.min(50, (intensity / 1000) * 50));
              const topY = baseY - h;
              const color =
                u.status === 'error'
                  ? '#DC2626'
                  : u.status === 'warning'
                    ? '#D97706'
                    : '#0F172A';

              return (
                <g
                  key={`up-${idx}-${u.wavenumberCm1}`}
                  onMouseEnter={() =>
                    setHoveredLine({
                      wavenumber: u.wavenumberCm1,
                      intensity,
                      label:
                        u.status === 'error'
                          ? u.issueMessages[0] || 'Error'
                          : u.status === 'warning'
                            ? u.issueMessages[0] || 'Warning'
                            : 'Valid Uploaded Peak',
                      source: `Line #${u.rawLineNumber}`,
                    })
                  }
                  onMouseLeave={() => setHoveredLine(null)}
                >
                  <line
                    x1={x}
                    y1={baseY}
                    x2={x}
                    y2={topY}
                    stroke={color}
                    strokeWidth="2.4"
                  />
                  <circle cx={x} cy={topY} r={3.2} fill={color} />
                </g>
              );
            })}

          {/* X-Axis Labels */}
          <text
            x={scanLeftX}
            y="206"
            textAnchor="middle"
            className="fill-slate-700 font-mono text-[10px] font-medium"
          >
            Scan High: {scanHighCm1.toFixed(1)}
          </text>
          <text
            x={absLeftX}
            y="220"
            textAnchor="middle"
            className="fill-cyan-700 font-mono text-[10px]"
          >
            Abs High: {absHighCm1.toFixed(1)}
          </text>
          <text
            x={centreX}
            y="206"
            textAnchor="middle"
            className="fill-amber-700 font-mono text-[10px] font-medium"
          >
            Centre: {absCentreCm1.toFixed(1)} cm⁻¹
          </text>
          <text
            x={absRightX}
            y="220"
            textAnchor="middle"
            className="fill-cyan-700 font-mono text-[10px]"
          >
            Abs Low: {absLowCm1.toFixed(1)}
          </text>
          <text
            x={scanRightX}
            y="206"
            textAnchor="middle"
            className="fill-slate-700 font-mono text-[10px] font-medium"
          >
            Scan Low: {scanLowCm1.toFixed(1)}
          </text>
        </svg>

        {hoveredLine && (
          <div className="mt-2 flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-mono text-slate-700">
            <span>
              <strong>{hoveredLine.wavenumber.toFixed(2)} cm⁻¹</strong> · Intensity:{' '}
              {hoveredLine.intensity} · {hoveredLine.source}
            </span>
            <span className="font-sans text-slate-600">{hoveredLine.label}</span>
          </div>
        )}
      </div>
    </div>
  );
};
