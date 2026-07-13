// POST /api/formularios/:id/documentos (RF-05, SPEC-API-06)
// Validación Zod en el borde (SPEC-SEC-02); VOL-S5-01: verificado opcional, default false
import { Request, Response } from 'express';
import { z } from 'zod';
import { DocumentoRepository } from '../../infrastructure/repositories/documento.repository';
import { AuditoriaRepository } from '../../infrastructure/repositories/auditoria.repository';
import { prisma } from '../../infrastructure/prisma-client';

const documentoRepo = new DocumentoRepository(prisma);
const auditoriaRepo = new AuditoriaRepository(prisma);

const DocumentoSchema = z.object({
  tipo: z.string().min(1, 'tipo es obligatorio'),
  baseLegal: z.string().optional(),
  verificado: z.boolean().optional(),
});

export async function postDocumento(req: Request, res: Response): Promise<void> {
  const parsed = DocumentoSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(422).json({
      error: {
        codigo: 'CAMPOS_INVALIDOS',
        mensaje: 'Campos obligatorios inválidos o ausentes (RF-08)',
        campos: parsed.error.flatten().fieldErrors,
      },
    });
    return;
  }

  const data = parsed.data;

  const formulario = await prisma.formularioDDS.findUnique({ where: { id: req.params.id } });
  if (!formulario) {
    res.status(404).json({
      error: { codigo: 'FORMULARIO_NO_ENCONTRADO', mensaje: 'Formulario no encontrado' },
    });
    return;
  }

  // Persistir documento (RF-05, SPEC-DATA-03); verificado opcional, default false (VOL-S5-01)
  const documento = await documentoRepo.create(req.params.id, {
    tipo: data.tipo,
    baseLegal: data.baseLegal,
    verificado: data.verificado,
  });

  // SPEC-SEC-04: auditoría obligatoria
  await auditoriaRepo.registrarEvento({
    accion: 'CREAR',
    entidad: 'documento',
    entidadId: documento.id,
    usuarioId: req.usuario?.id || null,
    detalle: { tipo: documento.tipo, formularioId: req.params.id },
  });

  res.status(201).json({ id: documento.id, fechaRecepcion: documento.fechaRecepcion });
}
