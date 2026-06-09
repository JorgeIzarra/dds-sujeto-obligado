import { describe, it, expect, beforeEach } from 'vitest';
import { ClienteRepository } from '../../../src/infrastructure/persistence/repositories/ClienteRepository';
import { FormularioRepository } from '../../../src/infrastructure/persistence/repositories/FormularioRepository';
import { OficialRepository } from '../../../src/infrastructure/persistence/repositories/OficialRepository';
import { prisma } from './setup';

const clienteRepo = new ClienteRepository();
const formularioRepo = new FormularioRepository();
const oficialRepo = new OficialRepository();

describe('ClienteRepository — cifrado en BD', () => {
  let formularioId: string;

  beforeEach(async () => {
    const oficial = await oficialRepo.create({
      nombre: 'Oficial Test',
      cargo: 'OFICIAL',
      email: 'cliente-test@dds.com',
      hashPassword: 'hash123',
    });

    const formulario = await formularioRepo.create({
      proposito: 'Test cifrado cliente',
      oficialId: oficial.id,
    });

    formularioId = formulario.id;
  });

  it('debe crear y leer cliente con descifrado automático', async () => {
    const cliente = await clienteRepo.create({
      formularioId,
      nombre: 'María López',
      tipoDocumento: 'CÉDULA',
      numDocumento: '8-123-4567',
      nacionalidad: 'Panameña',
      tipoCliente: 'NATURAL',
      esPEP: false,
    });

    expect(cliente.nombre).toBe('María López');
    expect(cliente.numDocumento).toBe('8-123-4567');
    expect(cliente.tipoDocumento).toBe('CÉDULA');
  });

  it('NO debe exponer PII en consulta directa a BD (SPEC-SEC-01)', async () => {
    const raw = await prisma.$queryRaw<Array<{ nombre: string; num_documento: string }>>`SELECT nombre, num_documento FROM cliente LIMIT 1`;

    expect(raw.length).toBeGreaterThan(0);
    const nombreCifrado = String(raw[0].nombre);
    const docCifrado = String(raw[0].num_documento);

    // Debe tener formato iv:authTag:ciphertext
    expect(nombreCifrado).toMatch(/^[a-f0-9]+:[a-f0-9]+:[a-f0-9]+$/);
    expect(docCifrado).toMatch(/^[a-f0-9]+:[a-f0-9]+:[a-f0-9]+$/);

    // No debe contener el texto original
    expect(nombreCifrado).not.toContain('María López');
    expect(docCifrado).not.toContain('8-123-4567');
  });

  it('debe actualizar cliente correctamente', async () => {
    const actualizado = await clienteRepo.update(formularioId, {
      nombre: 'María López Actualizada',
    });

    expect(actualizado.nombre).toBe('María López Actualizada');
    expect(actualizado.numDocumento).toBe('8-123-4567');
  });

  it('debe encontrar cliente por formularioId', async () => {
    const encontrado = await clienteRepo.findByFormularioId(formularioId);
    expect(encontrado).not.toBeNull();
    expect(encontrado!.formularioId).toBe(formularioId);
    expect(encontrado!.nombre).toBe('María López Actualizada');
  });
});
