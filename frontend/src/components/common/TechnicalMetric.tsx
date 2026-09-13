import React from 'react';
import type { ReactNode } from 'react';

interface TechnicalMetricProps {
  label: string;
  value: string | number;
  subvalue?: string;
  icon?: ReactNode;
  variant?: 'default' | 'accent' | 'success' | 'warning' | 'error';
  badge?: string;
}

export const TechnicalMetric: React.FC<TechnicalMetricProps> = ({
  label,
  value,
  subvalue,
  icon,
  variant = 'default',
  badge,
}) => {
  const getVariantStyles = () => {
    switch (variant) {
      case 'accent':
        return 'border-[#176B87]/30 bg-[#F0F6F9]';
      case 'success':
        return 'border-[#2E7D5B]/30 bg-[#EEF7F2]';
      case 'warning':
        return 'border-[#C48A24]/30 bg-[#FFFDF5]';
      case 'error':
        return 'border-[#B94A48]/30 bg-[#FDF5F5]';
      default:
        return 'border-[#D5DDE5] bg-white';
    }
  };

  const getValueColor = () => {
    switch (variant) {
      case 'accent':
        return 'text-[#176B87]';
      case 'success':
        return 'text-[#2E7D5B]';
      case 'warning':
        return 'text-[#C48A24]';
      case 'error':
        return 'text-[#B94A48]';
      default:
        return 'text-[#17212B]';
    }
  };

  return (
    <div className={`p-4 rounded-lg border ${getVariantStyles()} transition-all shadow-sm`}>
      <div className="flex items-center justify-between mb-1">
        <span className="text-[11px] font-mono uppercase tracking-wider text-[#5B6875] font-semibold">
          {label}
        </span>
        {icon && <span className="text-[#5B6875]">{icon}</span>}
      </div>
      <div className="flex items-baseline space-x-2">
        <span className={`text-2xl font-bold font-mono tracking-tight ${getValueColor()}`}>
          {value}
        </span>
        {badge && (
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded uppercase font-semibold bg-[#E9EEF3] text-[#176B87] border border-[#D5DDE5]">
            {badge}
          </span>
        )}
      </div>
      {subvalue && (
        <div className="text-xs text-[#5B6875] mt-1 font-mono">{subvalue}</div>
      )}
    </div>
  );
};
