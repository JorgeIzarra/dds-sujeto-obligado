// SPEC-API-07 — POST /api/formularios/:id/guardar (RF-07, RF-08, RN-03, RN-04, RF-12, RN-02)
// SPEC-BHV-06: formulario sin documento de identidad verificado → bloqueado
// SPEC-BHV-02: Cliente PEP → bloqueado con 409 y mensaje regulatorio (DEF006)
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import { createApp } from '../../src/interfaces/app';
import { signToken } from '../../src/security/jwt.service';

const prisma = new PrismaClient();
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let app: any;
let oficialId: string;
let token: string;

beforeAll(async () => {
  app = createApp();
  const oficial = await prisma.oficial.create({
    data: {
      nombre: 'Oficial Test Guardar',
      cargo: 'OFICIAL',
      email: `test-guardar-${Date.now()}@test.com`,
      hashPassword: 'hash',
    },
  });
  oficialId = oficial.id;
  token = signToken({ id: oficialId, email: oficial.email, rol: 'OFICIAL' });
});

afterAll(async () => {
  await prisma.formularioDDS.deleteMany({ where: { oficialId } });
  await prisma.oficial.deleteMany({ where: { id: oficialId } });
  await prisma.$disconnect();
});

async function crearFormularioVacio(): Promise<string> {
  const f = await prisma.formularioDDS.create({
    data: { proposito: 'Test guardar', oficialId },
  });
  return f.id;
}

async function crearFormularioCompleto(opts: {
  documentoVerificado: boolean;
  tieneDocumento: boolean;
  esPEP?: boolean;
}): Promise<string> {
  const formularioId = await crearFormularioVacio();
  await prisma.cliente.create({
    data: {
      formularioId,
      nombre: 'cliente-guardar',
      tipoDocumento: 'CEDULA',
      numDocumento: 'doc-guardar',
      nacionalidad: 'Panameña',
      tipoCliente: 'NATURAL',
      esPep: opts.esPEP ?? false,
    },
  });
  await prisma.datosContacto.create({
    data: { formularioId, direccion: 'Calle 1', telefono: '6000-1234', correo: 'test@test.com' },
  });
  await prisma.perfilEconomico.create({
    data: {
      formularioId,
      actividad: 'Comercio',
      fuenteIngresos: 'Salario',
      ingresoMensual: 3000,
      volumenTransacciones: 5000,
    },
  });
  if (opts.tieneDocumento) {
    await prisma.documento.create({
      data: { formularioId, tipo: 'CEDULA', verificado: opts.documentoVerificado },
    });
  }
  return formularioId;
}

