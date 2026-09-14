import React from 'react';
import type { RegistrationResult } from '../../types/matching';
import { useTranslation } from '../../i18n';
import { Ruler, Maximize2, Info, Sigma } from 'lucide-react';
import { formatMetres, formatPx, modelLabel } from '../../utils/registration';

const Field: React.FC<{ label: string; value: string; icon: React.ReactNode }> = ({ label, value, icon }) => (
  <div className="p-3 bg-[#F8FAFC] border border-[#D5DDE5] rounded">
    <span className="text-[10px] text-[#5B6875] uppercase flex items-center mb-1">
      <span className="text-[#176B87] mr-1">{icon}</span>
      {label}
    </span>
    <span className="font-bold text-[#17212B] text-sm block">{value}</span>
  </div>
);

export const GeospatialPanel: React.FC<{ result: RegistrationResult }> = ({ result }) => {
  const { t } = useTranslation();
  const gsd = (value: number | null) => (value === null ? t('notProvided') : `${value.toFixed(3)} m/px`);
  const size = ([height, width]: [number, number]) => `${width} × ${height} px`;

  return (
    <div className="bg-white border border-[#D5DDE5] rounded-lg p-5 shadow-sm space-y-5 font-mono text-xs">
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
        <Field label={t('referenceGsd')} value={gsd(result.referenceGsd)} icon={<Ruler className="w-3 h-3" />} />
        <Field label={t('sourceGsd')} value={gsd(result.sourceGsd)} icon={<Ruler className="w-3 h-3" />} />
        <Field label={t('referenceSize')} value={size(result.referenceShape)} icon={<Maximize2 className="w-3 h-3" />} />
        <Field label={t('sourceSize')} value={size(result.sourceShape)} icon={<Maximize2 className="w-3 h-3" />} />
        <Field label={t('geometricModel')} value={modelLabel(result.model)} icon={<Sigma className="w-3 h-3" />} />
        <Field
          label={t('holdoutRmse')}
          value={`${formatPx(result.holdoutRmsePx)}${result.holdoutRmseM !== null ? ` · ${formatMetres(result.holdoutRmseM)}` : ''}`}
          icon={<Sigma className="w-3 h-3" />}
        />
      </div>

      <div className="space-y-2">
        <span className="text-[10px] font-bold text-[#17212B] uppercase tracking-wider block">{t('transformTitle')}</span>
        <div className="overflow-x-auto">
          <table className="border border-[#D5DDE5] rounded bg-[#F8FAFC]">
            <tbody>
              {result.transformation.map((row, i) => (
                <tr key={i}>
                  {row.map((value, j) => (
                    <td key={j} className="px-4 py-1.5 text-right text-[#17212B] tabular-nums">
                      {Math.abs(value) < 1e-3 && value !== 0 ? value.toExponential(3) : value.toFixed(5)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-[11px] text-[#7E8B9B]">{t('transformNote')}</p>
      </div>

      <div className="bg-[#F0F6F9] border border-[#176B87]/25 rounded-md p-3 flex items-start space-x-3">
        <Info className="w-4 h-4 text-[#176B87] shrink-0 mt-0.5" />
        <div>
          <span className="font-bold text-[#176B87] block uppercase">{t('geoPendingTitle')}</span>
          <span className="text-[#5B6875] leading-relaxed">{t('geoPendingDesc')}</span>
        </div>
      </div>
    </div>
  );
};
