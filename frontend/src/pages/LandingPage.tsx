import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from '../i18n';
import { LanguageToggle } from '../components/common/LanguageToggle';
import { ScrollVideoHero } from '../components/landing/ScrollVideoHero';
import { ArchitectureLayers } from '../components/landing/ArchitectureLayers';
import {
  ArrowRight,
  Sun,
  Eye,
  Maximize2,
  Compass,
  Layers,
  Crosshair,
  Grid,
  ShieldCheck,
  FileCheck,
  Satellite,
} from 'lucide-react';

/*
 * The landing page is fully dark so it continues the black video hero.
 * Palette: page #000 / alternate #070B0F, cards #0C1218, text #E6EDF3,
 * muted #8B98A5, faint #7A8794, accent #5EB8D6 (brand teal #176B87 for buttons).
 */

/* ------------------------------------------------------------------ */
/* Hero schematic: source frame misaligned above a fixed reference     */
/* frame, with tie-point correspondences drawn between them.           */
/* ------------------------------------------------------------------ */

const REFERENCE_PLANE = '60,240 220,178 380,240 220,302';
const SOURCE_PLANE = '74,110 234,48 394,110 234,172';

/* Matched pairs: reference point -> source point (source is offset,   */
/* which is exactly the misregistration the pipeline solves for).      */
const TIE_POINTS: Array<{ rx: number; ry: number; sx: number; sy: number }> = [
  { rx: 150, ry: 235, sx: 164, sy: 105 },
  { rx: 220, ry: 210, sx: 234, sy: 80 },
  { rx: 290, ry: 240, sx: 304, sy: 110 },
  { rx: 200, ry: 265, sx: 214, sy: 135 },
  { rx: 272, ry: 202, sx: 286, sy: 72 },
];

const GRID_LINE = 'rgba(255,255,255,0.12)';

const HeroSchematic: React.FC = () => {
  const { t } = useTranslation();

  return (
    <svg
      viewBox="0 0 440 340"
      className="w-full h-auto"
      role="img"
      aria-label="Source frame aligned to a reference frame via tie points"
    >
      {/* Source plane (moving) */}
      <polygon points={SOURCE_PLANE} fill="#0F1C24" stroke="#5EB8D6" strokeWidth="1.5" />
      <polyline points="114,110 274,48" fill="none" stroke={GRID_LINE} strokeWidth="0.75" />
      <polyline points="154,110 314,48" fill="none" stroke={GRID_LINE} strokeWidth="0.75" />
      <polyline points="154,48 314,110" fill="none" stroke={GRID_LINE} strokeWidth="0.75" />

      {/* Reference plane (fixed) */}
      <polygon points={REFERENCE_PLANE} fill="#111820" stroke="#8B98A5" strokeWidth="1.5" />
      <polyline points="100,240 260,178" fill="none" stroke={GRID_LINE} strokeWidth="0.75" />
      <polyline points="140,240 300,178" fill="none" stroke={GRID_LINE} strokeWidth="0.75" />
      <polyline points="140,178 300,240" fill="none" stroke={GRID_LINE} strokeWidth="0.75" />

      {/* Tie-point correspondences */}
      {TIE_POINTS.map((p, i) => (
        <g key={i}>
          <line
            x1={p.sx}
            y1={p.sy}
            x2={p.rx}
            y2={p.ry}
            stroke="#E3A93B"
            strokeWidth="1"
            strokeDasharray="3 3"
          />
          <circle cx={p.sx} cy={p.sy} r="3.5" fill="#5EB8D6" />
          <circle cx={p.rx} cy={p.ry} r="3.5" fill="#E6EDF3" />
        </g>
      ))}

      {/* Labels */}
      <text x="20" y="40" className="font-mono" fontSize="10" fontWeight="700" fill="#5EB8D6">
        {t('landingHeroSource')}
      </text>
      <text x="20" y="325" className="font-mono" fontSize="10" fontWeight="700" fill="#C9D3DC">
        {t('landingHeroReference')}
      </text>
      <text x="330" y="180" className="font-mono" fontSize="9" fontWeight="700" fill="#E3A93B">
        {t('landingHeroTie')}
      </text>
    </svg>
  );
};

