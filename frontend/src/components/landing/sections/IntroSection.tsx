import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { useTranslation } from '../../../i18n';
import craterA from '../../../assets/layers/crater-a.webp';
import { ACCENT, RED, clamp01, useInViewOnce, usePauseOffscreen, useScrollProgress } from '../utils';

/*
 * Live registration demo. Two copies of the same crater are stacked with
 * `mix-blend-mode: difference`: wherever they disagree the edges light up, and
 * as the user scrolls the moving copy is transformed back onto the reference
 * until the difference goes dark. That is literally what registration does.
 */

/** Misregistration at progress 0 (translate in % of the frame, degrees, scale). */
const START = { tx: 11, ty: -8, rot: 9, scale: 1.14 };
/**
 * Scroll progress (through the section) over which the frames align. Alignment
 * starts once the demo is well into view, so visitors actually see it misaligned.
 */
const ALIGN_FROM = 0.3;
const ALIGNED_AT = 0.62;
const alignment = (p: number) => clamp01((p - ALIGN_FROM) / (ALIGNED_AT - ALIGN_FROM));

/** Tie points on the reference, in normalised frame coordinates. */
const TIE_POINTS: Array<[number, number]> = [
  [0.36, 0.33],
  [0.72, 0.22],
  [0.2, 0.72],
  [0.62, 0.64],
  [0.85, 0.82],
];

const ease = (t: number) => 1 - Math.pow(1 - t, 3);

