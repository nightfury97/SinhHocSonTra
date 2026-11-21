import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../lib/prisma';
import { asyncHandler } from '../../middleware/asyncHandler';
import { validateBody } from '../../middleware/validate';
import { authenticate, authorize } from '../../middleware/auth';
import { ApiError } from '../../utils/ApiError';

const router = Router();

const stationSchema = z.object({
  name: z.string().min(1),
  type: z.enum(['WATER', 'AIR', 'SOIL']),
  rating: z.string().min(1),
  score: z.number().int().min(0).max(100),
  metric: z.string().min(1),
  level: z.enum(['GOOD', 'GOOD_2', 'FAIR', 'POOR']),
  lat: z.number().optional(),
  lng: z.number().optional(),
});

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const stations = await prisma.monitoringStation.findMany({ orderBy: { name: 'asc' } });
    res.json(stations);
  })
);

router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const station = await prisma.monitoringStation.findUnique({ where: { id: req.params.id } });
    if (!station) throw ApiError.notFound('Station not found');
    res.json(station);
  })
);

router.post(
  '/',
  authenticate,
  authorize('ADMIN', 'RANGER'),
  validateBody(stationSchema),
  asyncHandler(async (req, res) => {
    const station = await prisma.monitoringStation.create({ data: req.body });
    res.status(201).json(station);
  })
);

router.put(
  '/:id',
  authenticate,
  authorize('ADMIN', 'RANGER'),
  validateBody(stationSchema.partial()),
  asyncHandler(async (req, res) => {
    const station = await prisma.monitoringStation.update({ where: { id: req.params.id }, data: req.body });
    res.json(station);
  })
);

router.delete(
  '/:id',
  authenticate,
  authorize('ADMIN'),
  asyncHandler(async (req, res) => {
    await prisma.monitoringStation.delete({ where: { id: req.params.id } });
    res.status(204).send();
  })
);

export default router;