describe('POST /api/formularios/:id/guardar (SPEC-API-07, RF-07, RF-08, RN-04, RF-12, RN-02)', () => {
  it('404 — formulario inexistente', async () => {
    const res = await request(app)
      .post('/api/formularios/00000000-0000-0000-0000-000000000000/guardar')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(404);
    expect(res.body.error.codigo).toBe('FORMULARIO_NO_ENCONTRADO');
  });

  it('422 — formulario recién creado sin ninguna sección (RF-08)', async () => {
    const formularioId = await crearFormularioVacio();
    const res = await request(app)
      .post(`/api/formularios/${formularioId}/guardar`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(422);
    expect(res.body.error.codigo).toBe('FORMULARIO_INCOMPLETO');
    expect(res.body.error.campos.secciones).toEqual(
      expect.arrayContaining(['cliente', 'datosContacto', 'perfilEconomico']),
    );
  });

  it('422 — falta solo datosContacto (RF-08)', async () => {
    const formularioId = await crearFormularioVacio();
    await prisma.cliente.create({
      data: {
        formularioId,
        nombre: 'x',
        tipoDocumento: 'CEDULA',
        numDocumento: 'y',
        nacionalidad: 'Panameña',
        tipoCliente: 'NATURAL',
        esPep: false,
      },
    });
    await prisma.perfilEconomico.create({
      data: {
        formularioId,
        actividad: 'a',
        fuenteIngresos: 'b',
        ingresoMensual: 100,
        volumenTransacciones: 100,
      },
    });
    const res = await request(app)
      .post(`/api/formularios/${formularioId}/guardar`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(422);
    expect(res.body.error.codigo).toBe('FORMULARIO_INCOMPLETO');
    expect(res.body.error.campos.secciones).toEqual(['datosContacto']);
  });

  it('422 — sin documento de identidad (RN-04, CA-08, SPEC-BHV-06)', async () => {
    const formularioId = await crearFormularioCompleto({
      tieneDocumento: false,
      documentoVerificado: false,
    });
    const res = await request(app)
      .post(`/api/formularios/${formularioId}/guardar`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(422);
    expect(res.body.error.codigo).toBe('DOCUMENTO_IDENTIDAD_NO_VERIFICADO');
  });

  it('422 — documento de identidad presente pero no verificado (RN-04, CA-08, SPEC-BHV-06)', async () => {
    const formularioId = await crearFormularioCompleto({
      tieneDocumento: true,
      documentoVerificado: false,
    });
    const res = await request(app)
      .post(`/api/formularios/${formularioId}/guardar`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(422);
    expect(res.body.error.codigo).toBe('DOCUMENTO_IDENTIDAD_NO_VERIFICADO');
  });

  it('422 — documento verificado pero de tipo distinto al del cliente (RN-04, coincidencia exacta)', async () => {
    const formularioId = await crearFormularioVacio();
    await prisma.cliente.create({
      data: {
        formularioId,
        nombre: 'cliente-tipo-distinto',
        tipoDocumento: 'CEDULA',
        numDocumento: 'doc-tipo-distinto',
        nacionalidad: 'Panameña',
        tipoCliente: 'NATURAL',
        esPep: false,
      },
    });
    await prisma.datosContacto.create({
      data: { formularioId, direccion: 'Calle 1', telefono: '6000-1234', correo: 'test@test.com' },
    });
    await prisma.perfilEconomico.create({
      data: {
        formularioId,
        actividad: 'Comercio',
        fuenteIngresos: 'Salario',
        ingresoMensual: 3000,
        volumenTransacciones: 5000,
      },
    });
    // Documento verificado, pero de tipo PASAPORTE mientras el cliente tiene tipoDocumento CEDULA
    await prisma.documento.create({
      data: { formularioId, tipo: 'PASAPORTE', verificado: true },
    });
    const res = await request(app)
      .post(`/api/formularios/${formularioId}/guardar`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(422);
    expect(res.body.error.codigo).toBe('DOCUMENTO_IDENTIDAD_NO_VERIFICADO');
  });

  it('409 — Cliente PEP es rechazado y redirigido (RN-02, SPEC-BHV-02, DEF006, RF-12)', async () => {
    const formularioId = await crearFormularioCompleto({
      tieneDocumento: true,
      documentoVerificado: true,
      esPEP: true,
    });
    const res = await request(app)
      .post(`/api/formularios/${formularioId}/guardar`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(409);
    expect(res.body.error.codigo).toBe('PEP_NO_ELEGIBLE');
    expect(res.body.error.mensaje).toBe('Cliente PEP: requiere Diligencia Reforzada (Art. 26)');
  });

  it('200 — happy path: genera folio y cambia estado a GUARDADO (CA-03)', async () => {
    const formularioId = await crearFormularioCompleto({
      tieneDocumento: true,
      documentoVerificado: true,
    });
    const res = await request(app)
      .post(`/api/formularios/${formularioId}/guardar`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.folio).toMatch(/^DDS-\d{4}-\d{6}$/);
    expect(res.body.estado).toBe('GUARDADO');

    const formulario = await prisma.formularioDDS.findUnique({ where: { id: formularioId } });
    expect(formulario?.folio).toBe(res.body.folio);
    expect(formulario?.estado).toBe('GUARDADO');
  });

  it('registra evento GUARDAR en log_auditoria con usuarioId real (SPEC-SEC-04)', async () => {
    const formularioId = await crearFormularioCompleto({
      tieneDocumento: true,
      documentoVerificado: true,
    });
    const res = await request(app)
      .post(`/api/formularios/${formularioId}/guardar`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);

    const log = await prisma.logAuditoria.findFirst({
      where: { entidad: 'formulario_dds', accion: 'GUARDAR', entidadId: formularioId },
      orderBy: { timestamp: 'desc' },
    });
    expect(log).not.toBeNull();
    expect(log?.usuarioId).toBe(oficialId);
    expect(log?.detalle).toMatchObject({ folio: res.body.folio });
  });
});
