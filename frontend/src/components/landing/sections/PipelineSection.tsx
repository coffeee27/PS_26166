import React, { useCallback, useRef, useState } from 'react';
import { useTranslation } from '../../../i18n';
import type { en } from '../../../i18n/en';
import { LUNAR, bandColour } from '../lunarImages';
import { REAL } from '../realData';
import { ACCENT, usePauseOffscreen, useScrollProgress } from '../utils';
import { SectionHeading } from '../shared';

/*
 * Sticky scroll story: the real Chandrayaan-2 OHRC frame of the Vikram landing
 * site travels through the six engine steps until it lies on the LRO NAC
 * reference. The section is tall; its inner stage stays pinned while scroll
 * progress picks the active step, and CSS transitions animate between steps.
 */

type Key = keyof typeof en;

const STAGES: Array<{ name: Key; desc: Key; chip: string }> = [
  { name: 'pipe1', desc: 'pipe1Desc', chip: 'PDS4 / GeoTIFF' },
  { name: 'pipe2', desc: 'pipe2Desc', chip: '1 M PER PIXEL' },
  { name: 'pipe3', desc: 'pipe3Desc', chip: 'SIFT + MAGSAC++' },
  { name: 'pipe4', desc: 'pipe4Desc', chip: 'SUB-PIXEL TIE POINTS' },
  { name: 'pipe5', desc: 'pipe5Desc', chip: `TESTED: ${REAL.metrics.holdoutRmsePx.toFixed(2)} PX` },
  { name: 'pipe6', desc: 'pipe6Desc', chip: 'GeoTIFF + CSV' },
];

/** Real tie points of the Vikram run: normalised coordinates in the source (OHRC) and reference (NAC). */
const KEYPOINTS = [3, 11, 20, 27, 36, 43].map((i) => REAL.tiePoints[i]);

// Side-by-side layout used for correspondence: each frame scaled to 49% and
// shifted a quarter of the stage width left (source) or right (reference).
const SIDE_SCALE = 0.49;
const SIDE_SHIFT = 0.255;
const sideX = (u: number, side: -1 | 1) => 0.5 + side * SIDE_SHIFT + (u - 0.5) * SIDE_SCALE;
const sideY = (v: number) => 0.5 + (v - 0.5) * SIDE_SCALE;

