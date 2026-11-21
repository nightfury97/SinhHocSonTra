import { createHash, randomBytes } from 'node:crypto';
import { mkdir, rm } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import type { Prisma, PrismaClient, SpeciesImage } from '@prisma/client';
import { env } from '../../env';
import { ApiError } from '../../utils/ApiError';
import { slugify } from '../datasets/importers/taxonomy';

export const SPECIES_MEDIA_DIR = path.join(env.uploadDir, 'species');
export const MEDIA_URL_PREFIX = '/api/media/species';
const ACCEPTED = new Set(['jpeg', 'png', 'webp', 'tiff', 'avif']);
const MAX_EDGE = 2000;
const THUMB_EDGE = 480;

type Db = PrismaClient | Prisma.TransactionClient;

export function serializeImage(img: SpeciesImage) {
  return {
    id: img.id,
    url: `${MEDIA_URL_PREFIX}/${img.fileKey}.webp`,
    thumbUrl: `${MEDIA_URL_PREFIX}/${img.fileKey}-thumb.webp`,
    width: img.width,
    height: img.height,
    caption: img.caption,
    credit: img.credit,
    license: img.license,
    isPrimary: img.isPrimary,
    sortOrder: img.sortOrder,
    createdAt: img.createdAt,
  };
}

/** Thứ tự hiển thị: ảnh đại diện trước, sau đó theo sortOrder. */
export const IMAGE_ORDER: Prisma.SpeciesImageOrderByWithRelationInput[] = [{ isPrimary: 'desc' }, { sortOrder: 'asc' }, { createdAt: 'asc' }];

/**
 * Chuẩn hoá ảnh tải lên: kiểm tra định dạng thật (không tin Content-Type), xoay theo EXIF,
 * thu về tối đa 2000 px + ảnh nhỏ 480 px vuông (cắt theo vùng nổi bật), lưu WebP.
 * sharp mặc định KHÔNG ghi lại metadata → EXIF/GPS bị loại bỏ.
 */
export async function storeImage(buffer: Buffer, slug: string) {
  let meta: sharp.Metadata;
  try {
    meta = await sharp(buffer).metadata();
  } catch {
    throw ApiError.badRequest('File không phải ảnh hợp lệ.');
  }
  if (!meta.format || !ACCEPTED.has(meta.format)) {
    throw ApiError.badRequest(`Định dạng ${meta.format ?? 'không rõ'} chưa hỗ trợ — dùng JPEG, PNG hoặc WebP.`);
  }

  await mkdir(SPECIES_MEDIA_DIR, { recursive: true });
  const fileKey = `${slugify(slug).slice(0, 60) || 'species'}-${randomBytes(6).toString('hex')}`;
  const full = path.join(SPECIES_MEDIA_DIR, `${fileKey}.webp`);
  const thumb = path.join(SPECIES_MEDIA_DIR, `${fileKey}-thumb.webp`);

  try {
    const info = await sharp(buffer)
      .rotate()
      .resize({ width: MAX_EDGE, height: MAX_EDGE, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 82 })
      .toFile(full);
    await sharp(buffer)
      .rotate()
      .resize({ width: THUMB_EDGE, height: THUMB_EDGE, fit: 'cover', position: sharp.strategy.attention })
      .webp({ quality: 78 })
      .toFile(thumb);
    return { fileKey, width: info.width, height: info.height };
  } catch (err) {
    await removeImageFiles(fileKey);
    throw err;
  }
}

export async function removeImageFiles(fileKey: string) {
  await Promise.all([
    rm(path.join(SPECIES_MEDIA_DIR, `${fileKey}.webp`), { force: true }),
    rm(path.join(SPECIES_MEDIA_DIR, `${fileKey}-thumb.webp`), { force: true }),
  ]);
}

/** Thêm ảnh cho loài; ảnh đầu tiên tự thành ảnh đại diện. */
export async function addSpeciesImage(
  db: Db,
  speciesId: string,
  buffer: Buffer,
  meta: { caption?: string | null; credit?: string | null; license?: string | null; uploadedById?: string | null; isPrimary?: boolean }
) {
  const species = await db.species.findUnique({ where: { id: speciesId }, select: { id: true, scientificName: true } });
  if (!species) throw ApiError.notFound('Species not found');

  // Chống tải trùng: so khớp mã băm của file gốc trong cùng một loài.
  const sourceHash = createHash('sha256').update(buffer).digest('hex');
  if (await db.speciesImage.findFirst({ where: { speciesId, sourceHash }, select: { id: true } })) {
    throw ApiError.conflict('Ảnh này đã có trong bộ ảnh của loài.');
  }
  const stored = await storeImage(buffer, species.scientificName);
  try {
    const [count, last] = await Promise.all([
      db.speciesImage.count({ where: { speciesId } }),
      db.speciesImage.findFirst({ where: { speciesId }, orderBy: { sortOrder: 'desc' }, select: { sortOrder: true } }),
    ]);
    const makePrimary = count === 0 || meta.isPrimary === true;
    if (makePrimary) await db.speciesImage.updateMany({ where: { speciesId }, data: { isPrimary: false } });
    return await db.speciesImage.create({
      data: {
        speciesId,
        ...stored,
        sourceHash,
        caption: meta.caption || null,
        credit: meta.credit || null,
        license: meta.license || null,
        uploadedById: meta.uploadedById ?? null,
        isPrimary: makePrimary,
        sortOrder: (last?.sortOrder ?? -1) + 1,
      },
    });
  } catch (err) {
    await removeImageFiles(stored.fileKey);
    throw err;
  }
}
