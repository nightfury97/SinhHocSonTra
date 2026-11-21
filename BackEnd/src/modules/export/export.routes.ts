import { Router } from 'express';
import ExcelJS from 'exceljs';
import { prisma } from '../../lib/prisma';
import { asyncHandler } from '../../middleware/asyncHandler';
import { authenticate, authorize } from '../../middleware/auth';

const router = Router();

// Dữ liệu xuất ra gồm toạ độ chính xác và bản ghi chưa duyệt → chỉ ADMIN/RANGER.
router.use(authenticate, authorize('ADMIN', 'RANGER'));

const GROUP = { MAMMAL: 'Thú', BIRD: 'Chim', REPTILE: 'Bò sát', AMPHIBIAN: 'Lưỡng cư', PLANT: 'Thực vật' } as const;
const IUCN = {
  CR: 'Cực kỳ nguy cấp', EN: 'Nguy cấp', VU: 'Sắp nguy cấp', NT: 'Sắp bị đe doạ', LC: 'Ít quan ngại', DD: 'Thiếu dữ liệu',
  NE: 'Chưa đánh giá', EW: 'Tuyệt chủng ngoài tự nhiên', EX: 'Tuyệt chủng', HERITAGE: 'Cây di sản',
} as const;
const BASIS = { HUMAN_OBSERVATION: 'Quan sát trực tiếp', PRESERVED_SPECIMEN: 'Mẫu vật lưu giữ', MACHINE_OBSERVATION: 'Thiết bị ghi nhận', OTHER: 'Khác' } as const;
const OBS_STATUS = { PENDING: 'Chờ duyệt', APPROVED: 'Đã duyệt', REJECTED: 'Bị từ chối' } as const;
const HABITAT = { PLANTATION: 'Rừng trồng', RICH: 'Rừng giàu', POOR: 'Rừng nghèo' } as const;
const label = <T extends Record<string, string>>(map: T, key: string | null | undefined) => (key ? (map[key] ?? key) : '');

const stamp = () => new Date().toISOString().slice(0, 10);

function addSheet(wb: ExcelJS.Workbook, name: string, columns: { header: string; key: string; width: number; numFmt?: string }[], rows: Record<string, unknown>[]) {
  const ws = wb.addWorksheet(name, { views: [{ state: 'frozen', ySplit: 1 }] });
  ws.columns = columns.map(({ header, key, width }) => ({ header, key, width }));
  ws.addRows(rows);
  const head = ws.getRow(1);
  head.font = { bold: true };
  head.alignment = { vertical: 'middle', wrapText: true };
  head.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE6F2EA' } };
  head.height = 30;
  columns.forEach((c, i) => c.numFmt && (ws.getColumn(i + 1).numFmt = c.numFmt));
  ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: columns.length } };
  return ws;
}