const StageVisual: React.FC<{ stage: number }> = ({ stage }) => {
  const sideBySide = stage === 3;
  const transition = 'transform 800ms cubic-bezier(0.2, 0.8, 0.2, 1), opacity 600ms ease, filter 600ms ease';

  const sourceTransform =
    stage === 0 ? 'rotate(-9deg) scale(0.8)' : sideBySide ? `translateX(-${SIDE_SHIFT * 100}%) scale(${SIDE_SCALE})` : 'none';

  return (
    <div className="relative w-full aspect-[16/10] overflow-hidden rounded-2xl border border-white/10 bg-black">
      {/* Reference frame (LRO NAC): appears beside the source */}
      <div
        className="absolute inset-0"
        style={{
          transition,
          transform: sideBySide ? `translateX(${SIDE_SHIFT * 100}%) scale(${SIDE_SCALE})` : 'none',
          opacity: sideBySide ? 1 : 0,
        }}
      >
        <img src={LUNAR.nacSite} alt="" className="w-full h-full object-cover" />
      </div>

      {/* Source frame (Chandrayaan-2 OHRC) */}
      <div
        className="absolute inset-0"
        style={{
          transition,
          transform: sourceTransform,
          filter: stage === 0 ? 'grayscale(1) contrast(1.4) brightness(0.8)' : 'none',
          opacity: stage >= 4 ? 0 : 1,
        }}
      >
        <img src={LUNAR.ohrcSite} alt="" className="w-full h-full object-cover" />
        {/* Raw product scanlines */}
        <div
          className="absolute inset-0 transition-opacity duration-500"
          style={{
            opacity: stage === 0 ? 1 : 0,
            backgroundImage: 'repeating-linear-gradient(0deg, rgba(0,0,0,0.45) 0 2px, transparent 2px 4px)',
          }}
        />
        {/* Common pixel grid */}
        <svg
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          className="absolute inset-0 w-full h-full transition-opacity duration-500"
          style={{ opacity: stage === 1 ? 1 : 0 }}
          aria-hidden="true"
        >
          {[20, 40, 60, 80].map((g) => (
            <g key={g} stroke={ACCENT} strokeOpacity="0.55" strokeWidth="0.3">
              <line x1={g} y1="0" x2={g} y2="100" />
              <line x1="0" y1={g} x2="100" y2={g} />
            </g>
          ))}
        </svg>
        {/* Features found on the source */}
        <svg
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          className="absolute inset-0 w-full h-full transition-opacity duration-500"
          style={{ opacity: stage >= 2 && stage <= 3 ? 1 : 0 }}
          aria-hidden="true"
        >
          {KEYPOINTS.map((point, i) => (
            <ellipse key={i} cx={point.src[0] * 100} cy={point.src[1] * 100} rx="1.6" ry="2.5" fill="none" stroke={ACCENT} strokeWidth="0.6" />
          ))}
        </svg>
      </div>

      {/* Real tie points joining the two frames, coloured by measured error */}
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        className="absolute inset-0 w-full h-full pointer-events-none"
        style={{ opacity: sideBySide ? 1 : 0, transition: 'opacity 400ms ease', transitionDelay: sideBySide ? '600ms' : '0ms' }}
        aria-hidden="true"
      >
        {KEYPOINTS.map((point, i) => (
          <line
            key={i}
            x1={sideX(point.src[0], -1) * 100}
            y1={sideY(point.src[1]) * 100}
            x2={sideX(point.ref[0], 1) * 100}
            y2={sideY(point.ref[1]) * 100}
            stroke={bandColour(point.err) === '#176B87' ? ACCENT : bandColour(point.err)}
            strokeWidth="0.35"
            className="arch-dash"
            style={{ strokeDasharray: '1.5 1.5' }}
          />
        ))}
      </svg>

      {/* Sub-pixel magnifier over real OHRC pixels */}
      <div
        className="absolute left-1/2 top-1/2 w-[30%] aspect-square rounded-full border-2 border-[#5EB8D6] bg-black/80 overflow-hidden shadow-[0_0_40px_rgba(94,184,214,0.45)]"
        style={{
          transition: 'transform 500ms cubic-bezier(0.2, 0.8, 0.2, 1), opacity 400ms ease',
          transitionDelay: sideBySide ? '900ms' : '0ms',
          opacity: sideBySide ? 1 : 0,
          transform: `translate(-50%, -50%) scale(${sideBySide ? 1 : 0.4})`,
        }}
        aria-hidden="true"
      >
        <img src={LUNAR.ohrcBrightCrater} alt="" className="w-full h-full object-cover scale-[3] [image-rendering:pixelated]" />
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              'linear-gradient(rgba(0,0,0,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.6) 1px, transparent 1px)',
            backgroundSize: '12.5% 12.5%',
          }}
        />
        <div className="lp-crosshair absolute left-1/2 top-1/2 -ml-3 -mt-3 w-6 h-6">
          <span className="absolute inset-0 rounded-full border-2 border-[#E3A93B]" />
          <span className="absolute left-1/2 -top-2 h-10 w-px bg-[#E3A93B]" />
          <span className="absolute top-1/2 -left-2 w-10 h-px bg-[#E3A93B]" />
        </div>
      </div>

      {/* Model test: real measured error map, blue is good, red is weak */}
      <div className="absolute inset-0" style={{ transition: 'opacity 600ms ease', opacity: stage === 4 ? 1 : 0 }}>
        <img src={LUNAR.heatmapLocal} alt="" className="w-full h-full object-cover" />
      </div>

      {/* Final product: the registered overlay (grey = agree) */}
      <div className="absolute inset-0" style={{ transition: 'opacity 700ms ease', opacity: stage === 5 ? 1 : 0 }}>
        <img src={LUNAR.overlaySite} alt="" className="w-full h-full object-cover" />
      </div>

      {/* Registered badge */}
      <div
        className="absolute inset-0 flex items-center justify-center pointer-events-none"
        style={{ transition: 'opacity 500ms ease 300ms', opacity: stage === 5 ? 1 : 0 }}
      >
        <div className="flex items-center gap-2 rounded-full border border-[#5EB8D6]/60 bg-black/70 backdrop-blur px-4 py-2 font-mono text-xs font-bold tracking-widest text-[#5EB8D6] shadow-[0_0_30px_rgba(94,184,214,0.35)]">
          <svg viewBox="0 0 16 16" className="w-4 h-4" aria-hidden="true">
            <path d="M3 8.5l3 3 7-7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          REGISTERED · {REAL.metrics.holdoutRmseM.toFixed(2)} M
        </div>
      </div>

      <div className="absolute left-3 top-3 font-mono text-[10px] font-bold tracking-widest px-2 py-1 rounded bg-black/70 text-[#5EB8D6]">
        {STAGES[stage].chip}
      </div>
      <div className="absolute right-3 bottom-3 font-mono text-[9px] font-bold tracking-widest px-2 py-1 rounded bg-black/60 text-white/60">
        {stage === 3 ? 'OHRC  →  LRO NAC' : stage === 4 ? 'MEASURED ERROR MAP' : stage === 5 ? 'NAC MAGENTA · OHRC GREEN' : 'CHANDRAYAAN-2 OHRC'}
      </div>
    </div>
  );
};

