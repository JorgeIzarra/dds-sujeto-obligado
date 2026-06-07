import { describe, it, expect } from 'vitest';
import { FormularioRepository } from '../../../src/infrastructure/persistence/repositories/FormularioRepository';
import { OficialRepository } from '../../../src/infrastructure/persistence/repositories/OficialRepository';
import './setup';

const formularioRepo = new FormularioRepository();
const oficialRepo = new OficialRepository();

describe('FormularioRepository (integración)', () => {
  it('debe crear un formulario en BD', async () => {
    const oficial = await oficialRepo.create({
      nombre: 'Oficial Test',
      cargo: 'OFICIAL',
      email: 'test@dds.com',
      hashPassword: 'hash123',
    });

    const formulario = await formularioRepo.create({
      proposito: 'Relación comercial de prueba',
      oficialId: oficial.id,
    });

    expect(formulario.id).toBeDefined();
    expect(formulario.proposito).toBe('Relación comercial de prueba');
    expect(formulario.estado).toBe('BORRADOR');
    expect(formulario.folio).toBeNull();
  });

  it('debe buscar formulario por id', async () => {
    const oficial = await oficialRepo.create({
      nombre: 'Oficial Test',
      cargo: 'OFICIAL',
      email: 'test2@dds.com',
      hashPassword: 'hash456',
    });

    const creado = await formularioRepo.create({
      proposito: 'Prueba búsqueda',
      oficialId: oficial.id,
    });

    const encontrado = await formularioRepo.findById(creado.id);
    expect(encontrado).not.toBeNull();
    expect(encontrado!.id).toBe(creado.id);
    expect(encontrado!.proposito).toBe('Prueba búsqueda');
  });

  it('debe buscar formulario por folio', async () => {
    const oficial = await oficialRepo.create({
      nombre: 'Oficial Test',
      cargo: 'OFICIAL',
      email: 'folio@dds.com',
      hashPassword: 'hash789',
    });

    const creado = await formularioRepo.create({
      proposito: 'Prueba folio',
      oficialId: oficial.id,
    });

    await formularioRepo.update(creado.id, {
      folio: 'DDS-2026-000001',
      estado: 'GUARDADO',
    });

    const encontrado = await formularioRepo.findByFolio('DDS-2026-000001');
    expect(encontrado).not.toBeNull();
    expect(encontrado!.id).toBe(creado.id);
    expect(encontrado!.folio).toBe('DDS-2026-000001');
    expect(encontrado!.estaGuardado()).toBe(true);
  });

  it('debe actualizar estado del formulario', async () => {
    const oficial = await oficialRepo.create({
      nombre: 'Oficial Test',
      cargo: 'SUPERVISOR',
      email: 'update@dds.com',
      hashPassword: 'hash000',
    });

    const creado = await formularioRepo.create({
      proposito: 'Prueba actualización',
      oficialId: oficial.id,
    });

    expect(creado.esBorrador()).toBe(true);

    const formActualizado = await formularioRepo.update(creado.id, {
      estado: 'APROBADO',
    });

    expect(formActualizado.estaAprobado()).toBe(true);
  });
});
