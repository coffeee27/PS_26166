import React from 'react';
import { useTranslation } from '../../i18n';
import { Globe } from 'lucide-react';

interface LanguageToggleProps {
  /** `dark` is for dark surfaces such as the landing page header. */
  variant?: 'light' | 'dark';
}

export const LanguageToggle: React.FC<LanguageToggleProps> = ({ variant = 'light' }) => {
  const { language, setLanguage } = useTranslation();
  const dark = variant === 'dark';

  const optionClass = (active: boolean) =>
    `px-2 py-1 rounded transition-colors font-medium ${
      active
        ? 'bg-[#176B87] text-white shadow-sm'
        : dark
          ? 'text-white/60 hover:text-white'
          : 'text-[#5B6875] hover:text-[#17212B]'
    }`;

  return (
    <div
      className={`inline-flex items-center rounded-md p-0.5 text-xs font-mono border ${
        dark ? 'bg-white/5 border-white/15' : 'bg-[#DCE4EC] border-[#C5D2E0]'
      }`}
    >
      <div className={`flex items-center px-1.5 py-1 ${dark ? 'text-white/50' : 'text-[#5B6875]'}`}>
        <Globe className="w-3.5 h-3.5 mr-1" />
      </div>
      <button type="button" onClick={() => setLanguage('en')} className={optionClass(language === 'en')}>
        EN
      </button>
      <span className={`px-0.5 ${dark ? 'text-white/20' : 'text-[#A0ACB8]'}`}>|</span>
      <button type="button" onClick={() => setLanguage('hi')} className={optionClass(language === 'hi')}>
        हिंदी
      </button>
    </div>
  );
};
