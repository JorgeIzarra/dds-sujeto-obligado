import type { Prisma } from '@prisma/client';
import { getPrismaClient } from '../prisma-client';
import { Cliente, ClienteProps } from '../../../domain/entities/Cliente';
import { EncryptionService } from '../../security/EncryptionService';

type ClienteRecord = Prisma.ClienteGetPayload<object>;

const prisma = getPrismaClient();
const encryption = new EncryptionService();

export class ClienteRepository {
  async create(props: ClienteProps): Promise<Cliente> {
    const record = await prisma.cliente.create({
      data: {
        formularioId: props.formularioId,
        nombre: encryption.encrypt(props.nombre),
        tipoDocumento: props.tipoDocumento,
        numDocumento: encryption.encrypt(props.numDocumento),
        fechaNacimiento: props.fechaNacimiento ?? null,
        nacionalidad: props.nacionalidad,
        tipoCliente: props.tipoCliente,
        esPEP: props.esPEP ?? false,
      },
    });
    return toDomain(record);
  }

  async findByFormularioId(formularioId: string): Promise<Cliente | null> {
    const record = await prisma.cliente.findUnique({
      where: { formularioId },
    });
    return record ? toDomain(record) : null;
  }

  async update(
    formularioId: string,
    props: Partial<ClienteProps>,
  ): Promise<Cliente> {
    const data: Prisma.ClienteUpdateInput = {};
    if (props.nombre !== undefined) data.nombre = encryption.encrypt(props.nombre);
    if (props.tipoDocumento !== undefined) data.tipoDocumento = props.tipoDocumento;
    if (props.numDocumento !== undefined) data.numDocumento = encryption.encrypt(props.numDocumento);
    if (props.fechaNacimiento !== undefined) data.fechaNacimiento = props.fechaNacimiento;
    if (props.nacionalidad !== undefined) data.nacionalidad = props.nacionalidad;
    if (props.tipoCliente !== undefined) data.tipoCliente = props.tipoCliente;
    if (props.esPEP !== undefined) data.esPEP = props.esPEP;

    const record = await prisma.cliente.update({
      where: { formularioId },
      data,
    });
    return toDomain(record);
  }
}

function toDomain(record: ClienteRecord): Cliente {
  return new Cliente({
    id: record.id,
    formularioId: record.formularioId,
    nombre: encryption.decrypt(record.nombre),
    tipoDocumento: record.tipoDocumento,
    numDocumento: encryption.decrypt(record.numDocumento),
    fechaNacimiento: record.fechaNacimiento,
    nacionalidad: record.nacionalidad,
    tipoCliente: record.tipoCliente,
    esPEP: record.esPEP,
  });
}
