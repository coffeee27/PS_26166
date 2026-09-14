import React, { useMemo, useState } from 'react';
import type { RegistrationResult, TiePoint } from '../../types/matching';
import { useTranslation } from '../../i18n';
import { Layers } from 'lucide-react';
import { BAND_COLOURS, ERROR_BANDS, errorBand, formatPx, sampleTiePoints } from '../../utils/registration';
import type { ErrorBand } from '../../utils/registration';

const LINES_SHOWN = 80;
const DISPLAY_HEIGHT = 1000;

const bandOf = (point: TiePoint) => errorBand(point.errorPx);

type Filter = 'all' | Exclude<ErrorBand, 'none'>;

export const FeatureCorrespondence: React.FC<{ result: RegistrationResult }> = ({ result }) => {
  const { t } = useTranslation();
  const [filter, setFilter] = useState<Filter>('all');
  const [selected, setSelected] = useState<TiePoint | null>(null);

  const [refH, refW] = result.referenceShape;
  const [srcH, srcW] = result.sourceShape;
  // Both panels share one height; widths follow each image's own aspect ratio.
  const refDisplayW = (DISPLAY_HEIGHT * refW) / refH;
  const srcDisplayW = (DISPLAY_HEIGHT * srcW) / srcH;
  const totalW = refDisplayW + srcDisplayW;

  const shown = useMemo(() => sampleTiePoints(result.tiePoints, LINES_SHOWN), [result.tiePoints]);
  const visible = shown.filter((p) => filter === 'all' || bandOf(p) === filter);
  const bandCount = (band: Filter) => (band === 'all' ? shown.length : shown.filter((p) => bandOf(p) === band).length);

  const bandLabels: Record<Exclude<ErrorBand, 'none'>, string> = {
    excellent: t('bandExcellent'),
    subpixel: t('bandSubpixel'),
    caution: t('bandCaution'),
    poor: t('bandPoor'),
  };
  const filters: { key: Filter; label: string }[] = [
    { key: 'all', label: t('filterAll') },
    ...ERROR_BANDS.map((band) => ({ key: band, label: bandLabels[band] })),
  ];

  return (
    <div className="bg-white border border-[#D5DDE5] rounded-lg p-4 shadow-sm space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-[#E9EEF3] gap-2">
        <div className="font-mono text-xs">
          <span className="font-bold text-[#17212B] uppercase flex items-center">
            <Layers className="w-4 h-4 mr-1.5 text-[#176B87]" />
            {t('featureVectorLines')}
          </span>
          <span className="text-[11px] text-[#5B6875] block mt-0.5">{t('showingLines')}</span>
        </div>

        <div className="flex flex-wrap items-center gap-1 font-mono text-[11px]">
          {filters.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => setFilter(key)}
              className={`px-2.5 py-1 rounded border transition-colors ${
                filter === key ? 'bg-[#176B87] text-white border-[#176B87]' : 'bg-[#F4F7FA] text-[#5B6875] border-[#D5DDE5] hover:text-[#17212B]'
              }`}
            >
              {label} ({bandCount(key)})
            </button>
          ))}
        </div>
      </div>

      <div className="relative bg-[#17212B] rounded-lg overflow-hidden border border-[#D5DDE5] flex" style={{ aspectRatio: `${totalW} / ${DISPLAY_HEIGHT}` }}>
        <div className="relative h-full border-r border-[#3B82A0]/40" style={{ width: `${(refDisplayW / totalW) * 100}%` }}>
          <img src={result.images.referencePreview} alt={t('referenceImageTitle')} className="w-full h-full object-fill opacity-85" />
          <div className="absolute top-2 left-2 bg-black/70 text-white font-mono text-[10px] px-2 py-0.5 rounded border border-gray-600">REF</div>
        </div>
        <div className="relative h-full" style={{ width: `${(srcDisplayW / totalW) * 100}%` }}>
          <img src={result.images.sourcePreview} alt={t('queryImageTitle')} className="w-full h-full object-fill opacity-85" />
          <div className="absolute top-2 right-2 bg-black/70 text-white font-mono text-[10px] px-2 py-0.5 rounded border border-gray-600">SRC</div>
        </div>

        <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox={`0 0 ${totalW} ${DISPLAY_HEIGHT}`} preserveAspectRatio="none">
          {visible.map((point, index) => {
            const x1 = (point.reference[0] / refW) * refDisplayW;
            const y1 = (point.reference[1] / refH) * DISPLAY_HEIGHT;
            const x2 = refDisplayW + (point.source[0] / srcW) * srcDisplayW;
            const y2 = (point.source[1] / srcH) * DISPLAY_HEIGHT;
            const colour = BAND_COLOURS[bandOf(point)];
            const isSelected = selected === point;
            return (
              <g key={index} className="pointer-events-auto cursor-pointer" onClick={() => setSelected(point)}>
                <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={colour} strokeWidth={isSelected ? 4 : 1.8} opacity={isSelected ? 1 : 0.7} />
                <circle cx={x1} cy={y1} r={isSelected ? 9 : 5} fill={colour} stroke="#FFFFFF" strokeWidth="1.5" />
                <circle cx={x2} cy={y2} r={isSelected ? 9 : 5} fill={colour} stroke="#FFFFFF" strokeWidth="1.5" />
              </g>
            );
          })}
        </svg>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between pt-2 border-t border-[#E9EEF3] font-mono text-xs gap-2">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          {ERROR_BANDS.map((band) => (
            <span key={band} className="flex items-center space-x-1.5 text-[#5B6875]">
              <span className="w-3 h-3 rounded-full" style={{ backgroundColor: BAND_COLOURS[band] }} />
              <span>{bandLabels[band]}</span>
            </span>
          ))}
        </div>

        {selected && (
          <div className="bg-[#F4F7FA] border border-[#D5DDE5] px-3 py-1.5 rounded text-[11px] text-[#17212B]">
            REF ({selected.reference[0].toFixed(1)}, {selected.reference[1].toFixed(1)}) → SRC ({selected.source[0].toFixed(2)},{' '}
            {selected.source[1].toFixed(2)}) · <span className="font-bold text-[#176B87]">{formatPx(selected.errorPx, 3)}</span>
          </div>
        )}
      </div>
    </div>
  );
};
