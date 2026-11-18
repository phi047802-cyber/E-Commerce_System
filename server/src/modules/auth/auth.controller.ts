import { Request, Response } from 'express';
import { authService } from './auth.service.js';
import { googleAuthService } from './google-auth.service.js';
import { sendSuccess } from '../../common/response.js';

export const DEMO_ACCOUNTS = [
  {
    user_id: 'u-renter-01',
    email: 'renter1@instasquad.test',
    display_name: 'Minh Hoàng',
    role: 'RENTER',
    role_label: 'Renter',
    role_badge_class: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30',
    description: 'Có sẵn 500.000đ trong ví để demo đặt lịch và ký quỹ Escrow',
    avatar: '/images/avatars/av01.jpg',
  },
  {
    user_id: 'u-renter-02',
    email: 'renter2@instasquad.test',
    display_name: 'Khánh Vy',
    role: 'RENTER',
    role_label: 'Renter',
    role_badge_class: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30',
    description: 'Ví 0đ – dùng để demo quy trình nạp tiền giả lập và thanh toán',
    avatar: '/images/avatars/av02.jpg',
  },
  {
    user_id: 'u-comp-01',
    email: 'companion1@instasquad.test',
    display_name: 'Bảo Ngọc',
    role: 'COMPANION',
    role_label: 'Companion',
    role_badge_class: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    description: 'Companion – LMHT (Uy tín 95.0, 100k/h, sẵn sàng nhận đơn)',
    avatar: '/images/avatars/av03.jpg',
  },
  {
    user_id: 'u-comp-02',
    email: 'companion2@instasquad.test',
    display_name: 'Tuấn Anh',
    role: 'COMPANION',
    role_label: 'Companion',
    role_badge_class: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    description: 'Companion – VALORANT (Mới 80.0, 80k/h, demo nhận/từ chối)',
    avatar: '/images/avatars/av04.jpg',
  },
  {
    user_id: 'u-cs-01',
    email: 'cs_agent@instasquad.test',
    display_name: 'Nguyễn Văn CS',
    role: 'CS_AGENT',
    role_label: 'CS Agent',
    role_badge_class: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
    description: 'Nhân viên CS – Xử lý khiếu nại, phân xử RMA và đóng băng Escrow',
    avatar: '/images/avatars/av05.jpg',
  },
  {
    user_id: 'u-auditor-01',
    email: 'auditor@instasquad.test',
    display_name: 'Trần Thị Kiểm Toán',
    role: 'AUDITOR',
    role_label: 'Auditor',
    role_badge_class: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
    description: 'Kiểm toán viên – Duyệt yêu cầu rút tiền và đối soát Sổ cái kép',
    avatar: '/images/avatars/av01.jpg',
  },
  {
    user_id: 'u-admin-01',
    email: 'admin@instasquad.test',
    display_name: 'Quản Trị Viên',
    role: 'ADMIN',
    role_label: 'Admin',
    role_badge_class: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
    description: 'Quản trị viên toàn hệ thống – Toàn quyền giám sát sàn',
    avatar: '/images/avatars/av02.jpg',
  },
];

export async function handleRegister(req: Request, res: Response): Promise<void> {
  const result = await authService.register(req.body);
  sendSuccess(res, result, 201);
}

export async function handleLogin(req: Request, res: Response): Promise<void> {
  const result = await authService.login(req.body);
  sendSuccess(res, result, 200);
}

export async function handleGetMe(req: Request, res: Response): Promise<void> {
  const userId = req.user!.user_id;
  const user = await authService.getMe(userId);
  sendSuccess(res, user, 200);
}

export async function handleGetDemoAccounts(req: Request, res: Response): Promise<void> {
  sendSuccess(res, DEMO_ACCOUNTS, 200);
}

export async function handleForgotPassword(req: Request, res: Response): Promise<void> {
  const result = await authService.forgotPassword(req.body);
  sendSuccess(res, result, 200);
}

export async function handleResetPassword(req: Request, res: Response): Promise<void> {
  const result = await authService.resetPassword(req.body);
  sendSuccess(res, result, 200);
}

export async function handleSendVerificationOtp(req: Request, res: Response): Promise<void> {
  const email = req.body.email || req.user?.email;
  if (!email) {
    sendSuccess(res, { error: 'Email là bắt buộc' }, 400);
    return;
  }
  const result = await authService.sendVerificationOtp(email);
  sendSuccess(res, result, 200);
}

export async function handleVerifyEmail(req: Request, res: Response): Promise<void> {
  const email = req.body.email || req.user?.email;
  const result = await authService.verifyEmail({ email, otp: req.body.otp });
  sendSuccess(res, result, 200);
}

export async function handleGoogleLogin(req: Request, res: Response): Promise<void> {
  const { id_token } = req.body;
  if (!id_token || typeof id_token !== 'string') {
    res.status(400).json({ success: false, error: { message: 'id_token là bắt buộc.' } });
    return;
  }
  const result = await googleAuthService.loginWithGoogle(id_token);
  sendSuccess(res, result, 200);
}

export async function handleGoogleCompleteProfile(req: Request, res: Response): Promise<void> {
  const userId = req.user!.user_id;
  const result = await googleAuthService.completeGoogleProfile(userId, req.body);
  sendSuccess(res, result, 200);
}

