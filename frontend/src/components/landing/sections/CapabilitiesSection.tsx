import React, { useEffect, useRef, useState } from 'react';
import { Compass, Mountain, Crosshair, Grid, ShieldCheck, FileCheck, Hourglass } from 'lucide-react';
import { useTranslation } from '../../../i18n';
import { LUNAR } from '../lunarImages';
import { REAL } from '../realData';
import { ACCENT, AMBER, RED, hash, usePauseOffscreen } from '../utils';
import { SectionHeading } from '../shared';

/* 1 ---- Reads real archive files: a real IIRS label, and the frame snapping onto a common pixel grid ---- */
const MetadataVisual: React.FC = () => {
  const iirs = REAL.iirs;
  const lines: Array<[string, string]> = [
    ['<Product_Observational>', ''],
    ['  <axis_name>', 'BAND LINE SAMPLE'],
    ['  <elements>', '256  11865  250'],
    ['  <data_type>', 'UnsignedLSB2'],
    ['  <pixel_resolution>', `${iirs.gsdM.toFixed(2)} m/pixel`],
    ['  <upper_left_latitude>', `${iirs.footprint.upper_left[0].toFixed(2)} deg`],
    ['  <center_wavelength>', `${iirs.bandNm} nm`],
    ['</Product_Observational>', ''],
  ];
  return (
    <div className="absolute inset-0 grid grid-cols-[1.25fr_1fr] bg-[#05080B]">
      <div className="relative overflow-hidden border-r border-white/10 p-4 font-mono text-[10px] sm:text-[11px] leading-[1.9]">
        <div
          className="lp-scan absolute inset-x-0 top-3 h-5 bg-[#5EB8D6]/15 border-y border-[#5EB8D6]/30"
          style={{ '--scan': '150px' } as React.CSSProperties}
        />
        <span className="absolute right-2 bottom-2 font-mono text-[9px] font-bold tracking-widest px-1.5 py-0.5 rounded bg-[#5EB8D6]/10 text-[#5EB8D6]">
          REAL IIRS LABEL
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
          <img src={LUNAR.iirsPatch} alt="" className="w-full h-full object-cover" />
        </div>
        <span className="absolute left-2 bottom-2 font-mono text-[9px] font-bold text-[#5EB8D6]">SAME PIXEL SIZE</span>
      </div>
    </div>
  );
};

/* 2 ---- Local terrain correction: real error map, one global model versus global + local ---- */
const LocalCorrectionVisual: React.FC = () => (
  <div className="absolute inset-0 grid grid-rows-2 gap-px bg-white/10">
    {[
      { image: LUNAR.heatmapGlobal, label: 'ONE GLOBAL MODEL', value: REAL.metrics.globalRmsePx, wipe: false },
      { image: LUNAR.heatmapLocal, label: '+ LOCAL CORRECTION', value: REAL.metrics.holdoutRmsePx, wipe: true },
    ].map((row) => (
      <div key={row.label} className="relative overflow-hidden bg-black">
        {row.wipe && <img src={LUNAR.heatmapGlobal} alt="" className="absolute inset-0 w-full h-full object-cover" />}
        <img src={row.image} alt="" className={`absolute inset-0 w-full h-full object-cover ${row.wipe ? 'lp-wipe' : ''}`} />
        <span className="absolute left-2 top-2 font-mono text-[9px] font-bold tracking-widest px-1.5 py-0.5 rounded bg-black/70 text-white/80">
          {row.label}
        </span>
        <span
          className={`absolute right-2 bottom-2 font-mono text-[10px] font-bold tracking-widest px-1.5 py-0.5 rounded bg-black/75 ${
            row.wipe ? 'text-[#5EB8D6]' : 'text-[#E3A93B]'
          }`}
        >
          {row.value.toFixed(2)} PX
        </span>
      </div>
    ))}
  </div>
);

