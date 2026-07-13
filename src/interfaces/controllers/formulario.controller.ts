import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../../infrastructure/prisma-client';
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
