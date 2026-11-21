import express, { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../lib/prisma';
import { asyncHandler } from '../../middleware/asyncHandler';
import { validateBody } from '../../middleware/validate';
import { authenticate, authorize } from '../../middleware/auth';
import { ApiError } from '../../utils/ApiError';
import { CONSERVATION_STATUSES, TAXON_GROUPS, parseEnumParam } from '../../utils/enums';
import { IMAGE_ORDER, addSpeciesImage, removeImageFiles, serializeImage } from './images';

const router = Router();

const STATUSES = CONSERVATION_STATUSES;
const taxonGroup = z.enum(TAXON_GROUPS);
const conservationStatus = z.enum(STATUSES);

const speciesSchema = z.object({
  slug: z.string().min(1),
  tag: z.string().min(1).max(4),
  name: z.string().min(1),
  scientificName: z.string().min(1),
  authorship: z.string().nullish(),
  taxonClass: z.string().nullish(),
  taxonOrder: z.string().nullish(),
  family: z.string().nullish(),
  genus: z.string().nullish(),
  group: taxonGroup,
  status: conservationStatus.default('NE'),
  statusLabel: z.string().nullish(),
  populationLabel: z.string().nullish(),
  description: z.string().nullish(),
  habitat: z.string().nullish(),
  threats: z.array(z.string()).default([]),
  featured: z.boolean().optional(),
});

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { group, status, featured, q, family, taxonClass } = req.query as Record<string, string | undefined>;

    const species = await prisma.species.findMany({
      where: {
        group: parseEnumParam(group, TAXON_GROUPS, 'group'),
        status: parseEnumParam(status, STATUSES, 'status'),
        featured: featured !== undefined ? featured === 'true' : undefined,
        family: family || undefined,
        taxonClass: taxonClass || undefined,
        OR: q ? [{ name: { contains: q } }, { scientificName: { contains: q } }] : undefined,
      },
      orderBy: { name: 'asc' },
      include: { _count: { select: { observations: true, images: true } }, images: { orderBy: IMAGE_ORDER, take: 1 } },
    });

    // Danh sách chỉ kèm ảnh đại diện (bản nhỏ) để nhẹ.
    res.json(species.map(({ images, ...s }) => ({ ...s, primaryImage: images[0] ? serializeImage(images[0]) : null })));
  })
);

router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const species = await prisma.species.findUnique({
      where: { id: req.params.id },
      include: {
        populationRecords: { orderBy: { year: 'asc' } },
        images: { orderBy: IMAGE_ORDER },
        _count: { select: { observations: true } },
      },
    });
    if (!species) throw ApiError.notFound('Species not found');
    res.json({ ...species, images: species.images.map(serializeImage) });
  })
);

router.post(
  '/',
  authenticate,
  authorize('ADMIN', 'RANGER'),
  validateBody(speciesSchema),
  asyncHandler(async (req, res) => {
    const species = await prisma.species.create({ data: req.body });
    // Lưu ý: tên khoa học là duy nhất (khoá ghép với dữ liệu nhập từ file).
    res.status(201).json(species);
  })
);

router.put(
  '/:id',
  authenticate,
  authorize('ADMIN', 'RANGER'),
  validateBody(speciesSchema.omit({ status: true }).extend({ status: conservationStatus.optional() }).partial()),
  asyncHandler(async (req, res) => {
    const species = await prisma.species.update({ where: { id: req.params.id }, data: req.body });
    res.json(species);
  })
);

router.delete(
  '/:id',
  authenticate,
  authorize('ADMIN'),
  asyncHandler(async (req, res) => {
    const images = await prisma.speciesImage.findMany({ where: { speciesId: req.params.id }, select: { fileKey: true } });
    await prisma.species.delete({ where: { id: req.params.id } });
    await Promise.all(images.map((i) => removeImageFiles(i.fileKey)));
    res.status(204).send();
  })
);

router.post(
  '/:id/population',
  authenticate,
  authorize('ADMIN', 'RANGER'),
  validateBody(z.object({ year: z.number().int(), value: z.number().int() })),
  asyncHandler(async (req, res) => {
    const record = await prisma.populationRecord.upsert({
      where: { speciesId_year: { speciesId: req.params.id, year: req.body.year } },
      create: { speciesId: req.params.id, year: req.body.year, value: req.body.value },
      update: { value: req.body.value },
    });
    res.status(201).json(record);
  })
);

// ───────────── Ảnh loài ─────────────

/**
 * Tải ảnh lên: gửi nguyên bytes của file trong body.
 *   POST /api/species/:id/images?caption=...&credit=...&license=...&primary=true
 */
const imageMetaQuery = z.object({
  caption: z.string().max(2000).optional(),
  credit: z.string().max(191).optional(),
  license: z.string().max(191).optional(),
  primary: z.enum(['true', 'false']).optional(),
});

router.post(
  '/:id/images',
  authenticate,
  authorize('ADMIN', 'RANGER'),
  express.raw({ type: () => true, limit: '15mb' }),
  asyncHandler(async (req, res) => {
    const q = imageMetaQuery.parse(req.query);
    if (!Buffer.isBuffer(req.body) || req.body.length === 0) throw ApiError.badRequest('Empty file body');
    const image = await addSpeciesImage(prisma, req.params.id, req.body, {
      caption: q.caption,
      credit: q.credit,
      license: q.license,
      isPrimary: q.primary === 'true',
      uploadedById: req.user!.id,
    });
    res.status(201).json(serializeImage(image));
  })
);

const imagePatch = z.object({
  caption: z.string().max(2000).nullable().optional(),
  credit: z.string().max(191).nullable().optional(),
  license: z.string().max(191).nullable().optional(),
  isPrimary: z.literal(true).optional(),
  sortOrder: z.number().int().optional(),
});

router.patch(
  '/images/:imageId',
  authenticate,
  authorize('ADMIN', 'RANGER'),
  validateBody(imagePatch),
  asyncHandler(async (req, res) => {
    const existing = await prisma.speciesImage.findUnique({ where: { id: req.params.imageId } });
    if (!existing) throw ApiError.notFound('Image not found');
    const image = await prisma.$transaction(async (tx) => {
      if (req.body.isPrimary) await tx.speciesImage.updateMany({ where: { speciesId: existing.speciesId }, data: { isPrimary: false } });
      return tx.speciesImage.update({ where: { id: existing.id }, data: req.body });
    });
    res.json(serializeImage(image));
  })
);

router.delete(
  '/images/:imageId',
  authenticate,
  authorize('ADMIN', 'RANGER'),
  asyncHandler(async (req, res) => {
    const existing = await prisma.speciesImage.findUnique({ where: { id: req.params.imageId } });
    if (!existing) throw ApiError.notFound('Image not found');
    await prisma.$transaction(async (tx) => {
      await tx.speciesImage.delete({ where: { id: existing.id } });
      // Xoá ảnh đại diện thì ảnh kế tiếp lên thay.
      if (existing.isPrimary) {
        const next = await tx.speciesImage.findFirst({ where: { speciesId: existing.speciesId }, orderBy: { sortOrder: 'asc' } });
        if (next) await tx.speciesImage.update({ where: { id: next.id }, data: { isPrimary: true } });
      }
    });
    await removeImageFiles(existing.fileKey);
    res.status(204).send();
  })
);

export default router;
