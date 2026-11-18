import { Router } from 'express';
import { getAllNewsHandler, getNewsBySlugHandler } from './news.controller.js';
import { asyncHandler } from '../../common/asyncHandler.js';

export const newsRouter = Router();

newsRouter.get('/', asyncHandler(getAllNewsHandler));
newsRouter.get('/:slug', asyncHandler(getNewsBySlugHandler));
