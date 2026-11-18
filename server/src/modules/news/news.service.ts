import { prisma } from '../../common/prisma.js';

export async function getAllNews() {
  return await prisma.news.findMany({
    orderBy: {
      published_at: 'desc',
    },
    select: {
      news_id: true,
      slug: true,
      title: true,
      summary: true,
      category: true,
      image_url: true,
      author: true,
      published_at: true,
      created_at: true,
    },
  });
}

export async function getNewsBySlug(slug: string) {
  return await prisma.news.findUnique({
    where: { slug },
  });
}
