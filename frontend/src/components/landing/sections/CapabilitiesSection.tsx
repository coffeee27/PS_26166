import React, { useEffect, useRef, useState } from 'react';
import { Compass, Layers, Crosshair, Grid, ShieldCheck, FileCheck } from 'lucide-react';
import { useTranslation } from '../../../i18n';
import craterA from '../../../assets/layers/crater-a.webp';
import craterB from '../../../assets/layers/crater-b.webp';
import edgesA from '../../../assets/layers/crater-a-edges.webp';
import edgesB from '../../../assets/layers/crater-b-edges.webp';
import { ACCENT, AMBER, RED, hash, usePauseOffscreen } from '../utils';
import { SectionHeading } from '../shared';

/* 1 ---- Metadata-driven coarse alignment: read the label, snap the footprint ---- */
const MetadataVisual: React.FC = () => {
  const lines: Array<[string, string]> = [
    ['<pds:Product_Observational>', ''],
    ['  <start_date_time>', '2021-03-14T08:22Z'],
    ['  <sun_azimuth>', '114.6 deg'],
    ['  <sun_elevation>', '14.2 deg'],
    ['  <pixel_resolution>', '0.25 m'],
    ['  <map_projection>', 'POLAR STEREO'],
    ['  <center_lat_lon>', '-69.37, 32.35'],
    ['</pds:Product_Observational>', ''],
  ];
  return (
    <div className="absolute inset-0 grid grid-cols-[1.25fr_1fr] bg-[#05080B]">
      <div className="relative overflow-hidden border-r border-white/10 p-4 font-mono text-[10px] sm:text-[11px] leading-[1.9]">
        <div
          className="lp-scan absolute inset-x-0 top-3 h-5 bg-[#5EB8D6]/15 border-y border-[#5EB8D6]/30"
          style={{ '--scan': '150px' } as React.CSSProperties}
        />
        <span className="absolute right-2 bottom-2 font-mono text-[9px] font-bold tracking-widest px-1.5 py-0.5 rounded bg-white/5 text-[#7A8794]">
          EXAMPLE LABEL
        </span>
        {lines.map(([key, value], i) => (
          <div key={i} className="relative whitespace-nowrap">
            <span className="text-[#7A8794]">{key}</span>
            {value && <span className="text-[#E6EDF3]"> {value}</span>}
          </div>
        ))}
      </div>
      <div className="relative overflow-hidden">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px)',
            backgroundSize: '20px 20px',
          }}
        />
        <div className="absolute inset-[22%] border border-dashed border-white/25" />
        <div className="lp-snap absolute inset-[22%] overflow-hidden border-2 border-[#5EB8D6] shadow-[0_0_24px_rgba(94,184,214,0.35)]">
          <img src={craterA} alt="" className="w-full h-full object-cover" />
        </div>
        <span className="absolute left-2 bottom-2 font-mono text-[9px] font-bold text-[#5EB8D6]">COMMON GRID</span>
      </div>
    </div>
  );
};

/* 2 ---- Illumination-invariant matching: photo vs structural edges ---- */
const EdgesVisual: React.FC = () => (
  <div className="absolute inset-0 grid grid-rows-2 gap-px bg-white/10">
    {[
      { photo: craterA, edges: edgesA, label: 'SUN A' },
      { photo: craterB, edges: edgesB, label: 'SUN B' },
    ].map((row, i) => (
      <div key={row.label} className="relative overflow-hidden bg-black">
        <img src={row.photo} alt="" className="absolute inset-0 w-full h-full object-cover" />
        <img
          src={row.edges}
          alt=""
          className="lp-wipe absolute inset-0 w-full h-full object-cover"
          style={{ animationDelay: `${i * 0.6}s` }}
        />
        <span className="absolute left-2 top-2 font-mono text-[9px] font-bold tracking-widest px-1.5 py-0.5 rounded bg-black/70 text-white/80">
          {row.label}
        </span>
        <span className="absolute right-2 bottom-2 font-mono text-[9px] font-bold tracking-widest px-1.5 py-0.5 rounded bg-black/70 text-[#5EB8D6]">
          PHASE EDGES
        </span>
      </div>
    ))}
  </div>
);

/* 3 ---- Sub-pixel refinement: a crosshair settling between real pixels ---- */
// 9x9 greyscale samples from the crater rim in crater-a.webp.
const PATCH = [
  136, 132, 144, 147, 135, 121, 121, 99, 32, 136, 143, 149, 150, 152, 143, 126, 120, 67, 148, 146, 154, 138, 154, 156,
  154, 127, 68, 138, 116, 183, 141, 149, 155, 157, 137, 69, 103, 127, 166, 170, 133, 148, 154, 140, 103, 129, 135, 152,
  189, 138, 141, 150, 134, 111, 61, 64, 165, 169, 140, 146, 141, 133, 124, 39, 44, 144, 117, 159, 151, 139, 120, 103, 123,
  104, 134, 134, 144, 153, 144, 129, 123,
];

