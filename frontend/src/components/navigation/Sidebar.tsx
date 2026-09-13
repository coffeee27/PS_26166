import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from '../../i18n';
import { SidebarNavItem } from './SidebarNavItem';
import { LanguageToggle } from '../common/LanguageToggle';
import {
  Compass,
  Layers,
  Activity,
  Grid,
  MapPin,
  FileCheck,
  Radio,
  Database,
  Info,
  X,
} from 'lucide-react';

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { t } = useTranslation();

  const navItems = [
    { to: '/overview', label: t('navOverview'), icon: <Compass className="w-4 h-4" /> },
    { to: '/matching', label: t('navMatching'), icon: <Layers className="w-4 h-4" /> },
    { to: '/heatmap', label: t('navHeatmap'), icon: <Activity className="w-4 h-4" /> },
    { to: '/features', label: t('navFeatures'), icon: <Grid className="w-4 h-4" /> },
    { to: '/geospatial', label: t('navGeospatial'), icon: <MapPin className="w-4 h-4" /> },
    { to: '/results', label: t('navResults'), icon: <FileCheck className="w-4 h-4" /> },
  ];

  return (
    <aside
      className={`fixed top-0 left-0 bottom-0 z-40 w-64 bg-[#E9EEF3] border-r border-[#D5DDE5] flex flex-col justify-between transition-transform duration-300 lg:translate-x-0 ${
        isOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'
      }`}
    >
      {/* Sidebar Header */}
      <div>
        <div className="p-4 border-b border-[#D5DDE5] bg-[#E2E8F0]/50 flex items-center justify-between">
          {/* Identity doubles as the route back to the public landing page */}
          <Link to="/" onClick={onClose} className="group">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-[#176B87] rounded-sm" />
              <span className="text-xs font-mono font-bold tracking-widest text-[#176B87]">
                {t('appTitle')}
              </span>
            </div>
            <h1 className="text-sm font-bold font-mono text-[#17212B] tracking-wider mt-0.5 uppercase group-hover:text-[#176B87] transition-colors">
              {t('appSubtitle')}
            </h1>
          </Link>
          {onClose && (
            <button
              onClick={onClose}
              className="lg:hidden p-1 text-[#5B6875] hover:text-[#17212B] rounded"
              aria-label="Close sidebar"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Navigation list */}
        <nav className="py-3">
          <div className="px-3 pb-2 text-[10px] font-mono uppercase tracking-wider text-[#7E8B9B]">
            Navigation
          </div>
          {navItems.map((item) => (
            <SidebarNavItem
              key={item.to}
              to={item.to}
              label={item.label}
              icon={item.icon}
              onClick={onClose}
            />
          ))}
        </nav>
      </div>

      {/* Sidebar Footer & System Status */}
      <div className="p-4 border-t border-[#D5DDE5] bg-[#E2E8F0]/30 space-y-4">
        {/* Language selector */}
        <div className="flex items-center justify-between pb-2 border-b border-[#D5DDE5]">
          <span className="text-[11px] font-mono text-[#5B6875] uppercase font-semibold">Language</span>
          <LanguageToggle />
        </div>

        {/* System Status block */}
        <div className="space-y-2 text-xs font-mono">
          <div className="text-[10px] font-bold uppercase tracking-wider text-[#7E8B9B] flex items-center space-x-1">
            <Radio className="w-3 h-3 text-[#176B87]" />
            <span>{t('systemStatus')}</span>
          </div>

          <div className="bg-white p-2.5 rounded border border-[#D5DDE5] space-y-1.5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-[#5B6875]">{t('analysisEngine')}</span>
              <span className="flex items-center text-[10px] font-bold text-[#2E7D5B] bg-[#EEF7F2] px-1.5 py-0.5 rounded border border-[#2E7D5B]/30">
                <span className="w-1.5 h-1.5 rounded-full bg-[#2E7D5B] mr-1 animate-pulse" />
                {t('statusOnline')}
              </span>
            </div>

            <div className="flex items-center justify-between pt-1 border-t border-[#F0F4F8]">
              <span className="text-[11px] text-[#5B6875] flex items-center">
                <Database className="w-3 h-3 mr-1 text-[#5B6875]" />
                {t('dataset')}
              </span>
              <span className="text-[10px] text-[#17212B] font-semibold">{t('datasetValue')}</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-[11px] text-[#5B6875] flex items-center">
                <Info className="w-3 h-3 mr-1 text-[#5B6875]" />
                {t('version')}
              </span>
              <span className="text-[10px] text-[#176B87] font-semibold">{t('versionValue')}</span>
            </div>
          </div>
        </div>

        {/* Demo banner badge */}
        <div className="bg-[#FFFDF5] border border-[#E3A93B]/40 rounded p-2 text-center">
          <span className="block text-[10px] font-mono font-bold text-[#C48A24] uppercase">
            {t('demoNotice')}
          </span>
          <span className="block text-[9px] text-[#5B6875] leading-tight mt-0.5">
            {t('demoSubnotice')}
          </span>
        </div>
      </div>
    </aside>
  );
};
