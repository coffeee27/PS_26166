import React, { useId } from 'react';
import { Sun, Eye, Maximize2 } from 'lucide-react';
import { useTranslation } from '../../../i18n';
import craterA from '../../../assets/layers/crater-a.webp';
import craterB from '../../../assets/layers/crater-b.webp';
import { ACCENT, AMBER, usePauseOffscreen } from '../utils';
import { SectionHeading } from '../shared';

/* 1 ---- Illumination: a crater whose shadow swings round with the Sun ---- */
const IlluminationVisual: React.FC = () => {
  const id = useId();
  const cx = 300;
  const cy = 190;
  const r = 104;
  return (
    // overflow: visible lets the ground extend past the viewBox, so a taller card has no empty band.
    <svg viewBox="0 0 600 380" className="absolute inset-0 w-full h-full" style={{ overflow: 'visible' }} role="img" aria-label="Crater shading changing with sun direction">
      <defs>
        <radialGradient id={`${id}-ground`} gradientUnits="userSpaceOnUse" cx="300" cy="190" r="460">
          <stop offset="0%" stopColor="#3A3F45" />
          <stop offset="100%" stopColor="#0B0E12" />
        </radialGradient>
        <clipPath id={`${id}-bowl`}>
          <circle cx={cx} cy={cy} r={r} />
        </clipPath>
      </defs>
      <rect x="-400" y="-400" width="1400" height="1180" fill={`url(#${id}-ground)`} />
      <image href={craterA} x="-400" y="-400" width="1400" height="1180" preserveAspectRatio="xMidYMid slice" opacity="0.18" />

      {/* Rim */}
      <circle cx={cx} cy={cy} r={r + 14} fill="none" stroke="#6B7178" strokeWidth="18" opacity="0.55" />

      {/* Shading rotates with the Sun: the lit floor is offset away from it, leaving
          a dark crescent on the sun-facing side of the bowl. */}
      <g className="lp-spin" style={{ animationDuration: '12s', transformBox: 'view-box', transformOrigin: `${cx}px ${cy}px` }}>
        <circle cx={cx} cy={cy} r={r} fill="#07090C" />
        <g clipPath={`url(#${id}-bowl)`}>
          <circle cx={cx + 34} cy={cy} r={r} fill="#8C9197" />
          <circle cx={cx + 52} cy={cy} r={r * 0.78} fill="#A9AEB3" />
        </g>
        <circle cx={cx - r - 48} cy={cy} r="15" fill={AMBER} />
        <circle cx={cx - r - 48} cy={cy} r="28" fill={AMBER} opacity="0.2" />
        <line x1={cx - r - 30} y1={cy} x2={cx - r + 6} y2={cy} stroke={AMBER} strokeWidth="1.5" strokeDasharray="3 4" />
      </g>

      {/* Real frames, different light */}
      <g transform="translate(22, 262)">
        <image href={craterA} width="92" height="96" preserveAspectRatio="xMidYMid slice" />
        <image href={craterB} x="100" width="92" height="96" preserveAspectRatio="xMidYMid slice" />
        <rect width="92" height="96" fill="none" stroke="#fff" strokeOpacity="0.3" />
        <rect x="100" width="92" height="96" fill="none" stroke={ACCENT} strokeOpacity="0.7" />
        <text x="0" y="-8" className="font-mono" fontSize="10" fontWeight="700" fill="#8B98A5" letterSpacing="1">
          SAME TERRAIN · TWO SUNS
        </text>
      </g>

      {/* Sun azimuth dial (absolute coordinates so the rotation origin is exact) */}
      <text x="470" y="30" className="font-mono" fontSize="10" fontWeight="700" fill="#8B98A5" letterSpacing="1">SUN AZIMUTH</text>
      <circle cx="520" cy="82" r="30" fill="none" stroke="#fff" strokeOpacity="0.15" />
      <g className="lp-spin" style={{ animationDuration: '12s', transformBox: 'view-box', transformOrigin: '520px 82px' }}>
        <line x1="520" y1="82" x2="492" y2="82" stroke={AMBER} strokeWidth="2" />
        <circle cx="492" cy="82" r="4" fill={AMBER} />
      </g>
      <circle cx="520" cy="82" r="2.5" fill="#fff" />
    </svg>
  );
};

