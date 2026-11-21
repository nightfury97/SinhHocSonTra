/**
 * Nhập ảnh loài hàng loạt từ một thư mục.
 *
 *   node dist/scripts/importImages.js <thư-mục> [--credit "Tên tác giả"] [--license "CC BY 4.0"] [--meta anh.csv] [--dry-run]
 *   (dev: npm run import:images -- "../Anh loai" --credit "GreenViet")
 *
 * Cách nhận loài cho mỗi ảnh (theo thứ tự ưu tiên):
 *   1. File CSV --meta có cột: file, scientificName, caption, credit, license, primary (true/false)
 *   2. Thư mục con đặt theo tên khoa học:  Pygathrix nemaeus/anh1.jpg
 *   3. Tên file bắt đầu bằng tên khoa học:  Pygathrix_nemaeus_01.jpg, pygathrix-nemaeus (2).png
 * Ảnh trùng (cùng nội dung) với ảnh đã có của loài sẽ được bỏ qua, nên chạy lại nhiều lần an toàn.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { parse } from 'csv-parse/sync';
import { prisma } from '../lib/prisma';
import { addSpeciesImage } from '../modules/species/images';
import { ApiError } from '../utils/ApiError';

const IMAGE_EXT = /\.(jpe?g|png|webp|tiff?|avif)$/i;

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    return statSync(full).isDirectory() ? walk(full) : IMAGE_EXT.test(name) ? [full] : [];
  });
}

/** "Pygathrix_nemaeus (2)" → "pygathrix nemaeus" (hai từ đầu = chi + tính ngữ). */
function binomial(text: string) {
  const words = text
    .replace(IMAGE_EXT, '')
    .replace(/[_\-.]+/g, ' ')
    .replace(/[()[\]\d]+/g, ' ')
    .trim()
    .toLowerCase()
    .split(/\s+/);
  return words.length >= 2 ? `${words[0]} ${words[1]}` : null;
}

async function main() {
  const args = process.argv.slice(2);
  const flag = (name: string) => {
    const i = args.indexOf(`--${name}`);
    return i >= 0 ? args[i + 1] : undefined;
  };
  const dir = args.find((a, i) => !a.startsWith('--') && !args[i - 1]?.startsWith('--'));
  if (!dir) {
    console.error('Cách dùng: importImages <thư-mục> [--credit ...] [--license ...] [--meta file.csv] [--dry-run]');
    process.exit(2);
  }
  const dryRun = args.includes('--dry-run');
  const metaFile = flag('meta');
  const meta = new Map<string, Record<string, string>>();
  if (metaFile) {
    const rows: Record<string, string>[] = parse(readFileSync(metaFile, 'utf8'), { columns: true, bom: true, trim: true, skip_empty_lines: true });
    for (const r of rows) meta.set(path.basename(r.file), r);
  }

  const species = await prisma.species.findMany({ select: { id: true, scientificName: true } });
  const bySci = new Map(species.map((s) => [s.scientificName.toLowerCase(), s]));

  const report = { files: 0, imported: 0, duplicates: 0, unmatched: [] as string[], failed: [] as string[] };
  for (const file of walk(dir)) {
    report.files++;
    const rel = path.relative(dir, file);
    const m = meta.get(path.basename(file));
    const candidates = [m?.scientificName?.toLowerCase(), binomial(path.basename(path.dirname(file))), binomial(path.basename(file))];
    const target = candidates.map((c) => (c ? bySci.get(c) : undefined)).find(Boolean);
    if (!target) {
      report.unmatched.push(rel);
      continue;
    }
    if (dryRun) {
      console.log(`  ${rel} → ${target.scientificName}`);
      report.imported++;
      continue;
    }
    try {
      await addSpeciesImage(prisma, target.id, readFileSync(file), {
        caption: m?.caption,
        credit: m?.credit || flag('credit'),
        license: m?.license || flag('license'),
        isPrimary: m?.primary === 'true',
      });
      report.imported++;
      console.log(`  ✓ ${rel} → ${target.scientificName}`);
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) report.duplicates++;
      else report.failed.push(`${rel}: ${err instanceof Error ? err.message : err}`);
    }
  }

  console.log(JSON.stringify(report, null, 2));
  if (dryRun) console.log('\n(--dry-run: không ghi gì)');
}

main()
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
