import React, { useState } from 'react';
import { api } from '../../../api/client';
import { ImageIcon } from 'lucide-react';

interface StorefrontImageProps extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'src'> {
  src?: string | null;
  alt?: string;
  fallbackIcon?: React.ReactNode;
  aspectRatio?: 'square' | 'portrait' | 'wide' | 'banner' | 'auto';
  objectFit?: 'cover' | 'contain' | 'fill';
  containerClassName?: string;
}

export const StorefrontImage: React.FC<StorefrontImageProps> = ({
  src,
  alt = 'Image',
  aspectRatio = 'auto',
  objectFit = 'cover',
  containerClassName = '',
  className = '',
  ...rest
}) => {
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const resolvedUrl = src ? api.getMediaUrl(src) : '';

  const aspectClass =
    aspectRatio === 'square'
      ? 'aspect-square'
      : aspectRatio === 'portrait'
      ? 'aspect-[3/4]'
      : aspectRatio === 'wide'
      ? 'aspect-[16/9]'
      : aspectRatio === 'banner'
      ? 'aspect-[21/9]'
      : '';

  const fitClass =
    objectFit === 'contain'
      ? 'object-contain'
      : objectFit === 'fill'
      ? 'object-fill'
      : 'object-cover';

  if (!resolvedUrl || hasError) {
    return (
      <div
        className={`w-full ${aspectClass} bg-slate-100 dark:bg-slate-800 flex flex-col items-center justify-center text-slate-400 dark:text-slate-600 select-none overflow-hidden ${containerClassName}`}
        title={alt}
      >
        <div className="flex flex-col items-center gap-1.5 p-3 text-center">
          <ImageIcon className="w-8 h-8 opacity-60 stroke-[1.5]" />
          <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 line-clamp-1 max-w-[120px]">
            {alt || 'صورة غير متوفرة'}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden w-full ${aspectClass} ${containerClassName}`}>
      {isLoading && (
        <div className="absolute inset-0 bg-slate-200/70 dark:bg-slate-800/70 animate-pulse flex items-center justify-center">
          <ImageIcon className="w-6 h-6 text-slate-300 dark:text-slate-600 animate-pulse" />
        </div>
      )}
      <img
        src={resolvedUrl}
        alt={alt}
        loading="lazy"
        onLoad={() => setIsLoading(false)}
        onError={() => {
          setIsLoading(false);
          setHasError(true);
        }}
        className={`w-full h-full ${fitClass} transition-opacity duration-300 ${
          isLoading ? 'opacity-0' : 'opacity-100'
        } ${className}`}
        {...rest}
      />
    </div>
  );
};
