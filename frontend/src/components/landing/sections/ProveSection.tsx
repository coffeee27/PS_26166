import React from 'react';
import { BadgeCheck, CheckCircle2, XCircle, Ban, Sun } from 'lucide-react';
import { useTranslation } from '../../../i18n';
import { LUNAR } from '../lunarImages';
import { PROVE_DATA } from '../proveData';
import { ACCENT, AMBER, RED, useInViewOnce, usePauseOffscreen } from '../utils';
import { SectionHeading } from '../shared';

/* PROVE: what the name means, the five measured checks, and what they said on the real demo pairs. */

type Outcome = 'STRONG' | 'MODERATE' | 'WEAK' | 'REFUSED';
type CheckId = 'subpixel' | 'agreement' | 'coverage' | 'evenness' | 'good_cells';

const GREEN = '#3FB57F';
const OUTCOME_COLOR: Record<Outcome, string> = { STRONG: GREEN, MODERATE: AMBER, WEAK: RED, REFUSED: RED };

const formatValue = (value: number | null, unit: string) => {
  if (value === null) return '—';
  if (unit === 'px') return `${value.toFixed(2)} px`;
  if (unit === '%') return `${Math.round(value * 100)}%`;
  return value.toFixed(2);
};

/* ---- The four parts of the name ---- */
const Acronym: React.FC = () => {
  const { t } = useTranslation();
  const parts = [
    { letters: 'P', word: t('proveWordP'), desc: t('proveDescP') },
    { letters: 'R', word: t('proveWordR'), desc: t('proveDescR') },
    { letters: 'O·V', word: t('proveWordOV'), desc: t('proveDescOV') },
    { letters: 'E', word: t('proveWordE'), desc: t('proveDescE') },
  ];
  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {parts.map((part, i) => (
        <article key={part.letters} className="relative rounded-2xl border border-white/10 bg-[#0C1218] p-5 overflow-hidden">
          <span
            className="lp-glow absolute right-4 top-4 w-2 h-2 rounded-full bg-[#5EB8D6]"
            style={{ animationDelay: `${i * 0.55}s` }}
            aria-hidden="true"
          />
          <div className="font-mono text-5xl font-bold leading-none text-transparent [-webkit-text-stroke:1.5px_#5EB8D6]">{part.letters}</div>
          <h3 className="mt-3 text-sm font-bold font-mono uppercase tracking-wide text-white">{part.word}</h3>
          <p className="mt-2 text-xs sm:text-sm text-[#8B98A5] leading-relaxed">{part.desc}</p>
        </article>
      ))}
    </div>
  );
};

/* ---- The five checks and their limits ---- */
const ChecksStrip: React.FC = () => {
  const { t } = useTranslation();
  const reference = PROVE_DATA.samples.find((s) => 'checks' in s);
  const checks = reference && 'checks' in reference ? reference.checks : [];
  const label: Record<CheckId, string> = {
    subpixel: t('proveCheckSubpixel'),
    agreement: t('proveCheckAgreement'),
    coverage: t('proveCheckCoverage'),
    evenness: t('proveCheckEvenness'),
    good_cells: t('proveCheckGoodCells'),
  };
  const why: Record<CheckId, string> = {
    subpixel: t('proveWhySubpixel'),
    agreement: t('proveWhyAgreement'),
    coverage: t('proveWhyCoverage'),
    evenness: t('proveWhyEvenness'),
    good_cells: t('proveWhyGoodCells'),
  };
  return (
    <div className="rounded-2xl border border-white/10 bg-[#0C1218] p-5 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
        <h3 className="text-xs font-bold font-mono uppercase tracking-wider text-white">{t('proveChecksTitle')}</h3>
        <span className="font-mono text-[10px] text-[#7A8794]">{t('proveLevels')}</span>
      </div>
      <ol className="mt-4 grid sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {checks.map((check, i) => (
          <li key={check.id} className="rounded-xl border border-white/10 bg-[#070B0F] p-3">
            <div className="flex items-center justify-between gap-2">
              <span className="font-mono text-[10px] font-bold text-[#5EB8D6]">{String(i + 1).padStart(2, '0')}</span>
              <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#5EB8D6]/10 text-[#5EB8D6] whitespace-nowrap">
                {check.comparison === '<=' ? '≤' : '≥'} {formatValue(check.limit, check.unit)}
              </span>
            </div>
            <div className="mt-2 text-xs font-semibold text-white leading-snug">{label[check.id as CheckId]}</div>
            <p className="mt-1 text-[11px] text-[#8B98A5] leading-snug">{why[check.id as CheckId]}</p>
          </li>
        ))}
      </ol>
      <p className="mt-4 font-mono text-[10px] text-[#7A8794]">{t('proveNote')}</p>
    </div>
  );
};

