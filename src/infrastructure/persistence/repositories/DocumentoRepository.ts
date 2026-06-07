import type { Prisma } from '@prisma/client';
import { getPrismaClient } from '../prisma-client';
import { Documento, DocumentoProps } from '../../../domain/entities/Documento';

type DocumentoRecord = Prisma.DocumentoGetPayload<object>;

const prisma = getPrismaClient();

export class DocumentoRepository {
  async create(props: DocumentoProps): Promise<Documento> {
    const record = await prisma.documento.create({
      data: {
        formularioId: props.formularioId,
        tipo: props.tipo,
        baseLegal: props.baseLegal ?? null,
      },
    });
    return toDomain(record);
  }

  async findByFormularioId(formularioId: string): Promise<Documento[]> {
    const records = await prisma.documento.findMany({
      where: { formularioId },
    });
    return records.map(toDomain);
  }

  async markVerificado(id: string): Promise<Documento> {
    const record = await prisma.documento.update({
      where: { id },
      data: { verificado: true },
    });
    return toDomain(record);
  }
}

function toDomain(record: DocumentoRecord): Documento {
  return new Documento({
    id: record.id,
    formularioId: record.formularioId,
    tipo: record.tipo,
    fechaRecepcion: record.fechaRecepcion,
    verificado: record.verificado,
    baseLegal: record.baseLegal,
  });
}
