// DocumentoRepository — persiste Documento (RF-05, SPEC-API-06)
import { PrismaClient, Documento } from '@prisma/client';

interface DocumentoInput {
  tipo: string;
  baseLegal?: string;
  verificado?: boolean;
}

export class DocumentoRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(formularioId: string, data: DocumentoInput): Promise<Documento> {
    return this.prisma.documento.create({
      data: {
        formularioId,
        tipo: data.tipo,
        baseLegal: data.baseLegal ?? null,
        verificado: data.verificado ?? false,
      },
    });
  }

  // RN-04, CA-08: existe un documento del mismo tipo que el documento de identidad del cliente (o tipo genérico IDENTIFICACION), verificado
  async existeIdentidadVerificada(
    formularioId: string,
    tipoDocumentoCliente: string
  ): Promise<boolean> {
    const documento = await this.prisma.documento.findFirst({
      where: {
        formularioId,
        tipo: { in: [tipoDocumentoCliente, 'IDENTIFICACION'] },
        verificado: true,
      },
    });
    return documento !== null;
  }
}
