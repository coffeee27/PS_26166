import React from 'react';
import { FileText, Shuffle, CheckCircle2, FlaskConical, Layers, Crosshair } from 'lucide-react';
import { useTranslation } from '../../../i18n';
import { REAL } from '../realData';
import { ACCENT, useInViewOnce, usePauseOffscreen } from '../utils';
import { SectionHeading } from '../shared';

/*
 * Prior work and the gap we target. The two studies below are published results by
 * other teams, labelled as such; the only numbers of ours on this screen are the
 * measured baseline and hold-out error from realData.ts.
 */

const StudyCard: React.FC<{
  tag: string;
  title: string;
  note: string;
  p1: string;
  p2: string;
}> = ({ tag, title, note, p1, p2 }) => (
  <article className="flex flex-col rounded-2xl border border-white/10 bg-[#0C1218] p-5 sm:p-6">
    <div className="flex items-center gap-2 text-[#5EB8D6]">
      <FileText className="w-4 h-4 shrink-0" />
      <span className="font-mono text-[10px] font-bold uppercase tracking-wider">{tag}</span>
    </div>
    <h3 className="mt-3 text-sm sm:text-base font-bold text-white leading-snug">{title}</h3>
    <p className="mt-1.5 font-mono text-[10px] text-[#7A8794] leading-relaxed">{note}</p>
    <p className="mt-4 text-xs sm:text-sm text-[#C9D3DC] leading-relaxed">{p1}</p>
    <p className="mt-2.5 text-xs sm:text-sm text-[#8B98A5] leading-relaxed">{p2}</p>
  </article>
);

/** The three-column gap table: what is asked, what exists, what we do. */
const GapTable: React.FC = () => {
  const { t } = useTranslation();
  const [ref, seen] = useInViewOnce<HTMLDivElement>(0.15);
  const rows = [
    { a: t('priorGap1A'), b: t('priorGap1B'), c: t('priorGap1C') },
    { a: t('priorGap2A'), b: t('priorGap2B'), c: t('priorGap2C') },
    { a: t('priorGap3A'), b: t('priorGap3B'), c: t('priorGap3C') },
    { a: t('priorGap4A'), b: t('priorGap4B'), c: t('priorGap4C') },
  ];

  return (
    <div ref={ref} className="rounded-2xl border border-white/10 bg-[#0C1218] overflow-hidden">
      <h3 className="px-5 sm:px-6 pt-5 text-xs font-bold font-mono uppercase tracking-wider text-white">
        {t('priorGapTitle')}
      </h3>

      {/* Column headers, hidden on narrow screens where each row stacks */}
      <div className="hidden md:grid grid-cols-[1fr_1fr_1.4fr] gap-4 px-5 sm:px-6 pt-4 pb-2 border-b border-white/10">
        {[t('priorGapCol1'), t('priorGapCol2'), t('priorGapCol3')].map((h, i) => (
          <span
            key={h}
            className={`font-mono text-[10px] font-bold uppercase tracking-wider ${i === 2 ? 'text-[#5EB8D6]' : 'text-[#7A8794]'}`}
          >
            {h}
          </span>
        ))}
      </div>

      <div className="divide-y divide-white/10">
        {rows.map((row, i) => (
          <div
            key={row.a}
            className={`grid md:grid-cols-[1fr_1fr_1.4fr] gap-2 md:gap-4 px-5 sm:px-6 py-4 transition-all duration-500 ${
              seen ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
            }`}
            style={{ transitionDelay: `${i * 110}ms` }}
          >
            <span className="text-xs sm:text-sm font-semibold text-white leading-snug">{row.a}</span>
            <span className="text-xs sm:text-sm text-[#7A8794] leading-snug">
              <span className="md:hidden font-mono text-[10px] uppercase tracking-wider text-[#5F6D7A]">
                {t('priorGapCol2')}:{' '}
              </span>
              {row.b}
            </span>
            <span className="flex gap-2 text-xs sm:text-sm text-[#C9D3DC] leading-snug">
              <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 shrink-0 text-[#3FB57F]" />
              <span>{row.c}</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

/** Baseline versus engine, both measured by us on the same pair. */
const BaselineBar: React.FC = () => {
  const m = REAL.metrics;
  const max = Math.max(m.baselineRmsePx, m.holdoutRmsePx);
  const bars = [
    { label: 'SIFT + RANSAC', value: m.baselineRmsePx, points: m.baselineInliers, colour: '#7A8794' },
    { label: 'This engine', value: m.holdoutRmsePx, points: m.tiePoints, colour: ACCENT },
  ];
  return (
    <div className="mt-5 space-y-3">
      {bars.map((bar) => (
        <div key={bar.label}>
          <div className="flex justify-between font-mono text-[10px]">
            <span className="text-[#8B98A5]">{bar.label}</span>
            <span className="font-bold tabular-nums" style={{ color: bar.colour }}>
              {bar.value.toFixed(2)} px · {bar.points.toLocaleString('en-US')} pts
            </span>
          </div>
          <div className="mt-1.5 h-2.5 rounded bg-white/5 overflow-hidden">
            <span
              className="block h-full rounded transition-[width] duration-1000"
              style={{ width: `${(bar.value / max) * 100}%`, backgroundColor: bar.colour }}
            />
          </div>
        </div>
      ))}
    </div>
  );
};

export const PriorWorkSection: React.FC = () => {
  const { t } = useTranslation();
  const ref = usePauseOffscreen<HTMLElement>();

  const trust = [
    { icon: FlaskConical, value: '41', label: t('trustTests'), desc: t('trustTestsDesc') },
    { icon: Layers, value: '7', label: t('trustPairs'), desc: t('trustPairsDesc') },
    { icon: Shuffle, value: '6', label: t('trustModels'), desc: t('trustModelsDesc') },
    { icon: Crosshair, value: '0.044', label: t('trustRefine'), desc: t('trustRefineDesc') },
  ];

  return (
    <section ref={ref} id="prior-work" className="scroll-mt-16 border-t border-white/10 bg-black">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-28 space-y-8">
        <SectionHeading badge={t('priorBadge')} title={t('priorTitle')} desc={t('priorDesc')} />

        <div className="grid lg:grid-cols-2 gap-5">
          <StudyCard
            tag={t('priorStudy1Tag')}
            title={t('priorStudy1Title')}
            note={t('priorStudy1Note')}
            p1={t('priorStudy1P1')}
            p2={t('priorStudy1P2')}
          />
          <StudyCard
            tag={t('priorStudy2Tag')}
            title={t('priorStudy2Title')}
            note={t('priorStudy2Note')}
            p1={t('priorStudy2P1')}
            p2={t('priorStudy2P2')}
          />
        </div>

        <GapTable />

        {/* The one comparison on this screen that is ours, measured on our own pair */}
        <div className="rounded-2xl border border-[#5EB8D6]/25 bg-[#5EB8D6]/[0.05] p-5 sm:p-6">
          <p className="text-xs sm:text-sm text-[#C9D3DC] leading-relaxed">{t('priorHonestNote')}</p>
          <BaselineBar />
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {trust.map(({ icon: Icon, value, label, desc }) => (
            <article key={label} className="rounded-2xl border border-white/10 bg-[#0C1218] p-5">
              <Icon className="w-4 h-4 text-[#5EB8D6]" />
              <div className="mt-3 font-mono text-3xl font-bold tabular-nums leading-none text-white">{value}</div>
              <div className="mt-1.5 font-mono text-[10px] font-bold uppercase tracking-wider text-[#5EB8D6]">{label}</div>
              <p className="mt-2 text-xs text-[#8B98A5] leading-relaxed">{desc}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
};
