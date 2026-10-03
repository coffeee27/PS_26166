import React from 'react';
import { CheckCircle2, XCircle, Ban, Filter } from 'lucide-react';
import { useTranslation } from '../../../i18n';
import { PROVE_DATA } from '../proveData';
import { ACCENT, AMBER, RED, useInViewOnce, usePauseOffscreen } from '../utils';
import { SectionHeading } from '../shared';

/*
 * The sufficiency gate: the five checks the engine computes from its own tie points.
 * They decide whether a run carries enough evidence to be worth judging. They cannot
 * decide whether it is correct, because a matcher that fails the same way everywhere
 * passes all five. That question belongs to PROVE, in the next section.
 */

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

const useCheckLabels = () => {
  const { t } = useTranslation();
  return {
    subpixel: t('proveCheckSubpixel'),
    agreement: t('proveCheckAgreement'),
    coverage: t('proveCheckCoverage'),
    evenness: t('proveCheckEvenness'),
    good_cells: t('proveCheckGoodCells'),
  } as Record<CheckId, string>;
};

/* ---- The five checks and their limits ---- */
const ChecksStrip: React.FC = () => {
  const { t } = useTranslation();
  const reference = PROVE_DATA.samples.find((s) => 'checks' in s);
  const checks = reference && 'checks' in reference ? reference.checks : [];
  const label = useCheckLabels();
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
        <h3 className="text-xs font-bold font-mono uppercase tracking-wider text-white">{t('suffChecksTitle')}</h3>
        <span className="font-mono text-[10px] text-[#7A8794]">{t('suffLevels')}</span>
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
      {/* Said here rather than left for a judge to point out: these five are not proof. */}
      <p className="mt-4 rounded-xl border border-[#E3A93B]/30 bg-[#E3A93B]/[0.05] p-3.5 text-xs sm:text-sm text-[#C9D3DC] leading-relaxed">
        {t('suffNote')}
      </p>
      <div className="mt-4 rounded-xl border border-[#5EB8D6]/25 bg-[#5EB8D6]/[0.05] p-4">
        <h4 className="text-xs font-bold font-mono uppercase tracking-wider text-white">{t('proveFloorTitle')}</h4>
        <p className="mt-1.5 text-xs sm:text-sm text-[#8B98A5] leading-relaxed">{t('proveFloorDesc')}</p>
        <p className="mt-2 text-xs sm:text-sm text-[#CBD9E3] leading-relaxed">{t('proveFloorStat')}</p>
      </div>
    </div>
  );
};

/* ---- What the five checks said on each demo pair ---- */
const CaseCards: React.FC = () => {
  const { t } = useTranslation();
  const [ref, seen] = useInViewOnce<HTMLDivElement>(0.2);
  const checkLabel = useCheckLabels();
  const name: Record<string, string> = {
    'vikram-landing-site': t('proveCaseVikram'),
    'photo-vs-height-render': t('proveCaseHeight'),
    'zoom-gap-5m': t('proveCaseZoom'),
    'sun-angle': t('proveCaseSun'),
    'viewpoint-tilt': t('proveCaseViewpoint'),
    'half-overlap': t('proveCaseHalf'),
    'different-spots': t('proveCaseSpots'),
  };
  const story: Record<string, string> = {
    'vikram-landing-site': t('proveStoryVikram'),
    'photo-vs-height-render': t('proveStoryHeight'),
    'zoom-gap-5m': t('proveStoryZoom'),
    'sun-angle': t('proveStorySun'),
    'viewpoint-tilt': t('proveStoryViewpoint'),
    'half-overlap': t('proveStoryHalf'),
    'different-spots': t('proveStorySpots'),
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

export const SufficiencySection: React.FC = () => {
  const { t } = useTranslation();
  const ref = usePauseOffscreen<HTMLElement>();

  return (
    <section ref={ref} id="sufficiency" className="scroll-mt-16 border-t border-white/10 bg-black">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-28 space-y-8">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
          <SectionHeading badge={t('suffBadge')} title={t('suffTitle')} desc={t('suffDesc')} />
          <div className="shrink-0 flex items-center gap-3 rounded-2xl border border-[#E3A93B]/35 bg-[#E3A93B]/[0.06] px-4 py-3">
            <Filter className="w-6 h-6 text-[#E3A93B]" />
            <div className="font-mono text-[10px] font-bold uppercase tracking-wider text-[#E3A93B]">
              {t('suffGateLabel')}
            </div>
          </div>
        </div>

        <ChecksStrip />
        <CaseCards />
        <div className="grid lg:grid-cols-2 gap-5">
          <ZoomChart />
        </div>
      </div>
    </section>
  );
};
