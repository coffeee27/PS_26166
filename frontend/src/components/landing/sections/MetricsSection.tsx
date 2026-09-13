import React from 'react';
import { useTranslation } from '../../../i18n';
import { ACCENT, AMBER, RED, hash, usePauseOffscreen } from '../utils';
import { SectionHeading } from '../shared';

/* Four instruments, one per evaluation metric. None of them show a measured value. */

const RmseGauge: React.FC = () => (
  <svg viewBox="0 0 200 200" className="w-full h-full" aria-hidden="true">
    {[88, 66, 44, 22].map((r, i) => (
      <circle key={r} cx="100" cy="100" r={r} fill="none" stroke={i === 3 ? ACCENT : '#fff'} strokeOpacity={i === 3 ? 0.9 : 0.12} strokeWidth={i === 3 ? 1.5 : 1} />
    ))}
    <line x1="100" y1="6" x2="100" y2="194" stroke="#fff" strokeOpacity="0.1" />
    <line x1="6" y1="100" x2="194" y2="100" stroke="#fff" strokeOpacity="0.1" />
    {Array.from({ length: 12 }, (_, i) => {
      const angle = hash(i) * Math.PI * 2;
      const dist = 40 + hash(i + 20) * 45;
      const settle = hash(i + 40) * 14;
      const sa = hash(i + 60) * Math.PI * 2;
      return (
        <circle
          key={i}
          cx={100 + Math.cos(sa) * settle}
          cy={100 + Math.sin(sa) * settle}
          r="3.2"
          fill={AMBER}
          className="lp-converge"
          style={
            {
              '--dx': `${(Math.cos(angle) * dist).toFixed(1)}px`,
              '--dy': `${(Math.sin(angle) * dist).toFixed(1)}px`,
              animationDelay: `${(i * 0.08).toFixed(2)}s`,
            } as React.CSSProperties
          }
        />
      );
    })}
    <circle cx="100" cy="100" r="3" fill="#fff" />
  </svg>
);

const InlierField: React.FC = () => (
  <svg viewBox="0 0 200 200" className="w-full h-full" aria-hidden="true">
    {Array.from({ length: 80 }, (_, i) => {
      const outlier = hash(i + 5) > 0.8;
      const x = 20 + (i % 10) * 18 + (hash(i + 30) - 0.5) * 6;
      const y = 30 + Math.floor(i / 10) * 20 + (hash(i + 50) - 0.5) * 6;
      return (
        <circle
          key={i}
          cx={x}
          cy={y}
          r={outlier ? 3.4 : 3}
          fill={outlier ? RED : ACCENT}
          className={outlier ? 'lp-reject' : undefined}
          style={outlier ? { animationDelay: `${(hash(i) * 2).toFixed(2)}s` } : { opacity: 0.85 }}
        />
      );
    })}
  </svg>
);

const RatioGauge: React.FC = () => {
  const r = 70;
  const len = 2 * Math.PI * r;
  return (
    <svg viewBox="0 0 200 200" className="w-full h-full" aria-hidden="true">
      <defs>
        <linearGradient id="ratio-arc" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stopColor={ACCENT} />
          <stop offset="100%" stopColor={AMBER} />
        </linearGradient>
      </defs>
      <circle cx="100" cy="100" r={r} fill="none" stroke="#fff" strokeOpacity="0.08" strokeWidth="16" />
      <circle
        cx="100"
        cy="100"
        r={r}
        fill="none"
        stroke="url(#ratio-arc)"
        strokeWidth="16"
        strokeLinecap="round"
        strokeDasharray={len}
        transform="rotate(-90 100 100)"
        className="lp-sweep"
        style={{ '--len': `${len}`, '--to': '0' } as React.CSSProperties}
      />
      {Array.from({ length: 24 }, (_, i) => {
        const a = (i / 24) * Math.PI * 2;
        return (
          <line
            key={i}
            x1={100 + Math.cos(a) * 88}
            y1={100 + Math.sin(a) * 88}
            x2={100 + Math.cos(a) * 94}
            y2={100 + Math.sin(a) * 94}
            stroke="#fff"
            strokeOpacity="0.25"
          />
        );
      })}
      <text x="100" y="98" textAnchor="middle" className="font-mono" fontSize="12" fontWeight="700" fill="#E6EDF3">INLIERS</text>
      <text x="100" y="114" textAnchor="middle" className="font-mono" fontSize="9" fill="#7A8794">÷ CANDIDATES</text>
    </svg>
  );
};

const CoverageGrid: React.FC = () => {
  const cols = 8;
  const rows = 6;
  const order = Array.from({ length: cols * rows }, (_, i) => i).sort((a, b) => hash(a + 9) - hash(b + 9));
  const rank = new Map(order.map((cell, i) => [cell, i]));
  return (
    <svg viewBox="0 0 200 200" className="w-full h-full" aria-hidden="true">
      {Array.from({ length: cols * rows }, (_, i) => {
        const x = 16 + (i % cols) * 21.5;
        const y = 34 + Math.floor(i / cols) * 22;
        return (
          <g key={i}>
            <rect x={x} y={y} width="18" height="18" rx="3" fill="#fff" fillOpacity="0.05" />
            <rect
              x={x}
              y={y}
              width="18"
              height="18"
              rx="3"
              fill={ACCENT}
              fillOpacity="0.75"
              className="lp-pop"
              style={{ animationDelay: `${((rank.get(i) ?? 0) * 0.07).toFixed(2)}s` }}
            />
            <circle cx={x + 9} cy={y + 9} r="2" fill="#fff" className="lp-pop" style={{ animationDelay: `${((rank.get(i) ?? 0) * 0.07 + 0.1).toFixed(2)}s` }} />
          </g>
        );
      })}
    </svg>
  );
};

export const MetricsSection: React.FC = () => {
  const { t } = useTranslation();
  const ref = usePauseOffscreen<HTMLElement>();

  const metrics = [
    { label: t('metricRmseLabel'), desc: t('metricRmseDesc'), Visual: RmseGauge, note: t('metricTargetNote') },
    { label: t('metricInlierLabel'), desc: t('metricInlierDesc'), Visual: InlierField, note: null },
    { label: t('metricRatioLabel'), desc: t('metricRatioDesc'), Visual: RatioGauge, note: null },
    { label: t('metricDistLabel'), desc: t('metricDistDesc'), Visual: CoverageGrid, note: null },
  ];

  return (
    <section ref={ref} className="border-t border-white/10 bg-black">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-28">
        <SectionHeading badge={t('landingMetricsTitle')} title={t('secMetricsTitle')} desc={t('landingMetricsDesc')} />

        <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {metrics.map(({ label, desc, Visual, note }) => (
            <article
              key={label}
              className="relative rounded-2xl border border-white/10 bg-gradient-to-b from-[#0C1218] to-[#070B0F] p-5 hover:border-[#5EB8D6]/40 transition-colors"
            >
              <div className="aspect-square max-w-[220px] mx-auto">
                <Visual />
              </div>
              <div className="mt-4 flex items-center justify-between gap-2">
                <h3 className="text-sm font-bold font-mono uppercase tracking-wide text-white">{label}</h3>
                {note && (
                  <span className="shrink-0 text-[9px] font-mono font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-[#E3A93B]/15 text-[#E3A93B]">
                    {note}
                  </span>
                )}
              </div>
              <p className="mt-1.5 text-xs text-[#8B98A5] leading-relaxed">{desc}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
};
