// SPEC-API-09: Búsqueda (resuelve DEF004; SPEC-SEC-03)
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
let token: string;
let form1Id: string;
let form2Id: string;

beforeAll(async () => {
  app = createApp();

  // Crear oficial de prueba
  const oficial = await prisma.oficial.create({
    data: {
      nombre: 'Oficial Busqueda Test',
      cargo: 'OFICIAL',
      email: `oficial-busqueda-${Date.now()}@test.com`,
      hashPassword: 'hash',
    },
  });
  oficialId = oficial.id;
  token = signToken({ id: oficialId, email: oficial.email, rol: 'OFICIAL' });

  // Formulario 1: Folio DDS-2026-111111, Cliente Ana Lopez
  const f1 = await prisma.formularioDDS.create({
    data: {
      proposito: 'Búsqueda Form 1',
      estado: 'GUARDADO',
      folio: 'DDS-2026-111111',
      oficialId,
    },
  });
  form1Id = f1.id;

  await prisma.cliente.create({
    data: {
      formularioId: form1Id,
      nombre: encrypt('Ana Lopez'),
      tipoDocumento: 'CEDULA',
      numDocumento: encrypt('8-111-1111'),
      nacionalidad: 'Panameña',
      tipoCliente: 'NATURAL',
    },
  });

  // Formulario 2: Folio DDS-2026-222222, Cliente Carlos Perez
  const f2 = await prisma.formularioDDS.create({
    data: {
      proposito: 'Búsqueda Form 2',
      estado: 'GUARDADO',
      folio: 'DDS-2026-222222',
      oficialId,
    },
  });
  form2Id = f2.id;

  await prisma.cliente.create({
    data: {
      formularioId: form2Id,
      nombre: encrypt('Carlos Perez'),
      tipoDocumento: 'CEDULA',
      numDocumento: encrypt('8-222-2222'),
      nacionalidad: 'Panameño',
      tipoCliente: 'NATURAL',
    },
  });
});

afterAll(async () => {
  await prisma.cliente.deleteMany({ where: { formularioId: { in: [form1Id, form2Id] } } });
  await prisma.formularioDDS.deleteMany({ where: { oficialId } });
  await prisma.oficial.deleteMany({ where: { id: oficialId } });
  await prisma.$disconnect();
});

describe('GET /api/formularios (Búsqueda, SPEC-API-09)', () => {
  it('retorna todos los formularios si no se envían parámetros', async () => {
    const res = await request(app)
      .get('/api/formularios')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body).toBeInstanceOf(Array);
    const ids = res.body.map((f: any) => f.id);
    expect(ids).toContain(form1Id);
    expect(ids).toContain(form2Id);
  });

  it('búsqueda por folio exacto', async () => {
    const res = await request(app)
      .get('/api/formularios?folio=DDS-2026-111111')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].id).toBe(form1Id);
    expect(res.body[0].nombre).toBe('Ana Lopez');
  });

  it('búsqueda por folio parcial (insensible a mayúsculas)', async () => {
    const res = await request(app)
      .get('/api/formularios?folio=222222')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].id).toBe(form2Id);
    expect(res.body[0].nombre).toBe('Carlos Perez');
  });

  it('búsqueda por nombre de cliente parcial (insensible a mayúsculas, descifrado)', async () => {
    const res = await request(app)
      .get('/api/formularios?nombre=ana')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].id).toBe(form1Id);
    expect(res.body[0].nombre).toBe('Ana Lopez');
  });

  it('búsqueda combinada por folio y nombre de cliente', async () => {
    const res = await request(app)
      .get('/api/formularios?folio=222222&nombre=carlos')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].id).toBe(form2Id);
    expect(res.body[0].nombre).toBe('Carlos Perez');
  });

  it('anti-inyección SQL: trata strings maliciosos como literales (SPEC-SEC-03, DEF004)', async () => {
    const res = await request(app)
      .get("/api/formularios?nombre='; DROP TABLE cliente; --")
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(0); // Ningún registro coincide con ese literal

    // Verificar que las tablas siguen existiendo
    const count = await prisma.cliente.count();
    expect(count).toBeGreaterThanOrEqual(2);
  });
});
