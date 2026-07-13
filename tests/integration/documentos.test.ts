// SPEC-API-06 — POST /api/formularios/:id/documentos (RF-05)
// VOL-S5-01: verificado es opcional (default false) — extensión del contrato para permitir RN-04
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
      nombre: 'Oficial Test Documentos',
      cargo: 'OFICIAL',
      email: `test-documentos-${Date.now()}@test.com`,
      hashPassword: 'hash',
    },
  });
  oficialId = oficial.id;
  token = signToken({ id: oficialId, email: oficial.email, rol: 'OFICIAL' });
  const formulario = await prisma.formularioDDS.create({
    data: { proposito: 'Test documentos', oficialId },
  });
  formularioId = formulario.id;
});

afterAll(async () => {
  await prisma.formularioDDS.deleteMany({ where: { id: formularioId } });
  await prisma.oficial.deleteMany({ where: { id: oficialId } });
  await prisma.$disconnect();
});

describe('POST /api/formularios/:id/documentos (SPEC-API-06, RF-05)', () => {
  it('201 — crea documento con tipo y baseLegal, fechaRecepcion automática (CA-09)', async () => {
    const res = await request(app)
      .post(`/api/formularios/${formularioId}/documentos`)
      .set('Authorization', `Bearer ${token}`)
      .send({ tipo: 'CEDULA', baseLegal: 'Art. 24' });
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('id');
    expect(res.body).toHaveProperty('fechaRecepcion');
  });

  it('201 — verificado por defecto es false cuando no se envía (VOL-S5-01)', async () => {
    const res = await request(app)
      .post(`/api/formularios/${formularioId}/documentos`)
      .set('Authorization', `Bearer ${token}`)
      .send({ tipo: 'PASAPORTE' });
    expect(res.status).toBe(201);
    const doc = await prisma.documento.findUnique({ where: { id: res.body.id } });
    expect(doc?.verificado).toBe(false);
  });

  it('201 — acepta verificado=true explícito (VOL-S5-01)', async () => {
    const res = await request(app)
      .post(`/api/formularios/${formularioId}/documentos`)
      .set('Authorization', `Bearer ${token}`)
      .send({ tipo: 'RUC', verificado: true });
    expect(res.status).toBe(201);
    const doc = await prisma.documento.findUnique({ where: { id: res.body.id } });
    expect(doc?.verificado).toBe(true);
  });

  it('422 — falta tipo (RF-08, SPEC-SEC-02)', async () => {
    const res = await request(app)
      .post(`/api/formularios/${formularioId}/documentos`)
      .set('Authorization', `Bearer ${token}`)
      .send({ baseLegal: 'Art. 24' });
    expect(res.status).toBe(422);
    expect(res.body.error.codigo).toBe('CAMPOS_INVALIDOS');
    expect(res.body.error.campos).toHaveProperty('tipo');
  });

  it('404 — formulario inexistente', async () => {
    const res = await request(app)
      .post('/api/formularios/00000000-0000-0000-0000-000000000000/documentos')
      .set('Authorization', `Bearer ${token}`)
      .send({ tipo: 'CEDULA' });
    expect(res.status).toBe(404);
    expect(res.body.error.codigo).toBe('FORMULARIO_NO_ENCONTRADO');
  });

  it('registra evento CREAR en log_auditoria con usuarioId real (SPEC-SEC-04)', async () => {
    const countBefore = await prisma.logAuditoria.count();
    await request(app)
      .post(`/api/formularios/${formularioId}/documentos`)
      .set('Authorization', `Bearer ${token}`)
      .send({ tipo: 'CEDULA' });
    const countAfter = await prisma.logAuditoria.count();
    expect(countAfter).toBeGreaterThanOrEqual(countBefore + 1);
    const log = await prisma.logAuditoria.findFirst({
      where: { entidad: 'documento', accion: 'CREAR' },
      orderBy: { timestamp: 'desc' },
    });
    expect(log).not.toBeNull();
    expect(log?.usuarioId).toBe(oficialId);
  });
});
