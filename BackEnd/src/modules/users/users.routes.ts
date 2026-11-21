import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../lib/prisma';
import { asyncHandler } from '../../middleware/asyncHandler';
import { validateBody } from '../../middleware/validate';
import { authenticate, authorize } from '../../middleware/auth';
import { ApiError } from '../../utils/ApiError';
import { hashPassword } from '../../utils/password';

const router = Router();

const userSelect = { id: true, email: true, name: true, role: true, createdAt: true } as const;

router.get(
  '/',
  authenticate,
  authorize('ADMIN'),
  asyncHandler(async (req, res) => {
    const users = await prisma.user.findMany({ select: userSelect, orderBy: { createdAt: 'desc' } });
    res.json(users);
  })
);

router.post(
  '/',
  authenticate,
  authorize('ADMIN'),
  validateBody(
    z.object({
      email: z.string().email(),
      name: z.string().trim().min(1),
      password: z.string().min(8).max(128),
      role: z.enum(['ADMIN', 'RANGER', 'VIEWER']).default('VIEWER'),
    })
  ),
  asyncHandler(async (req, res) => {
    const { email, name, password, role } = req.body;
    if (await prisma.user.findUnique({ where: { email } })) throw ApiError.conflict('Email already registered');
    const user = await prisma.user.create({ data: { email, name, role, passwordHash: await hashPassword(password) }, select: userSelect });
    res.status(201).json(user);
  })
);

/** ADMIN đặt lại mật khẩu cho người khác (quên mật khẩu). Người dùng nên đổi lại ngay sau khi đăng nhập. */
router.post(
  '/:id/password',
  authenticate,
  authorize('ADMIN'),
  validateBody(z.object({ password: z.string().min(8).max(128) })),
  asyncHandler(async (req, res) => {
    await prisma.user.update({ where: { id: req.params.id }, data: { passwordHash: await hashPassword(req.body.password) } });
    res.status(204).end();
  })
);

router.patch(
  '/:id/role',
  authenticate,
  authorize('ADMIN'),
  validateBody(z.object({ role: z.enum(['ADMIN', 'RANGER', 'VIEWER']) })),
  asyncHandler(async (req, res) => {
    if (req.params.id === req.user!.id && req.body.role !== 'ADMIN') throw ApiError.badRequest('Cannot remove your own admin role');
    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: { role: req.body.role },
      select: userSelect,
    });
    res.json(user);
  })
);

export default router;