export const PipelineSection: React.FC = () => {
  const { t } = useTranslation();
  const [stage, setStage] = useState(0);
  const packetRef = useRef<HTMLDivElement>(null);
  const fillRef = useRef<HTMLDivElement>(null);
  const pauseRef = usePauseOffscreen<HTMLDivElement>();

  const onProgress = useCallback((p: number) => {
    setStage(Math.min(STAGES.length - 1, Math.floor(p * STAGES.length)));
    if (packetRef.current) packetRef.current.style.left = `${p * 100}%`;
    if (fillRef.current) fillRef.current.style.transform = `scaleX(${p})`;
  }, []);
  const sectionRef = useScrollProgress<HTMLElement>(onProgress, 'sticky');

  return (
    <section ref={sectionRef} id="pipeline" className="scroll-mt-16 relative border-t border-white/10 bg-black h-[320vh]">
      <div ref={pauseRef} className="sticky top-0 h-screen flex flex-col justify-center overflow-hidden">
        <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-16">
          <div className="hidden sm:block">
            <SectionHeading badge={t('landingPipelineTitle')} title={t('secPipelineTitle')} />
          </div>
          <div className="sm:hidden">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#5EB8D6]">
              {t('landingPipelineTitle')}
            </span>
          </div>

          <div className="mt-6 lg:mt-10 grid lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] gap-6 lg:gap-12 items-center">
            <div className="max-h-[48vh] lg:max-h-none aspect-[16/10] mx-auto w-full" style={{ maxWidth: 'calc(48vh * 1.6)' }}>
              <StageVisual stage={stage} />
            </div>

            {/* Mobile: only the active step */}
            <div className="lg:hidden">
              <div className="font-mono text-[11px] font-bold text-[#5EB8D6]">
                {String(stage + 1).padStart(2, '0')} / {String(STAGES.length).padStart(2, '0')}
              </div>
              <h3 className="mt-1 text-xl font-bold text-white">{t(STAGES[stage].name)}</h3>
              <p className="mt-1 text-sm text-[#8B98A5] leading-relaxed">{t(STAGES[stage].desc)}</p>
            </div>

            {/* Desktop: full step list */}
            <ol className="hidden lg:block space-y-1">
              {STAGES.map((item, i) => {
                const state = i === stage ? 'active' : i < stage ? 'done' : 'todo';
                return (
                  <li
                    key={item.name}
                    className={`relative rounded-xl px-4 py-3 transition-all duration-500 ${
                      state === 'active' ? 'bg-[#5EB8D6]/10 border border-[#5EB8D6]/40' : 'border border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={`w-7 h-7 shrink-0 rounded-full flex items-center justify-center font-mono text-[11px] font-bold transition-colors duration-500 ${
                          state === 'todo' ? 'bg-white/5 text-[#7A8794]' : 'bg-[#176B87] text-white'
                        }`}
                      >
                        {state === 'done' ? '✓' : i + 1}
                      </span>
                      <span
                        className={`font-mono text-xs font-bold uppercase tracking-wide transition-colors duration-500 ${
                          state === 'active' ? 'text-white' : state === 'done' ? 'text-[#8B98A5]' : 'text-[#5F6D7A]'
                        }`}
                      >
                        {t(item.name)}
                      </span>
                    </div>
                    <div
                      className="grid transition-all duration-500"
                      style={{ gridTemplateRows: state === 'active' ? '1fr' : '0fr' }}
                    >
                      <p className="overflow-hidden pl-10 text-sm text-[#8B98A5] leading-relaxed">
                        <span className="block pt-1.5">{t(item.desc)}</span>
                      </p>
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>

          {/* Rail with the travelling data packet */}
          <div className="relative mt-8 lg:mt-12 h-6" aria-hidden="true">
            <div className="absolute inset-x-0 top-1/2 h-px bg-white/15" />
            <div ref={fillRef} className="absolute inset-x-0 top-1/2 h-px origin-left bg-[#5EB8D6]" style={{ transform: 'scaleX(0)' }} />
            {STAGES.map((item, i) => (
              <span
                key={item.name}
                className={`absolute top-1/2 w-2.5 h-2.5 -ml-[5px] -mt-[5px] rounded-full border transition-colors duration-500 ${
                  i <= stage ? 'bg-[#5EB8D6] border-[#5EB8D6]' : 'bg-black border-white/30'
                }`}
                style={{ left: `${(i / (STAGES.length - 1)) * 100}%` }}
              />
            ))}
            <div ref={packetRef} className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2" style={{ left: '0%' }}>
              <div className="w-8 h-8 rounded-md overflow-hidden border-2 border-white shadow-[0_0_20px_rgba(94,184,214,0.8)]">
                <img src={LUNAR.ohrcCraterField} alt="" className="w-full h-full object-cover" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
