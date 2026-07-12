// PerfilEconomicoRepository — persiste PerfilEconomico (RF-03, SPEC-API-05)
// Sin cifrado: SPEC-SEC-01 solo cifra cliente.nombre y cliente.numDocumento
import { PrismaClient, PerfilEconomico } from '@prisma/client';

interface PerfilInput {
  actividad: string;
  fuenteIngresos: string;
  ingresoMensual: number;
  volumenTransacciones: number;
}

export class PerfilEconomicoRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async upsertByFormularioId(formularioId: string, data: PerfilInput): Promise<PerfilEconomico> {
    const existing = await this.prisma.perfilEconomico.findFirst({ where: { formularioId } });
    if (existing) {
      return this.prisma.perfilEconomico.update({ where: { id: existing.id }, data });
    }
    return this.prisma.perfilEconomico.create({ data: { formularioId, ...data } });
  }
}
