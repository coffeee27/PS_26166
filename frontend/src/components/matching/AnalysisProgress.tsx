import React from 'react';
import { useTranslation } from '../../i18n';
import { Cpu, Timer } from 'lucide-react';

interface AnalysisProgressProps {
  elapsedMs: number;
}

/**
 * The engine runs as one request with no intermediate progress, so this shows
 * elapsed time and the stages being executed rather than a made-up percentage.
 */
export const AnalysisProgress: React.FC<AnalysisProgressProps> = ({ elapsedMs }) => {
  const { t } = useTranslation();

  const stages = [
    t('stagePreprocessing'),
    t('stageExtractingFeatures'),
    t('stageAligningImages'),
    t('stageComparingTerrain'),
    t('stageGeneratingHeatmap'),
    t('stageVerifyingLocation'),
  ];

  return (
    <div className="bg-white border border-[#D5DDE5] rounded-lg p-5 shadow-sm space-y-4" role="status" aria-live="polite">
      <div className="flex items-center justify-between font-mono text-xs">
        <div className="flex items-center space-x-2 text-[#176B87] font-bold uppercase">
          <Cpu className="w-4 h-4 animate-spin" />
          <span>{t('progressTitle')}</span>
        </div>
        <span className="font-bold text-[#176B87] flex items-center">
          <Timer className="w-3.5 h-3.5 mr-1" />
          {t('progressElapsed')} {(elapsedMs / 1000).toFixed(1)} s
        </span>
      </div>

      <div className="w-full bg-[#E9EEF3] h-2.5 rounded-full overflow-hidden border border-[#D5DDE5] relative">
        <div className="absolute inset-y-0 w-1/3 bg-[#176B87] rounded-full animate-[indeterminate_1.4s_ease-in-out_infinite]" />
      </div>
      <style>{'@keyframes indeterminate{0%{left:-33%}100%{left:100%}}'}</style>

      <ol className="grid grid-cols-2 sm:grid-cols-3 gap-2 font-mono text-[11px] pt-1">
        {stages.map((stage, index) => (
          <li key={stage} className="flex items-center space-x-2 p-2 rounded border bg-[#F8FAFC] border-[#E2E8F0] text-[#5B6875]">
            <span className="w-4 h-4 rounded-full bg-[#176B87]/10 text-[#176B87] text-[9px] font-bold flex items-center justify-center shrink-0">
              {index + 1}
            </span>
            <span className="truncate">{stage}</span>
          </li>
        ))}
      </ol>
      <p className="text-[11px] font-mono text-[#7E8B9B]">{t('progressHint')}</p>
    </div>
  );
};
