// POST /api/formularios/:id/guardar (RF-07, RF-08, RN-03, RN-04, SPEC-API-07 parcial)
// Pasos implementados: 1 (campos completos), 2 (documento identidad verificado), 4 (folio), 5 (estado)
// Paso 3 (PEP, RN-02, SPEC-RN-05) diferido a Sesion 6 — no implementado aquí
import { Request, Response } from 'express';
import { DocumentoRepository } from '../../infrastructure/repositories/documento.repository';
import { AuditoriaRepository } from '../../infrastructure/repositories/auditoria.repository';
import { FolioService } from '../../infrastructure/services/folio.service';
import { prisma } from '../../infrastructure/prisma-client';

const documentoRepo = new DocumentoRepository(prisma);
const auditoriaRepo = new AuditoriaRepository(prisma);
const folioService = new FolioService(prisma);

export async function postGuardar(req: Request, res: Response): Promise<void> {
  const formularioId = req.params.id;

  const formulario = await prisma.formularioDDS.findUnique({ where: { id: formularioId } });
  if (!formulario) {
    res.status(404).json({
      error: { codigo: 'FORMULARIO_NO_ENCONTRADO', mensaje: 'Formulario no encontrado' },
    });
    return;
  }

  // Paso 1 (RF-08): secciones obligatorias completas
  const [cliente, datosContacto, perfilEconomico] = await Promise.all([
    prisma.cliente.findFirst({ where: { formularioId } }),
    prisma.datosContacto.findFirst({ where: { formularioId } }),
    prisma.perfilEconomico.findFirst({ where: { formularioId } }),
  ]);

  const secciones: string[] = [];
  if (!cliente) secciones.push('cliente');
  if (!datosContacto) secciones.push('datosContacto');
  if (!perfilEconomico) secciones.push('perfilEconomico');

  if (secciones.length > 0 || !cliente) {
    res.status(422).json({
      error: {
        codigo: 'FORMULARIO_INCOMPLETO',
        mensaje: 'Faltan secciones obligatorias por completar (RF-08)',
        campos: { secciones },
      },
    });
    return;
  }

  // Paso 2 (RN-04, CA-08, SPEC-BHV-06): documento de identidad verificado
  const identidadVerificada = await documentoRepo.existeIdentidadVerificada(
    formularioId,
    cliente.tipoDocumento,
  );
  if (!identidadVerificada) {
    res.status(422).json({
      error: {
        codigo: 'DOCUMENTO_IDENTIDAD_NO_VERIFICADO',
        mensaje: 'El documento de identidad no está verificado (RN-04, CA-08)',
      },
    });
    return;
  }

  // Paso 3 (RN-02, SPEC-RN-05, CA-04): verificación PEP diferida a Sesión 6

  // Paso 4 (SPEC-RN-03, SPEC-DATA-01, DEF003): folio único
  const folio = await folioService.generar();

  // Paso 5: estado -> GUARDADO
  await prisma.formularioDDS.update({
    where: { id: formularioId },
    data: { folio, estado: 'GUARDADO' },
  });

  // SPEC-SEC-04: auditoría obligatoria
  await auditoriaRepo.registrarEvento({
    accion: 'GUARDAR',
    entidad: 'formulario_dds',
    entidadId: formularioId,
    usuarioId: null,
    detalle: { folio },
  });

  res.status(200).json({ folio, estado: 'GUARDADO' });
}
