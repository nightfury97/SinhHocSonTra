import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { CONSERVATION_STATUSES, TAXON_GROUPS } from '../../utils/enums';

/**
 * Công cụ tra cứu cho chatbot. Chỉ ĐỌC và chỉ trả thông tin loài, phân loại, hạng IUCN, thống kê
 * và tổng hợp khảo sát. Cố ý KHÔNG có toạ độ hay vị trí quan sát: vị trí loài nguy cấp là dữ liệu nhạy cảm
 * và chatbot dùng được cho khách chưa đăng nhập.
 */

const GROUP_VI: Record<string, string> = { MAMMAL: 'Thú', BIRD: 'Chim', REPTILE: 'Bò sát', AMPHIBIAN: 'Lưỡng cư', PLANT: 'Thực vật' };
const STATUS_VI: Record<string, string> = {
  LC: 'Ít quan tâm (LC)', NT: 'Sắp bị đe doạ (NT)', VU: 'Sắp nguy cấp (VU)', EN: 'Nguy cấp (EN)', CR: 'Cực kỳ nguy cấp (CR)',
  EW: 'Tuyệt chủng ngoài tự nhiên (EW)', EX: 'Tuyệt chủng (EX)', DD: 'Thiếu dữ liệu (DD)', NE: 'Chưa đánh giá (NE)', HERITAGE: 'Cây di sản',
};

