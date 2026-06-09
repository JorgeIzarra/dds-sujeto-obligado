import type { Prisma } from '@prisma/client';
import { getPrismaClient } from '../prisma-client';
import { FormularioDDS, FormularioDDSProps } from '../../../domain/entities/FormularioDDS';

type FormularioDDSRecord = Prisma.FormularioDDSGetPayload<object>;

const prisma = getPrismaClient();

export class FormularioRepository {
  async create(props: FormularioDDSProps): Promise<FormularioDDS> {
    const record = await prisma.formularioDDS.create({
      data: {
        proposito: props.proposito,
        oficialId: props.oficialId,
        estado: props.estado ?? 'BORRADOR',
      },
    });
    return toDomain(record);
  }

  async findById(id: string): Promise<FormularioDDS | null> {
    const record = await prisma.formularioDDS.findUnique({ where: { id } });
    return record ? toDomain(record) : null;
  }

  async findByFolio(folio: string): Promise<FormularioDDS | null> {
    const record = await prisma.formularioDDS.findUnique({ where: { folio } });
    return record ? toDomain(record) : null;
  }

  async update(
    id: string,
    data: Partial<FormularioDDSProps>,
  ): Promise<FormularioDDS> {
    const record = await prisma.formularioDDS.update({
      where: { id },
      data: {
        ...(data.proposito !== undefined && { proposito: data.proposito }),
        ...(data.clasificacionRiesgo !== undefined && {
          clasificacionRiesgo: data.clasificacionRiesgo,
        }),
        ...(data.estado !== undefined && { estado: data.estado }),
        ...(data.folio !== undefined && { folio: data.folio }),
        ...(data.fechaCierre !== undefined && {
          fechaCierre: data.fechaCierre,
        }),
        ...(data.fechaExpiracion !== undefined && {
          fechaExpiracion: data.fechaExpiracion,
        }),
      },
    });
    return toDomain(record);
  }
}

function toDomain(record: FormularioDDSRecord): FormularioDDS {
  return new FormularioDDS({
    id: record.id,
    folio: record.folio,
    proposito: record.proposito,
    clasificacionRiesgo: record.clasificacionRiesgo,
    estado: record.estado,
    fechaCierre: record.fechaCierre,
    fechaExpiracion: record.fechaExpiracion,
    oficialId: record.oficialId,
    creadoEn: record.creadoEn,
    actualizadoEn: record.actualizadoEn,
  });
}
