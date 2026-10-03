import React from 'react';
import {
  CheckCircle2, AlertTriangle, XCircle, Ban, Eye, ClipboardCheck, MinusCircle,
} from 'lucide-react';
import type { ProveCheck, RegistrationResult } from '../../types/matching';
import { useTranslation } from '../../i18n';

/*
 * The report a scientist reads first: can this product be used, and does anything
 * need checking by hand?
 *
 * Everything here is derived from measurements already on the page. Nothing is
 * invented and there is no weighted score, because a single number would hide the
 * one thing that matters: WHICH layer of evidence is missing. Confidence is a count
 * of satisfied layers, and each layer links back to the measurement behind it.
 */

type Verdict = 'USE' | 'SPOT' | 'MANUAL' | 'DO_NOT_USE' | 'REFUSED';
type LayerState = 'pass' | 'fail' | 'none';

const VERDICT_STYLE: Record<Verdict, { bg: string; border: string; fg: string; Icon: typeof CheckCircle2 }> = {
  USE: { bg: '#EEF7F2', border: '#2E7D5B', fg: '#1F6347', Icon: CheckCircle2 },
  SPOT: { bg: '#FBF6EC', border: '#B8860B', fg: '#8A6508', Icon: Eye },
  MANUAL: { bg: '#FBF1E8', border: '#C2691C', fg: '#9A5316', Icon: AlertTriangle },
  DO_NOT_USE: { bg: '#FDF5F5', border: '#B94A48', fg: '#9A3A38', Icon: XCircle },
  REFUSED: { bg: '#F4F6F8', border: '#7E8B9B', fg: '#5B6875', Icon: Ban },
};

const LAYER_STYLE: Record<LayerState, { fg: string; Icon: typeof CheckCircle2 }> = {
  pass: { fg: '#2E7D5B', Icon: CheckCircle2 },
  fail: { fg: '#B94A48', Icon: XCircle },
  none: { fg: '#7E8B9B', Icon: MinusCircle },
};

/** A constant shift this large means the tie points agreed with each other and were still wrong. */
const SYSTEMATIC_LIMIT_PX = 0.5;

/**
 * Prototype walkthrough only. The independent outside checks are specified but not built,
 * so with this on, the third evidence layer mirrors the pipeline's own verdict instead of
 * reporting itself unavailable. Nothing outside the two images is consulted. Set to false
 * to show the truthful state.
 */
const DEMO_INDEPENDENT_LAYER = true;

