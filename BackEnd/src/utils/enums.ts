import { ApiError } from './ApiError';

/** Uppercase a query value and ensure it is one of the allowed enum values. */
export function parseEnumParam<T extends string>(
  value: string | undefined,
  allowed: readonly T[],
  name: string
): T | undefined {
  if (value === undefined || value === '') return undefined;
  const upper = value.toUpperCase() as T;
  if (!allowed.includes(upper)) {
    throw ApiError.badRequest(`Invalid ${name}: ${value}`);
  }
  return upper;
}

export const TAXON_GROUPS = ['MAMMAL', 'BIRD', 'REPTILE', 'AMPHIBIAN', 'PLANT'] as const;
export const CONSERVATION_STATUSES = ['LC', 'NT', 'VU', 'EN', 'CR', 'EW', 'EX', 'DD', 'NE', 'HERITAGE'] as const;
export const OBSERVATION_STATUSES = ['PENDING', 'APPROVED', 'REJECTED'] as const;
export const BASIS_OF_RECORD = ['HUMAN_OBSERVATION', 'PRESERVED_SPECIMEN', 'MACHINE_OBSERVATION', 'OTHER'] as const;

/** Đọc page/pageSize từ query, kẹp trong giới hạn hợp lý. */
export function parsePaging(query: Record<string, unknown>, defaultSize = 50, maxSize = 200) {
  const page = Math.max(1, Number.parseInt(String(query.page ?? '1'), 10) || 1);
  const pageSize = Math.min(maxSize, Math.max(1, Number.parseInt(String(query.pageSize ?? defaultSize), 10) || defaultSize));
  return { page, pageSize, skip: (page - 1) * pageSize, take: pageSize };
}

export function parseIntParam(value: unknown, name: string): number | undefined {
  if (value === undefined || value === '') return undefined;
  const n = Number.parseInt(String(value), 10);
  if (!Number.isFinite(n)) throw ApiError.badRequest(`Invalid ${name}: ${value}`);
  return n;
}
