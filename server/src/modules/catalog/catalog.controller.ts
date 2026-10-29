import { Request, Response } from 'express';
import { prisma } from '../../common/prisma.js';
import { sendSuccess } from '../../common/response.js';
import { NotFoundError } from '../../common/errors.js';

export async function getGames(_req: Request, res: Response): Promise<void> {
  const games = await prisma.gameCatalog.findMany({
    where: { is_active: true },
    include: {
      tiers: {
        orderBy: { rank_weight: 'asc' },
      },
    },
  });

  sendSuccess(res, games);
}

export async function getCompanions(req: Request, res: Response): Promise<void> {
  const { game_id, tier_id, availability } = req.query;

  const whereClause: any = {
    user: { status: 'ACTIVE' },
  };

  if (game_id && typeof game_id === 'string') {
    whereClause.game_id = game_id;
  }
  if (tier_id && typeof tier_id === 'string') {
    whereClause.verified_tier_id = tier_id;
  }
  if (availability && typeof availability === 'string') {
    whereClause.availability = availability;
  }

  const now = new Date();

  // Tự động giải phóng các slot HELD đã quá hạn
  await prisma.slotCalendar.updateMany({
    where: {
      status: 'HELD',
      held_until: { lt: now },
    },
    data: {
      status: 'AVAILABLE',
      held_until: null,
    },
  });

  const companions = await prisma.companionProfile.findMany({
    where: whereClause,
    include: {
      user: {
        select: {
          display_name: true,
          email: true,
        },
      },
      game: true,
      tier: true,
      slots: {
        where: {
          start_time: { gte: now },
        },
        orderBy: { start_time: 'asc' },
      },
    },
    orderBy: { trust_score: 'desc' },
  });

  sendSuccess(res, companions);
}

export async function getCompanionById(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const now = new Date();

  // Tự động giải phóng slot quá hạn
  await prisma.slotCalendar.updateMany({
    where: {
      profile_id: id,
      status: 'HELD',
      held_until: { lt: now },
    },
    data: {
      status: 'AVAILABLE',
      held_until: null,
    },
  });

  const companion = await prisma.companionProfile.findUnique({
    where: { profile_id: id },
    include: {
      user: {
        select: {
          display_name: true,
          email: true,
        },
      },
      game: true,
      tier: true,
      slots: {
        where: {
          start_time: { gte: now },
        },
        orderBy: { start_time: 'asc' },
      },
    },
  });

  if (!companion) {
    throw new NotFoundError('Không tìm thấy hồ sơ Companion.');
  }

  sendSuccess(res, companion);
}

export async function getCompanionSlots(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const now = new Date();

  // Tự động giải phóng các slot HELD đã quá hạn
  await prisma.slotCalendar.updateMany({
    where: {
      profile_id: id,
      status: 'HELD',
      held_until: { lt: now },
    },
    data: {
      status: 'AVAILABLE',
      held_until: null,
    },
  });

  const slots = await prisma.slotCalendar.findMany({
    where: {
      profile_id: id,
      start_time: { gte: now },
    },
    orderBy: { start_time: 'asc' },
  });

  sendSuccess(res, slots);
}