/* 2 ---- Viewpoint: tilting terrain with raised markers that parallax ---- */
const ViewpointVisual: React.FC = () => (
  <div className="absolute inset-0 flex items-center justify-center bg-[#05080B] [perspective:700px]">
    <div className="lp-tilt relative w-[62%] aspect-square">
      <img src={craterB} alt="" className="absolute inset-0 w-full h-full object-cover rounded-md opacity-90" />
      <div
        className="absolute inset-0 rounded-md"
        style={{
          backgroundImage:
            'linear-gradient(rgba(94,184,214,0.35) 1px, transparent 1px), linear-gradient(90deg, rgba(94,184,214,0.35) 1px, transparent 1px)',
          backgroundSize: '20% 20%',
        }}
      />
      {/* Boulders at different heights shift differently as the view tilts */}
      {[
        { left: '22%', top: '30%', z: 46 },
        { left: '64%', top: '58%', z: 26 },
        { left: '42%', top: '72%', z: 64 },
      ].map((b, i) => (
        <React.Fragment key={i}>
          <span className="absolute w-2 h-2 -ml-1 -mt-1 rounded-full border border-white/60" style={{ left: b.left, top: b.top }} />
          <span
            className="absolute w-3 h-3 -ml-1.5 -mt-1.5 rounded-full bg-[#E3A93B] shadow-[0_0_12px_#E3A93B]"
            style={{ left: b.left, top: b.top, transform: `translateZ(${b.z}px)` }}
          />
        </React.Fragment>
      ))}
    </div>
    <div className="absolute left-3 top-3 font-mono text-[10px] font-bold tracking-widest text-[#8B98A5]">
      RELIEF → PARALLAX
    </div>
  </div>
);

/* 3 ---- Scale: an endless zoom through four resolutions ---- */
const ScaleVisual: React.FC = () => {
  const levels = ['80 m', '5 m', '0.5 m', '0.25 m'];
  return (
    <div className="absolute inset-0 overflow-hidden bg-black">
      {levels.map((label, i) => (
        <div
          key={label}
          className="lp-zoom absolute inset-0 flex items-center justify-center"
          style={{ animationDelay: `${-i * 1.5}s` }}
        >
          <div className="relative w-[70%] aspect-square">
            <img
              src={i % 2 ? craterB : craterA}
              alt=""
              className="absolute inset-0 w-full h-full object-cover rounded-sm border border-[#5EB8D6]/60"
            />
            <span className="absolute -top-5 left-0 font-mono text-[10px] font-bold text-[#5EB8D6]">{label} / px</span>
          </div>
        </div>
      ))}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-10 h-10 border border-white/70 rounded-full" />
        <div className="absolute w-16 h-px bg-white/50" />
        <div className="absolute h-16 w-px bg-white/50" />
      </div>
      <div className="absolute right-3 bottom-3 font-mono text-[11px] font-bold px-2 py-1 rounded bg-[#E3A93B]/15 text-[#E3A93B]">
        320x
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------ */

export const ChallengesSection: React.FC = () => {
  const { t } = useTranslation();
  const ref = usePauseOffscreen<HTMLElement>();

  const cards = [
    {
      icon: <Sun className="w-4 h-4" />,
      title: t('challengeIllumTitle'),
      desc: t('challengeIllumDesc'),
      tag: 'SOLAR AZIMUTH / ELEVATION',
      Visual: IlluminationVisual,
      span: 'lg:col-span-2 lg:row-span-2',
      aspect: 'aspect-[16/10] lg:aspect-auto lg:flex-1 lg:min-h-[340px]',
    },
    {
      icon: <Eye className="w-4 h-4" />,
      title: t('challengeViewTitle'),
      desc: t('challengeViewDesc'),
      tag: 'PARALLAX / EMISSION ANGLE',
      Visual: ViewpointVisual,
      span: '',
      aspect: 'aspect-[16/10]',
    },
    {
      icon: <Maximize2 className="w-4 h-4" />,
      title: t('challengeScaleTitle'),
      desc: t('challengeScaleDesc'),
      tag: '0.25 m — 80 m / PIXEL',
      Visual: ScaleVisual,
      span: '',
      aspect: 'aspect-[16/10]',
    },
  ];

  return (
    <section ref={ref} id="challenges" className="scroll-mt-16 border-t border-white/10 bg-black">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-28">
        <SectionHeading badge={t('landingChallengesTitle')} title={t('secChallengesTitle')} desc={t('landingChallengesDesc')} />

        <div className="mt-12 grid lg:grid-cols-3 gap-5">
          {cards.map(({ icon, title, desc, tag, Visual, span, aspect }) => (
            <article
              key={title}
              className={`group flex flex-col rounded-2xl border border-white/10 bg-[#0C1218] overflow-hidden hover:border-[#5EB8D6]/40 transition-colors ${span}`}
            >
              <div className={`relative overflow-hidden ${aspect}`}>
                <Visual />
              </div>
              <div className="p-5">
                <div className="flex items-center gap-2 text-[#5EB8D6]">
                  {icon}
                  <h3 className="text-sm font-bold font-mono uppercase tracking-wide text-white">{title}</h3>
                </div>
                <p className="mt-2 text-xs sm:text-sm text-[#8B98A5] leading-relaxed">{desc}</p>
                <div className="mt-3 text-[10px] font-mono font-semibold uppercase tracking-wider text-[#7A8794]">{tag}</div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
};
