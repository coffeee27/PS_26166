import React from 'react';
import { useTranslation } from '../../i18n';
import { Loader2, CheckCircle2, Cpu } from 'lucide-react';

interface AnalysisProgressProps {
  currentStep: number;
  progressPercent: number;
}

export const AnalysisProgress: React.FC<AnalysisProgressProps> = ({
  currentStep,
  progressPercent,
}) => {
  const { t } = useTranslation();

  const steps = [
    { key: 'stagePreprocessing', label: t('stagePreprocessing') },
    { key: 'stageExtractingFeatures', label: t('stageExtractingFeatures') },
    { key: 'stageAligningImages', label: t('stageAligningImages') },
    { key: 'stageComparingTerrain', label: t('stageComparingTerrain') },
    { key: 'stageGeneratingHeatmap', label: t('stageGeneratingHeatmap') },
    { key: 'stageVerifyingLocation', label: t('stageVerifyingLocation') },
  ];

  return (
    <div className="bg-white border border-[#D5DDE5] rounded-lg p-5 shadow-sm space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between font-mono text-xs">
        <div className="flex items-center space-x-2 text-[#176B87] font-bold uppercase">
          <Cpu className="w-4 h-4 animate-spin" />
          <span>EXECUTING COMPUTER VISION FEATURE MATCHING PIPELINE...</span>
        </div>
        <span className="font-bold text-[#176B87]">{progressPercent}% COMPLETE</span>
      </div>

      {/* Main Progress Bar */}
      <div className="w-full bg-[#E9EEF3] h-2.5 rounded-full overflow-hidden border border-[#D5DDE5]">
        <div
          className="bg-[#176B87] h-full transition-all duration-300 rounded-full"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Step Sequence Checklist */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 font-mono text-xs pt-1">
        {steps.map((step, idx) => {
          const isDone = idx < currentStep;
          const isCurrent = idx === currentStep;

          return (
            <div
              key={step.key}
              className={`flex items-center space-x-2 p-2 rounded border text-[11px] transition-colors ${
                isDone
                  ? 'bg-[#EEF7F2] border-[#2E7D5B]/30 text-[#2E7D5B]'
                  : isCurrent
                  ? 'bg-[#E6F0F4] border-[#176B87] text-[#176B87] font-semibold'
                  : 'bg-[#F8FAFC] border-[#E2E8F0] text-[#94A3B8]'
              }`}
            >
              {isDone ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-[#2E7D5B] shrink-0" />
              ) : isCurrent ? (
                <Loader2 className="w-3.5 h-3.5 text-[#176B87] animate-spin shrink-0" />
              ) : (
                <span className="w-3.5 h-3.5 rounded-full border border-gray-300 inline-block shrink-0" />
              )}
              <span className="truncate">{step.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
