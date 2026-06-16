// Repositorio de Cliente — aplica cifrado/descifrado AES-256-GCM (SPEC-SEC-01)
// Los campos nombre y numDocumento se cifran antes de persistir y se descifran al leer.
import { PrismaClient, Cliente, Prisma } from '@prisma/client';
import { encrypt, decrypt } from '../../security/crypto.service';

export class ClienteRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(data: Prisma.ClienteUncheckedCreateInput): Promise<Cliente> {
    return this.prisma.cliente.create({
      data: {
        ...data,
        nombre: encrypt(data.nombre),
        numDocumento: encrypt(data.numDocumento),
      },
    });
  }

  async findById(id: string): Promise<Cliente | null> {
    const row = await this.prisma.cliente.findUnique({ where: { id } });
    if (!row) return null;
    return {
      ...row,
      nombre: decrypt(row.nombre),
      numDocumento: decrypt(row.numDocumento),
    };
  }

  async findByFormularioId(formularioId: string): Promise<Cliente[]> {
    const rows = await this.prisma.cliente.findMany({ where: { formularioId } });
    return rows.map((row) => ({
      ...row,
      nombre: decrypt(row.nombre),
      numDocumento: decrypt(row.numDocumento),
    }));
  }

  // Crea el cliente si no existe para este formulario; lo actualiza si ya existe (RF-01)
  async upsertByFormularioId(
    formularioId: string,
    data: Omit<Prisma.ClienteUncheckedCreateInput, 'formularioId'>,
  ): Promise<Cliente> {
    const existing = await this.prisma.cliente.findFirst({ where: { formularioId } });
    if (existing) {
      const updated = await this.prisma.cliente.update({
        where: { id: existing.id },
        data: {
          ...data,
          nombre: encrypt(data.nombre),
          numDocumento: encrypt(data.numDocumento),
        },
      });
      return {
        ...updated,
        nombre: data.nombre as string,
        numDocumento: data.numDocumento as string,
      };
    }
    return this.create({ formularioId, ...data });
  }
}
