import { Router, Request, Response } from 'express';
import { disputeService } from '../dispute/dispute.service.js';
import { authenticate, authorizeRoles } from '../../middleware/auth.js';
import { validateBody } from '../../middleware/validate.js';
import { asyncHandler } from '../../common/asyncHandler.js';
import { sendSuccess } from '../../common/response.js';
import { resolveDisputeSchema, requestEvidenceSchema } from '../dispute/dispute.dto.js';

export const csRouter = Router();

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

// 3. CS Agent yêu cầu hai bên bổ sung chứng cứ (Hạn chót 24h, Escrow tiếp tục FROZEN)
csRouter.post(
  '/disputes/:id/request-evidence',
  validateBody(requestEvidenceSchema),
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
