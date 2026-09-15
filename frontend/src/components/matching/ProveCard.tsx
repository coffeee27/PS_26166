import React from 'react';
import type { EvidenceLevel, ProveCheck, ProveScore } from '../../types/matching';
import { useTranslation } from '../../i18n';
import { CheckCircle2, XCircle, BadgeCheck } from 'lucide-react';
import { formatPercent, formatPx } from '../../utils/registration';

const EVIDENCE_STYLE: Record<EvidenceLevel, { box: string; badge: string }> = {
  STRONG: { box: 'bg-[#EEF7F2] border-[#2E7D5B]/40', badge: 'bg-[#2E7D5B] text-white' },
  MODERATE: { box: 'bg-[#FFF8EC] border-[#E3A93B]/50', badge: 'bg-[#C48A24] text-white' },
  WEAK: { box: 'bg-[#FDF5F5] border-[#B94A48]/40', badge: 'bg-[#B94A48] text-white' },
};

const formatValue = (value: number | null, unit: ProveCheck['unit']) => {
  if (value === null) return '—';
  if (unit === 'px') return formatPx(value);
  if (unit === '%') return formatPercent(value);
  return value.toFixed(2);
};

export const ProveCard: React.FC<{ prove: ProveScore }> = ({ prove }) => {
  const { t } = useTranslation();
  const style = EVIDENCE_STYLE[prove.evidence];
  const checkLabel: Record<ProveCheck['id'], string> = {
    subpixel: t('proveCheckSubpixel'),
    agreement: t('proveCheckAgreement'),
    coverage: t('proveCheckCoverage'),
    evenness: t('proveCheckEvenness'),
    good_cells: t('proveCheckGoodCells'),
  };
  const evidenceLabel: Record<EvidenceLevel, string> = {
    STRONG: t('evidenceStrong'),
    MODERATE: t('evidenceModerate'),
    WEAK: t('evidenceWeak'),
  };

  return (
    <div className={`rounded-lg border p-4 font-mono space-y-3 ${style.box}`}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center space-x-3">
          <BadgeCheck className="w-8 h-8 text-[#176B87] shrink-0" />
          <div>
            <span className="text-[10px] text-[#5B6875] uppercase block">{t('proveTitle')}</span>
            <span className="text-lg font-bold text-[#17212B]">
              {prove.passed} / {prove.total} <span className="text-xs font-semibold text-[#5B6875]">{t('proveChecksPassed')}</span>
            </span>
          </div>
        </div>
        <span className={`self-start sm:self-auto text-xs font-bold px-2.5 py-1 rounded tracking-wider ${style.badge}`}>
          {t('evidence')}: {evidenceLabel[prove.evidence]}
        </span>
      </div>

      <ul className="bg-white/70 border border-[#D5DDE5] rounded divide-y divide-[#E9EEF3] text-[11px]">
        {prove.checks.map((check) => (
          <li key={check.id} className="flex items-center justify-between gap-3 px-3 py-2">
            <span className="flex items-center min-w-0">
              {check.passed ? (
                <CheckCircle2 className="w-4 h-4 mr-2 text-[#2E7D5B] shrink-0" />
              ) : (
                <XCircle className="w-4 h-4 mr-2 text-[#B94A48] shrink-0" />
              )}
              <span className="text-[#17212B]">{checkLabel[check.id] ?? check.label}</span>
            </span>
            <span className="text-right shrink-0 tabular-nums">
              <span className={`font-bold ${check.passed ? 'text-[#17212B]' : 'text-[#B94A48]'}`}>{formatValue(check.value, check.unit)}</span>
              <span className="text-[#7E8B9B]">
                {' '}
                {check.comparison === '<=' ? '≤' : '≥'} {formatValue(check.limit, check.unit)}
              </span>
            </span>
          </li>
        ))}
      </ul>

      <p className="text-[10px] text-[#5B6875]">{t('proveNote')}</p>
    </div>
  );
};
