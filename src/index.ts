import { createApp } from './interfaces/app';

// S9 hardening: red de seguridad a nivel de proceso para que un rechazo o excepción
// no atrapada no tire el servidor (loguea y mantiene el proceso vivo).
process.on('unhandledRejection', (reason: unknown) => {
  console.error('[unhandledRejection]', reason);
});

process.on('uncaughtException', (err: Error) => {
  console.error('[uncaughtException]', err);
});

const PORT = parseInt(process.env.PORT ?? '3000', 10);
const app = createApp();

app.listen(PORT, () => {
  process.stdout.write(`DDS server running on port ${PORT} [${process.env.NODE_ENV ?? 'development'}]\n`);
});
