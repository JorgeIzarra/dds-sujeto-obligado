// SPEC-API-05 — PUT /api/formularios/:id/perfil-economico (RF-03, RF-06)
// SPEC-BHV-01: clasificación BAJO con perfil bajo riesgo
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
      nombre: 'Oficial Test Perfil',
      cargo: 'OFICIAL',
      email: `test-perfil-${Date.now()}@test.com`,
      hashPassword: 'hash',
    },
  });
  oficialId = oficial.id;
  token = signToken({ id: oficialId, email: oficial.email, rol: 'OFICIAL' });
  const formulario = await prisma.formularioDDS.create({
    data: { proposito: 'Test perfil economico', oficialId },
  });
  formularioId = formulario.id;
  // Cliente con esPep=false para los tests del grupo principal
  await prisma.cliente.create({
    data: {
      formularioId,
      nombre: 'cliente-test',
      tipoDocumento: 'CEDULA',
      numDocumento: 'doc-test',
      nacionalidad: 'Panameña',
      tipoCliente: 'NATURAL',
      esPep: false,
    },
  });
});

afterAll(async () => {
  await prisma.formularioDDS.deleteMany({ where: { id: formularioId } });
  await prisma.oficial.deleteMany({ where: { id: oficialId } });
  await prisma.$disconnect();
});

const bodyValido = {
  actividad: 'Comercio al por menor',
  fuenteIngresos: 'Salario',
  ingresoMensual: 3000,
  volumenTransacciones: 5000,
};

