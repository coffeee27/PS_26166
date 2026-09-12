import React, { useRef } from 'react';
import type { ImageMetadata as ImageMetaType } from '../../types/matching';
import { ImageMetadata } from './ImageMetadata';
import { useTranslation } from '../../i18n';
import { Upload, RefreshCw, Trash2, Image as ImageIcon } from 'lucide-react';

interface ImageUploaderProps {
  title: string;
  subtitle: string;
  image: string | null;
  metadata: ImageMetaType | null;
  onImageSelected: (url: string, meta: ImageMetaType) => void;
  onImageRemoved: () => void;
  badgeLabel?: string;
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({
  title,
  subtitle,
  image,
  metadata,
  onImageSelected,
  onImageRemoved,
  badgeLabel,
}) => {
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      const meta: ImageMetaType = {
        filename: file.name.toUpperCase(),
        fileSize: (file.size / (1024 * 1024)).toFixed(1) + ' MB',
        dimensions: '4096 x 3072 px',
        format: file.type.split('/')[1]?.toUpperCase() || 'IMAGE',
        captureDate: new Date().toISOString().replace('T', ' ').substring(0, 19) + ' UTC',
        sensor: 'User Uploaded Sensor Frame',
        solarElevation: '18.4°',
      };
      onImageSelected(url, meta);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      const meta: ImageMetaType = {
        filename: file.name.toUpperCase(),
        fileSize: (file.size / (1024 * 1024)).toFixed(1) + ' MB',
        dimensions: '4096 x 3072 px',
        format: file.type.split('/')[1]?.toUpperCase() || 'IMAGE',
        captureDate: new Date().toISOString().replace('T', ' ').substring(0, 19) + ' UTC',
        sensor: 'User Drag & Drop Frame',
        solarElevation: '18.4°',
      };
      onImageSelected(url, meta);
    }
  };

  return (
    <div className="bg-white border border-[#D5DDE5] rounded-lg p-4 shadow-sm space-y-3">
      <div className="flex items-center justify-between pb-2 border-b border-[#E9EEF3]">
        <div>
          <div className="flex items-center space-x-2">
            <h3 className="text-xs font-bold font-mono text-[#17212B] uppercase tracking-wider">
              {title}
            </h3>
            {badgeLabel && (
              <span className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded bg-[#176B87]/10 text-[#176B87] border border-[#176B87]/20">
                {badgeLabel}
              </span>
            )}
          </div>
          <p className="text-[11px] text-[#5B6875] mt-0.5">{subtitle}</p>
        </div>
      </div>

      {!image ? (
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-[#C5D2E0] hover:border-[#176B87] rounded-lg p-6 text-center cursor-pointer transition-colors bg-[#F8FAFC] hover:bg-[#F0F6F9] group"
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/*"
            className="hidden"
          />
          <div className="w-10 h-10 mx-auto rounded-full bg-[#E9EEF3] group-hover:bg-[#176B87]/10 flex items-center justify-center text-[#5B6875] group-hover:text-[#176B87] transition-colors mb-2">
            <Upload className="w-5 h-5" />
          </div>
          <span className="block text-xs font-mono font-semibold text-[#17212B]">
            {t('dragDropText')}
          </span>
          <span className="block text-[11px] text-[#176B87] mt-1 font-mono hover:underline">
            {t('orBrowse')}
          </span>
          <span className="block text-[10px] text-[#7E8B9B] mt-2 font-mono">
            {t('supportsText')}
          </span>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="relative aspect-video bg-[#17212B] rounded-lg overflow-hidden border border-[#D5DDE5] group">
            <img src={image} alt={title} className="w-full h-full object-cover" />

            <div className="absolute top-2 left-2 bg-black/70 text-white font-mono text-[9px] px-2 py-0.5 rounded border border-gray-600 flex items-center space-x-1">
              <ImageIcon className="w-3 h-3 text-[#176B87]" />
              <span>ORBITAL FRAME OK</span>
            </div>

            <div className="absolute bottom-2 right-2 flex items-center space-x-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="bg-black/80 hover:bg-[#176B87] text-white text-xs font-mono px-2.5 py-1 rounded border border-gray-600 transition-colors flex items-center space-x-1 shadow"
              >
                <RefreshCw className="w-3 h-3" />
                <span>{t('replaceImage')}</span>
              </button>
              <button
                type="button"
                onClick={onImageRemoved}
                className="bg-black/80 hover:bg-[#B94A48] text-white text-xs font-mono px-2 py-1 rounded border border-gray-600 transition-colors flex items-center space-x-1 shadow"
              >
                <Trash2 className="w-3 h-3" />
                <span>{t('removeImage')}</span>
              </button>
            </div>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/*"
              className="hidden"
            />
          </div>

          {metadata && <ImageMetadata metadata={metadata} />}
        </div>
      )}
    </div>
  );
};
