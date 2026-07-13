import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../../infrastructure/prisma-client';
import { decrypt } from '../../security/crypto.service';
import { AuditoriaRepository } from '../../infrastructure/repositories/auditoria.repository';

const auditoriaRepo = new AuditoriaRepository(prisma);

const FormularioUpdateSchema = z.object({
  proposito: z.string().min(1, 'El propósito es obligatorio'),
});

export async function putFormulario(req: Request, res: Response): Promise<void> {
  const parsed = FormularioUpdateSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(422).json({
      error: {
        codigo: 'CAMPOS_INVALIDOS',
        mensaje: 'Campos obligatorios inválidos o ausentes',
        campos: parsed.error.flatten().fieldErrors,
      },
    });
    return;
  }

  const { id } = req.params;
  const { proposito } = parsed.data;

  // checkEdicionFormulario middleware already checked existence and RN-06 authorization

  await prisma.formularioDDS.update({
    where: { id },
    data: { proposito },
  });

  // SPEC-SEC-04: Auditoría obligatoria
  await auditoriaRepo.registrarEvento({
    accion: 'MODIFICAR',
    entidad: 'formulario_dds',
    entidadId: id,
    usuarioId: req.usuario?.id || null,
    detalle: { proposito },
  });

  res.status(200).json({ ok: true });
}

export async function getFormularioById(req: Request, res: Response): Promise<void> {
  const { id } = req.params;

  const formulario = await prisma.formularioDDS.findUnique({
    where: { id },
    include: {
      clientes: true,
      datosContacto: true,
      perfilesEconomicos: true,
      documentos: true,
    },
  });

  if (!formulario) {
    res.status(404).json({
      error: { codigo: 'FORMULARIO_NO_ENCONTRADO', mensaje: 'Formulario no encontrado' },
    });
    return;
  }

  const cliente = formulario.clientes[0] || null;
  const decryptedCliente = cliente
    ? {
        id: cliente.id,
        nombre: decrypt(cliente.nombre),
        tipoDocumento: cliente.tipoDocumento,
        numDocumento: decrypt(cliente.numDocumento),
        fechaNacimiento: cliente.fechaNacimiento ? cliente.fechaNacimiento.toISOString().split('T')[0] : null,
        nacionalidad: cliente.nacionalidad,
        tipoCliente: cliente.tipoCliente,
        esPep: cliente.esPep,
      }
    : null;

  res.status(200).json({
    id: formulario.id,
    folio: formulario.folio,
    proposito: formulario.proposito,
    estado: formulario.estado,
    clasificacionRiesgo: formulario.clasificacionRiesgo,
    fecha: formulario.fecha.toISOString().split('T')[0],
    cliente: decryptedCliente,
    datosContacto: formulario.datosContacto[0] || null,
    perfilEconomico: formulario.perfilesEconomicos[0] || null,
    documentos: formulario.documentos,
  });
}

export async function postCrearFormulario(req: Request, res: Response): Promise<void> {
  const oficialId = req.usuario?.id;
  if (!oficialId) {
    res.status(401).json({ error: { mensaje: 'No autorizado' } });
    return;
  }

  const formulario = await prisma.formularioDDS.create({
    data: {
      proposito: 'Apertura de cuenta',
      oficialId,
      estado: 'BORRADOR',
    },
  });

  res.status(201).json({ id: formulario.id });
}