const SubpixelVisual: React.FC = () => (
  <div className="absolute inset-0 flex items-center justify-center bg-[#05080B]">
    <div className="relative grid grid-cols-9 gap-px bg-white/10 p-px w-[62%] max-w-[190px] aspect-square">
      {PATCH.map((v, i) => (
        <span key={i} style={{ backgroundColor: `rgb(${v},${v},${v})` }} />
      ))}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="lp-crosshair relative w-6 h-6">
          <span className="absolute inset-0 rounded-full border-2 border-[#5EB8D6] shadow-[0_0_12px_#5EB8D6]" />
          <span className="absolute left-1/2 -top-2 h-10 w-px -translate-x-1/2 bg-[#5EB8D6]" />
          <span className="absolute top-1/2 -left-2 w-10 h-px -translate-y-1/2 bg-[#5EB8D6]" />
        </div>
      </div>
    </div>
    <span className="absolute left-3 bottom-3 font-mono text-[9px] font-bold tracking-widest text-[#7A8794]">1 CELL = 1 PIXEL</span>
  </div>
);

/* 4 ---- Uniform distribution: clumped top-K versus grid quota ---- */
const DistributionVisual: React.FC = () => {
  const clumped = Array.from({ length: 22 }, (_, i) => ({
    x: 18 + hash(i) * 26 + (hash(i + 9) - 0.5) * 8,
    y: 20 + hash(i + 40) * 24,
  }));
  const even = Array.from({ length: 16 }, (_, i) => ({
    x: 9 + (i % 4) * 25 + hash(i + 70) * 8,
    y: 9 + Math.floor(i / 4) * 25 + hash(i + 90) * 8,
  }));
  const panel = (title: string, points: Array<{ x: number; y: number }>, color: string, grid: boolean) => (
    <div className="relative bg-black overflow-hidden">
      <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full" aria-hidden="true">
        {grid &&
          [25, 50, 75].map((g) => (
            <g key={g} stroke="#fff" strokeOpacity="0.12" strokeWidth="0.4">
              <line x1={g} y1="0" x2={g} y2="100" />
              <line x1="0" y1={g} x2="100" y2={g} />
            </g>
          ))}
        {points.map((pt, i) => (
          <circle
            key={i}
            cx={pt.x}
            cy={pt.y}
            r="2.2"
            fill={color}
            className="lp-pop"
            style={{ animationDelay: `${(i * 0.12).toFixed(2)}s` }}
          />
        ))}
      </svg>
      <span className="absolute left-2 top-2 font-mono text-[9px] font-bold tracking-widest" style={{ color }}>
        {title}
      </span>
    </div>
  );
  return (
    <div className="absolute inset-0 grid grid-cols-2 gap-px bg-white/10">
      {panel('TOP-K', clumped, AMBER, false)}
      {panel('GRID QUOTA', even, ACCENT, true)}
    </div>
  );
};

/* 5 ---- Robust outlier rejection: stray vectors get struck out ---- */
const OutlierVisual: React.FC = () => {
  const vectors = Array.from({ length: 30 }, (_, i) => {
    const outlier = hash(i + 3) > 0.8;
    const angle = outlier ? hash(i + 11) * Math.PI * 2 : -0.5 + (hash(i + 7) - 0.5) * 0.12;
    return { x: 10 + (i % 6) * 16, y: 14 + Math.floor(i / 6) * 17, angle, outlier };
  });
  return (
    <div className="absolute inset-0 bg-[#05080B]">
      <svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet" className="absolute inset-0 w-full h-full" aria-hidden="true">
        {vectors.map((v, i) => {
          const len = 9;
          const x2 = v.x + Math.cos(v.angle) * len;
          const y2 = v.y + Math.sin(v.angle) * len;
          return (
            <g key={i} className={v.outlier ? 'lp-reject' : undefined} style={v.outlier ? { animationDelay: `${(i * 0.07).toFixed(2)}s` } : undefined}>
              <line x1={v.x} y1={v.y} x2={x2} y2={y2} stroke={v.outlier ? RED : ACCENT} strokeWidth="1.1" strokeLinecap="round" />
              <circle cx={x2} cy={y2} r="1.2" fill={v.outlier ? RED : ACCENT} />
            </g>
          );
        })}
      </svg>
      <span className="absolute right-2 top-2 font-mono text-[9px] font-bold tracking-widest px-1.5 py-0.5 rounded bg-[#5EB8D6]/10 text-[#5EB8D6]">
        MAGSAC++
      </span>
    </div>
  );
};

