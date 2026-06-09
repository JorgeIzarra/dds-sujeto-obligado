// SPEC-SEC-01 — Cifrado en reposo: verificación contra la BD real
// Criterio: un SELECT directo a la BD no devuelve el dato en claro.
// Este test va PRIMERO (spec-driven) y falla hasta que ClienteRepository cifra.
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { ClienteRepository } from '../../src/infrastructure/repositories/cliente.repository';

const prisma = new PrismaClient();
const clienteRepo = new ClienteRepository(prisma);

const EMAIL_SEC = `oficial_sec_${Date.now()}@dds.test`;
let oficialId: string;
let formularioId: string;

beforeAll(async () => {
  await prisma.$connect();
  const oficial = await prisma.oficial.create({
    data: {
      nombre: 'Oficial Seguridad',
      cargo: 'OFICIAL',
      email: EMAIL_SEC,
      hashPassword: '$2b$10$placeholder',
    },
  });
  oficialId = oficial.id;
  const formulario = await prisma.formularioDDS.create({
    data: { proposito: 'Test cifrado', oficialId },
  });
  formularioId = formulario.id;
});

afterAll(async () => {
  await prisma.cliente.deleteMany({ where: { formularioId } });
  await prisma.formularioDDS.delete({ where: { id: formularioId } });
  await prisma.oficial.delete({ where: { id: oficialId } });
  await prisma.$disconnect();
});

describe('SPEC-SEC-01 — cifrado en reposo verificado en BD', () => {
  it('nombre almacenado en BD no es el plaintext (SELECT directo ≠ dato en claro)', async () => {
    const NOMBRE = 'Roberto Morales';
    const cliente = await clienteRepo.create({
      formularioId,
      nombre: NOMBRE,
      tipoDocumento: 'CEDULA',
      numDocumento: '4-567-89012',
      nacionalidad: 'Panameño',
      tipoCliente: 'NATURAL',
    });

    // SELECT directo a la BD — debe devolver ciphertext, no el plaintext
    const rows = await prisma.$queryRaw<[{ nombre: string }]>`
      SELECT nombre FROM cliente WHERE id = ${cliente.id}::uuid
    `;
    const nombreEnBD = rows[0].nombre;

    expect(nombreEnBD).not.toBe(NOMBRE);
    expect(nombreEnBD).not.toContain('Roberto');
    // El valor almacenado es base64 válido con longitud > plaintext
    expect(Buffer.from(nombreEnBD, 'base64').length).toBeGreaterThan(NOMBRE.length);
  });

  it('num_documento almacenado en BD no es el plaintext', async () => {
    const DOC = '4-567-89013';
    const cliente = await clienteRepo.create({
      formularioId,
      nombre: 'Otro Cliente',
      tipoDocumento: 'CEDULA',
      numDocumento: DOC,
      nacionalidad: 'Panameño',
      tipoCliente: 'NATURAL',
    });

    const rows = await prisma.$queryRaw<[{ num_documento: string }]>`
      SELECT num_documento FROM cliente WHERE id = ${cliente.id}::uuid
    `;
    expect(rows[0].num_documento).not.toBe(DOC);
    expect(rows[0].num_documento).not.toContain('567');
  });

  it('ClienteRepository descifra correctamente al leer', async () => {
    const NOMBRE = 'Silvia Castillo';
    const DOC = '3-111-22222';
    const cliente = await clienteRepo.create({
      formularioId,
      nombre: NOMBRE,
      tipoDocumento: 'CEDULA',
      numDocumento: DOC,
      nacionalidad: 'Panameña',
      tipoCliente: 'NATURAL',
    });

    const leido = await clienteRepo.findById(cliente.id);
    expect(leido?.nombre).toBe(NOMBRE);
    expect(leido?.numDocumento).toBe(DOC);
  });
});
