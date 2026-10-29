import { Router } from 'express';
import { getGames, getCompanions, getCompanionById, getCompanionSlots } from './catalog.controller.js';
import { asyncHandler } from '../../common/asyncHandler.js';

export const catalogRouter = Router();

catalogRouter.get('/games', asyncHandler(getGames));
catalogRouter.get('/companions', asyncHandler(getCompanions));
catalogRouter.get('/companions/:id', asyncHandler(getCompanionById));
catalogRouter.get('/companions/:id/slots', asyncHandler(getCompanionSlots));
