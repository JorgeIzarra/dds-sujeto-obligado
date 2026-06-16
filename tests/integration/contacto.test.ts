import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import { createApp } from '../../src/interfaces/app';

const prisma = new PrismaClient();
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let app: any;
let formularioId: string;
let oficialId: string;

beforeAll(async () => {
  app = createApp();
  const oficial = await prisma.oficial.create({
    data: {
      nombre: 'Oficial Test Contacto',
      cargo: 'OFICIAL',
      email: `test-contacto-${Date.now()}@test.com`,
      hashPassword: 'hash',
    },
  });
  oficialId = oficial.id;
  const formulario = await prisma.formularioDDS.create({
    data: { proposito: 'Test contacto', oficialId },
  });
  formularioId = formulario.id;
});

afterAll(async () => {
  await prisma.formularioDDS.deleteMany({ where: { id: formularioId } });
  await prisma.oficial.deleteMany({ where: { id: oficialId } });
  await prisma.$disconnect();
});

const bodyValido = {
  direccion: 'Calle 50, Ciudad de Panamá',
  telefono: '+507 6123-4567',
  correo: 'juan@example.com',
};

describe('PUT /api/formularios/:id/contacto (SPEC-API-04, RF-02)', () => {
  it('200 con datos válidos', async () => {
    const res = await request(app)
      .put(`/api/formularios/${formularioId}/contacto`)
      .send(bodyValido);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
  });

  it('200 idempotente — segunda llamada actualiza sin error (upsert)', async () => {
    const res = await request(app)
      .put(`/api/formularios/${formularioId}/contacto`)
      .send({ ...bodyValido, correo: 'juan2@example.com' });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
  });

  it('422 — correo inválido (RF-02, SPEC-SEC-02)', async () => {
    const res = await request(app)
      .put(`/api/formularios/${formularioId}/contacto`)
      .send({ ...bodyValido, correo: 'not-an-email' });
    expect(res.status).toBe(422);
    expect(res.body.error.codigo).toBe('CAMPOS_INVALIDOS');
    expect(res.body.error.campos).toHaveProperty('correo');
  });

  it('422 — teléfono inválido (RF-02, SPEC-SEC-02)', async () => {
    const res = await request(app)
      .put(`/api/formularios/${formularioId}/contacto`)
      .send({ ...bodyValido, telefono: 'abc' });
    expect(res.status).toBe(422);
    expect(res.body.error.codigo).toBe('CAMPOS_INVALIDOS');
    expect(res.body.error.campos).toHaveProperty('telefono');
  });

  it('422 — dirección ausente (RF-08, SPEC-SEC-02)', async () => {
    const { direccion: _d, ...sinDireccion } = bodyValido;
    const res = await request(app)
      .put(`/api/formularios/${formularioId}/contacto`)
      .send(sinDireccion);
    expect(res.status).toBe(422);
    expect(res.body.error.codigo).toBe('CAMPOS_INVALIDOS');
    expect(res.body.error.campos).toHaveProperty('direccion');
  });

  it('registra evento MODIFICAR en log_auditoria con usuarioId null (SPEC-SEC-04)', async () => {
    const countBefore = await prisma.logAuditoria.count();
    await request(app)
      .put(`/api/formularios/${formularioId}/contacto`)
      .send(bodyValido);
    const countAfter = await prisma.logAuditoria.count();
    expect(countAfter).toBe(countBefore + 1);
    const log = await prisma.logAuditoria.findFirst({
      where: { entidad: 'datos_contacto', accion: 'MODIFICAR' },
      orderBy: { timestamp: 'desc' },
    });
    expect(log).not.toBeNull();
    expect(log?.usuarioId).toBeNull();
  });

  it('404 — formulario inexistente', async () => {
    const res = await request(app)
      .put('/api/formularios/00000000-0000-0000-0000-000000000000/contacto')
      .send(bodyValido);
    expect(res.status).toBe(404);
    expect(res.body.error.codigo).toBe('FORMULARIO_NO_ENCONTRADO');
  });
});
