import React, { useState } from 'react';
import { getGameCover } from '../../data/gameCovers';

interface GameCoverProps {
  gameId?: string;
  gameName?: string;
  className?: string;
  alt?: string;
  overlayGradient?: boolean;
}

export const GameCover: React.FC<GameCoverProps> = ({
  gameId,
  gameName,
  className = '',
  alt,
  overlayGradient = true,
}) => {
  const [hasError, setHasError] = useState(false);
  const coverConfig = getGameCover(gameId || gameName);

  const displayName = gameName || coverConfig.gameName;
  const imageAlt = alt || `Ảnh bìa game ${displayName}`;

  return (
    <div className={`relative w-full h-full overflow-hidden bg-gradient-to-br ${coverConfig.fallbackGradient || 'from-neutral-900 to-black'} ${className}`}>
      {!hasError ? (
        <img
          src={coverConfig.coverPath}
          alt={imageAlt}
          loading="eager"
          style={{ objectPosition: coverConfig.objectPosition || 'center' }}
          className="absolute inset-0 w-full h-full object-cover brightness-[0.75] contrast-[1.05] group-hover:scale-105 transition-transform duration-300"
          onError={() => setHasError(true)}
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center bg-[#181111]">
          <span className="text-[11px] font-semibold text-neutral-400">{displayName}</span>
        </div>
      )}

      {/* Gradient đen-đỏ chuyển tiếp phía dưới để chữ và avatar nổi bật */}
      {overlayGradient && (
        <>
          <div className="absolute inset-0 bg-gradient-to-t from-[#141414] via-[#141414]/40 to-transparent pointer-events-none" />
          <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-[#E11D2E]/10 to-transparent pointer-events-none" />
        </>
      )}
    </div>
  );
};
