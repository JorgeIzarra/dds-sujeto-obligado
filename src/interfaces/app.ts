import express, { Application, Request, Response } from 'express';
import path from 'path';
import helmet from 'helmet';
import { formulariosRouter } from './routes/formularios.routes';
import { authRouter } from './routes/auth.routes';

export function createApp(): Application {
  const app = express();

  // SPEC-SEC-07: Cabeceras de seguridad HTTP
  app.use(helmet());

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  app.set('view engine', 'ejs');
  app.set('views', path.join(process.cwd(), 'src', 'interfaces', 'views'));

  app.get('/health', (_req: Request, res: Response): void => {
    res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Rutas
  app.use('/api/auth', authRouter);
  app.use('/api/formularios', formulariosRouter);

  return app;
}
