import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/interfaces/app';

/**
 * Test de arnés — verifica que la infraestructura Express arranca y
 * que el pipeline de CI (lint → test → sonar) está operativo.
 * No corresponde a ninguna SPEC-BHV de negocio (DEV_SPEC §8, Sesión 1).
 */
describe('GET /health — arnés de infraestructura', () => {
  const app = createApp();

  it('responde 200 con status ok y timestamp ISO', async () => {
    const res = await request(app).get('/health');

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ status: 'ok' });
    expect(typeof res.body.timestamp).toBe('string');
    expect(() => new Date(res.body.timestamp as string)).not.toThrow();
  });
});
