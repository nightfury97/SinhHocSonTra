import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const SPECIES = [
  {
    slug: 'vooc', tag: 'Vc', name: 'Voọc chà vá chân nâu', scientificName: 'Pygathrix nemaeus',
    group: 'MAMMAL', status: 'EN', statusLabel: 'Nguy cấp (EN)', populationLabel: '~1.350 cá thể', featured: true,
    description: 'Linh trưởng đặc hữu Đông Dương, bộ lông nhiều màu rực rỡ với "tất" đỏ nâu đặc trưng ở cẳng chân. Sơn Trà là một trong những quần thể lớn và dễ quan sát nhất Việt Nam.',
    habitat: 'Rừng thường xanh trên núi thấp, tán rừng kín, độ cao 200–600 m.',
    threats: ['Mất sinh cảnh', 'Đường giao thông', 'Săn bắt trái phép', 'Du lịch quá tải'],
  },
  {
    slug: 'khi', tag: 'Kv', name: 'Khỉ vàng', scientificName: 'Macaca mulatta',
    group: 'MAMMAL', status: 'LC', statusLabel: 'Ít lo ngại (LC)', populationLabel: '~420 cá thể', featured: false,
    description: 'Loài khỉ phổ biến, thích nghi tốt, thường xuất hiện gần khu du lịch và đường Hoàng Sa.',
    habitat: 'Rừng thứ sinh, ven rừng, khu vực gần con người.',
    threats: ['Cho ăn không kiểm soát', 'Xung đột người–động vật'],
  },
  {
    slug: 'dieu', tag: 'Dh', name: 'Diều hoa Miến Điện', scientificName: 'Spilornis cheela',
    group: 'BIRD', status: 'NT', statusLabel: 'Sắp bị đe dọa (NT)', populationLabel: '12 điểm ghi nhận', featured: false,
    description: 'Chim ăn thịt cỡ trung, chuyên săn rắn và bò sát, thường lượn trên tán rừng ven biển Sơn Trà.',
    habitat: 'Rừng thường xanh, vách núi ven biển.',
    threats: ['Suy giảm con mồi', 'Nhiễu loạn tổ'],
  },
  {
    slug: 'tran', tag: 'Tg', name: 'Trăn gấm', scientificName: 'Malayopython reticulatus',
    group: 'REPTILE', status: 'LC', statusLabel: 'Ít lo ngại (LC)', populationLabel: '8 điểm ghi nhận', featured: false,
    description: 'Một trong những loài trăn dài nhất thế giới, hoa văn dạng lưới. Sống gần suối và khu rừng ẩm.',
    habitat: 'Rừng ẩm gần suối, hang đá.',
    threats: ['Buôn bán da', 'Săn bắt'],
  },
  {
    slug: 'ga', tag: 'Gr', name: 'Gà rừng', scientificName: 'Gallus gallus',
    group: 'BIRD', status: 'LC', statusLabel: 'Ít lo ngại (LC)', populationLabel: '26 điểm ghi nhận', featured: false,
    description: 'Tổ tiên hoang dã của gà nhà, sống theo đàn nhỏ dưới tán rừng, tiếng gáy vang buổi sáng.',
    habitat: 'Rừng thứ sinh, trảng cây bụi.',
    threats: ['Bẫy', 'Săn bắt'],
  },
  {
    slug: 'cay', tag: 'Cv', name: 'Cầy vòi hương', scientificName: 'Paradoxurus hermaphroditus',
    group: 'MAMMAL', status: 'LC', statusLabel: 'Ít lo ngại (LC)', populationLabel: '15 điểm ghi nhận', featured: false,
    description: 'Thú ăn đêm, ăn tạp, đóng vai trò phát tán hạt cây rừng. Hiếm khi bắt gặp ban ngày.',
    habitat: 'Rừng thường xanh, ven khu dân cư.',
    threats: ['Bẫy', 'Buôn bán'],
  },
  {
    slug: 'da', tag: 'Đa', name: 'Cây đa Sơn Trà', scientificName: 'Ficus sp.',
    group: 'PLANT', status: 'HERITAGE', statusLabel: 'Cây di sản', populationLabel: 'Cây nghìn năm', featured: false,
    description: 'Cây đa cổ thụ hơn ngàn năm tuổi với hệ rễ phụ khổng lồ — biểu tượng và điểm đến nổi tiếng của bán đảo.',
    habitat: 'Sườn núi ven đường Bãi Bắc.',
    threats: ['Nén đất do du khách', 'Tổn thương rễ'],
  },
  {
    slug: 'cho', tag: 'Cc', name: 'Chò chai', scientificName: 'Hopea recopei',
    group: 'PLANT', status: 'VU', statusLabel: 'Sắp nguy cấp (VU)', populationLabel: 'Rải rác', featured: false,
    description: 'Cây gỗ lớn thuộc họ Dầu, tạo tầng tán chính của rừng thường xanh Sơn Trà.',
    habitat: 'Rừng thường xanh núi thấp.',
    threats: ['Khai thác gỗ', 'Tái sinh kém'],
  },
] as const;

const POPULATION_TREND = [
  { year: 2019, value: 1050 },
  { year: 2020, value: 1120 },
  { year: 2021, value: 1180 },
  { year: 2022, value: 1240 },
  { year: 2023, value: 1300 },
  { year: 2024, value: 1350 },
];

const ZONES = [
  'Phân khu bảo vệ nghiêm ngặt',
  'Vách núi ven biển',
  'Ven rừng',
  'Rừng ẩm gần suối',
  'Điểm di sản',
];

