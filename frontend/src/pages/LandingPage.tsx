import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Satellite } from 'lucide-react';
import { useTranslation } from '../i18n';
import { LanguageToggle } from '../components/common/LanguageToggle';
import { ScrollVideoHero } from '../components/landing/ScrollVideoHero';
import { ArchitectureLayers } from '../components/landing/ArchitectureLayers';
import { IntroSection } from '../components/landing/sections/IntroSection';
import { ChallengesSection } from '../components/landing/sections/ChallengesSection';
import { CapabilitiesSection } from '../components/landing/sections/CapabilitiesSection';
import { PipelineSection } from '../components/landing/sections/PipelineSection';
import { PayloadsSection } from '../components/landing/sections/PayloadsSection';
import { MetricsSection } from '../components/landing/sections/MetricsSection';
import { ProveSection } from '../components/landing/sections/ProveSection';
import { FinalCtaSection } from '../components/landing/sections/FinalCtaSection';

/*
 * The landing page is fully dark so it continues the black video hero.
 * Palette: page #000 / alternate #070B0F, cards #0C1218, text #E6EDF3,
 * muted #8B98A5, faint #7A8794, accent #5EB8D6 (brand teal #176B87 for buttons).
 * Each section lives in components/landing/sections.
 */

export const LandingPage: React.FC = () => {
  const { t } = useTranslation();

  // The header is translucent over the video hero, then turns solid once the
  // hero has scrolled past so it stays readable over the content sections.
  const heroEndRef = useRef<HTMLDivElement>(null);
  const [overHero, setOverHero] = useState(true);

  useEffect(() => {
    const onScroll = () => {
      const heroEnd = heroEndRef.current;
      if (heroEnd) setOverHero(heroEnd.getBoundingClientRect().top > 64);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, []);

  // The global body background is the light workstation colour; keep overscroll
  // bounce on this page black instead of flashing light.
  useEffect(() => {
    const previous = document.body.style.backgroundColor;
    document.body.style.backgroundColor = '#000';
    return () => {
      document.body.style.backgroundColor = previous;
    };
  }, []);

  const navLinks = [
    { href: '#architecture', label: t('landingNavArchitecture') },
    { href: '#challenges', label: t('landingNavChallenges') },
    { href: '#capabilities', label: t('landingNavCapabilities') },
    { href: '#pipeline', label: t('landingNavPipeline') },
    { href: '#payloads', label: t('landingNavSensors') },
    { href: '#prove', label: t('landingNavProve') },
  ];

  return (
    <div className="min-h-screen bg-black text-[#E6EDF3] antialiased">
      {/* ============================ TOP BAR ============================ */}
      <header
        className={`fixed inset-x-0 top-0 z-40 backdrop-blur border-b border-white/10 transition-colors duration-300 ${
          overHero ? 'bg-black/40' : 'bg-[#05080B]/90'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center space-x-2.5 min-w-0">
            <div className="w-8 h-8 rounded bg-[#176B87] flex items-center justify-center shrink-0">
              <Satellite className="w-4 h-4 text-white" />
            </div>
            <div className="min-w-0">
              <span className="block text-xs font-mono font-bold tracking-widest leading-none text-[#5EB8D6]">
                {t('appTitle')}
              </span>
              <span className="block text-[11px] font-mono font-bold uppercase tracking-wider truncate leading-tight mt-0.5 text-white">
                {t('appSubtitle')}
              </span>
            </div>
          </div>

          <nav className="hidden lg:flex items-center space-x-6">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="text-xs font-mono font-semibold uppercase tracking-wider text-white/70 hover:text-white transition-colors"
              >
                {link.label}
              </a>
            ))}
          </nav>

          {/* Actions — the workstation entry point lives here */}
          <div className="flex items-center space-x-3 shrink-0">
            <div className="hidden sm:block">
              <LanguageToggle variant="dark" />
            </div>
            <Link
              to="/matching"
              className="inline-flex items-center space-x-2 bg-[#176B87] hover:bg-[#1E82A3] text-white text-[11px] font-mono font-bold uppercase tracking-wider px-3.5 py-2.5 rounded-md transition-colors"
            >
              <span>{t('landingLaunch')}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </header>

      <ScrollVideoHero />
      <div ref={heroEndRef} />

      <IntroSection />
      <ArchitectureLayers />
      <ChallengesSection />
      <CapabilitiesSection />
      <PipelineSection />
      <PayloadsSection />
      <MetricsSection />
      <ProveSection />
      <FinalCtaSection />

      {/* ============================= FOOTER ============================ */}
      <footer className="bg-black">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col sm:flex-row items-center justify-between gap-3 font-mono text-xs text-[#8B98A5]">
          <div>
            <span className="font-bold text-[#E6EDF3]">{t('appTitle')}</span>
            {' — '}
            Lunar Image Registration &amp; Correspondence Platform
          </div>
          <div className="flex items-center gap-3 text-[11px]">
            <span className="text-[#5EB8D6]">ISRO / Department of Space</span>
            <span className="text-white/20">|</span>
            <span>Space Technology</span>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-6 font-mono text-[10px] leading-relaxed text-[#5F6D7A]">
          Imagery: Chandrayaan-2 OHRC and IIRS (ISRO / ISSDC) · LRO NAC orthophoto and elevation model (NASA / GSFC / Arizona State University).
          Engine built with OpenCV, NumPy and SciPy.
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
