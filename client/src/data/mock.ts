export interface MockGame {
  id: string;
  name: string;
  slug: string;
  companionsCount: string;
  image: string;
  genre: string;
}

export interface MockCompanion {
  id: string;
  rankIndex: number;
  name: string;
  verified: boolean;
  gameId: string;
  gameName: string;
  tier: string;
  rating: number;
  reviewCount: number;
  hourlyRate: number; // in VND
  tags: string[];
  online: boolean;
  quote: string;
  image: string;
  // mapped DB profile / slots if available
  dbProfileId?: string;
  availableSlots?: {
    slot_id: string;
    start_time: string;
    end_time: string;
    status: 'AVAILABLE' | 'HELD' | 'BOOKED';
  }[];
}

export interface MockReview {
  id: string;
  author: string;
  avatar: string;
  rating: number;
  gameName: string;
  content: string;
  role: string;
}

export const MOCK_GAMES: MockGame[] = [
  {
    id: 'valorant',
    slug: 'valorant',
    name: 'Valorant',
    companionsCount: '5.2M+',
    image: '/images/games/valorant.jpg',
    genre: 'Tactical FPS',
  },
  {
    id: 'lol',
    slug: 'lol',
    name: 'League of Legends',
    companionsCount: '8.4M+',
    image: '/images/games/lol.jpg',
    genre: 'MOBA',
  },
  {
    id: 'pubg',
    slug: 'pubg',
    name: 'PUBG',
    companionsCount: '3.1M+',
    image: '/images/games/pubg.jpg',
    genre: 'Battle Royale',
  },
  {
    id: 'overwatch2',
    slug: 'overwatch2',
    name: 'Overwatch 2',
    companionsCount: '1.9M+',
    image: '/images/games/overwatch2.jpg',
    genre: 'Hero Shooter',
  },
  {
    id: 'cs2',
    slug: 'cs2',
    name: 'CS2',
    companionsCount: '4.5M+',
    image: '/images/games/cs2.jpg',
    genre: 'Tactical Shooter',
  },
  {
    id: 'genshin',
    slug: 'genshin',
    name: 'Genshin Impact',
    companionsCount: '6.7M+',
    image: '/images/games/genshin.jpg',
    genre: 'Action RPG',
  },
];

