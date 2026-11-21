import 'dotenv/config';
import path from 'node:path';

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
}

export const env = {
  port: Number(process.env.PORT ?? 7000),
  databaseUrl: required('DATABASE_URL'),
  jwtSecret: required('JWT_SECRET'),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '7d',
  corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:5173',
  // Thư mục lưu file tải lên (ảnh loài...). Trong Docker được mount ra ngoài để không mất khi build lại.
  // Chatbot tra cứu chạy trên Ollama tự host (không gửi dữ liệu ra ngoài). Cần model hỗ trợ tool calling.
  ollamaUrl: (process.env.OLLAMA_URL ?? 'http://localhost:11434').replace(/\/+$/, ''),
  ollamaModel: process.env.OLLAMA_MODEL ?? 'qwen2.5:7b',
  uploadDir: path.resolve(process.env.UPLOAD_DIR ?? 'uploads'),
};
