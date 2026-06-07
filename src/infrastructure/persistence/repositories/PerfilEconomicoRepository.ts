import type { Prisma } from '@prisma/client';
import { getPrismaClient } from '../prisma-client';
import { PerfilEconomico, PerfilEconomicoProps } from '../../../domain/entities/PerfilEconomico';

type PerfilEconomicoRecord = Prisma.PerfilEconomicoGetPayload<object>;

const prisma = getPrismaClient();

export class PerfilEconomicoRepository {
  async create(props: PerfilEconomicoProps): Promise<PerfilEconomico> {
    const record = await prisma.perfilEconomico.create({
      data: {
        formularioId: props.formularioId,
        actividad: props.actividad,
        fuenteIngresos: props.fuenteIngresos,
        ingresoMensual: props.ingresoMensual,
        volumenTransacciones: props.volumenTransacciones,
      },
    });
    return toDomain(record);
  }

  async findByFormularioId(formularioId: string): Promise<PerfilEconomico | null> {
    const record = await prisma.perfilEconomico.findUnique({
      where: { formularioId },
    });
    return record ? toDomain(record) : null;
  }

  async update(
    formularioId: string,
    props: Partial<PerfilEconomicoProps>,
  ): Promise<PerfilEconomico> {
    const record = await prisma.perfilEconomico.update({
      where: { formularioId },
      data: {
        ...(props.actividad !== undefined && { actividad: props.actividad }),
        ...(props.fuenteIngresos !== undefined && { fuenteIngresos: props.fuenteIngresos }),
        ...(props.ingresoMensual !== undefined && { ingresoMensual: props.ingresoMensual }),
        ...(props.volumenTransacciones !== undefined && { volumenTransacciones: props.volumenTransacciones }),
      },
    });
    return toDomain(record);
  }
}

function toDomain(record: PerfilEconomicoRecord): PerfilEconomico {
  return new PerfilEconomico({
    id: record.id,
    formularioId: record.formularioId,
    actividad: record.actividad,
    fuenteIngresos: record.fuenteIngresos,
    ingresoMensual: Number(record.ingresoMensual),
    volumenTransacciones: Number(record.volumenTransacciones),
  });
}