export const MOCK_COMPANIONS: MockCompanion[] = [
  {
    id: 'c01',
    rankIndex: 1,
    name: 'ZedVibes',
    verified: true,
    gameId: 'valorant',
    gameName: 'Valorant',
    tier: 'Immortal 3',
    rating: 4.9,
    reviewCount: 642,
    hourlyRate: 120000,
    tags: ['Duo', 'Rank up'],
    online: true,
    quote: 'Gánh team tận tâm, call mic chuẩn từng round đấu',
    image: '/images/companions/c01.jpg',
  },
  {
    id: 'c02',
    rankIndex: 2,
    name: 'LynnCarry',
    verified: true,
    gameId: 'lol',
    gameName: 'League of Legends',
    tier: 'Master',
    rating: 5.0,
    reviewCount: 890,
    hourlyRate: 150000,
    tags: ['Mid', 'Carry'],
    online: true,
    quote: 'Tâm lý thoải mái, tư duy thắng liên tục không toxic',
    image: '/images/companions/c02.jpg',
  },
  {
    id: 'c03',
    rankIndex: 3,
    name: 'RivenMain',
    verified: true,
    gameId: 'lol',
    gameName: 'League of Legends',
    tier: 'Grandmaster',
    rating: 4.9,
    reviewCount: 412,
    hourlyRate: 160000,
    tags: ['Top', 'Solo kill'],
    online: true,
    quote: 'Combo mượt mà, bao kéo rank từ Kim Cương lên Cao Thủ',
    image: '/images/companions/c03.jpg',
  },
  {
    id: 'c04',
    rankIndex: 4,
    name: 'MinoCute',
    verified: true,
    gameId: 'valorant',
    gameName: 'Valorant',
    tier: 'Ascendant 2',
    rating: 4.8,
    reviewCount: 320,
    hourlyRate: 100000,
    tags: ['Support', 'Chill'],
    online: true,
    quote: 'Giọng nói ngọt ngào, tạo bầu không khí siêu vui vẻ',
    image: '/images/companions/c04.jpg',
  },
  {
    id: 'c05',
    rankIndex: 5,
    name: 'T1Faker1997',
    verified: true,
    gameId: 'lol',
    gameName: 'League of Legends',
    tier: 'Challenger',
    rating: 5.0,
    reviewCount: 1250,
    hourlyRate: 250000,
    tags: ['Macro', 'Shotcall'],
    online: true,
    quote: 'Kỹ năng đỉnh cao, tư duy kiểm soát bản đồ tuyệt đối',
    image: '/images/companions/c05.jpg',
  },
  {
    id: 'c06',
    rankIndex: 6,
    name: 'Soraaa',
    verified: true,
    gameId: 'genshin',
    gameName: 'Genshin Impact',
    tier: 'AR 60',
    rating: 4.9,
    reviewCount: 512,
    hourlyRate: 90000,
    tags: ['Co-op', 'Farm boss'],
    online: true,
    quote: 'Hướng dẫn build đồ chuẩn La Hoàn Thâm Cảnh',
    image: '/images/companions/c06.jpg',
  },
  {
    id: 'c07',
    rankIndex: 7,
    name: 'Kaito',
    verified: true,
    gameId: 'cs2',
    gameName: 'CS2',
    tier: 'Global Elite',
    rating: 4.9,
    reviewCount: 720,
    hourlyRate: 140000,
    tags: ['Aimer', 'Entry'],
    online: true,
    quote: 'Aim cứng như bot, clutch đỉnh 1v3 trở lên cực cháy',
    image: '/images/companions/c07.jpg',
  },
  {
    id: 'c08',
    rankIndex: 8,
    name: 'BanhBao',
    verified: true,
    gameId: 'pubg',
    gameName: 'PUBG',
    tier: 'Top 500',
    rating: 4.8,
    reviewCount: 290,
    hourlyRate: 110000,
    tags: ['Squad', 'Rank up'],
    online: true,
    quote: 'Lái xe thần thánh, bắn tỉa AWM cực bén vào bo',
    image: '/images/companions/c08.jpg',
  },
  {
    id: 'c09',
    rankIndex: 9,
    name: 'VietTop1',
    verified: true,
    gameId: 'overwatch2',
    gameName: 'Overwatch 2',
    tier: 'Top 500',
    rating: 4.9,
    reviewCount: 430,
    hourlyRate: 130000,
    tags: ['DPS', 'Flex'],
    online: true,
    quote: 'Đồng đội nhiệt tình, bảo kê support và dồn dame chuẩn',
    image: '/images/companions/c09.jpg',
  },
  {
    id: 'c10',
    rankIndex: 10,
    name: 'Shiro',
    verified: true,
    gameId: 'valorant',
    gameName: 'Valorant',
    tier: 'Radiant',
    rating: 5.0,
    reviewCount: 860,
    hourlyRate: 200000,
    tags: ['Duelist', 'Aim god'],
    online: true,
    quote: 'Bắn cháy máy, win streak chuỗi 15 trận liên tiếp',
    image: '/images/companions/c10.jpg',
  },
  {
    id: 'c11',
    rankIndex: 11,
    name: 'LongBaka',
    verified: true,
    gameId: 'cs2',
    gameName: 'CS2',
    tier: 'Faceit Lv10',
    rating: 4.8,
    reviewCount: 380,
    hourlyRate: 135000,
    tags: ['Sniper', 'AWP'],
    online: true,
    quote: 'Bình tĩnh xử lý mọi tình huống nghẹt thở',
    image: '/images/companions/c11.jpg',
  },
  {
    id: 'c12',
    rankIndex: 12,
    name: 'Mây',
    verified: true,
    gameId: 'valorant',
    gameName: 'Valorant',
    tier: 'Diamond 3',
    rating: 4.9,
    reviewCount: 610,
    hourlyRate: 100000,
    tags: ['Initiator', 'Lineup'],
    online: true,
    quote: 'Học lineup miễn phí trọn bộ khi chơi cùng',
    image: '/images/companions/c12.jpg',
  },
];

