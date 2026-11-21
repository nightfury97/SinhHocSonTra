import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../lib/prisma';
import { asyncHandler } from '../../middleware/asyncHandler';
import { validateBody } from '../../middleware/validate';
import { authenticate, authorize } from '../../middleware/auth';
import { ApiError } from '../../utils/ApiError';
import { parseIntParam } from '../../utils/enums';
import { utmToLatLng } from '../../utils/utm';

const router = Router();

router.get(
  '/transects',
  asyncHandler(async (req, res) => {
    const transects = await prisma.transect.findMany({
      orderBy: { code: 'asc' },
      include: { surveys: { select: { id: true, year: true, _count: { select: { sightings: true } } }, orderBy: { year: 'asc' } } },
    });
    // Sắp T1, T2, ... T10 theo số chứ không theo chữ.
    transects.sort((a, b) => a.code.localeCompare(b.code, undefined, { numeric: true }));
    res.json(transects);
  })
);

/**
 * Tổng hợp theo năm: số đàn, số cá thể, quãng đường khảo sát (km × số ngày lặp),
 * tỉ lệ gặp (đàn/km) và cỡ đàn trung bình. Đây là số liệu ĐẾM ĐƯỢC trên tuyến,
 * không phải ước lượng mật độ/quần thể (cần phân tích Distance sampling riêng).
 */
router.get(
  '/summary',
  asyncHandler(async (req, res) => {
    const speciesId = (req.query.speciesId as string | undefined) || undefined;
    const surveys = await prisma.transectSurvey.findMany({
      where: { speciesId },
      include: { transect: true, sightings: { select: { individuals: true, flagged: true } } },
    });

    const byYear = new Map<number, { year: number; transects: number; effortKm: number; groups: number; individuals: number; flagged: number }>();
    for (const s of surveys) {
      const y = byYear.get(s.year) ?? { year: s.year, transects: 0, effortKm: 0, groups: 0, individuals: 0, flagged: 0 };
      y.transects += 1;
      y.effortKm += s.transect.lengthKm * s.repeatDays;
      y.groups += s.sightings.length;
      y.individuals += s.sightings.reduce((n, g) => n + g.individuals, 0);
      y.flagged += s.sightings.filter((g) => g.flagged).length;
      byYear.set(s.year, y);
    }

    const round = (n: number, d = 2) => Math.round(n * 10 ** d) / 10 ** d;
    res.json(
      [...byYear.values()]
        .sort((a, b) => a.year - b.year)
        .map((y) => ({
          ...y,
          effortKm: round(y.effortKm),
          encounterRatePerKm: y.effortKm ? round(y.groups / y.effortKm, 3) : null,
          meanGroupSize: y.groups ? round(y.individuals / y.groups) : null,
        }))
    );
  })
);

router.get(
  '/sightings',
  asyncHandler(async (req, res) => {
    const year = parseIntParam(req.query.year, 'year');
    const { transect, flagged } = req.query as Record<string, string | undefined>;
    const sightings = await prisma.transectSighting.findMany({
      where: {
        flagged: flagged === undefined ? undefined : flagged === 'true',
        survey: { year, transect: transect ? { code: transect } : undefined },
      },
      include: { survey: { select: { year: true, speciesId: true, transect: { select: { code: true, lengthKm: true } } } } },
      orderBy: [{ surveyId: 'asc' }, { groupCode: 'asc' }],
    });
    res.json(sightings);
  })
);

// Sửa một điểm ghi nhận (thường để chữa lỗi nhập liệu đã bị gắn cờ). Sửa UTM sẽ tự tính lại lat/lng.
const sightingPatch = z.object({
  individuals: z.number().int().positive().optional(),
  utmX: z.number().optional(),
  utmY: z.number().optional(),
  altitudeM: z.number().nullable().optional(),
  distanceM: z.number().nullable().optional(),
  bearingDeg: z.number().min(0).max(360).nullable().optional(),
  habitat: z.enum(['PLANTATION', 'RICH', 'POOR']).nullable().optional(),
  perpendicularDistanceM: z.number().nullable().optional(),
  flagged: z.boolean().optional(),
  flagNote: z.string().nullable().optional(),
  utmZone: z.number().int().min(1).max(60).default(49),
});

router.patch(
  '/sightings/:id',
  authenticate,
  authorize('ADMIN', 'RANGER'),
  validateBody(sightingPatch),
  asyncHandler(async (req, res) => {
    const existing = await prisma.transectSighting.findUnique({ where: { id: req.params.id } });
    if (!existing) throw ApiError.notFound('Sighting not found');

    const { utmZone, ...data } = req.body as z.infer<typeof sightingPatch>;
    const utmX = data.utmX ?? existing.utmX;
    const utmY = data.utmY ?? existing.utmY;
    const coords = (data.utmX !== undefined || data.utmY !== undefined) && utmX !== null && utmY !== null ? utmToLatLng(utmX, utmY, utmZone) : null;

    const sighting = await prisma.transectSighting.update({
      where: { id: existing.id },
      data: { ...data, ...(coords ?? {}) },
    });
    res.json(sighting);
  })
);

export default router;
