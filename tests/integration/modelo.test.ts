// SPEC-DATA-01..03 — Integración: crear y leer todas las entidades contra la BD
// Requiere: DATABASE_URL apuntando a postgres con la migración aplicada.
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { ClienteRepository } from '../../src/infrastructure/repositories/cliente.repository';

const prisma = new PrismaClient();
const clienteRepo = new ClienteRepository(prisma);

// Datos fijos para los tests de esta suite
const TEST_EMAIL = `oficial_test_${Date.now()}@dds.test`;
const TEST_FOLIO = `DDS-TEST-${Date.now()}`.slice(0, 20);

let oficialId: string;
let formularioId: string;

beforeAll(async () => {
  await prisma.$connect();
});

afterAll(async () => {
  // Limpieza en orden inverso de dependencias FK
  await prisma.logAuditoria.deleteMany({ where: { usuario: { email: TEST_EMAIL } } });
  await prisma.documento.deleteMany({ where: { formulario: { oficial: { email: TEST_EMAIL } } } });
  await prisma.perfilEconomico.deleteMany({
    where: { formulario: { oficial: { email: TEST_EMAIL } } },
  });
  await prisma.datosContacto.deleteMany({
    where: { formulario: { oficial: { email: TEST_EMAIL } } },
  });
  await prisma.cliente.deleteMany({ where: { formulario: { oficial: { email: TEST_EMAIL } } } });
  await prisma.formularioDDS.deleteMany({ where: { oficial: { email: TEST_EMAIL } } });
  await prisma.oficial.deleteMany({ where: { email: TEST_EMAIL } });
  await prisma.$disconnect();
});

describe('SPEC-DATA-03 — Oficial', () => {
  it('crea y recupera un Oficial', async () => {
    const oficial = await prisma.oficial.create({
      data: {
        nombre: 'Oficial de Prueba',
        cargo: 'OFICIAL',
        email: TEST_EMAIL,
        hashPassword: '$2b$10$placeholder_hash_for_tests',
      },
    });
    oficialId = oficial.id;
    expect(oficial.id).toBeTruthy();
    expect(oficial.email).toBe(TEST_EMAIL);

    const leido = await prisma.oficial.findUnique({ where: { id: oficial.id } });
    expect(leido?.nombre).toBe('Oficial de Prueba');
  });
});

describe('SPEC-DATA-01 — FormularioDDS', () => {
  it('crea un formulario en estado BORRADOR sin folio (VOL-S2-03)', async () => {
    const formulario = await prisma.formularioDDS.create({
      data: {
        proposito: 'Apertura de cuenta corriente',
        oficialId,
      },
    });
    formularioId = formulario.id;
    expect(formulario.estado).toBe('BORRADOR');
    expect(formulario.folio).toBeNull(); // folio asignado al guardar (SPEC-API-02)
  });

  it('asigna folio UNIQUE y cambia estado a GUARDADO', async () => {
    await prisma.formularioDDS.update({
      where: { id: formularioId },
      data: { folio: TEST_FOLIO, estado: 'GUARDADO' },
    });
    const leido = await prisma.formularioDDS.findUnique({ where: { id: formularioId } });
    expect(leido?.folio).toBe(TEST_FOLIO);
    expect(leido?.estado).toBe('GUARDADO');
  });

  it('la columna folio tiene restricción UNIQUE (SPEC-DATA-01)', async () => {
    await expect(
      prisma.formularioDDS.create({
        data: {
          folio: TEST_FOLIO, // folio duplicado
          proposito: 'Otro formulario',
          oficialId,
        },
      }),
    ).rejects.toThrow();
  });

  it('la secuencia seq_folio_dds existe y genera valores incrementales', async () => {
    const r1 = await prisma.$queryRaw<[{ nextval: bigint }]>`SELECT nextval('seq_folio_dds')`;
    const r2 = await prisma.$queryRaw<[{ nextval: bigint }]>`SELECT nextval('seq_folio_dds')`;
    expect(Number(r2[0].nextval)).toBeGreaterThan(Number(r1[0].nextval));
  });
});

