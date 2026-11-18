import React, { useState, useEffect } from 'react';
import { resolveAvatarUrl } from '../../common/avatar';

export interface AvatarProps {
  src?: string | null;
  name?: string | null;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | number;
  className?: string;
  version?: number | string;
  onClick?: () => void;
  title?: string;
}

export const Avatar: React.FC<AvatarProps> = ({
  src,
  name,
  size = 'md',
  className = '',
  version,
  onClick,
  title,
}) => {
  const [hasError, setHasError] = useState(false);

  // Khi địa chỉ src hoặc version thay đổi, reset lại cờ lỗi để thử tải
  useEffect(() => {
    setHasError(false);
  }, [src, version]);

  // Kích thước chuẩn hóa
  let sizeClass = 'w-9 h-9 text-xs';
  if (size === 'xs') sizeClass = 'w-6 h-6 text-[10px]';
  else if (size === 'sm') sizeClass = 'w-7 h-7 text-xs';
  else if (size === 'md') sizeClass = 'w-9 h-9 text-xs';
  else if (size === 'lg') sizeClass = 'w-12 h-12 text-sm';
  else if (size === 'xl') sizeClass = 'w-24 h-24 text-2xl';
  else if (size === '2xl') sizeClass = 'w-28 h-28 text-3xl';

  const initial = (name?.trim()?.charAt(0) || 'U').toUpperCase();
  const resolvedSrc = resolveAvatarUrl(src, version);

  return (
    <div
      onClick={onClick}
      title={title || name || undefined}
      className={`relative inline-flex items-center justify-center rounded-full overflow-hidden shrink-0 select-none ${
        onClick ? 'cursor-pointer hover:opacity-90 transition-opacity' : ''
      } ${sizeClass} ${className} bg-[#E11D2E] text-white font-bold font-sans`}
    >
      {resolvedSrc && !hasError ? (
        <img
          src={resolvedSrc}
          onError={() => setHasError(true)}
          alt=""
          className="w-full h-full object-cover"
        />
      ) : (
        <span className="leading-none select-none">{initial}</span>
      )}
    </div>
  );
};