/* 6 ---- Quantitative reporting: the tool writing its outputs ---- */
const ReportVisual: React.FC = () => {
  const lines: Array<{ text: string; tone: 'cmd' | 'ok' | 'file' | 'dim' }> = [
    { text: '$ register --src ohrc_strip.xml --ref nac_site.cub', tone: 'cmd' },
    { text: '✓ labels parsed · common projection', tone: 'ok' },
    { text: '✓ phase-congruency features', tone: 'ok' },
    { text: '✓ robust estimation · hold-out check points', tone: 'ok' },
    { text: '→ registered.tif', tone: 'file' },
    { text: '→ match_points.csv', tone: 'file' },
    { text: '→ report.json  (rmse px / m, inliers, coverage)', tone: 'file' },
  ];
  const color = { cmd: '#E6EDF3', ok: ACCENT, file: AMBER, dim: '#7A8794' };
  const boxRef = useRef<HTMLDivElement>(null);
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const [shown, setShown] = useState(reduceMotion ? lines.length : 0);

  // Reveal one line at a time, hold, then clear and start again. Skips ticks while
  // the section is paused offscreen.
  useEffect(() => {
    if (reduceMotion) return;
    const timer = window.setInterval(() => {
      if (boxRef.current?.closest('[data-paused="true"]')) return;
      setShown((n) => (n >= lines.length + 3 ? 0 : n + 1));
    }, 850);
    return () => window.clearInterval(timer);
  }, [lines.length, reduceMotion]);

  return (
    <div ref={boxRef} className="absolute inset-0 bg-[#05080B] p-4 font-mono text-[10px] sm:text-[11px] leading-[1.9]">
      <div className="flex gap-1.5 mb-3" aria-hidden="true">
        <span className="w-2.5 h-2.5 rounded-full bg-[#FF5F57]" />
        <span className="w-2.5 h-2.5 rounded-full bg-[#FEBC2E]" />
        <span className="w-2.5 h-2.5 rounded-full bg-[#28C840]" />
      </div>
      {lines.slice(0, shown).map((line) => (
        <div key={line.text} className="lp-type whitespace-nowrap overflow-hidden" style={{ color: color[line.tone] }}>
          {line.text}
        </div>
      ))}
      {shown <= lines.length && <span className="hero-blink text-[#5EB8D6]">▌</span>}
    </div>
  );
};

/* ------------------------------------------------------------------ */

export const CapabilitiesSection: React.FC = () => {
  const { t } = useTranslation();
  const ref = usePauseOffscreen<HTMLElement>();

  const tiles = [
    { icon: <Compass className="w-4 h-4" />, title: t('feat1Title'), desc: t('feat1Desc'), Visual: MetadataVisual, span: 'lg:col-span-2', h: 'h-56' },
    { icon: <Layers className="w-4 h-4" />, title: t('feat2Title'), desc: t('feat2Desc'), Visual: EdgesVisual, span: 'lg:row-span-2', h: 'h-72 lg:h-auto lg:flex-1' },
    { icon: <Crosshair className="w-4 h-4" />, title: t('feat3Title'), desc: t('feat3Desc'), Visual: SubpixelVisual, span: '', h: 'h-56' },
    { icon: <Grid className="w-4 h-4" />, title: t('feat4Title'), desc: t('feat4Desc'), Visual: DistributionVisual, span: '', h: 'h-56' },
    { icon: <ShieldCheck className="w-4 h-4" />, title: t('feat5Title'), desc: t('feat5Desc'), Visual: OutlierVisual, span: '', h: 'h-56' },
    { icon: <FileCheck className="w-4 h-4" />, title: t('feat6Title'), desc: t('feat6Desc'), Visual: ReportVisual, span: 'lg:col-span-2', h: 'h-56' },
  ];

  return (
    <section ref={ref} id="capabilities" className="scroll-mt-16 border-t border-white/10 bg-[#070B0F]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-28">
        <SectionHeading badge={t('landingFeaturesTitle')} title={t('secFeaturesTitle')} desc={t('landingFeaturesDesc')} />

        <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {tiles.map(({ icon, title, desc, Visual, span, h }, i) => (
            <article
              key={title}
              className={`flex flex-col rounded-2xl border border-white/10 bg-[#0C1218] overflow-hidden hover:border-[#5EB8D6]/40 hover:-translate-y-1 transition-all duration-300 ${span}`}
            >
              <div className={`relative overflow-hidden ${h}`}>
                <Visual />
              </div>
              <div className="p-5">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-[#5EB8D6]">
                    {icon}
                    <h3 className="text-xs font-bold font-mono uppercase tracking-wide text-white leading-snug">{title}</h3>
                  </div>
                  <span className="font-mono text-[10px] font-bold text-white/25">{String(i + 1).padStart(2, '0')}</span>
                </div>
                <p className="mt-2 text-xs sm:text-sm text-[#8B98A5] leading-relaxed">{desc}</p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
};
