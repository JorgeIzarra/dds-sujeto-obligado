import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/interfaces/app';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let app: any;

beforeAll(() => {
  app = createApp();
});

describe('Web Routes Render', () => {
  it('GET /login — renderiza la página de login', async () => {
    const res = await request(app).get('/login');
    expect(res.status).toBe(200);
    expect(res.header['content-type']).toContain('text/html');
    expect(res.text).toContain('Acceso al Sistema');
  });

  it('GET /formularios — renderiza el buscador y bandeja de entrada', async () => {
    const res = await request(app).get('/formularios');
    expect(res.status).toBe(200);
    expect(res.header['content-type']).toContain('text/html');
    expect(res.text).toContain('Bandeja de Formularios DDS');
  });

  it('GET /formularios/:id/identificacion — renderiza el paso 1', async () => {
    const res = await request(app).get('/formularios/mock-id-123/identificacion');
    expect(res.status).toBe(200);
    expect(res.header['content-type']).toContain('text/html');
    expect(res.text).toContain('Paso 1: Identificación del Cliente');
    expect(res.text).toContain('mock-id-123'); // Verifica inyección de variable ID
  });

  it('GET /formularios/:id/contacto — renderiza el paso 2', async () => {
    const res = await request(app).get('/formularios/mock-id-123/contacto');
    expect(res.status).toBe(200);
    expect(res.header['content-type']).toContain('text/html');
    expect(res.text).toContain('Paso 2: Datos de Contacto del Cliente');
  });

  it('GET /formularios/:id/perfil — renderiza el paso 3', async () => {
    const res = await request(app).get('/formularios/mock-id-123/perfil');
    expect(res.status).toBe(200);
    expect(res.header['content-type']).toContain('text/html');
    expect(res.text).toContain('Paso 3: Perfil Económico y Transaccional');
    expect(res.text).toContain('riesgo-badge'); // Badge reactivo
  });

  it('GET /formularios/:id/documentos — renderiza el paso 4', async () => {
    const res = await request(app).get('/formularios/mock-id-123/documentos');
    expect(res.status).toBe(200);
    expect(res.header['content-type']).toContain('text/html');
    expect(res.text).toContain('Paso 4: Checklist de Documentos de Soporte');
  });

  it('GET /formularios/:id/resumen — renderiza el paso 5', async () => {
    const res = await request(app).get('/formularios/mock-id-123/resumen');
    expect(res.status).toBe(200);
    expect(res.header['content-type']).toContain('text/html');
    expect(res.text).toContain('Resumen e Indicadores del Formulario');
  });
});
