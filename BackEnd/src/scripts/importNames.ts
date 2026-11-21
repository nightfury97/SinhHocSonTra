/**
 * Điền tên tiếng Việt cho các loài từ file CSV (cột scientificName, name).
 *
 *   node dist/scripts/importNames.js <file.csv> [--apply]
 *
 * Mặc định chỉ CHẠY THỬ và in ra những gì sẽ đổi. Thêm --apply mới ghi vào CSDL.
 * Chỉ điền cho loài đang chưa có tên Việt (tên đang trùng tên khoa học). Tên đã được biên tập
 * trong hệ thống không bao giờ bị ghi đè. (Khi dev: `npm run import:names -- "../File Data/ten-tieng-viet.csv"`.)
 */
import { readFileSync } from 'node:fs';
import { parse } from 'csv-parse/sync';
import { prisma } from '../lib/prisma';

async function main() {
  const args = process.argv.slice(2);
  const file = args.find((a) => !a.startsWith('--'));
  const apply = args.includes('--apply');
  if (!file) {
    console.error('Cách dùng: importNames <file.csv> [--apply]');
    process.exit(2);
  }

  const rows = parse(readFileSync(file, 'utf8'), { columns: true, skip_empty_lines: true, trim: true, bom: true }) as { scientificName: string; name: string }[];
  const species = await prisma.species.findMany({ select: { id: true, scientificName: true, name: true } });
  const bySci = new Map(species.map((s) => [s.scientificName, s]));

  const todo: { id: string; scientificName: string; name: string }[] = [];
  const unknown: string[] = [];
  const kept: string[] = [];
  const seen = new Set<string>();
  for (const r of rows) {
    const sci = r.scientificName?.trim();
    const name = r.name?.trim();
    if (!sci || !name || seen.has(sci)) continue;
    seen.add(sci);
    const s = bySci.get(sci);
    if (!s) unknown.push(sci);
    else if (s.name !== s.scientificName) kept.push(`${sci} (đang là "${s.name}")`);
    else todo.push({ id: s.id, scientificName: sci, name });
  }

  console.log(`${apply ? 'GHI' : 'CHẠY THỬ'}: ${todo.length} loài sẽ được điền tên Việt.`);
  for (const t of todo) console.log(`  + ${t.scientificName} → ${t.name}`);
  if (kept.length) console.log(`Bỏ qua ${kept.length} loài đã có tên Việt (giữ nguyên):\n  ${kept.join('\n  ')}`);
  if (unknown.length) console.log(`Không có trong CSDL (${unknown.length}): ${unknown.join(', ')}`);
  const stillMissing = species.filter((s) => s.name === s.scientificName && !seen.has(s.scientificName)).length;
  console.log(`Còn ${stillMissing} loài chưa có tên Việt trong file này.`);

  if (apply) {
    await prisma.$transaction(todo.map((t) => prisma.species.update({ where: { id: t.id }, data: { name: t.name } })));
    console.log('Đã ghi.');
  } else {
    console.log('Chưa ghi gì. Thêm --apply để áp dụng.');
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
