import React from 'react';
import type { RegistrationResult } from '../../types/matching';
import { useTranslation } from '../../i18n';
import { ShieldCheck, ShieldAlert, Target, Crosshair, Grid3x3, Spline, Layers } from 'lucide-react';
import { formatMetres, formatPercent, formatPx, modelLabel } from '../../utils/registration';

interface MetricTileProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  detail?: string;
}

export const MetricTile: React.FC<MetricTileProps> = ({ icon, label, value, detail }) => (
  <div className="p-3 bg-[#F8FAFC] border border-[#D5DDE5] rounded font-mono">
    <span className="text-[10px] text-[#5B6875] uppercase flex items-center mb-1">
      <span className="text-[#176B87] mr-1">{icon}</span>
      {label}
    </span>
    <span className="text-xl font-bold text-[#17212B] block leading-tight">{value}</span>
    {detail && <span className="text-[10px] text-[#7E8B9B] block mt-0.5">{detail}</span>}
  </div>
);

export const QualityBanner: React.FC<{ result: RegistrationResult }> = ({ result }) => {
  const { t } = useTranslation();
  const accepted = result.qualityStatus === 'ACCEPTED';
  const subpixel = result.subpixelAccuracy === 'ACHIEVED';

  return (
    <div
      className={`rounded-lg border p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 font-mono ${
        accepted ? 'bg-[#EEF7F2] border-[#2E7D5B]/40' : 'bg-[#FDF5F5] border-[#B94A48]/40'
      }`}
    >
      <div className="flex items-center space-x-3">
        {accepted ? <ShieldCheck className="w-8 h-8 text-[#2E7D5B]" /> : <ShieldAlert className="w-8 h-8 text-[#B94A48]" />}
        <div>
          <span className="text-[10px] text-[#5B6875] uppercase block">{t('qualityDecision')}</span>
          <span className={`text-lg font-bold tracking-wider ${accepted ? 'text-[#2E7D5B]' : 'text-[#B94A48]'}`}>
            {accepted ? t('accepted') : t('rejected')}
          </span>
          <span className="block text-[11px] text-[#5B6875]">
            {result.qualityReasons.length ? `${t('reasons')}: ${result.qualityReasons.join(' · ')}` : t('noReasons')}
          </span>
        </div>
      </div>
      <div className="sm:text-right">
        <span className="text-[10px] text-[#5B6875] uppercase block">{t('subpixelAccuracy')}</span>
        <span
          className={`inline-block text-xs font-bold px-2 py-1 rounded border ${
            subpixel ? 'text-[#176B87] bg-white border-[#176B87]/40' : 'text-[#C48A24] bg-white border-[#E3A93B]/50'
          }`}
        >
          {subpixel ? t('achieved') : t('notAchieved')} · {formatPx(result.holdoutRmsePx)}
        </span>
      </div>
    </div>
  );
};

export const RegistrationSummary: React.FC<{ result: RegistrationResult }> = ({ result }) => {
  const { t } = useTranslation();

  return (
    <div className="space-y-4">
      <QualityBanner result={result} />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MetricTile
          icon={<Target className="w-3 h-3" />}
          label={t('holdoutRmse')}
          value={formatPx(result.holdoutRmsePx)}
          detail={result.holdoutRmseM !== null ? `= ${formatMetres(result.holdoutRmseM)}` : undefined}
        />
        <MetricTile
          icon={<Crosshair className="w-3 h-3" />}
          label={t('tiePoints')}
          value={result.tiePointCount.toLocaleString()}
          detail={`${t('tiePointRatio')} ${formatPercent(result.inlierRatio)}`}
        />
        <MetricTile
          icon={<Grid3x3 className="w-3 h-3" />}
          label={t('coverage')}
          value={formatPercent(result.spatialCoverage)}
          detail={`${t('uniformity')} ${result.uniformityScore.toFixed(2)}`}
        />
        <MetricTile
          icon={<Spline className="w-3 h-3" />}
          label={t('geometricModel')}
          value={modelLabel(result.model).split(', ')[0]}
          detail={modelLabel(result.model).split(', ')[1]}
        />
      </div>
      <p className="text-[11px] font-mono text-[#5B6875]">{t('holdoutNote')}</p>

      <div className="bg-white border border-[#D5DDE5] rounded-lg p-4 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 font-mono text-xs">
          <span className="font-bold text-[#17212B] uppercase flex items-center">
            <Layers className="w-4 h-4 mr-1.5 text-[#176B87]" />
            {t('overlayTitle')}
          </span>
          <span className="text-[11px] text-[#5B6875]">{t('overlayDesc')}</span>
        </div>
        <div className="bg-[#17212B] rounded overflow-hidden border border-[#D5DDE5] flex justify-center">
          <img src={result.images.overlay} alt={t('overlayTitle')} className="max-h-[560px] w-auto object-contain" />
        </div>
      </div>
    </div>
  );
};
