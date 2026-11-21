import express, { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../lib/prisma';
import { asyncHandler } from '../../middleware/asyncHandler';
import { authenticate, authorize } from '../../middleware/auth';
import { ApiError } from '../../utils/ApiError';
import { importOccurrences } from './importers/occurrences';
import { importTransects } from './importers/transects';
import { slugify } from './importers/taxonomy';

const router = Router();

router.get(
  '/',
  authenticate,
  asyncHandler(async (req, res) => {
    const datasets = await prisma.dataset.findMany({
      orderBy: { importedAt: 'desc' },
      include: {
        importedBy: { select: { id: true, name: true } },
        _count: { select: { observations: true, surveys: true } },
      },
    });
    res.json(datasets);
  })
);

router.get(
  '/:id',
  authenticate,
  asyncHandler(async (req, res) => {
    const dataset = await prisma.dataset.findUnique({
      where: { id: req.params.id },
      include: { importedBy: { select: { id: true, name: true } }, _count: { select: { observations: true, surveys: true } } },
    });
    if (!dataset) throw ApiError.notFound('Dataset not found');

    const [byGroup, byBasis, species] = await Promise.all([
      prisma.$queryRaw<{ group: string; n: bigint }[]>`
        SELECT s.\`group\` AS \`group\`, COUNT(*) AS n FROM Observation o JOIN Species s ON s.id = o.speciesId
        WHERE o.datasetId = ${dataset.id} GROUP BY s.\`group\``,
      prisma.observation.groupBy({ by: ['basisOfRecord'], where: { datasetId: dataset.id }, _count: { _all: true } }),
      prisma.observation.findMany({ where: { datasetId: dataset.id }, distinct: ['speciesId'], select: { speciesId: true } }),
    ]);

    res.json({
      ...dataset,
      stats: {
        speciesCount: species.length,
        byGroup: byGroup.map((g) => ({ group: g.group, count: Number(g.n) })),
        byBasisOfRecord: byBasis.map((b) => ({ basisOfRecord: b.basisOfRecord, count: b._count._all })),
      },
    });
  })
);

/**
 * Tải file lên để nhập: gửi nguyên nội dung file trong body (Content-Type: application/octet-stream).
 *   POST /api/datasets/import?kind=occurrences|transects&filename=...&code=...&name=...&dryRun=true
 *   (transects: thêm &species=Pygathrix%20nemaeus&utmZone=49&repeatDays=3)
 */
const importQuery = z.object({
  kind: z.enum(['occurrences', 'transects']),
  filename: z.string().min(1),
  code: z.string().min(1).optional(),
  name: z.string().min(1).optional(),
  dryRun: z.enum(['true', 'false']).optional(),
  species: z.string().min(1).default('Pygathrix nemaeus'),
  utmZone: z.coerce.number().int().min(1).max(60).default(49),
  repeatDays: z.coerce.number().int().min(1).max(30).default(3),
});

router.post(
  '/import',
  authenticate,
  authorize('ADMIN'),
  express.raw({ type: () => true, limit: '20mb' }),
  asyncHandler(async (req, res) => {
    const q = importQuery.parse(req.query);
    if (!Buffer.isBuffer(req.body) || req.body.length === 0) throw ApiError.badRequest('Empty file body');

    const code = q.code ?? slugify(q.filename.replace(/\.[^.]+$/, ''));
    const common = { code, name: q.name ?? q.filename, sourceFile: q.filename, importedById: req.user!.id, dryRun: q.dryRun === 'true' };

    try {
      const report =
        q.kind === 'occurrences'
          ? await importOccurrences(prisma, req.body.toString('utf8'), common)
          : await importTransects(prisma, req.body, { ...common, speciesScientificName: q.species, utmZone: q.utmZone, repeatDays: q.repeatDays });
      res.status(q.dryRun === 'true' ? 200 : 201).json(report);
    } catch (err) {
      // Lỗi định dạng file (thiếu cột, sai sheet...) là lỗi phía người dùng.
      if (err instanceof Error && !('code' in err)) throw ApiError.badRequest(err.message);
      throw err;
    }
  })
);

// Xoá cả lô: các quan sát & đợt khảo sát của bộ dữ liệu bị xoá theo (cascade); loài được giữ lại.
router.delete(
  '/:id',
  authenticate,
  authorize('ADMIN'),
  asyncHandler(async (req, res) => {
    await prisma.dataset.delete({ where: { id: req.params.id } });
    res.status(204).send();
  })
);

export default router;
