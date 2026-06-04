import { createApp } from './interfaces/app';

const PORT = parseInt(process.env.PORT ?? '3000', 10);
const app = createApp();

app.listen(PORT, () => {
  process.stdout.write(`DDS server running on port ${PORT} [${process.env.NODE_ENV ?? 'development'}]\n`);
});