export const MOCK_REVIEWS: MockReview[] = [
  {
    id: 'rev01',
    author: 'Hoàng Nam',
    avatar: '/images/avatars/av01.jpg',
    rating: 5,
    gameName: 'Valorant',
    role: 'Renter VIP',
    content: 'Tìm được bạn duo cực kỳ hợp cạ, leo từ Vàng lên Kim Cương chỉ trong 2 ngày cuối tuần!',
  },
  {
    id: 'rev02',
    author: 'Thu Trang',
    avatar: '/images/avatars/av02.jpg',
    rating: 5,
    gameName: 'League of Legends',
    role: 'Renter',
    content: 'Hệ thống ký quỹ rất an tâm, không sợ bị bùng tiền cọc hay quỵt giờ như trên các nhóm Facebook.',
  },
  {
    id: 'rev03',
    author: 'Minh Đức',
    avatar: '/images/avatars/av03.jpg',
    rating: 5,
    gameName: 'CS2',
    role: 'Gamer',
    content: 'Companion bắn AWP quá khủng, vừa chơi vừa học hỏi được rất nhiều góc kê và timing chuẩn xác.',
  },
  {
    id: 'rev04',
    author: 'Ngọc Anh',
    avatar: '/images/avatars/av04.jpg',
    rating: 5,
    gameName: 'Genshin Impact',
    role: 'Renter',
    content: 'Được bạn đồng hành kéo map và giải đố Sumeru siêu nhanh, rất lịch sự và nhiệt tình hỗ trợ.',
  },
  {
    id: 'rev05',
    author: 'Tuấn Kiệt',
    avatar: '/images/avatars/av05.jpg',
    rating: 5,
    gameName: 'PUBG',
    role: 'Renter',
    content: 'CS hỗ trợ giải quyết rất nhanh và công tâm. Trải nghiệm dịch vụ trên sàn xứng đáng 10/10.',
  },
];

export const WHY_CHOOSE_ITEMS = [
  {
    id: 'escrow',
    title: 'Ký quỹ Escrow bảo vệ tiền',
    desc: 'Tiền thuê được giữ an toàn 100% trong quỹ ký quỹ cho đến khi phiên chơi kết thúc và nghiệm thu hoàn tất.',
    iconName: 'ShieldCheck',
  },
  {
    id: 'privacy',
    title: 'Bảo vệ thông tin cá nhân',
    desc: 'Hệ thống chat bảo mật tự động che giấu số điện thoại, tài khoản ngân hàng chống lừa đảo ngoài sàn.',
    iconName: 'Lock',
  },
  {
    id: 'ledger',
    title: 'Sổ cái ghi kép minh bạch',
    desc: 'Mỗi đồng tiền nạp, rút hay thanh toán đều được hạch toán cân bằng kép đối soát theo thời gian thực.',
    iconName: 'Scale',
  },
  {
    id: 'rma',
    title: 'Hỗ trợ khiếu nại RMA 24/7',
    desc: 'Đội ngũ CS Agent giải quyết phân xử công minh, hoàn tiền tới 100% khi Companion vi phạm hoặc vắng mặt.',
    iconName: 'Headphones',
  },
  {
    id: 'trust',
    title: 'Đánh giá hai chiều & TrustScore',
    desc: 'Hệ thống điểm uy tín tính toán chuẩn xác, loại bỏ hoàn toàn tài khoản toxic hay thiếu trách nhiệm.',
    iconName: 'Star',
  },
];
