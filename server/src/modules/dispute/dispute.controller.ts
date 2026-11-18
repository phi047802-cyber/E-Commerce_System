import { Request, Response } from 'express';
import { disputeService } from './dispute.service.js';
import { sendSuccess } from '../../common/response.js';
import { ForbiddenError } from '../../common/errors.js';

export async function handleGetDisputeById(req: Request, res: Response): Promise<void> {
  const userId = req.user!.user_id;
  const userRole = req.user!.role;
  const { id } = req.params;

  const result = await disputeService.getDisputeById(userId, userRole, id);
  sendSuccess(res, result);
}

export async function handleSubmitEvidence(req: Request, res: Response): Promise<void> {
  const userId = req.user!.user_id;
  const userRole = req.user!.role;
  const { id } = req.params;
  const input = req.body;

  const evidence = await disputeService.submitEvidence(userId, userRole, id, input);
  sendSuccess(res, evidence, 201);
}

export async function handleGetEvidences(req: Request, res: Response): Promise<void> {
  const userId = req.user!.user_id;
  const userRole = req.user!.role;
  const { id } = req.params;

  const dossier = await disputeService.getDisputeById(userId, userRole, id);
  sendSuccess(res, dossier.dispute.evidences);
}

export async function handleGetEvidenceSignedUrl(req: Request, res: Response): Promise<void> {
  const userId = req.user!.user_id;
  const userRole = req.user!.role;
  const { id, evidenceId } = req.params;

  const result = await disputeService.generateSignedEvidenceUrl(userId, userRole, id, evidenceId);
  sendSuccess(res, result);
}

export async function handleGetEvidenceFile(req: Request, res: Response): Promise<void> {
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
}

export async function handleSubmitExplanation(req: Request, res: Response): Promise<void> {
  const userId = req.user!.user_id;
  const { id } = req.params;
  const input = req.body;

  const result = await disputeService.submitCompanionExplanation(userId, id, input);
  sendSuccess(res, result, 200);
}
