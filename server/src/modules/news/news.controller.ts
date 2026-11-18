import { Request, Response } from 'express';
import { sendSuccess, sendError } from '../../common/response.js';
import * as newsService from './news.service.js';

export async function getAllNewsHandler(_req: Request, res: Response): Promise<void> {
  const newsList = await newsService.getAllNews();
  sendSuccess(res, { news: newsList });
}

export async function getNewsBySlugHandler(req: Request, res: Response): Promise<void> {
  const { slug } = req.params;
  if (!slug) {
    sendError(res, 400, 'INVALID_SLUG', 'Slug bài viết không được để trống.');
    return;
  }

  const newsItem = await newsService.getNewsBySlug(slug);
  if (!newsItem) {
    sendError(res, 404, 'NEWS_NOT_FOUND', 'Không tìm thấy bài viết yêu cầu.');
    return;
  }

  sendSuccess(res, { news: newsItem });
}
