import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { useTranslation } from '../../../i18n';
import moon from '../../../assets/layers/moon.webp';
import { usePauseOffscreen } from '../utils';
import { StarField } from '../shared';

const MARQUEE = ['PS 26166', 'ISRO', 'CHANDRAYAAN-2', 'OHRC', 'TMC-2', 'IIRS', 'LRO NAC', 'SUB-PIXEL', 'TESTED ON UNSEEN GROUND', 'GeoTIFF'];

export const FinalCtaSection: React.FC = () => {
  const { t } = useTranslation();
  const ref = usePauseOffscreen<HTMLElement>();

  return (
    <section ref={ref} className="relative overflow-hidden border-t border-white/10 bg-black">
      <div className="relative min-h-[85vh] flex items-center justify-center">
        <StarField count={90} />

        {/* A Moon rising over the bottom edge, circled by orbits */}
        <div className="absolute left-1/2 bottom-0 w-[min(1100px,160vw)] aspect-square -translate-x-1/2 translate-y-[74%] pointer-events-none" aria-hidden="true">
          <div className="lp-float absolute inset-0">
            <img src={moon} alt="" className="absolute inset-0 w-full h-full object-contain opacity-90" style={{ mixBlendMode: 'screen' }} />
          </div>
          <svg viewBox="0 0 100 100" className="lp-spin absolute inset-[-12%] w-[124%] h-[124%]" style={{ animationDuration: '90s' }}>
            <ellipse cx="50" cy="50" rx="49" ry="49" fill="none" stroke="#5EB8D6" strokeOpacity="0.25" strokeWidth="0.15" strokeDasharray="0.6 1.2" />
            <circle cx="99" cy="50" r="0.7" fill="#5EB8D6" />
          </svg>
          <svg viewBox="0 0 100 100" className="lp-spin absolute inset-[-4%] w-[108%] h-[108%]" style={{ animationDuration: '60s', animationDirection: 'reverse' }}>
            <ellipse cx="50" cy="50" rx="49" ry="49" fill="none" stroke="#E3A93B" strokeOpacity="0.2" strokeWidth="0.12" />
            <circle cx="1" cy="50" r="0.6" fill="#E3A93B" />
          </svg>
        </div>
        <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black via-black/70 to-transparent pointer-events-none" aria-hidden="true" />

        <div className="relative z-10 max-w-3xl px-6 text-center -mt-16">
          <span className="inline-block text-[10px] font-mono font-bold uppercase tracking-wider px-2.5 py-1 rounded bg-[#5EB8D6]/10 text-[#5EB8D6] border border-[#5EB8D6]/25">
            {t('finalBadge')}
          </span>
          <h2 className="mt-5 text-4xl sm:text-6xl font-bold tracking-tight leading-[1.05] text-white">
            {t('landingFinalTitle')}
          </h2>
          <p className="mt-5 text-sm sm:text-base text-[#8B98A5] leading-relaxed">{t('landingFinalDesc')}</p>
          <div className="mt-9 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              to="/matching"
              className="lp-glow inline-flex items-center gap-2 bg-white hover:bg-[#DCE4EC] text-[#05080B] text-xs font-mono font-bold uppercase tracking-wider px-7 py-4 rounded-md transition-colors"
            >
              {t('landingCtaPrimary')}
              <ArrowRight className="w-4 h-4" />
            </Link>
            <a
              href="#architecture"
              className="inline-flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-wider text-[#5EB8D6] hover:text-white px-4 py-4 transition-colors"
            >
              {t('landingNavArchitecture')}
            </a>
          </div>
        </div>
      </div>

      {/* Marquee strip */}
      <div className="relative border-y border-white/10 bg-[#070B0F] py-3 overflow-hidden" aria-hidden="true">
        <div className="lp-marquee flex w-max">
          {[0, 1].map((copy) => (
            <div key={copy} className="flex shrink-0">
              {MARQUEE.map((word) => (
                <span key={`${copy}-${word}`} className="flex items-center gap-6 pr-6 font-mono text-xs font-bold tracking-[0.25em] text-[#7A8794] whitespace-nowrap">
                  {word}
                  <span className="text-[#5EB8D6]">✦</span>
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
