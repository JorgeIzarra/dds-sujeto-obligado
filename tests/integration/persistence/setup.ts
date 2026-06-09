import { beforeAll, afterAll, beforeEach } from 'vitest';
import { getPrismaClient } from '../../../src/infrastructure/persistence/prisma-client';

const prisma = getPrismaClient();

export async function setupTestDB(): Promise<void> {
  await prisma.$connect();
}

export async function teardownTestDB(): Promise<void> {
  await prisma.$disconnect();
}

export async function cleanTestDB(): Promise<void> {
  await prisma.logAuditoria.deleteMany();
  await prisma.documento.deleteMany();
  await prisma.perfilEconomico.deleteMany();
  await prisma.datosContacto.deleteMany();
  await prisma.cliente.deleteMany();
  await prisma.formularioDDS.deleteMany();
  await prisma.oficial.deleteMany();
}

beforeAll(async () => {
  await setupTestDB();
});

beforeEach(async () => {
  await cleanTestDB();
});

afterAll(async () => {
  await teardownTestDB();
});

export { prisma };
