import React from 'react';
import type { ReactNode } from 'react';
import { NavLink } from 'react-router-dom';

interface SidebarNavItemProps {
  to: string;
  label: string;
  icon: ReactNode;
  badge?: string;
  onClick?: () => void;
}

export const SidebarNavItem: React.FC<SidebarNavItemProps> = ({
  to,
  label,
  icon,
  badge,
  onClick,
}) => {
  return (
    <NavLink
      to={to}
      onClick={onClick}
      className={({ isActive }) =>
        `flex items-center justify-between px-3.5 py-2.5 my-0.5 text-xs font-mono transition-colors border-l-4 ${
          isActive
            ? 'bg-[#DCE7F0] border-[#176B87] text-[#17212B] font-semibold'
            : 'border-transparent text-[#5B6875] hover:bg-[#E2E9F0] hover:text-[#17212B]'
        }`
      }
    >
      <div className="flex items-center space-x-3">
        <span className="w-4 h-4 flex items-center justify-center text-[#176B87]">
          {icon}
        </span>
        <span className="tracking-wide">{label}</span>
      </div>
      {badge && (
        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#176B87] text-white font-bold">
          {badge}
        </span>
      )}
    </NavLink>
  );
};
