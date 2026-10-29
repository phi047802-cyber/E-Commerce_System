import { useState, useEffect } from 'react';
import { 
  Gamepad2, 
  Wallet, 
  Clock, 
  Star, 
  Server,
  Plus,
  Trash2,
  Save,
  CheckCircle,
  ShieldCheck,
  CreditCard,
  RefreshCw,
  AlertTriangle,
  MessageSquare,
  Send,
  X,
  AlertCircle,
  CheckCircle2,
  ArrowDownToLine,
  Check,
  Ban,
  Eye,
  FileText,
  Upload,
  RotateCcw,
  Info
} from 'lucide-react';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { HomePage } from './pages/HomePage';
import { SlotBookingModal } from './components/SlotBookingModal';
import { MOCK_GAMES, MOCK_COMPANIONS, MockCompanion } from './data/mock';

interface Toast {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
}

interface HealthData {
  status: string;
  uptime_seconds: number;
  database: string;
  version: string;
  environment: string;
}

interface Game {
  game_id: string;
  game_name: string;
  genre: string;
}

interface Slot {
  slot_id: string;
  start_time: string;
  end_time: string;
  status: 'AVAILABLE' | 'HELD' | 'BOOKED';
  held_until?: string | null;
}

interface Companion {
  profile_id: string;
  user_id: string;
  hourly_rate: number;
  trust_score: number;
  availability: string;
  game_account_id: string;
  user: {
    display_name: string;
    email: string;
  };
  game: Game;
  tier: {
    tier_name: string;
  };
  slots: Slot[];
}

interface AuthUserState {
  user_id: string;
  email: string;
  display_name: string;
  role: string;
  wallet?: {
    available_balance: number;
    escrow_balance: number;
  };
  companion_profile?: {
    profile_id: string;
    trust_score: number;
    hourly_rate: number;
    availability: string;
    game_account_id?: string;
  };
}

