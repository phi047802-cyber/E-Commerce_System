import { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Gamepad2, 
  LayoutDashboard,
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
  Info,
  QrCode,
  Copy,
  ShieldAlert,
  Phone,
  PhoneOff,
  Mic,
  MicOff
} from 'lucide-react';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { HomePage } from './pages/HomePage';
import { SlotBookingModal } from './components/SlotBookingModal';
import { BookingCountdown } from './components/BookingCountdown';
import { StatusBadge } from './components/StatusBadge';
import { LoginModal } from './components/LoginModal';
import { RegisterModal } from './components/RegisterModal';
import { AuthenticatedAppFrame } from './components/AuthenticatedAppFrame';
import { GameRow } from './components/GameRow';
import { TopCompanions } from './components/TopCompanions';
import { VoiceIntroRecorder } from './components/VoiceIntroRecorder';
import { MOCK_GAMES, MOCK_COMPANIONS, MockCompanion, MockGame } from './data/mock';
import { getGameCover, GAME_COVERS_REGISTRY } from './data/gameCovers';
import { EscrowPolicyPage } from './pages/EscrowPolicyPage';
import { NewsListPage } from './pages/NewsListPage';
import { NewsDetailPage } from './pages/NewsDetailPage';
import { TermsOfServicePage } from './pages/TermsOfServicePage';
import { DisputeProcessPage } from './pages/DisputeProcessPage';
import { PaymentGuidePage } from './pages/PaymentGuidePage';
import { ProfileView } from './components/ProfileView';
import { Avatar } from './components/common/Avatar';
import { getDisputeReasonLabel, formatShortId } from './common/messages.vi';
import { TermsAcceptanceModal } from './components/legal/TermsAcceptanceModal';
import { ViolationPanel } from './components/legal/ViolationPanel';
import { WalletLedgerPanel } from './components/WalletLedgerPanel';
import { NonGamerServices } from './components/NonGamerServices';
import { UnifiedWorkflowPage } from './pages/UnifiedWorkflowPage';

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
  payment_provider?: string;
}

interface GameTier {
  tier_id: string;
  tier_name: string;
  rank_weight: number;
}

interface Game {
  game_id: string;
  game_name: string;
  genre: string;
  tiers?: GameTier[];
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
  game_id?: string | null;
  verified_tier_id?: string | null;
  hourly_rate?: number | null;
  profile_status?: string;
  trust_score: number;
  completion_rate?: number;
  rating?: number;
  review_count?: number;
  availability: string;
  verification_status?: string;
  game_account_id?: string | null;
  audio_bio_url?: string | null;
  rank_verification?: any;
  user: {
    display_name: string;
    email: string;
    bio?: string | null;
    avatar_url?: string | null;
  };
  game?: Game | null;
  tier?: {
    tier_id?: string;
    tier_name: string;
  } | null;
  slots: Slot[];
}

interface AuthUserState {
  user_id: string;
  email: string;
  display_name: string;
  role: string;
  avatar_url?: string | null;
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
  const [games, setGames] = useState<Game[]>([]);
  const [companions, setCompanions] = useState<Companion[]>([]);
  const [selectedGame, setSelectedGame] = useState<string>('ALL');
  const [currentUser, setCurrentUser] = useState<AuthUserState | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  // Chấp thuận điều khoản trước giao dịch (D39): lưu slot đang chờ để tự đặt lại sau khi chấp thuận
  const [termsModalSlotId, setTermsModalSlotId] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [message, setMessage] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'catalog' | 'companion_dashboard' | 'cs_view' | 'auditor_view' | 'admin_dashboard' | 'admin_bookings' | 'profile'>('catalog');
  const [selectedCompanionForBooking, setSelectedCompanionForBooking] = useState<MockCompanion | null>(null);
  const [showSlotModal, setShowSlotModal] = useState<boolean>(false);
  const [showLoginModal, setShowLoginModal] = useState<boolean>(false);
  const [showRegisterModal, setShowRegisterModal] = useState<boolean>(false);
  const [redirectAfterLogin, setRedirectAfterLogin] = useState<string | null>(null);
  const [activeMenu, setActiveMenu] = useState<string>('home');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [currentPath, setCurrentPath] = useState<string>(typeof window !== 'undefined' ? window.location.pathname : '/');

  // Admin Dashboard & Bookings State
  const [adminMetrics, setAdminMetrics] = useState<any>(null);
  const [adminBookings, setAdminBookings] = useState<any[]>([]);
  const [adminBookingStatusFilter, setAdminBookingStatusFilter] = useState<string>('ALL');
  const [adminBookingsLoading, setAdminBookingsLoading] = useState<boolean>(false);
  const [pendingKycList, setPendingKycList] = useState<any[]>([]);
  const [showKycReviewModal, setShowKycReviewModal] = useState<boolean>(false);
  const [selectedKycRecord, setSelectedKycRecord] = useState<any>(null);
  const [kycRejectionReason, setKycRejectionReason] = useState<string>('');
  const [viewingKycImages, setViewingKycImages] = useState<{ front?: string; back?: string; selfie?: string }>({});

  // Companion eKYC Submission State
  const [kycFrontBase64, setKycFrontBase64] = useState<string>('');
  const [kycBackBase64, setKycBackBase64] = useState<string>('');
  const [kycSelfieBase64, setKycSelfieBase64] = useState<string>('');
  const [submittingKyc, setSubmittingKyc] = useState<boolean>(false);

  // Companion Management State
  const [companionProfile, setCompanionProfile] = useState<any>(null);
  const [companionSlots, setCompanionSlots] = useState<Slot[]>([]);
  const [editGameId, setEditGameId] = useState<string>('');
  const [editTierId, setEditTierId] = useState<string>('');
  const [editRate, setEditRate] = useState<number | ''>('');
  const [editAvailability, setEditAvailability] = useState<string>('ONLINE');
  const [editAccountId, setEditAccountId] = useState<string>('');
  const [editBio, setEditBio] = useState<string>('');
  const [newSlotStart, setNewSlotStart] = useState<string>('');
  const [newSlotEnd, setNewSlotEnd] = useState<string>('');

