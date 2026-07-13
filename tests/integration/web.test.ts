import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/interfaces/app';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let app: any;

beforeAll(() => {
  app = createApp();
});

async function expectHtmlPage(url: string, containsText: string) {
  const res = await request(app).get(url);
  expect(res.status).toBe(200);
  expect(res.header['content-type']).toContain('text/html');
  expect(res.text).toContain(containsText);
  return res;
}

describe.sequential('Web Routes Render', () => {
  it('redirige a HTTPS en entorno de producción (RNF-04)', async () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    const res = await request(app)
      .get('/login')
      .set('x-forwarded-proto', 'http');

    expect(res.status).toBe(302);
    expect(res.header.location).toMatch(/^https:\/\/127\.0\.0\.1(:\d+)?\/login$/);

    // Restaurar entorno
    process.env.NODE_ENV = originalEnv;
  });

  it('no redirige a HTTPS en producción si la cabecera es https', async () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    const res = await request(app)
      .get('/login')
      .set('x-forwarded-proto', 'https');

    expect(res.status).toBe(200);

    // Restaurar entorno
    process.env.NODE_ENV = originalEnv;
  });

  it('GET / — redirige a /login', async () => {
    const res = await request(app).get('/');
    expect(res.status).toBe(302);
    expect(res.header.location).toBe('/login');
  });

  it('GET /login — renderiza la página de login', async () => {
    await expectHtmlPage('/login', 'Acceso al Sistema');
  });

  it('GET /formularios — renderiza el buscador y bandeja de entrada', async () => {
    await expectHtmlPage('/formularios', 'Formularios DDS');
  });

  it('GET /formularios/:id/identificacion — renderiza el paso 1', async () => {
    const res = await expectHtmlPage('/formularios/mock-id-123/identificacion', 'Paso 1: Identificación del Cliente');
    expect(res.text).toContain('mock-id-123'); // Verifica inyección de variable ID
  });

  it('GET /formularios/:id/contacto — renderiza el paso 2', async () => {
    await expectHtmlPage('/formularios/mock-id-123/contacto', 'Paso 2: Datos de Contacto del Cliente');
  });

  it('GET /formularios/:id/perfil — renderiza el paso 3', async () => {
    const res = await expectHtmlPage('/formularios/mock-id-123/perfil', 'Paso 3: Perfil Económico y Transaccional');
    expect(res.text).toContain('riesgo-badge'); // Badge reactivo
  });

  it('GET /formularios/:id/documentos — renderiza el paso 4', async () => {
    await expectHtmlPage('/formularios/mock-id-123/documentos', 'Paso 4: Checklist de Documentos de Soporte');
  });

  it('GET /formularios/:id/resumen — renderiza el paso 5', async () => {
    await expectHtmlPage('/formularios/mock-id-123/resumen', 'Resumen e Indicadores del Formulario');
  });
});
