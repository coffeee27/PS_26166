import React from 'react';
import type { MatchStatusType, LocationVerification } from '../../types/matching';
import { useTranslation } from '../../i18n';
import { ShieldCheck, AlertCircle, CheckCircle } from 'lucide-react';

interface MatchStatusProps {
  status: MatchStatusType;
  verification: LocationVerification;
}

export const MatchStatus: React.FC<MatchStatusProps> = ({ status, verification }) => {
  const { t } = useTranslation();

  const getStatusBadge = () => {
    switch (status) {
      case 'HIGH_MATCH':
        return {
          label: t('highMatch'),
          bg: 'bg-[#EEF7F2]',
          border: 'border-[#2E7D5B]',
          text: 'text-[#2E7D5B]',
          icon: <ShieldCheck className="w-5 h-5 text-[#2E7D5B]" />,
        };
      case 'POSSIBLE_MATCH':
        return {
          label: t('possibleMatch'),
          bg: 'bg-[#FFFDF5]',
          border: 'border-[#C48A24]',
          text: 'text-[#C48A24]',
          icon: <AlertCircle className="w-5 h-5 text-[#C48A24]" />,
        };
      case 'LOW_MATCH':
      default:
        return {
          label: t('lowMatch'),
          bg: 'bg-[#FDF5F5]',
          border: 'border-[#B94A48]',
          text: 'text-[#B94A48]',
          icon: <AlertCircle className="w-5 h-5 text-[#B94A48]" />,
        };
    }
  };

  const getVerificationText = () => {
    switch (verification) {
      case 'LIKELY_SAME':
        return t('likelySameLocation');
      case 'LIKELY_DIFFERENT':
        return t('likelyDifferentLocation');
      case 'UNCERTAIN':
      default:
        return t('uncertainLocation');
    }
  };

  const currentBadge = getStatusBadge();

  return (
    <div className="bg-white border border-[#D5DDE5] rounded-lg p-5 shadow-sm space-y-4 flex flex-col justify-between">
      <div>
        <span className="text-[11px] font-mono font-semibold uppercase tracking-wider text-[#5B6875] block mb-2">
          {t('matchStatus')}
        </span>

        <div className={`p-3 rounded-lg border ${currentBadge.bg} ${currentBadge.border} flex items-center space-x-3`}>
          {currentBadge.icon}
          <div>
            <span className={`text-sm font-mono font-bold uppercase tracking-wider ${currentBadge.text}`}>
              {currentBadge.label}
            </span>
            <span className="block text-[10px] font-mono text-[#5B6875]">
              CONFIDENCE THRESHOLD MET &gt; 85%
            </span>
          </div>
        </div>
      </div>

      <div className="border-t border-[#E9EEF3] pt-3">
        <span className="text-[10px] font-mono uppercase text-[#7E8B9B] block mb-1">
          {t('locationVerification')}
        </span>
        <div className="flex items-center space-x-2 bg-[#F4F7FA] border border-[#D5DDE5] p-2.5 rounded font-mono">
          <CheckCircle className="w-4 h-4 text-[#176B87]" />
          <span className="text-xs font-bold text-[#17212B] uppercase">
            {getVerificationText()}
          </span>
        </div>
      </div>
    </div>
  );
};