/** Bộ CSDL tổng hợp dạng Excel: loài, quan sát, điểm khảo sát tuyến, tổng hợp theo năm. */
router.get(
  '/database.xlsx',
  asyncHandler(async (req, res) => {
    const [species, observations, sightings, surveys] = await Promise.all([
      prisma.species.findMany({ orderBy: [{ group: 'asc' }, { scientificName: 'asc' }], include: { _count: { select: { observations: true, images: true } } } }),
      prisma.observation.findMany({
        orderBy: [{ observedAt: 'desc' }, { createdAt: 'desc' }],
        include: { species: { select: { name: true, scientificName: true, group: true } }, observer: { select: { name: true } }, dataset: { select: { name: true } } },
      }),
      prisma.transectSighting.findMany({ include: { survey: { select: { year: true, repeatDays: true, transect: { select: { code: true, lengthKm: true } } } } } }),
      prisma.transectSurvey.findMany({ include: { transect: true, sightings: { select: { individuals: true, flagged: true } } } }),
    ]);

    const wb = new ExcelJS.Workbook();
    wb.creator = 'Quản lý đa dạng sinh học Sơn Trà';
    wb.created = new Date();

    addSheet(
      wb,
      'Thông tin',
      [
        { header: 'Mục', key: 'k', width: 30 },
        { header: 'Giá trị', key: 'v', width: 90 },
      ],
      [
        { k: 'Tên bộ dữ liệu', v: 'Cơ sở dữ liệu số hóa đa dạng sinh học Sơn Trà' },
        { k: 'Ngày xuất', v: stamp() },
        { k: 'Số loài', v: species.length },
        { k: 'Số bản ghi quan sát', v: observations.length },
        { k: 'Số điểm khảo sát tuyến', v: sightings.length },
        { k: 'Hệ toạ độ', v: 'WGS84 (vĩ độ, kinh độ thập phân); toạ độ gốc khảo sát tuyến ở UTM múi 49N' },
        { k: 'Chuẩn dữ liệu', v: 'Phân loại học và Darwin Core (xem thêm file CSV Darwin Core)' },
        { k: 'Lưu ý', v: 'Số liệu khảo sát tuyến là số đếm trực tiếp, không phải ước lượng quần thể. Điểm bị gắn cờ cần đối chiếu sổ thực địa.' },
        { k: 'Bảo mật', v: 'File chứa toạ độ chính xác của các loài, kể cả loài nguy cấp. Không công bố công khai.' },
      ]
    );

    addSheet(
      wb,
      'Loài',
      [
        { header: 'STT', key: 'stt', width: 6 },
        { header: 'Tên Việt', key: 'name', width: 30 },
        { header: 'Tên khoa học', key: 'sci', width: 34 },
        { header: 'Tác giả định danh', key: 'author', width: 30 },
        { header: 'Lớp', key: 'class', width: 14 },
        { header: 'Bộ', key: 'order', width: 18 },
        { header: 'Họ', key: 'family', width: 18 },
        { header: 'Chi', key: 'genus', width: 18 },
        { header: 'Nhóm', key: 'group', width: 12 },
        { header: 'Hạng IUCN', key: 'iucn', width: 10 },
        { header: 'Hiện trạng bảo tồn', key: 'iucnLabel', width: 24 },
        { header: 'Số bản ghi', key: 'obs', width: 10 },
        { header: 'Số ảnh', key: 'img', width: 8 },
        { header: 'Quy mô quần thể', key: 'pop', width: 18 },
        { header: 'Sinh cảnh', key: 'habitat', width: 40 },
        { header: 'Mối đe doạ', key: 'threats', width: 40 },
        { header: 'Mô tả', key: 'desc', width: 60 },
      ],
      species.map((s, i) => ({
        stt: i + 1,
        name: s.name === s.scientificName ? '' : s.name,
        sci: s.scientificName,
        author: s.authorship ?? '',
        class: s.taxonClass ?? '',
        order: s.taxonOrder ?? '',
        family: s.family ?? '',
        genus: s.genus ?? '',
        group: label(GROUP, s.group),
        iucn: s.status === 'HERITAGE' ? '' : s.status,
        iucnLabel: label(IUCN, s.status),
        obs: s._count.observations,
        img: s._count.images,
        pop: s.populationLabel ?? '',
        habitat: s.habitat ?? '',
        threats: Array.isArray(s.threats) ? (s.threats as string[]).join('; ') : '',
        desc: s.description ?? '',
      }))
    );

    addSheet(
      wb,
      'Quan sát',
      [
        { header: 'Ngày', key: 'date', width: 12, numFmt: 'dd/mm/yyyy' },
        { header: 'Tên Việt', key: 'name', width: 28 },
        { header: 'Tên khoa học', key: 'sci', width: 32 },
        { header: 'Nhóm', key: 'group', width: 10 },
        { header: 'Địa điểm', key: 'place', width: 36 },
        { header: 'Vĩ độ', key: 'lat', width: 11, numFmt: '0.00000' },
        { header: 'Kinh độ', key: 'lng', width: 11, numFmt: '0.00000' },
        { header: 'Số lượng', key: 'count', width: 9 },
        { header: 'Loại bản ghi', key: 'basis', width: 18 },
        { header: 'Người định danh / ghi nhận', key: 'who', width: 28 },
        { header: 'Trạng thái', key: 'status', width: 12 },
        { header: 'Bộ dữ liệu', key: 'dataset', width: 34 },
        { header: 'Ghi chú', key: 'note', width: 40 },
      ],
      observations.map((o) => ({
        date: o.observedAt,
        name: o.species.name === o.species.scientificName ? '' : o.species.name,
        sci: o.species.scientificName,
        group: label(GROUP, o.species.group),
        place: o.place,
        lat: o.lat,
        lng: o.lng,
        count: o.count,
        basis: label(BASIS, o.basisOfRecord),
        who: o.observer?.name ?? o.identifiedBy ?? '',
        status: label(OBS_STATUS, o.status),
        dataset: o.dataset?.name ?? '',
        note: o.note ?? '',
      }))
    );

    const byCode = (a: string, b: string) => a.localeCompare(b, undefined, { numeric: true });
    sightings.sort((a, b) => a.survey.year - b.survey.year || byCode(a.survey.transect.code, b.survey.transect.code) || byCode(a.groupCode, b.groupCode));
    addSheet(
      wb,
      'Khảo sát tuyến',
      [
        { header: 'Năm', key: 'year', width: 7 },
        { header: 'Tuyến', key: 'transect', width: 8 },
        { header: 'Dài tuyến (km)', key: 'len', width: 12 },
        { header: 'Mã đàn', key: 'group', width: 10 },
        { header: 'Số cá thể', key: 'n', width: 10 },
        { header: 'UTM X (49N)', key: 'x', width: 12 },
        { header: 'UTM Y (49N)', key: 'y', width: 12 },
        { header: 'Vĩ độ', key: 'lat', width: 11, numFmt: '0.00000' },
        { header: 'Kinh độ', key: 'lng', width: 11, numFmt: '0.00000' },
        { header: 'Độ cao (m)', key: 'alt', width: 10 },
        { header: 'Khoảng cách tới đàn (m)', key: 'dist', width: 14 },
        { header: 'Góc phương vị (°)', key: 'bearing', width: 12 },
        { header: 'Khoảng cách vuông góc (m)', key: 'perp', width: 16 },
        { header: 'Sinh cảnh', key: 'habitat', width: 12 },
        { header: 'Gắn cờ', key: 'flag', width: 8 },
        { header: 'Ghi chú', key: 'note', width: 50 },
      ],
      sightings.map((s) => ({
        year: s.survey.year,
        transect: s.survey.transect.code,
        len: s.survey.transect.lengthKm,
        group: s.groupCode,
        n: s.individuals,
        x: s.utmX,
        y: s.utmY,
        lat: s.lat,
        lng: s.lng,
        alt: s.altitudeM,
        dist: s.distanceM,
        bearing: s.bearingDeg,
        perp: s.perpendicularDistanceM,
        habitat: label(HABITAT, s.habitat),
        flag: s.flagged ? 'Có' : '',
        note: s.flagNote ?? '',
      }))
    );

    const byYear = new Map<number, { year: number; transects: number; effort: number; groups: number; individuals: number; flagged: number }>();
    for (const s of surveys) {
      const y = byYear.get(s.year) ?? { year: s.year, transects: 0, effort: 0, groups: 0, individuals: 0, flagged: 0 };
      y.transects += 1;
      y.effort += s.transect.lengthKm * s.repeatDays;
      y.groups += s.sightings.length;
      y.individuals += s.sightings.reduce((n, g) => n + g.individuals, 0);
      y.flagged += s.sightings.filter((g) => g.flagged).length;
      byYear.set(s.year, y);
    }
    const r = (n: number, d = 3) => Math.round(n * 10 ** d) / 10 ** d;
    addSheet(
      wb,
      'Tổng hợp khảo sát',
      [
        { header: 'Năm', key: 'year', width: 8 },
        { header: 'Số tuyến', key: 'transects', width: 10 },
        { header: 'Quãng đường (km × ngày lặp)', key: 'effort', width: 18 },
        { header: 'Số đàn', key: 'groups', width: 9 },
        { header: 'Số cá thể đếm được', key: 'individuals', width: 14 },
        { header: 'Tỉ lệ gặp (đàn/km)', key: 'rate', width: 14 },
        { header: 'Cỡ đàn trung bình', key: 'mean', width: 14 },
        { header: 'Điểm gắn cờ', key: 'flagged', width: 10 },
      ],
      [...byYear.values()]
        .sort((a, b) => a.year - b.year)
        .map((y) => ({
          year: y.year,
          transects: y.transects,
          effort: r(y.effort, 2),
          groups: y.groups,
          individuals: y.individuals,
          rate: y.effort ? r(y.groups / y.effort) : null,
          mean: y.groups ? r(y.individuals / y.groups, 2) : null,
          flagged: y.flagged,
        }))
    );

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="csdl-da-dang-sinh-hoc-son-tra-${stamp()}.xlsx"`);
    await wb.xlsx.write(res);
    res.end();
  })
);

const csvCell = (v: unknown) => {
  const s = v === null || v === undefined ? '' : String(v);
  // Chống "CSV injection" khi mở bằng Excel: ô bắt đầu bằng = + - @ bị Excel hiểu là công thức.
  const safe = /^[=+\-@\t\r]/.test(s) && !/^-?\d+(\.\d+)?$/.test(s) ? `'${s}` : s;
  return /[",\r\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
};

const DWC_BASIS = { HUMAN_OBSERVATION: 'HumanObservation', PRESERVED_SPECIMEN: 'PreservedSpecimen', MACHINE_OBSERVATION: 'MachineObservation', OTHER: 'Occurrence' } as const;

/** Các bản ghi đã duyệt theo chuẩn Darwin Core (cùng cột với file nhập vào), dùng để chia sẻ/nộp GBIF. */
router.get(
  '/occurrences.csv',
  asyncHandler(async (req, res) => {
    const rows = await prisma.observation.findMany({
      where: { status: 'APPROVED', lat: { not: null }, lng: { not: null } },
      orderBy: [{ observedAt: 'asc' }, { createdAt: 'asc' }],
      include: { species: true, dataset: { select: { name: true, publisher: true } }, observer: { select: { name: true } } },
    });
    const cols = [
      'occurrenceID', 'basisOfRecord', 'eventDate', 'year', 'month', 'day', 'scientificName', 'kingdom', 'class', 'order', 'family', 'genus',
      'specificEpithet', 'taxonRank', 'scientificNameAuthorship', 'identifiedBy', 'decimalLatitude', 'decimalLongitude', 'geodeticDatum', 'country',
      'countryCode', 'stateProvince', 'locality', 'individualCount', 'preparations', 'datasetName', 'institutionCode',
    ];
    const lines = [cols.join(',')];
    for (const o of rows) {
      const d = o.observedAt;
      const [, epithet = ''] = o.species.scientificName.split(/\s+/);
      lines.push(
        [
          o.externalId ?? o.id,
          DWC_BASIS[o.basisOfRecord],
          d.toISOString().slice(0, 10),
          d.getUTCFullYear(),
          d.getUTCMonth() + 1,
          d.getUTCDate(),
          o.species.scientificName,
          o.species.group === 'PLANT' ? 'Plantae' : 'Animalia',
          o.species.taxonClass,
          o.species.taxonOrder,
          o.species.family,
          o.species.genus ?? o.species.scientificName.split(/\s+/)[0],
          epithet,
          'species',
          o.species.authorship,
          o.identifiedBy ?? o.observer?.name,
          o.lat,
          o.lng,
          'WGS84',
          'Vietnam',
          'VN',
          'Da Nang',
          o.place,
          o.count,
          o.preparations,
          o.dataset?.name,
          o.dataset?.publisher,
        ]
          .map(csvCell)
          .join(',')
      );
    }
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="darwin-core-occurrences-${stamp()}.csv"`);
    res.send('﻿' + lines.join('\r\n') + '\r\n');
  })
);

export default router;