const STATIONS = [
  { name: 'Trạm Bãi Bắc · Nước', type: 'WATER', rating: 'Tốt · 92', score: 92, metric: 'pH 7,2 · DO 6,8 mg/L', level: 'GOOD' },
  { name: 'Trạm Suối Đá · Không khí', type: 'AIR', rating: 'Tốt · 88', score: 88, metric: 'AQI 41 · PM2.5 9 µg/m³', level: 'GOOD_2' },
  { name: 'Đỉnh Bàn Cờ · Đất', type: 'SOIL', rating: 'Khá · 74', score: 74, metric: 'Độ ẩm 62% · pH 5,8', level: 'FAIR' },
] as const;

async function main() {
  const passwordHash = await bcrypt.hash('password123', 10);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@sontra.vn' },
    update: {},
    create: { email: 'admin@sontra.vn', name: 'Quản trị viên', role: 'ADMIN', passwordHash },
  });

  const ranger = await prisma.user.upsert({
    where: { email: 'ranger@sontra.vn' },
    update: {},
    create: { email: 'ranger@sontra.vn', name: 'Nguyễn V.A', role: 'RANGER', passwordHash },
  });

  const speciesBySlug = new Map<string, { id: string }>();
  for (const s of SPECIES) {
    const created = await prisma.species.upsert({
      where: { slug: s.slug },
      update: {},
      create: { ...s, threats: [...s.threats] },
    });
    speciesBySlug.set(s.slug, created);
  }

  const vooc = speciesBySlug.get('vooc')!;
  for (const record of POPULATION_TREND) {
    await prisma.populationRecord.upsert({
      where: { speciesId_year: { speciesId: vooc.id, year: record.year } },
      update: { value: record.value },
      create: { speciesId: vooc.id, year: record.year, value: record.value },
    });
  }

  const zoneByName = new Map<string, { id: string }>();
  for (const name of ZONES) {
    const zone = await prisma.zone.upsert({ where: { name }, update: {}, create: { name } });
    zoneByName.set(name, zone);
  }

  const stationByName = new Map<string, { id: string }>();
  for (const station of STATIONS) {
    const existing = await prisma.monitoringStation.findFirst({ where: { name: station.name } });
    const created = existing
      ? await prisma.monitoringStation.update({ where: { id: existing.id }, data: station })
      : await prisma.monitoringStation.create({ data: station });
    stationByName.set(station.name, created);
  }

  const dieu = speciesBySlug.get('dieu')!;
  const khi = speciesBySlug.get('khi')!;
  const tran = speciesBySlug.get('tran')!;

  const obsSeed = [
    { species: vooc, observer: ranger, place: 'Tiểu khu 63', count: 4, status: 'APPROVED' as const },
    { species: khi, observer: ranger, place: 'Đường Hoàng Sa', count: 15, status: 'PENDING' as const },
    { species: dieu, observer: admin, place: 'Bãi Bắc', count: 2, status: 'APPROVED' as const },
    { species: tran, observer: admin, place: 'Suối Ôm', count: 1, status: 'APPROVED' as const },
  ];

  for (const o of obsSeed) {
    await prisma.observation.create({
      data: {
        speciesId: o.species.id,
        observerId: o.observer.id,
        place: o.place,
        count: o.count,
        status: o.status,
        reviewedById: o.status !== 'PENDING' ? admin.id : null,
        reviewedAt: o.status !== 'PENDING' ? new Date() : null,
      },
    });
  }

  const pins = [
    { name: 'Đàn voọc Tiểu khu 63', zone: 'Phân khu bảo vệ nghiêm ngặt', speciesId: vooc.id, countLabel: '~24', lat: 16.117, lng: 108.28, color: 'var(--color-accent)' },
    { name: 'Diều hoa · Bãi Bắc', zone: 'Vách núi ven biển', speciesId: dieu.id, countLabel: '2', lat: 16.14, lng: 108.31, color: 'var(--swatch-bird-fg)' },
    { name: 'Khỉ vàng · đường Hoàng Sa', zone: 'Ven rừng', speciesId: khi.id, countLabel: '~15', lat: 16.11, lng: 108.27, color: 'var(--swatch-mammal-fg)' },
    { name: 'Trăn gấm · Suối Ôm', zone: 'Rừng ẩm gần suối', speciesId: tran.id, countLabel: '1', lat: 16.115, lng: 108.29, color: 'var(--swatch-reptile-fg)' },
    { name: 'Cây đa nghìn năm', zone: 'Điểm di sản', speciesId: speciesBySlug.get('da')!.id, countLabel: '1', lat: 16.13, lng: 108.3, color: 'var(--swatch-plant-fg)' },
  ];

  for (const pin of pins) {
    const zone = zoneByName.get(pin.zone);
    const exists = await prisma.mapPin.findFirst({ where: { name: pin.name } });
    if (!exists) {
      await prisma.mapPin.create({
        data: {
          name: pin.name,
          zoneId: zone?.id,
          speciesId: pin.speciesId,
          countLabel: pin.countLabel,
          lat: pin.lat,
          lng: pin.lng,
          color: pin.color,
        },
      });
    }
  }

  const suoiDaStation = stationByName.get('Trạm Suối Đá · Không khí');
  const stationPinExists = await prisma.mapPin.findFirst({ where: { name: 'Trạm Suối Đá' } });
  if (suoiDaStation && !stationPinExists) {
    await prisma.mapPin.create({
      data: {
        name: 'Trạm Suối Đá',
        stationId: suoiDaStation.id,
        lat: 16.125,
        lng: 108.295,
        color: 'var(--color-accent-2)',
      },
    });
  }

  console.log('Seed complete.');
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
