import React from 'react';
import { useTranslation } from '../../i18n';
import { Target, ArrowRight, Layers, Cpu, Activity, MapPin, Compass } from 'lucide-react';
import { Link } from 'react-router-dom';

export const MissionOverview: React.FC = () => {
  const { t } = useTranslation();

  const pipelineSteps = [
    { num: '01', title: t('stepAcquisition'), icon: <Layers className="w-4 h-4 text-[#176B87]" /> },
    { num: '02', title: t('stepPreprocessing'), icon: <Cpu className="w-4 h-4 text-[#176B87]" /> },
    { num: '03', title: t('stepFeatureExtraction'), icon: <Compass className="w-4 h-4 text-[#176B87]" /> },
    { num: '04', title: t('stepSpatialMatching'), icon: <Target className="w-4 h-4 text-[#176B87]" /> },
    { num: '05', title: t('stepHeatmap'), icon: <Activity className="w-4 h-4 text-[#176B87]" /> },
    { num: '06', title: t('stepGeospatial'), icon: <MapPin className="w-4 h-4 text-[#176B87]" /> },
  ];

  return (
    <div className="space-y-6">
      <div className="bg-white border border-[#D5DDE5] rounded-lg p-6 shadow-sm space-y-3">
        <div className="flex items-center space-x-2 text-xs font-mono font-bold text-[#176B87] uppercase tracking-widest">
          <span className="w-2.5 h-2.5 bg-[#176B87] rounded-sm" />
          <span>PS-166 REMOTE SENSING PLATFORM</span>
        </div>
        <h1 className="text-2xl font-bold font-mono text-[#17212B] uppercase tracking-tight">
          {t('mainHeading')}
        </h1>
        <p className="text-sm text-[#5B6875] max-w-4xl leading-relaxed font-sans">
          {t('mainSubheading')}
        </p>

        <div className="pt-2 flex flex-wrap gap-3">
          <Link
            to="/matching"
            className="px-5 py-2.5 rounded bg-[#176B87] hover:bg-[#3B82A0] text-white font-mono text-xs font-semibold transition-colors inline-flex items-center space-x-2 shadow"
          >
            <span>LAUNCH IMAGE MATCHING WORKSTATION</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      <div className="bg-white border border-[#D5DDE5] rounded-lg p-6 shadow-sm space-y-3">
        <div className="flex items-center space-x-2 pb-2 border-b border-[#E9EEF3]">
          <Target className="w-5 h-5 text-[#176B87]" />
          <h2 className="text-sm font-bold font-mono text-[#17212B] uppercase tracking-wider">
            {t('missionObjectiveTitle')}
          </h2>
        </div>
        <p className="text-xs text-[#5B6875] font-mono leading-relaxed">
          {t('missionObjectiveDesc')}
        </p>
      </div>

      <div className="bg-white border border-[#D5DDE5] rounded-lg p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[#E9EEF3] font-mono text-xs">
          <span className="font-bold text-[#17212B] uppercase tracking-wider">
            {t('processingPipeline')}
          </span>
          <span className="text-[10px] text-[#176B87] bg-[#176B87]/10 px-2 py-0.5 rounded font-semibold">
            6 STAGE COMPUTER VISION ARCHITECTURE
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 pt-1 font-mono text-xs">
          {pipelineSteps.map((step, idx) => (
            <div
              key={step.num}
              className="bg-[#F8FAFC] border border-[#D5DDE5] p-3 rounded-lg relative space-y-2 hover:border-[#176B87] transition-colors"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-[#A0ACB8] font-bold">{step.num}</span>
                {step.icon}
              </div>
              <span className="font-bold text-[#17212B] text-[11px] block uppercase leading-snug">
                {step.title}
              </span>
              {idx < pipelineSteps.length - 1 && (
                <div className="hidden lg:block absolute -right-2 top-1/2 -translate-y-1/2 z-10">
                  <ArrowRight className="w-3.5 h-3.5 text-[#C4D0DC]" />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