describe('SPEC-DATA-02 — Cliente (campos PII a través de ClienteRepository)', () => {
  it('crea y lee un Cliente con cifrado transparente', async () => {
    const NOMBRE_PLANO = 'María García';
    const DOC_PLANO = '8-999-12345';

    const cliente = await clienteRepo.create({
      formularioId,
      nombre: NOMBRE_PLANO,
      tipoDocumento: 'CEDULA',
      numDocumento: DOC_PLANO,
      nacionalidad: 'Panameña',
      tipoCliente: 'NATURAL',
    });

    const leido = await clienteRepo.findById(cliente.id);
    expect(leido?.nombre).toBe(NOMBRE_PLANO);
    expect(leido?.numDocumento).toBe(DOC_PLANO);
  });
});

describe('SPEC-DATA-03 — DatosContacto', () => {
  it('crea y recupera datos de contacto', async () => {
    const contacto = await prisma.datosContacto.create({
      data: {
        formularioId,
        direccion: 'Calle 50, Edificio Plaza',
        telefono: '507-6000-0000',
        correo: 'cliente@example.com',
      },
    });
    expect(contacto.id).toBeTruthy();
    expect(contacto.correo).toBe('cliente@example.com');
  });
});

describe('SPEC-DATA-03 — PerfilEconomico', () => {
  it('crea y recupera perfil económico', async () => {
    const perfil = await prisma.perfilEconomico.create({
      data: {
        formularioId,
        actividad: 'Comercio al por menor',
        fuenteIngresos: 'Salario',
        ingresoMensual: 3500.0,
        volumenTransacciones: 5000.0,
      },
    });
    expect(Number(perfil.ingresoMensual)).toBeCloseTo(3500);
  });
});

describe('SPEC-DATA-03 — Documento', () => {
  it('crea y recupera un documento con timestamp automático', async () => {
    const doc = await prisma.documento.create({
      data: {
        formularioId,
        tipo: 'CEDULA_IDENTIDAD',
        baseLegal: 'Art. 24 Ley 23',
      },
    });
    expect(doc.verificado).toBe(false);
    expect(doc.fechaRecepcion).toBeInstanceOf(Date);
  });
});

describe('SPEC-DATA-03 — LogAuditoria', () => {
  it('crea un registro de auditoría con detalle JSON', async () => {
    const log = await prisma.logAuditoria.create({
      data: {
        usuarioId: oficialId,
        accion: 'CREAR',
        entidad: 'formulario_dds',
        entidadId: formularioId,
        detalle: { ip: '127.0.0.1', userAgent: 'test' },
      },
    });
    expect(log.id).toBeTruthy();
    expect(log.accion).toBe('CREAR');
    expect(log.detalle).toMatchObject({ ip: '127.0.0.1' });
  });

  it('permite log sin usuario (acción de sistema)', async () => {
    const log = await prisma.logAuditoria.create({
      data: {
        accion: 'ACCEDER',
        entidad: 'sistema',
      },
    });
    expect(log.usuarioId).toBeNull();
  });
});

describe('SPEC-DATA-01 — ON DELETE CASCADE', () => {
  it('al eliminar FormularioDDS se eliminan en cascada sus entidades hijas', async () => {
    const f = await prisma.formularioDDS.create({
      data: { proposito: 'Para test de cascade', oficialId },
    });
    await prisma.datosContacto.create({
      data: {
        formularioId: f.id,
        direccion: 'Dirección cascade',
        telefono: '000',
        correo: 'cascade@test.com',
      },
    });
    await prisma.formularioDDS.delete({ where: { id: f.id } });
    const contactos = await prisma.datosContacto.findMany({ where: { formularioId: f.id } });
    expect(contactos).toHaveLength(0);
  });
});
