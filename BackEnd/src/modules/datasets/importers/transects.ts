import ExcelJS from 'exceljs';
import type { ForestHabitat, PrismaClient } from '@prisma/client';
import { utmToLatLng } from '../../../utils/utm';
import { DryRunRollback } from './occurrences';

/** Khung bán đảo Sơn Trà (nới rộng) — điểm nằm ngoài coi như toạ độ nhập sai. */
const SON_TRA_BBOX = { minLat: 16.05, maxLat: 16.2, minLng: 108.18, maxLng: 108.37 };
const MIN_ALTITUDE_M = 20;
const MAX_ALTITUDE_M = 700; // đỉnh cao nhất Sơn Trà ~696 m
const HABITAT: Record<string, ForestHabitat> = { plf: 'PLANTATION', rif: 'RICH', prf: 'POOR' };

const COLUMNS = {
  transect: /line transect id/i,
  length: /length of line transect/i,
  group: /animal group id/i,
  individuals: /individual of group/i,
  coords: /observer coordinates/i,
  altitude: /altitude/i,
  distance: /distance from observer/i,
  bearing: /north deviation/i,
  habitat: /forest habitat/i,
  offset: /offset angle/i,
  perpendicular: /perpendicular distance/i,
} as const;

type Col = keyof typeof COLUMNS;

export interface TransectImportReport {
  dataset: string;
  sheets: {
    sheet: string;
    year: number;
    transects: number;
    sightings: number;
    individuals: number;
    totalRowCheck: string;
    flagged: { group: string; reason: string }[];
  }[];
}

function cellValue(v: ExcelJS.CellValue): string | number | null {
  if (v === null || v === undefined) return null;
  if (typeof v === 'number' || typeof v === 'string') return typeof v === 'string' ? v.trim() || null : v;
  if (typeof v === 'object' && 'result' in v) return cellValue(v.result as ExcelJS.CellValue);
  if (typeof v === 'object' && 'richText' in v) return v.richText.map((t) => t.text).join('').trim() || null;
  return String(v);
}

const num = (v: string | number | null) => (v === null || v === '' ? null : Number.isFinite(Number(v)) ? Number(v) : null);

/**
 * Nhập file khảo sát theo tuyến (line transect) dạng Excel, mỗi sheet một năm (tên sheet chứa năm).
 * Điểm có toạ độ/độ cao bất thường vẫn được nhập nhưng gắn cờ `flagged` để người dùng rà soát.
 */
