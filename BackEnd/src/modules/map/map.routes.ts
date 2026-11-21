import { Router } from 'express';
import { prisma } from '../../lib/prisma';
import { asyncHandler } from '../../middleware/asyncHandler';
import { TAXON_GROUPS, parseEnumParam, parseIntParam } from '../../utils/enums';
import { IMAGE_ORDER, MEDIA_URL_PREFIX } from '../species/images';

const router = Router();

router.get(
  '/pins',
  asyncHandler(async (req, res) => {
    const { group } = req.query as Record<string, string | undefined>;
    const parsedGroup = parseEnumParam(group, TAXON_GROUPS, 'group');

    const pins = await prisma.mapPin.findMany({
      where: parsedGroup ? { species: { group: parsedGroup } } : undefined,
      include: {
        zone: true,
        species: { select: { id: true, name: true, tag: true, group: true } },
        station: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(pins);
  })
);

// Điểm ghi nhận đã duyệt (có toạ độ) để vẽ lên bản đồ — gọn, không kèm dữ liệu thừa.
router.get(
  '/observations',
  asyncHandler(async (req, res) => {
    const { group, speciesId, datasetId } = req.query as Record<string, string | undefined>;
    const parsedGroup = parseEnumParam(group, TAXON_GROUPS, 'group');
    const year = parseIntParam(req.query.year, 'year');

    const points = await prisma.observation.findMany({
      where: {
        status: 'APPROVED',
        lat: { not: null },
        lng: { not: null },
        speciesId: speciesId || undefined,
        datasetId: datasetId || undefined,
        species: parsedGroup ? { group: parsedGroup } : undefined,
        observedAt: year ? { gte: new Date(Date.UTC(year, 0, 1)), lt: new Date(Date.UTC(year + 1, 0, 1)) } : undefined,
      },
      select: {
        id: true,
        lat: true,
        lng: true,
        count: true,
        observedAt: true,
        basisOfRecord: true,
        place: true,
        species: {
          select: {
            id: true,
            name: true,
            scientificName: true,
            group: true,
            status: true,
            images: { orderBy: IMAGE_ORDER, take: 1, select: { fileKey: true } },
          },
        },
      },
      take: 5000,
    });
    // Chỉ gửi đường dẫn ảnh nhỏ của loài (nhẹ: ~900 điểm dùng chung vài trăm loài).
    res.json(
      points.map(({ species: { images, ...species }, ...p }) => ({
        ...p,
        species: { ...species, thumbUrl: images[0] ? `${MEDIA_URL_PREFIX}/${images[0].fileKey}-thumb.webp` : null },
      }))
    );
  })
);

router.get(
  '/filters',
  asyncHandler(async (req, res) => {
    const groups = await prisma.species.groupBy({ by: ['group'], _count: { _all: true } });
    res.json(groups.map((g) => ({ group: g.group, count: g._count._all })));
  })
);

export default router;