const RegistrationDemo: React.FC = () => {
  const { t } = useTranslation();
  const overlayRef = useRef<HTMLImageElement>(null);
  const linesRef = useRef<SVGGElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const offsetRef = useRef<HTMLSpanElement>(null);
  const [aligned, setAligned] = useState(false);

  const onProgress = useCallback((p: number) => {
    const k = 1 - ease(alignment(p));
    const tx = START.tx * k;
    const ty = START.ty * k;
    const rot = START.rot * k;
    const scale = 1 + (START.scale - 1) * k;

    if (overlayRef.current) {
      overlayRef.current.style.transform = `translate(${tx}%, ${ty}%) rotate(${rot}deg) scale(${scale})`;
    }

    // Where each reference tie point currently sits on the moving copy:
    // p' = centre + translate + R(rot) * S(scale) * (p - centre).
    const rad = (rot * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    linesRef.current?.querySelectorAll('g').forEach((g, i) => {
      const [x, y] = TIE_POINTS[i];
      const dx = (x - 0.5) * scale;
      const dy = (y - 0.5) * scale;
      const sx = 0.5 + tx / 100 + dx * cos - dy * sin;
      const sy = 0.5 + ty / 100 + dx * sin + dy * cos;
      const line = g.querySelector('line');
      const moving = g.querySelector<SVGCircleElement>('[data-src]');
      line?.setAttribute('x2', String(sx * 100));
      line?.setAttribute('y2', String(sy * 100));
      moving?.setAttribute('cx', String(sx * 100));
      moving?.setAttribute('cy', String(sy * 100));
    });

    if (barRef.current) barRef.current.style.transform = `scaleX(${alignment(p)})`;
    // Offset of the frame centre in demo pixels (a 500 px wide frame).
    if (offsetRef.current) offsetRef.current.textContent = `${(Math.hypot(tx, ty) * 5).toFixed(1)} px`;
    setAligned(p >= ALIGNED_AT);
  }, []);

  const ref = useScrollProgress<HTMLDivElement>(onProgress);

  return (
    <div ref={ref} className="relative">
      <div className="relative aspect-square overflow-hidden rounded-2xl border border-white/10 bg-black">
        {/* The blend group is isolated and boosted so small grey differences read as glowing
            teal edges; once registered the boost is dropped and the plain crater shows. */}
        <div
          className="absolute inset-0 [isolation:isolate] transition-[filter] duration-700"
          style={{ filter: aligned ? 'none' : 'contrast(2.6) brightness(2.2) sepia(1) hue-rotate(150deg) saturate(3.2)' }}
        >
          <img src={craterA} alt="" className="absolute inset-0 w-full h-full object-cover" />
          <img
            ref={overlayRef}
            src={craterA}
            alt=""
            className="absolute inset-0 w-full h-full object-cover origin-center will-change-transform transition-opacity duration-700"
            style={{
              mixBlendMode: 'difference',
              transform: `translate(${START.tx}%, ${START.ty}%) rotate(${START.rot}deg) scale(${START.scale})`,
              opacity: aligned ? 0 : 1,
            }}
          />
        </div>

        {/* Tie points: reference dot, moving dot and the residual between them */}
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 w-full h-full" aria-hidden="true">
          <g ref={linesRef}>
            {TIE_POINTS.map(([x, y], i) => (
              <g key={i}>
                <line
                  x1={x * 100}
                  y1={y * 100}
                  x2={x * 100}
                  y2={y * 100}
                  stroke={aligned ? ACCENT : RED}
                  strokeWidth="0.5"
                  strokeDasharray="1.2 1"
                />
                <circle cx={x * 100} cy={y * 100} r="1.3" fill="none" stroke="#fff" strokeWidth="0.45" />
                <circle data-src cx={x * 100} cy={y * 100} r="0.9" fill={aligned ? ACCENT : RED} />
              </g>
            ))}
          </g>
        </svg>

        {/* Scan flash when registration completes */}
        <div
          className={`absolute inset-x-0 h-24 bg-gradient-to-b from-transparent via-[#5EB8D6]/25 to-transparent pointer-events-none transition-transform duration-1000 ${
            aligned ? 'translate-y-[600%]' : '-translate-y-full'
          }`}
        />

        <div className="absolute left-3 top-3 font-mono text-[10px] font-bold tracking-widest text-white/80 bg-black/60 px-2 py-1 rounded">
          REF · LRO NAC
        </div>
        <div className="absolute right-3 top-3 font-mono text-[10px] font-bold tracking-widest text-[#FF8A8A] bg-black/60 px-2 py-1 rounded">
          SRC · OHRC
        </div>

        <div className="absolute inset-x-3 bottom-3 rounded-lg bg-black/70 backdrop-blur px-3 py-2.5 font-mono">
          <div className="flex items-center justify-between text-[10px] tracking-widest">
            <span
              className={`font-bold px-1.5 py-0.5 rounded ${
                aligned ? 'bg-[#5EB8D6]/15 text-[#5EB8D6]' : 'bg-[#FF4D4D]/15 text-[#FF8A8A]'
              }`}
            >
              {aligned ? t('introDemoRegistered') : t('introDemoMisaligned')}
            </span>
            <span className="text-white/60">
              OFFSET <span ref={offsetRef} className="text-white tabular-nums">70.3 px</span>
            </span>
          </div>
          <div className="mt-2 h-[3px] rounded bg-white/10 overflow-hidden">
            <div ref={barRef} className="h-full origin-left bg-[#5EB8D6]" style={{ transform: 'scaleX(0)' }} />
          </div>
          <p className="mt-2 text-[10px] leading-snug text-[#8B98A5] normal-case tracking-normal">{t('introDiffCaption')}</p>
        </div>
      </div>
      <p className="mt-3 text-center font-mono text-[10px] tracking-widest text-[#7A8794]">{t('introDemoHint')}</p>
    </div>
  );
};

/* ------------------------------------------------------------------ */

const CountUp: React.FC<{ to: number; decimals?: number; prefix?: string; suffix?: string; run: boolean }> = ({
  to,
  decimals = 0,
  prefix = '',
  suffix = '',
  run,
}) => {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const [value, setValue] = useState(reduceMotion ? to : 0);
  useEffect(() => {
    if (!run || reduceMotion) return;
    let raf = 0;
    const startedAt = performance.now();
    const step = (now: number) => {
      const k = ease(clamp01((now - startedAt) / 1400));
      setValue(to * k);
      if (k < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [run, to, reduceMotion]);
  return (
    <>
      {prefix}
      {value.toFixed(decimals)}
      {suffix}
    </>
  );
};

export const IntroSection: React.FC = () => {
  const { t } = useTranslation();
  const [statsRef, statsSeen] = useInViewOnce<HTMLDivElement>(0.4);
  // The headline sheen and CTA glow animate continuously; stop them while offscreen.
  const pauseRef = usePauseOffscreen<HTMLElement>();

  const stats = [
    { node: <CountUp to={160} suffix="x" run={statsSeen} />, label: t('landingStatScale') },
    { node: <CountUp to={0.25} decimals={2} suffix=" m" run={statsSeen} />, label: t('landingStatRes') },
    { node: '<1 px', label: t('landingStatTarget') },
    { node: <CountUp to={3} run={statsSeen} />, label: t('landingStatSensors') },
  ];

  return (
    <section ref={pauseRef} className="relative overflow-hidden">
      <div
        className="absolute -top-40 right-[-10%] w-[640px] h-[640px] rounded-full bg-[#176B87]/20 blur-[120px] pointer-events-none"
        aria-hidden="true"
      />
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-16 lg:pt-32 lg:pb-24">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          <div>
            <span className="inline-block text-[10px] font-mono font-bold uppercase tracking-wider px-2.5 py-1 rounded bg-[#5EB8D6]/10 text-[#5EB8D6] border border-[#5EB8D6]/25">
              {t('landingBadge')}
            </span>
            <h1 className="mt-5 text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.05] text-white">
              {t('landingH1')} <span className="hero-sheen">{t('landingH1Accent')}</span>
            </h1>
            <p className="mt-6 text-sm sm:text-base text-[#8B98A5] leading-relaxed max-w-xl">{t('landingSub')}</p>
            <div className="mt-8 flex flex-col sm:flex-row gap-3">
              <Link
                to="/matching"
                className="lp-glow inline-flex items-center justify-center gap-2 bg-[#176B87] hover:bg-[#1E82A3] text-white text-xs font-mono font-bold uppercase tracking-wider px-6 py-3.5 rounded-md transition-colors"
              >
                {t('landingCtaPrimary')}
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                to="/overview"
                className="inline-flex items-center justify-center bg-white/5 hover:bg-white/10 text-[#E6EDF3] border border-white/15 text-xs font-mono font-bold uppercase tracking-wider px-6 py-3.5 rounded-md transition-colors"
              >
                {t('landingCtaSecondary')}
              </Link>
            </div>
          </div>

          <RegistrationDemo />
        </div>

        {/* Key figures */}
        <div ref={statsRef} className="mt-20 grid grid-cols-2 lg:grid-cols-4 gap-y-10 gap-x-6">
          {stats.map((stat, i) => (
            <div key={stat.label} className="relative pl-5 border-l border-white/10">
              <div
                className={`lp-outline text-4xl sm:text-6xl font-bold font-mono tabular-nums leading-none whitespace-nowrap ${
                  statsSeen ? 'is-filled' : ''
                }`}
                style={{ transitionDelay: `${i * 150}ms` }}
              >
                {stat.node}
              </div>
              <div className="mt-3 text-[10px] font-mono font-semibold uppercase tracking-wider text-[#7A8794]">
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
