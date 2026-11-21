import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';
import { ApiError } from '../utils/ApiError';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, req: Request, res: Response, next: NextFunction) {
  if (err instanceof ApiError) {
    return res.status(err.status).json({ error: err.message });
  }

  if (err instanceof ZodError) {
    return res.status(400).json({ error: 'Validation failed', details: err.flatten() });
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      return res.status(409).json({ error: `Duplicate value for field(s): ${err.meta?.target}` });
    }
    if (err.code === 'P2003') {
      return res.status(409).json({ error: 'Record is still referenced by other data' });
    }
    if (err.code === 'P2025') {
      return res.status(404).json({ error: 'Record not found' });
    }
  }

  // Lỗi HTTP có sẵn mã trạng thái (body quá lớn 413, file tĩnh không tồn tại 404...).
  const status = (err as { status?: number; statusCode?: number })?.status ?? (err as { statusCode?: number })?.statusCode;
  if (typeof status === 'number' && status >= 400 && status < 500) {
    const messages: Record<number, string> = { 404: 'Not found', 413: 'File quá lớn.' };
    return res.status(status).json({ error: messages[status] ?? 'Bad request' });
  }

  console.error(err);
  return res.status(500).json({ error: 'Internal server error' });
}
