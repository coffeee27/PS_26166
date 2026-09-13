import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from '../components/navigation/Sidebar';
import { Footer } from '../components/common/Footer';
import { LanguageToggle } from '../components/common/LanguageToggle';
import { useTranslation } from '../i18n';
import { Menu } from 'lucide-react';

export const AppLayout: React.FC = () => {
  const { t } = useTranslation();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState<boolean>(false);

  return (
    <div className="min-h-screen bg-[#F4F7FA] text-[#17212B] flex flex-col antialiased">
      {/* Persistent Left Sidebar on desktop / Drawer on mobile */}
      <Sidebar
        isOpen={mobileSidebarOpen}
        onClose={() => setMobileSidebarOpen(false)}
      />

      {/* Main Workspace Wrapper */}
      <div className="lg:pl-64 flex-1 flex flex-col min-w-0">
        {/* Mobile Header Bar */}
        <header className="lg:hidden bg-[#E9EEF3] border-b border-[#D5DDE5] px-4 py-3 flex items-center justify-between sticky top-0 z-30 shadow-sm">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setMobileSidebarOpen(true)}
              className="p-1.5 text-[#5B6875] hover:text-[#17212B] rounded bg-white border border-[#D5DDE5]"
              aria-label="Open navigation menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div>
              <span className="text-xs font-mono font-bold text-[#176B87] uppercase tracking-wider block">
                {t('appTitle')}
              </span>
              <span className="text-xs font-mono font-bold text-[#17212B] uppercase block">
                {t('appSubtitle')}
              </span>
            </div>
          </div>
          <LanguageToggle />
        </header>

        {/* Desktop Top Header Bar with quick status badge */}
        <div className="hidden lg:flex items-center justify-between px-8 py-3 bg-[#FFFFFF] border-b border-[#D5DDE5] text-xs font-mono">
          <div className="flex items-center space-x-4">
            <span className="font-bold text-[#17212B] uppercase tracking-wider">
              LUNAR REMOTE SENSING WORKSTATION
            </span>
            <span className="text-[#D5DDE5]">|</span>
            <span className="text-[#5B6875] font-semibold">
              PS-166 / GEOSPATIAL VERIFICATION
            </span>
          </div>

          <div className="flex items-center space-x-3">
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-[#E3A93B]/10 text-[#C48A24] border border-[#E3A93B]/30 uppercase">
              {t('demoNotice')}
            </span>
            <LanguageToggle />
          </div>
        </div>

        {/* Page Content Viewport */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          <Outlet />
          <Footer />
        </main>
      </div>
    </div>
  );
};
