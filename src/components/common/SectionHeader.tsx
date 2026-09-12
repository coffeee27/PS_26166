import React from 'react';
import type { ReactNode } from 'react';

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  badge?: string;
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({
  title,
  subtitle,
  action,
  badge,
}) => {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 mb-6 border-b border-[#D5DDE5]">
      <div>
        <div className="flex items-center space-x-2">
          <h1 className="text-xl font-bold font-mono tracking-tight text-[#17212B] uppercase">
            {title}
          </h1>
          {badge && (
            <span className="text-[10px] font-mono px-2 py-0.5 rounded font-semibold bg-[#176B87]/10 text-[#176B87] border border-[#176B87]/20 uppercase">
              {badge}
            </span>
          )}
        </div>
        {subtitle && (
          <p className="text-xs text-[#5B6875] mt-1 max-w-3xl leading-relaxed">
            {subtitle}
          </p>
        )}
      </div>
      {action && <div className="mt-3 sm:mt-0">{action}</div>}
    </div>
  );
};