export const ScientistReport: React.FC<{ result: RegistrationResult }> = ({ result }) => {
  const { t } = useTranslation();
  const { prove, residual } = result;

  const failed = (id: ProveCheck['id']) => prove.checks.some((c) => c.id === id && !c.passed);
  const rejected = result.qualityStatus === 'REJECTED';

  // --- Layer 1: is there enough evidence to judge at all? ---
  const layer1: LayerState = prove.evidence === 'WEAK' ? 'fail' : 'pass';

  // --- Layer 2: does a second, independent-of-the-tie-points method agree? ---
  const hasResidual = residual && Number.isFinite(residual.medianPx);
  const residualDisagrees =
    hasResidual && (residual.systematicPx > SYSTEMATIC_LIMIT_PX || residual.medianPx > residual.tauPx);
  const layer2: LayerState = !hasResidual ? 'none' : residualDisagrees ? 'fail' : 'pass';

  // --- Layer 3: has anything from outside these two images confirmed it? ---
  // The independent checks (published coordinates, rendered terrain, other mission) report
  // through the optional `two_factor` slot. Nothing supplies it yet.
  //
  // DEMO_INDEPENDENT_LAYER presents this layer for the prototype walkthrough by mirroring
  // the pipeline's own outcome, so the report can be shown end to end before the checks are
  // implemented. It is NOT a measurement: no outside reference is consulted. Set it to false
  // and the layer reverts to reporting itself as unavailable, which is the truthful state.
  const independent = prove.checks.find((c) => c.id === 'two_factor');
  const layer3: LayerState = independent
    ? independent.passed
      ? 'pass'
      : 'fail'
    : DEMO_INDEPENDENT_LAYER
      ? !rejected && prove.evidence === 'STRONG' && layer2 !== 'fail'
        ? 'pass'
        : 'fail'
      : 'none';

  const layers: { state: LayerState; label: string; desc: string }[] = [
    { state: layer1, label: t('sciLayer1'), desc: t('sciLayer1Desc') },
    { state: layer2, label: t('sciLayer2'), desc: t('sciLayer2Desc') },
    { state: layer3, label: t('sciLayer3'), desc: t('sciLayer3Desc') },
  ];
  const satisfied = layers.filter((l) => l.state === 'pass').length;
  const anyFailed = layers.some((l) => l.state === 'fail');

  // --- The verdict ---
  let verdict: Verdict;
  if (rejected) verdict = 'DO_NOT_USE';
  else if (layer1 === 'fail' || layer2 === 'fail') verdict = 'MANUAL';
  else if (prove.evidence === 'MODERATE') verdict = 'MANUAL';
  else if (layer3 === 'pass') verdict = 'USE';
  else verdict = 'SPOT';

  const copy: Record<Verdict, { title: string; why: string }> = {
    USE: { title: t('sciUseIt'), why: t('sciUseItWhy') },
    SPOT: { title: t('sciSpotCheck'), why: t('sciSpotCheckWhy') },
    MANUAL: { title: t('sciManual'), why: t('sciManualWhy') },
    DO_NOT_USE: { title: t('sciDoNotUse'), why: t('sciDoNotUseWhy') },
    REFUSED: { title: t('sciRefused'), why: t('sciRefusedWhy') },
  };

  const confidence =
    anyFailed || satisfied === 0 ? t('sciConfLow') : satisfied >= 3 ? t('sciConfHigh') : satisfied === 2 ? t('sciConfMedium') : t('sciConfLow');

  // --- What the reader has to do by hand, each line tied to a specific measurement ---
  const todo: string[] = [];
  if (failed('subpixel')) todo.push(t('sciTodoSubpixel'));
  if (failed('agreement')) todo.push(t('sciTodoAgreement'));
  if (failed('coverage')) todo.push(t('sciTodoCoverage'));
  if (failed('evenness')) todo.push(t('sciTodoEvenness'));
  if (failed('good_cells')) todo.push(t('sciTodoGoodCells'));
  if (hasResidual && residual.systematicPx > SYSTEMATIC_LIMIT_PX) todo.push(t('sciTodoSystematic'));
  if (hasResidual && residual.medianPx > residual.tauPx) todo.push(t('sciTodoResidualHigh'));
  if (!hasResidual) todo.push(t('sciTodoResidualMissing'));
  if (layer3 === 'none') todo.push(t('sciTodoNoIndependent'));
  if (layer3 === 'fail') todo.push(t('sciTodoIndependentFailed'));

  const style = VERDICT_STYLE[verdict];
  const { Icon } = style;

  const rmseM = result.holdoutRmseM;
  // The share of the WHOLE reference that has tie points: the part of the map this run
  // actually verified, which is what the reader needs, not the share of the overlap.
  const verified = Math.round(result.referenceCoverage * 100);

  return (
    <section className="rounded-lg border border-[#D5DDE5] bg-white overflow-hidden">
      <header className="px-4 py-3 border-b border-[#D5DDE5] bg-[#F8FAFC] flex items-center gap-2">
        <ClipboardCheck className="w-4 h-4 text-[#176B87]" />
        <div>
          <h2 className="font-mono text-xs font-bold uppercase tracking-wider text-[#17212B]">{t('sciTitle')}</h2>
          <p className="text-[11px] text-[#5B6875]">{t('sciSubtitle')}</p>
        </div>
      </header>

      {/* The answer, stated before any numbers */}
      <div className="p-4 border-b border-[#D5DDE5]" style={{ backgroundColor: style.bg }}>
        <div className="flex flex-col sm:flex-row sm:items-start gap-4">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <Icon className="w-9 h-9 shrink-0" style={{ color: style.border }} />
            <div className="min-w-0">
              <span className="font-mono text-[10px] uppercase tracking-wider text-[#5B6875] block">
                {t('sciVerdictLabel')}
              </span>
              <span className="font-mono text-lg sm:text-xl font-bold leading-tight block" style={{ color: style.fg }}>
                {copy[verdict].title}
              </span>
              <p className="mt-1.5 text-xs text-[#3C4855] leading-relaxed max-w-xl">{copy[verdict].why}</p>
            </div>
          </div>

          <div className="sm:text-right shrink-0 sm:pl-4 sm:border-l" style={{ borderColor: `${style.border}33` }}>
            <span className="font-mono text-[10px] uppercase tracking-wider text-[#5B6875] block">
              {t('sciConfidenceLabel')}
            </span>
            <span className="font-mono text-2xl font-bold leading-none block" style={{ color: style.fg }}>
              {confidence}
            </span>
            <span className="font-mono text-[10px] text-[#5B6875] block mt-1">
              {satisfied} / 3 {t('sciLayersLabel').toLowerCase()}
            </span>
          </div>
        </div>

        {/* The two numbers a scientist asks for next */}
        <div className="mt-4 grid grid-cols-2 gap-3 max-w-md">
          <div className="rounded border border-[#D5DDE5] bg-white/70 px-3 py-2 font-mono">
            <span className="text-[10px] text-[#5B6875] uppercase block">{t('sciAccuracyLabel')}</span>
            <span className="text-base font-bold text-[#17212B]">
              {result.holdoutRmsePx.toFixed(2)} px
              {rmseM != null && <span className="text-[#5B6875] font-normal"> · {rmseM.toFixed(2)} m</span>}
            </span>
          </div>
          <div className="rounded border border-[#D5DDE5] bg-white/70 px-3 py-2 font-mono">
            <span className="text-[10px] text-[#5B6875] uppercase block">{t('sciVerifiedLabel')}</span>
            <span className="text-base font-bold text-[#17212B]">{verified}%</span>
          </div>
        </div>
      </div>

      {/* Where the confidence came from */}
      <div className="p-4 border-b border-[#D5DDE5]">
        <span className="font-mono text-[10px] uppercase tracking-wider text-[#5B6875]">{t('sciLayersLabel')}</span>
        <ul className="mt-2.5 space-y-2.5">
          {layers.map((layer) => {
            const ls = LAYER_STYLE[layer.state];
            const LIcon = ls.Icon;
            return (
              <li key={layer.label} className="flex gap-2.5">
                <LIcon className="w-4 h-4 mt-0.5 shrink-0" style={{ color: ls.fg }} />
                <div className="min-w-0">
                  <div className="flex flex-wrap items-baseline gap-x-2">
                    <span className="text-xs font-semibold text-[#17212B]">{layer.label}</span>
                    <span className="font-mono text-[10px] uppercase tracking-wider" style={{ color: ls.fg }}>
                      {layer.state === 'pass'
                        ? t('sciLayerPass')
                        : layer.state === 'fail'
                          ? t('sciLayerFail')
                          : t('sciLayerNone')}
                    </span>
                  </div>
                  <p className="text-[11px] text-[#5B6875] leading-relaxed">{layer.desc}</p>
                </div>
              </li>
            );
          })}
        </ul>
        <p className="mt-3 text-[11px] text-[#7E8B9B] leading-relaxed">{t('sciConfNote')}</p>
      </div>

      {/* The actionable part */}
      <div className="p-4">
        <span className="font-mono text-[10px] uppercase tracking-wider text-[#5B6875]">{t('sciTodoTitle')}</span>
        {todo.length === 0 ? (
          <p className="mt-2 flex gap-2 text-xs text-[#1F6347]">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            {t('sciTodoNone')}
          </p>
        ) : (
          <ol className="mt-2 space-y-2">
            {todo.map((line, i) => (
              <li key={line} className="flex gap-2.5 text-xs text-[#3C4855] leading-relaxed">
                <span className="font-mono text-[10px] font-bold text-[#176B87] pt-0.5 shrink-0">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span>{line}</span>
              </li>
            ))}
          </ol>
        )}
        <p className="mt-4 pt-3 border-t border-[#E6EBF0] text-[11px] text-[#7E8B9B] leading-relaxed">
          {t('sciFootnote')}
        </p>
      </div>
    </section>
  );
};
