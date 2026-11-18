/**
 * INSTASQUAD - Centralized Game Cover Image Registry
 * Quản lý tập trung toàn bộ ảnh bìa game, nguồn gốc asset và quy tắc hiển thị.
 * Cho phép thay đổi ảnh bìa game ở một nơi duy nhất mà không cần sửa JSX/CSS thủ công.
 */

export interface GameCoverConfig {
  gameId: string;
  gameName: string;
  coverPath: string;
  source: string;
  alt: string;
  objectPosition: string;
  genre: string;
  fallbackGradient: string;
}

export const GAME_COVERS_REGISTRY: Record<string, GameCoverConfig> = {
  LMHT: {
    gameId: 'LMHT',
    gameName: 'Liên Minh Huyền Thoại',
    coverPath: '/images/games/lol.webp',
    source: 'Riot Games Official Data Dragon (Yasuo Splash Art HD 1215x717)',
    alt: 'Liên Minh Huyền Thoại - Artwork chính thức Yasuo Riot Games',
    objectPosition: 'center 25%',
    genre: 'MOBA',
    fallbackGradient: 'from-blue-900 to-indigo-950',
  },
  VALORANT: {
    gameId: 'VALORANT',
    gameName: 'VALORANT',
    coverPath: '/images/games/valorant.webp',
    source: 'Riot Games Valorant API (Ascent Map Key Art HD 1920x1080)',
    alt: 'VALORANT - Artwork chính thức Riot Games Valorant',
    objectPosition: 'center 40%',
    genre: 'Tactical FPS',
    fallbackGradient: 'from-rose-900 to-slate-950',
  },
  TFT: {
    gameId: 'TFT',
    gameName: 'Đấu Trường Chân Lý',
    coverPath: '/images/games/tft.webp',
    source: 'Riot Games CommunityDragon (Mythic Chibi Blood Moon Jhin HD 1920x1080)',
    alt: 'Đấu Trường Chân Lý (TFT) - Artwork chính thức Riot Games CommunityDragon',
    objectPosition: 'center 30%',
    genre: 'Auto-battler',
    fallbackGradient: 'from-amber-900 to-purple-950',
  },
  PUBG: {
    gameId: 'pubg',
    gameName: 'PUBG: BATTLEGROUNDS',
    coverPath: '/images/games/pubg.webp',
    source: 'PUBG Corporation Official Key Visual (1920x1080 HD)',
    alt: 'PUBG: BATTLEGROUNDS - Artwork chính thức PUBG Corp',
    objectPosition: 'center 35%',
    genre: 'Battle Royale',
    fallbackGradient: 'from-amber-950 to-stone-900',
  },
  OVERWATCH2: {
    gameId: 'overwatch2',
    gameName: 'Overwatch 2',
    coverPath: '/images/games/overwatch2.webp',
    source: 'Blizzard Entertainment Official Key Art (1920x1080 HD)',
    alt: 'Overwatch 2 - Artwork chính thức Blizzard Entertainment',
    objectPosition: 'center 30%',
    genre: 'Hero Shooter',
    fallbackGradient: 'from-orange-950 to-slate-900',
  },
  CS2: {
    gameId: 'cs2',
    gameName: 'Counter-Strike 2',
    coverPath: '/images/games/cs2.webp',
    source: 'Valve Corporation Official Key Art & Logo (1280x800 HD)',
    alt: 'Counter-Strike 2 - Artwork chính thức Valve Corporation',
    objectPosition: 'center 20%',
    genre: 'Tactical Shooter',
    fallbackGradient: 'from-blue-950 to-slate-900',
  },
  GENSHIN: {
    gameId: 'genshin',
    gameName: 'Genshin Impact',
    coverPath: '/images/games/genshin.webp',
    source: 'miHoYo / HoYoverse Official Key Visual (1920x1080 HD)',
    alt: 'Genshin Impact - Key Visual chính thức miHoYo',
    objectPosition: 'center 30%',
    genre: 'Action RPG',
    fallbackGradient: 'from-teal-950 to-slate-900',
  },
};

/**
 * Tra cứu cấu hình ảnh bìa theo gameId (chuẩn hóa hoa/thường và alias LMHT/lol)
 */
export function getGameCover(gameId: string | undefined): GameCoverConfig {
  if (!gameId) {
    return GAME_COVERS_REGISTRY.LMHT;
  }

  const normalized = gameId.trim().toUpperCase();

  if (normalized === 'LMHT' || normalized === 'LOL') {
    return GAME_COVERS_REGISTRY.LMHT;
  }
  if (normalized === 'VALORANT' || normalized === 'VAL') {
    return GAME_COVERS_REGISTRY.VALORANT;
  }
  if (normalized === 'TFT') {
    return GAME_COVERS_REGISTRY.TFT;
  }
  if (normalized === 'PUBG') {
    return GAME_COVERS_REGISTRY.PUBG;
  }
  if (normalized === 'OVERWATCH2' || normalized === 'OVERWATCH') {
    return GAME_COVERS_REGISTRY.OVERWATCH2;
  }
  if (normalized === 'CS2' || normalized === 'CSGO') {
    return GAME_COVERS_REGISTRY.CS2;
  }
  if (normalized === 'GENSHIN' || normalized === 'GENSHIN_IMPACT') {
    return GAME_COVERS_REGISTRY.GENSHIN;
  }

  // Fallback an toàn nếu có game mới chưa đăng ký
  return {
    gameId,
    gameName: gameId,
    coverPath: '/images/games/lol.webp',
    source: 'Default Fallback (Riot Games Data Dragon)',
    alt: `Ảnh bìa game ${gameId}`,
    objectPosition: 'center',
    genre: 'Gaming',
    fallbackGradient: 'from-purple-950 to-slate-900',
  };
}
