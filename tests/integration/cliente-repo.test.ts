// ClienteRepository — cobertura de ramas no ejercitadas en modelo.test.ts
// Cubre: findById con ID inexistente (rama null), findByFormularioId con
// resultados (map callback), y findByFormularioId con resultado vacío.
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { ClienteRepository } from '../../src/infrastructure/repositories/cliente.repository';

const prisma = new PrismaClient();
const repo = new ClienteRepository(prisma);

const EMAIL = `oficial_repo_${Date.now()}@dds.test`;
let oficialId: string;
let formularioId: string;

beforeAll(async () => {
  await prisma.$connect();
  const oficial = await prisma.oficial.create({
    data: {
      nombre: 'Oficial Repo Coverage',
      cargo: 'OFICIAL',
      email: EMAIL,
      hashPassword: '$2b$10$placeholder',
    },
  });
  oficialId = oficial.id;
  const formulario = await prisma.formularioDDS.create({
    data: { proposito: 'Test cobertura repositorio', oficialId },
  });
  formularioId = formulario.id;
});

afterAll(async () => {
  await prisma.cliente.deleteMany({ where: { formularioId } });
  await prisma.formularioDDS.deleteMany({ where: { oficial: { email: EMAIL } } });
  await prisma.oficial.delete({ where: { id: oficialId } });
  await prisma.$disconnect();
});

describe('ClienteRepository — ramas sin cobertura previa', () => {
  it('findById con UUID inexistente devuelve null (rama !row → true)', async () => {
    const resultado = await repo.findById('00000000-0000-0000-0000-000000000000');
    expect(resultado).toBeNull();
  });

  it('findByFormularioId devuelve array con clientes descifrados (map callback)', async () => {
    await repo.create({
      formularioId,
      nombre: 'Luis Fernández',
      tipoDocumento: 'CEDULA',
      numDocumento: '5-888-77777',
      nacionalidad: 'Panameño',
      tipoCliente: 'NATURAL',
    });
    await repo.create({
      formularioId,
      nombre: 'Elena Sánchez',
      tipoDocumento: 'PASAPORTE',
      numDocumento: 'P1234567',
      nacionalidad: 'Panameña',
      tipoCliente: 'NATURAL',
    });

    const clientes = await repo.findByFormularioId(formularioId);
    expect(clientes).toHaveLength(2);
    const nombres = clientes.map((c) => c.nombre);
    expect(nombres).toContain('Luis Fernández');
    expect(nombres).toContain('Elena Sánchez');
    // Descifrado: documentos deben ser texto legible, no ciphertext en base64
    for (const c of clientes) {
      expect(c.numDocumento.length).toBeLessThan(50);
    }
  });

  it('findByFormularioId con formulario sin clientes devuelve array vacío', async () => {
    const f = await prisma.formularioDDS.create({
      data: { proposito: 'Formulario sin clientes', oficialId },
    });
    const resultado = await repo.findByFormularioId(f.id);
    expect(resultado).toHaveLength(0);
    await prisma.formularioDDS.delete({ where: { id: f.id } });
  });
});
