// PUT /api/formularios/:id/contacto (RF-02, SPEC-API-04)
// Validación Zod en el borde del controlador (SPEC-SEC-02)
import { Request, Response } from 'express';
import { z } from 'zod';
import { ContactoRepository } from '../../infrastructure/repositories/contacto.repository';
import { AuditoriaRepository } from '../../infrastructure/repositories/auditoria.repository';
import { validarTelefono } from '../../domain/validaciones';
import { prisma } from '../../infrastructure/prisma-client';

const contactoRepo = new ContactoRepository(prisma);
const auditoriaRepo = new AuditoriaRepository(prisma);

const ContactoSchema = z.object({
  direccion: z.string().min(1, 'direccion es obligatoria'),
  telefono: z.string().refine(validarTelefono, 'teléfono con formato inválido'),
  correo: z.string().email('correo electrónico inválido'),
});

export async function putContacto(req: Request, res: Response): Promise<void> {
  const parsed = ContactoSchema.safeParse(req.body);
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

  const formulario = await prisma.formularioDDS.findUnique({ where: { id: req.params.id } });
  if (!formulario) {
    res.status(404).json({
      error: { codigo: 'FORMULARIO_NO_ENCONTRADO', mensaje: 'Formulario no encontrado' },
    });
    return;
  }

  const contacto = await contactoRepo.upsertByFormularioId(req.params.id, parsed.data);

  // SPEC-SEC-04: auditoría obligatoria
  await auditoriaRepo.registrarEvento({
    accion: 'MODIFICAR',
    entidad: 'datos_contacto',
    entidadId: contacto.id,
    usuarioId: req.usuario?.id || null,
    detalle: { formularioId: req.params.id },
  });

  res.status(200).json({ ok: true });
}
