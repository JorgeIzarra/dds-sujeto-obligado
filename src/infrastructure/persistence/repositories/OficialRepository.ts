import type { Prisma } from '@prisma/client';
import { getPrismaClient } from '../prisma-client';
import { Oficial, OficialProps } from '../../../domain/entities/Oficial';

type OficialRecord = Prisma.OficialGetPayload<object>;

const prisma = getPrismaClient();

export class OficialRepository {
  async create(props: OficialProps): Promise<Oficial> {
    const record = await prisma.oficial.create({
      data: {
        nombre: props.nombre,
        cargo: props.cargo,
        email: props.email,
        hashPassword: props.hashPassword,
      },
    });
    return toDomain(record);
  }

  async findByEmail(email: string): Promise<Oficial | null> {
    const record = await prisma.oficial.findUnique({ where: { email } });
    return record ? toDomain(record) : null;
  }

  async findById(id: string): Promise<Oficial | null> {
    const record = await prisma.oficial.findUnique({ where: { id } });
    return record ? toDomain(record) : null;
  }
}

function toDomain(record: OficialRecord): Oficial {
  return new Oficial({
    id: record.id,
    nombre: record.nombre,
    cargo: record.cargo,
    email: record.email,
    hashPassword: record.hashPassword,
  });
}
