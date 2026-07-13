// PUT /api/formularios/:id/identificacion (RF-01, SPEC-API-03)
// Validación Zod en el borde del controlador (SPEC-SEC-02); reglas de negocio después
import { Request, Response } from 'express';
import { z } from 'zod';
import { ClienteRepository } from '../../infrastructure/repositories/cliente.repository';
import { AuditoriaRepository } from '../../infrastructure/repositories/auditoria.repository';
import { esCedulaValida, validarDocumentoGenerico } from '../../domain/validaciones';
import { prisma } from '../../infrastructure/prisma-client';

const clienteRepo = new ClienteRepository(prisma);
const auditoriaRepo = new AuditoriaRepository(prisma);

const IdentificacionSchema = z.object({
  nombre: z.string().min(1, 'nombre es obligatorio'),
  tipoDocumento: z.enum(['CEDULA', 'PASAPORTE', 'RUC']),
  numDocumento: z.string().min(1, 'numDocumento es obligatorio'),
  fechaNacimiento: z.string().optional(),
  nacionalidad: z.string().min(1, 'nacionalidad es obligatoria'),
  tipoCliente: z.enum(['NATURAL', 'JURIDICA']),
  esPEP: z.boolean(),
});

export async function putIdentificacion(req: Request, res: Response): Promise<void> {
  const parsed = IdentificacionSchema.safeParse(req.body);
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

  // SPEC-RN-02: regex de cédula solo cuando tipoDocumento === 'CEDULA' (VOL-S3-01)
  if (data.tipoDocumento === 'CEDULA' && !esCedulaValida(data.numDocumento)) {
    res.status(422).json({
      error: {
        codigo: 'CEDULA_INVALIDA',
        mensaje: 'El número de cédula no cumple el formato X-XXX-XXXX (SPEC-RN-02, DEF001)',
        campos: { numDocumento: ['Formato de cédula panameña inválido'] },
      },
    });
    return;
  }

  if (data.tipoDocumento !== 'CEDULA' && !validarDocumentoGenerico(data.numDocumento)) {
    res.status(422).json({
      error: {
        codigo: 'DOCUMENTO_INVALIDO',
        mensaje: 'numDocumento contiene caracteres no permitidos (VOL-S3-01)',
        campos: { numDocumento: ['Solo se permiten caracteres alfanuméricos y guiones'] },
      },
    });
    return;
  }

  const formulario = await prisma.formularioDDS.findUnique({ where: { id: req.params.id } });
  if (!formulario) {
    res.status(404).json({
      error: { codigo: 'FORMULARIO_NO_ENCONTRADO', mensaje: 'Formulario no encontrado' },
    });
    return;
  }

  const cliente = await clienteRepo.upsertByFormularioId(req.params.id, {
    nombre: data.nombre,
    tipoDocumento: data.tipoDocumento,
    numDocumento: data.numDocumento,
    fechaNacimiento: data.fechaNacimiento ? new Date(data.fechaNacimiento) : null,
    nacionalidad: data.nacionalidad,
    tipoCliente: data.tipoCliente,
    esPep: data.esPEP,
  });

  // SPEC-SEC-04: auditoría obligatoria
  await auditoriaRepo.registrarEvento({
    accion: 'MODIFICAR',
    entidad: 'cliente',
    entidadId: cliente.id,
    usuarioId: req.usuario?.id || null,
    detalle: { tipoDocumento: data.tipoDocumento, formularioId: req.params.id },
  });

  res.status(200).json({ ok: true });
}
