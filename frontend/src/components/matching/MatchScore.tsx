import React from 'react';
import { useTranslation } from '../../i18n';

interface MatchScoreProps {
  confidence: number;
}

export const MatchScore: React.FC<MatchScoreProps> = ({ confidence }) => {
  const { t } = useTranslation();
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (confidence / 100) * circumference;

  const getScoreColor = () => {
    if (confidence >= 80) return '#176B87';
    if (confidence >= 60) return '#E3A93B';
    return '#B94A48';
  };

  return (
    <div className="bg-white border border-[#D5DDE5] rounded-lg p-5 shadow-sm flex flex-col items-center justify-center text-center space-y-2">
      <span className="text-[11px] font-mono font-semibold uppercase tracking-wider text-[#5B6875]">
        {t('matchConfidence')}
      </span>

      {/* Restrained Ring Gauge */}
      <div className="relative w-32 h-32 flex items-center justify-center my-1">
        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
          {/* Background track */}
          <circle
            cx="50"
            cy="50"
            r={radius}
            fill="transparent"
            stroke="#E9EEF3"
            strokeWidth="8"
          />
          {/* Active confidence fill ring */}
          <circle
            cx="50"
            cy="50"
            r={radius}
            fill="transparent"
            stroke={getScoreColor()}
            strokeWidth="8"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="transition-all duration-1000 ease-out"
          />
        </svg>

        {/* Center numerical confidence text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center font-mono">
          <span className="text-2xl font-bold tracking-tight text-[#17212B]">
            {confidence}%
          </span>
          <span className="text-[9px] uppercase font-semibold text-[#5B6875]">
            MATCH RATIO
          </span>
        </div>
      </div>

      <div className="text-[11px] font-mono text-[#5B6875]">
        FEATURE ALIGNMENT SCORE
      </div>
    </div>
  );
};
