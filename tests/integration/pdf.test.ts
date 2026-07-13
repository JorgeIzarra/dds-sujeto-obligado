// SPEC-API-08: Exportar a PDF (RF-11, resuelve DEF007)
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
let formularioId: string;

beforeAll(async () => {
  app = createApp();

  // Crear oficial de prueba
  const oficial = await prisma.oficial.create({
    data: {
      nombre: 'Oficial PDF Test',
      cargo: 'OFICIAL',
      email: `oficial-pdf-${Date.now()}@test.com`,
      hashPassword: 'hash',
    },
  });
  oficialId = oficial.id;
  token = signToken({ id: oficialId, email: oficial.email, rol: 'OFICIAL' });

  // Crear formulario de prueba con cliente, contacto, etc.
  const f = await prisma.formularioDDS.create({
    data: {
      proposito: 'Prueba de exportación PDF',
      estado: 'GUARDADO',
      folio: `DDS-2026-${String(Math.floor(Math.random() * 1000000)).padStart(6, '0')}`,
      oficialId,
    },
  });
  formularioId = f.id;

  await prisma.cliente.create({
    data: {
      formularioId,
      nombre: encrypt('Cliente PDF'),
      tipoDocumento: 'CEDULA',
      numDocumento: encrypt('8-999-9999'),
      nacionalidad: 'Panameña',
      tipoCliente: 'NATURAL',
      esPep: false,
    },
  });

  await prisma.datosContacto.create({
    data: {
      formularioId,
      direccion: 'Ciudad de Panamá',
      telefono: '555-5555',
      correo: 'clientepdf@test.com',
    },
  });
});

afterAll(async () => {
  await prisma.cliente.deleteMany({ where: { formularioId } });
  await prisma.datosContacto.deleteMany({ where: { formularioId } });
  await prisma.formularioDDS.deleteMany({ where: { oficialId } });
  await prisma.oficial.deleteMany({ where: { id: oficialId } });
  await prisma.$disconnect();
});

describe('GET /api/formularios/:id/pdf (SPEC-API-08)', () => {
  it('404 si el formulario no existe', async () => {
    const res = await request(app)
      .get('/api/formularios/00000000-0000-0000-0000-000000000000/pdf')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(404);
    expect(res.body.error.codigo).toBe('FORMULARIO_NO_ENCONTRADO');
  });

  it('202 Accepted al iniciar y devuelve un jobId', async () => {
    const res = await request(app)
      .get(`/api/formularios/${formularioId}/pdf`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(202);
    expect(res.body).toHaveProperty('jobId');
    expect(res.body.jobId).toBeTypeOf('string');
  });

  it('404 para un jobId inexistente', async () => {
    const res = await request(app)
      .get(`/api/formularios/${formularioId}/pdf/00000000-0000-0000-0000-000000000000`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(404);
    expect(res.body.error.codigo).toBe('JOB_NO_ENCONTRADO');
  });

  it('retorna 200 y el PDF cuando se completa el trabajo asíncrono', async () => {
    // 1. Iniciar exportación
    const exportRes = await request(app)
      .get(`/api/formularios/${formularioId}/pdf`)
      .set('Authorization', `Bearer ${token}`);
    const { jobId } = exportRes.body;

    // 2. Esperar un momento a que se complete la generación asíncrona (setTimeout)
    await new Promise((resolve) => setTimeout(resolve, 100));

    // 3. Consultar estado del trabajo (polling)
    const pollRes = await request(app)
      .get(`/api/formularios/${formularioId}/pdf/${jobId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(pollRes.status).toBe(200);
    if (pollRes.status === 200) {
      expect(pollRes.header['content-type']).toBe('application/pdf');
      expect(pollRes.header['content-disposition']).toContain('attachment');
      expect(pollRes.body).toBeInstanceOf(Buffer);

      // Verificar que el log de auditoría se haya registrado
      const log = await prisma.logAuditoria.findFirst({
        where: { entidad: 'formulario_dds', accion: 'EXPORTAR', entidadId: formularioId },
        orderBy: { timestamp: 'desc' },
      });
      expect(log).not.toBeNull();
      expect(log?.usuarioId).toBe(oficialId);
    }
  });
});