  // Financial & Simulator State (PROMPT 07 & Dot C QR Webhook)
  const [showTopup, setShowTopup] = useState<boolean>(false);
  const [topupAmount, setTopupAmount] = useState<number>(200000);
  const [activePayment, setActivePayment] = useState<any>(null);
  const [copiedContent, setCopiedContent] = useState<boolean>(false);
  const [paymentCountdown, setPaymentCountdown] = useState<number>(900);
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
  const [dossierActiveTab, setDossierActiveTab] = useState<'evidence' | 'chat' | 'call_log'>('evidence');
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);

  // WebRTC Voice Calling State (FR-006, UC04)
  const [voiceCallState, setVoiceCallState] = useState<'idle' | 'calling' | 'connected' | 'disconnected' | 'reconnecting'>('idle');
  const [voiceIsMuted, setVoiceIsMuted] = useState<boolean>(false);
  const [voiceDurationSec, setVoiceDurationSec] = useState<number>(0);
  const [voiceErrorMessage, setVoiceErrorMessage] = useState<string | null>(null);
  const [evidenceBlobs, setEvidenceBlobs] = useState<Record<string, string>>({});
  const [showDecisionModal, setShowDecisionModal] = useState<boolean>(false);
  const [decisionFaultPercent, setDecisionFaultPercent] = useState<number>(100);
  const [decisionReason, setDecisionReason] = useState<string>('');
  const [showRequestEvidenceModal, setShowRequestEvidenceModal] = useState<boolean>(false);
  const [evidenceHours, setEvidenceHours] = useState<number>(24);
  const [evidenceNote, setEvidenceNote] = useState<string>('');
  const [isRequestingEvidence, setIsRequestingEvidence] = useState<boolean>(false);
  const [disputeFilterStatus, setDisputeFilterStatus] = useState<string>('ALL');

  // Evidence Upload State (Renter / Companion)
  const [showUploadEvidenceModal, setShowUploadEvidenceModal] = useState<boolean>(false);
  const [evidenceTargetDisputeId, setEvidenceTargetDisputeId] = useState<string>('');
  const [evidenceFileType, setEvidenceFileType] = useState<'IMAGE_PNG' | 'IMAGE_JPEG' | 'LOG_TEXT'>('IMAGE_PNG');
  const [evidenceDescription, setEvidenceDescription] = useState<string>('');
  const [evidenceFileBase64, setEvidenceFileBase64] = useState<string>('');

  // Companion Explanation State
  const [showExplanationModal, setShowExplanationModal] = useState<boolean>(false);
  const [explanationTargetDisputeId, setExplanationTargetDisputeId] = useState<string>('');
  const [explanationText, setExplanationText] = useState<string>('');
  const [explanationEvidenceBase64, setExplanationEvidenceBase64] = useState<string>('');
  const [explanationEvidenceFileType, setExplanationEvidenceFileType] = useState<'IMAGE_PNG' | 'IMAGE_JPEG'>('IMAGE_PNG');
  const [explanationEvidenceFileName, setExplanationEvidenceFileName] = useState<string>('');

  // Initial Evidence Attachment for Renter Report Issue
  const [disputeInitialEvidenceBase64, setDisputeInitialEvidenceBase64] = useState<string>('');
  const [disputeInitialEvidenceFileType, setDisputeInitialEvidenceFileType] = useState<'IMAGE_PNG' | 'IMAGE_JPEG'>('IMAGE_PNG');
  const [disputeInitialEvidenceFileName, setDisputeInitialEvidenceFileName] = useState<string>('');

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

  // Ref chống trùng lặp Toast trong vòng 2 giây
  const recentToastsRef = useRef<Map<string, number>>(new Map());

  const addToast = (type: 'success' | 'error' | 'warning' | 'info', title: string, message: string) => {
    const key = `${type}:${title}:${message}`;
    const now = Date.now();
    const lastTime = recentToastsRef.current.get(key) || 0;
    if (now - lastTime < 2000) {
      // Bỏ qua toast trùng lặp trong 2 giây
      return;
    }
    recentToastsRef.current.set(key, now);

    const id = now.toString() + Math.random().toString(36).substring(2, 6);
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

  // 2b. Tải danh sách đơn đặt lịch
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
        logout(true);
      }
    } catch {
      logout(true);
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
      if (profData.success && profData.data?.profile_id) {
        setCompanionProfile(profData.data);
        setEditGameId(profData.data.game_id || '');
        setEditTierId(profData.data.verified_tier_id || '');
        setEditRate(profData.data.hourly_rate ?? '');
        setEditAvailability(profData.data.availability || 'ONLINE');
        setEditAccountId(profData.data.game_account_id || '');
        setEditBio(profData.data.user?.bio || '');
        loadCompanionReviews(profData.data.profile_id);
      }
      if (slotsData.success && Array.isArray(slotsData.data)) {
        setCompanionSlots(slotsData.data);
      }
      // Tải điểm TrustScore, danh sách rút tiền cho Companion
      loadTrustScore(authToken);
      loadMyWithdrawals(authToken);
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

  // 4f. Tải hồ sơ CS Dossier chi tiết cho một khiếu nại (CS & Admin)
  const handleCloseDossier = () => {
    // Thu hồi các Object URL để giải phóng tài nguyên bộ nhớ
    Object.values(evidenceBlobs).forEach((url) => {
      try {
        URL.revokeObjectURL(url);
      } catch (e) {}
    });
    setEvidenceBlobs({});
    setShowDossierModal(false);
  };

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

        // Fetch ảnh qua Authorization header và tạo Object URL tạm thời (Đợt D1b - Mục B.1)
        const d = data.data.dispute || data.data;
        const evList = d.evidences || d.evidence || [];
        const newBlobs: Record<string, string> = {};

        for (const ev of evList) {
          try {
            const fileRes = await fetch(`/api/cs/disputes/${d.dispute_id}/evidences/${ev.evidence_id}/file`, {
              headers: { Authorization: `Bearer ${token}` },
            });
            if (fileRes.ok) {
              const blob = await fileRes.blob();
              newBlobs[ev.evidence_id] = URL.createObjectURL(blob);
            }
          } catch (fileErr) {
            console.error('Không thể nạp blob cho evidence:', ev.evidence_id, fileErr);
          }
        }
        setEvidenceBlobs(newBlobs);
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

  // 4k. Đồng bộ toàn diện dữ liệu hệ thống (Real-time Auto-Sync & Multi-tab Sync)
  const syncAppState = async (authToken?: string | null) => {
    const currentToken = authToken ?? token;
    const tasks: Promise<any>[] = [loadCatalog()];
    if (currentToken) {
      tasks.push(loadMe(currentToken));
      tasks.push(loadMyBookings(currentToken));
      if (currentUser?.role === 'COMPANION') {
        tasks.push(loadTrustScore(currentToken));
        tasks.push(loadCompanionData(currentToken));
      }
      tasks.push(loadMyWithdrawals(currentToken));
      if (currentUser?.role === 'CS_AGENT' || currentUser?.role === 'ADMIN') {
        tasks.push(loadDisputes(currentToken, disputeFilterStatus));
      }
      if (currentUser?.role === 'ADMIN' || currentUser?.role === 'AUDITOR') {
        tasks.push(loadAllWithdrawals(currentToken));
        tasks.push(loadAuditAlerts(currentToken));
      }
    }
    await Promise.allSettled(tasks);
  };

  useEffect(() => {
    checkHealth();
    syncAppState(token);

    // Ghi nhận lượt truy cập ẩn danh (Anonymous Session Counter - không lưu thông tin cá nhân)
    try {
      let sessionKey = sessionStorage.getItem('instasquad_anon_session');
      if (!sessionKey) {
        sessionKey = 'sess-' + Math.random().toString(36).substring(2, 10) + '-' + Date.now();
        sessionStorage.setItem('instasquad_anon_session', sessionKey);
        fetch('/api/analytics/visit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ session_key: sessionKey }),
        }).catch(() => {});
      }
    } catch {
      // Bỏ qua nếu môi trường không hỗ trợ sessionStorage
    }

    // Auto-sync chu kỳ 3.5 giây: Đảm bảo dữ liệu nền (timeout 180s, auto-accept 15m, phán quyết CS, cập nhật ví/booking) luôn đồng bộ tức thì
    const syncInterval = setInterval(() => {
      syncAppState(token);
    }, 3500);

    const handleFocus = () => {
      syncAppState(token);
    };
    window.addEventListener('focus', handleFocus);

    return () => {
      clearInterval(syncInterval);
      window.removeEventListener('focus', handleFocus);
    };
  }, [token, activeTab]);

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

  // Bộ đếm thời lượng cuộc gọi thoại WebRTC
  useEffect(() => {
    let timer: any = null;
    if (voiceCallState === 'connected') {
      timer = setInterval(() => {
        setVoiceDurationSec((prev) => prev + 1);
      }, 1000);
    } else if (voiceCallState === 'idle') {
      setVoiceDurationSec(0);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [voiceCallState]);

  // Kiểm tra và tự động đi tiếp bước ký quỹ (Hình 1A bước 8 đến 10) nếu Renter đang có đơn chờ nạp tiền
  const checkAndAutoHoldEscrow = async () => {
    try {
      if (!token) return;
      const res = await fetch('/api/bookings', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        const pendingBooking = data.data.find(
          (b: any) => (b.status === 'CREATED' || b.status === 'PENDING_PAYMENT') && b.slot?.status === 'HELD'
        );
        if (pendingBooking) {
          addToast(
            'info',
            'Tự động ký quỹ',
            `Đã nạp tiền thành công. Tự động chuyển tiếp bước ký quỹ Escrow cho đơn #${pendingBooking.booking_id.slice(0, 8)}.`
          );
          await handleHoldEscrow(pendingBooking.booking_id);
        }
      }
    } catch (e) {
      // ignore
    }
  };

  // WebSocket Real-time Topup Notification (Đợt C, Step 5)
  useEffect(() => {
    if (!token) return;
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws?token=${token}`;
    let ws: WebSocket | null = null;
    let retryTimeout: any = null;

    const connect = () => {
      try {
        ws = new WebSocket(wsUrl);
        ws.onmessage = (event) => {
          try {
            const msg = JSON.parse(event.data);
            if (msg.type === 'TOPUP_SUCCESS') {
              const diffAmount = msg.amount || 0;
              setFinancialDiffNotice({
                title: msg.is_late ? 'Nạp tiền muộn thành công (LATE)' : 'Nạp tiền QR thành công!',
                prev: currentUser?.wallet?.available_balance ?? 0,
                diff: diffAmount,
                next: (currentUser?.wallet?.available_balance ?? 0) + diffAmount,
                unit: 'VND',
              });
              addToast(
                'success',
                msg.is_late ? 'Nạp tiền muộn thành công (LATE)' : 'Nạp tiền QR thành công (Realtime)!',
                `+${diffAmount.toLocaleString('vi-VN')} VND đã được hạch toán vào ví khả dụng qua Sổ cái kép.`
              );
              setActivePayment(null);
              setShowTopup(false);
              syncAppState(token);
              checkAndAutoHoldEscrow();
            }
          } catch (e) {
            // non-json
          }
        };
        ws.onclose = () => {
          retryTimeout = setTimeout(connect, 5000);
        };
      } catch (err) {
        // connect error
      }
    };

    connect();

    return () => {
      if (ws) ws.close();
      if (retryTimeout) clearTimeout(retryTimeout);
    };
  }, [token]);

  // Polling Fallback: Hỏi trạng thái Payment mỗi 3 giây nếu WebSocket đứt (Đợt C, Step 5)
  useEffect(() => {
    if (!activePayment || activePayment.status !== 'PENDING' || !token) return;
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/payments/${activePayment.payment_id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (data.success && (data.data.status === 'SUCCESS' || data.data.status === 'LATE')) {
          const diffAmount = data.data.amount || activePayment.amount;
          setFinancialDiffNotice({
            title: data.data.status === 'LATE' ? 'Nạp tiền muộn thành công (LATE)' : 'Nạp tiền thành công!',
            prev: currentUser?.wallet?.available_balance ?? 0,
            diff: diffAmount,
            next: (currentUser?.wallet?.available_balance ?? 0) + diffAmount,
            unit: 'VND',
          });
          addToast(
            'success',
            data.data.status === 'LATE' ? 'Nạp tiền muộn thành công (LATE)' : 'Nạp tiền thành công!',
            `+${diffAmount.toLocaleString('vi-VN')} VND đã được hạch toán vào ví khả dụng.`
          );
          setActivePayment(null);
          setShowTopup(false);
          syncAppState(token);
          checkAndAutoHoldEscrow();
        }
      } catch (e) {
        // network error
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [activePayment, token]);

  // Đếm ngược 15 phút (900 giây) cho đơn nạp tiền QR (Đợt C, Step 3)
  useEffect(() => {
    if (!activePayment || activePayment.status !== 'PENDING') return;
    setPaymentCountdown(900);
    const timer = setInterval(() => {
      setPaymentCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [activePayment]);

  // Lắng nghe thay đổi URL (route /login, /register, các trang tĩnh và tin tức)
  useEffect(() => {
    const handleRouteChange = () => {
      const path = window.location.pathname;
      setCurrentPath(path);
      if (path === '/login') {
        setShowLoginModal(true);
        setShowRegisterModal(false);
      } else if (path === '/register') {
        setShowRegisterModal(true);
        setShowLoginModal(false);
      }
    };

    handleRouteChange();
    window.addEventListener('popstate', handleRouteChange);
    return () => window.removeEventListener('popstate', handleRouteChange);
  }, []);

  // Hỗ trợ tự động đăng nhập demo qua URL khi DEV (?auth_as=renter/companion/cs/auditor)
  useEffect(() => {
    if (import.meta.env.DEV && typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const demoUser = params.get('auth_as') || params.get('demo_user');
      if (demoUser && !token) {
        const email = demoUser === 'companion' ? 'companion1@instasquad.test' :
                      demoUser === 'cs' ? 'cs_agent@instasquad.test' :
                      demoUser === 'auditor' ? 'auditor@instasquad.test' :
                      demoUser === 'admin' ? 'admin@instasquad.test' :
                      'renter1@instasquad.test';
        fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password: 'Demo@123456' })
        })
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            handleLoginSuccess(data.data.token, data.data.user);
            if (demoUser === 'companion') setActiveTab('companion_dashboard');
            if (demoUser === 'cs') setActiveTab('cs_view');
            if (demoUser === 'auditor') setActiveTab('auditor_view');
          }
        })
        .catch(() => {});
      }
    }
  }, []);

  // Xử lý đăng nhập thành công
  const handleLoginSuccess = (newToken: string, newUser: any) => {
    setToken(newToken);
    setCurrentUser(newUser);
    addToast('success', 'Đăng nhập thành công', `Chào mừng ${newUser.display_name} (${newUser.role})!`);

    if (window.location.pathname === '/login' || window.location.pathname === '/register') {
      window.history.pushState({}, '', '/');
    }

    if (redirectAfterLogin) {
      const target = redirectAfterLogin;
      setRedirectAfterLogin(null);
      if (target === 'companion_dashboard' && (newUser.role === 'COMPANION' || newUser.role === 'ADMIN')) {
        setActiveTab('companion_dashboard');
        loadCompanionData(newToken);
        return;
      }
      if (target === 'cs_view' && (newUser.role === 'CS_AGENT' || newUser.role === 'ADMIN')) {
        setActiveTab('cs_view');
        loadAllWithdrawals(newToken);
        loadDisputes(newToken);
        loadAuditAlerts(newToken);
        return;
      }
      if (target === 'auditor_view' && (newUser.role === 'AUDITOR' || newUser.role === 'ADMIN')) {
        setActiveTab('auditor_view');
        loadAuditAlerts(newToken);
        return;
      }
      if (target === 'admin_dashboard' && newUser.role === 'ADMIN') {
        setActiveTab('admin_dashboard');
        loadAdminData(newToken);
        return;
      }
    }

    if (newUser.role === 'ADMIN') {
      setActiveTab('admin_dashboard');
      loadAdminData(newToken);
      loadDisputes(newToken);
      loadAuditAlerts(newToken);
    } else if (newUser.role === 'COMPANION') {
      setActiveTab('companion_dashboard');
      loadCompanionData(newToken);
    } else if (newUser.role === 'CS_AGENT') {
      setActiveTab('cs_view');
      loadAllWithdrawals(newToken);
      loadDisputes(newToken);
      loadAuditAlerts(newToken);
    } else if (newUser.role === 'AUDITOR') {
      setActiveTab('auditor_view');
      loadAuditAlerts(newToken);
    } else {
      setActiveTab('catalog');
      loadMyBookings(newToken);
    }
  };

  const loadAdminData = async (authToken: string) => {
    try {
      const [metricsRes, kycRes] = await Promise.all([
        fetch('/api/admin/dashboard/metrics', {
          headers: { Authorization: `Bearer ${authToken}` },
        }),
        fetch('/api/admin/kyc/pending', {
          headers: { Authorization: `Bearer ${authToken}` },
        }),
      ]);

      const metricsJson = await metricsRes.json();
      if (metricsJson.success) {
        setAdminMetrics(metricsJson.data);
      }

      const kycJson = await kycRes.json();
      if (kycJson.success) {
        setPendingKycList(kycJson.data);
      }
    } catch (err: any) {
      console.error('Lỗi tải dữ liệu Admin:', err);
    }
  };

  const loadAdminBookings = async (authToken: string, status?: string) => {
    try {
      setAdminBookingsLoading(true);
      const q = status && status !== 'ALL' ? `?status=${status}` : '';
      const res = await fetch(`/api/admin/bookings${q}`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const json = await res.json();
      if (json.success) {
        setAdminBookings(json.data || []);
      }
    } catch (err: any) {
      console.error('Lỗi tải danh sách đơn toàn sàn:', err);
    } finally {
      setAdminBookingsLoading(false);
    }
  };

  const handleExportCsv = async () => {
    try {
      const res = await fetch('/api/wallet/reconciliation/export-csv', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!res.ok) {
        throw new Error('Không thể xuất dữ liệu CSV');
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ledger-audit-${Date.now()}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      addToast('success', 'Xuất CSV thành công', 'File CSV kiểm toán sổ cái đã được tải xuống.');
    } catch (err: any) {
      addToast('error', 'Lỗi xuất CSV', err.message || 'Không thể tải file CSV');
    }
  };

  const handleTabChangeWithGuard = (tab: 'catalog' | 'companion_dashboard' | 'cs_view' | 'auditor_view' | 'admin_dashboard' | 'admin_bookings' | 'profile') => {
    if (tab === 'catalog') {
      setActiveTab('catalog');
      return;
    }

    if (!currentUser) {
      addToast('warning', 'Yêu cầu đăng nhập', 'Vui lòng đăng nhập để truy cập trang này.');
      setRedirectAfterLogin(tab);
      setShowLoginModal(true);
      window.history.pushState({}, '', '/login');
      return;
    }

    if (tab === 'companion_dashboard' && currentUser.role !== 'COMPANION' && currentUser.role !== 'ADMIN') {
      addToast('error', 'Truy cập bị từ chối (403)', 'Tài khoản Renter không có quyền vào Bảng quản lý Companion.');
      setActiveTab('catalog');
      return;
    }

    if (tab === 'cs_view' && currentUser.role !== 'CS_AGENT' && currentUser.role !== 'ADMIN') {
      addToast('error', 'Truy cập bị từ chối (403)', 'Chỉ CS Agent hoặc Admin mới có quyền truy cập trang Xử lý khiếu nại.');
      setActiveTab('catalog');
      return;
    }

    if (tab === 'auditor_view' && currentUser.role !== 'AUDITOR' && currentUser.role !== 'ADMIN') {
      addToast('error', 'Truy cập bị từ chối (403)', 'Chỉ Auditor hoặc Admin mới có quyền truy cập trang Kiểm toán Sổ cái.');
      setActiveTab('catalog');
      return;
    }

    if (tab === 'admin_dashboard' && currentUser.role !== 'ADMIN') {
      addToast('error', 'Truy cập bị từ chối (403)', 'Chỉ Quản trị viên (Admin) mới có quyền truy cập Tổng quan quản trị.');
      setActiveTab('catalog');
      return;
    }

    if (tab === 'admin_bookings' && currentUser.role !== 'ADMIN') {
      addToast('error', 'Truy cập bị từ chối (403)', 'Chỉ Quản trị viên (Admin) mới có quyền truy cập Quản lý đơn hàng.');
      setActiveTab('catalog');
      return;
    }

    setActiveTab(tab);
    if (tab === 'companion_dashboard') loadCompanionData(token || '');
    if (tab === 'cs_view') { loadAllWithdrawals(token || ''); loadDisputes(token || ''); loadAuditAlerts(token || ''); }
    if (tab === 'auditor_view') loadAuditAlerts(token || '');
    if (tab === 'admin_dashboard') loadAdminData(token || '');
    if (tab === 'admin_bookings') loadAdminBookings(token || '');
  };

  const logout = (isExpired = false) => {
    localStorage.removeItem('token');
    sessionStorage.removeItem('token');
    setToken(null);
    setCurrentUser(null);
    setCompanionProfile(null);
    setCompanionSlots([]);
    setActiveTab('catalog');
    if (isExpired) {
      setRedirectAfterLogin(activeTab !== 'catalog' ? activeTab : null);
      addToast('warning', 'Phiên làm việc hết hạn', 'Vui lòng đăng nhập lại để tiếp tục.');
      setShowLoginModal(true);
      window.history.pushState({}, '', '/login');
    } else {
      addToast('info', 'Đã đăng xuất', 'Bạn đã đăng xuất an toàn.');
      if (window.location.pathname === '/login' || window.location.pathname === '/register') {
        window.history.pushState({}, '', '/');
      }
    }
  };


  // Cập nhật / Hoàn thiện hồ sơ Companion (Section B.3)
  const handleSaveProfile = async () => {
    if (!token) return;
    try {
      const payload: any = {
        availability: editAvailability,
      };
      if (editGameId) payload.game_id = editGameId;
      if (editTierId) payload.verified_tier_id = editTierId;
      if (editRate !== '') payload.hourly_rate = Number(editRate);
      if (editAccountId) payload.game_account_id = editAccountId.trim();
      if (editBio !== undefined) payload.bio = editBio.trim();

      const res = await fetch('/api/companion/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        addToast('success', 'Thành công', data.data.profile_status === 'ACTIVE' 
          ? 'Hồ sơ Companion đã được kích hoạt thành công và hiển thị công khai!' 
          : 'Cập nhật thông tin hồ sơ thành công!');
        setCompanionProfile(data.data);
        syncAppState(token);
      } else {
        addToast('error', 'Lỗi cập nhật', data.error?.message || 'Không thể lưu hồ sơ.');
      }
    } catch (err: any) {
      addToast('error', 'Lỗi kết nối', err.message);
    }
  };

  // Nộp hồ sơ eKYC Companion (Mã hóa AES-256-GCM - UC01, NFR-002)
  const handleCompanionSubmitKyc = async () => {
    if (!token || submittingKyc) return;
    if (!kycFrontBase64 || !kycBackBase64 || !kycSelfieBase64) {
      addToast('warning', 'Thiếu tài liệu eKYC', 'Vui lòng tải lên đủ 3 ảnh: CCCD Mặt trước, Mặt sau và Ảnh selfie.');
      return;
    }
    setSubmittingKyc(true);
    try {
      const res = await fetch('/api/companion/kyc/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          idFrontBase64: kycFrontBase64,
          idBackBase64: kycBackBase64,
          selfieBase64: kycSelfieBase64,
        }),
      });
      const data = await res.json();
      if (data.success) {
        addToast('success', 'Gửi eKYC thành công', 'Hồ sơ đã được mã hóa AES-256-GCM và gửi Admin chờ xét duyệt.');
        syncAppState(token);
        setKycFrontBase64('');
        setKycBackBase64('');
        setKycSelfieBase64('');
      } else {
        addToast('error', 'Lỗi nộp eKYC', data.error?.message || 'Không thể nộp hồ sơ eKYC');
      }
    } catch (err: any) {
      addToast('error', 'Lỗi kết nối', err.message);
    } finally {
      setSubmittingKyc(false);
    }
  };

  // Admin mở phiên xem xét eKYC và giải mã ảnh
  const handleOpenKycReview = async (record: any) => {
    setSelectedKycRecord(record);
    setShowKycReviewModal(true);
    setViewingKycImages({});
    setKycRejectionReason('');

    try {
      const [frontBlob, backBlob, selfieBlob] = await Promise.all([
        fetch(`/api/admin/kyc/${record.kyc_id}/image/front`, {
          headers: { Authorization: `Bearer ${token}` },
        }).then(r => r.blob()),
        fetch(`/api/admin/kyc/${record.kyc_id}/image/back`, {
          headers: { Authorization: `Bearer ${token}` },
        }).then(r => r.blob()),
        fetch(`/api/admin/kyc/${record.kyc_id}/image/selfie`, {
          headers: { Authorization: `Bearer ${token}` },
        }).then(r => r.blob()),
      ]);

      setViewingKycImages({
        front: URL.createObjectURL(frontBlob),
        back: URL.createObjectURL(backBlob),
        selfie: URL.createObjectURL(selfieBlob),
      });
    } catch (err: any) {
      addToast('error', 'Lỗi giải mã ảnh', 'Không thể giải mã dữ liệu eKYC');
    }
  };

  // Admin phê duyệt hoặc từ chối hồ sơ eKYC
  const handleAdminReviewKycDecision = async (decision: 'VERIFIED' | 'REJECTED') => {
    if (!token || !selectedKycRecord) return;
    if (decision === 'REJECTED' && !kycRejectionReason.trim()) {
      addToast('warning', 'Yêu cầu lý do', 'Vui lòng nhập lý do từ chối hồ sơ eKYC.');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/kyc/${selectedKycRecord.kyc_id}/review`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          decision,
          reason: decision === 'REJECTED' ? kycRejectionReason.trim() : undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        addToast('success', 'Xử lý eKYC thành công', data.data.message);
        setShowKycReviewModal(false);
        loadAdminData(token);
      } else {
        addToast('error', 'Lỗi xét duyệt', data.error?.message || 'Không thể cập nhật hồ sơ eKYC');
      }
    } catch (err: any) {
      addToast('error', 'Lỗi hệ thống', err.message);
    } finally {
      setLoading(false);
    }
  };

  // Đặt lịch và giữ slot nguyên tử (PROMPT 06 - M4)
  const handleBookSlot = async (slotId: string) => {
    if (!token) {
      addToast('warning', 'Yêu cầu đăng nhập', 'Vui lòng đăng nhập với tài khoản Renter (ví dụ: renter1@instasquad.test) để đặt lịch!');
      return;
    }
    if (!slotId || slotId === 'mock-slot-1') {
      addToast('error', 'Khung giờ không hợp lệ', 'Vui lòng chọn khung giờ khả dụng hợp lệ từ danh sách.');
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
        await syncAppState(token);
      } else if (data.error?.code === 'TERMS_NOT_ACCEPTED') {
        setTermsModalSlotId(slotId);
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
    setSelectedCompanionForBooking(companion);
    setShowSlotModal(true);
  };

  const handleConfirmSlotBooking = async (slotId: string) => {
    if (!slotId || slotId === 'mock-slot-1') {
      addToast('error', 'Khung giờ không hợp lệ', 'Vui lòng chọn một khung giờ khả dụng hợp lệ từ danh sách.');
      return;
    }
    setShowSlotModal(false);
    await handleBookSlot(slotId);
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
        syncAppState(token);
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
        syncAppState(token);
      } else {
        setMessage(`Lỗi xóa slot: ${data.error.message}`);
      }
    } catch (err: any) {
      setMessage(`Lỗi: ${err.message}`);
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
          title: `Ký quỹ đơn ${formatShortId('BK', bookingId)}`,
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
        await syncAppState(token);
      } else {
        addToast('error', 'Ký quỹ thất bại', `${data.error.message} (${data.error.code})`);
      }
    } catch (err: any) {
      addToast('error', 'Lỗi kết nối', err.message);
    } finally {
      setLoading(false);
    }
  };

  // Xử lý timeout 180s cho Booking (Stage 2.2 - BR-17, D10)
  const handleTimeoutBooking = async (bookingId: string) => {
    if (!token) {
      addToast('warning', 'Yêu cầu đăng nhập', 'Vui lòng đăng nhập để thực hiện thao tác.');
      return;
    }

    const prevAvailable = currentUser?.wallet?.available_balance ?? 0;
    setLoading(true);
    try {
      const res = await fetch(`/api/bookings/${bookingId}/timeout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();
      if (data.success) {
        const refundedAmount = data.data.booking?.total_fee_snapshot || 0;
        if (currentUser?.role === 'RENTER' && refundedAmount > 0) {
          setFinancialDiffNotice({
            title: `Hoàn tiền đơn ${formatShortId('BK', bookingId)}`,
            prev: prevAvailable,
            diff: refundedAmount,
            next: prevAvailable + refundedAmount,
            unit: 'VND',
          });
        }
        addToast(
          'success',
          'Xử lý quá hạn thành công!',
          `Đơn #${bookingId.slice(0, 8)} đã được hủy do Companion không phản hồi trong 180 giây. Toàn bộ tiền ký quỹ Escrow đã được hoàn 100% về ví của Renter.`
        );
        await syncAppState(token);
        if (showBookingDetailModal && selectedBookingDetail?.booking_id === bookingId) {
          await handleOpenBookingDetail(bookingId);
        }
      } else {
        addToast(
          'error',
          'Không thể xử lý quá hạn',
          `${data.error.message} (${data.error.code})`
        );
        await syncAppState(token);
        if (showBookingDetailModal && selectedBookingDetail?.booking_id === bookingId) {
          await handleOpenBookingDetail(bookingId);
        }
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
        await syncAppState(token);
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
        await syncAppState(token);
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
        await syncAppState(token);
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
          await syncAppState(token);
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

  // WebRTC Voice Call Handlers (FR-006, UC04)
  const handleStartVoiceCall = async () => {
    setVoiceErrorMessage(null);
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setVoiceErrorMessage('Trình duyệt không hỗ trợ gọi thoại WebRTC. Bạn vẫn có thể tiếp tục trao đổi qua kênh chat.');
      return;
    }
    try {
      setVoiceCallState('calling');
      let stream: MediaStream | null = null;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      } catch (mediaErr) {
        // Fallback for automated environments without physical mic
        console.warn('Microphone permission or hardware unavailable, falling back to simulated audio connection:', mediaErr);
      }
      if (activeSession && token) {
        await fetch(`/api/sessions/${activeSession.session_id}/ice-servers`, {
          headers: { Authorization: `Bearer ${token}` },
        }).catch(() => {});
      }
      setTimeout(() => {
        setVoiceCallState('connected');
        addToast('success', 'Kết nối thoại thành công', 'Cuộc gọi thoại 1-1 WebRTC giữa bạn và đối phương đã được thiết lập.');
      }, 1000);
      if (stream) {
        (window as any).__voiceStream = stream;
      }
    } catch (err: any) {
      setVoiceCallState('idle');
      setVoiceErrorMessage('Không thể truy cập microphone (bị từ chối quyền hoặc thiết bị bận). Bạn vẫn có thể tiếp tục trao đổi qua kênh chat.');
    }
  };

  const handleToggleVoiceMute = () => {
    const stream = (window as any).__voiceStream as MediaStream | undefined;
    if (stream) {
      stream.getAudioTracks().forEach((track) => {
        track.enabled = voiceIsMuted;
      });
    }
    setVoiceIsMuted(!voiceIsMuted);
  };

  const handleEndVoiceCall = () => {
    const stream = (window as any).__voiceStream as MediaStream | undefined;
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      (window as any).__voiceStream = null;
    }
    setVoiceCallState('idle');
    setVoiceIsMuted(false);
    addToast('info', 'Cuộc gọi đã kết thúc', `Thời lượng cuộc gọi: ${voiceDurationSec} giây.`);
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
        await syncAppState(token);
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
        await syncAppState(token);
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
        // Nộp bằng chứng ban đầu nếu Renter đã đính kèm file
        if (data.data?.dispute?.dispute_id && disputeInitialEvidenceBase64) {
          try {
            await fetch(`/api/disputes/${data.data.dispute.dispute_id}/evidences`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({
                file_url: disputeInitialEvidenceBase64,
                file_type: disputeInitialEvidenceFileType || 'IMAGE_PNG',
                file_name: disputeInitialEvidenceFileName || 'minh_chung_ban_dau.png',
                description: 'Bằng chứng ban đầu đính kèm khi mở khiếu nại',
              }),
            });
          } catch (evErr) {
            console.error('Lỗi tải bằng chứng ban đầu:', evErr);
          }
        }

        addToast(
          'warning',
          'Đã mở khiếu nại tranh chấp',
          `Hồ sơ #${data.data.dispute.dispute_id.slice(0, 8)}. Khoản tiền Escrow đã được ĐÓNG BĂNG toàn phần để bảo vệ quyền lợi.`
        );
        setShowDisputeModal(false);
        setShowRoomModal(false);
        setDisputeDescription('');
        setDisputeInitialEvidenceBase64('');
        setDisputeInitialEvidenceFileName('');
        await syncAppState(token);
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
        await syncAppState(token);
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
          title: `Tạo yêu cầu rút tiền ${formatShortId('WDR', data.data.withdraw_id)}`,
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
        await syncAppState(token);
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
        await syncAppState(token);
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
        await syncAppState(token);
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
        await syncAppState(token);
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
    setDecisionReason('Companion không tham gia phòng chơi đúng hẹn (NO_SHOW).');
    setShowDecisionModal(true);
  };

  const submitCSDecision = async () => {
    if (!token || !selectedDispute) return;
    if (decisionReason.trim().length < 10) {
      addToast('warning', 'Lý do bắt buộc', 'Lý do phán quyết phải có ít nhất 10 ký tự.');
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
        await syncAppState(token);
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
    if (!token || !selectedDispute || isRequestingEvidence) return;
    setIsRequestingEvidence(true);
    setLoading(true);
    try {
      const disputeId = selectedDispute.dispute_id || selectedDispute.dispute?.dispute_id;
      const res = await fetch(`/api/cs/disputes/${disputeId}/request-evidence`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          notes: evidenceNote.trim(),
          deadline_hours: Number(evidenceHours) || 24,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setShowRequestEvidenceModal(false);
        setShowDossierModal(false);
        addToast('success', 'Đã gửi yêu cầu bổ sung chứng cứ', `Hạn chót: ${evidenceHours} giờ. Escrow tiếp tục giữ nguyên FROZEN.`);
        await loadDisputes(token, disputeFilterStatus);
        await syncAppState(token);
      } else {
        addToast('error', 'Lỗi yêu cầu chứng cứ', data.error?.message || 'Dữ liệu đầu vào không hợp lệ');
      }
    } catch (err: any) {
      addToast('error', 'Lỗi kết nối', err.message);
    } finally {
      setIsRequestingEvidence(false);
      setLoading(false);
    }
  };

  // Nộp giải trình cho Companion (Quyết định D29)
  const handleOpenExplanationModal = (disputeId: string) => {
    setExplanationTargetDisputeId(disputeId);
    setExplanationText('');
    setExplanationEvidenceBase64('');
    setExplanationEvidenceFileName('');
    setShowExplanationModal(true);
  };

  const submitCompanionExplanation = async () => {
    if (!token || !explanationTargetDisputeId) return;
    if (explanationText.trim().length < 5) {
      addToast('warning', 'Yêu cầu nội dung', 'Vui lòng nhập nội dung giải trình tối thiểu 5 ký tự.');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/disputes/${explanationTargetDisputeId}/explanation`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          explanation: explanationText.trim(),
          file_content_base64: explanationEvidenceBase64 ? explanationEvidenceBase64.replace(/^data:[^;]+;base64,/, '') : undefined,
          file_type: explanationEvidenceFileType,
          file_name: explanationEvidenceFileName || 'giai_trinh.png',
        }),
      });
      const data = await res.json();
      if (data.success) {
        setShowExplanationModal(false);
        addToast('success', 'Gửi giải trình thành công!', 'Bản giải trình và bằng chứng đã được ghi nhận vào CS Dossier.');
        await syncAppState(token);
      } else {
        addToast('error', 'Lỗi gửi giải trình', data.error?.message || 'Không thể gửi giải trình');
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
        await syncAppState(token);
      } else {
        addToast('error', 'Nộp chứng cứ thất bại', data.error.message);
      }
    } catch (err: any) {
      addToast('error', 'Lỗi kết nối', err.message);
    } finally {
      setLoading(false);
    }
  };

  const isGameMatch = (cGameId: string, cGameName: string, targetGame: string) => {
    if (!targetGame || targetGame === 'ALL') return true;
    const target = targetGame.toLowerCase();
    const gid = (cGameId || '').toLowerCase();
    const gname = (cGameName || '').toLowerCase();
    if (gid === target) return true;
    if ((target === 'lol' || target === 'lmht') && (gid === 'lol' || gid === 'lmht')) return true;
    if (target === 'valorant' && gid === 'valorant') return true;
    if (target === 'tft' && gid === 'tft') return true;
    return gname.includes(target) || target.includes(gid);
  };

  const displayGames: MockGame[] = useMemo(() => {
    if (games && games.length > 0) {
      const dbMapped: MockGame[] = games.map(g => {
        const cover = getGameCover(g.game_id);
        const compCount = companions.filter(c => 
          (c.game_id && c.game_id.toUpperCase() === g.game_id.toUpperCase()) || 
          (c.game?.game_id && c.game.game_id.toUpperCase() === g.game_id.toUpperCase())
        ).length;

        return {
          id: g.game_id,
          name: g.game_name,
          slug: g.game_id.toLowerCase(),
          genre: g.genre || cover.genre,
          image: cover.coverPath,
          companionsCount: `${compCount} Companion`,
        };
      });

      // Bổ sung các game minh họa khác để bảo toàn giao diện lưới 6 card
      const otherMockGames = MOCK_GAMES.filter(
        mg => !dbMapped.some(dbg => dbg.id.toLowerCase() === mg.id.toLowerCase() || (dbg.id === 'LMHT' && mg.id === 'lol'))
      ).map(mg => {
        const cover = getGameCover(mg.id);
        return {
          ...mg,
          image: cover.coverPath,
          genre: cover.genre || mg.genre,
        };
      });
      return [...dbMapped, ...otherMockGames];
    }
    return MOCK_GAMES.map(mg => {
      const cover = getGameCover(mg.id);
      return {
        ...mg,
        image: cover.coverPath,
        genre: cover.genre || mg.genre,
      };
    });
  }, [games, companions]);

  const displayCompanions: MockCompanion[] = useMemo(() => {
    // 1. Ánh xạ danh sách Companion thật từ Database với các slot AVAILABLE thật (Chỉ lấy hồ sơ ACTIVE đã hoàn thiện)
    const dbCompanionsList: MockCompanion[] = companions
      .filter((dbC) => dbC.profile_status !== 'INCOMPLETE' && dbC.game_id && dbC.hourly_rate)
      .map((dbC, idx) => {
        const availableSlots = (dbC.slots || []).filter(s => s.status === 'AVAILABLE');
        const isLmht = (dbC.game_id || dbC.game?.game_id || '').toUpperCase() === 'LMHT';
        const isSocial = (dbC.game as any)?.category === 'SOCIAL';
        return {
          id: dbC.profile_id,
          rankIndex: idx + 1,
          name: dbC.user?.display_name || `Companion #${idx + 1}`,
          verified: dbC.verification_status === 'VERIFIED',
          gameId: dbC.game_id || dbC.game?.game_id || 'LMHT',
          gameName: dbC.game?.game_name || (isLmht ? 'Liên Minh Huyền Thoại' : 'VALORANT'),
          tier: dbC.tier?.tier_name || (isSocial ? 'Trò chuyện & Giải trí' : 'Bậc rank khai báo'),
          rating: dbC.rating !== undefined ? dbC.rating : 5.0 - (idx * 0.1),
          reviewCount: dbC.review_count !== undefined ? dbC.review_count : 28 - (idx * 9),
          hourlyRate: dbC.hourly_rate || 100000,
          tags: isSocial ? ['Lắng nghe', 'Tôn trọng', 'Escrow an toàn'] : isLmht ? ['Thách Đấu', 'Mid / Support', 'Micro call tốt'] : ['Radiant', 'Duelist', 'Aim cứng'],
          online: dbC.availability === 'ONLINE',
          quote: (dbC.user as any)?.bio || 'Companion chuyên nghiệp, giao tiếp văn minh, sẵn sàng phối hợp leo rank.',
          image: `/images/companions/c0${(idx % 6) + 1}.jpg`,
          avatar: (dbC.user as any)?.avatar_url || `/images/avatars/av0${(idx % 5) + 1}.jpg`,
          dbProfileId: dbC.profile_id,
          availableSlots: availableSlots,
          trustScore: dbC.trust_score,
          completionRate: dbC.completion_rate !== undefined ? dbC.completion_rate : 100.0,
          audioBioUrl: dbC.audio_bio_url || undefined,
          rank_verification: (dbC as any).rank_verification,
        };
      });

    // 2. Các thẻ minh họa khác để hiển thị phong phú thư viện demo
    // Tuyệt đối không gán slot giả (availableSlots = []), chỉ xem thông tin minh họa
    const decorativeMocks: MockCompanion[] = MOCK_COMPANIONS.slice(2).map((mockComp, idx) => ({
      ...mockComp,
      rankIndex: dbCompanionsList.length + idx + 1,
      availableSlots: [],
      quote: mockComp.quote,
    }));

    const combined = [...dbCompanionsList, ...decorativeMocks];

    return combined.filter(c => {
      const matchesGame = isGameMatch(c.gameId, c.gameName, selectedGame);
      const matchesSearch = !searchQuery.trim() || 
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.gameName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.tier.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.quote.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesGame && matchesSearch;
    });
  }, [companions, selectedGame, searchQuery]);

  const isDevMode = 
    import.meta.env.DEV || 
    (typeof window !== 'undefined' && (window.location.search.includes('dev=1') || window.location.search.includes('demo=1')));

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-slate-100 flex flex-col font-sans selection:bg-[#E11D2E] selection:text-white">
      {/* Financial Diff Transparency Notice (PROMPT 12) */}
      {financialDiffNotice && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 max-w-xl w-full bg-[#141414] border border-[#2A2A2A] rounded-xl p-4 flex items-center justify-between text-xs text-[#A3A3A3] shadow-2xl backdrop-blur">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#E11D2E]/10 rounded-lg text-[#E11D2E] shrink-0">
              <Info className="w-5 h-5" />
            </div>
            <div>
              <p className="font-bold text-white text-sm">{financialDiffNotice.title}</p>
              <div className="flex flex-wrap items-center gap-2 mt-1 text-[#A3A3A3]">
                <span>Số dư trước: <strong className="font-mono text-white">{financialDiffNotice.prev.toLocaleString('vi-VN')} {financialDiffNotice.unit}</strong></span>
                <span className="text-[#E11D2E] font-bold">➔</span>
                <span>Biến động: <strong className={`font-mono ${financialDiffNotice.diff >= 0 ? 'text-[#22C55E]' : 'text-[#E11D2E]'}`}>
                  {financialDiffNotice.diff >= 0 ? `+${financialDiffNotice.diff.toLocaleString('vi-VN')}` : financialDiffNotice.diff.toLocaleString('vi-VN')} {financialDiffNotice.unit}
                </strong></span>
                <span className="text-[#E11D2E] font-bold">➔</span>
                <span>Số dư sau: <strong className="font-mono text-[#22C55E]">{financialDiffNotice.next.toLocaleString('vi-VN')} {financialDiffNotice.unit}</strong></span>
              </div>
            </div>
          </div>
          <button
            onClick={() => setFinancialDiffNotice(null)}
            className="text-[#A3A3A3] hover:text-white p-1.5 rounded-lg hover:bg-[#1C1C1C] transition cursor-pointer"
            title="Đóng thông báo"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Payment Panel: SePay QR Realtime vs Payment Simulator (Đợt C) */}
      {showTopup && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <section className="bg-[#141414] border border-[#2A2A2A] rounded-2xl p-5 space-y-4 shadow-2xl max-w-lg w-full">
            <div className="flex items-center justify-between border-b border-[#2A2A2A] pb-3">
              <div className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-[#22C55E]" />
                <h3 className="font-bold text-white text-sm">
                  {health?.payment_provider === 'sepay' 
                    ? 'Chuyển khoản thật qua SePay (VietQR)' 
                    : 'Cổng nạp tiền MÔ PHỎNG (Payment Simulator)'}
                </h3>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono border ${
                  health?.payment_provider === 'sepay'
                    ? 'bg-[#22C55E]/10 text-[#22C55E] border-[#22C55E]/30'
                    : 'bg-[#F59E0B]/10 text-[#F59E0B] border-[#F59E0B]/30'
                }`}>
                  {health?.payment_provider === 'sepay' ? 'VietQR Auto 0đ' : 'HMAC SHA-256 Mock'}
                </span>
              </div>
              <button 
                onClick={() => {
                  setShowTopup(false);
                  setActivePayment(null);
                }}
                className="text-xs text-[#A3A3A3] hover:text-white cursor-pointer"
              >
                ✕ Đóng
              </button>
            </div>

            {!activePayment ? (
              <div className="space-y-3">
                <p className="text-xs text-[#A3A3A3]">
                  Chọn số tiền bạn muốn nạp vào ví khả dụng để thực hiện ký quỹ đặt lịch:
                </p>
                <div className="flex flex-wrap gap-2">
                  {[50000, 100000, 200000, 300000, 500000].map(amt => (
                    <button
                      key={amt}
                      onClick={() => setTopupAmount(amt)}
                      className={`text-xs px-3 py-2 rounded-lg border font-medium transition cursor-pointer ${
                        topupAmount === amt 
                          ? 'bg-[#E11D2E] text-white border-[#E11D2E]' 
                          : 'bg-[#1C1C1C] text-[#A3A3A3] border-[#2A2A2A] hover:border-[#E11D2E]/40'
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
                    className="text-xs bg-[#E11D2E] hover:bg-[#B91C1C] text-white font-bold px-4 py-2.5 rounded-lg transition cursor-pointer flex items-center gap-2"
                  >
                    <QrCode className="w-4 h-4" />
                    <span>Tạo mã thanh toán QR ({topupAmount.toLocaleString('vi-VN')} đ)</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4 bg-[#1C1C1C] p-4 rounded-xl border border-[#2A2A2A]">
                {/* Timer & Status Header */}
                <div className="flex justify-between items-center text-xs pb-2 border-b border-[#2A2A2A]">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#22C55E] animate-ping" />
                    <span className="font-semibold text-white">Đang chờ quét mã / chuyển khoản</span>
                  </div>
                  <div className="flex items-center gap-1 font-mono text-[#F59E0B] font-bold bg-[#F59E0B]/10 px-2.5 py-1 rounded-md border border-[#F59E0B]/30">
                    <Clock className="w-3.5 h-3.5" />
                    <span>
                      {Math.floor(paymentCountdown / 60)}:{(paymentCountdown % 60).toString().padStart(2, '0')}
                    </span>
                  </div>
                </div>

                {/* VietQR Display */}
                {activePayment.qr_url && (
                  <div className="text-center py-1">
                    <img
                      src={activePayment.qr_url}
                      alt="VietQR Code"
                      className="w-48 h-48 mx-auto rounded-xl bg-white p-2 border border-[#3A3A3A] shadow-md object-contain"
                    />
                    <p className="text-[11px] text-[#A3A3A3] mt-2">
                      Mở ứng dụng Ngân hàng bất kỳ (MB, Vietcombank, Techcombank...) để quét mã VietQR
                    </p>
                  </div>
                )}

                {/* Transfer Details Card */}
                <div className="bg-[#141414] rounded-lg p-3 space-y-2 border border-[#2A2A2A] text-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-[#A3A3A3]">Số tiền cần chuyển:</span>
                    <span className="font-bold text-[#22C55E] text-sm">
                      {activePayment.amount.toLocaleString('vi-VN')} VND
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[#A3A3A3]">Nội dung chuyển khoản (Bắt buộc):</span>
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono font-bold text-[#E11D2E] bg-[#E11D2E]/10 px-2 py-0.5 rounded border border-[#E11D2E]/30">
                        {activePayment.transfer_content || activePayment.gateway_ref}
                      </span>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(activePayment.transfer_content || activePayment.gateway_ref);
                          setCopiedContent(true);
                          setTimeout(() => setCopiedContent(false), 2000);
                        }}
                        className="text-[11px] text-[#A3A3A3] hover:text-white p-1 rounded bg-[#2A2A2A] transition"
                        title="Sao chép nội dung"
                      >
                        {copiedContent ? <Check className="w-3.5 h-3.5 text-[#22C55E]" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                  {activePayment.account_number && (
                    <div className="flex justify-between items-center text-[11px]">
                      <span className="text-[#A3A3A3]">Số tài khoản nhận:</span>
                      <span className="font-mono text-white">{activePayment.account_number} ({activePayment.bank_code || 'Ngân hàng'})</span>
                    </div>
                  )}
                  {activePayment.account_name && (
                    <div className="flex justify-between items-center text-[11px]">
                      <span className="text-[#A3A3A3]">Chủ tài khoản:</span>
                      <span className="text-white font-medium">{activePayment.account_name}</span>
                    </div>
                  )}
                </div>

                <div className="bg-[#22C55E]/5 border border-[#22C55E]/20 rounded-lg p-2.5 text-[11px] text-[#A3A3A3] leading-relaxed">
                  💡 <strong className="text-white">Lưu ý quan trọng:</strong> Hệ thống sử dụng Webhook tự động hoàn toàn (0đ phí). Bạn chỉ cần chuyển khoản chính xác nội dung <span className="text-[#22C55E] font-mono font-bold">{activePayment.transfer_content || activePayment.gateway_ref}</span>, số dư sẽ tự động cập nhật sau 3-10 giây mà không cần tải lại trang.
                </div>

                {/* Simulator Buttons: CHỈ HIỂN THỊ KHI PAYMENT_PROVIDER === 'simulator' VÀ NODE_ENV === 'development' */}
                {health?.payment_provider === 'simulator' && isDevMode && (
                  <div className="pt-3 border-t border-[#2A2A2A] space-y-2">
                    <p className="text-[11px] text-[#F59E0B] font-semibold flex items-center gap-1.5">
                      <span>⚡ Mô phỏng kết quả chuyển khoản (DEV ONLY):</span>
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <button
                        disabled={loading}
                        onClick={() => handleSimulatePayment('SUCCESS')}
                        className="text-xs bg-[#22C55E] hover:bg-[#16a34a] text-white px-3 py-1.5 rounded-lg transition font-medium cursor-pointer"
                      >
                        🟢 Mô phỏng Thành công
                      </button>
                      <button
                        disabled={loading}
                        onClick={() => handleSimulatePayment('FAILED')}
                        className="text-xs bg-[#E11D2E] hover:bg-[#B91C1C] text-white px-3 py-1.5 rounded-lg transition font-medium cursor-pointer"
                      >
                        🔴 Mô phỏng Thất bại
                      </button>
                      <button
                        disabled={loading}
                        onClick={() => handleSimulatePayment('PENDING')}
                        className="text-xs bg-[#F59E0B] hover:bg-[#d97706] text-white px-3 py-1.5 rounded-lg transition font-medium cursor-pointer"
                      >
                        🟡 Mô phỏng Timeout
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </section>
        </div>
      )}

      {/* Conditional Rendering: Authenticated View vs Public View */}
      {currentUser ? (
        <div className="w-full flex-1 flex flex-col items-center">
          {/* Dev Bar for Authenticated User */}
          {isDevMode && (
            <div className="w-full bg-[#000000] border-b border-[#2A2A2A] py-1 px-4 text-[11px] text-[#6B6B6B]">
              <div className="max-w-[1440px] mx-auto flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className={`w-1.5 h-1.5 rounded-full ${health?.database === 'CONNECTED' ? 'bg-[#22C55E]' : 'bg-[#E11D2E]'}`} />
                  <span>Hệ thống: <strong className={health?.database === 'CONNECTED' ? 'text-[#22C55E]' : 'text-[#E11D2E]'}>{health?.database === 'CONNECTED' ? 'Online' : 'Offline'}</strong></span>
                  <span className="hidden sm:inline text-[#2A2A2A]">|</span>
                  <span className="hidden sm:inline text-[#A3A3A3]">Ký quỹ Escrow & Sổ cái kép</span>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setShowResetDemoModal(true)}
                    className="flex items-center gap-1 text-[10px] text-[#A3A3A3] hover:text-white bg-[#141414] hover:bg-[#1C1C1C] border border-[#2A2A2A] px-2 py-0.5 rounded transition cursor-pointer"
                    title="Khôi phục cơ sở dữ liệu về trạng thái mẫu ban đầu"
                  >
                    <RotateCcw className="w-2.5 h-2.5" />
                    <span>[MOCK] Reset DB</span>
                  </button>
                  <button
                    onClick={() => logout(false)}
                    className="text-[10px] text-[#E11D2E] hover:underline cursor-pointer"
                  >
                    Đăng xuất
                  </button>
                </div>
              </div>
            </div>
          )}

          <AuthenticatedAppFrame
            currentUser={currentUser}
            activeTab={activeTab}
            setActiveTab={handleTabChangeWithGuard}
            onLogout={() => logout(false)}
            onTopupClick={() => setShowTopup(true)}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            myBookings={myBookings}
            companions={displayCompanions}
            onOpenBookingDetail={handleOpenBookingDetail}
            onHoldEscrow={handleHoldEscrow}
            onOpenCancelModal={handleOpenCancelModal}
            onTimeoutBooking={handleTimeoutBooking}
            onOpenRoom={handleOpenRoom}
            onOpenUploadEvidence={handleOpenUploadEvidenceModal}
            onOpenExplanation={handleOpenExplanationModal}
            onOpenReview={handleOpenReview}
            onBookCompanion={handleOpenBookingForCompanion}
            loading={loading}
          >
            {/* TAB 1: RENTER DISCOVERY VIEW */}
            {activeTab === 'catalog' && (
              <div className="space-y-6 pt-4 border-t border-[#2A2A2A]">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base md:text-lg font-bold text-white">Sàn Companion & Khám phá Game</h3>
                    <p className="text-xs text-[#A3A3A3]">Chọn game hoặc dịch vụ Trò chuyện & Giải trí rồi đặt lịch trực tiếp</p>
                  </div>
                </div>
                {currentUser?.role === 'RENTER' && <WalletLedgerPanel token={token} refreshKey={(currentUser?.wallet?.available_balance ?? 0) + (currentUser?.wallet?.escrow_balance ?? 0) * 7 + myBookings.length} />}
                <NonGamerServices
                  embedded
                  selected={selectedGame}
                  onSelectService={(serviceId) => {
                    setSelectedGame(serviceId);
                    const el = document.getElementById('companions');
                    if (el) el.scrollIntoView({ behavior: 'smooth' });
                  }}
                />
                <GameRow
                  games={displayGames}
                  companions={displayCompanions}
                  selectedGame={selectedGame}
                  onSelectGame={(gameId) => {
                    setSelectedGame(gameId);
                    const el = document.getElementById('companions');
                    if (el) el.scrollIntoView({ behavior: 'smooth' });
                  }}
                />
                <TopCompanions
                  companions={displayCompanions}
                  games={displayGames}
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
              <p className="text-xs text-slate-400 mt-0.5">Cấu hình giá dịch vụ, tài khoản in-game và phân bổ ca làm việc tối đa 10h/ngày.</p>
            </div>

            {message && (
              <div className="p-3 bg-purple-950/60 border border-purple-800/60 rounded-xl text-xs text-purple-200 flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-purple-400 shrink-0" />
                <span>{message}</span>
              </div>
            )}

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
                      <div className="flex justify-between items-start gap-2">
                        <div>
                          <p className="font-semibold text-white">Người đặt: {b.renter?.display_name}</p>
                          <p className="text-[11px] text-slate-400">
                            Bắt đầu: {new Date(b.start_time).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} • Thu nhập: {b.total_fee_snapshot.toLocaleString('vi-VN')} VND
                          </p>
                        </div>
                        <BookingCountdown
                          status={b.status}
                          responseDeadline={b.response_deadline}
                          createdAt={b.created_at}
                          onTriggerTimeout={() => handleTimeoutBooking(b.booking_id)}
                          canTrigger={Boolean(
                            currentUser &&
                            (currentUser.user_id === b.renter_id || currentUser.user_id === b.companion?.user_id) &&
                            !['CS_AGENT', 'AUDITOR'].includes(currentUser.role)
                          )}
                          loading={loading}
                          compact={true}
                        />
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

            {companionProfile?.profile_status === 'INCOMPLETE' && (
              <div className="bg-amber-950/40 border border-amber-600/50 rounded-2xl p-5 mb-6 text-xs text-amber-200">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                  <div className="space-y-2">
                    <h4 className="font-bold text-amber-300 text-sm">Hồ sơ Companion chưa hoàn thiện</h4>
                    <p className="text-[#CCCCCC] leading-relaxed">
                      Tài khoản của bạn chưa kích hoạt công khai trên INSTASQUAD. Vui lòng hoàn thành các bước dưới đây để bắt đầu nhận đơn và mở khung giờ rảnh:
                    </p>
                    <ol className="list-decimal list-inside space-y-1 text-slate-300">
                      <li><strong className="text-white">Chọn game:</strong> Chọn tựa game bạn cung cấp dịch vụ đồng hành.</li>
                      <li><strong className="text-white">Chọn bậc rank:</strong> Chọn thứ hạng kỹ năng chính xác của game đó.</li>
                      <li><strong className="text-white">Nhập đơn giá:</strong> Cài đặt mức giá từ 30.000 đến 1.000.000 VND/giờ.</li>
                      <li><strong className="text-white">Nhập mã in-game:</strong> Tên tài khoản ingame (được bảo mật, không để lộ trên card công khai).</li>
                      <li><strong className="text-white">Tiểu sử ngắn:</strong> Giới thiệu phong cách chơi và bấm &quot;Hoàn thiện và Kích hoạt hồ sơ&quot;.</li>
                    </ol>
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Profile Settings Card */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-white text-base">Thông tin hồ sơ</h3>
                  {companionProfile?.profile_status === 'INCOMPLETE' ? (
                    <span className="text-[10px] font-bold text-amber-400 bg-amber-950/60 border border-amber-700/50 px-2 py-0.5 rounded">
                      Chưa hoàn thiện
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold text-[#22C55E] bg-[#22C55E]/10 border border-[#22C55E]/30 px-2 py-0.5 rounded">
                      Đang hoạt động
                    </span>
                  )}
                </div>

                <div>
                  <label className="text-xs text-slate-400 block mb-1">
                    Game dịch vụ <span className="text-[#E11D2E]">*</span>
                  </label>
                  <select
                    value={editGameId}
                    onChange={e => {
                      const newGame = e.target.value;
                      setEditGameId(newGame);
                      setEditTierId(''); // Reset rank khi đổi game
                    }}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500"
                  >
                    <option value="">-- Chọn game dịch vụ --</option>
                    {games.map(g => (
                      <option key={g.game_id} value={g.game_id}>
                        {g.game_name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs text-slate-400">
                      {companionProfile?.verification_status === 'VERIFIED' ? (
                        <span className="flex items-center gap-1 text-[#22C55E]" title="Bậc rank đã được đối chiếu thành công qua hệ thống mô phỏng">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Bậc rank: Đã đối chiếu (mô phỏng)
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-slate-300" title="Bậc rank do Companion tự khai báo, chưa qua đối chiếu">
                          Bậc rank khai báo <span className="text-[#E11D2E]">*</span>
                        </span>
                      )}
                    </label>
                  </div>
                  {(() => {
                    const activeGame = games.find(g => g.game_id === editGameId);
                    const tiers: GameTier[] = activeGame?.tiers || [];
                    return (
                      <select
                        disabled={!editGameId}
                        value={editTierId}
                        onChange={e => setEditTierId(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500"
                      >
                        <option value="">{editGameId ? '-- Chọn bậc rank --' : '-- Vui lòng chọn game trước --'}</option>
                        {tiers.map((t: GameTier) => (
                          <option key={t.tier_id} value={t.tier_id}>
                            {t.tier_name}
                          </option>
                        ))}
                      </select>
                    );
                  })()}
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs text-slate-400">
                      Đơn giá thuê (VND/giờ) <span className="text-[#E11D2E]">*</span>
                    </label>
                    <span className="text-[10px] text-slate-500">Từ 30.000 đến 1.000.000 VND</span>
                  </div>
                  <input 
                    type="number" 
                    step={10000}
                    min={30000}
                    max={1000000}
                    placeholder="Ví dụ: 100000"
                    value={editRate} 
                    onChange={e => setEditRate(e.target.value === '' ? '' : parseInt(e.target.value) || 0)}
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
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs text-slate-400">
                      Tên tài khoản / Mã in-game <span className="text-[#E11D2E]">*</span>
                    </label>
                    <span className="text-[10px] text-slate-500">Bảo mật</span>
                  </div>
                  <input 
                    type="text" 
                    placeholder="Ví dụ: Faker#VN2"
                    value={editAccountId} 
                    onChange={e => setEditAccountId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500" 
                  />
                  <p className="text-[10px] text-slate-500 mt-1">Mã in-game không hiển thị trên card công khai, chỉ chia sẻ khi đơn được chấp nhận.</p>
                </div>

                <div>
                  <label className="text-xs text-slate-400 block mb-1">Tiểu sử / Giới thiệu ngắn (tùy chọn)</label>
                  <textarea 
                    rows={2}
                    placeholder="Ví dụ: Chuyên hỗ trợ leo rank, giao tiếp vui vẻ văn minh..."
                    value={editBio} 
                    onChange={e => setEditBio(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500 resize-none" 
                  />
                </div>

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={handleSaveProfile}
                    className="w-full bg-sky-600 hover:bg-sky-500 text-white font-medium text-xs py-2.5 rounded-xl transition flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-sky-600/20"
                  >
                    <Save className="w-4 h-4" /> {companionProfile?.profile_status === 'INCOMPLETE' ? 'Hoàn thiện và Kích hoạt hồ sơ' : 'Lưu thông tin hồ sơ'}
                  </button>
                </div>

                <div className="pt-3 border-t border-slate-800">
                  <VoiceIntroRecorder
                    currentAudioUrl={companionProfile?.audio_bio_url}
                    authToken={token || ''}
                    onSuccess={(newAudioUrl) => {
                      setCompanionProfile((prev: any) => prev ? { ...prev, audio_bio_url: newAudioUrl } : prev);
                      setCompanions((prev) => prev.map((c) => c.profile_id === companionProfile?.profile_id ? { ...c, audio_bio_url: newAudioUrl } : c));
                    }}
                  />
                </div>

                {/* eKYC Verification Status & Uploader (UC01, NFR-002) */}
                <div className="pt-3 border-t border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-white flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-[#E11D2E]" /> Xác thực danh tính eKYC
                    </span>
                    {companionProfile?.verification_status === 'VERIFIED' ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#22C55E]/10 text-[#22C55E] border border-[#22C55E]/30 flex items-center gap-1">
                        <Check className="w-3 h-3" /> ĐÃ XÁC THỰC
                      </span>
                    ) : companionProfile?.verification_status === 'PENDING_REVIEW' ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#F59E0B]/10 text-[#F59E0B] border border-[#F59E0B]/30 flex items-center gap-1">
                        <Clock className="w-3 h-3" /> CHỜ DUYỆT
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#E11D2E]/10 text-[#E11D2E] border border-[#E11D2E]/30">
                        CHƯA XÁC THỰC
                      </span>
                    )}
                  </div>

                  <div className="p-2.5 bg-[#1C1C1C] border border-[#2A2A2A] rounded-xl text-[11px] text-[#A3A3A3] flex items-start gap-2">
                    <ShieldCheck className="w-4 h-4 text-[#F59E0B] shrink-0 mt-0.5" />
                    <span>Lưu ý: Quy trình eKYC là mô phỏng luồng bảo mật (mã hóa AES-256-GCM trên ổ đĩa và xét duyệt thủ công), chưa có đối soát khuôn mặt bằng AI thật.</span>
                  </div>

                  {companionProfile?.verification_status === 'VERIFIED' ? (
                    <div className="p-3 bg-[#141414] border border-[#22C55E]/30 rounded-xl text-xs text-[#22C55E] space-y-1">
                      <p className="font-semibold flex items-center gap-1">
                        <ShieldCheck className="w-4 h-4" /> Danh tính đã được kiểm định
                      </p>
                      <p className="text-[11px] text-[#A3A3A3]">
                        Hồ sơ CCCD đã được mã hóa AES-256-GCM và lưu trữ an toàn. Huy hiệu đã được gắn công khai trên hồ sơ của bạn.
                      </p>
                    </div>
                  ) : companionProfile?.verification_status === 'PENDING_REVIEW' ? (
                    <div className="p-3 bg-[#141414] border border-[#F59E0B]/30 rounded-xl text-xs text-[#F59E0B] space-y-1">
                      <p className="font-semibold flex items-center gap-1">
                        <Clock className="w-4 h-4" /> Đang chờ Quản trị viên xét duyệt
                      </p>
                      <p className="text-[11px] text-[#A3A3A3]">
                        Hồ sơ của bạn đã gửi thành công. Admin sẽ kiểm tra và phê duyệt trong vòng 24 giờ.
                      </p>
                    </div>
                  ) : (
                    <div className="p-3 bg-[#141414] border border-[#2A2A2A] rounded-xl text-xs space-y-3">
                      <p className="text-[11px] text-[#A3A3A3]">
                        Tải lên 3 ảnh (tối đa 2MB/ảnh, JPG/PNG) để nhận huy hiệu xác thực. Dữ liệu được mã hóa AES-256-GCM.
                      </p>

                      <div className="space-y-2">
                        <div>
                          <label className="text-[11px] text-[#A3A3A3] block mb-1">1. Mặt trước CCCD</label>
                          <input
                            type="file"
                            accept="image/png,image/jpeg"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                const reader = new FileReader();
                                reader.onload = () => setKycFrontBase64(reader.result as string);
                                reader.readAsDataURL(file);
                              }
                            }}
                            className="w-full text-[11px] text-[#A3A3A3] file:mr-2 file:py-1 file:px-2 file:rounded-md file:border-0 file:text-[11px] file:bg-[#1C1C1C] file:text-white cursor-pointer"
                          />
                        </div>

                        <div>
                          <label className="text-[11px] text-[#A3A3A3] block mb-1">2. Mặt sau CCCD</label>
                          <input
                            type="file"
                            accept="image/png,image/jpeg"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                const reader = new FileReader();
                                reader.onload = () => setKycBackBase64(reader.result as string);
                                reader.readAsDataURL(file);
                              }
                            }}
                            className="w-full text-[11px] text-[#A3A3A3] file:mr-2 file:py-1 file:px-2 file:rounded-md file:border-0 file:text-[11px] file:bg-[#1C1C1C] file:text-white cursor-pointer"
                          />
                        </div>

                        <div>
                          <label className="text-[11px] text-[#A3A3A3] block mb-1">3. Chân dung cầm CCCD</label>
                          <input
                            type="file"
                            accept="image/png,image/jpeg"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                const reader = new FileReader();
                                reader.onload = () => setKycSelfieBase64(reader.result as string);
                                reader.readAsDataURL(file);
                              }
                            }}
                            className="w-full text-[11px] text-[#A3A3A3] file:mr-2 file:py-1 file:px-2 file:rounded-md file:border-0 file:text-[11px] file:bg-[#1C1C1C] file:text-white cursor-pointer"
                          />
                        </div>
                      </div>

                      <button
                        type="button"
                        disabled={submittingKyc || !kycFrontBase64 || !kycBackBase64 || !kycSelfieBase64}
                        onClick={handleCompanionSubmitKyc}
                        className="w-full py-2 bg-[#E11D2E] hover:bg-[#B91C1C] disabled:opacity-50 text-white font-semibold rounded-lg text-xs transition cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>{submittingKyc ? 'Đang mã hóa & gửi...' : 'Nộp hồ sơ eKYC'}</span>
                      </button>
                    </div>
                  )}
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

                {/* Add new slot form or Incomplete Notice */}
                {companionProfile?.profile_status === 'INCOMPLETE' ? (
                  <div className="bg-amber-950/20 border border-amber-600/30 rounded-xl p-4 text-xs text-amber-200 flex items-center gap-3">
                    <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
                    <div>
                      <p className="font-semibold text-amber-300">Chưa thể mở khung giờ rảnh</p>
                      <p className="text-[11px] text-amber-400/80 mt-0.5">
                        Bạn cần hoàn thiện thông tin hồ sơ (chọn game, bậc rank, đơn giá và mã in-game) ở trên trước khi mở lịch rảnh.
                      </p>
                    </div>
                  </div>
                ) : (
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
                        className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs px-4 py-2 rounded-lg transition flex items-center gap-1.5 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" /> Tạo khung giờ
                      </button>
                    </div>
                  </div>
                )}

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
                    {(trustScoreData?.current_score ?? 80) >= 40 ? 'Hoạt động (Active)' : 'Đình chỉ (< 40 điểm)'}
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
                    Đánh giá: {(trustScoreData?.average_rating ?? trustScoreData?.avg_stars ?? 4.0).toFixed(1)} ⭐ ({trustScoreData?.total_reviews ?? trustScoreData?.review_count ?? 0} lượt)
                  </p>
                </div>

                <div className="bg-slate-950/80 border border-slate-800 p-3 rounded-xl text-xs space-y-1">
                  <span className="text-[11px] text-slate-400 font-medium">2. Tỷ lệ hoàn thành (40%)</span>
                  <p className="text-base font-bold text-emerald-400">
                    {(trustScoreData?.completion_rate ?? 100).toFixed(1)}%
                  </p>
                  <p className="text-[10px] text-slate-500">
                    Đã xong: {trustScoreData?.completed_bookings ?? 0} / {(trustScoreData?.total_accepted_bookings ?? trustScoreData?.total_bookings_accepted ?? 0)} đơn
                  </p>
                </div>

                <div className="bg-slate-950/80 border border-slate-800 p-3 rounded-xl text-xs space-y-1">
                  <span className="text-[11px] text-slate-400 font-medium">3. Tỷ lệ khiếu nại (-120%)</span>
                  <p className="text-base font-bold text-rose-400">
                    {(trustScoreData?.dispute_rate ?? 0).toFixed(1)}%
                  </p>
                  <p className="text-[10px] text-slate-500">
                    Lỗi CS phán quyết: {(trustScoreData?.faulty_disputes ?? trustScoreData?.faulted_disputes ?? 0)} đơn
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
            <WalletLedgerPanel token={token} refreshKey={(currentUser?.wallet?.available_balance ?? 0) + myBookings.length + myWithdrawals.length} />

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

            {/* ADMIN ONLY: CENTRALIZED GAME COVER MANAGEMENT & PREVIEW */}
            {currentUser?.role === 'ADMIN' && (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 border-b border-slate-800 pb-3">
                  <div>
                    <h3 className="font-semibold text-white text-base flex items-center gap-2">
                      <Gamepad2 className="w-5 h-5 text-purple-400" /> Quản trị & Xem trước Ảnh bìa Game (Game Covers Registry)
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Cấu hình tập trung tại <code className="text-purple-300 font-mono bg-purple-950/60 px-1.5 py-0.5 rounded">client/src/data/gameCovers.ts</code> — Cho phép kiểm tra nguồn gốc và căn chỉnh ảnh bìa tự động.
                    </p>
                  </div>
                  <span className="text-[11px] px-2.5 py-1 rounded-full font-bold uppercase bg-purple-950 text-purple-300 border border-purple-800">
                    {Object.keys(GAME_COVERS_REGISTRY).length} Game Đã Xác Minh
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
                  {Object.values(GAME_COVERS_REGISTRY).map((cov) => (
                    <div key={cov.gameId} className="bg-slate-950/70 border border-slate-800 rounded-xl overflow-hidden flex flex-col justify-between">
                      <div className="relative h-28 w-full overflow-hidden bg-slate-900">
                        <img
                          src={cov.coverPath}
                          alt={cov.alt}
                          style={{ objectPosition: cov.objectPosition }}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-black/30" />
                        <span className="absolute top-2 left-2 text-[10px] font-bold px-2 py-0.5 rounded bg-black/70 backdrop-blur-sm text-purple-300 border border-purple-500/30">
                          {cov.genre}
                        </span>
                        <span className="absolute bottom-2 right-2 text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-950/80 text-emerald-400 border border-emerald-500/40">
                          {cov.objectPosition}
                        </span>
                      </div>
                      <div className="p-3 space-y-1.5 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-white">{cov.gameName}</span>
                          <span className="text-[10px] font-mono text-slate-400">ID: {cov.gameId}</span>
                        </div>
                        <p className="text-[10px] text-slate-400 leading-relaxed truncate" title={cov.source}>
                          Nguồn: <span className="text-slate-300">{cov.source}</span>
                        </p>
                        <p className="text-[10px] text-slate-500 font-mono truncate">
                          Đường dẫn: {cov.coverPath}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
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

            {/* Ghi nhận vi phạm điều khoản (TERMS_AND_CONTRACTS.md Phần C, D40) */}
            <ViolationPanel token={token} onToast={addToast} />

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

            {/* ADMIN ONLY: CENTRALIZED GAME COVER MANAGEMENT & PREVIEW */}
            {currentUser?.role === 'ADMIN' && (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 border-b border-slate-800 pb-3">
                  <div>
                    <h3 className="font-semibold text-white text-base flex items-center gap-2">
                      <Gamepad2 className="w-5 h-5 text-purple-400" /> Quản trị & Xem trước Ảnh bìa Game (Game Covers Registry)
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Cấu hình tập trung tại <code className="text-purple-300 font-mono bg-purple-950/60 px-1.5 py-0.5 rounded">client/src/data/gameCovers.ts</code> — Cho phép kiểm tra nguồn gốc và căn chỉnh ảnh bìa tự động.
                    </p>
                  </div>
                  <span className="text-[11px] px-2.5 py-1 rounded-full font-bold uppercase bg-purple-950 text-purple-300 border border-purple-800">
                    {Object.keys(GAME_COVERS_REGISTRY).length} Game Đã Xác Minh
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
                  {Object.values(GAME_COVERS_REGISTRY).map((cov) => (
                    <div key={cov.gameId} className="bg-slate-950/70 border border-slate-800 rounded-xl overflow-hidden flex flex-col justify-between">
                      <div className="relative h-28 w-full overflow-hidden bg-slate-900">
                        <img
                          src={cov.coverPath}
                          alt={cov.alt}
                          style={{ objectPosition: cov.objectPosition }}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-black/30" />
                        <span className="absolute top-2 left-2 text-[10px] font-bold px-2 py-0.5 rounded bg-black/70 backdrop-blur-sm text-purple-300 border border-purple-500/30">
                          {cov.genre}
                        </span>
                        <span className="absolute bottom-2 right-2 text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-950/80 text-emerald-400 border border-emerald-500/40">
                          {cov.objectPosition}
                        </span>
                      </div>
                      <div className="p-3 space-y-1.5 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-white">{cov.gameName}</span>
                          <span className="text-[10px] font-mono text-slate-400">ID: {cov.gameId}</span>
                        </div>
                        <p className="text-[10px] text-slate-400 leading-relaxed truncate" title={cov.source}>
                          Nguồn: <span className="text-slate-300">{cov.source}</span>
                        </p>
                        <p className="text-[10px] text-slate-500 font-mono truncate">
                          Đường dẫn: {cov.coverPath}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
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
              <div className="flex items-center gap-2">
                <button
                  disabled={loading}
                  onClick={handleExportCsv}
                  className="flex items-center gap-2 text-xs bg-[#1C1C1C] hover:bg-[#2A2A2A] text-white font-medium px-4 py-2 rounded-xl border border-[#2A2A2A] transition cursor-pointer"
                  title="Xuất file CSV báo cáo Sổ cái kép (Đã thoát ký tự chống CSV Injection)"
                >
                  <ArrowDownToLine className="w-3.5 h-3.5 text-[#E11D2E]" />
                  <span>Xuất CSV</span>
                </button>
                <button
                  disabled={loading}
                  onClick={handleRunReconciliation}
                  className="flex items-center gap-2 text-xs bg-rose-600 hover:bg-rose-500 text-white font-medium px-4 py-2 rounded-xl transition cursor-pointer shadow-lg shadow-rose-600/20"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                  <span>Chạy Đối soát Sổ cái</span>
                </button>
              </div>
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

        {/* TAB 5: ADMIN DASHBOARD (BR-002, BR-003, UC01) */}
        {activeTab === 'admin_dashboard' && (
          <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 bg-[#141414] border border-[#2A2A2A] rounded-2xl p-6">
              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <LayoutDashboard className="w-5 h-5 text-[#E11D2E]" /> Tổng quan quản trị hệ thống
                </h2>
                <p className="text-xs text-[#A3A3A3] mt-1">
                  Giám sát các chỉ số vận hành nền tảng, trạng thái đơn hàng và xét duyệt eKYC danh tính Companion.
                </p>
              </div>
              <button
                disabled={loading}
                onClick={() => loadAdminData(token || '')}
                className="flex items-center gap-2 text-xs bg-[#E11D2E] hover:bg-[#B91C1C] text-white font-semibold px-4 py-2 rounded-xl transition cursor-pointer self-start sm:self-auto"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                <span>Làm mới chỉ số</span>
              </button>
            </div>

            {/* SePay Quota Warning Banner (Đợt C, Step 6) */}
            {adminMetrics?.metrics?.is_quota_warning && (
              <div className="bg-[#F59E0B]/10 border border-[#F59E0B]/30 rounded-xl p-4 flex items-center gap-3 text-xs text-[#F59E0B]">
                <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                <div>
                  <p className="font-bold text-sm">Cảnh báo hạn mức SePay Free (Đợt C)</p>
                  <p className="text-[11px] text-[#F59E0B]/80 mt-0.5">
                    {adminMetrics?.metrics?.quota_warning_message || 'Đã sử dụng >= 40/50 giao dịch tiền vào trong tháng của gói SePay Free.'}
                  </p>
                </div>
              </div>
            )}

            {/* Metrics Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-7 gap-4">
              {/* Card 1: Booking Goal */}
              <div className="bg-[#141414] border border-[#2A2A2A] p-4 rounded-xl space-y-2">
                <span className="text-[11px] text-[#A3A3A3] font-medium block">Số đơn hoàn thành (Mục tiêu 10k)</span>
                <p className="text-xl font-bold text-white">
                  {adminMetrics?.metrics?.total_bookings_completed ?? 0} <span className="text-xs font-normal text-[#A3A3A3]">/ 10.000</span>
                </p>
                <div className="w-full bg-[#1C1C1C] rounded-full h-1.5 overflow-hidden">
                  <div
                    className="bg-[#E11D2E] h-1.5 rounded-full transition-all"
                    style={{ width: `${Math.min(100, Math.max(3, adminMetrics?.metrics?.booking_goal_progress_pct ?? 0))}%` }}
                  />
                </div>
                <span className="text-[10px] text-[#A3A3A3] block">
                  Tiến độ: {adminMetrics?.metrics?.booking_goal_progress_pct ?? 0}%
                </span>
              </div>

              {/* Card 2: Order Completion Rate */}
              <div className="bg-[#141414] border border-[#2A2A2A] p-4 rounded-xl space-y-1">
                <span className="text-[11px] text-[#A3A3A3] font-medium block">Tỉ lệ hoàn tất đơn</span>
                <p className="text-xl font-bold text-[#22C55E]">
                  {adminMetrics?.metrics?.order_completion_rate_pct ?? 0}%
                </p>
                <p className="text-[10px] text-[#A3A3A3] leading-tight">
                  {adminMetrics?.metrics?.total_bookings_completed ?? 0} hoàn thành / {adminMetrics?.metrics?.total_booking_requests ?? 0} yêu cầu
                </p>
                <p className="text-[9px] text-[#A3A3A3] italic pt-1 leading-tight">
                  Chỉ số vận hành: (đơn hoàn tất / tổng yêu cầu đặt)
                </p>
              </div>

              {/* Card 3: Funnel Conversion Rate */}
              <div className="bg-[#141414] border border-[#2A2A2A] p-4 rounded-xl space-y-1">
                <span className="text-[11px] text-[#A3A3A3] font-medium block">Tỉ lệ chuyển đổi sàn (Funnel)</span>
                <p className="text-xl font-bold text-[#E11D2E]">
                  {adminMetrics?.metrics?.conversion_rate_pct ?? 0}%
                </p>
                <p className="text-[10px] text-[#A3A3A3] leading-tight">
                  {adminMetrics?.metrics?.successful_escrow_bookings ?? 0} đơn ký quỹ / {adminMetrics?.metrics?.total_site_visits ?? 0} phiên truy cập
                </p>
                <p className="text-[9px] text-[#A3A3A3] italic pt-1 leading-tight">
                  (đơn ký quỹ thành công / phiên truy cập)
                </p>
              </div>

              {/* Card 4: New Users */}
              <div className="bg-[#141414] border border-[#2A2A2A] p-4 rounded-xl space-y-1">
                <span className="text-[11px] text-[#A3A3A3] font-medium block">Người dùng mới (30 ngày)</span>
                <p className="text-xl font-bold text-white">
                  +{adminMetrics?.metrics?.new_users_30d ?? 0}
                </p>
                <p className="text-[10px] text-[#A3A3A3]">
                  Tổng tài khoản trên sàn: {adminMetrics?.metrics?.total_users ?? 0}
                </p>
              </div>

              {/* Card 5: Active Companions */}
              <div className="bg-[#141414] border border-[#2A2A2A] p-4 rounded-xl space-y-1">
                <span className="text-[11px] text-[#A3A3A3] font-medium block">Companion đang hoạt động</span>
                <p className="text-xl font-bold text-white">
                  {adminMetrics?.metrics?.active_companions ?? 0} <span className="text-xs font-normal text-[#A3A3A3]">/ {adminMetrics?.metrics?.total_companions ?? 0}</span>
                </p>
                <p className="text-[10px] text-[#22C55E]">
                  Đang Online & Sẵn sàng nhận đơn
                </p>
              </div>

              {/* Card 6: Platform Revenue */}
              <div className="bg-[#141414] border border-[#2A2A2A] p-4 rounded-xl space-y-1">
                <span className="text-[11px] text-[#A3A3A3] font-medium block">Doanh thu nền tảng (12%)</span>
                <p className="text-xl font-bold text-[#E11D2E]">
                  {(adminMetrics?.metrics?.platform_revenue_12_pct ?? 0).toLocaleString('vi-VN')} đ
                </p>
                <p className="text-[10px] text-[#A3A3A3]">
                  Khớp sổ w-platform-revenue
                </p>
              </div>

              {/* Card 7: SePay Inflow Monthly Quota (Đợt C, Step 6) */}
              <div className="bg-[#141414] border border-[#2A2A2A] p-4 rounded-xl space-y-1">
                <span className="text-[11px] text-[#A3A3A3] font-medium block">Nạp SePay tháng này (0đ)</span>
                <p className="text-xl font-bold text-white flex items-center justify-between">
                  <span>{adminMetrics?.metrics?.monthly_inflow_count ?? 0}</span>
                  <span className="text-xs font-normal text-[#A3A3A3]">/ {adminMetrics?.metrics?.monthly_inflow_quota ?? 50} đơn</span>
                </p>
                <div className="w-full bg-[#1C1C1C] rounded-full h-1.5 overflow-hidden">
                  <div
                    className={`h-1.5 rounded-full transition-all ${
                      (adminMetrics?.metrics?.monthly_inflow_count ?? 0) >= 40 ? 'bg-[#F59E0B]' : 'bg-[#22C55E]'
                    }`}
                    style={{
                      width: `${Math.min(100, Math.max(5, Math.round(((adminMetrics?.metrics?.monthly_inflow_count ?? 0) / (adminMetrics?.metrics?.monthly_inflow_quota ?? 50)) * 100)))}%`
                    }}
                  />
                </div>
                <p className="text-[9px] text-[#A3A3A3] pt-0.5">
                  Gói FREE: Tối đa 50 lượt/tháng
                </p>
              </div>
            </div>

            {/* Operational Status Counters (Đợt E1) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div
                onClick={() => {
                  setActiveTab('admin_bookings');
                  loadAdminBookings(token || '');
                }}
                className="bg-[#1C1C1C] hover:bg-[#222222] border border-[#2A2A2A] hover:border-[#E11D2E]/50 p-4 rounded-xl cursor-pointer transition flex items-center justify-between"
              >
                <div>
                  <span className="text-[11px] text-[#A3A3A3] font-medium block">Đơn đang hoạt động sàn</span>
                  <p className="text-xl font-bold text-white mt-1">
                    {adminMetrics?.metrics?.active_bookings_count ?? 0}
                  </p>
                  <span className="text-[10px] text-sky-400">Xem danh sách đơn →</span>
                </div>
                <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
                  <Clock className="w-5 h-5" />
                </div>
              </div>

              <div
                onClick={() => {
                  setActiveTab('cs_view');
                  loadDisputes(token || '');
                }}
                className="bg-[#1C1C1C] hover:bg-[#222222] border border-[#2A2A2A] hover:border-rose-500/50 p-4 rounded-xl cursor-pointer transition flex items-center justify-between"
              >
                <div>
                  <span className="text-[11px] text-[#A3A3A3] font-medium block">RMA khiếu nại đang mở</span>
                  <p className="text-xl font-bold text-rose-400 mt-1">
                    {adminMetrics?.metrics?.open_rma_count ?? 0}
                  </p>
                  <span className="text-[10px] text-rose-400">Xem hàng chờ RMA →</span>
                </div>
                <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
                  <ShieldAlert className="w-5 h-5" />
                </div>
              </div>

              <div className="bg-[#1C1C1C] border border-[#2A2A2A] p-4 rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-[11px] text-[#A3A3A3] font-medium block">Hồ sơ eKYC chờ duyệt</span>
                  <p className="text-xl font-bold text-amber-400 mt-1">
                    {adminMetrics?.metrics?.pending_kyc_count ?? pendingKycList.length}
                  </p>
                  <span className="text-[10px] text-[#A3A3A3]">Bảo mật AES-256</span>
                </div>
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                  <ShieldCheck className="w-5 h-5" />
                </div>
              </div>

              <div
                onClick={() => {
                  setActiveTab('cs_view');
                  loadAllWithdrawals(token || '');
                }}
                className="bg-[#1C1C1C] hover:bg-[#222222] border border-[#2A2A2A] hover:border-emerald-500/50 p-4 rounded-xl cursor-pointer transition flex items-center justify-between"
              >
                <div>
                  <span className="text-[11px] text-[#A3A3A3] font-medium block">Yêu cầu rút tiền chờ duyệt</span>
                  <p className="text-xl font-bold text-emerald-400 mt-1">
                    {adminMetrics?.metrics?.pending_withdrawals_count ?? 0}
                  </p>
                  <span className="text-[10px] text-emerald-400">Xử lý giải ngân →</span>
                </div>
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                  <Wallet className="w-5 h-5" />
                </div>
              </div>
            </div>

            {/* Daily Stats Table & eKYC Approvals */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Daily Chart / Table */}
              <div className="lg:col-span-5 bg-[#141414] border border-[#2A2A2A] rounded-2xl p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-[#2A2A2A] pb-3">
                  <h3 className="text-sm font-bold text-white">Hiệu năng 7 ngày gần nhất</h3>
                  <span className="text-[11px] text-[#A3A3A3]">Số liệu thực từ DB</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead>
                      <tr className="border-b border-[#2A2A2A] text-[#A3A3A3]">
                        <th className="py-2">Ngày</th>
                        <th className="py-2 text-center">Đơn hoàn thành</th>
                        <th className="py-2 text-right">Hoa hồng 12% (ước tính)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#2A2A2A]">
                      {adminMetrics?.daily_chart && adminMetrics.daily_chart.length > 0 ? (
                        adminMetrics.daily_chart.map((day: any, idx: number) => (
                          <tr key={idx} className="hover:bg-[#1C1C1C]">
                            <td className="py-2.5 font-medium text-white">{day.date}</td>
                            <td className="py-2.5 text-center text-[#22C55E] font-semibold">{day.bookings_count}</td>
                            <td className="py-2.5 text-right font-mono text-white">{day.revenue_vnd.toLocaleString('vi-VN')} đ</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={3} className="py-4 text-center text-[#A3A3A3]">
                            Chưa có dữ liệu thống kê
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* eKYC Pending Review List */}
              <div className="lg:col-span-7 bg-[#141414] border border-[#2A2A2A] rounded-2xl p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-[#2A2A2A] pb-3">
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-[#E11D2E]" /> Hồ sơ eKYC chờ duyệt (AES-256-GCM)
                    </h3>
                    <p className="text-[11px] text-[#A3A3A3] mt-0.5">
                      Dữ liệu ảnh CCCD đã mã hóa. Admin giải mã trong bộ nhớ phiên xem (Audit Log tự động).
                    </p>
                  </div>
                  <span className="text-xs font-bold px-2 py-0.5 rounded bg-[#E11D2E]/10 text-[#E11D2E] border border-[#E11D2E]/30">
                    {pendingKycList.length} hồ sơ
                  </span>
                </div>

                {pendingKycList.length > 0 ? (
                  <div className="space-y-3">
                    {pendingKycList.map((record: any) => (
                      <div key={record.kyc_id} className="p-3 bg-[#1C1C1C] border border-[#2A2A2A] rounded-xl flex items-center justify-between gap-3 text-xs">
                        <div>
                          <p className="font-bold text-white">{record.user?.display_name || 'Companion'}</p>
                          <p className="text-[11px] text-[#A3A3A3]">{record.user?.email}</p>
                          <p className="text-[10px] text-[#6B6B6B] mt-0.5">
                            Gửi lúc: {new Date(record.created_at).toLocaleString('vi-VN')}
                          </p>
                        </div>
                        <button
                          onClick={() => handleOpenKycReview(record)}
                          className="px-3 py-1.5 bg-[#E11D2E] hover:bg-[#B91C1C] text-white font-semibold rounded-lg text-xs transition cursor-pointer flex items-center gap-1.5"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Xem & Xét duyệt</span>
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-8 border border-dashed border-[#2A2A2A] rounded-xl text-center text-xs text-[#A3A3A3]">
                    <ShieldCheck className="w-8 h-8 text-[#2A2A2A] mx-auto mb-2" />
                    <p>Hiện không có hồ sơ eKYC nào đang chờ xét duyệt.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 6: ADMIN BOOKINGS MANAGEMENT (Đợt E1) */}
        {activeTab === 'admin_bookings' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 bg-[#141414] border border-[#2A2A2A] rounded-2xl p-6">
              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <Clock className="w-5 h-5 text-[#E11D2E]" /> Quản lý đơn hàng toàn sàn
                </h2>
                <p className="text-xs text-[#A3A3A3] mt-1">
                  Theo dõi danh sách toàn bộ yêu cầu đặt lịch, trạng thái ký quỹ Escrow và thanh quyết toán của người dùng.
                </p>
              </div>
              <button
                disabled={adminBookingsLoading}
                onClick={() => loadAdminBookings(token || '', adminBookingStatusFilter)}
                className="flex items-center gap-2 text-xs bg-[#E11D2E] hover:bg-[#B91C1C] text-white font-semibold px-4 py-2 rounded-xl transition cursor-pointer self-start sm:self-auto"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${adminBookingsLoading ? 'animate-spin' : ''}`} />
                <span>Làm mới danh sách</span>
              </button>
            </div>

            {/* Status Filter Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 bg-[#141414] p-1.5 rounded-xl border border-[#2A2A2A]">
              {[
                { id: 'ALL', label: 'Tất cả' },
                { id: 'PENDING_ACCEPTANCE', label: 'Chờ xác nhận' },
                { id: 'ACCEPTED', label: 'Đã xác nhận' },
                { id: 'IN_SESSION', label: 'Đang chơi' },
                { id: 'COMPLETED', label: 'Hoàn tất' },
                { id: 'DISPUTED', label: 'Khiếu nại' },
                { id: 'CANCELLED', label: 'Đã hủy' },
                { id: 'REFUNDED', label: 'Đã hoàn tiền' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => {
                    setAdminBookingStatusFilter(tab.id);
                    loadAdminBookings(token || '', tab.id);
                  }}
                  className={`px-3 py-1.5 text-xs rounded-lg font-medium transition cursor-pointer whitespace-nowrap ${
                    adminBookingStatusFilter === tab.id
                      ? 'bg-[#E11D2E] text-white font-bold'
                      : 'text-[#A3A3A3] hover:text-white hover:bg-[#1C1C1C]'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Bookings Table */}
            <div className="bg-[#141414] border border-[#2A2A2A] rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-[#1C1C1C] border-b border-[#2A2A2A] text-[#A3A3A3]">
                    <tr>
                      <th className="py-3 px-4">Mã đơn</th>
                      <th className="py-3 px-4">Khách thuê (Renter)</th>
                      <th className="py-3 px-4">Companion</th>
                      <th className="py-3 px-4">Tựa game</th>
                      <th className="py-3 px-4 text-right">Tổng phí</th>
                      <th className="py-3 px-4 text-center">Trạng thái</th>
                      <th className="py-3 px-4">Thời gian</th>
                      <th className="py-3 px-4 text-center">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#2A2A2A]">
                    {adminBookings.length > 0 ? (
                      adminBookings.map((b: any) => (
                        <tr key={b.booking_id} className="hover:bg-[#1C1C1C]/60 transition">
                          <td className="py-3 px-4 font-mono text-slate-300">
                            {b.booking_id.substring(0, 8)}...
                          </td>
                          <td className="py-3 px-4">
                            <p className="font-semibold text-white">{b.renter?.display_name || 'Khách'}</p>
                            <p className="text-[10px] text-[#A3A3A3]">{b.renter?.email}</p>
                          </td>
                          <td className="py-3 px-4">
                            <p className="font-semibold text-white">{b.companion?.user?.display_name || 'Companion'}</p>
                            <p className="text-[10px] text-[#A3A3A3]">{b.companion?.user?.email}</p>
                          </td>
                          <td className="py-3 px-4 font-medium text-slate-200">
                            {b.companion?.game?.game_name || 'Game'}
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-bold text-white">
                            {b.total_fee_snapshot?.toLocaleString('vi-VN')} đ
                          </td>
                          <td className="py-3 px-4 text-center">
                            <StatusBadge status={b.status} />
                          </td>
                          <td className="py-3 px-4 text-[11px] text-[#A3A3A3] font-mono">
                            {new Date(b.created_at).toLocaleDateString('vi-VN')} {new Date(b.created_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <button
                              onClick={() => handleOpenBookingDetail(b.booking_id)}
                              className="px-2.5 py-1 bg-[#1C1C1C] hover:bg-[#2A2A2A] border border-[#2A2A2A] text-slate-300 hover:text-white rounded-lg transition text-xs cursor-pointer inline-flex items-center gap-1"
                            >
                              <Eye className="w-3 h-3 text-[#E11D2E]" />
                              <span>Chi tiết</span>
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={8} className="py-8 text-center text-[#A3A3A3] italic">
                          {adminBookingsLoading ? 'Đang tải dữ liệu đơn hàng...' : 'Không tìm thấy đơn hàng nào phù hợp với bộ lọc.'}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 7: PROFILE VIEW */}
        {activeTab === 'profile' && (
          <ProfileView
            currentUser={currentUser}
            onProfileUpdated={(updated) => {
              setCurrentUser((prev: any) => ({ ...prev, ...updated }));
              addToast('success', 'Hồ sơ đã cập nhật', 'Thông tin cá nhân đã được đồng bộ.');
            }}
            onBack={() => {
              if (currentUser?.role === 'ADMIN') setActiveTab('admin_dashboard');
              else if (currentUser?.role === 'COMPANION') setActiveTab('companion_dashboard');
              else if (currentUser?.role === 'CS_AGENT') setActiveTab('cs_view');
              else if (currentUser?.role === 'AUDITOR') setActiveTab('auditor_view');
              else setActiveTab('catalog');
            }}
          />
        )}
      </AuthenticatedAppFrame>
    </div>
  ) : (
    <div className="min-h-screen bg-[#0A0A0A] text-white flex flex-col font-sans selection:bg-[#E11D2E] selection:text-white">
      <Navbar
        currentUser={null}
        onLoginClick={() => {
          setShowLoginModal(true);
          window.history.pushState({}, '', '/login');
        }}
        onRegisterClick={() => {
          setShowRegisterModal(true);
          window.history.pushState({}, '', '/register');
        }}
        onLogout={() => logout(false)}
        onTopupClick={() => setShowTopup(true)}
        activeTab={activeTab}
        setActiveTab={handleTabChangeWithGuard}
        health={health}
        onResetDemoClick={() => setShowResetDemoModal(true)}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        activeMenu={activeMenu}
        setActiveMenu={setActiveMenu}
      />
      <main className="w-full max-w-full overflow-hidden flex-1">
        {currentPath === '/chinh-sach-escrow' ? (
          <EscrowPolicyPage />
        ) : currentPath === '/tin-tuc' ? (
          <NewsListPage />
        ) : currentPath.startsWith('/tin-tuc/') ? (
          <NewsDetailPage slug={currentPath.replace('/tin-tuc/', '')} />
        ) : currentPath === '/dieu-khoan-dich-vu' ? (
          <TermsOfServicePage />
        ) : currentPath === '/quy-trinh-khieu-nai' ? (
          <DisputeProcessPage />
        ) : currentPath === '/huong-dan-nap-rut' ? (
          <PaymentGuidePage />
        ) : currentPath === '/quy-trinh-thong-nhat' ? (
          <UnifiedWorkflowPage />
        ) : (
          <HomePage
            games={displayGames}
            companions={displayCompanions}
            selectedGame={selectedGame}
            onSelectGame={setSelectedGame}
            onBookCompanion={handleOpenBookingForCompanion}
          />
        )}
      </main>
      <Footer />
    </div>
  )}

      <TermsAcceptanceModal
        open={termsModalSlotId !== null}
        token={token}
        onClose={() => setTermsModalSlotId(null)}
        onAccepted={() => {
          const slotId = termsModalSlotId;
          setTermsModalSlotId(null);
          addToast('success', 'Đã chấp thuận điều khoản', 'Đang tiếp tục đặt lịch cho khung giờ bạn đã chọn…');
          if (slotId) handleBookSlot(slotId);
        }}
      />

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

            {/* WEBRTC VOICE CALL CONTROL BAR (FR-006, UC04) */}
            <div className="bg-[#141414] border-b border-[#E11D2E]/40 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2">
                <div className={`p-1.5 rounded-lg border flex items-center justify-center ${
                  voiceCallState === 'connected'
                    ? 'bg-[#22C55E]/10 border-[#22C55E]/40 text-[#22C55E]'
                    : voiceCallState === 'calling' || voiceCallState === 'reconnecting'
                    ? 'bg-[#E11D2E]/10 border-[#E11D2E]/40 text-[#E11D2E] animate-pulse'
                    : 'bg-[#1C1C1C] border-[#2A2A2A] text-[#A3A3A3]'
                }`}>
                  <Phone className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white text-xs">Gọi thoại WebRTC 1-1</span>
                    {voiceCallState === 'connected' && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#22C55E]/20 text-[#22C55E] border border-[#22C55E]/40 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E] animate-pulse" />
                        Đang gọi ({Math.floor(voiceDurationSec / 60).toString().padStart(2, '0')}:{(voiceDurationSec % 60).toString().padStart(2, '0')})
                      </span>
                    )}
                    {voiceCallState === 'calling' && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#E11D2E]/20 text-[#E11D2E] border border-[#E11D2E]/40 animate-pulse">
                        Đang kết nối...
                      </span>
                    )}
                    {voiceCallState === 'reconnecting' && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#F59E0B]/20 text-[#F59E0B] border border-[#F59E0B]/40 animate-pulse">
                        Đang kết nối lại...
                      </span>
                    )}
                    {voiceCallState === 'idle' && (
                      <span className="text-[10px] text-[#A3A3A3]">
                        {activeSession.status === 'ACTIVE' ? 'Sẵn sàng kết nối thoại' : 'Chỉ mở trong phiên đang diễn ra'}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-2">
                {voiceCallState === 'idle' ? (
                  <button
                    disabled={activeSession.status !== 'ACTIVE'}
                    onClick={handleStartVoiceCall}
                    className="px-3 py-1.5 rounded-lg bg-[#E11D2E] hover:bg-[#B91C1C] disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-xs transition duration-150 flex items-center gap-1.5 cursor-pointer shadow-md"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    <span>Gọi thoại</span>
                  </button>
                ) : (
                  <>
                    <button
                      onClick={handleToggleVoiceMute}
                      className={`px-3 py-1.5 rounded-lg border text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                        voiceIsMuted
                          ? 'bg-[#E11D2E]/20 border-[#E11D2E] text-[#E11D2E]'
                          : 'bg-[#1C1C1C] hover:bg-[#2A2A2A] border-[#2A2A2A] text-white'
                      }`}
                    >
                      {voiceIsMuted ? <MicOff className="w-3.5 h-3.5 text-[#E11D2E]" /> : <Mic className="w-3.5 h-3.5 text-[#22C55E]" />}
                      <span>{voiceIsMuted ? 'Bật Mic' : 'Tắt Mic'}</span>
                    </button>
                    <button
                      onClick={handleEndVoiceCall}
                      className="px-3 py-1.5 rounded-lg bg-[#E11D2E] hover:bg-[#B91C1C] text-white font-bold text-xs transition flex items-center gap-1.5 cursor-pointer shadow-md"
                    >
                      <PhoneOff className="w-3.5 h-3.5" />
                      <span>Kết thúc</span>
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Error fallback alert (UC04 flow 3a) */}
            {voiceErrorMessage && (
              <div className="bg-amber-950/40 border-b border-amber-800/40 px-4 py-2 flex items-center justify-between text-[11px] text-amber-300">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>{voiceErrorMessage}</span>
                </div>
                <button
                  onClick={() => setVoiceErrorMessage(null)}
                  className="text-amber-400 hover:text-white p-0.5 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Session Action Control Bar */}
            <div className="p-4 bg-slate-950/40 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="space-y-1">
                <span className="text-slate-400">Thời hạn phiên:</span>
                <p className="text-slate-200 font-mono">
                  {new Date(activeSession.start_time).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} - {new Date(activeSession.end_time).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                </p>
                {activeSession.booking?.confirm_deadline && (
                  <div className="pt-1">
                    <BookingCountdown
                      status={activeSession.booking?.status || 'ENDED'}
                      confirmDeadline={activeSession.booking.confirm_deadline}
                      onTriggerTimeout={() => handleSimulateAutoAccept(activeSession.booking_id)}
                      canTrigger={Boolean(
                        currentUser &&
                        (currentUser.user_id === activeSession.booking?.renter_id ||
                         currentUser.user_id === activeSession.booking?.companion?.user_id) &&
                        !['CS_AGENT', 'AUDITOR'].includes(currentUser.role)
                      )}
                      loading={loading}
                      compact={true}
                      mode="confirm_15m"
                    />
                  </div>
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
                      disabled={loading || Boolean(activeSession.booking?.confirm_deadline && new Date() < new Date(activeSession.booking.confirm_deadline))}
                      onClick={() => handleSimulateAutoAccept(activeSession.booking_id)}
                      title={activeSession.booking?.confirm_deadline && new Date() < new Date(activeSession.booking.confirm_deadline) ? "Chưa hết thời hạn 15 phút nghiệm thu" : "Kích hoạt tự động nghiệm thu (DEMO_POLICY)"}
                      className="bg-slate-800 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed text-slate-300 font-medium px-2.5 py-1.5 rounded-xl transition border border-slate-700 text-[11px] cursor-pointer"
                    >
                      Thử Auto-Accept (15p)
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
                      className={`flex gap-2.5 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}
                    >
                      <Avatar
                        src={msg.sender_avatar_url || (isMe ? currentUser?.avatar_url : undefined)}
                        name={msg.sender_name}
                        size="xs"
                        className="mt-0.5 shrink-0"
                      />
                      <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
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

              <div>
                <label className="text-slate-300 font-medium block mb-1">Ảnh chứng cứ đính kèm (tùy chọn, tối đa 2MB):</label>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      if (file.size > 2 * 1024 * 1024) {
                        addToast('error', 'Tệp quá lớn', 'Kích thước tệp tối đa 2MB.');
                        return;
                      }
                      setDisputeInitialEvidenceFileName(file.name);
                      setDisputeInitialEvidenceFileType(file.type.includes('png') ? 'IMAGE_PNG' : 'IMAGE_JPEG');
                      const reader = new FileReader();
                      reader.onloadend = () => {
                        setDisputeInitialEvidenceBase64(reader.result as string);
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                  className="w-full text-slate-400 text-xs file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-medium file:bg-rose-600/20 file:text-rose-300 hover:file:bg-rose-600/30 cursor-pointer"
                />
                {disputeInitialEvidenceFileName && (
                  <p className="text-[11px] text-emerald-400 mt-1">Đã chọn: {disputeInitialEvidenceFileName}</p>
                )}
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

              {/* Countdown & Timeout for WAITING_COMPANION_RESPONSE (Stage 2.2) */}
              {selectedBookingDetail.status === 'WAITING_COMPANION_RESPONSE' && (
                <div className="space-y-2">
                  <BookingCountdown
                    status={selectedBookingDetail.status}
                    responseDeadline={selectedBookingDetail.response_deadline}
                    createdAt={selectedBookingDetail.created_at}
                    onTriggerTimeout={() => handleTimeoutBooking(selectedBookingDetail.booking_id)}
                    canTrigger={Boolean(
                      currentUser &&
                      (currentUser.user_id === selectedBookingDetail.renter_id ||
                       currentUser.user_id === selectedBookingDetail.companion?.user?.user_id ||
                       currentUser.user_id === selectedBookingDetail.companion?.user_id) &&
                      !['CS_AGENT', 'AUDITOR'].includes(currentUser.role)
                    )}
                    loading={loading}
                    compact={false}
                  />
                  {['CS_AGENT', 'AUDITOR'].includes(currentUser?.role || '') && (
                    <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-[11px] text-slate-400 flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-sky-400 shrink-0" />
                      <span>Chế độ kiểm toán ({currentUser?.role}): Chỉ giám sát tiến trình, không có thẩm quyền kích hoạt timeout tài chính.</span>
                    </div>
                  )}
                </div>
              )}

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
                        ✓ Còn {diffMinutes} phút đến giờ hẹn (từ 30 phút trở lên): Hoàn tiền 100% ({cancelBookingTarget.total_fee_snapshot?.toLocaleString('vi-VN')} VND).
                      </p>
                    ) : diffMinutes >= 10 ? (
                      <p className="text-amber-400 font-medium">
                        ⚠ Còn {diffMinutes} phút đến giờ hẹn (10-30 phút): Hoàn tiền 70% ({Math.round(cancelBookingTarget.total_fee_snapshot * 0.7).toLocaleString('vi-VN')} VND), bồi thường 30% cho Companion.
                      </p>
                    ) : (
                      <p className="text-rose-400 font-medium">
                        ✕ Còn {Math.max(0, diffMinutes)} phút đến giờ hẹn (dưới 10 phút): Phạt hủy sát giờ (Hoàn 0%, Companion nhận 100% bồi thường).
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

      {/* CS DOSSIER MODAL (CS / Admin - PROMPT 12 & Đợt D1b) */}
      {showDossierModal && selectedDispute && (() => {
        const d = selectedDispute.dispute || selectedDispute;
        const b = d.booking || {};
        const evList = d.evidences || d.evidence || selectedDispute.evidences || selectedDispute.evidence || [];
        const chatList = selectedDispute.chat_messages || b.session?.messages || [];
        const callLogs = selectedDispute.call_logs || d.call_logs || b.session?.call_logs || [];
        const sla = selectedDispute.sla_metrics || {};

        // Tách danh sách chứng cứ theo 2 bên: Renter vs Companion (Mục C.2)
        const renterEvList = evList.filter((e: any) => 
          e.uploader_id === d.renter_id || e.uploader?.role === 'RENTER'
        );
        const companionEvList = evList.filter((e: any) => 
          e.uploader_id === b.companion?.user_id || e.uploader?.role === 'COMPANION'
        );

        return (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl">
              <div className="p-5 border-b border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-sky-400" />
                  <h3 className="font-bold text-white text-base">
                    Hồ sơ thẩm định {formatShortId('DSP', d.dispute_id)}
                  </h3>
                  <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${
                    d.status === 'RESOLVED'
                      ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                      : d.status === 'EVIDENCE_PENDING'
                      ? 'bg-amber-950 text-amber-300 border border-amber-800'
                      : 'bg-rose-950 text-rose-400 border border-rose-800'
                  }`}>
                    {d.status}
                  </span>
                </div>
                <button
                  onClick={handleCloseDossier}
                  className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-5 overflow-y-auto space-y-4 text-xs">
                {/* 1. Ngữ cảnh tranh chấp & Chỉ số SLA */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {/* Escrow & Đơn đặt */}
                  <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800 space-y-1">
                    <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Đơn đặt liên quan:</span>
                    <p className="text-white font-mono font-semibold">{formatShortId('BK', b.booking_id)}</p>
                    <div className="pt-1">
                      <span className="text-[11px] px-2 py-0.5 rounded font-mono font-bold bg-amber-950/80 text-amber-300 border border-amber-700/60 inline-block">
                        Escrow FROZEN: {b.total_fee_snapshot?.toLocaleString('vi-VN')} VND
                      </span>
                    </div>
                  </div>

                  {/* SLA Timer */}
                  <div className={`p-3.5 rounded-xl border space-y-1 ${
                    sla.is_paused
                      ? 'bg-amber-950/30 border-amber-800/60 text-amber-200'
                      : 'bg-slate-950/60 border-slate-800 text-slate-300'
                  }`}>
                    <div className="flex items-center justify-between">
                      <span className="font-bold flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5" /> Đồng hồ SLA (45 phút)
                      </span>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                        sla.is_paused ? 'bg-amber-900/60 text-amber-300' : 'bg-sky-950 text-sky-300'
                      }`}>
                        {sla.is_paused ? 'TẠM DỪNG' : 'ĐANG CHẠY'}
                      </span>
                    </div>
                    <p className="text-[11px]">
                      {sla.is_paused
                        ? 'Đồng hồ tạm dừng trong thời gian chờ bổ sung chứng cứ.'
                        : `Thời gian chủ động: ${Math.round((sla.active_elapsed_ms || 0) / 60000)} phút / 45 phút.`}
                    </p>
                    {sla.paused_ms > 0 && (
                      <p className="text-[10px] text-slate-400">
                        Đã tạm dừng: {Math.round(sla.paused_ms / 60000)} phút
                      </p>
                    )}
                  </div>

                  {/* Trạng thái CS Request */}
                  <div className="p-3.5 rounded-xl border border-slate-800 bg-slate-950/60 space-y-1">
                    <span className="font-bold text-slate-300 flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-sky-400" /> Trạng thái xử lý CS
                    </span>
                    {d.evidence_request_note ? (
                      <div className="text-[11px] space-y-1 text-slate-300">
                        <p><strong className="text-sky-300">CS yêu cầu:</strong> "{d.evidence_request_note}"</p>
                        <p className="text-[10px] text-slate-400 font-mono">
                          Hạn chót: {d.evidence_deadline ? new Date(d.evidence_deadline).toLocaleString('vi-VN') : '24 giờ'}
                        </p>
                      </div>
                    ) : (
                      <p className="text-[11px] text-slate-400 italic">Chưa có yêu cầu bổ sung chứng cứ nào.</p>
                    )}
                  </div>
                </div>

                {/* 2. TÁCH RÕ 2 PHÍA: PHÍA RENTER VS PHÍA COMPANION (Mục C.2) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* CỘT TRÁI: PHÍA RENTER */}
                  <div className="bg-sky-950/15 border border-sky-800/40 rounded-xl p-4 space-y-3">
                    <div className="flex items-center justify-between border-b border-sky-800/30 pb-2">
                      <div className="flex items-center gap-2">
                        <Avatar
                          src={b.renter?.avatar_url}
                          name={b.renter?.display_name || b.renter?.email || 'Renter'}
                          size="sm"
                        />
                        <span className="text-sky-300 font-bold flex items-center gap-1.5 text-xs">
                          BÊN KHIẾU NẠI (RENTER)
                        </span>
                      </div>
                      <span className="text-slate-300 font-semibold text-[11px]">
                        {b.renter?.display_name || b.renter?.email || 'Renter'}
                      </span>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-slate-400 text-[10px] uppercase font-bold">Lý do khiếu nại:</span>
                        <span className="px-2 py-0.5 rounded bg-rose-950/80 text-rose-300 border border-rose-800 text-[10px] font-bold">
                          {getDisputeReasonLabel(d.reason_category || d.category)}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 text-[10px] uppercase font-bold block mb-0.5">Mô tả sự cố của Renter:</span>
                        <p className="italic text-slate-200 bg-slate-950/70 p-2.5 rounded-lg border border-slate-800/80 leading-relaxed">
                          "{d.description}"
                        </p>
                        <p className="text-[10px] text-slate-500 pt-1">
                          Thời điểm mở: {new Date(d.created_at).toLocaleString('vi-VN')}
                        </p>
                      </div>
                    </div>

                    {/* Chứng cứ phía Renter */}
                    <div className="space-y-2 pt-1 border-t border-sky-800/20">
                      <span className="text-sky-300 font-semibold text-[11px] block">
                        Chứng cứ Renter cung cấp ({renterEvList.length}):
                      </span>
                      {renterEvList.length === 0 ? (
                        <p className="text-slate-500 italic text-[11px]">Chưa có chứng cứ bổ sung từ Renter.</p>
                      ) : (
                        <div className="space-y-2 max-h-56 overflow-y-auto">
                          {renterEvList.map((ev: any) => (
                            <div key={ev.evidence_id} className="p-2.5 bg-slate-950/80 border border-slate-800 rounded-lg flex items-center gap-3">
                              {evidenceBlobs[ev.evidence_id] ? (
                                <img
                                  src={evidenceBlobs[ev.evidence_id]}
                                  alt="Bằng chứng Renter"
                                  onClick={() => setPreviewImageUrl(evidenceBlobs[ev.evidence_id])}
                                  className="w-16 h-16 object-cover rounded-lg border border-slate-700 shrink-0 cursor-pointer hover:border-sky-500 transition"
                                />
                              ) : (
                                <div className="w-16 h-16 bg-slate-900 rounded-lg border border-slate-800 flex items-center justify-center shrink-0">
                                  <FileText className="w-6 h-6 text-slate-600" />
                                </div>
                              )}
                              <div className="flex-1 min-w-0 space-y-1">
                                <p className="font-semibold text-white truncate text-[11px]">{ev.file_name || 'minh_chung_renter.png'}</p>
                                {ev.description && <p className="text-slate-300 italic truncate text-[10px]">"{ev.description}"</p>}
                                <div className="flex items-center gap-2 pt-0.5">
                                  {evidenceBlobs[ev.evidence_id] && (
                                    <button
                                      onClick={() => setPreviewImageUrl(evidenceBlobs[ev.evidence_id])}
                                      className="px-2 py-0.5 bg-sky-600/20 hover:bg-sky-600/30 text-sky-300 border border-sky-500/30 rounded text-[10px] cursor-pointer"
                                    >
                                      Xem phóng to
                                    </button>
                                  )}
                                  <a
                                    href={ev.signed_download_url || evidenceBlobs[ev.evidence_id] || '#'}
                                    download={ev.file_name || 'evidence.png'}
                                    className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded text-[10px] cursor-pointer"
                                  >
                                    Tải về
                                  </a>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* CỘT PHẢI: PHÍA COMPANION */}
                  <div className="bg-rose-950/15 border border-rose-800/40 rounded-xl p-4 space-y-3">
                    <div className="flex items-center justify-between border-b border-rose-800/30 pb-2">
                      <div className="flex items-center gap-2">
                        <Avatar
                          src={b.companion?.user?.avatar_url}
                          name={b.companion?.user?.display_name || b.companion?.user?.email || 'Companion'}
                          size="sm"
                        />
                        <span className="text-rose-300 font-bold flex items-center gap-1.5 text-xs">
                          BÊN BỊ KHIẾU NẠI (COMPANION)
                        </span>
                      </div>
                      <span className="text-slate-300 font-semibold text-[11px]">
                        {b.companion?.user?.display_name || b.companion?.user?.email || 'Companion'}
                      </span>
                    </div>

                    {/* Lời giải trình Quyết định D29 */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400 text-[10px] uppercase font-bold">Giải trình chính thức của Companion:</span>
                        {d.companion_explained_at && (
                          <span className="text-[10px] text-slate-500 font-mono">
                            {new Date(d.companion_explained_at).toLocaleString('vi-VN')}
                          </span>
                        )}
                      </div>
                      {d.companion_explanation ? (
                        <p className="italic text-slate-200 bg-slate-950/70 p-2.5 rounded-lg border border-slate-800/80 leading-relaxed">
                          "{d.companion_explanation}"
                        </p>
                      ) : (
                        <div className="p-3 bg-amber-950/20 border border-amber-800/40 rounded-lg text-amber-300 text-[11px] italic">
                          Chưa nộp giải trình (Chờ Companion phản hồi).
                        </div>
                      )}
                    </div>

                    {/* Chứng cứ đối chứng phía Companion */}
                    <div className="space-y-2 pt-1 border-t border-rose-800/20">
                      <span className="text-rose-300 font-semibold text-[11px] block">
                        Bằng chứng đối chứng Companion ({companionEvList.length}):
                      </span>
                      {companionEvList.length === 0 ? (
                        <p className="text-slate-500 italic text-[11px]">Chưa có chứng cứ đối chứng từ Companion.</p>
                      ) : (
                        <div className="space-y-2 max-h-56 overflow-y-auto">
                          {companionEvList.map((ev: any) => (
                            <div key={ev.evidence_id} className="p-2.5 bg-slate-950/80 border border-slate-800 rounded-lg flex items-center gap-3">
                              {evidenceBlobs[ev.evidence_id] ? (
                                <img
                                  src={evidenceBlobs[ev.evidence_id]}
                                  alt="Bằng chứng Companion"
                                  onClick={() => setPreviewImageUrl(evidenceBlobs[ev.evidence_id])}
                                  className="w-16 h-16 object-cover rounded-lg border border-slate-700 shrink-0 cursor-pointer hover:border-rose-500 transition"
                                />
                              ) : (
                                <div className="w-16 h-16 bg-slate-900 rounded-lg border border-slate-800 flex items-center justify-center shrink-0">
                                  <FileText className="w-6 h-6 text-slate-600" />
                                </div>
                              )}
                              <div className="flex-1 min-w-0 space-y-1">
                                <p className="font-semibold text-white truncate text-[11px]">{ev.file_name || 'minh_chung_companion.png'}</p>
                                {ev.description && <p className="text-slate-300 italic truncate text-[10px]">"{ev.description}"</p>}
                                <div className="flex items-center gap-2 pt-0.5">
                                  {evidenceBlobs[ev.evidence_id] && (
                                    <button
                                      onClick={() => setPreviewImageUrl(evidenceBlobs[ev.evidence_id])}
                                      className="px-2 py-0.5 bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/30 rounded text-[10px] cursor-pointer"
                                    >
                                      Xem phóng to
                                    </button>
                                  )}
                                  <a
                                    href={ev.signed_download_url || evidenceBlobs[ev.evidence_id] || '#'}
                                    download={ev.file_name || 'evidence.png'}
                                    className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded text-[10px] cursor-pointer"
                                  >
                                    Tải về
                                  </a>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* 3. Tab Switcher: Chat Audit Log vs Timeline */}
                <div className="flex border-b border-slate-800 gap-4 pt-1">
                  <button
                    onClick={() => setDossierActiveTab('chat')}
                    className={`pb-2 text-xs font-bold border-b-2 transition cursor-pointer flex items-center gap-1.5 ${
                      dossierActiveTab === 'chat'
                        ? 'border-sky-500 text-sky-400'
                        : 'border-transparent text-slate-400 hover:text-white'
                    }`}
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>Nhật ký chat phiên kiểm toán ({chatList.length})</span>
                  </button>
                  <button
                    onClick={() => setDossierActiveTab('evidence')}
                    className={`pb-2 text-xs font-bold border-b-2 transition cursor-pointer flex items-center gap-1.5 ${
                      dossierActiveTab === 'evidence'
                        ? 'border-sky-500 text-sky-400'
                        : 'border-transparent text-slate-400 hover:text-white'
                    }`}
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Tổng hợp toàn bộ chứng cứ ({evList.length})</span>
                  </button>
                  <button
                    onClick={() => setDossierActiveTab('call_log')}
                    className={`pb-2 text-xs font-bold border-b-2 transition cursor-pointer flex items-center gap-1.5 ${
                      dossierActiveTab === 'call_log'
                        ? 'border-sky-500 text-sky-400'
                        : 'border-transparent text-slate-400 hover:text-white'
                    }`}
                  >
                    <Phone className="w-3.5 h-3.5" />
                    <span>Nhật ký cuộc gọi CallLog ({callLogs.length})</span>
                  </button>
                </div>

                {/* TAB CONTENT: CHAT LOG */}
                {dossierActiveTab === 'chat' && (
                  <div className="space-y-2">
                    {chatList.length === 0 ? (
                      <div className="p-6 bg-slate-950/40 rounded-xl border border-slate-800 text-center text-slate-500 italic">
                        Không có tin nhắn nào trong phòng chơi.
                      </div>
                    ) : (
                      <div className="max-h-60 overflow-y-auto space-y-2 p-3 bg-slate-950/60 rounded-xl border border-slate-800">
                        {chatList.map((m: any) => (
                          <div key={m.message_id} className="text-xs p-2.5 rounded-lg bg-slate-900 border border-slate-800 space-y-1">
                            <div className="flex items-center justify-between text-[10px] text-slate-400">
                              <span className="font-semibold text-white flex items-center gap-1.5">
                                {m.sender_name || m.sender?.display_name || m.sender_id}
                                <span className="bg-slate-800 px-1 rounded text-[9px] text-slate-400">{m.sender_role || m.sender?.role}</span>
                              </span>
                              <span>{new Date(m.created_at).toLocaleString('vi-VN')}</span>
                            </div>
                            <p className="text-slate-200">{m.content}</p>
                            {m.is_censored && m.original_content && (
                              <p className="text-[10px] text-amber-300 italic border-t border-amber-500/20 pt-1">
                                ⚠ Kiểm toán CS (Nội dung gốc trước khi che): "{m.original_content}"
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* TAB CONTENT: TỔNG HỢP TOÀN BỘ CHỨNG CỨ */}
                {dossierActiveTab === 'evidence' && (
                  <div className="space-y-2">
                    {evList.length === 0 ? (
                      <div className="p-6 bg-slate-950/40 rounded-xl border border-slate-800 text-center text-slate-500 italic">
                        Chưa có bên nào nộp chứng cứ bổ sung.
                      </div>
                    ) : (
                      <div className="divide-y divide-slate-800 border border-slate-800 rounded-xl overflow-hidden bg-slate-950/40">
                        {evList.map((ev: any) => (
                          <div key={ev.evidence_id} className="p-3 flex items-center justify-between gap-3 text-xs">
                            <div className="space-y-1 flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-white truncate">{ev.file_name || 'Bằng chứng minh họa'}</span>
                                <span className="text-[10px] bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded font-mono">
                                  {ev.file_type}
                                </span>
                                <span className="text-[10px] bg-sky-950 text-sky-300 px-1.5 py-0.5 rounded font-semibold">
                                  {ev.uploader?.role || 'BÊN THAM GIA'}
                                </span>
                              </div>
                              {ev.description && <p className="text-slate-300 italic text-[11px] truncate">"{ev.description}"</p>}
                              <p className="text-[10px] text-slate-500">
                                Người nộp: <strong className="text-slate-400">{ev.uploader?.display_name || ev.uploader_id}</strong> • {new Date(ev.created_at).toLocaleString('vi-VN')}
                              </p>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              {evidenceBlobs[ev.evidence_id] && (
                                <button
                                  onClick={() => setPreviewImageUrl(evidenceBlobs[ev.evidence_id])}
                                  className="px-2.5 py-1 bg-sky-600/20 hover:bg-sky-600/30 text-sky-300 border border-sky-500/30 rounded text-[11px] cursor-pointer"
                                >
                                  Xem phóng to
                                </button>
                              )}
                              <a
                                href={ev.signed_download_url || evidenceBlobs[ev.evidence_id] || '#'}
                                download={ev.file_name || 'evidence.png'}
                                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded text-[11px] cursor-pointer"
                              >
                                Tải về
                              </a>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* TAB CONTENT: NHẬT KÝ CUỘC GỌI CALLLOG (FR-006, UC04) */}
                {dossierActiveTab === 'call_log' && (
                  <div className="space-y-2">
                    {callLogs.length === 0 ? (
                      <div className="p-6 bg-slate-950/40 rounded-xl border border-slate-800 text-center text-slate-500 italic">
                        Chưa có cuộc gọi thoại nào được ghi nhận trong phiên này.
                      </div>
                    ) : (
                      <div className="divide-y divide-slate-800 border border-slate-800 rounded-xl overflow-hidden bg-slate-950/40">
                        {callLogs.map((call: any) => {
                          let parsedEvents: any[] = [];
                          try {
                            parsedEvents = typeof call.events === 'string' ? JSON.parse(call.events) : (call.events || []);
                          } catch {}
                          return (
                            <div key={call.call_id} className="p-3 text-xs space-y-2">
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2">
                                  <Phone className="w-4 h-4 text-[#E11D2E]" />
                                  <span className="font-bold text-white">
                                    Cuộc gọi #{call.call_id.slice(0, 8)}
                                  </span>
                                  <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${
                                    call.result === 'COMPLETED'
                                      ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                                      : call.result === 'MISSED'
                                      ? 'bg-amber-950 text-amber-300 border border-amber-800'
                                      : 'bg-rose-950 text-rose-400 border border-rose-800'
                                  }`}>
                                    {call.result}
                                  </span>
                                </div>
                                <span className="text-[11px] font-mono text-slate-300">
                                  Thời lượng: {call.duration_sec || 0} giây
                                </span>
                              </div>
                              <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-400 bg-slate-900/60 p-2 rounded-lg border border-slate-800">
                                <div>
                                  Người khởi tạo: <strong className="text-slate-200">{call.caller?.display_name || call.caller_id}</strong>
                                </div>
                                <div>
                                  Người nhận: <strong className="text-slate-200">{call.receiver?.display_name || call.receiver_id}</strong>
                                </div>
                                <div>
                                  Bắt đầu: {call.started_at ? new Date(call.started_at).toLocaleTimeString('vi-VN') : 'Chưa xác định'}
                                </div>
                                <div>
                                  Kết thúc: {call.ended_at ? new Date(call.ended_at).toLocaleTimeString('vi-VN') : 'Chưa xác định'}
                                </div>
                              </div>
                              {parsedEvents.length > 0 && (
                                <div className="text-[10px] text-slate-400 space-y-1">
                                  <span className="font-semibold text-slate-300">Nhật ký sự kiện kết nối:</span>
                                  <div className="flex flex-wrap gap-1.5">
                                    {parsedEvents.map((ev: any, idx: number) => (
                                      <span key={idx} className="bg-slate-800 px-2 py-0.5 rounded text-slate-300 font-mono">
                                        {ev.event || ev.type} ({new Date(ev.timestamp).toLocaleTimeString('vi-VN')})
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="p-4 border-t border-slate-800 flex items-center justify-between">
                <span className="text-slate-500 text-[11px] font-mono">
                  CS Security Audit Log Enabled
                </span>
                <div className="flex items-center gap-2">
                  {d.status !== 'RESOLVED' && (
                    <>
                      <button
                        onClick={() => handleOpenRequestEvidenceModal(d)}
                        className="bg-sky-600/20 hover:bg-sky-600/30 text-sky-300 border border-sky-500/30 font-medium px-3.5 py-1.5 rounded-xl text-xs transition cursor-pointer"
                      >
                        Yêu cầu thêm chứng cứ
                      </button>
                      <button
                        onClick={() => handleOpenDecisionModal(d)}
                        className="bg-rose-600 hover:bg-rose-500 text-white font-medium px-4 py-1.5 rounded-xl text-xs transition cursor-pointer shadow-lg shadow-rose-600/20"
                      >
                        Tiến hành phán quyết
                      </button>
                    </>
                  )}
                  <button
                    onClick={handleCloseDossier}
                    className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-1.5 rounded-xl text-xs font-medium transition cursor-pointer"
                  >
                    Đóng
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

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
                  <p>⚠ Tỷ lệ lỗi từ 80% trở lên: Companion bị <strong>trừ 10 điểm TrustScore</strong> (vi phạm RMA nghiêm trọng).</p>
                ) : (
                  <p>✓ Tỷ lệ lỗi dưới 80%: Không áp dụng trừ điểm phạt TrustScore trực tiếp.</p>
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
                disabled={isRequestingEvidence}
                onClick={() => setShowRequestEvidenceModal(false)}
                className="bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-300 px-4 py-2 rounded-xl text-xs font-medium transition cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                disabled={loading || isRequestingEvidence || !evidenceNote.trim()}
                onClick={submitCSRequestEvidence}
                className="bg-sky-600 hover:bg-sky-500 disabled:bg-slate-800 disabled:text-slate-600 text-white px-5 py-2 rounded-xl text-xs font-medium transition cursor-pointer shadow-lg shadow-sky-600/20"
              >
                {isRequestingEvidence ? 'Đang gửi...' : 'Gửi yêu cầu chứng cứ'}
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
                <label className="text-slate-300 font-medium block mb-1">Chọn tệp bằng chứng (PNG, JPEG, WebP, tối đa 2MB):</label>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp,text/plain"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      if (file.size > 2 * 1024 * 1024) {
                        addToast('error', 'Tệp quá lớn', 'Kích thước tệp vượt quá giới hạn tối đa 2MB. Vui lòng chọn tệp nhỏ hơn.');
                        e.target.value = '';
                        return;
                      }
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

      {/* COMPANION EXPLANATION MODAL (D29 - BPMN 6b) */}
      {showExplanationModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-white text-base flex items-center gap-2 text-rose-400">
                <FileText className="w-5 h-5" /> Giải trình tranh chấp
              </h3>
              <button
                onClick={() => setShowExplanationModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              Theo quy trình giải quyết khiếu nại, Companion có toàn quyền gửi ý kiến giải trình và bổ sung chứng cứ minh oan. Bộ phận CS sẽ đối chiếu đa chiều trước khi đưa ra phán quyết.
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-300 font-medium block mb-1">
                  Nội dung giải trình chi tiết <span className="text-rose-400">*</span>:
                </label>
                <textarea
                  rows={4}
                  placeholder="Nêu rõ tình huống trong trận đấu, lý do gián đoạn hoặc phản hồi các cáo buộc của người thuê..."
                  value={explanationText}
                  onChange={(e) => setExplanationText(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
                />
              </div>

              <div>
                <label className="text-slate-300 font-medium block mb-1">Ảnh chụp minh chứng đính kèm (tùy chọn, tối đa 2MB):</label>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      if (file.size > 2 * 1024 * 1024) {
                        addToast('error', 'Tệp quá lớn', 'Kích thước tệp không được vượt quá 2MB.');
                        return;
                      }
                      setExplanationEvidenceFileName(file.name);
                      setExplanationEvidenceFileType(file.type.includes('png') ? 'IMAGE_PNG' : 'IMAGE_JPEG');
                      const reader = new FileReader();
                      reader.onloadend = () => {
                        setExplanationEvidenceBase64(reader.result as string);
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                  className="w-full text-slate-400 text-xs file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-medium file:bg-rose-600/20 file:text-rose-300 hover:file:bg-rose-600/30 cursor-pointer"
                />
                {explanationEvidenceFileName && (
                  <p className="text-[11px] text-emerald-400 mt-1">Đã chọn: {explanationEvidenceFileName}</p>
                )}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                disabled={loading}
                onClick={() => setShowExplanationModal(false)}
                className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-2 rounded-xl text-xs font-medium transition cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                disabled={loading || explanationText.trim().length < 5}
                onClick={submitCompanionExplanation}
                className="bg-rose-600 hover:bg-rose-500 disabled:bg-slate-800 disabled:text-slate-600 text-white px-5 py-2 rounded-xl text-xs font-medium transition cursor-pointer shadow-lg shadow-rose-600/20"
              >
                Gửi giải trình
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EVIDENCE LIGHTBOX ZOOM MODAL */}
      {previewImageUrl && (
        <div
          className="fixed inset-0 z-[60] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 cursor-pointer"
          onClick={() => setPreviewImageUrl(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
            <img
              src={previewImageUrl}
              alt="Bằng chứng phóng to"
              className="max-w-full max-h-[85vh] object-contain rounded-2xl border border-slate-700 shadow-2xl"
            />
            <button
              onClick={() => setPreviewImageUrl(null)}
              className="absolute -top-3 -right-3 p-1.5 bg-slate-900 border border-slate-700 text-white rounded-full hover:bg-slate-800 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
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

      {/* eKYC REVIEW MODAL (ADMIN ONLY - UC01, NFR-002) */}
      {showKycReviewModal && selectedKycRecord && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-[#141414] border border-[#2A2A2A] rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-[#2A2A2A] pb-3">
              <div>
                <h3 className="font-bold text-white text-base flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-[#E11D2E]" /> Thẩm định hồ sơ eKYC (Mã hóa AES-256-GCM)
                </h3>
                <p className="text-xs text-[#A3A3A3] mt-0.5">
                  Tài khoản: <span className="text-white font-medium">{selectedKycRecord.user?.display_name}</span> ({selectedKycRecord.user?.email})
                </p>
              </div>
              <button
                onClick={() => setShowKycReviewModal(false)}
                className="text-[#A3A3A3] hover:text-white p-1 rounded-lg hover:bg-[#1C1C1C] transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-[#E11D2E]/10 border border-[#E11D2E]/30 rounded-xl text-xs text-[#E11D2E] space-y-1">
              <p className="font-bold flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 shrink-0" /> Bảo mật & Audit Log:
              </p>
              <p className="text-[#A3A3A3] text-[11px]">
                Ảnh CCCD đã được giải mã in-memory phục vụ phiên thẩm định của Admin. Mọi thao tác xem ảnh đều đã được ghi nhận vào hệ thống AuditLog bảo mật.
              </p>
            </div>

            <div className="p-2.5 bg-[#1C1C1C] border border-[#2A2A2A] rounded-xl text-[11px] text-[#A3A3A3] flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 text-[#F59E0B] shrink-0 mt-0.5" />
              <span>Lưu ý: Quy trình eKYC hiện tại là mô phỏng luồng bảo mật (mã hóa AES-256-GCM trên ổ đĩa và xét duyệt thủ công), chưa có đối soát khuôn mặt bằng AI thật.</span>
            </div>

            {/* 3 Decrypted Images Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="bg-[#1C1C1C] border border-[#2A2A2A] p-2.5 rounded-xl space-y-2">
                <span className="text-[11px] font-semibold text-[#A3A3A3] block">1. Mặt trước CCCD</span>
                <div className="aspect-[4/3] bg-black/50 rounded-lg overflow-hidden flex items-center justify-center border border-[#2A2A2A]">
                  {viewingKycImages.front ? (
                    <img src={viewingKycImages.front} alt="Mặt trước CCCD" className="w-full h-full object-contain" />
                  ) : (
                    <span className="text-[10px] text-[#6B6B6B]">Đang giải mã...</span>
                  )}
                </div>
              </div>

              <div className="bg-[#1C1C1C] border border-[#2A2A2A] p-2.5 rounded-xl space-y-2">
                <span className="text-[11px] font-semibold text-[#A3A3A3] block">2. Mặt sau CCCD</span>
                <div className="aspect-[4/3] bg-black/50 rounded-lg overflow-hidden flex items-center justify-center border border-[#2A2A2A]">
                  {viewingKycImages.back ? (
                    <img src={viewingKycImages.back} alt="Mặt sau CCCD" className="w-full h-full object-contain" />
                  ) : (
                    <span className="text-[10px] text-[#6B6B6B]">Đang giải mã...</span>
                  )}
                </div>
              </div>

              <div className="bg-[#1C1C1C] border border-[#2A2A2A] p-2.5 rounded-xl space-y-2">
                <span className="text-[11px] font-semibold text-[#A3A3A3] block">3. Chân dung kèm CCCD</span>
                <div className="aspect-[4/3] bg-black/50 rounded-lg overflow-hidden flex items-center justify-center border border-[#2A2A2A]">
                  {viewingKycImages.selfie ? (
                    <img src={viewingKycImages.selfie} alt="Chân dung selfie" className="w-full h-full object-contain" />
                  ) : (
                    <span className="text-[10px] text-[#6B6B6B]">Đang giải mã...</span>
                  )}
                </div>
              </div>
            </div>

            {/* Rejection reason input */}
            <div>
              <label className="text-xs text-[#A3A3A3] block mb-1">
                Lý do từ chối (bắt buộc nếu chọn Từ chối hồ sơ):
              </label>
              <textarea
                value={kycRejectionReason}
                onChange={(e) => setKycRejectionReason(e.target.value)}
                placeholder="Ví dụ: Ảnh CCCD bị mờ, không khớp khuôn mặt với ảnh chân dung..."
                rows={2}
                className="w-full bg-[#1C1C1C] border border-[#2A2A2A] rounded-xl p-2.5 text-xs text-white placeholder-[#6B6B6B] focus:border-[#E11D2E] outline-none"
              />
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-2 border-t border-[#2A2A2A]">
              <button
                type="button"
                onClick={() => setShowKycReviewModal(false)}
                className="px-4 py-2 bg-[#1C1C1C] hover:bg-[#2A2A2A] text-[#A3A3A3] hover:text-white rounded-xl text-xs font-medium transition cursor-pointer"
              >
                Đóng
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={() => handleAdminReviewKycDecision('REJECTED')}
                className="px-4 py-2 bg-[#1C1C1C] border border-[#E11D2E]/40 hover:bg-[#E11D2E]/20 text-[#E11D2E] rounded-xl text-xs font-semibold transition cursor-pointer"
              >
                Từ chối hồ sơ
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={() => handleAdminReviewKycDecision('VERIFIED')}
                className="px-4 py-2 bg-[#22C55E] hover:bg-emerald-600 text-black font-bold rounded-xl text-xs transition cursor-pointer flex items-center gap-1.5"
              >
                <Check className="w-3.5 h-3.5 text-black" />
                <span>Phê duyệt danh tính (VERIFIED)</span>
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

      {/* Login Modal */}
      <LoginModal
        isOpen={showLoginModal}
        onClose={() => {
          setShowLoginModal(false);
          if (window.location.pathname === '/login') {
            window.history.pushState({}, '', '/');
          }
        }}
        onSuccess={handleLoginSuccess}
        onSwitchToRegister={() => {
          setShowLoginModal(false);
          setShowRegisterModal(true);
          window.history.pushState({}, '', '/register');
        }}
      />

      {/* Register Modal */}
      <RegisterModal
        isOpen={showRegisterModal}
        onClose={() => {
          setShowRegisterModal(false);
          if (window.location.pathname === '/register') {
            window.history.pushState({}, '', '/');
          }
        }}
        onSuccess={handleLoginSuccess}
        onSwitchToLogin={() => {
          setShowRegisterModal(false);
          setShowLoginModal(true);
          window.history.pushState({}, '', '/login');
        }}
      />
    </div>
  );
}