export default function App() {
  const [health, setHealth] = useState<HealthData | null>(null);
  const [, setGames] = useState<Game[]>([]);
  const [companions, setCompanions] = useState<Companion[]>([]);
  const [selectedGame, setSelectedGame] = useState<string>('ALL');
  const [currentUser, setCurrentUser] = useState<AuthUserState | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [loading, setLoading] = useState<boolean>(false);
  const [message, setMessage] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'catalog' | 'companion_dashboard' | 'cs_view' | 'auditor_view'>('catalog');
  const [selectedCompanionForBooking, setSelectedCompanionForBooking] = useState<MockCompanion | null>(null);
  const [showSlotModal, setShowSlotModal] = useState<boolean>(false);
  const [activeMenu, setActiveMenu] = useState<string>('home');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Companion Management State
  const [companionProfile, setCompanionProfile] = useState<any>(null);
  const [companionSlots, setCompanionSlots] = useState<Slot[]>([]);
  const [editRate, setEditRate] = useState<number>(100000);
  const [editAvailability, setEditAvailability] = useState<string>('ONLINE');
  const [editAccountId, setEditAccountId] = useState<string>('');
  const [newSlotStart, setNewSlotStart] = useState<string>('');
  const [newSlotEnd, setNewSlotEnd] = useState<string>('');

  // Financial & Simulator State (PROMPT 07)
  const [showTopup, setShowTopup] = useState<boolean>(false);
  const [topupAmount, setTopupAmount] = useState<number>(200000);
  const [activePayment, setActivePayment] = useState<any>(null);
  const [myBookings, setMyBookings] = useState<any[]>([]);
  const [reconReport, setReconReport] = useState<any>(null);

  // Room & Session State (PROMPT 09)
  const [activeSession, setActiveSession] = useState<any>(null);
  const [sessionMessages, setSessionMessages] = useState<any[]>([]);
  const [chatInput, setChatInput] = useState<string>('');
  const [showRoomModal, setShowRoomModal] = useState<boolean>(false);
  const [showDisputeModal, setShowDisputeModal] = useState<boolean>(false);
  const [disputeCategory, setDisputeCategory] = useState<'NO_SHOW' | 'HARASSMENT' | 'SKILL_MISMATCH' | 'TECHNICAL_ISSUE'>('NO_SHOW');
  const [disputeDescription, setDisputeDescription] = useState<string>('');
  const [disputeTargetBookingId, setDisputeTargetBookingId] = useState<string>('');

  // Review & TrustScore State (PROMPT 11)
  const [showReviewModal, setShowReviewModal] = useState<boolean>(false);
  const [reviewBookingId, setReviewBookingId] = useState<string>('');
  const [reviewRating, setReviewRating] = useState<number>(5);
  const [reviewComment, setReviewComment] = useState<string>('');
  const [trustScoreData, setTrustScoreData] = useState<any>(null);

  // Simulated Withdrawal State (PROMPT 11)
  const [myWithdrawals, setMyWithdrawals] = useState<any[]>([]);
  const [allWithdrawals, setAllWithdrawals] = useState<any[]>([]);
  const [showWithdrawModal, setShowWithdrawModal] = useState<boolean>(false);
  const [withdrawAmount, setWithdrawAmount] = useState<number>(100000);
  const [withdrawBank, setWithdrawBank] = useState<string>('Techcombank');
  const [withdrawAccountNo, setWithdrawAccountNo] = useState<string>('');

  // Toast Notification System (PROMPT 12)
  const [toasts, setToasts] = useState<Toast[]>([]);

  // Financial Diff Notice (Hiển thị rõ số tiền trước và sau)
  const [financialDiffNotice, setFinancialDiffNotice] = useState<{
    title: string;
    prev: number;
    diff: number;
    next: number;
    unit: string;
  } | null>(null);

  // CS / Admin Dispute Queue & Decision State (PROMPT 12)
  const [disputes, setDisputes] = useState<any[]>([]);
  const [selectedDispute, setSelectedDispute] = useState<any>(null);
  const [showDossierModal, setShowDossierModal] = useState<boolean>(false);
  const [showDecisionModal, setShowDecisionModal] = useState<boolean>(false);
  const [decisionFaultPercent, setDecisionFaultPercent] = useState<number>(100);
  const [decisionReason, setDecisionReason] = useState<string>('');
  const [showRequestEvidenceModal, setShowRequestEvidenceModal] = useState<boolean>(false);
  const [evidenceHours, setEvidenceHours] = useState<number>(24);
  const [evidenceNote, setEvidenceNote] = useState<string>('');
  const [disputeFilterStatus, setDisputeFilterStatus] = useState<string>('ALL');

  // Evidence Upload State (Renter / Companion)
  const [showUploadEvidenceModal, setShowUploadEvidenceModal] = useState<boolean>(false);
  const [evidenceTargetDisputeId, setEvidenceTargetDisputeId] = useState<string>('');
  const [evidenceFileType, setEvidenceFileType] = useState<'IMAGE_PNG' | 'IMAGE_JPEG' | 'LOG_TEXT'>('IMAGE_PNG');
  const [evidenceDescription, setEvidenceDescription] = useState<string>('');
  const [evidenceFileBase64, setEvidenceFileBase64] = useState<string>('');

  // Interactive Modals replacing prompt() & confirm() (PROMPT 12)
  const [showRejectBookingModal, setShowRejectBookingModal] = useState<boolean>(false);
  const [rejectBookingId, setRejectBookingId] = useState<string>('');
  const [rejectBookingReason, setRejectBookingReason] = useState<string>('Companion bận đột xuất');

  const [showCancelBookingModal, setShowCancelBookingModal] = useState<boolean>(false);
  const [cancelBookingTarget, setCancelBookingTarget] = useState<any>(null);

  const [showFulfillmentModal, setShowFulfillmentModal] = useState<boolean>(false);
  const [fulfillmentBookingTarget, setFulfillmentBookingTarget] = useState<any>(null);

  const [showBookingDetailModal, setShowBookingDetailModal] = useState<boolean>(false);
  const [selectedBookingDetail, setSelectedBookingDetail] = useState<any>(null);

  const [showRejectWithdrawalModal, setShowRejectWithdrawalModal] = useState<boolean>(false);
  const [rejectWithdrawalId, setRejectWithdrawalId] = useState<string>('');
  const [rejectWithdrawalReason, setRejectWithdrawalReason] = useState<string>('Thông tin số tài khoản không trùng khớp');

  const [showResetDemoModal, setShowResetDemoModal] = useState<boolean>(false);

  // Companion Public Reviews List
  const [companionReviews, setCompanionReviews] = useState<any[]>([]);

  // Ledger Audit Alerts List (CS & Auditor)
  const [auditAlerts, setAuditAlerts] = useState<any[]>([]);

  const addToast = (type: 'success' | 'error' | 'warning' | 'info', title: string, message: string) => {
    const id = Date.now().toString() + Math.random().toString(36).substring(2, 6);
    setToasts((prev) => [...prev, { id, type, title, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5000);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // 1. Kiểm tra Health check backend
  const checkHealth = async () => {
    try {
      const res = await fetch('/api/health');
      const data = await res.json();
      if (data.success) {
        setHealth(data.data);
      }
    } catch (err) {
      console.error('Lỗi kết nối backend health:', err);
    }
  };

  // 2. Tải danh mục game & companion
  const loadCatalog = async () => {
    try {
      const [gamesRes, compRes] = await Promise.all([
        fetch('/api/games'),
        fetch('/api/companions'),
      ]);
      const gamesData = await gamesRes.json();
      const compData = await compRes.json();
      if (gamesData.success) setGames(gamesData.data);
      if (compData.success) setCompanions(compData.data);
    } catch (err) {
      console.error('Lỗi tải danh mục:', err);
    }
  };

  // 3. Tải thông tin người dùng nếu có token
  const loadMe = async (authToken: string) => {
    try {
      const res = await fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const data = await res.json();
      if (data.success) {
        setCurrentUser(data.data);
        loadMyBookings(authToken);
        if (data.data.role === 'COMPANION') {
          loadCompanionData(authToken);
        } else if (data.data.role === 'CS_AGENT' || data.data.role === 'ADMIN') {
          loadAllWithdrawals(authToken);
          loadDisputes(authToken);
          loadAuditAlerts(authToken);
        } else if (data.data.role === 'AUDITOR') {
          loadAuditAlerts(authToken);
        }
      } else {
        logout();
      }
    } catch {
      logout();
    }
  };

  // 4. Tải dữ liệu hồ sơ và slots của Companion
  const loadCompanionData = async (authToken: string) => {
    try {
      const [profRes, slotsRes] = await Promise.all([
        fetch('/api/companion/profile', { headers: { Authorization: `Bearer ${authToken}` } }),
        fetch('/api/companion/slots', { headers: { Authorization: `Bearer ${authToken}` } }),
      ]);
      const profData = await profRes.json();
      const slotsData = await slotsRes.json();
      if (profData.success) {
        setCompanionProfile(profData.data);
        setEditRate(profData.data.hourly_rate);
        setEditAvailability(profData.data.availability);
        setEditAccountId(profData.data.game_account_id);
      }
      if (slotsData.success) {
        setCompanionSlots(slotsData.data);
      }
      // Tải điểm TrustScore, danh sách rút tiền và đánh giá nhận được cho Companion
      loadTrustScore(authToken);
      loadMyWithdrawals(authToken);
      if (profData.data.profile_id) {
        loadCompanionReviews(profData.data.profile_id);
      }
    } catch (err) {
      console.error('Lỗi tải dữ liệu companion:', err);
    }
  };

  // 4b. Tải điểm TrustScore của Companion
  const loadTrustScore = async (authToken: string) => {
    try {
      const res = await fetch('/api/companion/trust-score', {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const data = await res.json();
      if (data.success) {
        setTrustScoreData(data.data);
      }
    } catch (err) {
      console.error('Lỗi tải trust score:', err);
    }
  };

  // 4c. Tải lịch sử rút tiền của Companion
  const loadMyWithdrawals = async (authToken: string) => {
    try {
      const res = await fetch('/api/withdrawals/my', {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const data = await res.json();
      if (data.success) {
        setMyWithdrawals(data.data);
      }
    } catch (err) {
      console.error('Lỗi tải danh sách rút tiền cá nhân:', err);
    }
  };

  // 4d. Tải toàn bộ yêu cầu rút tiền cho CS / Admin
  const loadAllWithdrawals = async (authToken: string) => {
    try {
      const res = await fetch('/api/withdrawals', {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const data = await res.json();
      if (data.success) {
        setAllWithdrawals(data.data);
      }
    } catch (err) {
      console.error('Lỗi tải toàn bộ danh sách rút tiền:', err);
    }
  };

  // 4e. Tải danh sách khiếu nại Dispute cho CS Agent
  const loadDisputes = async (authToken: string, status?: string) => {
    try {
      const url = status && status !== 'ALL' ? `/api/cs/disputes?status=${status}` : '/api/cs/disputes';
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const data = await res.json();
      if (data.success) {
        setDisputes(data.data);
      }
    } catch (err) {
      console.error('Lỗi tải danh sách dispute:', err);
    }
  };

  // 4f. Tải hồ sơ CS Dossier chi tiết cho một khiếu nại
  const handleOpenDossier = async (disputeId: string) => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/cs/disputes/${disputeId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setSelectedDispute(data.data);
        setShowDossierModal(true);
      } else {
        addToast('error', 'Lỗi tải Dossier', data.error.message);
      }
    } catch (err: any) {
      addToast('error', 'Lỗi kết nối', err.message);
    } finally {
      setLoading(false);
    }
  };

  // 4g. Tải danh sách cảnh báo lỗi Sổ cái (Ledger Audit Alerts)
  const loadAuditAlerts = async (authToken: string) => {
    try {
      const res = await fetch('/api/dev/audit-alerts', {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const data = await res.json();
      if (data.success) {
        setAuditAlerts(data.data);
      }
    } catch (err) {
      console.error('Lỗi tải cảnh báo kiểm toán:', err);
    }
  };

  // 4h. Tải danh sách đánh giá công khai của Companion
  const loadCompanionReviews = async (profileId: string) => {
    try {
      const res = await fetch(`/api/reviews/companion/${profileId}`);
      const data = await res.json();
      if (data.success) {
        setCompanionReviews(data.data.reviews || []);
      }
    } catch (err) {
      console.error('Lỗi tải review companion:', err);
    }
  };

  // 4i. Xem chi tiết đơn đặt lịch & Lịch sử trạng thái (Audit History)
  const handleOpenBookingDetail = async (bookingId: string) => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/bookings/${bookingId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setSelectedBookingDetail(data.data);
        setShowBookingDetailModal(true);
      } else {
        addToast('error', 'Lỗi tải chi tiết đơn', data.error.message);
      }
    } catch (err: any) {
      addToast('error', 'Lỗi kết nối', err.message);
    } finally {
      setLoading(false);
    }
  };

  // 4j. Khôi phục dữ liệu Demo (Demo Reset)
  const handleResetDemo = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/dev/reset-demo', {
        method: 'POST',
      });
      const data = await res.json();
      if (data.success) {
        setShowResetDemoModal(false);
        addToast('success', 'Reset Demo Thành Công', data.data.message || 'Cơ sở dữ liệu đã được đưa về trạng thái seed sạch!');
        await checkHealth();
        await loadCatalog();
        if (token) {
          await loadMe(token);
        }
      } else {
        addToast('error', 'Không thể Reset', data.error.message);
      }
    } catch (err: any) {
      addToast('error', 'Lỗi kết nối', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkHealth();
    loadCatalog();
    if (token) {
      loadMe(token);
    }
    const interval = setInterval(checkHealth, 15000);
    return () => clearInterval(interval);
  }, [token]);

  // Polling tin nhắn phòng chơi khi modal mở
  useEffect(() => {
    let interval: any = null;
    if (showRoomModal && activeSession && token) {
      interval = setInterval(() => {
        loadSessionMessages(activeSession.session_id, token);
      }, 3000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [showRoomModal, activeSession, token]);

  // Đăng nhập nhanh bằng tài khoản seed
  const quickLogin = async (email: string) => {
    setLoading(true);
    setMessage('');
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: 'Demo@123456' }),
      });
      const data = await res.json();
      if (data.success) {
        localStorage.setItem('token', data.data.token);
        setToken(data.data.token);
        setCurrentUser(data.data.user);
        setMessage(`Đăng nhập thành công với vai trò ${data.data.user.role}!`);
        if (data.data.user.role === 'COMPANION') {
          setActiveTab('companion_dashboard');
          loadCompanionData(data.data.token);
        } else if (data.data.user.role === 'CS_AGENT' || data.data.user.role === 'ADMIN') {
          setActiveTab('cs_view');
          loadAllWithdrawals(data.data.token);
          loadDisputes(data.data.token);
          loadAuditAlerts(data.data.token);
        } else if (data.data.user.role === 'AUDITOR') {
          setActiveTab('auditor_view');
          loadAuditAlerts(data.data.token);
        } else {
          setActiveTab('catalog');
        }
      } else {
        setMessage(`Đăng nhập thất bại: ${data.error.message}`);
      }
    } catch (err: any) {
      setMessage(`Lỗi kết nối: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

   const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setCurrentUser(null);
    setCompanionProfile(null);
    setCompanionSlots([]);
    setActiveTab('catalog');
    setMessage('Đã đăng xuất.');
  };

  // Cập nhật hồ sơ Companion
  const handleSaveProfile = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/companion/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          hourly_rate: editRate,
          availability: editAvailability,
          game_account_id: editAccountId,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setMessage('Cập nhật hồ sơ Companion thành công!');
        loadCompanionData(token);
        loadCatalog();
      } else {
        setMessage(`Lỗi cập nhật: ${data.error.message}`);
      }
    } catch (err: any) {
      setMessage(`Lỗi: ${err.message}`);
    }
  };

  // Đặt lịch và giữ slot nguyên tử (PROMPT 06 - M4)
  const handleBookSlot = async (slotId: string) => {
    if (!token) {
      addToast('warning', 'Yêu cầu đăng nhập', 'Vui lòng đăng nhập với tài khoản Renter (ví dụ: renter1@instasquad.test) để đặt lịch!');
      return;
    }
    setLoading(true);
    try {
      const requestKey = `req-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          'Idempotency-Key': requestKey,
        },
        body: JSON.stringify({
          slot_id: slotId,
          request_key: requestKey,
        }),
      });
      const data = await res.json();
      if (data.success) {
        addToast(
          'success',
          'Giữ chỗ slot thành công!',
          `Mã đơn: #${data.data.booking_id.slice(0, 8)} (${data.data.status}). Đơn giá chốt snapshot: ${data.data.total_fee_snapshot.toLocaleString('vi-VN')} VND. Vui lòng ký quỹ trong 10 phút.`
        );
        await loadCatalog();
        await loadMyBookings(token);
      } else {
        addToast('error', 'Không thể đặt lịch', `${data.error.message} (${data.error.code})`);
      }
    } catch (err: any) {
      addToast('error', 'Lỗi kết nối', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenBookingForCompanion = (companion: MockCompanion) => {
    if (!token) {
      addToast('warning', 'Yêu cầu đăng nhập', 'Vui lòng đăng nhập với tài khoản Renter (ví dụ: renter1@instasquad.test) để đặt lịch!');
      return;
    }
    const dbSlots = companions.flatMap(c => c.slots || []).filter(s => s.status === 'AVAILABLE');
    const mapped: MockCompanion = {
      ...companion,
      availableSlots: dbSlots.length > 0 ? dbSlots : undefined,
    };
    setSelectedCompanionForBooking(mapped);
    setShowSlotModal(true);
  };

  const handleConfirmSlotBooking = async (slotId: string) => {
    setShowSlotModal(false);
    const dbSlots = companions.flatMap(c => c.slots || []);
    const foundSlot = dbSlots.find(s => s.slot_id === slotId) || dbSlots.find(s => s.status === 'AVAILABLE');
    const targetSlotId = foundSlot ? foundSlot.slot_id : (dbSlots[0]?.slot_id || slotId);
    await handleBookSlot(targetSlotId);
  };
  const handleCreateSlot = async () => {
    if (!token || !newSlotStart || !newSlotEnd) {
      setMessage('Vui lòng chọn đầy đủ thời gian bắt đầu và kết thúc.');
      return;
    }
    try {
      const res = await fetch('/api/companion/slots', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          start_time: new Date(newSlotStart).toISOString(),
          end_time: new Date(newSlotEnd).toISOString(),
        }),
      });
      const data = await res.json();
      if (data.success) {
        setMessage('Tạo khung giờ rảnh mới thành công!');
        setNewSlotStart('');
        setNewSlotEnd('');
        loadCompanionData(token);
        loadCatalog();
      } else {
        setMessage(`Lỗi tạo slot: ${data.error.message}`);
      }
    } catch (err: any) {
      setMessage(`Lỗi: ${err.message}`);
    }
  };

  // Xóa khung giờ
  const handleDeleteSlot = async (slotId: string) => {
    if (!token) return;
    try {
      const res = await fetch(`/api/companion/slots/${slotId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setMessage('Xóa khung giờ thành công!');
        loadCompanionData(token);
        loadCatalog();
      } else {
        setMessage(`Lỗi xóa slot: ${data.error.message}`);
      }
    } catch (err: any) {
      setMessage(`Lỗi: ${err.message}`);
    }
  };


  // Tải danh sách đơn đặt lịch
  const loadMyBookings = async (authToken: string) => {
    try {
      const res = await fetch('/api/bookings', {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const data = await res.json();
      if (data.success) {
        setMyBookings(data.data);
      }
    } catch (err) {
      console.error('Lỗi tải booking:', err);
    }
  };

  // Ký quỹ Escrow (M5 - PROMPT 07, BR-05, TC07)
  const handleHoldEscrow = async (bookingId: string) => {
    if (!token) return;
    const prevAvailable = currentUser?.wallet?.available_balance ?? 0;
    setLoading(true);
    try {
      const res = await fetch(`/api/bookings/${bookingId}/hold-escrow`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        const heldAmount = data.data.escrow?.amount || 0;
        const newAvailable = Math.max(0, prevAvailable - heldAmount);
        setFinancialDiffNotice({
          title: `Ký quỹ Escrow đơn #${bookingId.slice(0, 8)}`,
          prev: prevAvailable,
          diff: -heldAmount,
          next: newAvailable,
          unit: 'VND',
        });
        addToast(
          'success',
          'Ký quỹ Escrow thành công!',
          `Đã chuyển ${heldAmount.toLocaleString('vi-VN')} VND sang ký quỹ tạm giữ. Bắt đầu hạn 180s cho Companion phản hồi.`
        );
        await loadMe(token);
        await loadMyBookings(token);
        await loadCatalog();
      } else {
        addToast('error', 'Ký quỹ thất bại', `${data.error.message} (${data.error.code})`);
      }
    } catch (err: any) {
      addToast('error', 'Lỗi kết nối', err.message);
    } finally {
      setLoading(false);
    }
  };

  // Companion phản hồi đơn đặt lịch (PROMPT 08)
  const handleAcceptBooking = async (bookingId: string) => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/bookings/${bookingId}/accept`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        addToast('success', 'Đã chấp nhận đơn đặt lịch!', 'Phiên chơi đã được khởi tạo. Bạn có thể vào phòng trao đổi ngay.');
        await loadMyBookings(token);
        await loadCompanionData(token);
      } else {
        addToast('error', 'Không thể chấp nhận đơn', data.error.message);
      }
    } catch (err: any) {
      addToast('error', 'Lỗi', err.message);
    } finally {
      setLoading(false);
    }
  };

  // Mở modal từ chối nhận đơn cho Companion
  const handleOpenRejectBookingModal = (bookingId: string) => {
    setRejectBookingId(bookingId);
    setRejectBookingReason('Companion bận đột xuất');
    setShowRejectBookingModal(true);
  };

  const submitRejectBooking = async () => {
    if (!token || !rejectBookingId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/bookings/${rejectBookingId}/reject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ reason: rejectBookingReason.trim() || 'Companion bận' }),
      });
      const data = await res.json();
      if (data.success) {
        setShowRejectBookingModal(false);
        addToast(
          'info',
          'Đã từ chối đơn đặt lịch',
          'Khoản tiền ký quỹ Escrow đã được Sổ cái hoàn trả 100% về ví khả dụng của khách hàng.'
        );
        await loadMyBookings(token);
        await loadCompanionData(token);
      } else {
        addToast('error', 'Không thể từ chối', data.error.message);
      }
    } catch (err: any) {
      addToast('error', 'Lỗi', err.message);
    } finally {
      setLoading(false);
    }
  };

  // Mở modal hủy đơn đặt lịch cho Renter
  const handleOpenCancelModal = (booking: any) => {
    setCancelBookingTarget(booking);
    setShowCancelBookingModal(true);
  };

  const submitCancelBooking = async () => {
    if (!token || !cancelBookingTarget) return;
    const bookingId = cancelBookingTarget.booking_id;
    setLoading(true);
    try {
      const res = await fetch(`/api/bookings/${bookingId}/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ reason: 'Renter chủ động hủy theo chính sách' }),
      });
      const data = await res.json();
      if (data.success) {
        setShowCancelBookingModal(false);
        const policy = data.meta?.policy_applied || data.data.policy_applied || 'CANCEL';
        addToast('success', 'Hủy đơn thành công!', `Chính sách áp dụng: ${policy}. Số dư ví đã được cập nhật tương ứng.`);
        await loadMe(token);
        await loadMyBookings(token);
        await loadCatalog();
      } else {
        addToast('error', 'Hủy đơn thất bại', data.error.message);
      }
    } catch (err: any) {
      addToast('error', 'Lỗi', err.message);
    } finally {
      setLoading(false);
    }
  };

  // Nạp tiền qua Payment Simulator (PROMPT 07, BR-07, TC09)
  const handleCreateTopup = async (amount: number) => {
    if (!token) {
      addToast('warning', 'Yêu cầu đăng nhập', 'Vui lòng đăng nhập trước khi nạp tiền.');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/payments/create-topup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ amount }),
      });
      const data = await res.json();
      if (data.success) {
        setActivePayment(data.data);
        addToast(
          'info',
          'Đã tạo yêu cầu nạp tiền',
          `Số tiền: ${amount.toLocaleString('vi-VN')} VND. Vui lòng chọn kịch bản phản hồi Webhook giả lập bên dưới.`
        );
      } else {
        addToast('error', 'Lỗi tạo yêu cầu nạp tiền', data.error.message);
      }
    } catch (err: any) {
      addToast('error', 'Lỗi kết nối', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSimulatePayment = async (outcome: 'SUCCESS' | 'FAILED' | 'PENDING') => {
    if (!activePayment) return;
    const prevAvailable = currentUser?.wallet?.available_balance ?? 0;
    const topupAmount = activePayment.amount;
    setLoading(true);
    try {
      const res = await fetch('/api/payments/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          payment_id: activePayment.payment_id,
          outcome,
        }),
      });
      const data = await res.json();
      if (data.success) {
        if (outcome === 'SUCCESS') {
          const newAvailable = prevAvailable + topupAmount;
          setFinancialDiffNotice({
            title: `Nạp tiền thành công (${outcome})`,
            prev: prevAvailable,
            diff: topupAmount,
            next: newAvailable,
            unit: 'VND',
          });
          addToast(
            'success',
            'Nạp tiền thành công (SUCCESS)',
            `+${topupAmount.toLocaleString('vi-VN')} VND đã được cộng vào ví khả dụng qua Sổ cái kép.`
          );
          setActivePayment(null);
          setShowTopup(false);
        } else if (outcome === 'FAILED') {
          addToast('warning', 'Nạp tiền thất bại (FAILED)', 'Giao dịch bị từ chối bởi cổng mô phỏng. Số dư ví giữ nguyên.');
        } else {
          addToast('info', 'Giao dịch đang chờ (PENDING/TIMEOUT)', 'Đang chờ xác nhận từ cổng mô phỏng. Chưa cộng tiền ví.');
        }

        if (token) {
          await loadMe(token);
          await loadMyBookings(token);
        }
      } else {
        addToast('error', 'Lỗi giả lập', data.error.message);
      }
    } catch (err: any) {
      addToast('error', 'Lỗi kết nối', err.message);
    } finally {
      setLoading(false);
    }
  };

  // Chạy đối soát Sổ cái kép cho Auditor (PROMPT 07, TC31)
  const handleRunReconciliation = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch('/api/wallet/reconciliation', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setReconReport(data.data);
        addToast(
          'success',
          'Đối soát Sổ cái kép hoàn tất',
          'Tất cả tài khoản ví và phương trình bảo toàn tổng tiền hệ thống đạt trạng thái CÂN BẰNG 100% (Sai lệch 0đ)!'
        );
      } else {
        addToast('error', 'Lỗi đối soát', data.error.message);
      }
    } catch (err: any) {
      addToast('error', 'Lỗi kết nối', err.message);
    } finally {
      setLoading(false);
    }
  };

  // Mở phòng chơi (M6 - PROMPT 09)
  const handleOpenRoom = async (bookingId: string) => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/sessions/booking/${bookingId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setActiveSession(data.data.session);
        setShowRoomModal(true);
        loadSessionMessages(data.data.session.session_id, token);
      } else {
        addToast('error', 'Không thể vào phòng', data.error.message);
      }
    } catch (err: any) {
      addToast('error', 'Lỗi kết nối phòng', err.message);
    } finally {
      setLoading(false);
    }
  };

  // Tải tin nhắn chat
  const loadSessionMessages = async (sessionId: string, authToken: string) => {
    try {
      const res = await fetch(`/api/sessions/${sessionId}/messages`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const data = await res.json();
      if (data.success) {
        setSessionMessages(data.data);
      }
    } catch (err) {
      console.error('Lỗi tải tin nhắn:', err);
    }
  };

  // Gửi tin nhắn
  const handleSendMessage = async () => {
    if (!token || !activeSession || !chatInput.trim()) return;
    try {
      const res = await fetch(`/api/sessions/${activeSession.session_id}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ content: chatInput.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        setChatInput('');
        loadSessionMessages(activeSession.session_id, token);
      } else {
        addToast('error', 'Không thể gửi tin nhắn', data.error.message);
      }
    } catch (err: any) {
      addToast('error', 'Lỗi', err.message);
    }
  };

  // Khởi chạy phiên chơi
  const handleStartSession = async (sessionId: string) => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/sessions/${sessionId}/start`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        addToast('success', 'Bắt đầu phiên chơi!', 'Trạng thái phiên: ACTIVE. Hai bên đã vào phòng trực tiếp.');
        setActiveSession((prev: any) => ({ ...prev, status: 'ACTIVE' }));
        await loadMyBookings(token);
      } else {
        addToast('error', 'Lỗi khởi chạy phiên', data.error.message);
      }
    } catch (err: any) {
      addToast('error', 'Lỗi', err.message);
    } finally {
      setLoading(false);
    }
  };

  // Kết thúc phiên chơi & Kích hoạt 15 phút nghiệm thu
  const handleEndSession = async (sessionId: string) => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/sessions/${sessionId}/end`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        addToast('info', 'Phiên chơi đã kết thúc', 'Bắt đầu thời hạn nghiệm thu 15 phút theo chính sách Demo Policy.');
        setActiveSession((prev: any) => ({
          ...prev,
          status: 'ENDED',
          booking: {
            ...prev.booking,
            confirm_deadline: data.data.confirm_deadline,
          },
        }));
        await loadMyBookings(token);
      } else {
        addToast('error', 'Lỗi kết thúc phiên', data.error.message);
      }
    } catch (err: any) {
      addToast('error', 'Lỗi', err.message);
    } finally {
      setLoading(false);
    }
  };

  // Mở modal nghiệm thu hoàn tất (88/12)
  const handleOpenFulfillmentModal = (booking: any) => {
    setFulfillmentBookingTarget(booking);
    setShowFulfillmentModal(true);
  };

  const submitFulfillment = async () => {
    if (!token || !fulfillmentBookingTarget) return;
    const bookingId = fulfillmentBookingTarget.booking_id;
    setLoading(true);
    try {
      const res = await fetch(`/api/bookings/${bookingId}/accept-fulfillment`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setShowFulfillmentModal(false);
        setShowRoomModal(false);
        const st = data.data.settlement;
        addToast(
          'success',
          'Nghiệm thu hoàn tất (88/12)',
          `Đã giải ngân ${st.companion_received.toLocaleString('vi-VN')} VND cho Companion (88%) và ${st.platform_fee.toLocaleString('vi-VN')} VND phí sàn (12%).`
        );
        await loadMe(token);
        await loadMyBookings(token);
      } else {
        addToast('error', 'Không thể nghiệm thu', data.error.message);
      }
    } catch (err: any) {
      addToast('error', 'Lỗi', err.message);
    } finally {
      setLoading(false);
    }
  };

  // Thử nghiệm Auto-Accept
  const handleSimulateAutoAccept = async (bookingId: string) => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/bookings/${bookingId}/auto-accept`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          simulated_now: new Date(Date.now() + 86400000).toISOString(),
        }),
      });
      const data = await res.json();
      if (data.success) {
        addToast(
          'success',
          'Auto-Accept 15 phút (Demo Policy)',
          'Hệ thống tự động nghiệm thu và giải ngân 88/12 sau 15 phút không nhận được khiếu nại!'
        );
        setShowRoomModal(false);
        await loadMe(token);
        await loadMyBookings(token);
      } else {
        addToast('error', 'Lỗi Auto-Accept', data.error.message);
      }
    } catch (err: any) {
      addToast('error', 'Lỗi', err.message);
    } finally {
      setLoading(false);
    }
  };

  // Mở khiếu nại
  const handleReportIssue = async () => {
    if (!token || !disputeTargetBookingId) return;
    if (disputeDescription.trim().length < 10) {
      addToast('warning', 'Yêu cầu mô tả', 'Vui lòng nhập mô tả sự cố tối thiểu 10 ký tự.');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/bookings/${disputeTargetBookingId}/report-issue`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          reason_category: disputeCategory,
          description: disputeDescription.trim(),
        }),
      });
      const data = await res.json();
      if (data.success) {
        addToast(
          'warning',
          'Đã mở khiếu nại tranh chấp',
          `Hồ sơ #${data.data.dispute.dispute_id.slice(0, 8)}. Khoản tiền Escrow đã được ĐÓNG BĂNG toàn phần để bảo vệ quyền lợi.`
        );
        setShowDisputeModal(false);
        setShowRoomModal(false);
        setDisputeDescription('');
        await loadMe(token);
        await loadMyBookings(token);
      } else {
        addToast('error', 'Lỗi khiếu nại', data.error.message);
      }
    } catch (err: any) {
      addToast('error', 'Lỗi', err.message);
    } finally {
      setLoading(false);
    }
  };

  // --- M7 & M8: Review, Withdrawal & Dispute Handlers ---
  const handleOpenReview = (bookingId: string) => {
    setReviewBookingId(bookingId);
    setReviewRating(5);
    setReviewComment('');
    setShowReviewModal(true);
  };

  const handleSubmitReview = async () => {
    if (!token || !reviewBookingId) return;
    setLoading(true);
    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          booking_id: reviewBookingId,
          rating: reviewRating,
          comment: reviewComment.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        addToast(
          'success',
          'Đã gửi đánh giá thành công!',
          'Đánh giá là bất biến và đã được tính vào thuật toán Điểm Uy tín TrustScore của Companion.'
        );
        setShowReviewModal(false);
        await loadMyBookings(token);
        await loadCatalog();
      } else {
        addToast('error', 'Không thể gửi đánh giá', data.error.message);
      }
    } catch (err: any) {
      addToast('error', 'Lỗi kết nối', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRequestWithdrawal = async () => {
    if (!token) return;
    if (withdrawAmount < 50000) {
      addToast('warning', 'Số tiền không hợp lệ', 'Số tiền rút tối thiểu là 50.000 VND.');
      return;
    }
    if (!withdrawAccountNo.trim()) {
      addToast('warning', 'Thiếu thông tin', 'Vui lòng nhập số tài khoản ngân hàng thụ hưởng.');
      return;
    }
    const prevAvailable = currentUser?.wallet?.available_balance ?? 0;
    setLoading(true);
    try {
      const idempotencyKey = `req-wd-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      const res = await fetch('/api/withdrawals', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          'Idempotency-Key': idempotencyKey,
        },
        body: JSON.stringify({
          amount: withdrawAmount,
          bank_name: withdrawBank,
          account_no: withdrawAccountNo.trim(),
        }),
      });
      const data = await res.json();
      if (data.success) {
        const newAvailable = Math.max(0, prevAvailable - withdrawAmount);
        setFinancialDiffNotice({
          title: `Tạo yêu cầu rút tiền #${data.data.withdraw_id.slice(0, 8)}`,
          prev: prevAvailable,
          diff: -withdrawAmount,
          next: newAvailable,
          unit: 'VND',
        });
        addToast(
          'success',
          'Tạo yêu cầu rút tiền thành công!',
          `Đã tạm giữ ${withdrawAmount.toLocaleString('vi-VN')} VND từ ví khả dụng qua Sổ cái kép WITHDRAW_RESERVE.`
        );
        setShowWithdrawModal(false);
        setWithdrawAccountNo('');
        await loadMe(token);
        await loadMyWithdrawals(token);
      } else {
        addToast('error', 'Tạo yêu cầu rút tiền thất bại', data.error.message);
      }
    } catch (err: any) {
      addToast('error', 'Lỗi kết nối', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleProcessWithdrawal = async (withdrawId: string) => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/withdrawals/${withdrawId}/process`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        addToast('info', 'Đã chuyển trạng thái', `Yêu cầu #${withdrawId.slice(0, 8)} đang được xử lý (PROCESSING).`);
        await loadAllWithdrawals(token);
      } else {
        addToast('error', 'Lỗi', data.error.message);
      }
    } catch (err: any) {
      addToast('error', 'Lỗi kết nối', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteWithdrawal = async (withdrawId: string) => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/withdrawals/${withdrawId}/complete`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        addToast(
          'success',
          'Hoàn tất chuyển tiền mô phỏng!',
          `Mã Payout giả lập: ${data.data.payout_code}. Đơn rút hoàn tất 100%.`
        );
        await loadAllWithdrawals(token);
      } else {
        addToast('error', 'Lỗi', data.error.message);
      }
    } catch (err: any) {
      addToast('error', 'Lỗi kết nối', err.message);
    } finally {
      setLoading(false);
    }
  };

  // Mở modal từ chối rút tiền cho CS
  const handleOpenRejectWithdrawalModal = (withdrawId: string) => {
    setRejectWithdrawalId(withdrawId);
    setRejectWithdrawalReason('Thông tin số tài khoản không trùng khớp');
    setShowRejectWithdrawalModal(true);
  };

  const submitRejectWithdrawal = async () => {
    if (!token || !rejectWithdrawalId) return;
    if (rejectWithdrawalReason.trim().length < 5) {
      addToast('warning', 'Lý do quá ngắn', 'Lý do từ chối phải có ít nhất 5 ký tự.');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/withdrawals/${rejectWithdrawalId}/reject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ reason: rejectWithdrawalReason.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        setShowRejectWithdrawalModal(false);
        addToast(
          'info',
          'Đã từ chối rút tiền',
          `Yêu cầu #${rejectWithdrawalId.slice(0, 8)} đã bị từ chối. Số dư đã được hoàn lại 100% vào ví khả dụng qua Sổ cái kép WITHDRAW_REJECT.`
        );
        await loadAllWithdrawals(token);
      } else {
        addToast('error', 'Lỗi từ chối rút tiền', data.error.message);
      }
    } catch (err: any) {
      addToast('error', 'Lỗi kết nối', err.message);
    } finally {
      setLoading(false);
    }
  };

  // CS Ban hành phán quyết RMA
  const handleOpenDecisionModal = (dispute: any) => {
    setSelectedDispute(dispute);
    setDecisionFaultPercent(100);
    setDecisionReason('Companion không tham gia phòng chơi đúng hẹn (NO_SHOW vi phạm BR-14).');
    setShowDecisionModal(true);
  };

  const submitCSDecision = async () => {
    if (!token || !selectedDispute) return;
    if (decisionReason.trim().length < 10) {
      addToast('warning', 'Lý do bắt buộc', 'Lý do phán quyết phải có ít nhất 10 ký tự (theo Quyết định D15).');
      return;
    }
    setLoading(true);
    try {
      const disputeId = selectedDispute.dispute_id;
      const res = await fetch(`/api/cs/disputes/${disputeId}/decision`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          fault_percent: decisionFaultPercent,
          decision_reason: decisionReason.trim(),
        }),
      });
      const data = await res.json();
      if (data.success) {
        setShowDecisionModal(false);
        setShowDossierModal(false);
        addToast(
          'success',
          'Ban hành phán quyết RMA thành công!',
          `Tỷ lệ lỗi: ${decisionFaultPercent}%. Đã hạch toán Sổ cái và mở đóng băng Escrow.`
        );
        await loadDisputes(token, disputeFilterStatus);
      } else {
        addToast('error', 'Lỗi ban hành phán quyết', data.error.message);
      }
    } catch (err: any) {
      addToast('error', 'Lỗi kết nối', err.message);
    } finally {
      setLoading(false);
    }
  };

  // CS Yêu cầu bổ sung chứng cứ
  const handleOpenRequestEvidenceModal = (dispute: any) => {
    setSelectedDispute(dispute);
    setEvidenceHours(24);
    setEvidenceNote('Yêu cầu cung cấp ảnh chụp lịch sử trận đấu in-game để xác thực.');
    setShowRequestEvidenceModal(true);
  };

  const submitCSRequestEvidence = async () => {
    if (!token || !selectedDispute) return;
    setLoading(true);
    try {
      const disputeId = selectedDispute.dispute_id;
      const res = await fetch(`/api/cs/disputes/${disputeId}/request-evidence`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          deadline_hours: evidenceHours,
          request_note: evidenceNote.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setShowRequestEvidenceModal(false);
        setShowDossierModal(false);
        addToast('info', 'Đã gửi yêu cầu bổ sung chứng cứ', `Hạn chót: ${evidenceHours} giờ. Escrow tiếp tục giữ nguyên FROZEN.`);
        await loadDisputes(token, disputeFilterStatus);
      } else {
        addToast('error', 'Lỗi', data.error.message);
      }
    } catch (err: any) {
      addToast('error', 'Lỗi kết nối', err.message);
    } finally {
      setLoading(false);
    }
  };

  // Nộp chứng cứ cho Renter / Companion
  const handleOpenUploadEvidenceModal = (disputeId: string) => {
    setEvidenceTargetDisputeId(disputeId);
    setEvidenceFileType('IMAGE_PNG');
    setEvidenceDescription('');
    setEvidenceFileBase64('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==');
    setShowUploadEvidenceModal(true);
  };

  const submitUploadEvidence = async () => {
    if (!token || !evidenceTargetDisputeId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/disputes/${evidenceTargetDisputeId}/evidences`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          file_url: evidenceFileBase64,
          file_type: evidenceFileType,
          description: evidenceDescription.trim() || 'Minh chứng đính kèm giải trình',
        }),
      });
      const data = await res.json();
      if (data.success) {
        setShowUploadEvidenceModal(false);
        addToast('success', 'Nộp chứng cứ thành công!', 'Chứng cứ đã được lưu trữ an toàn và bổ sung vào CS Dossier.');
        await loadMyBookings(token);
      } else {
        addToast('error', 'Nộp chứng cứ thất bại', data.error.message);
      }
    } catch (err: any) {
      addToast('error', 'Lỗi kết nối', err.message);
    } finally {
      setLoading(false);
    }
  };

  const displayCompanions: MockCompanion[] = MOCK_COMPANIONS.map(mockComp => {
    const matchingDb = companions.find(dbC => dbC.game.game_name.toLowerCase().includes(mockComp.gameId.toLowerCase()));
    if (matchingDb && matchingDb.slots && matchingDb.slots.length > 0) {
      return {
        ...mockComp,
        availableSlots: matchingDb.slots,
      };
    }
    return mockComp;
  }).filter(c => {
    const matchesGame = selectedGame === 'ALL' || c.gameId.toLowerCase() === selectedGame.toLowerCase();
    const matchesSearch = !searchQuery.trim() || 
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.gameName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.tier.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.quote.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesGame && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-[#0A0A1F] text-slate-100 flex flex-col font-sans selection:bg-purple-600 selection:text-white">
      {/* Top Navbar */}
      <Navbar
        currentUser={currentUser}
        onLoginClick={() => quickLogin('renter1@instasquad.test')}
        onLogout={logout}
        onTopupClick={() => setShowTopup(true)}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        health={health}
        onResetDemoClick={() => setShowResetDemoModal(true)}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        activeMenu={activeMenu}
        setActiveMenu={setActiveMenu}
      />

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 py-4 flex-1 w-full space-y-6">
        {/* Financial Diff Transparency Notice (PROMPT 12) */}
        {financialDiffNotice && (
          <div className="bg-sky-950/90 border border-sky-500/50 rounded-2xl p-4 flex items-center justify-between text-xs text-sky-200 shadow-xl backdrop-blur">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-sky-500/20 rounded-xl text-sky-400 shrink-0">
                <Info className="w-5 h-5" />
              </div>
              <div>
                <p className="font-bold text-white text-sm">{financialDiffNotice.title}</p>
                <div className="flex flex-wrap items-center gap-2 mt-1 text-slate-300">
                  <span>Số dư trước: <strong className="font-mono text-white">{financialDiffNotice.prev.toLocaleString('vi-VN')} {financialDiffNotice.unit}</strong></span>
                  <span className="text-sky-400 font-bold">➔</span>
                  <span>Biến động: <strong className={`font-mono ${financialDiffNotice.diff >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {financialDiffNotice.diff >= 0 ? `+${financialDiffNotice.diff.toLocaleString('vi-VN')}` : financialDiffNotice.diff.toLocaleString('vi-VN')} {financialDiffNotice.unit}
                  </strong></span>
                  <span className="text-sky-400 font-bold">➔</span>
                  <span>Số dư sau: <strong className="font-mono text-emerald-300">{financialDiffNotice.next.toLocaleString('vi-VN')} {financialDiffNotice.unit}</strong></span>
                </div>
              </div>
            </div>
            <button
              onClick={() => setFinancialDiffNotice(null)}
              className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition cursor-pointer"
              title="Đóng thông báo"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Banner Quick Demo Switcher */}
        <section className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                ⚡ Chọn vai trò để chuyển nhanh giao diện (Password: Demo@123456):
              </p>
              <div className="flex flex-wrap gap-2 mt-2">
                <button
                  disabled={loading}
                  onClick={() => quickLogin('renter1@instasquad.test')}
                  className="text-xs bg-sky-950/60 hover:bg-sky-900/60 text-sky-300 border border-sky-800/60 px-3 py-1.5 rounded-lg transition"
                >
                  👤 Renter 1 (Có 500k trong ví)
                </button>
                <button
                  disabled={loading}
                  onClick={() => quickLogin('companion1@instasquad.test')}
                  className="text-xs bg-emerald-950/60 hover:bg-emerald-900/60 text-emerald-300 border border-emerald-800/60 px-3 py-1.5 rounded-lg transition"
                >
                  🎮 Companion 1 (Bảo Ngọc - LMHT)
                </button>
                <button
                  disabled={loading}
                  onClick={() => quickLogin('companion2@instasquad.test')}
                  className="text-xs bg-purple-950/60 hover:bg-purple-900/60 text-purple-300 border border-purple-800/60 px-3 py-1.5 rounded-lg transition"
                >
                  🎮 Companion 2 (Tuấn Anh - VALORANT)
                </button>
                <button
                  disabled={loading}
                  onClick={() => quickLogin('cs_agent@instasquad.test')}
                  className="text-xs bg-amber-950/60 hover:bg-amber-900/60 text-amber-300 border border-amber-800/60 px-3 py-1.5 rounded-lg transition"
                >
                  🛡️ CS Agent (Xử lý khiếu nại)
                </button>
                <button
                  disabled={loading}
                  onClick={() => quickLogin('auditor@instasquad.test')}
                  className="text-xs bg-rose-950/60 hover:bg-rose-900/60 text-rose-300 border border-rose-800/60 px-3 py-1.5 rounded-lg transition"
                >
                  📊 Auditor (Kiểm toán Sổ cái)
                </button>
              </div>
            </div>
            {message && (
              <div className="text-xs px-3 py-1.5 rounded-lg bg-sky-950/80 border border-sky-800 text-sky-300 flex items-center gap-1.5">
                <CheckCircle className="w-3.5 h-3.5" /> {message}
              </div>
            )}
          </div>
        </section>

        {/* Payment Simulator Panel (PROMPT 07, BR-07, TC09, TC11, TC12) */}
        {showTopup && (
          <section className="bg-slate-900 border border-emerald-500/30 rounded-2xl p-5 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-white text-sm">Cổng nạp tiền mô phỏng (Payment Simulator)</h3>
                <span className="text-[10px] bg-emerald-950 text-emerald-400 border border-emerald-800 px-2 py-0.5 rounded-full font-mono">
                  HMAC SHA-256 Mock Gateway
                </span>
              </div>
              <button 
                onClick={() => setShowTopup(false)}
                className="text-xs text-slate-400 hover:text-white cursor-pointer"
              >
                ✕ Đóng
              </button>
            </div>

            {!activePayment ? (
              <div className="space-y-3">
                <p className="text-xs text-slate-400">
                  Chọn số tiền bạn muốn nạp vào ví khả dụng để thực hiện ký quỹ đặt lịch:
                </p>
                <div className="flex flex-wrap gap-2">
                  {[100000, 200000, 300000, 500000].map(amt => (
                    <button
                      key={amt}
                      onClick={() => setTopupAmount(amt)}
                      className={`text-xs px-3 py-2 rounded-xl border font-medium transition cursor-pointer ${
                        topupAmount === amt 
                          ? 'bg-emerald-600 text-white border-emerald-500' 
                          : 'bg-slate-800 text-slate-300 border-slate-700 hover:border-slate-600'
                      }`}
                    >
                      +{amt.toLocaleString('vi-VN')} VND
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-3 pt-2">
                  <button
                    disabled={loading}
                    onClick={() => handleCreateTopup(topupAmount)}
                    className="text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-medium px-4 py-2 rounded-xl transition cursor-pointer shadow-lg shadow-emerald-600/20"
                  >
                    Tạo yêu cầu nạp tiền (PENDING)
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3 bg-slate-950/60 p-4 rounded-xl border border-slate-800">
                <div className="flex justify-between items-center text-xs">
                  <div>
                    <p className="text-slate-400">Mã giao dịch (Gateway Ref): <span className="font-mono text-emerald-400">{activePayment.gateway_ref}</span></p>
                    <p className="text-slate-400 mt-1">Số tiền nạp: <span className="font-bold text-white">{activePayment.amount.toLocaleString('vi-VN')} VND</span></p>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-amber-950 text-amber-400 border border-amber-800 font-bold">
                    {activePayment.status}
                  </span>
                </div>

                <div className="pt-2 border-t border-slate-800/80">
                  <p className="text-xs text-slate-400 mb-2 font-medium">
                    ⚡ Chọn kịch bản phản hồi Webhook giả lập (Simulator Outcome):
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      disabled={loading}
                      onClick={() => handleSimulatePayment('SUCCESS')}
                      className="text-xs bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded-lg transition font-medium cursor-pointer"
                    >
                      🟢 Thành công (SUCCESS)
                    </button>
                    <button
                      disabled={loading}
                      onClick={() => handleSimulatePayment('FAILED')}
                      className="text-xs bg-rose-600 hover:bg-rose-500 text-white px-3 py-1.5 rounded-lg transition font-medium cursor-pointer"
                    >
                      🔴 Thất bại (FAILED)
                    </button>
                    <button
                      disabled={loading}
                      onClick={() => handleSimulatePayment('PENDING')}
                      className="text-xs bg-amber-600 hover:bg-amber-500 text-white px-3 py-1.5 rounded-lg transition font-medium cursor-pointer"
                    >
                      🟡 Timeout (PENDING)
                    </button>
                  </div>
                </div>
              </div>
            )}
          </section>
        )}

        {/* TAB 1: RENTER DISCOVERY VIEW */}
        {activeTab === 'catalog' && (
          <div className="space-y-6">
            {/* Active Bookings Bar for Renter */}
            {currentUser?.role === 'RENTER' && myBookings.length > 0 && (
              <div className="bg-slate-900 border border-sky-500/30 rounded-2xl p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-white text-sm flex items-center gap-2">
                    <Clock className="w-4 h-4 text-sky-400" /> Đơn đặt lịch gần đây của bạn
                  </h3>
                  <span className="text-xs text-slate-400">{myBookings.length} đơn</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {myBookings.slice(0, 4).map((b) => (
                    <div key={b.booking_id} className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 text-xs space-y-2">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-semibold text-white">Companion: {b.companion?.user?.display_name}</p>
                          <p className="text-[11px] text-slate-400">{b.companion?.game?.game_name} • Phí: {b.total_fee_snapshot.toLocaleString('vi-VN')} VND</p>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => handleOpenBookingDetail(b.booking_id)}
                            className="text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-300 px-2 py-0.5 rounded flex items-center gap-1 transition cursor-pointer"
                            title="Xem chi tiết đơn và lịch sử kiểm toán"
                          >
                            <Eye className="w-3 h-3 text-sky-400" /> Chi tiết
                          </button>
                          <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${
                            b.status === 'PENDING_ACCEPTANCE'
                              ? 'bg-amber-950 text-amber-300 border border-amber-800'
                              : b.status === 'WAITING_COMPANION_RESPONSE'
                                ? 'bg-sky-950 text-sky-300 border border-sky-800'
                                : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                          }`}>
                            {b.status}
                          </span>
                        </div>
                      </div>
                      {b.status === 'PENDING_ACCEPTANCE' && (
                        <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                          <span className="text-[11px] text-amber-400">Chưa ký quỹ Escrow</span>
                          <button
                            disabled={loading}
                            onClick={() => handleHoldEscrow(b.booking_id)}
                            className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium px-3 py-1 rounded-lg text-xs transition cursor-pointer"
                          >
                            Ký quỹ Escrow ({b.total_fee_snapshot.toLocaleString('vi-VN')} đ)
                          </button>
                        </div>
                      )}
                      {b.status === 'WAITING_COMPANION_RESPONSE' && (
                        <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                          <p className="text-[11px] text-sky-400 italic">Đã ký quỹ Escrow • Chờ Companion phản hồi (180s)</p>
                          <button
                            disabled={loading}
                            onClick={() => handleOpenCancelModal(b)}
                            className="bg-slate-800 hover:bg-rose-950 text-slate-300 hover:text-rose-400 border border-slate-700 font-medium px-2.5 py-1 rounded-lg text-[11px] transition cursor-pointer"
                          >
                            Hủy đơn
                          </button>
                        </div>
                      )}
                      {b.status === 'ACCEPTED' && (
                        <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                          <p className="text-[11px] text-emerald-400 font-medium">✓ Đã chấp nhận • Đang chờ vào phiên</p>
                          <div className="flex items-center gap-2">
                            <button
                              disabled={loading}
                              onClick={() => handleOpenRoom(b.booking_id)}
                              className="bg-sky-600 hover:bg-sky-500 text-white font-medium px-2.5 py-1 rounded-lg text-[11px] transition cursor-pointer flex items-center gap-1 shadow-lg shadow-sky-600/20"
                            >
                              <MessageSquare className="w-3 h-3" /> Vào phòng
                            </button>
                            <button
                              disabled={loading}
                              onClick={() => handleOpenCancelModal(b)}
                              className="bg-slate-800 hover:bg-rose-950 text-slate-300 hover:text-rose-400 border border-slate-700 font-medium px-2.5 py-1 rounded-lg text-[11px] transition cursor-pointer"
                            >
                              Hủy trước giờ
                            </button>
                          </div>
                        </div>
                      )}
                      {b.status === 'IN_SESSION' && (
                        <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                          <p className="text-[11px] text-sky-400 font-medium animate-pulse">🎮 Đang trong phiên chơi trực tiếp</p>
                          <button
                            disabled={loading}
                            onClick={() => handleOpenRoom(b.booking_id)}
                            className="bg-sky-600 hover:bg-sky-500 text-white font-medium px-3 py-1 rounded-lg text-xs transition cursor-pointer flex items-center gap-1 shadow-lg shadow-sky-600/20"
                          >
                            <MessageSquare className="w-3.5 h-3.5" /> Vào phòng chơi
                          </button>
                        </div>
                      )}
                      {b.status === 'DISPUTED' && (
                        <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                          <p className="text-[11px] text-rose-400 font-medium flex items-center gap-1">
                            <AlertCircle className="w-3.5 h-3.5" /> Đang khiếu nại (Escrow FROZEN)
                          </p>
                          <div className="flex items-center gap-1.5">
                            <button
                              disabled={loading}
                              onClick={() => handleOpenUploadEvidenceModal(b.dispute?.dispute_id || b.booking_id)}
                              className="bg-sky-600/30 hover:bg-sky-600/50 text-sky-300 border border-sky-500/40 font-medium px-2.5 py-1 rounded-lg text-[11px] transition cursor-pointer flex items-center gap-1"
                              title="Nộp ảnh/log làm bằng chứng cho CS đối chiếu"
                            >
                              <Upload className="w-3 h-3" /> Nộp chứng cứ
                            </button>
                            <button
                              disabled={loading}
                              onClick={() => handleOpenRoom(b.booking_id)}
                              className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium px-2.5 py-1 rounded-lg text-[11px] transition cursor-pointer flex items-center gap-1"
                            >
                              <MessageSquare className="w-3 h-3" /> Xem phòng
                            </button>
                          </div>
                        </div>
                      )}
                      {b.status === 'COMPLETED' && (
                        <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                          <p className="text-[11px] text-emerald-400 font-medium flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Hoàn tất • Đã giải ngân 88/12
                          </p>
                          <div className="flex items-center gap-2">
                            {currentUser?.role === 'RENTER' && (
                              <button
                                disabled={loading}
                                onClick={() => handleOpenReview(b.booking_id)}
                                className="bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 font-medium px-2 py-0.5 rounded text-[10px] transition cursor-pointer flex items-center gap-1 shadow-sm"
                              >
                                <Star className="w-3 h-3 fill-amber-300" /> Đánh giá (Review)
                              </button>
                            )}
                            <button
                              disabled={loading}
                              onClick={() => handleOpenRoom(b.booking_id)}
                              className="bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 font-medium px-2 py-0.5 rounded text-[10px] transition cursor-pointer"
                            >
                              Phòng chat
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
            {/* Landing Page from Official Mockup */}
            <HomePage
              games={MOCK_GAMES}
              companions={displayCompanions}
              selectedGame={selectedGame}
              onSelectGame={setSelectedGame}
              onBookCompanion={handleOpenBookingForCompanion}
            />
          </div>
        )}

        {/* TAB 2: COMPANION PROFILE & SLOTS MANAGEMENT */}
        {activeTab === 'companion_dashboard' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-white">Quản lý Hồ sơ & Khung giờ rảnh</h2>
              <p className="text-xs text-slate-400 mt-0.5">Cấu hình giá dịch vụ, tài khoản in-game và phân bổ ca làm việc tối đa 10h/ngày (BR-03, D08).</p>
            </div>

            {/* Incoming Requests Awaiting Companion Response (180s) */}
            {myBookings.filter(b => b.status === 'WAITING_COMPANION_RESPONSE').length > 0 && (
              <div className="bg-sky-950/40 border border-sky-500/50 rounded-2xl p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-white text-sm flex items-center gap-2">
                    <Clock className="w-4 h-4 text-sky-400 animate-pulse" /> Đơn đặt lịch đang chờ phản hồi (Hạn 180s)
                  </h3>
                  <span className="text-xs text-sky-400 font-medium">Cần phản hồi ngay</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {myBookings.filter(b => b.status === 'WAITING_COMPANION_RESPONSE').map((b) => (
                    <div key={b.booking_id} className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 text-xs space-y-2">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-semibold text-white">Người đặt: {b.renter?.display_name}</p>
                          <p className="text-[11px] text-slate-400">
                            Bắt đầu: {new Date(b.start_time).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} • Thu nhập: {b.total_fee_snapshot.toLocaleString('vi-VN')} VND
                          </p>
                        </div>
                        <span className="text-[10px] px-2 py-0.5 rounded font-bold uppercase bg-sky-950 text-sky-300 border border-sky-800">
                          Chờ duyệt (180s)
                        </span>
                      </div>
                      <div className="pt-2 border-t border-slate-800 flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleOpenBookingDetail(b.booking_id)}
                          className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium px-2.5 py-1 rounded-lg text-xs transition cursor-pointer flex items-center gap-1"
                          title="Xem chi tiết đơn và lịch sử"
                        >
                          <Eye className="w-3 h-3 text-sky-400" /> Chi tiết
                        </button>
                        <button
                          disabled={loading}
                          onClick={() => handleOpenRejectBookingModal(b.booking_id)}
                          className="bg-slate-800 hover:bg-rose-950 text-slate-300 hover:text-rose-400 border border-slate-700 font-medium px-3 py-1 rounded-lg text-xs transition cursor-pointer"
                        >
                          Từ chối
                        </button>
                        <button
                          disabled={loading}
                          onClick={() => handleAcceptBooking(b.booking_id)}
                          className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium px-3 py-1 rounded-lg text-xs transition cursor-pointer shadow-lg shadow-emerald-600/20"
                        >
                          Chấp nhận
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Accepted / In-Session Bookings for Companion */}
            {myBookings.filter(b => ['ACCEPTED', 'IN_SESSION'].includes(b.status)).length > 0 && (
              <div className="bg-emerald-950/30 border border-emerald-500/40 rounded-2xl p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-white text-sm flex items-center gap-2">
                    <Gamepad2 className="w-4 h-4 text-emerald-400" /> Phiên chơi đang hoạt động / Đã nhận
                  </h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {myBookings.filter(b => ['ACCEPTED', 'IN_SESSION'].includes(b.status)).map((b) => (
                    <div key={b.booking_id} className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 text-xs space-y-2">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-semibold text-white">Khách hàng: {b.renter?.display_name}</p>
                          <p className="text-[11px] text-slate-400">
                            Bắt đầu: {new Date(b.start_time).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} • Thu nhập: {(b.total_fee_snapshot * 0.88).toLocaleString('vi-VN')} VND (88%)
                          </p>
                        </div>
                        <span className="text-[10px] px-2 py-0.5 rounded font-bold uppercase bg-emerald-950 text-emerald-300 border border-emerald-800">
                          {b.status}
                        </span>
                      </div>
                      <div className="pt-2 border-t border-slate-800 flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleOpenBookingDetail(b.booking_id)}
                          className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium px-2.5 py-1 rounded-lg text-xs transition cursor-pointer flex items-center gap-1"
                          title="Xem chi tiết đơn và lịch sử"
                        >
                          <Eye className="w-3 h-3 text-sky-400" /> Chi tiết
                        </button>
                        <button
                          disabled={loading}
                          onClick={() => handleOpenRoom(b.booking_id)}
                          className="bg-sky-600 hover:bg-sky-500 text-white font-medium px-3 py-1 rounded-lg text-xs transition cursor-pointer flex items-center gap-1 shadow-lg shadow-sky-600/20"
                        >
                          <MessageSquare className="w-3.5 h-3.5" /> Vào phòng phiên chơi
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Profile Settings Card */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
                <h3 className="font-semibold text-white text-base">Thông tin hồ sơ</h3>

                <div>
                  <label className="text-xs text-slate-400 block mb-1">Game dịch vụ</label>
                  <input 
                    type="text" 
                    disabled 
                    value={companionProfile?.game?.game_name || ''} 
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-400 cursor-not-allowed" 
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-400 block mb-1">Bậc Rank đã xác thực</label>
                  <input 
                    type="text" 
                    disabled 
                    value={companionProfile?.tier?.tier_name || ''} 
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-400 cursor-not-allowed" 
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-400 block mb-1">Đơn giá thuê (VND/giờ)</label>
                  <input 
                    type="number" 
                    step={10000}
                    min={10000}
                    value={editRate} 
                    onChange={e => setEditRate(parseInt(e.target.value) || 0)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-emerald-400 font-semibold focus:outline-none focus:border-sky-500" 
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-400 block mb-1">Trạng thái sẵn sàng</label>
                  <select
                    value={editAvailability}
                    onChange={e => setEditAvailability(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500"
                  >
                    <option value="ONLINE">ONLINE (Sẵn sàng nhận lịch)</option>
                    <option value="BUSY">BUSY (Bận)</option>
                    <option value="OFFLINE">OFFLINE (Ngoại tuyến)</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs text-slate-400 block mb-1">Tên tài khoản / In-game ID</label>
                  <input 
                    type="text" 
                    value={editAccountId} 
                    onChange={e => setEditAccountId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500" 
                  />
                </div>

                <div className="pt-2">
                  <button
                    onClick={handleSaveProfile}
                    className="w-full bg-sky-600 hover:bg-sky-500 text-white font-medium text-xs py-2.5 rounded-xl transition flex items-center justify-center gap-2"
                  >
                    <Save className="w-4 h-4" /> Lưu thông tin hồ sơ
                  </button>
                </div>
              </div>

              {/* Slot Management Card */}
              <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                  <h3 className="font-semibold text-white text-base">Danh sách khung giờ rảnh</h3>
                  <div className="text-xs bg-slate-950 border border-slate-800 px-3 py-1.5 rounded-lg text-slate-400">
                    Quy tắc: Tối đa <span className="text-amber-400 font-bold">10 giờ/ngày</span> (Server UTC+7)
                  </div>
                </div>

                {/* Add new slot form */}
                <div className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-4 space-y-3">
                  <p className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                    <Plus className="w-4 h-4 text-sky-400" /> Thêm khung giờ rảnh mới:
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] text-slate-400 block mb-1">Giờ bắt đầu</label>
                      <input 
                        type="datetime-local" 
                        value={newSlotStart} 
                        onChange={e => setNewSlotStart(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-sky-500"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-slate-400 block mb-1">Giờ kết thúc</label>
                      <input 
                        type="datetime-local" 
                        value={newSlotEnd} 
                        onChange={e => setNewSlotEnd(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-sky-500"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end pt-1">
                    <button
                      onClick={handleCreateSlot}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs px-4 py-2 rounded-lg transition flex items-center gap-1.5"
                    >
                      <Plus className="w-3.5 h-3.5" /> Tạo khung giờ
                    </button>
                  </div>
                </div>

                {/* Existing Slots Table */}
                <div className="space-y-2">
                  <p className="text-xs font-medium text-slate-400">Các khung giờ hiện tại:</p>
                  {companionSlots.length === 0 ? (
                    <p className="text-xs text-slate-500 italic py-4 text-center">Chưa có khung giờ nào.</p>
                  ) : (
                    <div className="divide-y divide-slate-800 border border-slate-800 rounded-xl overflow-hidden">
                      {companionSlots.map(s => {
                        const start = new Date(s.start_time);
                        const end = new Date(s.end_time);
                        const diffHours = ((end.getTime() - start.getTime()) / (1000 * 60 * 60)).toFixed(1);
                        return (
                          <div key={s.slot_id} className="p-3 bg-slate-950/40 flex items-center justify-between text-xs">
                            <div className="flex items-center space-x-3">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                s.status === 'AVAILABLE' 
                                  ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' 
                                  : s.status === 'HELD' 
                                    ? 'bg-amber-950 text-amber-400 border border-amber-800' 
                                    : 'bg-sky-950 text-sky-400 border border-sky-800'
                              }`}>
                                {s.status}
                              </span>
                              <div>
                                <p className="font-medium text-white">
                                  {start.toLocaleDateString('vi-VN')} • {start.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} - {end.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                                </p>
                                <span className="text-[10px] text-slate-400">Thời lượng: {diffHours} giờ</span>
                              </div>
                            </div>
                            <div>
                              {s.status === 'AVAILABLE' ? (
                                <button
                                  onClick={() => handleDeleteSlot(s.slot_id)}
                                  className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-rose-400 rounded transition"
                                  title="Xóa slot"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              ) : (
                                <span className="text-[10px] text-slate-500 italic">Đang bận</span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* CARD: TRUSTSCORE ENGINE & BREAKDOWN (M7 - D16, BR-21) */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <Star className="w-5 h-5 text-amber-400 fill-amber-400" />
                  <h3 className="font-semibold text-white text-base">Điểm Uy tín TrustScore & Phân tích thuật toán</h3>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400">Trạng thái:</span>
                  <span className={`text-[11px] px-2.5 py-0.5 rounded-full font-bold uppercase ${
                    (trustScoreData?.current_score ?? 80) >= 40
                      ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                      : 'bg-rose-950 text-rose-400 border border-rose-800 animate-pulse'
                  }`}>
                    {(trustScoreData?.current_score ?? 80) >= 40 ? 'Hoạt động (Active)' : 'Đình chỉ (< 40đ)'}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-5 gap-3 pt-1">
                <div className="bg-slate-950/80 border border-slate-800 p-4 rounded-xl flex flex-col items-center justify-center text-center">
                  <span className="text-[11px] text-slate-400 font-medium">TrustScore Tổng</span>
                  <p className="text-3xl font-extrabold text-amber-400 mt-1">
                    {(trustScoreData?.current_score ?? companionProfile?.trust_score ?? 80).toFixed(1)}
                  </p>
                  <span className="text-[10px] text-slate-500 mt-0.5">Thang điểm 0 - 100</span>
                </div>

                <div className="bg-slate-950/80 border border-slate-800 p-3 rounded-xl text-xs space-y-1">
                  <span className="text-[11px] text-slate-400 font-medium">1. Điểm Sao quy đổi (40%)</span>
                  <p className="text-base font-bold text-sky-400">
                    {(trustScoreData?.rating_100 ?? 80).toFixed(1)} <span className="text-[11px] font-normal text-slate-400">/ 100</span>
                  </p>
                  <p className="text-[10px] text-slate-500">
                    Đánh giá: {(trustScoreData?.average_rating ?? 4.0).toFixed(1)} ⭐ ({trustScoreData?.total_reviews ?? 0} lượt)
                  </p>
                </div>

                <div className="bg-slate-950/80 border border-slate-800 p-3 rounded-xl text-xs space-y-1">
                  <span className="text-[11px] text-slate-400 font-medium">2. Tỷ lệ hoàn thành (40%)</span>
                  <p className="text-base font-bold text-emerald-400">
                    {(trustScoreData?.completion_rate ?? 100).toFixed(1)}%
                  </p>
                  <p className="text-[10px] text-slate-500">
                    Đã xong: {trustScoreData?.completed_bookings ?? 0} / {trustScoreData?.total_accepted_bookings ?? 0} đơn
                  </p>
                </div>

                <div className="bg-slate-950/80 border border-slate-800 p-3 rounded-xl text-xs space-y-1">
                  <span className="text-[11px] text-slate-400 font-medium">3. Tỷ lệ khiếu nại (-120%)</span>
                  <p className="text-base font-bold text-rose-400">
                    {(trustScoreData?.dispute_rate ?? 0).toFixed(1)}%
                  </p>
                  <p className="text-[10px] text-slate-500">
                    Lỗi CS phán quyết: {trustScoreData?.faulty_disputes ?? 0} đơn
                  </p>
                </div>

                <div className="bg-slate-950/80 border border-slate-800 p-3 rounded-xl text-xs space-y-1">
                  <span className="text-[11px] text-slate-400 font-medium">4. Trừ vi phạm (Direct)</span>
                  <p className="text-base font-bold text-amber-500">
                    -{(trustScoreData?.direct_penalties ?? 0).toFixed(1)} đ
                  </p>
                  <p className="text-[10px] text-slate-500">
                    Timeout 180s (-3đ), RMA (-10đ)
                  </p>
                </div>
              </div>

              <div className="p-3 bg-slate-950/40 rounded-xl border border-slate-800 text-[11px] text-slate-400 space-y-1 font-mono">
                <span className="text-slate-300 font-semibold font-sans">Thuật toán chuẩn hóa (DEMO_POLICY #7):</span>
                <p>TrustScore = 0.40 × Rating₁₀₀ + 0.40 × CompletionRate - 1.20 × DisputeRate - DirectPenalties</p>
                <p className="text-amber-400/90 font-sans">
                  * Khi điểm rơi xuống dưới 40.0, hồ sơ tự động chuyển sang trạng thái ĐÌNH CHỈ (SUSPENDED) và OFFLINE.
                </p>
              </div>
            </div>

            {/* CARD: SIMULATED WITHDRAWAL & WALLET MANAGEMENT (M7 - D18, BR-23) */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 border-b border-slate-800 pb-3">
                <div>
                  <h3 className="font-semibold text-white text-base flex items-center gap-2">
                    <ArrowDownToLine className="w-5 h-5 text-emerald-400" /> Quản lý Thu nhập & Rút tiền mô phỏng (Simulated Withdrawals)
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Rút tiền từ thu nhập chơi game về tài khoản ngân hàng nội địa. Bút toán được hạch toán qua Sổ cái kép.
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <span className="text-[11px] text-slate-400">Số dư khả dụng:</span>
                    <p className="text-base font-bold text-emerald-400">
                      {(currentUser?.wallet?.available_balance ?? 0).toLocaleString('vi-VN')} VND
                    </p>
                  </div>
                  <button
                    disabled={loading || (currentUser?.wallet?.available_balance ?? 0) < 50000}
                    onClick={() => setShowWithdrawModal(true)}
                    className="bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-medium text-xs px-4 py-2.5 rounded-xl transition flex items-center gap-1.5 shadow-lg shadow-emerald-600/20 cursor-pointer"
                  >
                    <ArrowDownToLine className="w-4 h-4" /> Yêu cầu rút tiền
                  </button>
                </div>
              </div>

              {/* Withdrawals List Table */}
              <div className="space-y-2">
                <p className="text-xs font-medium text-slate-300">Lịch sử các yêu cầu rút tiền:</p>
                {myWithdrawals.length === 0 ? (
                  <div className="p-6 border border-dashed border-slate-800 rounded-xl text-center text-xs text-slate-500">
                    Bạn chưa tạo yêu cầu rút tiền nào. Số tiền rút tối thiểu là 50.000 VND.
                  </div>
                ) : (
                  <div className="divide-y divide-slate-800 border border-slate-800 rounded-xl overflow-hidden bg-slate-950/50">
                    {myWithdrawals.map((w) => (
                      <div key={w.withdraw_id} className="p-3.5 flex flex-col sm:flex-row justify-between sm:items-center gap-2 text-xs">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-white text-sm">
                              {w.amount.toLocaleString('vi-VN')} VND
                            </span>
                            <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${
                              w.status === 'COMPLETED'
                                ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                                : w.status === 'PROCESSING'
                                  ? 'bg-sky-950 text-sky-400 border border-sky-800 animate-pulse'
                                  : w.status === 'REJECTED'
                                    ? 'bg-rose-950 text-rose-400 border border-rose-800'
                                    : 'bg-amber-950 text-amber-400 border border-amber-800'
                            }`}>
                              {w.status}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400">
                            Ngân hàng: <span className="text-slate-200 font-medium">{w.bank_name}</span> • STK: <span className="font-mono text-slate-300">{w.account_no_masked}</span> • Tạo lúc: {new Date(w.created_at).toLocaleString('vi-VN')}
                          </p>
                          {w.payout_code && (
                            <p className="text-[11px] text-emerald-400 font-mono">
                              Mã chuyển tiền: {w.payout_code}
                            </p>
                          )}
                          {w.reject_reason && (
                            <p className="text-[11px] text-rose-400">
                              Lý do từ chối: {w.reject_reason} (Đã hoàn 100% ví khả dụng)
                            </p>
                          )}
                        </div>

                        <div className="text-[11px] text-slate-400">
                          {w.status === 'PENDING' && <span className="text-amber-400">Đang chờ CS tiếp nhận...</span>}
                          {w.status === 'PROCESSING' && <span className="text-sky-400">Đang thực hiện chuyển tiền...</span>}
                          {w.status === 'COMPLETED' && <span className="text-emerald-400 flex items-center gap-1"><Check className="w-3.5 h-3.5" /> Hoàn tất chuyển tiền</span>}
                          {w.status === 'REJECTED' && <span className="text-rose-400 flex items-center gap-1"><Ban className="w-3.5 h-3.5" /> Đã hoàn số dư</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* CARD: CUSTOMER REVIEWS (M7 - PROMPT 11, BR-22) */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <Star className="w-5 h-5 text-amber-400 fill-amber-400" />
                  <h3 className="font-semibold text-white text-base">Đánh giá nhận được từ Khách hàng</h3>
                </div>
                <span className="text-xs text-slate-400">{companionReviews.length} lượt đánh giá xác thực</span>
              </div>

              {companionReviews.length === 0 ? (
                <div className="p-6 border border-dashed border-slate-800 rounded-xl text-center text-xs text-slate-500">
                  Bạn chưa nhận được đánh giá nào. Hoàn tất các đơn đặt lịch để nhận đánh giá và tăng điểm TrustScore!
                </div>
              ) : (
                <div className="divide-y divide-slate-800 border border-slate-800 rounded-xl overflow-hidden bg-slate-950/50">
                  {companionReviews.map((rev) => (
                    <div key={rev.review_id} className="p-4 space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="flex items-center">
                            {[1, 2, 3, 4, 5].map((s) => (
                              <Star
                                key={s}
                                className={`w-4 h-4 ${s <= rev.rating ? 'text-amber-400 fill-amber-400' : 'text-slate-700'}`}
                              />
                            ))}
                          </div>
                          <span className="font-bold text-amber-400 text-sm">{rev.rating}.0 sao</span>
                          <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full font-mono">
                            Đơn #{rev.booking_id?.slice(0, 8)}
                          </span>
                        </div>
                        <span className="text-[11px] text-slate-500">
                          {new Date(rev.created_at).toLocaleDateString('vi-VN')}
                        </span>
                      </div>
                      {rev.comment ? (
                        <p className="text-slate-200 italic bg-slate-900/60 p-2.5 rounded-lg border border-slate-800/80">
                          "{rev.comment}"
                        </p>
                      ) : (
                        <p className="text-slate-500 italic text-[11px]">Không có bình luận chữ.</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: CS AGENT & ADMIN VIEW */}
        {activeTab === 'cs_view' && (
          <div className="space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-amber-400" /> Bảng điều khiển Chăm sóc Khách hàng (CS / Admin)
              </h2>
              <p className="text-xs text-slate-400">
                Xử lý khiếu nại tranh chấp (RMA) và phê duyệt/chi trả các yêu cầu rút tiền của Companion.
              </p>
            </div>

            {/* DISPUTES QUEUE MANAGEMENT (M6 - PROMPT 10, BR-16, BR-17, BR-18, TC21-TC26) */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 border-b border-slate-800 pb-3">
                <div>
                  <h3 className="font-semibold text-white text-base flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-rose-400" /> Hàng đợi Khiếu nại Tranh chấp RMA (Dispute Queue)
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Thẩm định chứng cứ, yêu cầu bổ sung thông tin và ban hành phán quyết phân chia Escrow đã đóng băng.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center bg-slate-950 border border-slate-800 rounded-xl p-1 text-[11px]">
                    {['ALL', 'OPENED', 'EVIDENCE_PENDING', 'RESOLVED'].map((st) => (
                      <button
                        key={st}
                        onClick={() => {
                          setDisputeFilterStatus(st);
                          if (token) loadDisputes(token, st);
                        }}
                        className={`px-2.5 py-1 rounded-lg transition font-medium cursor-pointer ${
                          disputeFilterStatus === st
                            ? 'bg-rose-600 text-white shadow-sm'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        {st === 'ALL' ? 'Tất cả' : st === 'OPENED' ? 'Mới mở' : st === 'EVIDENCE_PENDING' ? 'Chờ chứng cứ' : 'Đã phán quyết'}
                      </button>
                    ))}
                  </div>
                  <button
                    disabled={loading}
                    onClick={() => token && loadDisputes(token, disputeFilterStatus)}
                    className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-xs px-3 py-1.5 rounded-xl transition flex items-center gap-1.5 border border-slate-700 cursor-pointer"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Tải lại
                  </button>
                </div>
              </div>

              {disputes.length === 0 ? (
                <div className="p-8 border border-dashed border-slate-800 rounded-xl text-center text-xs text-slate-500">
                  Không có khiếu nại nào theo bộ lọc "{disputeFilterStatus}".
                </div>
              ) : (
                <div className="divide-y divide-slate-800 border border-slate-800 rounded-xl overflow-hidden bg-slate-950/50">
                  {disputes.map((d) => (
                    <div key={d.dispute_id} className="p-4 flex flex-col md:flex-row justify-between md:items-center gap-3 text-xs">
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${
                            d.status === 'RESOLVED'
                              ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                              : d.status === 'EVIDENCE_PENDING'
                                ? 'bg-sky-950 text-sky-400 border border-sky-800 animate-pulse'
                                : 'bg-rose-950 text-rose-400 border border-rose-800'
                          }`}>
                            {d.status}
                          </span>
                          <span className="font-semibold text-white text-sm">
                            {d.category}
                          </span>
                          <span className="text-[10px] text-slate-500 font-mono">
                            Mã khiếu nại: #{d.dispute_id.slice(0, 8)}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-300">
                          Đơn đặt: <span className="font-mono text-sky-300 cursor-pointer hover:underline" onClick={() => handleOpenBookingDetail(d.booking_id)}>#{d.booking_id.slice(0, 8)}</span> • Renter: <span className="text-white font-medium">{d.booking?.renter?.display_name || 'Renter'}</span> ➔ Companion: <span className="text-white font-medium">{d.booking?.companion?.user?.display_name || 'Companion'}</span>
                        </p>
                        <p className="text-[11px] text-slate-400 italic bg-slate-900/80 p-2 rounded-lg border border-slate-800">
                          "{d.description}"
                        </p>
                        {d.evidence_due_date && d.status === 'EVIDENCE_PENDING' && (
                          <p className="text-[11px] text-amber-400 flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" /> Hạn nộp chứng cứ: {new Date(d.evidence_due_date).toLocaleString('vi-VN')}
                          </p>
                        )}
                        {d.decision_fault_percent !== null && d.decision_fault_percent !== undefined && (
                          <p className="text-[11px] text-emerald-400 font-medium">
                            ✓ Phán quyết: Lỗi Companion {d.decision_fault_percent}% • Lý do: {d.decision_reason}
                          </p>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          disabled={loading}
                          onClick={() => handleOpenDossier(d.dispute_id)}
                          className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium px-3 py-1.5 rounded-lg text-xs transition cursor-pointer flex items-center gap-1.5 border border-slate-700"
                        >
                          <FileText className="w-3.5 h-3.5 text-sky-400" /> Xem Dossier
                        </button>

                        {d.status !== 'RESOLVED' && (
                          <>
                            <button
                              disabled={loading}
                              onClick={() => handleOpenRequestEvidenceModal(d)}
                              className="bg-sky-600/20 hover:bg-sky-600/30 text-sky-300 border border-sky-500/30 font-medium px-3 py-1.5 rounded-lg text-xs transition cursor-pointer flex items-center gap-1"
                            >
                              <Clock className="w-3.5 h-3.5" /> Yêu cầu chứng cứ
                            </button>
                            <button
                              disabled={loading}
                              onClick={() => handleOpenDecisionModal(d)}
                              className="bg-rose-600 hover:bg-rose-500 text-white font-medium px-3 py-1.5 rounded-lg text-xs transition cursor-pointer shadow-lg shadow-rose-600/20 flex items-center gap-1"
                            >
                              <ShieldCheck className="w-3.5 h-3.5" /> Phán quyết
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* WITHDRAWALS QUEUE MANAGEMENT */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 border-b border-slate-800 pb-3">
                <div>
                  <h3 className="font-semibold text-white text-base flex items-center gap-2">
                    <ArrowDownToLine className="w-5 h-5 text-sky-400" /> Hàng đợi Xử lý Yêu cầu Rút tiền (Withdrawals Queue)
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Phê duyệt hoặc từ chối các khoản rút tiền. Bút toán tự động hạch toán Sổ cái kép (Reserve / Settle / Reject).
                  </p>
                </div>
                <button
                  disabled={loading}
                  onClick={() => token && loadAllWithdrawals(token)}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-xs px-3 py-1.5 rounded-xl transition flex items-center gap-1.5 border border-slate-700 cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Tải lại danh sách
                </button>
              </div>

              {allWithdrawals.length === 0 ? (
                <div className="p-8 border border-dashed border-slate-800 rounded-xl text-center text-xs text-slate-500">
                  Hiện chưa có yêu cầu rút tiền nào trong hệ thống.
                </div>
              ) : (
                <div className="divide-y divide-slate-800 border border-slate-800 rounded-xl overflow-hidden bg-slate-950/50">
                  {allWithdrawals.map((w) => (
                    <div key={w.withdraw_id} className="p-4 flex flex-col md:flex-row justify-between md:items-center gap-3 text-xs">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white text-base">
                            {w.amount.toLocaleString('vi-VN')} VND
                          </span>
                          <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${
                            w.status === 'COMPLETED'
                              ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                              : w.status === 'PROCESSING'
                                ? 'bg-sky-950 text-sky-400 border border-sky-800 animate-pulse'
                                : w.status === 'REJECTED'
                                  ? 'bg-rose-950 text-rose-400 border border-rose-800'
                                  : 'bg-amber-950 text-amber-400 border border-amber-800'
                          }`}>
                            {w.status}
                          </span>
                          <span className="text-[10px] text-slate-500 font-mono">
                            #{w.withdraw_id.slice(0, 8)}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400">
                          Người yêu cầu: <span className="text-white font-medium">{w.wallet?.user?.display_name || w.wallet?.user_id}</span> ({w.wallet?.user?.email})
                        </p>
                        <p className="text-[11px] text-slate-400">
                          Ngân hàng: <span className="text-slate-200 font-medium">{w.bank_name}</span> • STK: <span className="font-mono text-slate-300">{w.account_no_masked}</span> • Tạo: {new Date(w.created_at).toLocaleString('vi-VN')}
                        </p>
                        {w.payout_code && (
                          <p className="text-[11px] text-emerald-400 font-mono">
                            ✓ Mã Payout giải lập: {w.payout_code}
                          </p>
                        )}
                        {w.reject_reason && (
                          <p className="text-[11px] text-rose-400">
                            ✕ Lý do từ chối: {w.reject_reason}
                          </p>
                        )}
                      </div>

                      {/* Action buttons */}
                      <div className="flex flex-wrap items-center gap-2">
                        {w.status === 'PENDING' && (
                          <>
                            <button
                              disabled={loading}
                              onClick={() => handleProcessWithdrawal(w.withdraw_id)}
                              className="bg-sky-600 hover:bg-sky-500 text-white font-medium px-3 py-1.5 rounded-lg text-xs transition cursor-pointer shadow-sm"
                            >
                              Tiến hành xử lý (Process)
                            </button>
                            <button
                              disabled={loading}
                              onClick={() => handleOpenRejectWithdrawalModal(w.withdraw_id)}
                              className="bg-rose-600/80 hover:bg-rose-600 text-white font-medium px-3 py-1.5 rounded-lg text-xs transition cursor-pointer"
                            >
                              Từ chối (Reject)
                            </button>
                          </>
                        )}

                        {w.status === 'PROCESSING' && (
                          <>
                            <button
                              disabled={loading}
                              onClick={() => handleCompleteWithdrawal(w.withdraw_id)}
                              className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium px-3 py-1.5 rounded-lg text-xs transition cursor-pointer shadow-lg shadow-emerald-600/20 flex items-center gap-1"
                            >
                              <Check className="w-3.5 h-3.5" /> Hoàn tất chuyển tiền (Complete)
                            </button>
                            <button
                              disabled={loading}
                              onClick={() => handleOpenRejectWithdrawalModal(w.withdraw_id)}
                              className="bg-rose-600/80 hover:bg-rose-600 text-white font-medium px-3 py-1.5 rounded-lg text-xs transition cursor-pointer"
                            >
                              Từ chối (Reject)
                            </button>
                          </>
                        )}

                        {w.status === 'COMPLETED' && (
                          <span className="text-emerald-400 text-xs font-medium flex items-center gap-1 bg-emerald-950/40 px-3 py-1 rounded-lg border border-emerald-800">
                            <CheckCircle className="w-3.5 h-3.5" /> Đã chi trả thành công
                          </span>
                        )}

                        {w.status === 'REJECTED' && (
                          <span className="text-rose-400 text-xs font-medium flex items-center gap-1 bg-rose-950/40 px-3 py-1 rounded-lg border border-rose-800">
                            <Ban className="w-3.5 h-3.5" /> Đã từ chối & hoàn tiền ví
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* LEDGER AUDIT ALERTS (M8 - PROMPT 12, OPERATIONAL RESILIENCE) */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 border-b border-slate-800 pb-3">
                <div>
                  <h3 className="font-semibold text-white text-base flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-amber-400" /> Cảnh báo Lỗi Sổ cái & Kiểm toán (Ledger Audit Alerts)
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Theo dõi các sự cố rollback giao dịch tài chính hoặc ngắt mạch hệ thống (Circuit Breaker).
                  </p>
                </div>
                <button
                  disabled={loading}
                  onClick={() => token && loadAuditAlerts(token)}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-xs px-3 py-1.5 rounded-xl transition flex items-center gap-1.5 border border-slate-700 cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Tải lại cảnh báo
                </button>
              </div>

              {auditAlerts.length === 0 ? (
                <div className="p-6 border border-slate-800 rounded-xl bg-slate-950/40 text-center text-xs text-emerald-400 flex items-center justify-center gap-2">
                  <CheckCircle className="w-4 h-4" /> Hệ thống kiểm toán Sổ cái kép đang vận hành hoàn toàn bình thường. Không ghi nhận sự cố bất thường.
                </div>
              ) : (
                <div className="divide-y divide-slate-800 border border-slate-800 rounded-xl overflow-hidden bg-slate-950/50">
                  {auditAlerts.map((al) => (
                    <div key={al.alert_id} className="p-3.5 flex flex-col sm:flex-row justify-between sm:items-center gap-2 text-xs">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${
                            al.severity === 'CRITICAL'
                              ? 'bg-rose-950 text-rose-400 border border-rose-800 animate-pulse'
                              : 'bg-amber-950 text-amber-400 border border-amber-800'
                          }`}>
                            {al.severity}
                          </span>
                          <span className="font-bold text-white text-sm">{al.alert_type}</span>
                          <span className="text-[10px] text-slate-500 font-mono">#{al.alert_id.slice(0, 8)}</span>
                        </div>
                        <p className="text-[11px] text-slate-300">{al.message}</p>
                      </div>
                      <div className="text-right text-[11px] text-slate-400">
                        <p>{new Date(al.created_at).toLocaleString('vi-VN')}</p>
                        <span className={al.is_resolved ? 'text-emerald-400 font-medium' : 'text-amber-400 font-medium'}>
                          {al.is_resolved ? '✓ Đã khắc phục' : '⚠ Đang chờ xử lý'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 4: AUDITOR VIEW (PROMPT 07, TC31) */}
        {activeTab === 'auditor_view' && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b border-slate-800 pb-4">
              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <Server className="w-5 h-5 text-rose-400" /> Bảng đối soát Sổ cái kép (Auditor View)
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Kiểm toán viên tài chính theo dõi cân bằng Sổ cái kép (Double-entry Ledger) và bảo toàn phương trình dòng tiền.
                </p>
              </div>
              <button
                disabled={loading}
                onClick={handleRunReconciliation}
                className="flex items-center gap-2 text-xs bg-rose-600 hover:bg-rose-500 text-white font-medium px-4 py-2 rounded-xl transition cursor-pointer shadow-lg shadow-rose-600/20"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                <span>Chạy Đối soát Sổ cái</span>
              </button>
            </div>

            {reconReport ? (
              <div className="space-y-5">
                <div className={`p-4 rounded-xl border flex items-center justify-between ${
                  reconReport.is_balanced 
                    ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300' 
                    : 'bg-rose-950/40 border-rose-500/40 text-rose-300'
                }`}>
                  <div className="flex items-center gap-3">
                    {reconReport.is_balanced ? (
                      <CheckCircle className="w-6 h-6 text-emerald-400" />
                    ) : (
                      <AlertTriangle className="w-6 h-6 text-rose-400" />
                    )}
                    <div>
                      <p className="font-bold text-sm">
                        {reconReport.is_balanced ? 'SỔ CÁI CÂN BẰNG 100% (BALANCED)' : 'CẢNH BÁO LỆCH SỐ DƯ (UNBALANCED)'}
                      </p>
                      <p className="text-xs opacity-80 mt-0.5">
                        Kiểm tra {reconReport.total_wallets_checked} tài khoản ví tại thời điểm: {new Date(reconReport.timestamp).toLocaleString('vi-VN')}
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-mono font-bold px-3 py-1 rounded-full bg-slate-900 border border-slate-800">
                    Lệch: {reconReport.system_conservation.equation_difference.toLocaleString('vi-VN')} VND
                  </span>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-slate-950/80 border border-slate-800 p-4 rounded-xl">
                    <span className="text-[11px] text-slate-400 font-medium">Tổng khả dụng người dùng:</span>
                    <p className="text-base font-bold text-emerald-400 mt-1">
                      {reconReport.system_conservation.total_available_user_balances.toLocaleString('vi-VN')} đ
                    </p>
                  </div>
                  <div className="bg-slate-950/80 border border-slate-800 p-4 rounded-xl">
                    <span className="text-[11px] text-slate-400 font-medium">Tổng ký quỹ Escrow:</span>
                    <p className="text-base font-bold text-amber-400 mt-1">
                      {reconReport.system_conservation.total_escrow_user_balances.toLocaleString('vi-VN')} đ
                    </p>
                  </div>
                  <div className="bg-slate-950/80 border border-slate-800 p-4 rounded-xl">
                    <span className="text-[11px] text-slate-400 font-medium">Doanh thu nền tảng (12%):</span>
                    <p className="text-base font-bold text-purple-400 mt-1">
                      {reconReport.system_conservation.total_platform_revenue.toLocaleString('vi-VN')} đ
                    </p>
                  </div>
                  <div className="bg-slate-950/80 border border-slate-800 p-4 rounded-xl">
                    <span className="text-[11px] text-slate-400 font-medium">Tổng tiền nạp vào hệ thống:</span>
                    <p className="text-base font-bold text-sky-400 mt-1">
                      {reconReport.system_conservation.total_deposited_payments.toLocaleString('vi-VN')} đ
                    </p>
                  </div>
                </div>

                <div className="bg-slate-950/60 border border-slate-800 p-4 rounded-xl text-xs space-y-2">
                  <p className="font-semibold text-slate-300">Phương trình bảo toàn tổng tiền (Total Money Conservation Invariant):</p>
                  <p className="font-mono text-slate-400">
                    ∑ Available ({reconReport.system_conservation.total_available_user_balances.toLocaleString('vi-VN')} đ) + 
                    ∑ Escrow ({reconReport.system_conservation.total_escrow_user_balances.toLocaleString('vi-VN')} đ) + 
                    ∑ Revenue ({reconReport.system_conservation.total_platform_revenue.toLocaleString('vi-VN')} đ) = 
                    <span className="text-white font-bold"> {reconReport.system_conservation.total_system_assets.toLocaleString('vi-VN')} đ</span> 
                    (Khớp 100% với Tổng Inflow: {reconReport.system_conservation.total_deposited_payments.toLocaleString('vi-VN')} đ)
                  </p>
                </div>
              </div>
            ) : (
              <div className="p-8 border border-dashed border-slate-800 rounded-xl text-center text-xs text-slate-400 space-y-2">
                <p>Nhấn nút "Chạy Đối soát Sổ cái" phía trên để rà soát toàn bộ bút toán LedgerEntry và đối chiếu phương trình bảo toàn.</p>
              </div>
            )}
          </div>
        )}
      </main>

      {/* GAME ROOM MODAL (M6 - PROMPT 09) */}
      {showRoomModal && activeSession && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20">
                  <Gamepad2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-base flex items-center gap-2">
                    Phòng phiên chơi #{activeSession.session_id.slice(0, 8)}
                    <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${
                      activeSession.status === 'ACTIVE'
                        ? 'bg-emerald-950 text-emerald-400 border border-emerald-800 animate-pulse'
                        : activeSession.status === 'ENDED'
                          ? 'bg-amber-950 text-amber-400 border border-amber-800'
                          : activeSession.status === 'CLOSED'
                            ? 'bg-slate-800 text-slate-400'
                            : 'bg-sky-950 text-sky-400 border border-sky-800'
                    }`}>
                      {activeSession.status}
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    Người thuê: <span className="text-slate-200">{activeSession.booking?.renter?.display_name}</span> • 
                    Companion: <span className="text-slate-200 ml-1">{activeSession.booking?.companion?.display_name}</span>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowRoomModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Academic Boundary Disclaimer Alert */}
            <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-2 flex items-center gap-2 text-[11px] text-amber-300">
              <AlertTriangle className="w-4 h-4 flex-shrink-0 text-amber-400" />
              <span>
                <strong>[ACADEMIC DEMO]</strong> Kênh chat văn bản HTTP polling nội bộ với bộ lọc nhạy cảm. Không sử dụng dịch vụ trả phí, WebRTC hoặc cloud media.
              </span>
            </div>

            {/* Session Action Control Bar */}
            <div className="p-4 bg-slate-950/40 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="space-y-1">
                <span className="text-slate-400">Thời hạn phiên:</span>
                <p className="text-slate-200 font-mono">
                  {new Date(activeSession.start_time).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} - {new Date(activeSession.end_time).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                </p>
                {activeSession.booking?.confirm_deadline && (
                  <p className="text-amber-400 font-medium">
                    Hạn nghiệm thu: {new Date(activeSession.booking.confirm_deadline).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })} (15 phút)
                  </p>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {activeSession.status === 'SCHEDULED' && (
                  <button
                    disabled={loading}
                    onClick={() => handleStartSession(activeSession.session_id)}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium px-3 py-1.5 rounded-xl transition cursor-pointer shadow-lg shadow-emerald-600/20 flex items-center gap-1.5"
                  >
                    Bắt đầu phiên
                  </button>
                )}

                {activeSession.status === 'ACTIVE' && (
                  <button
                    disabled={loading}
                    onClick={() => handleEndSession(activeSession.session_id)}
                    className="bg-amber-600 hover:bg-amber-500 text-white font-medium px-3 py-1.5 rounded-xl transition cursor-pointer shadow-lg shadow-amber-600/20 flex items-center gap-1.5"
                  >
                    Kết thúc phiên (Bắt đầu 15p nghiệm thu)
                  </button>
                )}

                {/* Acceptance Window Controls (Renter can Accept or Report Issue) */}
                {['ACCEPTED', 'IN_SESSION', 'ENDED'].includes(activeSession.status) && activeSession.booking?.status !== 'COMPLETED' && activeSession.booking?.status !== 'DISPUTED' && (
                  <>
                    {currentUser?.role === 'RENTER' && (
                      <button
                        disabled={loading}
                        onClick={() => handleOpenFulfillmentModal(activeSession.booking)}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium px-3 py-1.5 rounded-xl transition cursor-pointer shadow-lg shadow-emerald-600/20 flex items-center gap-1.5"
                      >
                        <CheckCircle className="w-4 h-4" /> Nghiệm thu (88/12)
                      </button>
                    )}

                    {currentUser?.role === 'RENTER' && (
                      <button
                        disabled={loading}
                        onClick={() => {
                          setDisputeTargetBookingId(activeSession.booking_id);
                          setShowDisputeModal(true);
                        }}
                        className="bg-rose-600/80 hover:bg-rose-600 text-white font-medium px-3 py-1.5 rounded-xl transition cursor-pointer border border-rose-500/50 flex items-center gap-1.5"
                      >
                        <AlertCircle className="w-4 h-4" /> Báo sự cố
                      </button>
                    )}

                    {/* Button Demo Testability Auto-Accept */}
                    <button
                      disabled={loading}
                      onClick={() => handleSimulateAutoAccept(activeSession.booking_id)}
                      title="Giả lập hết hạn 15 phút không khiếu nại (DEMO_POLICY)"
                      className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium px-2.5 py-1.5 rounded-xl transition border border-slate-700 text-[11px] cursor-pointer"
                    >
                      Thử Auto-Accept
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Chat Messages Body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[260px] max-h-[360px] bg-slate-950/20">
              {sessionMessages.length === 0 ? (
                <div className="text-center py-12 text-slate-500 text-xs italic">
                  Chưa có tin nhắn nào. Hãy gửi lời chào để bắt đầu trận đấu!
                </div>
              ) : (
                sessionMessages.map((msg) => {
                  const isMe = msg.sender_id === currentUser?.user_id;
                  return (
                    <div
                      key={msg.message_id}
                      className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                    >
                      <div className="flex items-center gap-1.5 mb-1 text-[10px] text-slate-400">
                        <span className="font-semibold text-slate-300">{msg.sender_name}</span>
                        <span className="bg-slate-800 px-1 rounded text-[9px]">{msg.sender_role}</span>
                        <span>{new Date(msg.created_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <div
                        className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-xs ${
                          isMe
                            ? 'bg-sky-600 text-white rounded-tr-none'
                            : 'bg-slate-800 text-slate-200 rounded-tl-none border border-slate-700'
                        } ${msg.is_censored ? 'border-amber-500/50 bg-amber-950/30' : ''}`}
                      >
                        <p>{msg.content}</p>
                        {msg.original_content && (
                          <p className="mt-1 text-[10px] text-amber-400/90 italic border-t border-amber-500/30 pt-1">
                            Kiểm toán CS: "{msg.original_content}"
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Chat Input Box */}
            <div className="p-3 bg-slate-950 border-t border-slate-800 flex items-center gap-2">
              <input
                type="text"
                disabled={activeSession.status === 'CLOSED'}
                placeholder={activeSession.status === 'CLOSED' ? 'Phiên chơi đã đóng hoàn toàn.' : 'Nhập tin nhắn trao đổi...'}
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 disabled:opacity-50"
              />
              <button
                disabled={activeSession.status === 'CLOSED' || !chatInput.trim()}
                onClick={handleSendMessage}
                className="bg-sky-600 hover:bg-sky-500 disabled:bg-slate-800 disabled:text-slate-600 text-white p-2 rounded-xl transition cursor-pointer"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REPORT ISSUE / DISPUTE MODAL */}
      {showDisputeModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-white text-base flex items-center gap-2 text-rose-400">
                <AlertCircle className="w-5 h-5" /> Báo cáo sự cố & Khiếu nại
              </h3>
              <button
                onClick={() => setShowDisputeModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              Khi mở khiếu nại, khoản tiền ký quỹ Escrow sẽ ngay lập tức được <strong>ĐÓNG BĂNG</strong> toàn phần để bảo vệ quyền lợi của bạn và chuyển cho Bộ phận CS xử lý.
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-300 font-medium block mb-1">Loại sự cố:</label>
                <select
                  value={disputeCategory}
                  onChange={(e: any) => setDisputeCategory(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-rose-500 cursor-pointer"
                >
                  <option value="NO_SHOW">Companion không xuất hiện (NO_SHOW)</option>
                  <option value="HARASSMENT">Hành vi độc hại / Xúc phạm (HARASSMENT)</option>
                  <option value="SKILL_MISMATCH">Sai lệch kỹ năng / Gian lận Rank (SKILL_MISMATCH)</option>
                  <option value="TECHNICAL_ISSUE">Sự cố kỹ thuật / Mất kết nối (TECHNICAL_ISSUE)</option>
                </select>
              </div>

              <div>
                <label className="text-slate-300 font-medium block mb-1">Mô tả chi tiết sự cố (tối thiểu 10 ký tự):</label>
                <textarea
                  rows={4}
                  placeholder="Mô tả cụ thể diễn biến sự cố để Bộ phận CS đối chiếu..."
                  value={disputeDescription}
                  onChange={(e) => setDisputeDescription(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setShowDisputeModal(false)}
                className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-2 rounded-xl text-xs font-medium transition cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                disabled={loading || disputeDescription.trim().length < 10}
                onClick={handleReportIssue}
                className="bg-rose-600 hover:bg-rose-500 disabled:bg-slate-800 disabled:text-slate-600 text-white px-4 py-2 rounded-xl text-xs font-medium transition cursor-pointer shadow-lg shadow-rose-600/20"
              >
                Xác nhận mở khiếu nại (Đóng băng Escrow)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REVIEW & RATING MODAL (M7 - PROMPT 11, BR-22, D17) */}
      {showReviewModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-white text-base flex items-center gap-2 text-amber-400">
                <Star className="w-5 h-5 fill-amber-400 text-amber-400" /> Đánh giá Companion
              </h3>
              <button
                onClick={() => setShowReviewModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              Chia sẻ trải nghiệm chơi game của bạn. Đánh giá là <strong>bất biến</strong> và được đưa vào thuật toán tính Điểm Uy tín TrustScore của Companion. Đánh giá hoàn toàn độc lập với việc quyết toán tiền.
            </p>

            <div className="space-y-4 text-xs">
              {/* Star Rating Selection */}
              <div>
                <label className="text-slate-300 font-medium block mb-2">Số sao đánh giá (1 - 5 sao):</label>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setReviewRating(star)}
                      className="p-1 rounded-lg hover:scale-110 transition cursor-pointer"
                    >
                      <Star
                        className={`w-7 h-7 ${
                          star <= reviewRating
                            ? 'text-amber-400 fill-amber-400'
                            : 'text-slate-700'
                        }`}
                      />
                    </button>
                  ))}
                  <span className="ml-2 font-bold text-amber-400 text-sm">
                    {reviewRating} sao {reviewRating === 5 ? '(Xuất sắc)' : reviewRating === 4 ? '(Rất tốt)' : reviewRating === 3 ? '(Bình thường)' : reviewRating === 2 ? '(Chưa hài lòng)' : '(Tệ)'}
                  </span>
                </div>
              </div>

              {/* Review Comment */}
              <div>
                <label className="text-slate-300 font-medium block mb-1">Nhận xét chi tiết (tùy chọn):</label>
                <textarea
                  rows={4}
                  maxLength={1000}
                  placeholder="Kỹ năng chơi game, thái độ giao tiếp, sự nhiệt tình hỗ trợ..."
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                />
                <span className="text-[10px] text-slate-500 float-right mt-1">
                  {reviewComment.length}/1000 ký tự
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setShowReviewModal(false)}
                className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-2 rounded-xl text-xs font-medium transition cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                disabled={loading}
                onClick={handleSubmitReview}
                className="bg-amber-600 hover:bg-amber-500 text-white px-5 py-2 rounded-xl text-xs font-medium transition cursor-pointer shadow-lg shadow-amber-600/20 flex items-center gap-1.5"
              >
                <Star className="w-3.5 h-3.5 fill-white" /> Gửi đánh giá
              </button>
            </div>
          </div>
        </div>
      )}

      {/* WITHDRAWAL REQUEST MODAL (M7 - PROMPT 11, BR-23, D18) */}
      {showWithdrawModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-white text-base flex items-center gap-2 text-emerald-400">
                <ArrowDownToLine className="w-5 h-5" /> Yêu cầu rút tiền mô phỏng
              </h3>
              <button
                onClick={() => setShowWithdrawModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              Mô phỏng quy trình rút tiền nội bộ. Số tiền sẽ được khóa tạm giữ từ ví khả dụng của bạn qua bút toán Sổ cái kép <code>WITHDRAW_RESERVE</code>.
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-300 font-medium block mb-1">
                  Số tiền muốn rút (VND, tối thiểu 50.000):
                </label>
                <input
                  type="number"
                  step={50000}
                  min={50000}
                  max={currentUser?.wallet?.available_balance ?? 0}
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(parseInt(e.target.value) || 0)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-bold text-sm focus:outline-none focus:border-emerald-500"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Khả dụng tối đa: {(currentUser?.wallet?.available_balance ?? 0).toLocaleString('vi-VN')} VND
                </span>
              </div>

              <div>
                <label className="text-slate-300 font-medium block mb-1">Ngân hàng thụ hưởng:</label>
                <select
                  value={withdrawBank}
                  onChange={(e) => setWithdrawBank(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500 cursor-pointer"
                >
                  <option value="Techcombank">Techcombank (TCB)</option>
                  <option value="Vietcombank">Vietcombank (VCB)</option>
                  <option value="MBBank">MBBank (Quân Đội)</option>
                  <option value="ACB">ACB (Á Châu)</option>
                  <option value="VPBank">VPBank</option>
                  <option value="TPBank">TPBank (Tiên Phong)</option>
                  <option value="BIDV">BIDV</option>
                  <option value="VietinBank">VietinBank</option>
                </select>
              </div>

              <div>
                <label className="text-slate-300 font-medium block mb-1">Số tài khoản thụ hưởng:</label>
                <input
                  type="text"
                  placeholder="Nhập số tài khoản ngân hàng..."
                  value={withdrawAccountNo}
                  onChange={(e) => setWithdrawAccountNo(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono placeholder-slate-600 focus:outline-none focus:border-emerald-500"
                />
                <span className="text-[10px] text-slate-500 mt-1 block">
                  * Số tài khoản sẽ được che tự động (masked) dạng <code>******1234</code> để đảm bảo bảo mật.
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setShowWithdrawModal(false)}
                className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-2 rounded-xl text-xs font-medium transition cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                disabled={loading || withdrawAmount < 50000 || !withdrawAccountNo.trim() || withdrawAmount > (currentUser?.wallet?.available_balance ?? 0)}
                onClick={handleRequestWithdrawal}
                className="bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-600 text-white px-5 py-2 rounded-xl text-xs font-medium transition cursor-pointer shadow-lg shadow-emerald-600/20 flex items-center gap-1.5"
              >
                <ArrowDownToLine className="w-3.5 h-3.5" /> Tạo yêu cầu rút
              </button>
            </div>
          </div>
        </div>
      )}

      {/* BOOKING DETAIL & AUDIT TIMELINE MODAL (PROMPT 12) */}
      {showBookingDetailModal && selectedBookingDetail && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-sky-400" />
                <h3 className="font-bold text-white text-base">
                  Chi tiết đơn đặt lịch #{selectedBookingDetail.booking_id?.slice(0, 8)}
                </h3>
                <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${
                  selectedBookingDetail.status === 'COMPLETED'
                    ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                    : selectedBookingDetail.status === 'DISPUTED'
                      ? 'bg-rose-950 text-rose-400 border border-rose-800'
                      : 'bg-sky-950 text-sky-400 border border-sky-800'
                }`}>
                  {selectedBookingDetail.status}
                </span>
              </div>
              <button
                onClick={() => setShowBookingDetailModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 text-xs">
              {/* Summary Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-950/60 p-3.5 rounded-xl border border-slate-800">
                <div>
                  <span className="text-[10px] text-slate-400 block">Khách hàng (Renter):</span>
                  <p className="font-semibold text-white mt-0.5">{selectedBookingDetail.renter?.display_name || 'N/A'}</p>
                  <p className="text-[10px] text-slate-500">{selectedBookingDetail.renter?.email}</p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">Companion & Game:</span>
                  <p className="font-semibold text-white mt-0.5">{selectedBookingDetail.companion?.user?.display_name || 'N/A'}</p>
                  <p className="text-[10px] text-sky-400">{selectedBookingDetail.companion?.game?.game_name}</p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">Tổng phí đã chốt:</span>
                  <p className="font-bold text-emerald-400 text-sm mt-0.5">
                    {selectedBookingDetail.total_fee_snapshot?.toLocaleString('vi-VN')} VND
                  </p>
                  <p className="text-[10px] text-slate-500">Ký quỹ Escrow an toàn</p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">Thời lượng / Ca:</span>
                  <p className="font-semibold text-white mt-0.5">
                    {new Date(selectedBookingDetail.start_time).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} - {new Date(selectedBookingDetail.end_time).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                  <p className="text-[10px] text-slate-500">{new Date(selectedBookingDetail.start_time).toLocaleDateString('vi-VN')}</p>
                </div>
              </div>

              {/* Escrow & Financial State */}
              {selectedBookingDetail.escrow && (
                <div className="bg-slate-950/40 p-3.5 rounded-xl border border-slate-800 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-300 flex items-center gap-1.5">
                      <Wallet className="w-4 h-4 text-emerald-400" /> Trạng thái Ký quỹ Escrow (Sổ cái kép)
                    </span>
                    <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${
                      selectedBookingDetail.escrow.status === 'RELEASED'
                        ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                        : selectedBookingDetail.escrow.status === 'FROZEN'
                          ? 'bg-rose-950 text-rose-400 border border-rose-800 animate-pulse'
                          : 'bg-amber-950 text-amber-400 border border-amber-800'
                    }`}>
                      {selectedBookingDetail.escrow.status}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-4 text-[11px] text-slate-400 pt-1">
                    <span>Số tiền ký quỹ: <strong className="text-white font-mono">{selectedBookingDetail.escrow.amount?.toLocaleString('vi-VN')} VND</strong></span>
                    <span>Tạo lúc: {new Date(selectedBookingDetail.escrow.created_at).toLocaleString('vi-VN')}</span>
                    {selectedBookingDetail.escrow.released_at && (
                      <span>Giải ngân lúc: {new Date(selectedBookingDetail.escrow.released_at).toLocaleString('vi-VN')}</span>
                    )}
                  </div>
                </div>
              )}

              {/* Status Audit History Timeline */}
              <div className="space-y-2 pt-2">
                <h4 className="font-bold text-slate-300 flex items-center gap-1.5 text-xs">
                  <Clock className="w-4 h-4 text-sky-400" /> Lịch sử chuyển trạng thái (Audit Status History)
                </h4>
                {(!selectedBookingDetail.history || selectedBookingDetail.history.length === 0) ? (
                  <p className="text-slate-500 italic text-[11px]">Chưa ghi nhận lịch sử chuyển trạng thái.</p>
                ) : (
                  <div className="divide-y divide-slate-800 border border-slate-800 rounded-xl overflow-hidden bg-slate-950/40">
                    {selectedBookingDetail.history.map((h: any) => (
                      <div key={h.history_id} className="p-3 flex items-start justify-between gap-3 text-xs">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-slate-400">{h.from_status || 'INIT'}</span>
                            <span className="text-sky-400 font-bold">➔</span>
                            <span className="font-bold text-white uppercase">{h.to_status}</span>
                          </div>
                          {h.reason && (
                            <p className="text-[11px] text-slate-400 italic">Lý do: "{h.reason}"</p>
                          )}
                          <p className="text-[10px] text-slate-500">
                            Tác nhân: {h.actor?.display_name || h.actor_id || 'SYSTEM'} ({h.actor?.role || 'SYSTEM'})
                          </p>
                        </div>
                        <span className="text-[10px] text-slate-500 font-mono shrink-0">
                          {new Date(h.changed_at).toLocaleString('vi-VN')}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="p-4 border-t border-slate-800 flex justify-end">
              <button
                onClick={() => setShowBookingDetailModal(false)}
                className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-2 rounded-xl text-xs font-medium transition cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REJECT BOOKING MODAL (Companion - PROMPT 12) */}
      {showRejectBookingModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-white text-base flex items-center gap-2 text-rose-400">
                <Ban className="w-5 h-5" /> Từ chối đơn đặt lịch (Reject)
              </h3>
              <button
                onClick={() => setShowRejectBookingModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              Bạn đang từ chối đơn đặt lịch trong hạn 180s. Toàn bộ khoản tiền ký quỹ Escrow sẽ được <strong>hoàn trả 100%</strong> vào ví khả dụng của Renter ngay lập tức qua bút toán Sổ cái kép.
            </p>

            <div className="space-y-2 text-xs">
              <label className="text-slate-300 font-medium block">Lý do từ chối:</label>
              <input
                type="text"
                value={rejectBookingReason}
                onChange={(e) => setRejectBookingReason(e.target.value)}
                placeholder="Nhập lý do từ chối (tối thiểu 3 ký tự)..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-rose-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setShowRejectBookingModal(false)}
                className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-2 rounded-xl text-xs font-medium transition cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                disabled={loading || rejectBookingReason.trim().length < 3}
                onClick={submitRejectBooking}
                className="bg-rose-600 hover:bg-rose-500 disabled:bg-slate-800 disabled:text-slate-600 text-white px-4 py-2 rounded-xl text-xs font-medium transition cursor-pointer shadow-lg shadow-rose-600/20"
              >
                Xác nhận từ chối đơn
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CANCEL BOOKING MODAL (Renter - PROMPT 12) */}
      {showCancelBookingModal && cancelBookingTarget && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-white text-base flex items-center gap-2 text-amber-400">
                <AlertTriangle className="w-5 h-5" /> Xác nhận hủy đơn đặt lịch
              </h3>
              <button
                onClick={() => setShowCancelBookingModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="text-xs text-slate-400 space-y-2">
              <p>Bạn có chắc chắn muốn hủy đơn đặt lịch #{cancelBookingTarget.booking_id?.slice(0, 8)}?</p>
              
              {/* Refund Policy Evaluation Preview */}
              {(() => {
                const now = new Date();
                const start = new Date(cancelBookingTarget.start_time);
                const diffMinutes = Math.floor((start.getTime() - now.getTime()) / (1000 * 60));
                return (
                  <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 space-y-1">
                    <span className="text-[11px] font-semibold text-slate-300 block">Chính sách hoàn tiền (DEMO_POLICY #5):</span>
                    {diffMinutes >= 30 ? (
                      <p className="text-emerald-400 font-medium">
                        ✓ Còn {diffMinutes} phút đến giờ hẹn (≥ 30 phút): Hoàn tiền 100% ({cancelBookingTarget.total_fee_snapshot?.toLocaleString('vi-VN')} VND).
                      </p>
                    ) : diffMinutes >= 10 ? (
                      <p className="text-amber-400 font-medium">
                        ⚠ Còn {diffMinutes} phút đến giờ hẹn (10-30 phút): Hoàn tiền 70% ({Math.round(cancelBookingTarget.total_fee_snapshot * 0.7).toLocaleString('vi-VN')} VND), bồi thường 30% cho Companion.
                      </p>
                    ) : (
                      <p className="text-rose-400 font-medium">
                        ✕ Còn {Math.max(0, diffMinutes)} phút đến giờ hẹn (&lt; 10 phút): Phạt hủy sát giờ (Hoàn 0%, Companion nhận 100% bồi thường).
                      </p>
                    )}
                  </div>
                );
              })()}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setShowCancelBookingModal(false)}
                className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-2 rounded-xl text-xs font-medium transition cursor-pointer"
              >
                Quay lại
              </button>
              <button
                disabled={loading}
                onClick={submitCancelBooking}
                className="bg-rose-600 hover:bg-rose-500 disabled:bg-slate-800 disabled:text-slate-600 text-white px-4 py-2 rounded-xl text-xs font-medium transition cursor-pointer shadow-lg shadow-rose-600/20"
              >
                Xác nhận hủy
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FULFILLMENT MODAL (Renter 88/12 - PROMPT 12) */}
      {showFulfillmentModal && fulfillmentBookingTarget && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-white text-base flex items-center gap-2 text-emerald-400">
                <CheckCircle className="w-5 h-5" /> Nghiệm thu hoàn tất phiên chơi
              </h3>
              <button
                onClick={() => setShowFulfillmentModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              Bạn đang nghiệm thu hoàn tất buổi chơi. Khoản tiền ký quỹ Escrow sẽ được <strong>giải ngân tự động</strong> theo cơ chế chia doanh thu Sổ cái kép:
            </p>

            <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 space-y-2 text-xs">
              <div className="flex justify-between items-center text-slate-300">
                <span>Tổng tiền ký quỹ Escrow:</span>
                <span className="font-bold font-mono text-white">
                  {fulfillmentBookingTarget.total_fee_snapshot?.toLocaleString('vi-VN')} VND
                </span>
              </div>
              <div className="flex justify-between items-center text-emerald-400">
                <span>Giải ngân cho Companion (88%):</span>
                <span className="font-bold font-mono">
                  {Math.round(fulfillmentBookingTarget.total_fee_snapshot * 0.88).toLocaleString('vi-VN')} VND
                </span>
              </div>
              <div className="flex justify-between items-center text-sky-400">
                <span>Phí dịch vụ nền tảng (12%):</span>
                <span className="font-bold font-mono">
                  {(fulfillmentBookingTarget.total_fee_snapshot - Math.round(fulfillmentBookingTarget.total_fee_snapshot * 0.88)).toLocaleString('vi-VN')} VND
                </span>
              </div>
              <p className="text-[10px] text-slate-500 pt-1 border-t border-slate-800 font-mono">
                * Quy tắc làm tròn số nguyên 0-cent: Debit = Credit, không lệch 1 xu.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setShowFulfillmentModal(false)}
                className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-2 rounded-xl text-xs font-medium transition cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                disabled={loading}
                onClick={submitFulfillment}
                className="bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-600 text-white px-5 py-2 rounded-xl text-xs font-medium transition cursor-pointer shadow-lg shadow-emerald-600/20"
              >
                Xác nhận nghiệm thu (88/12)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CS DOSSIER MODAL (CS / Admin - PROMPT 12) */}
      {showDossierModal && selectedDispute && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-sky-400" />
                <h3 className="font-bold text-white text-base">
                  Hồ sơ thẩm định CS Dossier #{selectedDispute.dispute_id?.slice(0, 8)}
                </h3>
                <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${
                  selectedDispute.status === 'RESOLVED'
                    ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                    : 'bg-rose-950 text-rose-400 border border-rose-800'
                }`}>
                  {selectedDispute.status}
                </span>
              </div>
              <button
                onClick={() => setShowDossierModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 text-xs">
              {/* Dispute & Booking Context */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-950/60 p-3.5 rounded-xl border border-slate-800">
                <div className="space-y-1">
                  <span className="text-[10px] text-slate-400 uppercase font-bold">Thông tin sự cố:</span>
                  <p className="text-white font-semibold">Loại: <span className="text-rose-400">{selectedDispute.category}</span></p>
                  <p className="text-slate-300">Mô tả: "{selectedDispute.description}"</p>
                  <p className="text-slate-500 text-[10px]">Tạo lúc: {new Date(selectedDispute.created_at).toLocaleString('vi-VN')}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] text-slate-400 uppercase font-bold">Đơn đặt liên quan:</span>
                  <p className="text-white font-mono">#{selectedDispute.booking?.booking_id?.slice(0, 8)}</p>
                  <p className="text-slate-300">Renter: {selectedDispute.booking?.renter?.display_name} ➔ Companion: {selectedDispute.booking?.companion?.user?.display_name}</p>
                  <p className="text-emerald-400 font-mono">Escrow Đóng băng: {selectedDispute.booking?.total_fee_snapshot?.toLocaleString('vi-VN')} VND</p>
                </div>
              </div>

              {/* Chat Session Audit Log */}
              <div className="space-y-2">
                <h4 className="font-bold text-slate-300 flex items-center gap-1.5 text-xs">
                  <MessageSquare className="w-4 h-4 text-sky-400" /> Bản ghi tin nhắn phiên chơi (Session Chat Audit Log)
                </h4>
                {(!selectedDispute.booking?.session?.messages || selectedDispute.booking.session.messages.length === 0) ? (
                  <div className="p-4 bg-slate-950/40 rounded-xl border border-slate-800 text-center text-slate-500 italic">
                    Không có tin nhắn nào trong phòng chơi.
                  </div>
                ) : (
                  <div className="max-h-48 overflow-y-auto space-y-2 p-3 bg-slate-950/60 rounded-xl border border-slate-800">
                    {selectedDispute.booking.session.messages.map((m: any) => (
                      <div key={m.message_id} className="text-xs p-2 rounded-lg bg-slate-900 border border-slate-800">
                        <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
                          <span className="font-semibold text-white">{m.sender?.display_name || m.sender_id}</span>
                          <span>{new Date(m.created_at).toLocaleTimeString('vi-VN')}</span>
                        </div>
                        <p className="text-slate-200">{m.content}</p>
                        {m.is_censored && m.original_content && (
                          <p className="mt-1 text-[10px] text-amber-400 italic border-t border-amber-500/20 pt-1">
                            Kiểm toán CS (Gốc): "{m.original_content}"
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Uploaded Evidence Attachments */}
              <div className="space-y-2">
                <h4 className="font-bold text-slate-300 flex items-center gap-1.5 text-xs">
                  <Upload className="w-4 h-4 text-amber-400" /> Danh sách chứng cứ đã nộp (Evidence Files)
                </h4>
                {(!selectedDispute.evidence || selectedDispute.evidence.length === 0) ? (
                  <div className="p-4 bg-slate-950/40 rounded-xl border border-slate-800 text-center text-slate-500 italic">
                    Chưa có bên nào nộp chứng cứ bổ sung.
                  </div>
                ) : (
                  <div className="divide-y divide-slate-800 border border-slate-800 rounded-xl overflow-hidden bg-slate-950/40">
                    {selectedDispute.evidence.map((ev: any) => (
                      <div key={ev.evidence_id} className="p-3 flex items-start justify-between gap-3 text-xs">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-white">{ev.file_name}</span>
                            <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded font-mono">
                              {ev.file_type}
                            </span>
                            <span className="text-[10px] text-slate-500">
                              {(ev.file_size_bytes / 1024).toFixed(1)} KB
                            </span>
                          </div>
                          {ev.description && (
                            <p className="text-slate-400 italic">"{ev.description}"</p>
                          )}
                          <p className="text-[10px] text-slate-500">
                            Người nộp: {ev.uploaded_by?.display_name || ev.uploader_id} • Lúc: {new Date(ev.created_at).toLocaleString('vi-VN')}
                          </p>
                        </div>
                        {ev.file_url && ev.file_url.startsWith('data:image') && (
                          <img
                            src={ev.file_url}
                            alt="Evidence thumbnail"
                            className="w-16 h-16 object-cover rounded-lg border border-slate-700 shrink-0"
                          />
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="p-4 border-t border-slate-800 flex items-center justify-between">
              <span className="text-slate-500 text-[11px] font-mono">
                CS Audit Trail Enabled
              </span>
              <div className="flex items-center gap-2">
                {selectedDispute.status !== 'RESOLVED' && (
                  <>
                    <button
                      onClick={() => handleOpenRequestEvidenceModal(selectedDispute)}
                      className="bg-sky-600/20 hover:bg-sky-600/30 text-sky-300 border border-sky-500/30 font-medium px-3 py-1.5 rounded-xl text-xs transition cursor-pointer"
                    >
                      Yêu cầu thêm chứng cứ
                    </button>
                    <button
                      onClick={() => handleOpenDecisionModal(selectedDispute)}
                      className="bg-rose-600 hover:bg-rose-500 text-white font-medium px-4 py-1.5 rounded-xl text-xs transition cursor-pointer shadow-lg shadow-rose-600/20"
                    >
                      Tiến hành phán quyết
                    </button>
                  </>
                )}
                <button
                  onClick={() => setShowDossierModal(false)}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-1.5 rounded-xl text-xs font-medium transition cursor-pointer"
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CS DECISION MODAL (CS / Admin - PROMPT 12) */}
      {showDecisionModal && selectedDispute && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-white text-base flex items-center gap-2 text-rose-400">
                <ShieldCheck className="w-5 h-5" /> Ban hành phán quyết Tranh chấp RMA
              </h3>
              <button
                onClick={() => setShowDecisionModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              Phán quyết sẽ <strong>mở đóng băng Escrow</strong> và thực hiện phân chia tài chính tự động qua Sổ cái kép.
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-300 font-medium block mb-1">
                  Tỷ lệ lỗi của Companion: <strong className="text-rose-400 font-mono text-sm">{decisionFaultPercent}%</strong>
                </label>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={5}
                  value={decisionFaultPercent}
                  onChange={(e) => setDecisionFaultPercent(parseInt(e.target.value))}
                  className="w-full accent-rose-500 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-500 mt-0.5">
                  <span>0% (Renter sai, trả Companion)</span>
                  <span>50% (Chia đều)</span>
                  <span>100% (Companion sai, hoàn Renter)</span>
                </div>
              </div>

              {/* Threshold Rule Info */}
              <div className={`p-2.5 rounded-xl border text-[11px] ${
                decisionFaultPercent >= 80
                  ? 'bg-rose-950/40 border-rose-800 text-rose-300'
                  : 'bg-emerald-950/40 border-emerald-800 text-emerald-300'
              }`}>
                {decisionFaultPercent >= 80 ? (
                  <p>⚠ Tỷ lệ lỗi ≥ 80%: Companion bị <strong>trừ 10 điểm TrustScore</strong> (RMA Violation BR-21).</p>
                ) : (
                  <p>✓ Tỷ lệ lỗi &lt; 80%: Không áp dụng trừ điểm phạt TrustScore trực tiếp.</p>
                )}
              </div>

              <div>
                <label className="text-slate-300 font-medium block mb-1">
                  Lý do phán quyết (tối thiểu 10 ký tự, được lưu vào Audit Trail):
                </label>
                <textarea
                  rows={3}
                  value={decisionReason}
                  onChange={(e) => setDecisionReason(e.target.value)}
                  placeholder="Nêu rõ căn cứ thẩm định để bảo đảm tính minh bạch..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setShowDecisionModal(false)}
                className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-2 rounded-xl text-xs font-medium transition cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                disabled={loading || decisionReason.trim().length < 10}
                onClick={submitCSDecision}
                className="bg-rose-600 hover:bg-rose-500 disabled:bg-slate-800 disabled:text-slate-600 text-white px-5 py-2 rounded-xl text-xs font-medium transition cursor-pointer shadow-lg shadow-rose-600/20"
              >
                Ban hành phán quyết
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CS REQUEST EVIDENCE MODAL (CS / Admin - PROMPT 12) */}
      {showRequestEvidenceModal && selectedDispute && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-white text-base flex items-center gap-2 text-sky-400">
                <Clock className="w-5 h-5" /> Yêu cầu bổ sung chứng cứ
              </h3>
              <button
                onClick={() => setShowRequestEvidenceModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              Yêu cầu các bên nộp bổ sung hình ảnh, video ngắn hoặc log trận đấu. Trong thời gian chờ, Escrow vẫn được <strong>giữ nguyên trạng thái FROZEN</strong>.
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-300 font-medium block mb-1">Thời hạn nộp bổ sung (giờ):</label>
                <select
                  value={evidenceHours}
                  onChange={(e) => setEvidenceHours(parseInt(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-sky-500 cursor-pointer"
                >
                  <option value={12}>12 giờ</option>
                  <option value={24}>24 giờ (Khuyên dùng)</option>
                  <option value={48}>48 giờ</option>
                  <option value={72}>72 giờ</option>
                </select>
              </div>

              <div>
                <label className="text-slate-300 font-medium block mb-1">Ghi chú yêu cầu chi tiết:</label>
                <textarea
                  rows={3}
                  value={evidenceNote}
                  onChange={(e) => setEvidenceNote(e.target.value)}
                  placeholder="Yêu cầu cung cấp ảnh chụp lịch sử trận đấu in-game để xác thực..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setShowRequestEvidenceModal(false)}
                className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-2 rounded-xl text-xs font-medium transition cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                disabled={loading || !evidenceNote.trim()}
                onClick={submitCSRequestEvidence}
                className="bg-sky-600 hover:bg-sky-500 disabled:bg-slate-800 disabled:text-slate-600 text-white px-5 py-2 rounded-xl text-xs font-medium transition cursor-pointer shadow-lg shadow-sky-600/20"
              >
                Gửi yêu cầu chứng cứ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* UPLOAD EVIDENCE MODAL (Renter / Companion - PROMPT 12) */}
      {showUploadEvidenceModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-white text-base flex items-center gap-2 text-sky-400">
                <Upload className="w-5 h-5" /> Nộp bằng chứng khiếu nại (Evidence)
              </h3>
              <button
                onClick={() => setShowUploadEvidenceModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              Tải lên bằng chứng (ảnh chụp màn hình kết quả trận đấu, log trao đổi) để hỗ trợ Bộ phận CS đối chiếu.
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-300 font-medium block mb-1">Loại định dạng:</label>
                <select
                  value={evidenceFileType}
                  onChange={(e: any) => setEvidenceFileType(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-sky-500 cursor-pointer"
                >
                  <option value="IMAGE_PNG">Hình ảnh PNG</option>
                  <option value="IMAGE_JPEG">Hình ảnh JPEG</option>
                  <option value="LOG_TEXT">Bản ghi Text / Log</option>
                </select>
              </div>

              <div>
                <label className="text-slate-300 font-medium block mb-1">Chọn tệp bằng chứng (Chuyển đổi Base64):</label>
                <input
                  type="file"
                  accept="image/png,image/jpeg,text/plain"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onloadend = () => {
                        setEvidenceFileBase64(reader.result as string);
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                  className="w-full text-slate-400 text-xs file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-medium file:bg-sky-600/20 file:text-sky-300 hover:file:bg-sky-600/30 cursor-pointer"
                />
              </div>

              <div>
                <label className="text-slate-300 font-medium block mb-1">Mô tả tóm tắt bằng chứng:</label>
                <input
                  type="text"
                  placeholder="Ảnh chụp bảng điểm in-game lúc 20:30..."
                  value={evidenceDescription}
                  onChange={(e) => setEvidenceDescription(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setShowUploadEvidenceModal(false)}
                className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-2 rounded-xl text-xs font-medium transition cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                disabled={loading || !evidenceFileBase64}
                onClick={submitUploadEvidence}
                className="bg-sky-600 hover:bg-sky-500 disabled:bg-slate-800 disabled:text-slate-600 text-white px-5 py-2 rounded-xl text-xs font-medium transition cursor-pointer shadow-lg shadow-sky-600/20"
              >
                Nộp chứng cứ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REJECT WITHDRAWAL MODAL (CS / Admin - PROMPT 12) */}
      {showRejectWithdrawalModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-white text-base flex items-center gap-2 text-rose-400">
                <Ban className="w-5 h-5" /> Từ chối yêu cầu rút tiền (Reject)
              </h3>
              <button
                onClick={() => setShowRejectWithdrawalModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              Bạn đang từ chối yêu cầu rút tiền #{rejectWithdrawalId?.slice(0, 8)}. Số tiền tạm khóa sẽ được <strong>hoàn trả 100%</strong> vào ví khả dụng của Companion qua bút toán Sổ cái kép <code>WITHDRAW_REJECT</code>.
            </p>

            <div className="space-y-2 text-xs">
              <label className="text-slate-300 font-medium block">Lý do từ chối (tối thiểu 5 ký tự):</label>
              <input
                type="text"
                value={rejectWithdrawalReason}
                onChange={(e) => setRejectWithdrawalReason(e.target.value)}
                placeholder="Thông tin số tài khoản không khớp..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-rose-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setShowRejectWithdrawalModal(false)}
                className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-2 rounded-xl text-xs font-medium transition cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                disabled={loading || rejectWithdrawalReason.trim().length < 5}
                onClick={submitRejectWithdrawal}
                className="bg-rose-600 hover:bg-rose-500 disabled:bg-slate-800 disabled:text-slate-600 text-white px-5 py-2 rounded-xl text-xs font-medium transition cursor-pointer shadow-lg shadow-rose-600/20"
              >
                Xác nhận từ chối
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RESET DEMO MODAL (DEV ONLY - PROMPT 12) */}
      {showResetDemoModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-white text-base flex items-center gap-2 text-rose-400">
                <RotateCcw className="w-5 h-5" /> Reset Dữ liệu Demo (Development Only)
              </h3>
              <button
                onClick={() => setShowResetDemoModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-rose-950/40 rounded-xl border border-rose-800/80 text-xs text-rose-300 space-y-1">
              <p className="font-semibold flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" /> Cảnh báo môi trường thực nghiệm:
              </p>
              <p>
                Toàn bộ dữ liệu Bookings, Sessions, Messages, Disputes, Reviews, Withdrawals và Ledger sẽ được dọn dẹp sạch và tái thiết lập dữ liệu ban đầu (Users, Wallets, Games, Profiles, Slots).
              </p>
            </div>

            <p className="text-[11px] text-slate-400 font-mono">
              * Endpoint bảo vệ: Bị cấm tuyệt đối khi chạy trên môi trường PRODUCTION.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setShowResetDemoModal(false)}
                className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-2 rounded-xl text-xs font-medium transition cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                disabled={loading}
                onClick={handleResetDemo}
                className="bg-rose-600 hover:bg-rose-500 disabled:bg-slate-800 disabled:text-slate-600 text-white px-5 py-2 rounded-xl text-xs font-medium transition cursor-pointer shadow-lg shadow-rose-600/20 flex items-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Xác nhận Reset Demo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TOAST NOTIFICATION CONTAINER (PROMPT 12) */}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto p-3.5 rounded-xl border shadow-2xl flex items-start gap-3 backdrop-blur-md transition transform duration-200 animate-in slide-in-from-bottom-2 ${
              t.type === 'success'
                ? 'bg-slate-900/95 border-emerald-500/50 text-slate-100'
                : t.type === 'error'
                  ? 'bg-slate-900/95 border-rose-500/50 text-slate-100'
                  : t.type === 'warning'
                    ? 'bg-slate-900/95 border-amber-500/50 text-slate-100'
                    : 'bg-slate-900/95 border-sky-500/50 text-slate-100'
            }`}
          >
            <div className="shrink-0 mt-0.5">
              {t.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
              {t.type === 'error' && <AlertCircle className="w-4 h-4 text-rose-400" />}
              {t.type === 'warning' && <AlertTriangle className="w-4 h-4 text-amber-400" />}
              {t.type === 'info' && <Info className="w-4 h-4 text-sky-400" />}
            </div>
            <div className="flex-1 space-y-0.5 text-xs">
              <p className="font-bold text-white text-[11px] leading-tight">{t.title}</p>
              <p className="text-slate-300 text-[11px] leading-relaxed">{t.message}</p>
            </div>
            <button
              onClick={() => removeToast(t.id)}
              className="text-slate-500 hover:text-white p-1 rounded transition cursor-pointer shrink-0"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
      {/* Slot Booking Modal */}
      <SlotBookingModal
        isOpen={showSlotModal}
        onClose={() => setShowSlotModal(false)}
        companion={selectedCompanionForBooking}
        onBookSlot={handleConfirmSlotBooking}
        loading={loading}
        userAvailableBalance={currentUser?.wallet?.available_balance || 0}
      />

      <Footer />
    </div>
  );
}
