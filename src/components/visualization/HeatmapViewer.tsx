import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from '../../i18n';
import { Activity, Crosshair } from 'lucide-react';

interface HeatmapViewerProps {
  referenceImage: string;
  queryImage: string;
  confidence: number;
}

export const HeatmapViewer: React.FC<HeatmapViewerProps> = ({
  referenceImage,
  queryImage,
  confidence,
}) => {
  const { t } = useTranslation();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hoverPos, setHoverPos] = useState<{ x: number; y: number; val: number } | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    ctx.fillStyle = '#17212B';
    ctx.fillRect(0, 0, width, height);

    const rows = 20;
    const cols = 28;
    const cellW = width / cols;
    const cellH = height / rows;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const distFromCenter = Math.sqrt(Math.pow((r - 10) / 10, 2) + Math.pow((c - 14) / 14, 2));
        let val = Math.max(0, 1 - distFromCenter * 0.7);
        val = Math.min(1, Math.max(0, val + (Math.sin(r * 3 + c * 5) * 0.15)));

        let color = 'rgba(196, 208, 220, 0.25)';
        if (val > 0.8) {
          color = 'rgba(23, 107, 135, 0.9)';
        } else if (val > 0.6) {
          color = 'rgba(227, 169, 59, 0.85)';
        } else if (val > 0.35) {
          color = 'rgba(59, 130, 160, 0.65)';
        }

        ctx.fillStyle = color;
        ctx.fillRect(c * cellW, r * cellH, cellW - 1, cellH - 1);
      }
    }

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(width * 0.45, height * 0.48, width * 0.25, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(width * 0.45, height * 0.48, width * 0.14, 0, Math.PI * 2);
    ctx.stroke();
  }, [confidence]);

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = Math.floor(e.clientX - rect.left);
    const y = Math.floor(e.clientY - rect.top);
    const normalizedVal = Math.min(99.9, Math.max(12.0, (1 - (Math.abs(x - 250) + Math.abs(y - 180)) / 400) * 100)).toFixed(1);
    setHoverPos({ x, y, val: parseFloat(normalizedVal) });
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border border-[#D5DDE5] rounded-lg p-3 shadow-sm">
          <div className="flex items-center justify-between pb-2 border-b border-[#E9EEF3] mb-2 font-mono text-xs">
            <span className="font-bold text-[#17212B] uppercase">{t('referenceImageTitle')}</span>
            <span className="text-[10px] text-[#5B6875] bg-[#E9EEF3] px-1.5 py-0.5 rounded">REF-01</span>
          </div>
          <div className="relative aspect-video bg-[#17212B] rounded overflow-hidden border border-[#D5DDE5]">
            <img src={referenceImage} alt="Reference Lunar Surface" className="w-full h-full object-cover" />
            <div className="absolute top-2 left-2 text-[9px] font-mono text-white bg-black/60 px-1.5 py-0.5 rounded">
              CAM-A (LRO-NAC)
            </div>
          </div>
        </div>

        <div className="bg-white border border-[#D5DDE5] rounded-lg p-3 shadow-sm">
          <div className="flex items-center justify-between pb-2 border-b border-[#E9EEF3] mb-2 font-mono text-xs">
            <span className="font-bold text-[#17212B] uppercase">{t('queryImageTitle')}</span>
            <span className="text-[10px] text-[#176B87] bg-[#176B87]/10 px-1.5 py-0.5 rounded">QRY-02</span>
          </div>
          <div className="relative aspect-video bg-[#17212B] rounded overflow-hidden border border-[#D5DDE5]">
            <img src={queryImage} alt="Query Lunar Surface" className="w-full h-full object-cover" />
            <div className="absolute top-2 left-2 text-[9px] font-mono text-white bg-black/60 px-1.5 py-0.5 rounded">
              CAM-B (OHRC)
            </div>
          </div>
        </div>

        <div className="bg-white border border-[#D5DDE5] rounded-lg p-3 shadow-sm">
          <div className="flex items-center justify-between pb-2 border-b border-[#E9EEF3] mb-2 font-mono text-xs">
            <span className="font-bold text-[#176B87] uppercase flex items-center">
              <Activity className="w-3.5 h-3.5 mr-1 text-[#176B87]" />
              SIMILARITY HEATMAP
            </span>
            <span className="text-[10px] font-bold text-[#2E7D5B] bg-[#EEF7F2] px-1.5 py-0.5 rounded">
              {confidence}% MATCH
            </span>
          </div>
          <div className="relative aspect-video bg-[#17212B] rounded overflow-hidden border border-[#D5DDE5]">
            <canvas
              ref={canvasRef}
              width={500}
              height={360}
              onMouseMove={handleMouseMove}
              onMouseLeave={() => setHoverPos(null)}
              className="w-full h-full cursor-crosshair object-cover"
            />
            {hoverPos && (
              <div className="absolute bottom-2 left-2 bg-black/85 text-white font-mono text-[10px] p-1.5 rounded border border-[#176B87] flex items-center space-x-2">
                <Crosshair className="w-3 h-3 text-[#E3A93B]" />
                <span>X: {hoverPos.x} Y: {hoverPos.y}</span>
                <span className="text-[#E3A93B]">Score: {hoverPos.val}%</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white border border-[#D5DDE5] rounded-lg p-4 shadow-sm">
        <div className="flex items-center justify-between mb-3 font-mono text-xs">
          <span className="font-bold text-[#17212B] uppercase tracking-wider">
            {t('similarityScale')}
          </span>
          <span className="text-[#5B6875] text-[11px]">
            {t('lowSimilarity')} ──────────────── {t('highSimilarity')}
          </span>
        </div>

        <div className="h-4 rounded overflow-hidden flex shadow-inner border border-[#D5DDE5]">
          <div className="flex-1 bg-[#C4D0DC]" title={t('legendPaleBlue')} />
          <div className="flex-1 bg-[#3B82A0]" title={t('legendMutedTeal')} />
          <div className="flex-1 bg-[#E3A93B]" title={t('legendAmberGold')} />
          <div className="flex-1 bg-[#176B87]" title={t('legendDeepTeal')} />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3 text-xs font-mono">
          <div className="flex items-center space-x-2">
            <span className="w-3 h-3 rounded-sm bg-[#C4D0DC] border border-gray-400" />
            <span className="text-[#5B6875]">{t('legendPaleBlue')}</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="w-3 h-3 rounded-sm bg-[#3B82A0]" />
            <span className="text-[#5B6875]">{t('legendMutedTeal')}</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="w-3 h-3 rounded-sm bg-[#E3A93B]" />
            <span className="text-[#5B6875]">{t('legendAmberGold')}</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="w-3 h-3 rounded-sm bg-[#176B87]" />
            <span className="text-[#5B6875]">{t('legendDeepTeal')}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
