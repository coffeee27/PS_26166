import React from 'react';
import type { ImageMetadata as ImageMetaType } from '../../types/matching';
import { useTranslation } from '../../i18n';
import { HardDrive, Maximize2, Radio } from 'lucide-react';

interface ImageMetadataProps {
  metadata: ImageMetaType;
}

export const ImageMetadata: React.FC<ImageMetadataProps> = ({ metadata }) => {
  const { t } = useTranslation();

  return (
    <div className="bg-[#F8FAFC] border border-[#D5DDE5] rounded p-3 text-xs font-mono space-y-2">
      <div className="flex items-center justify-between pb-1.5 border-b border-[#E2E8F0] font-bold text-[#17212B]">
        <span className="truncate max-w-[260px]" title={metadata.filename}>
          {metadata.filename}
        </span>
        <span className="text-[10px] bg-[#176B87]/10 text-[#176B87] px-1.5 py-0.5 rounded font-semibold uppercase">
          {metadata.format}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-[11px] text-[#5B6875]">
        <div className="flex items-center justify-between">
          <span className="flex items-center">
            <Maximize2 className="w-3 h-3 mr-1 text-[#176B87]" />
            {t('dimensions')}:
          </span>
          <span className="font-semibold text-[#17212B]">{metadata.dimensions}</span>
        </div>

        <div className="flex items-center justify-between">
          <span className="flex items-center">
            <HardDrive className="w-3 h-3 mr-1 text-[#176B87]" />
            {t('fileSize')}:
          </span>
          <span className="font-semibold text-[#17212B]">{metadata.fileSize}</span>
        </div>

        {metadata.sensor && (
          <div className="flex items-start justify-between gap-3 col-span-2">
            <span className="flex items-center shrink-0">
              <Radio className="w-3 h-3 mr-1 text-[#176B87]" />
              {t('sensor')}:
            </span>
            <span className="font-semibold text-[#17212B] text-right">{metadata.sensor}</span>
          </div>
        )}
      </div>
    </div>
  );
};