/* ------------------------------------------------------------------ */

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

  const challenges = [
    {
      icon: <Sun className="w-5 h-5" />,
      title: t('challengeIllumTitle'),
      desc: t('challengeIllumDesc'),
      tag: 'SOLAR AZIMUTH / ELEVATION',
    },
    {
      icon: <Eye className="w-5 h-5" />,
      title: t('challengeViewTitle'),
      desc: t('challengeViewDesc'),
      tag: 'PARALLAX / EMISSION ANGLE',
    },
    {
      icon: <Maximize2 className="w-5 h-5" />,
      title: t('challengeScaleTitle'),
      desc: t('challengeScaleDesc'),
      tag: '0.25 m — 80 m / PIXEL',
    },
  ];

  const capabilities = [
    { icon: <Compass className="w-5 h-5" />, title: t('feat1Title'), desc: t('feat1Desc') },
    { icon: <Layers className="w-5 h-5" />, title: t('feat2Title'), desc: t('feat2Desc') },
    { icon: <Crosshair className="w-5 h-5" />, title: t('feat3Title'), desc: t('feat3Desc') },
    { icon: <Grid className="w-5 h-5" />, title: t('feat4Title'), desc: t('feat4Desc') },
    { icon: <ShieldCheck className="w-5 h-5" />, title: t('feat5Title'), desc: t('feat5Desc') },
    { icon: <FileCheck className="w-5 h-5" />, title: t('feat6Title'), desc: t('feat6Desc') },
  ];

  const pipeline = [
    t('pipe1'),
    t('pipe2'),
    t('pipe3'),
    t('pipe4'),
    t('pipe5'),
    t('pipe6'),
  ];

  const stats = [
    { value: '160x', label: t('landingStatScale') },
    { value: '0.25 m', label: t('landingStatRes') },
    { value: '< 1 px', label: t('landingStatTarget') },
    { value: '3', label: t('landingStatSensors') },
  ];

  const sensors = [
    {
      name: 'OHRC',
      note: t('sensorOhrcDesc'),
      resolution: '~0.25 m / px',
      swath: '~3 km',
      spectral: '0.45 - 0.80 µm',
      reference: 'LRO NAC (~0.5 m)',
    },
    {
      name: 'TMC-2',
      note: t('sensorTmcDesc'),
      resolution: '~5 m / px',
      swath: '~20 km',
      spectral: '0.5 - 0.8 µm',
      reference: 'SELENE TC (~10 m)',
    },
    {
      name: 'IIRS',
      note: t('sensorIirsDesc'),
      resolution: '~80 m / px',
      swath: '~20 km',
      spectral: '0.8 - 5.0 µm',
      reference: 'SELENE TC (~10 m)',
    },
  ];

  const metrics = [
    { label: t('metricRmseLabel'), desc: t('metricRmseDesc') },
    { label: t('metricInlierLabel'), desc: t('metricInlierDesc') },
    { label: t('metricRatioLabel'), desc: t('metricRatioDesc') },
    { label: t('metricDistLabel'), desc: t('metricDistDesc') },
  ];

  const navLinks = [
    { href: '#architecture', label: t('landingNavArchitecture') },
    { href: '#challenges', label: t('landingNavChallenges') },
    { href: '#capabilities', label: t('landingNavCapabilities') },
    { href: '#pipeline', label: t('landingNavPipeline') },
    { href: '#payloads', label: t('landingNavSensors') },
  ];

  const sectionTitle = 'text-xl font-bold font-mono uppercase tracking-tight text-[#E6EDF3]';
  const sectionDesc = 'mt-2 text-xs text-[#8B98A5] max-w-3xl leading-relaxed';
  const card = 'bg-[#0C1218] border border-white/10 rounded-lg';
  const iconTile = 'w-9 h-9 rounded bg-[#5EB8D6]/10 text-[#5EB8D6] flex items-center justify-center';

  return (
    <div className="min-h-screen bg-black text-[#E6EDF3] antialiased">
      {/* ============================ TOP BAR ============================ */}
      <header
        className={`fixed inset-x-0 top-0 z-40 backdrop-blur border-b border-white/10 transition-colors duration-300 ${
          overHero ? 'bg-black/40' : 'bg-[#05080B]/90'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          {/* Identity */}
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

          {/* Section links */}
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

      {/* ========================= SCROLL VIDEO HERO ===================== */}
      <ScrollVideoHero />
      <div ref={heroEndRef} />

      {/* ============================== INTRO ============================ */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-16 lg:pt-28 lg:pb-24">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          <div>
            <span className="inline-block text-[10px] font-mono font-bold uppercase tracking-wider px-2.5 py-1 rounded bg-[#5EB8D6]/10 text-[#5EB8D6] border border-[#5EB8D6]/25">
              {t('landingBadge')}
            </span>

            <h1 className="mt-5 text-3xl sm:text-4xl lg:text-[2.75rem] font-bold tracking-tight leading-[1.15] text-white">
              {t('landingH1')}{' '}
              <span className="text-[#5EB8D6]">{t('landingH1Accent')}</span>
            </h1>

            <p className="mt-5 text-sm sm:text-[15px] text-[#8B98A5] leading-relaxed max-w-xl">
              {t('landingSub')}
            </p>

            <div className="mt-8 flex flex-col sm:flex-row gap-3">
              <Link
                to="/matching"
                className="inline-flex items-center justify-center space-x-2 bg-[#176B87] hover:bg-[#1E82A3] text-white text-xs font-mono font-bold uppercase tracking-wider px-5 py-3 rounded-md transition-colors"
              >
                <span>{t('landingCtaPrimary')}</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                to="/overview"
                className="inline-flex items-center justify-center bg-white/5 hover:bg-white/10 text-[#E6EDF3] border border-white/15 text-xs font-mono font-bold uppercase tracking-wider px-5 py-3 rounded-md transition-colors"
              >
                {t('landingCtaSecondary')}
              </Link>
            </div>
          </div>

          {/* Schematic */}
          <div className={`${card} p-6`}>
            <HeroSchematic />
          </div>
        </div>

        {/* Key figures */}
        <div className="mt-14 grid grid-cols-2 lg:grid-cols-4 gap-px bg-white/10 border border-white/10 rounded-lg overflow-hidden">
          {stats.map((stat) => (
            <div key={stat.label} className="bg-[#0C1218] px-5 py-4">
              <div className="text-2xl font-bold font-mono text-[#5EB8D6]">{stat.value}</div>
              <div className="mt-1 text-[10px] font-mono font-semibold uppercase tracking-wider text-[#7A8794]">
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ======================== 8-LAYER ARCHITECTURE =================== */}
      <ArchitectureLayers />

      {/* =========================== CHALLENGES ========================== */}
      <section id="challenges" className="scroll-mt-16 border-t border-white/10 bg-[#070B0F]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-20">
          <h2 className={sectionTitle}>{t('landingChallengesTitle')}</h2>
          <p className={sectionDesc}>{t('landingChallengesDesc')}</p>

          <div className="mt-8 grid md:grid-cols-3 gap-5">
            {challenges.map((item) => (
              <div key={item.title} className={`${card} p-5`}>
                <div className={iconTile}>{item.icon}</div>
                <h3 className="mt-4 text-sm font-bold font-mono uppercase tracking-wide text-[#E6EDF3]">
                  {item.title}
                </h3>
                <p className="mt-2 text-xs text-[#8B98A5] leading-relaxed">{item.desc}</p>
                <div className="mt-4 pt-3 border-t border-white/5">
                  <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-[#7A8794]">
                    {item.tag}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ========================== CAPABILITIES ========================= */}
      <section id="capabilities" className="scroll-mt-16 border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-20">
          <h2 className={sectionTitle}>{t('landingFeaturesTitle')}</h2>
          <p className={sectionDesc}>{t('landingFeaturesDesc')}</p>

          <div className="mt-8 grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {capabilities.map((item, index) => (
              <div
                key={item.title}
                className={`${card} p-5 hover:border-[#5EB8D6]/40 transition-colors`}
              >
                <div className="flex items-start justify-between">
                  <div className={iconTile}>{item.icon}</div>
                  <span className="text-[10px] font-mono font-bold text-white/20">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                </div>
                <h3 className="mt-4 text-xs font-bold font-mono uppercase tracking-wide leading-snug text-[#E6EDF3]">
                  {item.title}
                </h3>
                <p className="mt-2 text-xs text-[#8B98A5] leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============================ PIPELINE =========================== */}
      <section id="pipeline" className="scroll-mt-16 border-t border-white/10 bg-[#070B0F]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-20">
          <h2 className={sectionTitle}>{t('landingPipelineTitle')}</h2>
          <p className={sectionDesc}>{t('landingPipelineDesc')}</p>

          <ol className="mt-8 grid sm:grid-cols-2 lg:grid-cols-6 gap-3">
            {pipeline.map((step, index) => (
              <li
                key={step}
                className={`${card} p-4 flex lg:flex-col items-center lg:items-start gap-3`}
              >
                <span className="shrink-0 w-7 h-7 rounded-full bg-[#176B87] text-white text-[11px] font-mono font-bold flex items-center justify-center">
                  {index + 1}
                </span>
                <span className="text-[11px] font-mono font-bold uppercase tracking-wide leading-snug text-[#E6EDF3]">
                  {step}
                </span>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ============================ PAYLOADS =========================== */}
      <section id="payloads" className="scroll-mt-16 border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-20">
          <h2 className={sectionTitle}>{t('landingSensorsTitle')}</h2>
          <p className={sectionDesc}>{t('landingSensorsDesc')}</p>

          <div className={`${card} mt-8 overflow-x-auto`}>
            <table className="w-full text-left border-collapse min-w-[640px]">
              <thead>
                <tr className="bg-white/[0.04] border-b border-white/10">
                  {[
                    t('colSensor'),
                    t('colResolution'),
                    t('colSwath'),
                    t('colSpectral'),
                    t('colReference'),
                  ].map((heading) => (
                    <th
                      key={heading}
                      className="px-4 py-3 text-[10px] font-mono font-bold uppercase tracking-wider text-[#8B98A5]"
                    >
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sensors.map((sensor) => (
                  <tr key={sensor.name} className="border-b border-white/5 last:border-0">
                    <td className="px-4 py-3">
                      <span className="block text-xs font-mono font-bold text-[#E6EDF3]">
                        {sensor.name}
                      </span>
                      <span className="block text-[10px] text-[#7A8794] mt-0.5">{sensor.note}</span>
                    </td>
                    <td className="px-4 py-3 text-xs font-mono text-[#5EB8D6] font-semibold">
                      {sensor.resolution}
                    </td>
                    <td className="px-4 py-3 text-xs font-mono text-[#8B98A5]">{sensor.swath}</td>
                    <td className="px-4 py-3 text-xs font-mono text-[#8B98A5]">{sensor.spectral}</td>
                    <td className="px-4 py-3 text-xs font-mono text-[#8B98A5]">{sensor.reference}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ============================= METRICS =========================== */}
      <section className="border-t border-white/10 bg-[#070B0F]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-20">
          <h2 className={sectionTitle}>{t('landingMetricsTitle')}</h2>
          <p className={sectionDesc}>{t('landingMetricsDesc')}</p>

          <div className="mt-8 grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {metrics.map((metric) => (
              <div
                key={metric.label}
                className="bg-[#0C1218] border-l-2 border-l-[#5EB8D6] border-y border-r border-white/10 rounded-r-lg p-5"
              >
                <div className="text-sm font-bold font-mono uppercase tracking-wide text-[#E6EDF3]">
                  {metric.label}
                </div>
                <p className="mt-2 text-xs text-[#8B98A5] leading-relaxed">{metric.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* =========================== FINAL CTA =========================== */}
      <section className="border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-20">
          <div className="bg-[#0C1218] border border-[#5EB8D6]/25 rounded-lg px-6 py-10 sm:px-10 sm:py-12 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold font-mono uppercase tracking-tight text-white">
                {t('landingFinalTitle')}
              </h2>
              <p className="mt-2 text-xs text-[#8B98A5] leading-relaxed max-w-xl">
                {t('landingFinalDesc')}
              </p>
            </div>
            <Link
              to="/matching"
              className="shrink-0 inline-flex items-center justify-center space-x-2 bg-white hover:bg-[#DCE4EC] text-[#05080B] text-xs font-mono font-bold uppercase tracking-wider px-6 py-3.5 rounded-md transition-colors"
            >
              <span>{t('landingCtaPrimary')}</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ============================= FOOTER ============================ */}
      <footer className="border-t border-white/10 bg-black">
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
      </footer>
    </div>
  );
};

export default LandingPage;
