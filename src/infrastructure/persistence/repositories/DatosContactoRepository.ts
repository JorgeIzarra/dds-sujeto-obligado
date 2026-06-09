import type { Prisma } from '@prisma/client';
import { getPrismaClient } from '../prisma-client';
import { DatosContacto, DatosContactoProps } from '../../../domain/entities/DatosContacto';

type DatosContactoRecord = Prisma.DatosContactoGetPayload<object>;

const prisma = getPrismaClient();

export class DatosContactoRepository {
  async create(props: DatosContactoProps): Promise<DatosContacto> {
    const record = await prisma.datosContacto.create({
      data: {
        formularioId: props.formularioId,
        direccion: props.direccion,
        telefono: props.telefono,
        correo: props.correo,
      },
    });
    return toDomain(record);
  }

  async findByFormularioId(formularioId: string): Promise<DatosContacto | null> {
    const record = await prisma.datosContacto.findUnique({
      where: { formularioId },
    });
    return record ? toDomain(record) : null;
  }

  async update(
    formularioId: string,
    props: Partial<DatosContactoProps>,
  ): Promise<DatosContacto> {
    const record = await prisma.datosContacto.update({
      where: { formularioId },
      data: {
        ...(props.direccion !== undefined && { direccion: props.direccion }),
        ...(props.telefono !== undefined && { telefono: props.telefono }),
        ...(props.correo !== undefined && { correo: props.correo }),
      },
    });
    return toDomain(record);
  }
}

function toDomain(record: DatosContactoRecord): DatosContacto {
  return new DatosContacto({
    id: record.id,
    formularioId: record.formularioId,
    direccion: record.direccion,
    telefono: record.telefono,
    correo: record.correo,
    fechaVerif: record.fechaVerif,
  });
}
