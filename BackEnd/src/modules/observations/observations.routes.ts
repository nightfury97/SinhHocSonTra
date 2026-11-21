import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../lib/prisma';
import { asyncHandler } from '../../middleware/asyncHandler';
import { validateBody } from '../../middleware/validate';
import { authenticate, authorize } from '../../middleware/auth';
import { ApiError } from '../../utils/ApiError';
import { BASIS_OF_RECORD, OBSERVATION_STATUSES, parseEnumParam, parseIntParam, parsePaging } from '../../utils/enums';

const router = Router();

const observationSchema = z.object({
  speciesId: z.string().min(1),
  place: z.string().min(1),
  note: z.string().optional(),
  count: z.number().int().positive().optional(),
  lat: z.number().optional(),
  lng: z.number().optional(),
  observedAt: z.coerce.date().optional(),
});

const reviewSchema = z.object({
  status: z.enum(['APPROVED', 'REJECTED']),
});

router.get(
  '/',
  authenticate,
  asyncHandler(async (req, res) => {
    const { status, mine, speciesId, datasetId, basisOfRecord } = req.query as Record<string, string | undefined>;
    const year = parseIntParam(req.query.year, 'year');
    const { page, pageSize, skip, take } = parsePaging(req.query);

    const where = {
      status: parseEnumParam(status, OBSERVATION_STATUSES, 'status'),
      basisOfRecord: parseEnumParam(basisOfRecord, BASIS_OF_RECORD, 'basisOfRecord'),
      observerId: mine === 'true' ? req.user!.id : undefined,
      speciesId: speciesId || undefined,
      datasetId: datasetId || undefined,
      observedAt: year ? { gte: new Date(Date.UTC(year, 0, 1)), lt: new Date(Date.UTC(year + 1, 0, 1)) } : undefined,
    };

    const [items, total] = await Promise.all([
      prisma.observation.findMany({
        where,
        include: {
          species: { select: { id: true, name: true, scientificName: true, tag: true, group: true } },
          observer: { select: { id: true, name: true } },
          dataset: { select: { id: true, code: true, name: true } },
        },
        orderBy: { observedAt: 'desc' },
        skip,
        take,
      }),
      prisma.observation.count({ where }),
    ]);

    res.json({ items, total, page, pageSize });
  })
);

router.get(
  '/:id',
  authenticate,
  asyncHandler(async (req, res) => {
    const observation = await prisma.observation.findUnique({
      where: { id: req.params.id },
      include: { species: true, observer: { select: { id: true, name: true } }, dataset: true },
    });
    if (!observation) throw ApiError.notFound('Observation not found');
    res.json(observation);
  })
);

router.post(
  '/',
  authenticate,
  validateBody(observationSchema),
  asyncHandler(async (req, res) => {
    const observation = await prisma.observation.create({
      data: { ...req.body, observerId: req.user!.id },
      include: { species: true },
    });
    res.status(201).json(observation);
  })
);

router.patch(
  '/:id/status',
  authenticate,
  authorize('ADMIN', 'RANGER'),
  validateBody(reviewSchema),
  asyncHandler(async (req, res) => {
    const existing = await prisma.observation.findUnique({ where: { id: req.params.id } });
    if (!existing) throw ApiError.notFound('Observation not found');
    if (existing.observerId === req.user!.id && req.user!.role !== 'ADMIN') {
      throw ApiError.forbidden('Cannot review your own observation');
    }
    const observation = await prisma.observation.update({
      where: { id: req.params.id },
      data: { status: req.body.status, reviewedById: req.user!.id, reviewedAt: new Date() },
    });
    res.json(observation);
  })
);

router.delete(
  '/:id',
  authenticate,
  asyncHandler(async (req, res) => {
    const observation = await prisma.observation.findUnique({ where: { id: req.params.id } });
    if (!observation) throw ApiError.notFound('Observation not found');
    if (observation.observerId !== req.user!.id && req.user!.role !== 'ADMIN') {
      throw ApiError.forbidden('Cannot delete another user\'s observation');
    }
    await prisma.observation.delete({ where: { id: req.params.id } });
    res.status(204).send();
  })
);

export default router;
