// ContactoRepository — persiste DatosContacto (RF-02, SPEC-API-04)
// Sin cifrado: SPEC-SEC-01 solo cifra cliente.nombre y cliente.numDocumento.
import { PrismaClient, DatosContacto } from '@prisma/client';

interface ContactoInput {
  direccion: string;
  telefono: string;
  correo: string;
}

export class ContactoRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async upsertByFormularioId(formularioId: string, data: ContactoInput): Promise<DatosContacto> {
    const existing = await this.prisma.datosContacto.findFirst({ where: { formularioId } });
    if (existing) {
      return this.prisma.datosContacto.update({
        where: { id: existing.id },
        data: { ...data, fechaVerif: new Date() },
      });
    }
    return this.prisma.datosContacto.create({ data: { formularioId, ...data } });
  }
}
