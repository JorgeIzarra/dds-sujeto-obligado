import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import { createApp } from '../../src/interfaces/app';
import { signToken } from '../../src/security/jwt.service';

const prisma = new PrismaClient();
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let app: any;
let formularioId: string;
let oficialId: string;
let token: string;

beforeAll(async () => {
  app = createApp();
  const oficial = await prisma.oficial.create({
    data: {
      nombre: 'Oficial Test ID',
      cargo: 'OFICIAL',
      email: `test-id-${Date.now()}@test.com`,
      hashPassword: 'hash',
    },
  });
  oficialId = oficial.id;
  token = signToken({ id: oficialId, email: oficial.email, rol: 'OFICIAL' });
  const formulario = await prisma.formularioDDS.create({
    data: { proposito: 'Test identificacion', oficialId },
  });
  formularioId = formulario.id;
});

afterAll(async () => {
  await prisma.formularioDDS.deleteMany({ where: { id: formularioId } });
  await prisma.oficial.deleteMany({ where: { id: oficialId } });
  await prisma.$disconnect();
});

const bodyValido = {
  nombre: 'Juan Pérez',
  tipoDocumento: 'CEDULA',
  numDocumento: '8-123-4567',
  nacionalidad: 'Panameña',
  tipoCliente: 'NATURAL',
  esPEP: false,
};

describe('PUT /api/formularios/:id/identificacion (SPEC-API-03, RF-01)', () => {
  it('200 con datos válidos — cédula correcta (SPEC-BHV-03 happy path)', async () => {
    const res = await request(app)
      .put(`/api/formularios/${formularioId}/identificacion`)
      .set('Authorization', `Bearer ${token}`)
      .send(bodyValido);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
  });

  it('200 idempotente — segunda llamada actualiza sin error (upsert)', async () => {
    const res = await request(app)
      .put(`/api/formularios/${formularioId}/identificacion`)
      .set('Authorization', `Bearer ${token}`)
      .send({ ...bodyValido, nombre: 'Juan Carlos Pérez' });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
  });

  it('422 — cédula con formato inválido (SPEC-BHV-03)', async () => {
    const res = await request(app)
      .put(`/api/formularios/${formularioId}/identificacion`)
      .set('Authorization', `Bearer ${token}`)
      .send({ ...bodyValido, numDocumento: '12345' });
    expect(res.status).toBe(422);
    expect(res.body.error.codigo).toBe('CEDULA_INVALIDA');
    expect(res.body.error.mensaje).toMatch(/SPEC-RN-02/);
    expect(res.body.error.campos).toHaveProperty('numDocumento');
  });

  it('422 — nombre ausente (SPEC-BHV-04, RF-08)', async () => {
    const { nombre: _n, ...sinNombre } = bodyValido;
    const res = await request(app)
      .put(`/api/formularios/${formularioId}/identificacion`)
      .set('Authorization', `Bearer ${token}`)
      .send(sinNombre);
    expect(res.status).toBe(422);
    expect(res.body.error.codigo).toBe('CAMPOS_INVALIDOS');
    expect(res.body.error.campos).toHaveProperty('nombre');
  });

  it('422 — tipoCliente inválido (SPEC-SEC-02)', async () => {
    const res = await request(app)
      .put(`/api/formularios/${formularioId}/identificacion`)
      .set('Authorization', `Bearer ${token}`)
      .send({ ...bodyValido, tipoCliente: 'INVALIDO' });
    expect(res.status).toBe(422);
    expect(res.body.error.codigo).toBe('CAMPOS_INVALIDOS');
    expect(res.body.error.campos).toHaveProperty('tipoCliente');
  });

  it('200 — PASAPORTE acepta documento alfanumérico sin patrón cédula (VOL-S3-01)', async () => {
    const res = await request(app)
      .put(`/api/formularios/${formularioId}/identificacion`)
      .set('Authorization', `Bearer ${token}`)
      .send({ ...bodyValido, tipoDocumento: 'PASAPORTE', numDocumento: 'A1234567' });
    expect(res.status).toBe(200);
  });

  it('registra evento MODIFICAR en log_auditoria con usuarioId real (SPEC-SEC-04)', async () => {
    const countBefore = await prisma.logAuditoria.count();
    await request(app)
      .put(`/api/formularios/${formularioId}/identificacion`)
      .set('Authorization', `Bearer ${token}`)
      .send({ ...bodyValido, nombre: 'Ana Torres' });
    const countAfter = await prisma.logAuditoria.count();
    expect(countAfter).toBeGreaterThanOrEqual(countBefore + 1);
    const log = await prisma.logAuditoria.findFirst({
      where: { entidad: 'cliente', accion: 'MODIFICAR' },
      orderBy: { timestamp: 'desc' },
    });
    expect(log).not.toBeNull();
    expect(log?.usuarioId).toBe(oficialId);
  });

  it('404 — formulario inexistente', async () => {
    const res = await request(app)
      .put('/api/formularios/00000000-0000-0000-0000-000000000000/identificacion')
      .set('Authorization', `Bearer ${token}`)
      .send(bodyValido);
    expect(res.status).toBe(404);
    expect(res.body.error.codigo).toBe('FORMULARIO_NO_ENCONTRADO');
  });
});
