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
}
