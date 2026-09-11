import React from 'react';

interface StatusIndicatorProps {
  status?: 'online' | 'processing' | 'warning' | 'error';
  label: string;
}

export const StatusIndicator: React.FC<StatusIndicatorProps> = ({ status = 'online', label }) => {
  const getDotColor = () => {
    switch (status) {
      case 'online':
        return 'bg-[#2E7D5B] shadow-[0_0_8px_rgba(46,125,91,0.5)]';
      case 'processing':
        return 'bg-[#176B87] animate-pulse';
      case 'warning':
        return 'bg-[#C48A24]';
      case 'error':
        return 'bg-[#B94A48]';
      default:
        return 'bg-[#2E7D5B]';
    }
  };

  return (
    <div className="flex items-center space-x-2 text-xs font-mono">
      <span className={`inline-block w-2 h-2 rounded-full ${getDotColor()}`} />
      <span className="font-semibold tracking-wider text-[#17212B] uppercase">{label}</span>
    </div>
  );
};
