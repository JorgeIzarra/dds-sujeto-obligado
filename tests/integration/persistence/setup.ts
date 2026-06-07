import { PrismaClient } from '@prisma/client';
import { beforeAll, afterAll, afterEach } from 'vitest';

let prisma: PrismaClient;

export async function setupTestDB(): Promise<PrismaClient> {
  if (!prisma) {
    prisma = new PrismaClient();
    await prisma.$connect();
  }
  return prisma;
}

export async function teardownTestDB(): Promise<void> {
  if (prisma) {
    await prisma.$disconnect();
  }
}

export async function cleanTestDB(): Promise<void> {
  if (!prisma) return;
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

afterEach(async () => {
  await cleanTestDB();
});

afterAll(async () => {
  await teardownTestDB();
});

export { prisma };
