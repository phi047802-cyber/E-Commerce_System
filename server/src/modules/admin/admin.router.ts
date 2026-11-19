import { Router, Request, Response } from 'express';
import { disputeService } from '../dispute/dispute.service.js';
import { adminService } from './admin.service.js';
import { authenticate, authorizeRoles } from '../../middleware/auth.js';
import { validateBody } from '../../middleware/validate.js';
import { asyncHandler } from '../../common/asyncHandler.js';
import { sendSuccess } from '../../common/response.js';
import { resolveDisputeSchema, requestEvidenceSchema } from '../dispute/dispute.dto.js';
import { ForbiddenError } from '../../common/errors.js';
import { getWeeklyDisputeSlaReport } from '../dispute/dispute-sla.report.js';

export const csRouter = Router();
export const adminRouter = Router();

// Route Quản trị viên toàn quyền: Thống kê chỉ số vận hành (BR-002, BR-003)
adminRouter.get(
  '/dashboard/metrics',
  authenticate,
  authorizeRoles('ADMIN'),
  asyncHandler(async (_req: Request, res: Response) => {
    const data = await adminService.getDashboardMetrics();
    sendSuccess(res, data);
  })
);

// Route Quản trị viên: Quản lý toàn bộ đơn hàng sàn (Đợt E1)
adminRouter.get(
  '/bookings',
  authenticate,
  authorizeRoles('ADMIN'),
  asyncHandler(async (req: Request, res: Response) => {
    const statusFilter = req.query.status as string | undefined;
    const bookings = await adminService.listAllBookings(statusFilter);
    sendSuccess(res, bookings);
  })
);

// Toàn bộ route CS yêu cầu xác thực và phân quyền CS_AGENT hoặc ADMIN
csRouter.use(authenticate, authorizeRoles('CS_AGENT', 'ADMIN'));

// 1. Danh sách hồ sơ khiếu nại (Hỗ trợ lọc theo status)
csRouter.get(
  '/disputes',
  asyncHandler(async (req: Request, res: Response) => {
    const userRole = req.user!.role;
    const statusFilter = req.query.status as string | undefined;

    const disputes = await disputeService.listDisputes(userRole, statusFilter);
    sendSuccess(res, disputes);
  })
);

// Alias /cases tương thích ngược
csRouter.get(
  '/cases',
  asyncHandler(async (req: Request, res: Response) => {
    const userRole = req.user!.role;
    const disputes = await disputeService.listDisputes(userRole);
    sendSuccess(res, disputes);
  })
);

// 2. Chi tiết hồ sơ khiếu nại (CS Dossier: Booking, Session, Escrow, Evidences, Chat, Ledger)
csRouter.get(
  '/disputes/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.user_id;
    const userRole = req.user!.role;
    const { id } = req.params;

    const dossier = await disputeService.getDisputeById(userId, userRole, id);
    sendSuccess(res, dossier);
  })
);

// 2b. CS Agent / Admin xem/tải file bằng chứng có ghi AuditLog an ninh
csRouter.get(
  '/disputes/:id/evidences/:evidenceId/file',
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.user_id;
    const userRole = req.user!.role;
    const { id, evidenceId } = req.params;
    const download = req.query.download === '1' || req.query.download === 'true';
    const ip = req.ip || req.socket.remoteAddress || '127.0.0.1';

    // Xác thực phạm vi token ký ngắn hạn nếu request sử dụng signed_token (Mục B.1)
    if (req.user?.purpose === 'evidence_download') {
      if (req.user.evidence_id !== evidenceId || req.user.dispute_id !== id) {
        throw new ForbiddenError('Token ký không cấp quyền truy cập tệp bằng chứng này.');
      }
    }

    const fileData = await disputeService.getEvidenceFile(userId, userRole, id, evidenceId, ip, download);

    res.setHeader('Content-Type', fileData.contentType);
    res.setHeader('Cache-Control', 'private, no-cache, no-store, must-revalidate');
    if (download) {
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileData.fileName)}"`);
    } else {
      res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(fileData.fileName)}"`);
    }

    res.send(fileData.buffer);
  })
);

// 2c. CS Agent / Admin lấy liên kết ký ngắn hạn 60s
csRouter.get(
  '/disputes/:id/evidences/:evidenceId/signed-url',
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.user_id;
    const userRole = req.user!.role;
    const { id, evidenceId } = req.params;

    const data = await disputeService.generateSignedEvidenceUrl(userId, userRole, id, evidenceId);
    sendSuccess(res, data);
  })
);

// 3. CS Agent yêu cầu hai bên bổ sung chứng cứ (Hạn chót 24h, Escrow tiếp tục FROZEN)
csRouter.post(
  '/disputes/:id/request-evidence',
  validateBody(requestEvidenceSchema, 422),
  asyncHandler(async (req: Request, res: Response) => {
    const csAgentId = req.user!.user_id;
    const userRole = req.user!.role;
    const { id } = req.params;
    const input = req.body;

    const updatedDispute = await disputeService.requestAdditionalEvidence(csAgentId, userRole, id, input);
    sendSuccess(res, updatedDispute);
  })
);

// 4. CS Agent ban hành phán quyết chính thức (Giải ngân 88/12 hoặc Hoàn 100% + Phạt 20%)
csRouter.post(
  '/disputes/:id/decision',
  validateBody(resolveDisputeSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const csAgentId = req.user!.user_id;
    const userRole = req.user!.role;
    const { id } = req.params;
    const input = req.body;

    const result = await disputeService.resolveDispute(csAgentId, userRole, id, input);
    sendSuccess(res, result, 200, {
      is_idempotent_replay: result.is_idempotent_replay,
    });
  })
);

// G10: Báo cáo SLA khiếu nại theo tuần (mục tiêu 45 phút, D25) — CS Agent & Admin (csRouter đã yêu cầu xác thực + phân quyền)
csRouter.get(
  '/reports/dispute-sla',
  asyncHandler(async (req: Request, res: Response) => {
    const weeks = Number(req.query.weeks ?? 8);
    sendSuccess(res, await getWeeklyDisputeSlaReport(Number.isFinite(weeks) ? weeks : 8));
  })
);
