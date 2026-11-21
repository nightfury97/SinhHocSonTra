import { parse } from 'csv-parse/sync';
import type { BasisOfRecord, PrismaClient } from '@prisma/client';
import { groupFromClass, upsertSpecies } from './taxonomy';

export interface ImportReport {
  dataset: string;
  rows: number;
  imported: number;
  updated: number;
  skipped: { row: number; reason: string }[];
  speciesCreated: number;
  warnings: { row: number; message: string }[];
}

const BASIS: Record<string, BasisOfRecord> = {
  humanobservation: 'HUMAN_OBSERVATION',
  preservedspecimen: 'PRESERVED_SPECIMEN',
  machineobservation: 'MACHINE_OBSERVATION',
};

function makeDate(y: number, m: number, d: number): Date | null {
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d ? date : null;
}

/** Ngày dạng ISO (YYYY-MM-DD) hoặc M/D/YYYY. Lưu lúc 00:00 UTC. */
function parseDate(raw: string | undefined): Date | null {
  if (!raw) return null;
  const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(raw);
  if (iso) return makeDate(Number(iso[1]), Number(iso[2]), Number(iso[3]));
  const us = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(raw);
  if (us) return makeDate(Number(us[3]), Number(us[1]), Number(us[2]));
  return null;
}

/** Lấy ngày từ eventDate; nếu hỏng thì thử verbatimEventDate rồi year/month/day. */
function resolveEventDate(r: Record<string, string>): { date: Date | null; fallback: string | null } {
  const primary = parseDate(r.eventDate);
  if (primary) return { date: primary, fallback: null };
  const verbatim = parseDate(r.verbatimEventDate);
  if (verbatim) return { date: verbatim, fallback: 'verbatimEventDate' };
  const parts = r.year && r.month && r.day ? makeDate(Number(r.year), Number(r.month), Number(r.day)) : null;
  return { date: parts, fallback: parts ? 'year/month/day' : null };
}

function decimals(value: string) {
  const i = value.indexOf('.');
  return i === -1 ? 0 : value.length - i - 1;
}

/**
 * Nhập file occurrence theo chuẩn Darwin Core (CSV). Chạy lại nhiều lần an toàn: khoá theo
 * `occurrenceID`, bản ghi đã có thì cập nhật.
 */
export async function importOccurrences(
  prisma: PrismaClient,
  content: string,
  opts: { code: string; name: string; sourceFile: string; importedById?: string; dryRun?: boolean }
): Promise<ImportReport> {
  const records: Record<string, string>[] = parse(content, { columns: true, bom: true, skip_empty_lines: true, trim: true });
  const report: ImportReport = { dataset: opts.code, rows: records.length, imported: 0, updated: 0, skipped: [], speciesCreated: 0, warnings: [] };

  const required = ['occurrenceID', 'genus', 'specificEpithet', 'class', 'decimalLatitude', 'decimalLongitude'];
  const missing = required.filter((c) => !(c in (records[0] ?? {})));
  if (missing.length) throw new Error(`Thiếu cột bắt buộc: ${missing.join(', ')}`);

  const publisher = [...new Set(records.map((r) => r.institutionCode).filter(Boolean))].join(', ') || null;

  await prisma.$transaction(
    async (tx) => {
      const dataset = await tx.dataset.upsert({
        where: { code: opts.code },
        update: { name: opts.name, sourceFile: opts.sourceFile, publisher, importedAt: new Date(), importedById: opts.importedById ?? null },
        create: { code: opts.code, name: opts.name, kind: 'OCCURRENCE', sourceFile: opts.sourceFile, publisher, importedById: opts.importedById ?? null },
      });

      const speciesCache = new Map<string, string>();
      for (const [i, r] of records.entries()) {
        const row = i + 2; // dòng trong file (tính cả header)
        const group = groupFromClass(r.class ?? '', r.kingdom);
        if (!group) {
          report.skipped.push({ row, reason: `Lớp không hỗ trợ: "${r.class}"` });
          continue;
        }
        if (!r.genus || !r.specificEpithet) {
          report.skipped.push({ row, reason: 'Thiếu chi/tính ngữ loài' });
          continue;
        }
        const lat = Number(r.decimalLatitude);
        const lng = Number(r.decimalLongitude);
        if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
          report.skipped.push({ row, reason: 'Toạ độ không hợp lệ' });
          continue;
        }
        const { date: observedAt, fallback } = resolveEventDate(r);
        if (!observedAt) {
          report.skipped.push({ row, reason: `Ngày không hợp lệ: "${r.eventDate}"` });
          continue;
        }
        if (fallback) {
          report.warnings.push({ row, message: `eventDate "${r.eventDate}" sai, dùng ${fallback} → ${observedAt.toISOString().slice(0, 10)}` });
        }
        if (decimals(r.decimalLatitude) < 3 || decimals(r.decimalLongitude) < 3) {
          report.warnings.push({ row, message: `Toạ độ độ chính xác thấp (${r.decimalLatitude}, ${r.decimalLongitude}) — sai số cỡ 1 km` });
        }

        const species = await upsertSpecies(
          tx,
          { genus: r.genus, epithet: r.specificEpithet, authorship: r.scientificNameAuthorship, taxonClass: r.class, taxonOrder: r.order, family: r.family, group },
          speciesCache
        );
        if (species.created) report.speciesCreated++;

        const count = Number.parseInt(r.individualCount, 10);
        const data = {
          speciesId: species.id,
          datasetId: dataset.id,
          basisOfRecord: BASIS[(r.basisOfRecord ?? '').toLowerCase()] ?? 'OTHER',
          identifiedBy: r.identifiedBy || null,
          preparations: r.preparations || null,
          place: [r.locality, r.county, r.stateProvince].filter(Boolean).join(', ') || 'Không rõ',
          count: Number.isFinite(count) && count > 0 ? count : null,
          lat,
          lng,
          observedAt,
          status: 'APPROVED' as const,
          reviewedAt: new Date(),
        };

        if (opts.dryRun) {
          report.imported++;
          continue;
        }
        const existing = await tx.observation.findUnique({ where: { externalId: r.occurrenceID }, select: { id: true } });
        if (existing) {
          await tx.observation.update({ where: { id: existing.id }, data });
          report.updated++;
        } else {
          await tx.observation.create({ data: { ...data, externalId: r.occurrenceID } });
          report.imported++;
        }
      }

      if (opts.dryRun) throw new DryRunRollback();
    },
    { timeout: 120_000 }
  ).catch((err) => {
    if (!(err instanceof DryRunRollback)) throw err;
  });

  return report;
}

export class DryRunRollback extends Error {}
