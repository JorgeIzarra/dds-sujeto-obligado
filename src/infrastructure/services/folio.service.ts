// SPEC-DATA-01, SPEC-RN-03 — Generación de folio único desde seq_folio_dds (RF-07, RN-03)
// La atomicidad de nextval() en PostgreSQL es lo que resuelve DEF003 (folio duplicado bajo carga)
import { PrismaClient } from '@prisma/client';
import { formatearFolio } from '../../domain/folio';

interface NextvalRow {
  nextval: bigint;
}

export class FolioService {
  constructor(private readonly prisma: PrismaClient) {}

  async generar(): Promise<string> {
    const rows = await this.prisma.$queryRaw<NextvalRow[]>`SELECT nextval('seq_folio_dds') AS nextval`;
    const secuencia = Number(rows[0].nextval);
    const anio = new Date().getFullYear();
    return formatearFolio(anio, secuencia);
  }
}
