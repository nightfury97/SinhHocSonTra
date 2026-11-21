import { Router, type Request } from 'express';
import { z } from 'zod';
import { prisma } from '../../lib/prisma';
import { ApiError } from '../../utils/ApiError';
import { asyncHandler } from '../../middleware/asyncHandler';
import { validateBody } from '../../middleware/validate';
import { authenticate } from '../../middleware/auth';
import { hashPassword, comparePassword } from '../../utils/password';
import { signToken } from '../../utils/jwt';

const router = Router();

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8).max(128),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

function toPublicUser(user: { id: string; email: string; name: string; role: string; createdAt: Date }) {
  return { id: user.id, email: user.email, name: user.name, role: user.role, createdAt: user.createdAt };
}

// Không có đăng ký công khai: tài khoản do ADMIN tạo (POST /users).

// Chống dò mật khẩu: tối đa 8 lần sai trong 15 phút cho mỗi cặp IP + email.
const FAIL_WINDOW_MS = 15 * 60_000;
const MAX_FAILS = 8;
const fails = new Map<string, number[]>();
const failKey = (req: Request, email: string) =>
  `${String(req.headers['cf-connecting-ip'] ?? req.headers['x-forwarded-for'] ?? req.ip).split(',')[0].trim()}|${email.toLowerCase()}`;
const recentFails = (key: string) => {
  const now = Date.now();
  const list = (fails.get(key) ?? []).filter((t) => now - t < FAIL_WINDOW_MS);
  if (list.length) fails.set(key, list);
  else fails.delete(key);
  return list;
};

router.post(
  '/login',
  validateBody(loginSchema),
  asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    const key = failKey(req, email);
    if (recentFails(key).length >= MAX_FAILS) throw new ApiError(429, 'Too many failed logins');

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !(await comparePassword(password, user.passwordHash))) {
      fails.set(key, [...recentFails(key), Date.now()]);
      throw ApiError.unauthorized('Invalid credentials');
    }
    fails.delete(key);

    const token = signToken({ sub: user.id, role: user.role });
    res.json({ token, user: toPublicUser(user) });
  })
);

router.get(
  '/me',
  authenticate,
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUniqueOrThrow({ where: { id: req.user!.id } });
    res.json(toPublicUser(user));
  })
);

router.post(
  '/change-password',
  authenticate,
  validateBody(changePasswordSchema),
  asyncHandler(async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    const user = await prisma.user.findUniqueOrThrow({ where: { id: req.user!.id } });
    // 400 chứ không phải 401: 401 làm giao diện tự đăng xuất.
    if (!(await comparePassword(currentPassword, user.passwordHash))) throw ApiError.badRequest('Current password is incorrect');
    if (currentPassword === newPassword) throw ApiError.badRequest('New password must differ from current password');
    await prisma.user.update({ where: { id: user.id }, data: { passwordHash: await hashPassword(newPassword) } });
    res.status(204).end();
  })
);

export default router;
