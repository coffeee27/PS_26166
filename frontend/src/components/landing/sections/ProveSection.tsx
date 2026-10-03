import React from 'react';
import { BadgeCheck, Sun, Lock } from 'lucide-react';
import { useTranslation } from '../../../i18n';
import { LUNAR } from '../lunarImages';
import { PROVE_DATA } from '../proveData';
import { ACCENT, RED, usePauseOffscreen } from '../utils';
import { SectionHeading } from '../shared';

/*
 * PROVE: the independent layer. Every letter is either a fact that came from outside
 * the two images or the answer it produces, so nothing that reads those two images can
 * sit inside it. The engine's own five checks are the sufficiency gate in the section
 * above; the leftover map is a second opinion reported with each run, and is named here
 * only to say why it is NOT part of PROVE.
 */

/* ---- The five parts of the name ---- */
const Acronym: React.FC = () => {
  const { t } = useTranslation();
  const parts = [
    { letters: 'P', word: t('proveWordP'), desc: t('proveDescP') },
    { letters: 'R', word: t('proveWordR'), desc: t('proveDescR') },
    { letters: 'O', word: t('proveWordO'), desc: t('proveDescO') },
    { letters: 'V', word: t('proveWordV'), desc: t('proveDescV') },
    { letters: 'E', word: t('proveWordE'), desc: t('proveDescE') },
  ];
  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
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
      <p className="sm:col-span-2 lg:col-span-5 text-xs text-[#8B98A5] italic">{t('proveFullFormNote')}</p>
    </div>
  );
};

/* ---- Which independent check catches which of the three problem-statement conditions ---- */
const Conditions: React.FC = () => {
  const { t } = useTranslation();
  const rows = [
    { title: t('proveCondSunTitle'), who: t('proveCondSunWho'), desc: t('proveCondSunDesc') },
    { title: t('proveCondViewTitle'), who: t('proveCondViewWho'), desc: t('proveCondViewDesc') },
    { title: t('proveCondScaleTitle'), who: t('proveCondScaleWho'), desc: t('proveCondScaleDesc') },
  ];
  return (
    <div className="rounded-2xl border border-white/10 bg-[#0C1218] p-5 sm:p-6">
      <h3 className="text-xs font-bold font-mono uppercase tracking-wider text-white">{t('proveConditionsTitle')}</h3>
      <p className="mt-1.5 text-xs sm:text-sm text-[#8B98A5]">{t('proveConditionsDesc')}</p>
      <div className="mt-4 grid sm:grid-cols-3 gap-4">
        {rows.map((row) => (
          <article key={row.title} className="rounded-xl border border-white/10 bg-[#0A0F14] p-4">
            <div className="flex items-baseline justify-between gap-2">
              <h4 className="text-sm font-bold font-mono uppercase tracking-wide text-white">{row.title}</h4>
              <span className="shrink-0 rounded-full border border-[#5EB8D6]/40 px-2 py-0.5 text-[10px] font-mono uppercase text-[#5EB8D6]">
                {row.who}
              </span>
            </div>
            <p className="mt-2 text-xs sm:text-sm text-[#8B98A5] leading-relaxed">{row.desc}</p>
          </article>
        ))}
      </div>
    </div>
  );
};

/* ---- Evidence for the R factor: the same craters with the Sun on the other side ---- */
const SunFlip: React.FC = () => {
  const { t } = useTranslation();
  const sun = PROVE_DATA.sunFlip;
  const bars = [
    { label: `${t('proveSunSame')} (${sun.sameAzimuthDeg}°)`, value: sun.same, color: ACCENT, image: LUNAR.dtmSunWest },
    { label: `${t('proveSunOpposite')} (${sun.oppositeAzimuthDeg}°)`, value: sun.opposite, color: RED, image: LUNAR.dtmSunEast },
  ];
  return (
    <article className="rounded-2xl border border-white/10 bg-[#0C1218] p-5">
      <div className="flex items-center gap-2 text-[#5EB8D6]">
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

/* ---- The wall: what PROVE is never given ---- */
const Wall: React.FC = () => {
  const { t } = useTranslation();
  return (
    <article className="rounded-2xl border border-[#5EB8D6]/25 bg-[#5EB8D6]/[0.05] p-5">
      <div className="flex items-center gap-2 text-[#5EB8D6]">
        <Lock className="w-4 h-4" />
        <h3 className="text-xs font-bold font-mono uppercase tracking-wider">{t('proveWallTitle')}</h3>
      </div>
      <p className="mt-2 text-xs sm:text-sm text-[#C9D3DC] leading-relaxed">{t('proveWallDesc')}</p>
      <ul className="mt-4 space-y-2">
        {([t('proveWall1'), t('proveWall2'), t('proveWall3')]).map((line) => (
          <li key={line} className="flex gap-2.5 text-xs text-[#8B98A5] leading-snug">
            <span className="font-mono text-[#5EB8D6] shrink-0">✕</span>
            <span>{line}</span>
          </li>
        ))}
      </ul>
      <p className="mt-4 font-mono text-[10px] text-[#7A8794] leading-relaxed">{t('proveWallNote')}</p>
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
              {/* Spelled out in full on the cards below; kept short here so the badge fits. */}
              <div className="text-sm font-bold text-white">
                <span className="text-[#5EB8D6]">P</span>ublished, <span className="text-[#5EB8D6]">R</span>endered,{' '}
                <span className="text-[#5EB8D6]">O</span>ther mission, <span className="text-[#5EB8D6]">V</span>erdict,{' '}
                <span className="text-[#5EB8D6]">E</span>xceptions
              </div>
            </div>
          </div>
        </div>

        <Acronym />
        <Conditions />

        <div className="grid lg:grid-cols-2 gap-5">
          <Wall />
          <SunFlip />
        </div>
      </div>
    </section>
  );
};
