// SPEC-BHV-05 — Concurrencia de folios (RF-07, RN-03, DEF003)
// Given 50 solicitudes concurrentes de generación de folio
// When se generan los folios
// Then todos son únicos (0 duplicados) y siguen el patrón DDS-AAAA-NNNNNN (CA-03)
import { describe, it, expect, afterAll } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { FolioService } from '../../src/infrastructure/services/folio.service';

const prisma = new PrismaClient();
const folioService = new FolioService(prisma);

afterAll(async () => {
  await prisma.$disconnect();
});

describe('FolioService.generar() — concurrencia (SPEC-BHV-05, DEF003)', () => {
  it('genera un folio individual con el patrón correcto', async () => {
    const folio = await folioService.generar();
    expect(folio).toMatch(/^DDS-\d{4}-\d{6}$/);
  });

  it('50 generaciones concurrentes producen 0 folios duplicados (CA-03)', async () => {
    const llamadas = Array.from({ length: 50 }, () => folioService.generar());
    const folios = await Promise.all(llamadas);

    const unicos = new Set(folios);
    expect(unicos.size).toBe(50);

    for (const folio of folios) {
      expect(folio).toMatch(/^DDS-\d{4}-\d{6}$/);
    }
  });
});
