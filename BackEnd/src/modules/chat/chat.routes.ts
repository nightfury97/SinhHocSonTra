import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../middleware/asyncHandler';
import { validateBody } from '../../middleware/validate';
import { ApiError } from '../../utils/ApiError';
import { env } from '../../env';
import { TOOL_DEFS, runTool } from './chat.tools';

const router = Router();

const SYSTEM_PROMPT = `Bạn là trợ lý tra cứu của hệ thống "Quản lý đa dạng sinh học Sơn Trà" (bán đảo Sơn Trà, Đà Nẵng).
Quy tắc:
- Chỉ trả lời dựa trên kết quả của các công cụ tra cứu. LUÔN gọi công cụ trước khi nêu tên loài, số liệu, hạng IUCN hay phân loại. Không dùng trí nhớ để bịa dữ liệu.
- Nếu công cụ không trả về kết quả, nói rõ "cơ sở dữ liệu chưa có thông tin này". Không đoán.
- Chỉ đặt bộ lọc mà người dùng nêu rõ. "Bị đe doạ" hoặc "nguy cấp" nói chung → dùng threatened=true, KHÔNG tự chọn một hạng (status) hay một nhóm (group) cụ thể.
- Chỉ kết luận "chưa có" khi kết quả công cụ rỗng (tong_so_loai_khop = 0). Có kết quả thì nêu đúng kết quả đó.
- Không cung cấp vị trí, toạ độ hay nơi gặp cụ thể của loài. Nếu được hỏi, giải thích rằng thông tin vị trí được bảo mật để bảo vệ loài nguy cấp, và cán bộ có tài khoản có thể xem trong hệ thống.
- Số liệu khảo sát voọc là số đếm trực tiếp trên tuyến, không phải ước lượng quần thể.
- Trả lời bằng tiếng Việt, ngắn gọn, rõ ràng. Giữ nguyên tên khoa học. Với danh sách dài, tóm tắt và nói tổng số.
- Chỉ trả lời về đa dạng sinh học Sơn Trà và dữ liệu trong hệ thống. Với chủ đề khác, từ chối lịch sự.`;

const bodySchema = z.object({
  messages: z
    .array(z.object({ role: z.enum(['user', 'assistant']), content: z.string().min(1).max(2000) }))
    .min(1)
    .max(20),
});

// Giới hạn lượt hỏi theo IP: model local chạy chung máy, tránh bị dồn tải.
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 12;
const hits = new Map<string, number[]>();
function rateLimit(ip: string) {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  if (recent.length >= MAX_PER_WINDOW) throw new ApiError(429, 'Bạn hỏi quá nhanh, vui lòng thử lại sau ít phút.');
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 5000) for (const [k, v] of hits) if (v.every((t) => now - t >= WINDOW_MS)) hits.delete(k);
}
// Chỉ cho một số lượng hạn chế yêu cầu chạy cùng lúc.
let running = 0;
const MAX_CONCURRENT = 2;

interface OllamaMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  tool_calls?: { function: { name: string; arguments: Record<string, unknown> | string } }[];
  tool_name?: string;
}

async function ollamaChat(messages: OllamaMessage[]) {
  let res: Response;
  try {
    res = await fetch(`${env.ollamaUrl}/api/chat`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ model: env.ollamaModel, messages, tools: TOOL_DEFS, stream: false, keep_alive: '30m', options: { temperature: 0.2, num_ctx: 8192 } }),
      signal: AbortSignal.timeout(120_000),
    });
  } catch {
    throw new ApiError(503, 'Trợ lý AI hiện không khả dụng. Vui lòng thử lại sau.');
  }
  if (!res.ok) throw new ApiError(503, 'Trợ lý AI hiện không khả dụng. Vui lòng thử lại sau.');
  return ((await res.json()) as { message: OllamaMessage }).message;
}

router.post(
  '/',
  validateBody(bodySchema),
  asyncHandler(async (req, res) => {
    const ip = String(req.headers['cf-connecting-ip'] ?? req.headers['x-forwarded-for'] ?? req.ip).split(',')[0].trim();
    rateLimit(ip);
    if (running >= MAX_CONCURRENT) throw new ApiError(429, 'Trợ lý đang bận, vui lòng thử lại sau giây lát.');

    running += 1;
    try {
      const messages: OllamaMessage[] = [{ role: 'system', content: SYSTEM_PROMPT }, ...req.body.messages];
      const sources = new Set<string>();

      // Vòng lặp tool calling: tối đa 4 lượt gọi công cụ.
      for (let step = 0; step < 4; step += 1) {
        const reply = await ollamaChat(messages);
        const calls = reply.tool_calls ?? [];
        if (calls.length === 0) {
          return res.json({ reply: reply.content.trim() || 'Xin lỗi, tôi chưa có câu trả lời.', tools: [...sources] });
        }
        messages.push({ role: 'assistant', content: reply.content ?? '', tool_calls: calls });
        for (const call of calls) {
          const raw = call.function.arguments;
          let args: Record<string, unknown> = {};
          try {
            args = typeof raw === 'string' ? JSON.parse(raw) : raw ?? {};
          } catch {
            /* tham số hỏng: chạy với bộ lọc rỗng */
          }
          sources.add(call.function.name);
          if (process.env.CHAT_DEBUG) console.log('[chat] tool', call.function.name, JSON.stringify(args));
          const result = await runTool(call.function.name, args).catch(() => ({ loi: 'Tra cứu thất bại' }));
          messages.push({ role: 'tool', tool_name: call.function.name, content: JSON.stringify(result) });
        }
      }
      res.json({ reply: 'Câu hỏi này cần tra cứu quá nhiều bước. Bạn thử hỏi cụ thể hơn nhé.', tools: [...sources] });
    } finally {
      running -= 1;
    }
  })
);

export default router;
