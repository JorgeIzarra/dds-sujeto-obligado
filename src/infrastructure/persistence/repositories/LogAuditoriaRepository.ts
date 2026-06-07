import type { Prisma } from '@prisma/client';
import { getPrismaClient } from '../prisma-client';
import { LogAuditoria, LogAuditoriaProps } from '../../../domain/entities/LogAuditoria';

type LogAuditoriaRecord = Prisma.LogAuditoriaGetPayload<object>;

const prisma = getPrismaClient();

export class LogAuditoriaRepository {
  async create(props: LogAuditoriaProps): Promise<LogAuditoria> {
    const record = await prisma.logAuditoria.create({
      data: {
        usuarioId: props.usuarioId ?? null,
        accion: props.accion,
        entidad: props.entidad,
        entidadId: props.entidadId ?? null,
        ...(props.detalle !== undefined && props.detalle !== null
          ? { detalle: props.detalle as Prisma.InputJsonValue }
          : {}),
      },
    });
    return toDomain(record);
  }

  async findByEntidad(entidad: string, entidadId: string): Promise<LogAuditoria[]> {
    const records = await prisma.logAuditoria.findMany({
      where: { entidad, entidadId },
      orderBy: { timestamp: 'desc' },
    });
    return records.map(toDomain);
  }
}

function toDomain(record: LogAuditoriaRecord): LogAuditoria {
  return new LogAuditoria({
    id: record.id,
    timestamp: record.timestamp,
    usuarioId: record.usuarioId,
    accion: record.accion,
    entidad: record.entidad,
    entidadId: record.entidadId,
    detalle: record.detalle as Record<string, unknown> | null,
  });
}
