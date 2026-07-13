import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import { createApp } from '../../src/interfaces/app';
import { signToken } from '../../src/security/jwt.service';
import { hashPassword } from '../../src/security/hash.service';

const prisma = new PrismaClient();
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let app: any;
let oficialId: string;
let supervisorId: string;
let oficialToken: string;
let supervisorToken: string;
let formularioAprobadoId: string;
let formularioBorradorId: string;

beforeAll(async () => {
  app = createApp();

  // Crear Oficial
  const hashedPassword = await hashPassword('password123');
  const oficial = await prisma.oficial.create({
    data: {
      nombre: 'Oficial Test Auth',
      cargo: 'OFICIAL',
      email: `oficial-auth-${Date.now()}@test.com`,
      hashPassword: hashedPassword,
    },
  });
  oficialId = oficial.id;
  oficialToken = signToken({ id: oficialId, email: oficial.email, rol: 'OFICIAL' });

  // Crear Supervisor
  const supervisor = await prisma.oficial.create({
    data: {
      nombre: 'Supervisor Test Auth',
      cargo: 'SUPERVISOR',
      email: `supervisor-auth-${Date.now()}@test.com`,
      hashPassword: hashedPassword,
    },
  });
  supervisorId = supervisor.id;
  supervisorToken = signToken({
    id: supervisorId,
    email: supervisor.email,
    rol: 'SUPERVISOR',
  });

  // Formulario APROBADO (simulado en BD)
  const fAprobado = await prisma.formularioDDS.create({
    data: {
      proposito: 'Test aprobado',
      estado: 'APROBADO',
      oficialId: oficialId,
    },
  });
  formularioAprobadoId = fAprobado.id;

  // Formulario BORRADOR
  const fBorrador = await prisma.formularioDDS.create({
    data: {
      proposito: 'Test borrador',
      estado: 'BORRADOR',
      oficialId: oficialId,
    },
  });
  formularioBorradorId = fBorrador.id;
});

afterAll(async () => {
  await prisma.formularioDDS.deleteMany({
    where: { id: { in: [formularioAprobadoId, formularioBorradorId] } },
  });
  await prisma.oficial.deleteMany({ where: { id: { in: [oficialId, supervisorId] } } });
  await prisma.$disconnect();
});

describe('Middleware de Autenticación y Autorización (SPEC-SEC-05, SPEC-BHV-08)', () => {
  it('401 sin token (SPEC-BHV-08)', async () => {
    const res = await request(app).put(`/api/formularios/${formularioBorradorId}/identificacion`);
    expect(res.status).toBe(401);
    expect(res.body.error.codigo).toBe('NO_AUTENTICADO');
  });

  it('401 con token inválido', async () => {
    const res = await request(app)
      .put(`/api/formularios/${formularioBorradorId}/identificacion`)
      .set('Authorization', 'Bearer token_invalido');
    expect(res.status).toBe(401);
    expect(res.body.error.codigo).toBe('NO_AUTENTICADO');
  });

  it('403 cuando Oficial intenta editar formulario APROBADO (RN-06, SPEC-BHV-08)', async () => {
    const res = await request(app)
      .put(`/api/formularios/${formularioAprobadoId}/identificacion`)
      .set('Authorization', `Bearer ${oficialToken}`)
      .send({
        nombre: 'Nuevo Nombre',
        tipoDocumento: 'CEDULA',
        numDocumento: '8-123-4567',
        nacionalidad: 'Panameña',
        tipoCliente: 'NATURAL',
        esPEP: false,
      });
    expect(res.status).toBe(403);
    expect(res.body.error.codigo).toBe('NO_AUTORIZADO');
    expect(res.body.error.mensaje).toContain('Un formulario aprobado solo se edita con autorización de Supervisor');
  });

  it('200 cuando Supervisor edita formulario APROBADO (RN-06)', async () => {
    const res = await request(app)
      .put(`/api/formularios/${formularioAprobadoId}`)
      .set('Authorization', `Bearer ${supervisorToken}`)
      .send({ proposito: 'Propósito Editado por Supervisor' });
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);

    const f = await prisma.formularioDDS.findUnique({ where: { id: formularioAprobadoId } });
    expect(f?.proposito).toBe('Propósito Editado por Supervisor');
  });

  it('403 cuando Oficial intenta editar general (PUT /api/formularios/:id)', async () => {
    const res = await request(app)
      .put(`/api/formularios/${formularioBorradorId}`)
      .set('Authorization', `Bearer ${oficialToken}`)
      .send({ proposito: 'Propósito por Oficial' });
    expect(res.status).toBe(403);
    expect(res.body.error.codigo).toBe('NO_AUTORIZADO');
  });
});

describe('Endpoint de Login (SPEC-API-01)', () => {
  it('200 con credenciales válidas y retorna token + rol', async () => {
    const oficial = await prisma.oficial.findUnique({ where: { id: oficialId } });
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: oficial?.email, password: 'password123' });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('token');
    expect(res.body.rol).toBe('OFICIAL');
  });

  it('401 con credenciales inválidas', async () => {
    const oficial = await prisma.oficial.findUnique({ where: { id: oficialId } });
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: oficial?.email, password: 'wrongpassword' });
    expect(res.status).toBe(401);
    expect(res.body.error.codigo).toBe('CREDENCIALES_INVALIDAS');
  });

  it('422 con datos inválidos de entrada', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'no-email', password: '' });
    expect(res.status).toBe(422);
    expect(res.body.error.codigo).toBe('CAMPOS_INVALIDOS');
  });
});