export async function importTransects(
  prisma: PrismaClient,
  buffer: Buffer,
  opts: { code: string; name: string; sourceFile: string; speciesScientificName: string; utmZone: number; repeatDays: number; importedById?: string; dryRun?: boolean }
): Promise<TransectImportReport> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as unknown as ArrayBuffer);
  const report: TransectImportReport = { dataset: opts.code, sheets: [] };

  const species = await prisma.species.findUnique({ where: { scientificName: opts.speciesScientificName } });
  if (!species) throw new Error(`Chưa có loài "${opts.speciesScientificName}" trong CSDL — tạo loài trước hoặc đổi --species.`);

  await prisma.$transaction(
    async (tx) => {
      const dataset = await tx.dataset.upsert({
        where: { code: opts.code },
        update: { name: opts.name, sourceFile: opts.sourceFile, importedAt: new Date(), importedById: opts.importedById ?? null },
        create: { code: opts.code, name: opts.name, kind: 'TRANSECT', sourceFile: opts.sourceFile, publisher: 'GreenViet', importedById: opts.importedById ?? null },
      });

      for (const ws of workbook.worksheets) {
        const year = Number(/(19|20)\d{2}/.exec(ws.name)?.[0]);
        if (!year) continue;

        // Tìm dòng tiêu đề và vị trí từng cột theo nội dung (không phụ thuộc vị trí cố định).
        let headerRow = 0;
        const col: Partial<Record<Col, number>> = {};
        ws.eachRow((row, rowNumber) => {
          if (headerRow) return;
          row.eachCell((cell, colNumber) => {
            const text = String(cellValue(cell.value) ?? '');
            for (const [key, re] of Object.entries(COLUMNS) as [Col, RegExp][]) {
              if (col[key] === undefined && re.test(text)) col[key] = colNumber;
            }
          });
          if (col.transect && col.group) headerRow = rowNumber;
        });
        if (!headerRow || !col.coords || !col.individuals) throw new Error(`Sheet "${ws.name}": không tìm thấy dòng tiêu đề`);

        const sheetReport = { sheet: ws.name, year, transects: 0, sightings: 0, individuals: 0, totalRowCheck: 'không có dòng Total', flagged: [] as { group: string; reason: string }[] };
        const surveys = new Map<string, string>();
        let currentTransect: string | null = null;

        for (let r = headerRow + 1; r <= ws.rowCount; r++) {
          const row = ws.getRow(r);
          const get = (c?: number) => (c ? cellValue(row.getCell(c).value) : null);
          const transectCell = get(col.transect);
          const groupCell = get(col.group);
          const individuals = num(get(col.individuals));

          // Ô tiêu đề gộp nhiều dòng: exceljs lặp lại giá trị tiêu đề ở các dòng phụ (X/Y) — bỏ qua.
          if (typeof transectCell === 'string' && COLUMNS.transect.test(transectCell)) continue;
          if (typeof transectCell === 'string' && /^total$/i.test(transectCell)) {
            const expectedGroups = num(groupCell);
            sheetReport.totalRowCheck =
              expectedGroups === sheetReport.sightings && individuals === sheetReport.individuals
                ? `khớp (${expectedGroups} đàn, ${individuals} cá thể)`
                : `LỆCH: file ghi ${expectedGroups} đàn/${individuals} cá thể, đọc được ${sheetReport.sightings}/${sheetReport.individuals}`;
            continue;
          }
          if (transectCell) currentTransect = String(transectCell);
          if (!currentTransect || (!groupCell && individuals === null)) continue;

          let surveyId = surveys.get(currentTransect);
          if (!surveyId) {
            const lengthKm = num(get(col.length));
            const transect = await tx.transect.upsert({
              where: { code: currentTransect },
              update: lengthKm ? { lengthKm } : {},
              create: { code: currentTransect, lengthKm: lengthKm ?? 0 },
            });
            const survey = await tx.transectSurvey.upsert({
              where: { transectId_year: { transectId: transect.id, year } },
              update: { datasetId: dataset.id, speciesId: species.id, repeatDays: opts.repeatDays, note: null },
              create: { transectId: transect.id, year, datasetId: dataset.id, speciesId: species.id, repeatDays: opts.repeatDays },
            });
            await tx.transectSighting.deleteMany({ where: { surveyId: survey.id } }); // nhập lại = thay toàn bộ
            surveys.set(currentTransect, survey.id);
            surveyId = survey.id;
            sheetReport.transects++;
          }

          // Đi tuyến nhưng không gặp đàn nào ("No recorded").
          if (individuals === null) {
            await tx.transectSurvey.update({ where: { id: surveyId }, data: { note: String(groupCell) } });
            continue;
          }

          const groupCode = String(groupCell ?? `${currentTransect}_${r}`);
          const utmX = num(get(col.coords));
          const utmY = num(get(col.coords + 1));
          const altitudeM = num(get(col.altitude));
          const reasons: string[] = [];
          let lat: number | null = null;
          let lng: number | null = null;

          if (utmX !== null && utmY !== null) {
            const p = utmToLatLng(utmX, utmY, opts.utmZone, true);
            const inside = p.lat >= SON_TRA_BBOX.minLat && p.lat <= SON_TRA_BBOX.maxLat && p.lng >= SON_TRA_BBOX.minLng && p.lng <= SON_TRA_BBOX.maxLng;
            if (inside) ({ lat, lng } = p);
            else reasons.push(`Toạ độ UTM (${utmX}, ${utmY}) nằm ngoài bán đảo Sơn Trà`);
          } else {
            reasons.push('Thiếu toạ độ');
          }
          if (altitudeM !== null && (altitudeM < MIN_ALTITUDE_M || altitudeM > MAX_ALTITUDE_M)) {
            reasons.push(`Độ cao ${altitudeM} m bất thường`);
          }
          const bearingDeg = num(get(col.bearing));
          if (bearingDeg !== null && (bearingDeg < 0 || bearingDeg > 360)) reasons.push(`Góc phương vị ${bearingDeg}° ngoài 0–360`);
          const habitatRaw = get(col.habitat);
          const habitat = habitatRaw ? HABITAT[String(habitatRaw).toLowerCase()] ?? null : null;
          if (habitatRaw && !habitat) reasons.push(`Sinh cảnh không rõ: "${habitatRaw}"`);

          if (!opts.dryRun) {
            await tx.transectSighting.create({
              data: {
                surveyId,
                groupCode,
                individuals,
                utmX,
                utmY,
                lat,
                lng,
                altitudeM,
                distanceM: num(get(col.distance)),
                bearingDeg,
                habitat,
                offsetAngleDeg: num(get(col.offset)),
                perpendicularDistanceM: num(get(col.perpendicular)),
                flagged: reasons.length > 0,
                flagNote: reasons.join('; ') || null,
              },
            });
          }
          sheetReport.sightings++;
          sheetReport.individuals += individuals;
          if (reasons.length) sheetReport.flagged.push({ group: groupCode, reason: reasons.join('; ') });
        }
        report.sheets.push(sheetReport);
      }
      if (opts.dryRun) throw new DryRunRollback();
    },
    { timeout: 120_000 }
  ).catch((err) => {
    if (!(err instanceof DryRunRollback)) throw err;
  });

  return report;
}