export const TOOL_DEFS = [
  {
    type: 'function',
    function: {
      name: 'search_species',
      description: 'Tìm loài trong cơ sở dữ liệu theo tên (tiếng Việt hoặc khoa học) và/hoặc bộ lọc. Trả về tối đa 15 loài.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Một phần tên Việt hoặc tên khoa học. Có thể bỏ trống nếu chỉ lọc.' },
          group: { type: 'string', enum: [...TAXON_GROUPS], description: 'MAMMAL thú, BIRD chim, REPTILE bò sát, AMPHIBIAN lưỡng cư, PLANT thực vật' },
          status: { type: 'string', enum: [...CONSERVATION_STATUSES], description: 'Hạng bảo tồn IUCN (CR, EN, VU, NT, LC, DD, NE) hoặc HERITAGE' },
          threatened: { type: 'boolean', description: 'true = chỉ loài bị đe doạ (CR, EN, VU). Dùng cho "loài bị đe doạ", "loài nguy cấp".' },
          family: { type: 'string', description: 'Tên họ, ví dụ Cercopithecidae' },
          taxon_class: { type: 'string', description: 'Tên lớp, ví dụ Aves, Mammalia, Reptilia' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_species',
      description: 'Lấy thông tin chi tiết một loài: phân loại đầy đủ, hạng IUCN, mô tả, sinh cảnh, mối đe doạ, số bản ghi quan sát đã duyệt.',
      parameters: { type: 'object', properties: { name: { type: 'string', description: 'Tên Việt hoặc tên khoa học của loài' } }, required: ['name'] },
    },
  },
  {
    type: 'function',
    function: {
      name: 'count_species',
      description: 'Thống kê số loài theo nhóm. Dùng cho câu hỏi "có bao nhiêu loài ...".',
      parameters: {
        type: 'object',
        properties: {
          by: { type: 'string', enum: ['group', 'status', 'family', 'class'], description: 'Tiêu chí gom nhóm' },
          group: { type: 'string', enum: [...TAXON_GROUPS], description: 'Chỉ đếm trong nhóm này (tuỳ chọn)' },
          status: { type: 'string', enum: [...CONSERVATION_STATUSES], description: 'Chỉ đếm loài có hạng này (tuỳ chọn)' },
          threatened: { type: 'boolean', description: 'true = chỉ đếm loài bị đe doạ (CR, EN, VU)' },
        },
        required: ['by'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'survey_summary',
      description:
        'Kết quả khảo sát tuyến quần thể voọc chà vá chân nâu theo năm: số tuyến, quãng đường, số đàn, số cá thể đếm được, tỉ lệ gặp, cỡ đàn trung bình. Đây là số đếm trực tiếp, không phải ước lượng quần thể.',
      parameters: { type: 'object', properties: {} },
    },
  },
] as const;

const str = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : undefined);

class ToolInputError extends Error {}

/** Giá trị enum hợp lệ (không phân biệt hoa thường); sai thì báo lỗi để model tự sửa và thử lại. */
function parseEnum<T extends string>(v: unknown, allowed: readonly T[], field: string): T | undefined {
  if (v === undefined || v === null || v === '') return undefined;
  const up = String(v).trim().toUpperCase();
  if ((allowed as readonly string[]).includes(up)) return up as T;
  throw new ToolInputError(`Tham số ${field}="${v}" không hợp lệ. Giá trị hợp lệ: ${allowed.join(', ')}. Nếu người dùng không nêu rõ thì bỏ tham số này.`);
}

/** status chấp nhận một hạng hoặc danh sách ("CR, EN"). */
function parseStatuses(v: unknown): Prisma.SpeciesWhereInput['status'] {
  if (v === undefined || v === null || v === '') return undefined;
  const list = String(v).split(/[\s,;/]+/).filter(Boolean).map((x) => parseEnum(x, CONSERVATION_STATUSES, 'status')!);
  return list.length === 1 ? list[0] : { in: list };
}

const isTrue = (v: unknown) => v === true || String(v).toLowerCase() === 'true';

const brief = (s: { name: string; scientificName: string; group: string; status: string; family: string | null }) => ({
  ten_viet: s.name,
  ten_khoa_hoc: s.scientificName,
  nhom: GROUP_VI[s.group] ?? s.group,
  ho: s.family ?? 'chưa rõ',
  hang_iucn: STATUS_VI[s.status] ?? s.status,
});

function speciesWhere(args: Record<string, unknown>): { where: Prisma.SpeciesWhereInput; applied: Record<string, unknown> } {
  const q = str(args.query);
  const group = parseEnum(args.group, TAXON_GROUPS, 'group');
  // Model nhỏ hay gửi status="true"/"threatened" thay vì threatened=true: hiểu cả hai cách.
  const threatened = isTrue(args.threatened) || isTrue(args.status) || /threat|đe doạ|de doa|nguy cấp/i.test(String(args.status ?? ''));
  const status = threatened ? ({ in: ['CR', 'EN', 'VU'] } as { in: ('CR' | 'EN' | 'VU')[] }) : parseStatuses(args.status);
  const family = str(args.family);
  const taxonClass = str(args.taxon_class);
  return {
    where: { group, status, family, taxonClass, OR: q ? [{ name: { contains: q } }, { scientificName: { contains: q } }] : undefined },
    applied: {
      ...(q && { tu_khoa: q }),
      ...(group && { nhom: GROUP_VI[group] }),
      ...(status && { hang_iucn: threatened ? 'bị đe doạ (CR, EN, VU)' : JSON.stringify(status) }),
      ...(family && { ho: family }),
      ...(taxonClass && { lop: taxonClass }),
    },
  };
}

async function dispatch(name: string, args: Record<string, unknown>): Promise<unknown> {
  switch (name) {
    case 'search_species': {
      const { where, applied } = speciesWhere(args);
      const [total, rows] = await Promise.all([
        prisma.species.count({ where }),
        prisma.species.findMany({ where, orderBy: { name: 'asc' }, take: 15 }),
      ]);
      return { bo_loc_da_ap_dung: Object.keys(applied).length ? applied : 'KHÔNG CÓ (toàn bộ danh mục)', tong_so_loai_khop: total, hien_thi: rows.length, loai: rows.map(brief) };
    }

    case 'get_species': {
      const q = str(args.name);
      if (!q) return { loi: 'Thiếu tên loài' };
      const s =
        (await prisma.species.findFirst({ where: { OR: [{ scientificName: q }, { name: q }] } })) ??
        (await prisma.species.findFirst({ where: { OR: [{ name: { contains: q } }, { scientificName: { contains: q } }] }, orderBy: { name: 'asc' } }));
      if (!s) return { loi: `Không tìm thấy loài "${q}" trong cơ sở dữ liệu` };
      const [approved, images] = await Promise.all([
        prisma.observation.count({ where: { speciesId: s.id, status: 'APPROVED' } }),
        prisma.speciesImage.count({ where: { speciesId: s.id } }),
      ]);
      return {
        ...brief(s),
        tac_gia_dinh_danh: s.authorship,
        lop: s.taxonClass,
        bo: s.taxonOrder,
        chi: s.genus,
        mo_ta: s.description,
        sinh_canh: s.habitat,
        moi_de_doa: s.threats,
        so_ban_ghi_quan_sat_da_duyet: approved,
        so_anh: images,
        duong_dan: `/loai?id=${s.id}`,
        ghi_chu: 'Vị trí quan sát cụ thể không được cung cấp qua chatbot.',
      };
    }

    case 'count_species': {
      const by = str(args.by);
      const field = by === 'status' ? 'status' : by === 'family' ? 'family' : by === 'class' ? 'taxonClass' : 'group';
      const { where, applied } = speciesWhere({ group: args.group, status: args.status, threatened: args.threatened });
      const rows = await prisma.species.groupBy({ by: [field], where, _count: { _all: true } });
      const label = (v: unknown) => (v == null ? 'Chưa phân loại' : field === 'group' ? GROUP_VI[String(v)] ?? String(v) : field === 'status' ? STATUS_VI[String(v)] ?? String(v) : String(v));
      const items = rows
        .map((r) => ({ gia_tri: label((r as Record<string, unknown>)[field]), so_loai: r._count._all }))
        .sort((a, b) => b.so_loai - a.so_loai)
        .slice(0, 30);
      return { bo_loc_da_ap_dung: Object.keys(applied).length ? applied : 'KHÔNG CÓ', gom_theo: by ?? 'group', tong_so_loai: items.reduce((n, i) => n + i.so_loai, 0), ket_qua: items };
    }

    case 'survey_summary': {
      const surveys = await prisma.transectSurvey.findMany({ include: { transect: true, sightings: { select: { individuals: true } } } });
      const byYear = new Map<number, { nam: number; so_tuyen: number; km: number; dan: number; ca_the: number }>();
      for (const s of surveys) {
        const y = byYear.get(s.year) ?? { nam: s.year, so_tuyen: 0, km: 0, dan: 0, ca_the: 0 };
        y.so_tuyen += 1;
        y.km += s.transect.lengthKm * s.repeatDays;
        y.dan += s.sightings.length;
        y.ca_the += s.sightings.reduce((n, g) => n + g.individuals, 0);
        byYear.set(s.year, y);
      }
      const r = (n: number, d = 2) => Math.round(n * 10 ** d) / 10 ** d;
      const years = [...byYear.values()].sort((a, b) => a.nam - b.nam);
      const dir = (a: number, b: number) => (b > a ? 'TĂNG' : b < a ? 'GIẢM' : 'KHÔNG ĐỔI');
      let so_sanh: unknown = null;
      if (years.length >= 2) {
        const a = years[years.length - 2];
        const b = years[years.length - 1];
        const rate = (y: typeof a) => (y.km ? y.dan / y.km : 0);
        const size = (y: typeof a) => (y.dan ? y.ca_the / y.dan : 0);
        so_sanh = {
          tu_nam: a.nam,
          den_nam: b.nam,
          so_dan: `${dir(a.dan, b.dan)} (${a.dan} -> ${b.dan})`,
          so_ca_the_dem_duoc: `${dir(a.ca_the, b.ca_the)} (${a.ca_the} -> ${b.ca_the})`,
          ti_le_gap_dan_tren_km: `${dir(rate(a), rate(b))} (${r(rate(a), 3)} -> ${r(rate(b), 3)})`,
          co_dan_trung_binh: `${dir(size(a), size(b))} (${r(size(a), 1)} -> ${r(size(b), 1)})`,
        };
      }
      return {
        so_sanh_hai_nam_gan_nhat: so_sanh,
        luu_y: 'Số đếm trực tiếp trên tuyến (mỗi tuyến đi lặp nhiều ngày), KHÔNG phải ước lượng quần thể.',
        theo_nam: [...byYear.values()]
          .sort((a, b) => a.nam - b.nam)
          .map((y) => ({
            nam: y.nam,
            so_tuyen: y.so_tuyen,
            quang_duong_km: r(y.km),
            so_dan: y.dan,
            so_ca_the_dem_duoc: y.ca_the,
            ti_le_gap_dan_tren_km: y.km ? r(y.dan / y.km, 3) : null,
            co_dan_trung_binh: y.dan ? r(y.ca_the / y.dan, 1) : null,
          })),
      };
    }

    default:
      return { loi: `Công cụ không tồn tại: ${name}` };
  }
}

export async function runTool(name: string, args: Record<string, unknown>): Promise<unknown> {
  try {
    return await dispatch(name, args);
  } catch (err) {
    if (err instanceof ToolInputError) return { loi: err.message };
    throw err;
  }
}