/* ---- What PROVE said on each real demo pair ---- */
const CaseCards: React.FC = () => {
  const { t } = useTranslation();
  const [ref, seen] = useInViewOnce<HTMLDivElement>(0.2);
  const name: Record<string, string> = {
    'vikram-landing-site': t('proveCaseVikram'),
    'photo-vs-height-render': t('proveCaseHeight'),
    'zoom-gap-5m': t('proveCaseZoom'),
    'half-overlap': t('proveCaseHalf'),
    'different-spots': t('proveCaseSpots'),
  };
  const story: Record<string, string> = {
    'vikram-landing-site': t('proveStoryVikram'),
    'photo-vs-height-render': t('proveStoryHeight'),
    'zoom-gap-5m': t('proveStoryZoom'),
    'half-overlap': t('proveStoryHalf'),
    'different-spots': t('proveStorySpots'),
  };
  const checkLabel: Record<CheckId, string> = {
    subpixel: t('proveCheckSubpixel'),
    agreement: t('proveCheckAgreement'),
    coverage: t('proveCheckCoverage'),
    evenness: t('proveCheckEvenness'),
    good_cells: t('proveCheckGoodCells'),
  };
  const outcomeLabel: Record<Outcome, string> = {
    STRONG: t('evidenceStrong'),
    MODERATE: t('evidenceModerate'),
    WEAK: t('evidenceWeak'),
    REFUSED: t('proveRefused'),
  };

  return (
    <div ref={ref}>
      <h3 className="text-xs font-bold font-mono uppercase tracking-wider text-white">{t('proveCasesTitle')}</h3>
      <p className="mt-1.5 text-xs sm:text-sm text-[#8B98A5]">{t('proveCasesDesc')}</p>
      <div className="mt-4 grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {PROVE_DATA.samples.map((sample, i) => {
          const outcome = sample.outcome as Outcome;
          const color = OUTCOME_COLOR[outcome];
          const scored = 'checks' in sample;
          return (
            <article
              key={sample.id}
              className={`flex flex-col rounded-2xl border bg-[#0C1218] p-4 transition-all duration-700 ${seen ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
              style={{ borderColor: `${color}55`, transitionDelay: `${i * 120}ms` }}
            >
              <span
                className="self-start font-mono text-[10px] font-bold tracking-wider px-2 py-0.5 rounded"
                style={{ backgroundColor: `${color}22`, color }}
              >
                {outcomeLabel[outcome]}
              </span>
              <h4 className="mt-3 text-sm font-bold text-white leading-snug">{name[sample.id] ?? sample.title}</h4>
              <p className="mt-1 text-[11px] text-[#8B98A5] leading-snug">{story[sample.id]}</p>

              <div className="mt-4 flex items-end gap-2 font-mono">
                {scored ? (
                  <>
                    <span className="text-4xl font-bold leading-none tabular-nums" style={{ color }}>
                      {sample.passed}
                    </span>
                    <span className="text-sm text-[#7A8794] pb-0.5">/ {sample.total}</span>
                    <span className="ml-auto text-right text-[11px] text-[#C9D3DC] tabular-nums">
                      {sample.rmsePx.toFixed(2)} px
                      <span className="block text-[10px] text-[#7A8794]">{sample.tiePoints.toLocaleString('en-US')} {t('provePoints')}</span>
                    </span>
                  </>
                ) : (
                  <span className="flex items-center gap-2 text-2xl font-bold" style={{ color }}>
                    <Ban className="w-6 h-6" />
                    {t('proveNoScore')}
                  </span>
                )}
              </div>

              {scored ? (
                <ul className="mt-4 space-y-1.5 border-t border-white/10 pt-3">
                  {sample.checks.map((check, j) => (
                    <li
                      key={check.id}
                      className={`flex items-center justify-between gap-2 text-[10px] font-mono transition-opacity duration-500 ${seen ? 'opacity-100' : 'opacity-0'}`}
                      style={{ transitionDelay: `${i * 120 + 300 + j * 90}ms` }}
                    >
                      <span className="flex items-center gap-1.5 min-w-0 text-[#8B98A5]">
                        {check.passed ? (
                          <CheckCircle2 className="w-3.5 h-3.5 shrink-0" style={{ color: GREEN }} />
                        ) : (
                          <XCircle className="w-3.5 h-3.5 shrink-0" style={{ color: RED }} />
                        )}
                        <span className="truncate" title={checkLabel[check.id as CheckId]}>
                          {checkLabel[check.id as CheckId]}
                        </span>
                      </span>
                      <span className="shrink-0 tabular-nums font-bold" style={{ color: check.passed ? '#C9D3DC' : RED }}>
                        {formatValue(check.value, check.unit)}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-4 border-t border-white/10 pt-3 font-mono text-[10px] leading-relaxed text-[#C9D3DC]">“{sample.reason}”</p>
              )}
            </article>
          );
        })}
      </div>
    </div>
  );
};

/* ---- Error as the OHRC image loses detail ---- */
const ZoomChart: React.FC = () => {
  const { t } = useTranslation();
  const rows = PROVE_DATA.zoom;
  const width = 320;
  const height = 190;
  const pad = { left: 38, right: 14, top: 16, bottom: 34 };
  const maxX = 10;
  const maxY = Math.max(2.2, ...rows.map((r) => r.rmsePx + 0.2));
  const x = (gsd: number) => pad.left + ((gsd - 0) / maxX) * (width - pad.left - pad.right);
  const y = (px: number) => height - pad.bottom - (px / maxY) * (height - pad.top - pad.bottom);
  const path = rows.map((r, i) => `${i ? 'L' : 'M'}${x(r.gsdM).toFixed(1)},${y(r.rmsePx).toFixed(1)}`).join(' ');

  return (
    <article className="rounded-2xl border border-white/10 bg-[#0C1218] p-5">
      <h3 className="text-xs font-bold font-mono uppercase tracking-wider text-white">{t('proveZoomTitle')}</h3>
      <p className="mt-1.5 text-xs text-[#8B98A5] leading-relaxed">{t('proveZoomDesc')}</p>
      <svg viewBox={`0 0 ${width} ${height}`} className="mt-4 w-full h-auto max-w-xl mx-auto block" role="img" aria-label={t('proveZoomTitle')}>
        {[0, 1, 2].map((tick) => (
          <g key={tick}>
            <line x1={pad.left} x2={width - pad.right} y1={y(tick)} y2={y(tick)} stroke="#fff" strokeOpacity="0.08" />
            <text x={pad.left - 8} y={y(tick) + 3} textAnchor="end" fontSize="9" fill="#7A8794" className="font-mono">
              {tick} px
            </text>
          </g>
        ))}
        <line x1={pad.left} x2={width - pad.right} y1={y(1)} y2={y(1)} stroke={GREEN} strokeDasharray="4 4" strokeOpacity="0.8" />
        <text x={width - pad.right} y={y(1) - 5} textAnchor="end" fontSize="9" fill={GREEN} className="font-mono">
          {t('proveSubpixelLine')}
        </text>
        <path
          d={path}
          fill="none"
          stroke={ACCENT}
          strokeWidth="2"
          pathLength={1}
          strokeDasharray="1"
          className="lp-sweep"
          style={{ '--len': '1', '--to': '0', animationDuration: '6s' } as React.CSSProperties}
        />
        {rows.map((r) => (
          <g key={r.gsdM}>
            <circle cx={x(r.gsdM)} cy={y(r.rmsePx)} r="5" fill={OUTCOME_COLOR[r.evidence as Outcome]} stroke="#0C1218" strokeWidth="2" />
            <text x={x(r.gsdM)} y={y(r.rmsePx) - 10} textAnchor="middle" fontSize="9" fontWeight="700" fill="#E6EDF3" className="font-mono">
              {r.passed}/5
            </text>
            <text x={x(r.gsdM)} y={height - pad.bottom + 14} textAnchor="middle" fontSize="9" fill="#7A8794" className="font-mono">
              {r.gsdM} m
            </text>
          </g>
        ))}
        <text x={(pad.left + width - pad.right) / 2} y={height - 4} textAnchor="middle" fontSize="9" fill="#7A8794" className="font-mono">
          {t('proveZoomAxis')}
        </text>
      </svg>
      <div className="mt-2 flex flex-wrap gap-3 font-mono text-[10px]">
        {(['STRONG', 'MODERATE', 'WEAK'] as const).map((level) => (
          <span key={level} className="flex items-center gap-1.5 text-[#8B98A5]">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: OUTCOME_COLOR[level] }} />
            {level === 'STRONG' ? t('evidenceStrong') : level === 'MODERATE' ? t('evidenceModerate') : t('evidenceWeak')}
          </span>
        ))}
      </div>
    </article>
  );
};

/* ---- The open problem: the same craters with the Sun on the other side ---- */
const SunFlip: React.FC = () => {
  const { t } = useTranslation();
  const sun = PROVE_DATA.sunFlip;
  const bars = [
    { label: `${t('proveSunSame')} (${sun.sameAzimuthDeg}°)`, value: sun.same, color: ACCENT, image: LUNAR.dtmSunWest },
    { label: `${t('proveSunOpposite')} (${sun.oppositeAzimuthDeg}°)`, value: sun.opposite, color: RED, image: LUNAR.dtmSunEast },
  ];
  return (
    <article className="rounded-2xl border border-dashed border-[#E3A93B]/40 bg-[#E3A93B]/[0.04] p-5">
      <div className="flex items-center gap-2 text-[#E3A93B]">
        <Sun className="w-4 h-4" />
        <h3 className="text-xs font-bold font-mono uppercase tracking-wider">{t('proveSunTitle')}</h3>
      </div>
      <p className="mt-1.5 text-xs text-[#8B98A5] leading-relaxed">{t('proveSunDesc')}</p>
      <div className="mt-4 space-y-4">
        {bars.map((bar) => (
          <div key={bar.label} className="flex items-center gap-3">
            <img src={bar.image} alt="" className="w-14 h-14 rounded object-cover border border-white/15 shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="flex justify-between font-mono text-[10px] text-[#8B98A5]">
                <span className="truncate">{bar.label}</span>
                <span className="font-bold tabular-nums" style={{ color: bar.color }}>
                  {bar.value > 0 ? '+' : ''}
                  {bar.value.toFixed(2)}
                </span>
              </div>
              {/* A centred axis: positive agreement grows right, reversed shading grows left. */}
              <div className="mt-1.5 relative h-2.5 rounded bg-white/5">
                <span className="absolute left-1/2 top-[-3px] bottom-[-3px] w-px bg-white/30" />
                <span
                  className="absolute top-0 bottom-0 rounded"
                  style={{
                    backgroundColor: bar.color,
                    left: bar.value >= 0 ? '50%' : `${50 + bar.value * 50}%`,
                    width: `${Math.abs(bar.value) * 50}%`,
                  }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
      <p className="mt-3 font-mono text-[10px] text-[#7A8794]">{t('proveSunImages')}</p>
      <p className="mt-3 text-xs text-[#C9D3DC] leading-relaxed">{t('proveSunNext')}</p>
    </article>
  );
};

export const ProveSection: React.FC = () => {
  const { t } = useTranslation();
  const ref = usePauseOffscreen<HTMLElement>();

  return (
    <section ref={ref} id="prove" className="scroll-mt-16 border-t border-white/10 bg-[#070B0F]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-28 space-y-10">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
          <SectionHeading badge={t('proveBadge')} title={t('proveSectionTitle')} desc={t('proveSectionDesc')} />
          <div className="shrink-0 flex items-center gap-3 rounded-2xl border border-[#5EB8D6]/30 bg-[#5EB8D6]/[0.06] px-4 py-3">
            <BadgeCheck className="w-7 h-7 text-[#5EB8D6]" />
            <div className="font-mono">
              <div className="text-[10px] uppercase tracking-wider text-[#7A8794]">{t('proveFullFormLabel')}</div>
              <div className="text-sm font-bold text-white">
                <span className="text-[#5EB8D6]">P</span>redict, <span className="text-[#5EB8D6]">R</span>efine,{' '}
                <span className="text-[#5EB8D6]">O</span>nly-if <span className="text-[#5EB8D6]">V</span>alidated{' '}
                <span className="text-[#5EB8D6]">E</span>stimation
              </div>
            </div>
          </div>
        </div>

        <Acronym />
        <ChecksStrip />
        <CaseCards />

        <div className="grid lg:grid-cols-2 gap-5">
          <ZoomChart />
          <SunFlip />
        </div>
      </div>
    </section>
  );
};
