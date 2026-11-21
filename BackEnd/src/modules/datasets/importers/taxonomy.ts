import type { Prisma, PrismaClient, TaxonGroup } from '@prisma/client';

const CLASS_TO_GROUP: Record<string, TaxonGroup> = {
  aves: 'BIRD',
  mammal: 'MAMMAL',
  mammalia: 'MAMMAL',
  reptilia: 'REPTILE',
  amphibia: 'AMPHIBIAN',
  plantae: 'PLANT',
};

export function groupFromClass(taxonClass: string, kingdom?: string): TaxonGroup | null {
  if (kingdom?.toLowerCase() === 'plantae') return 'PLANT';
  return CLASS_TO_GROUP[taxonClass.trim().toLowerCase()] ?? null;
}

export function slugify(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/gi, 'd')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export interface TaxonInput {
  genus: string;
  epithet: string;
  authorship?: string;
  taxonClass?: string;
  taxonOrder?: string;
  family?: string;
  group: TaxonGroup;
}

type Db = PrismaClient | Prisma.TransactionClient;

/**
 * Tìm loài theo tên khoa học chuẩn (Chi + tính ngữ, không kèm tác giả); chưa có thì tạo mới
 * với trạng thái NE và tên hiển thị tạm = tên khoa học. Với loài đã có, chỉ điền các trường phân
 * loại còn trống — không ghi đè dữ liệu đã được biên tập (tên Việt, IUCN, mô tả...).
 */
export async function upsertSpecies(db: Db, t: TaxonInput, cache: Map<string, string>) {
  const scientificName = `${t.genus} ${t.epithet}`.trim();
  const cached = cache.get(scientificName);
  if (cached) return { id: cached, created: false };

  const existing = await db.species.findUnique({ where: { scientificName } });
  if (existing) {
    await db.species.update({
      where: { id: existing.id },
      data: {
        authorship: existing.authorship ?? t.authorship ?? null,
        taxonClass: existing.taxonClass ?? t.taxonClass ?? null,
        taxonOrder: existing.taxonOrder ?? t.taxonOrder ?? null,
        family: existing.family ?? t.family ?? null,
        genus: existing.genus ?? t.genus,
      },
    });
    cache.set(scientificName, existing.id);
    return { id: existing.id, created: false };
  }

  let slug = slugify(scientificName);
  if (await db.species.findUnique({ where: { slug } })) slug = `${slug}-${Date.now().toString(36)}`;

  const created = await db.species.create({
    data: {
      slug,
      tag: (t.genus[0].toUpperCase() + (t.epithet[0] ?? '').toLowerCase()).slice(0, 4),
      name: scientificName,
      scientificName,
      authorship: t.authorship || null,
      taxonClass: t.taxonClass || null,
      taxonOrder: t.taxonOrder || null,
      family: t.family || null,
      genus: t.genus,
      group: t.group,
      status: 'NE',
    },
  });
  cache.set(scientificName, created.id);
  return { id: created.id, created: true };
}
