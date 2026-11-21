import { Router } from 'express';
import { prisma } from '../../lib/prisma';
import { asyncHandler } from '../../middleware/asyncHandler';

const router = Router();

const THREATENED = ['VU', 'EN', 'CR', 'EW'] as const;

router.get(
  '/summary',
  asyncHandler(async (req, res) => {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const [totalSpecies, threatenedSpecies, observationsThisMonth, featuredSpecies, byStatus] = await Promise.all([
      prisma.species.count(),
      prisma.species.count({ where: { status: { in: [...THREATENED] } } }),
      prisma.observation.count({ where: { observedAt: { gte: startOfMonth } } }),
      prisma.species.findFirst({ where: { featured: true } }),
      prisma.observation.groupBy({ by: ['status'], _count: { _all: true } }),
    ]);
    const countOf = (status: string) => byStatus.find((s) => s.status === status)?._count._all ?? 0;

    res.json({
      totalSpecies,
      threatenedSpecies,
      observationsThisMonth,
      // Số đếm công khai cho trang Tổng quan (không cần đăng nhập).
      observations: { approved: countOf('APPROVED'), pending: countOf('PENDING'), rejected: countOf('REJECTED') },
      featuredSpecies: featuredSpecies
        ? { id: featuredSpecies.id, name: featuredSpecies.name, populationLabel: featuredSpecies.populationLabel }
        : null,
    });
  })
);

/**
 * Số liệu tổng hợp cho các biểu đồ ở trang Tổng quan (công khai, không có vị trí).
 * Số bản ghi phản ánh công sức khảo sát, không phải độ phong phú của loài.
 */
router.get(
  '/charts',
  asyncHandler(async (req, res) => {
    const [byYearGroup, byMonth, byStatus, families, sightings, surveys] = await Promise.all([
      prisma.$queryRaw<{ year: bigint | number; grp: string; n: bigint }[]>`
        SELECT YEAR(o.observedAt) AS year, s.\`group\` AS grp, COUNT(*) AS n
        FROM Observation o JOIN Species s ON s.id = o.speciesId
        WHERE o.status = 'APPROVED' GROUP BY year, grp`,
      prisma.$queryRaw<{ month: bigint | number; n: bigint }[]>`
        SELECT MONTH(observedAt) AS month, COUNT(*) AS n
        FROM Observation WHERE status = 'APPROVED' GROUP BY month`,
      prisma.species.groupBy({ by: ['status'], _count: { _all: true } }),
      prisma.species.groupBy({ by: ['family'], where: { family: { not: null } }, _count: { _all: true } }),
      prisma.transectSighting.findMany({ select: { individuals: true, survey: { select: { year: true } } } }),
      prisma.transectSurvey.findMany({ select: { year: true, repeatDays: true, transect: { select: { code: true, lengthKm: true } }, _count: { select: { sightings: true } } } }),
    ]);

    const years = new Map<number, Record<string, number>>();
    for (const r of byYearGroup) {
      const year = Number(r.year);
      const y = years.get(year) ?? {};
      y[r.grp] = Number(r.n);
      years.set(year, y);
    }

    const sizes = new Map<string, number>();
    for (const g of sightings) {
      const k = `${g.survey.year}|${g.individuals}`;
      sizes.set(k, (sizes.get(k) ?? 0) + 1);
    }

    // Tỉ lệ gặp theo tuyến = số đàn / (chiều dài × số ngày đi lặp), để các tuyến dài ngắn khác nhau so sánh được.
    const rates = surveys
      .map((sv) => {
        const effortKm = sv.transect.lengthKm * sv.repeatDays;
        return { transect: sv.transect.code, year: sv.year, groups: sv._count.sightings, effortKm, rate: effortKm ? sv._count.sightings / effortKm : null };
      })
      .sort((a, b) => a.transect.localeCompare(b.transect, undefined, { numeric: true }) || a.year - b.year);

    res.json({
      observationsByYear: [...years.entries()].sort((a, b) => a[0] - b[0]).map(([year, groups]) => ({ year, groups })),
      observationsByMonth: byMonth.map((m) => ({ month: Number(m.month), count: Number(m.n) })).sort((a, b) => a.month - b.month),
      speciesByStatus: byStatus.map((s) => ({ status: s.status, count: s._count._all })),
      topFamilies: families
        .map((f) => ({ family: f.family as string, count: f._count._all }))
        .sort((a, b) => b.count - a.count || a.family.localeCompare(b.family))
        .slice(0, 10),
      sightingSizes: [...sizes.entries()].map(([k, count]) => {
        const [year, size] = k.split('|').map(Number);
        return { year, size, count };
      }),
      transectRates: rates,
    });
  })
);

router.get(
  '/population-trend',
  asyncHandler(async (req, res) => {
    const { speciesId } = req.query as Record<string, string | undefined>;

    const species = speciesId
      ? await prisma.species.findUnique({ where: { id: speciesId } })
      : await prisma.species.findFirst({ where: { featured: true } });

    if (!species) return res.json({ species: null, records: [] });

    const records = await prisma.populationRecord.findMany({
      where: { speciesId: species.id },
      orderBy: { year: 'asc' },
    });

    res.json({ species: { id: species.id, name: species.name }, records });
  })
);

router.get(
  '/env-stations',
  asyncHandler(async (req, res) => {
    const stations = await prisma.monitoringStation.findMany({ orderBy: { score: 'desc' } });
    res.json(stations);
  })
);

router.get(
  '/recent-observations',
  asyncHandler(async (req, res) => {
    const parsed = Number.parseInt((req.query.limit as string | undefined) ?? '8', 10);
    const limit = Number.isFinite(parsed) ? Math.min(Math.max(parsed, 1), 50) : 8;

    const observations = await prisma.observation.findMany({
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: { species: { select: { id: true, name: true, tag: true, group: true } }, observer: { select: { name: true } } },
    });

    res.json(observations);
  })
);

export default router;