describe('PUT /api/formularios/:id/perfil-economico (SPEC-API-05, RF-03, RF-06)', () => {
  it('200 — clasificacionRiesgo BAJO con ingreso 3000, vol 5000, esPEP=false (SPEC-BHV-01)', async () => {
    const res = await request(app)
      .put(`/api/formularios/${formularioId}/perfil-economico`)
      .set('Authorization', `Bearer ${token}`)
      .send(bodyValido);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('clasificacionRiesgo', 'BAJO');
  });

  it('200 — upsert idempotente actualiza sin error', async () => {
    const res = await request(app)
      .put(`/api/formularios/${formularioId}/perfil-economico`)
      .set('Authorization', `Bearer ${token}`)
      .send({ ...bodyValido, actividad: 'Comercio actualizado' });
    expect(res.status).toBe(200);
    expect(res.body.clasificacionRiesgo).toBe('BAJO');
  });

  it('200 — NO_ELEGIBLE cuando ingresoMensual > 5000 (SPEC-RN-01)', async () => {
    const res = await request(app)
      .put(`/api/formularios/${formularioId}/perfil-economico`)
      .set('Authorization', `Bearer ${token}`)
      .send({ ...bodyValido, ingresoMensual: 6000 });
    expect(res.status).toBe(200);
    expect(res.body.clasificacionRiesgo).toBe('NO_ELEGIBLE');
  });

  it('200 — NO_ELEGIBLE cuando volumenTransacciones > 10000 (SPEC-RN-01)', async () => {
    const res = await request(app)
      .put(`/api/formularios/${formularioId}/perfil-economico`)
      .set('Authorization', `Bearer ${token}`)
      .send({ ...bodyValido, volumenTransacciones: 11000 });
    expect(res.status).toBe(200);
    expect(res.body.clasificacionRiesgo).toBe('NO_ELEGIBLE');
  });

  it('200 — límite exacto ingresoMensual=5000, volumenTransacciones=10000 → BAJO (SPEC-RN-01)', async () => {
    const res = await request(app)
      .put(`/api/formularios/${formularioId}/perfil-economico`)
      .set('Authorization', `Bearer ${token}`)
      .send({ ...bodyValido, ingresoMensual: 5000, volumenTransacciones: 10000 });
    expect(res.status).toBe(200);
    expect(res.body.clasificacionRiesgo).toBe('BAJO');
  });

  it('200 — límite ingresoMensual=5000.01 → NO_ELEGIBLE (SPEC-RN-01)', async () => {
    const res = await request(app)
      .put(`/api/formularios/${formularioId}/perfil-economico`)
      .set('Authorization', `Bearer ${token}`)
      .send({ ...bodyValido, ingresoMensual: 5000.01, volumenTransacciones: 10000 });
    expect(res.status).toBe(200);
    expect(res.body.clasificacionRiesgo).toBe('NO_ELEGIBLE');
  });

  it('200 — límite volumenTransacciones=10000.01 → NO_ELEGIBLE (SPEC-RN-01)', async () => {
    const res = await request(app)
      .put(`/api/formularios/${formularioId}/perfil-economico`)
      .set('Authorization', `Bearer ${token}`)
      .send({ ...bodyValido, ingresoMensual: 5000, volumenTransacciones: 10000.01 });
    expect(res.status).toBe(200);
    expect(res.body.clasificacionRiesgo).toBe('NO_ELEGIBLE');
  });

  it('422 — falta actividad (SPEC-SEC-02, RF-08)', async () => {
    const { actividad: _a, ...sinActividad } = bodyValido;
    const res = await request(app)
      .put(`/api/formularios/${formularioId}/perfil-economico`)
      .set('Authorization', `Bearer ${token}`)
      .send(sinActividad);
    expect(res.status).toBe(422);
    expect(res.body.error.codigo).toBe('CAMPOS_INVALIDOS');
    expect(res.body.error.campos).toHaveProperty('actividad');
  });

  it('422 — ingresoMensual no numérico (SPEC-SEC-02)', async () => {
    const res = await request(app)
      .put(`/api/formularios/${formularioId}/perfil-economico`)
      .set('Authorization', `Bearer ${token}`)
      .send({ ...bodyValido, ingresoMensual: 'tres mil' });
    expect(res.status).toBe(422);
    expect(res.body.error.codigo).toBe('CAMPOS_INVALIDOS');
    expect(res.body.error.campos).toHaveProperty('ingresoMensual');
  });

  it('404 — formulario inexistente', async () => {
    const res = await request(app)
      .put('/api/formularios/00000000-0000-0000-0000-000000000000/perfil-economico')
      .set('Authorization', `Bearer ${token}`)
      .send(bodyValido);
    expect(res.status).toBe(404);
    expect(res.body.error.codigo).toBe('FORMULARIO_NO_ENCONTRADO');
  });

  it('registra evento CLASIFICAR en log_auditoria con usuarioId real (CA-07, RNF-05, SPEC-SEC-04)', async () => {
    const countBefore = await prisma.logAuditoria.count();
    await request(app)
      .put(`/api/formularios/${formularioId}/perfil-economico`)
      .set('Authorization', `Bearer ${token}`)
      .send(bodyValido);
    const countAfter = await prisma.logAuditoria.count();
    expect(countAfter).toBeGreaterThanOrEqual(countBefore + 1);
    const log = await prisma.logAuditoria.findFirst({
      where: { entidad: 'perfil_economico', accion: 'CLASIFICAR' },
      orderBy: { timestamp: 'desc' },
    });
    expect(log).not.toBeNull();
    expect(log?.usuarioId).toBe(oficialId);
    expect(log?.detalle).toMatchObject({ clasificacionRiesgo: 'BAJO' });
  });

  it('persiste clasificacionRiesgo en formularioDDS (RF-06, SPEC-DATA-01)', async () => {
    await request(app)
      .put(`/api/formularios/${formularioId}/perfil-economico`)
      .set('Authorization', `Bearer ${token}`)
      .send(bodyValido);
    const formulario = await prisma.formularioDDS.findUnique({ where: { id: formularioId } });
    expect(formulario?.clasificacionRiesgo).toBe('BAJO');
  });
});

describe('PUT /api/formularios/:id/perfil-economico — cliente PEP (RN-02, SPEC-RN-01)', () => {
  let formularioPEPId: string;

  beforeAll(async () => {
    const f = await prisma.formularioDDS.create({
      data: { proposito: 'Test PEP clasificacion', oficialId },
    });
    formularioPEPId = f.id;
    await prisma.cliente.create({
      data: {
        formularioId: formularioPEPId,
        nombre: 'cliente-pep',
        tipoDocumento: 'CEDULA',
        numDocumento: 'doc-pep',
        nacionalidad: 'Panameña',
        tipoCliente: 'NATURAL',
        esPep: true,
      },
    });
  });

  afterAll(async () => {
    await prisma.formularioDDS.deleteMany({ where: { id: formularioPEPId } });
  });

  it('200 — NO_ELEGIBLE cuando esPEP=true aunque ingreso y volumen bajos (RN-02)', async () => {
    const res = await request(app)
      .put(`/api/formularios/${formularioPEPId}/perfil-economico`)
      .set('Authorization', `Bearer ${token}`)
      .send({ ...bodyValido, ingresoMensual: 1000, volumenTransacciones: 2000 });
    expect(res.status).toBe(200);
    expect(res.body.clasificacionRiesgo).toBe('NO_ELEGIBLE');
  });
});
