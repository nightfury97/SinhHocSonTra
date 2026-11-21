/**
 * Nhập dữ liệu khảo sát vào CSDL.
 *
 *   node dist/scripts/importData.js occurrences <file.csv> [--code CODE] [--name "..."] [--dry-run]
 *   node dist/scripts/importData.js transects   <file.xlsx> [--code CODE] [--name "..."]
 *        [--species "Pygathrix nemaeus"] [--utm-zone 49] [--repeat-days 3] [--dry-run]
 *
 * (Khi dev: `npm run import -- occurrences "../File Data/xxx.csv"`.)
 * Chạy lại cùng --code sẽ cập nhật bộ dữ liệu cũ thay vì tạo bản trùng.
 */
import { readFileSync } from 'node:fs';
import { basename } from 'node:path';
import { prisma } from '../lib/prisma';
import { importOccurrences } from '../modules/datasets/importers/occurrences';
import { importTransects } from '../modules/datasets/importers/transects';
import { slugify } from '../modules/datasets/importers/taxonomy';

function parseArgs(argv: string[]) {
  const positional: string[] = [];
  const flags: Record<string, string | true> = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const next = argv[i + 1];
      if (next === undefined || next.startsWith('--')) flags[a.slice(2)] = true;
      else flags[a.slice(2)] = argv[++i];
    } else positional.push(a);
  }
  return { positional, flags };
}

async function main() {
  const { positional, flags } = parseArgs(process.argv.slice(2));
  const [kind, file] = positional;
  if (!kind || !file || !['occurrences', 'transects'].includes(kind)) {
    console.error('Cách dùng: importData <occurrences|transects> <file> [--code ...] [--dry-run]');
    process.exit(2);
  }
  const sourceFile = basename(file);
  const code = typeof flags.code === 'string' ? flags.code : slugify(sourceFile.replace(/\.[^.]+$/, ''));
  const name = typeof flags.name === 'string' ? flags.name : sourceFile;
  const dryRun = flags['dry-run'] === true;

  const report =
    kind === 'occurrences'
      ? await importOccurrences(prisma, readFileSync(file, 'utf8'), { code, name, sourceFile, dryRun })
      : await importTransects(prisma, readFileSync(file), {
          code,
          name,
          sourceFile,
          dryRun,
          speciesScientificName: typeof flags.species === 'string' ? flags.species : 'Pygathrix nemaeus',
          utmZone: Number(flags['utm-zone'] ?? 49),
          repeatDays: Number(flags['repeat-days'] ?? 3),
        });

  console.log(JSON.stringify(report, null, 2));
  if (dryRun) console.log('\n(--dry-run: không ghi gì vào CSDL)');
}

main()
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
