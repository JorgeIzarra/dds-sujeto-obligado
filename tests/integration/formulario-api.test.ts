import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import { createApp } from '../../src/interfaces/app';
import { signToken } from '../../src/security/jwt.service';
import { encrypt } from '../../src/security/crypto.service';

const prisma = new PrismaClient();
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let app: any;
let oficialId: string;
let supervisorId: string;
let oficialToken: string;
let supervisorToken: string;

beforeAll(async () => {
  app = createApp();

  // Crear oficial
  const oficial = await prisma.oficial.create({
    data: {
      nombre: 'Oficial API Test',
      cargo: 'OFICIAL',
      email: `oficial-api-${Date.now()}@test.com`,
      hashPassword: 'hash',
    },
  });
  oficialId = oficial.id;
  oficialToken = signToken({ id: oficialId, email: oficial.email, rol: 'OFICIAL' });

  // Crear supervisor
  const supervisor = await prisma.oficial.create({
    data: {
      nombre: 'Supervisor API Test',
      cargo: 'SUPERVISOR',
      email: `supervisor-api-${Date.now()}@test.com`,
      hashPassword: 'hash',
    },
  });
  supervisorId = supervisor.id;
  supervisorToken = signToken({ id: supervisorId, email: supervisor.email, rol: 'SUPERVISOR' });
});

afterAll(async () => {
  await prisma.formularioDDS.deleteMany({
    where: { oficialId: { in: [oficialId, supervisorId] } },
  });
  await prisma.oficial.deleteMany({
    where: { id: { in: [oficialId, supervisorId] } },
  });
  await prisma.$disconnect();
});

describe('Formulario API Endpoints', () => {
  let createdFormId: string;

  it('POST /api/formularios — crea un formulario borrador vacío', async () => {
    const res = await request(app)
      .post('/api/formularios')
      .set('Authorization', `Bearer ${oficialToken}`);

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('id');
    createdFormId = res.body.id;
  });

  it('POST /api/formularios — falla sin token de autenticación', async () => {
    const res = await request(app).post('/api/formularios');
    expect(res.status).toBe(401);
  });

  it('GET /api/formularios/:id — recupera los detalles del formulario', async () => {
    // Agregar un cliente encriptado
    await prisma.cliente.create({
      data: {
        formularioId: createdFormId,
        nombre: encrypt('Cliente Secreto'),
        tipoDocumento: 'PASAPORTE',
        numDocumento: encrypt('PE-987654'),
        nacionalidad: 'Panameña',
        tipoCliente: 'NATURAL',
        esPep: false,
      },
    });

    const res = await request(app)
      .get(`/api/formularios/${createdFormId}`)
      .set('Authorization', `Bearer ${oficialToken}`);

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(createdFormId);
    expect(res.body.estado).toBe('BORRADOR');
    expect(res.body.cliente).not.toBeNull();
    expect(res.body.cliente.nombre).toBe('Cliente Secreto'); // Descifrado
    expect(res.body.cliente.numDocumento).toBe('PE-987654'); // Descifrado
  });

  it('GET /api/formularios/:id — devuelve 404 si no existe', async () => {
    const res = await request(app)
      .get('/api/formularios/00000000-0000-0000-0000-000000000000')
      .set('Authorization', `Bearer ${oficialToken}`);
    expect(res.status).toBe(404);
  });

  it('PUT /api/formularios/:id — supervisor puede editar el propósito', async () => {
    const res = await request(app)
      .put(`/api/formularios/${createdFormId}`)
      .set('Authorization', `Bearer ${supervisorToken}`)
      .send({ proposito: 'Propósito Supervisor Editado' });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });

    // Verificar en base de datos
    const dbForm = await prisma.formularioDDS.findUnique({ where: { id: createdFormId } });
    expect(dbForm?.proposito).toBe('Propósito Supervisor Editado');
  });

  it('PUT /api/formularios/:id — supervisor recibe 422 si manda body inválido', async () => {
    const res = await request(app)
      .put(`/api/formularios/${createdFormId}`)
      .set('Authorization', `Bearer ${supervisorToken}`)
      .send({ proposito: '' }); // vacío

    expect(res.status).toBe(422);
    expect(res.body.error.codigo).toBe('CAMPOS_INVALIDOS');
  });

  it('PUT /api/formularios/:id — oficial no puede editar (403 forbidden)', async () => {
    const res = await request(app)
      .put(`/api/formularios/${createdFormId}`)
      .set('Authorization', `Bearer ${oficialToken}`)
      .send({ proposito: 'Propósito Oficial' });

    expect(res.status).toBe(403);
  });
});
