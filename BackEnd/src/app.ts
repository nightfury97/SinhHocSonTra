import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { env } from './env';
import path from 'node:path';
import routes from './routes';
import { errorHandler } from './middleware/errorHandler';

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(cors({ origin: env.corsOrigin }));
  app.use(express.json());
  app.use(morgan('dev'));

  app.get('/health', (req, res) => res.json({ status: 'ok' }));

  // Ảnh đã xử lý: tên file chứa khoá ngẫu nhiên, không bao giờ ghi đè → cache lâu dài được.
  app.use(
    '/api/media',
    express.static(path.join(env.uploadDir), { immutable: true, maxAge: '365d', index: false, dotfiles: 'deny', fallthrough: false })
  );

  app.use('/api', routes);

  app.use((req, res) => res.status(404).json({ error: 'Not found' }));
  app.use(errorHandler);

  return app;
}
