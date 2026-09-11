import React from 'react';
import { useTranslation } from '../../i18n';
import { Globe } from 'lucide-react';

export const LanguageToggle: React.FC = () => {
  const { language, setLanguage } = useTranslation();

  return (
    <div className="inline-flex items-center bg-[#DCE4EC] border border-[#C5D2E0] rounded-md p-0.5 text-xs font-mono">
      <div className="flex items-center px-1.5 py-1 text-[#5B6875]">
        <Globe className="w-3.5 h-3.5 mr-1" />
      </div>
      <button
        type="button"
        onClick={() => setLanguage('en')}
        className={`px-2 py-1 rounded transition-colors font-medium ${
          language === 'en'
            ? 'bg-[#176B87] text-white shadow-sm'
            : 'text-[#5B6875] hover:text-[#17212B]'
        }`}
      >
        EN
      </button>
      <span className="text-[#A0ACB8] px-0.5">|</span>
      <button
        type="button"
        onClick={() => setLanguage('hi')}
        className={`px-2 py-1 rounded transition-colors font-medium ${
          language === 'hi'
            ? 'bg-[#176B87] text-white shadow-sm'
            : 'text-[#5B6875] hover:text-[#17212B]'
        }`}
      >
        हिंदी
      </button>
    </div>
  );
};
