import React, { useMemo, useState } from 'react';
import type { GridCell, RegistrationResult } from '../../types/matching';
import { useTranslation } from '../../i18n';
import { Activity, Crosshair } from 'lucide-react';
import { BAND_COLOURS, errorBand, formatPx } from '../../utils/registration';

interface HeatmapViewerProps {
  result: RegistrationResult;
}

type View = 'grid' | 'heatmap';

// Matches the backend's OpenCV COLORMAP_JET rendering of the smooth heatmap.
const JET_GRADIENT = 'linear-gradient(90deg, #00007F, #0000FF, #00FFFF, #FFFF00, #FF0000, #7F0000)';

export const HeatmapViewer: React.FC<HeatmapViewerProps> = ({ result }) => {
  const { t } = useTranslation();
  const [view, setView] = useState<View>('grid');
  const [hovered, setHovered] = useState<GridCell | null>(null);

  const [rows, cols] = result.cellGrid;
  const [height, width] = result.referenceShape;
  const [scaleMin, scaleMax] = result.heatmapScalePx;

  const counts = useMemo(() => {
    const tally = { excellent: 0, subpixel: 0, caution: 0, poor: 0, none: 0 };
    for (const cell of result.cells) tally[cell.tiePoints ? errorBand(cell.rmsePx) : 'none'] += 1;
    return tally;
  }, [result.cells]);

  const legend = [
    { band: 'excellent' as const, label: t('bandExcellent') },
    { band: 'subpixel' as const, label: t('bandSubpixel') },
    { band: 'caution' as const, label: t('bandCaution') },
    { band: 'poor' as const, label: t('bandPoor') },
    { band: 'none' as const, label: t('emptyCells') },
  ];

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
      <div className="xl:col-span-2 bg-white border border-[#D5DDE5] rounded-lg p-3 shadow-sm space-y-3">
        <div className="flex items-center justify-between font-mono text-xs">
          <span className="font-bold text-[#176B87] uppercase flex items-center">
            <Activity className="w-3.5 h-3.5 mr-1" />
            {t('heatmapTitle')}
          </span>
          <div className="flex rounded border border-[#D5DDE5] overflow-hidden text-[10px]">
            {(['grid', 'heatmap'] as View[]).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setView(option)}
                className={`px-2.5 py-1 transition-colors ${
                  view === option ? 'bg-[#176B87] text-white' : 'bg-[#F4F7FA] text-[#5B6875] hover:text-[#17212B]'
                }`}
              >
                {option === 'grid' ? t('gridView') : t('heatmapView')}
              </button>
            ))}
          </div>
        </div>

        <div className="relative bg-[#17212B] rounded overflow-hidden border border-[#D5DDE5] mx-auto" style={{ aspectRatio: `${width} / ${height}`, width: `min(100%, ${Math.round((640 * width) / height)}px)` }}>
          <img
            src={view === 'grid' ? result.images.referencePreview : result.images.errorHeatmap}
            alt={t('heatmapTitle')}
            className="absolute inset-0 w-full h-full object-fill"
          />
          {view === 'grid' && (
            <svg
              className="absolute inset-0 w-full h-full"
              viewBox={`0 0 ${cols} ${rows}`}
              preserveAspectRatio="none"
              onMouseLeave={() => setHovered(null)}
            >
              {result.cells.map((cell) => {
                const band = cell.tiePoints ? errorBand(cell.rmsePx) : 'none';
                const isHovered = hovered?.row === cell.row && hovered?.col === cell.col;
                return (
                  <rect
                    key={`${cell.row}-${cell.col}`}
                    x={cell.col + 0.03}
                    y={cell.row + 0.03}
                    width={0.94}
                    height={0.94}
                    fill={BAND_COLOURS[band]}
                    fillOpacity={band === 'none' ? 0.55 : isHovered ? 0.7 : 0.42}
                    stroke={isHovered ? '#FFFFFF' : BAND_COLOURS[band]}
                    strokeWidth={isHovered ? 0.05 : 0.02}
                    className="cursor-crosshair"
                    onMouseEnter={() => setHovered(cell)}
                  />
                );
              })}
            </svg>
          )}
          {view === 'grid' && (
            <div className="absolute bottom-2 left-2 bg-black/85 text-white font-mono text-[10px] p-1.5 rounded border border-[#176B87] flex items-center space-x-2">
              <Crosshair className="w-3 h-3 text-[#E3A93B]" />
              {hovered ? (
                <span>
                  {t('cellLabel')} R{hovered.row + 1}·C{hovered.col + 1} · {hovered.tiePoints} {t('hexCellPoints')} ·{' '}
                  <span className="text-[#E3A93B]">{hovered.tiePoints ? formatPx(hovered.rmsePx) : t('cellNoPoints')}</span>
                </span>
              ) : (
                <span>{t('cellInspectorHint')}</span>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="space-y-4">
        <div className="bg-white border border-[#D5DDE5] rounded-lg p-4 shadow-sm space-y-3 font-mono text-xs">
          <span className="font-bold text-[#17212B] uppercase tracking-wider block">{t('gridView')}</span>
          {legend.map(({ band, label }) => (
            <div key={band} className="flex items-center justify-between">
              <span className="flex items-center space-x-2 text-[#5B6875]">
                <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: BAND_COLOURS[band] }} />
                <span>{label}</span>
              </span>
              <span className="font-bold text-[#17212B]">
                {counts[band]} / {rows * cols}
              </span>
            </div>
          ))}
        </div>

        <div className="bg-white border border-[#D5DDE5] rounded-lg p-4 shadow-sm space-y-2 font-mono text-xs">
          <span className="font-bold text-[#17212B] uppercase tracking-wider block">{t('errorScale')}</span>
          <div className="h-3 rounded border border-[#D5DDE5]" style={{ background: JET_GRADIENT }} />
          <div className="flex justify-between text-[10px] text-[#5B6875]">
            <span>{formatPx(scaleMin, 1)}</span>
            <span>{formatPx((scaleMin + scaleMax) / 2, 1)}</span>
            <span>≥ {formatPx(scaleMax, 1)}</span>
          </div>
          <p className="text-[11px] text-[#7E8B9B] pt-1">{t('holdoutNote')}</p>
        </div>
      </div>
    </div>
  );
};
