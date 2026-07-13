import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { AuditoriaRepository } from '../../src/infrastructure/repositories/auditoria.repository';

const prisma = new PrismaClient();
const auditoriaRepo = new AuditoriaRepository(prisma);

describe('AuditoriaRepository unit tests', () => {
  let oficialId: string;

  beforeAll(async () => {
    const oficial = await prisma.oficial.create({
      data: {
        nombre: 'Oficial Repo Unit',
        cargo: 'OFICIAL',
        email: `oficial-repo-${Date.now()}@test.com`,
        hashPassword: 'hash',
      },
    });
    oficialId = oficial.id;
  });

  afterAll(async () => {
    await prisma.logAuditoria.deleteMany({ where: { usuarioId: oficialId } });
    await prisma.oficial.deleteMany({ where: { id: oficialId } });
    await prisma.$disconnect();
  });

  it('registra evento con entidadId definido', async () => {
    await auditoriaRepo.registrarEvento({
      accion: 'TEST',
      entidad: 'test_entidad',
      entidadId: 'some-id-123',
      usuarioId: oficialId,
      detalle: { info: 'test' },
    });

    const log = await prisma.logAuditoria.findFirst({
      where: { usuarioId: oficialId, accion: 'TEST' },
    });

    expect(log).not.toBeNull();
    expect(log?.entidadId).toBe('some-id-123');
  });

  it('registra evento sin entidadId (cubre línea 21 ?? null)', async () => {
    await auditoriaRepo.registrarEvento({
      accion: 'TEST_NO_ID',
      entidad: 'test_entidad',
      usuarioId: oficialId,
    });

    const log = await prisma.logAuditoria.findFirst({
      where: { usuarioId: oficialId, accion: 'TEST_NO_ID' },
    });

    expect(log).not.toBeNull();
    expect(log?.entidadId).toBeNull(); // Se resolvió a null
  });
});