/* 3 ---- Sub-pixel refinement: a crosshair settling between real pixels ---- */
const SubpixelVisual: React.FC = () => (
  <div className="absolute inset-0 flex items-center justify-center bg-[#05080B]">
    <div className="relative grid grid-cols-9 gap-px bg-white/10 p-px w-[62%] max-w-[190px] aspect-square">
      {/* 9 x 9 real OHRC pixels across a crater rim */}
      {REAL.rimPatch.map((v, i) => (
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
    <span className="absolute left-3 bottom-3 font-mono text-[9px] font-bold tracking-widest text-[#7A8794]">1 CELL = 1 REAL OHRC PIXEL</span>
  </div>
);

/* 4 ---- Even spread: real points of the old SIFT baseline versus the engine's grid, same image pair ---- */
const DistributionVisual: React.FC = () => {
  const toPanel = (points: ReadonlyArray<readonly [number, number]>) => points.map(([u, v]) => ({ x: u * 100, y: v * 100 }));
  const clumped = toPanel(REAL.baselinePoints);
  const even = toPanel(REAL.gridSample);
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
            r={grid ? 1.3 : 2.2}
            fill={color}
            className="lp-pop"
            style={{ animationDelay: `${((grid ? i * 0.02 : i * 0.12)).toFixed(2)}s` }}
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
      {panel(`OLD SIFT: ${REAL.metrics.baselineInliers} POINTS`, clumped, AMBER, false)}
      {panel(`ENGINE: ${REAL.metrics.tiePoints.toLocaleString('en-US')} POINTS`, even, ACCENT, true)}
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
  // The output of the real Vikram landing-site run.
  const m = REAL.metrics;
  const lines: Array<{ text: string; tone: 'cmd' | 'ok' | 'file' | 'dim' }> = [
    { text: '$ register --ref nac_site.tif --src ohrc_site.tif', tone: 'cmd' },
    { text: `✓ ${m.putativeMatches.toLocaleString('en-US')} matches · ${m.coarseInliers.toLocaleString('en-US')} kept by MAGSAC++`, tone: 'ok' },
    { text: `✓ ${m.tiePoints.toLocaleString('en-US')} sub-pixel tie points`, tone: 'ok' },
    { text: `✓ tested on unseen blocks · ${m.holdoutRmsePx.toFixed(2)} px`, tone: 'ok' },
    { text: '→ registered.tif  (GeoTIFF)', tone: 'file' },
    { text: '→ tie_points.csv  (error per point)', tone: 'file' },
    { text: '→ report.json', tone: 'file' },
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
    { icon: <Mountain className="w-4 h-4" />, title: t('feat2Title'), desc: t('feat2Desc'), Visual: LocalCorrectionVisual, span: 'lg:row-span-2', h: 'h-72 lg:h-auto lg:flex-1' },
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

        {/* Roadmap: what is being built next, from the solution document */}
        <div className="mt-8 rounded-2xl border border-dashed border-[#E3A93B]/40 bg-[#E3A93B]/[0.04] p-5 sm:p-6">
          <div className="flex items-center gap-2 text-[#E3A93B]">
            <Hourglass className="w-4 h-4" />
            <h3 className="text-xs font-bold font-mono uppercase tracking-wider">{t('comingNextTitle')}</h3>
          </div>
          <p className="mt-1.5 text-xs sm:text-sm text-[#8B98A5]">{t('comingNextDesc')}</p>
          <ul className="mt-4 grid sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {(['comingNext1', 'comingNext2', 'comingNext3', 'comingNext4', 'comingNext5'] as const).map((key, i) => (
              <li key={key} className="flex gap-2.5 rounded-xl border border-white/10 bg-[#0C1218] p-3">
                <span className="font-mono text-[10px] font-bold text-[#E3A93B]/80 pt-0.5">{String(i + 1).padStart(2, '0')}</span>
                <span className="text-xs text-[#C9D3DC] leading-snug">{t(key)}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
};
