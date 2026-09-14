import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { useTranslation } from '../../i18n';

export const NoResultState: React.FC<{ icon: React.ReactNode }> = ({ icon }) => {
  const { t } = useTranslation();
  return (
    <div className="bg-white border border-[#D5DDE5] rounded-lg p-8 text-center font-mono space-y-4">
      <div className="w-12 h-12 text-[#176B87] mx-auto flex items-center justify-center">{icon}</div>
      <h3 className="text-sm font-bold text-[#17212B] uppercase">{t('noResultTitle')}</h3>
      <p className="text-xs text-[#5B6875] max-w-md mx-auto">{t('noResultDesc')}</p>
      <Link
        to="/matching"
        className="inline-flex items-center space-x-2 px-4 py-2 bg-[#176B87] text-white text-xs font-bold rounded hover:bg-[#3B82A0] transition-colors"
      >
        <span>{t('goToMatching')}</span>
        <ArrowRight className="w-4 h-4" />
      </Link>
    </div>
  );
};
