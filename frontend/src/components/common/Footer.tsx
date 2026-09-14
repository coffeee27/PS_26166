import React from 'react';

export const Footer: React.FC = () => {
  return (
    <footer className="mt-12 py-4 border-t border-[#D5DDE5] text-center font-mono text-xs text-[#5B6875] flex flex-col sm:flex-row items-center justify-between gap-2">
      <div>
        <span className="font-bold text-[#17212B]">PS-166</span> — Lunar Image Registration Platform
      </div>
      <div className="flex items-center space-x-4 text-[11px]">
        <span className="text-[#176B87]">Lunar Remote Sensing Workstation</span>
        <span>•</span>
        <span>Engine: OpenCV · NumPy · FastAPI</span>
      </div>
    </footer>
  );
};
