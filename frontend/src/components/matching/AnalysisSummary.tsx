import React from 'react';
import type { RegistrationResult } from '../../types/matching';
import { useTranslation } from '../../i18n';
import { FileCheck, FileJson, FileSpreadsheet, Printer, Cpu, ArrowRight, Target, Crosshair, Grid3x3, Gauge, ExternalLink, Map } from 'lucide-react';
import { Link } from 'react-router-dom';
import { MetricTile, QualityBanner } from './RegistrationSummary';
import { ProveCard } from './ProveCard';
import { downloadReport, formatMetres, formatPercent, formatPx, modelLabel } from '../../utils/registration';

export const AnalysisSummary: React.FC<{ result: RegistrationResult }> = ({ result }) => {
  const { t } = useTranslation();

  const models = Object.entries(result.modelRmsePx);
  const worst = Math.max(...models.map(([, value]) => value), result.holdoutRmsePx);

  const outputs = [
    { src: result.images.overlay, label: t('overlayTitle') },
    { src: result.images.registered, label: t('registeredImage') },
    { src: result.images.errorHeatmap, label: t('errorHeatmapImage') },
    { src: result.images.tiePoints, label: t('tiePointImage') },
  ];

  const buttonClass = 'px-3 py-2 rounded font-semibold transition-colors flex items-center space-x-1.5';

  return (
    <div className="bg-white border border-[#D5DDE5] rounded-lg p-6 shadow-sm space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between pb-4 border-b border-[#E9EEF3] gap-3">
        <div>
          <div className="flex items-center space-x-2">
            <FileCheck className="w-5 h-5 text-[#176B87]" />
            <h2 className="text-base font-bold font-mono text-[#17212B] uppercase tracking-wider">{t('resultsTitle')}</h2>
          </div>
          <p className="text-[11px] font-mono text-[#5B6875] mt-1">
            {result.referenceFilename} ← {result.sourceFilename} · {new Date(result.analyzedAt).toLocaleString()}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 font-mono text-xs print:hidden">
          <button type="button" onClick={() => downloadReport(result)} className={`${buttonClass} bg-[#176B87] hover:bg-[#3B82A0] text-white shadow`}>
            <FileJson className="w-4 h-4" />
            <span>{t('downloadReport')}</span>
          </button>
          <a href={result.images.tiePointsCsv} download={`tie_points_${result.jobId}.csv`} className={`${buttonClass} bg-[#176B87] hover:bg-[#3B82A0] text-white shadow`}>
            <FileSpreadsheet className="w-4 h-4" />
            <span>{t('downloadTiePoints')}</span>
          </a>
          <a
            href={result.images.registeredGeotiff}
            download={`registered_${result.jobId}.tif`}
            title={result.georeferenced ? t('geotiffGeoreferenced') : t('geotiffPixelOnly')}
            className={`${buttonClass} bg-[#176B87] hover:bg-[#3B82A0] text-white shadow`}
          >
            <Map className="w-4 h-4" />
            <span>{t('downloadGeotiff')}</span>
          </a>
          <button type="button" onClick={() => window.print()} className={`${buttonClass} bg-[#F4F7FA] hover:bg-[#E9EEF3] text-[#17212B] border border-[#D5DDE5]`}>
            <Printer className="w-4 h-4" />
            <span>{t('printSummary')}</span>
          </button>
        </div>
      </div>

      <QualityBanner result={result} />
      <ProveCard prove={result.prove} />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MetricTile
          icon={<Target className="w-3 h-3" />}
          label={t('holdoutRmse')}
          value={formatPx(result.holdoutRmsePx)}
          detail={result.holdoutRmseM !== null ? `= ${formatMetres(result.holdoutRmseM)}` : undefined}
        />
        <MetricTile icon={<Gauge className="w-3 h-3" />} label={t('fitRmse')} value={formatPx(result.fitRmsePx)} detail={`${t('maxError')} ${formatPx(result.maxErrorPx)}`} />
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
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 font-mono text-xs">
        <div className="lg:col-span-2 border border-[#D5DDE5] rounded p-4 space-y-2">
          <span className="text-[10px] font-bold text-[#17212B] uppercase tracking-wider block">{t('modelComparison')}</span>
          {models.map(([name, value]) => {
            const isSelected = name === result.model;
            return (
              <div key={name} className="grid grid-cols-[9rem_1fr_5rem] items-center gap-3">
                <span className={isSelected ? 'font-bold text-[#176B87]' : 'text-[#5B6875]'}>{modelLabel(name)}</span>
                <div className="h-3 bg-[#E9EEF3] rounded overflow-hidden">
                  <div className={`h-full rounded ${isSelected ? 'bg-[#176B87]' : 'bg-[#94A3B8]'}`} style={{ width: `${(value / worst) * 100}%` }} />
                </div>
                <span className={`text-right tabular-nums ${isSelected ? 'font-bold text-[#176B87]' : 'text-[#17212B]'}`}>
                  {formatPx(value)}
                </span>
              </div>
            );
          })}
          <p className="text-[10px] text-[#7E8B9B] pt-1">
            {modelLabel(result.model)} · {t('selectedModel')}
          </p>
        </div>

        <div className="border border-[#D5DDE5] rounded p-4 space-y-2">
          <span className="text-[10px] font-bold text-[#17212B] uppercase tracking-wider block">{t('pipelineTitle')}</span>
          {[
            [t('putativeMatches'), result.putativeMatches.toLocaleString()],
            [t('coarseInliers'), result.coarseInliers.toLocaleString()],
            [t('tiePoints'), result.tiePointCount.toLocaleString()],
            [t('engineTime'), `${result.engineSeconds.toFixed(1)} s`],
            [t('roundTrip'), `${(result.processingTimeMs / 1000).toFixed(1)} s`],
          ].map(([label, value]) => (
            <div key={label} className="flex justify-between">
              <span className="text-[#5B6875]">{label}</span>
              <span className="font-bold text-[#17212B] tabular-nums">{value}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <span className="text-[10px] font-mono font-bold text-[#17212B] uppercase tracking-wider block">{t('outputsTitle')}</span>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
          {outputs.map((output) => (
            <a
              key={output.label}
              href={output.src}
              target="_blank"
              rel="noreferrer"
              className="group border border-[#D5DDE5] rounded p-2 bg-[#F8FAFC] hover:border-[#176B87] transition-colors"
            >
              <div className="aspect-square bg-black rounded overflow-hidden">
                <img src={output.src} alt={output.label} loading="lazy" className="w-full h-full object-contain" />
              </div>
              <div className="mt-2 flex items-center justify-between text-[11px] font-mono">
                <span className="text-[#17212B] font-semibold">{output.label}</span>
                <span className="text-[#176B87] flex items-center opacity-70 group-hover:opacity-100">
                  <ExternalLink className="w-3 h-3 mr-1" />
                  {t('openFullSize')}
                </span>
              </div>
            </a>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-mono text-xs print:hidden">
        {[
          { to: '/heatmap', label: t('viewHeatmap') },
          { to: '/features', label: t('viewFeatures') },
          { to: '/geospatial', label: t('viewGeospatial') },
        ].map((link) => (
          <Link
            key={link.to}
            to={link.to}
            className="p-3 border border-[#D5DDE5] hover:border-[#176B87] rounded text-[#17212B] bg-[#F8FAFC] hover:bg-[#F0F6F9] transition-colors flex items-center justify-between group"
          >
            <span>{link.label}</span>
            <ArrowRight className="w-4 h-4 text-[#176B87] group-hover:translate-x-1 transition-transform" />
          </Link>
        ))}
      </div>

      <div className="bg-[#F4F7FA] border border-[#D5DDE5] rounded p-4 text-xs font-mono space-y-1.5">
        <div className="flex items-center space-x-2 font-bold text-[#176B87] uppercase">
          <Cpu className="w-4 h-4" />
          <span>{t('backendNoteTitle')}</span>
        </div>
        <p className="text-[#5B6875] leading-relaxed">{t('backendNoteDesc')}</p>
      </div>
    </div>
  );
};
