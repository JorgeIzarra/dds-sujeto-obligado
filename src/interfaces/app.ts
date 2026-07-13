import express, { Application, Request, Response, NextFunction } from 'express';
import path from 'path';
import helmet from 'helmet';
import { formulariosRouter } from './routes/formularios.routes';
import { authRouter } from './routes/auth.routes';
import { webRouter } from './routes/web.routes';

export function createApp(): Application {
  const app = express();

  // SPEC-SEC-07: Cabeceras de seguridad HTTP
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          ...helmet.contentSecurityPolicy.getDefaultDirectives(),
          "script-src": ["'self'", "'unsafe-inline'"],
          "style-src": ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
          "font-src": ["'self'", "https://fonts.gstatic.com"],
        },
      },
    })
  );

  // Forzar HTTPS en producción (RNF-04)
  // S5146: No usamos req.headers.host (controlable por el atacante) sino APP_HOST configurado
  // en variables de entorno. El path también se valida para rechazar URLs externas forjadas.
  app.use((req: Request, res: Response, next): void => {
    if (process.env.NODE_ENV === 'production') {
      if (req.headers['x-forwarded-proto'] && req.headers['x-forwarded-proto'] !== 'https') {
        const appHost = process.env.APP_HOST;
        if (!appHost) {
          // Sin APP_HOST configurado no podemos construir una URL segura: pasamos al siguiente middleware.
          next();
          return;
        }
        // Validar que req.url sea una ruta relativa segura (no contiene protocolo ni doble barra inicial).
        const safePath = /^\/(?!\/)[^]*$/.test(req.url) ? req.url : '/';
        res.redirect(301, `https://${appHost}${safePath}`);
        return;
      }
    }
    next();
  });

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
  app.use('/', webRouter);

  // S9 hardening: captura errores asíncronos no atrapados y responde 500 sin matar el proceso.
  // Debe registrarse después de todas las rutas (signature de 4 args = middleware de error).
  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction): void => {
    console.error('[errorHandler]', err);
    if (res.headersSent) return;
    res.status(500).json({
      error: { codigo: 'ERROR_INTERNO', mensaje: 'Error interno del servidor' },
    });
  });

  return app;
}
