// SPEC-SEC-04: auditoría obligatoria en toda mutación (RNF-05, Art. 55)
// usuarioId es null hasta Sesión 6 (autenticación JWT)
import { PrismaClient, Prisma } from '@prisma/client';

export interface EventoAuditoria {
  accion: string;
  entidad: string;
  entidadId?: string;
  usuarioId: string | null;
  detalle?: Prisma.InputJsonValue;
}

export class AuditoriaRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async registrarEvento(evento: EventoAuditoria): Promise<void> {
    await this.prisma.logAuditoria.create({
      data: {
        accion: evento.accion,
        entidad: evento.entidad,
        entidadId: evento.entidadId ?? null,
        usuarioId: evento.usuarioId,
        detalle: evento.detalle,
      },
    });
  }
}
