// PUT /api/formularios/:id/perfil-economico (RF-03, RF-06, SPEC-API-05)
// Validación Zod en el borde del controlador (SPEC-SEC-02); reglas de negocio después
import { Request, Response } from 'express';
import { z } from 'zod';
import { clasificarRiesgo } from '../../domain/clasificacion';
import { PerfilEconomicoRepository } from '../../infrastructure/repositories/perfil-economico.repository';
import { AuditoriaRepository } from '../../infrastructure/repositories/auditoria.repository';
import { prisma } from '../../infrastructure/prisma-client';

const perfilRepo = new PerfilEconomicoRepository(prisma);
const auditoriaRepo = new AuditoriaRepository(prisma);

const PerfilEconomicoSchema = z.object({
  actividad: z.string().min(1, 'actividad es obligatoria'),
  fuenteIngresos: z.string().min(1, 'fuenteIngresos es obligatoria'),
  ingresoMensual: z.number({ message: 'ingresoMensual debe ser un número' }).nonnegative(),
  volumenTransacciones: z
    .number({ message: 'volumenTransacciones debe ser un número' })
    .nonnegative(),
});

export async function putPerfilEconomico(req: Request, res: Response): Promise<void> {
  const parsed = PerfilEconomicoSchema.safeParse(req.body);
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

  // esPEP desde Cliente (SPEC-RN-01); default false si identificación aún no registrada
  const cliente = await prisma.cliente.findFirst({ where: { formularioId: req.params.id } });
  const esPEP = cliente?.esPep ?? false;

  // Persistir perfil económico (RF-03, SPEC-DATA-03)
  const perfil = await perfilRepo.upsertByFormularioId(req.params.id, {
    actividad: data.actividad,
    fuenteIngresos: data.fuenteIngresos,
    ingresoMensual: data.ingresoMensual,
    volumenTransacciones: data.volumenTransacciones,
  });

  // Clasificar riesgo con función pura (SPEC-RN-01, RF-06, Art. 26)
  const clasificacion = clasificarRiesgo({
    ingresoMensual: data.ingresoMensual,
    volumenMensual: data.volumenTransacciones,
    esPEP,
  });

  // Persistir clasificación en FormularioDDS
  await prisma.formularioDDS.update({
    where: { id: req.params.id },
    data: { clasificacionRiesgo: clasificacion },
  });

  // SPEC-SEC-04: auditoría obligatoria
  await auditoriaRepo.registrarEvento({
    accion: 'CLASIFICAR',
    entidad: 'perfil_economico',
    entidadId: perfil.id,
    usuarioId: req.usuario?.id || null,
    detalle: { clasificacionRiesgo: clasificacion, formularioId: req.params.id },
  });

  res.status(200).json({ clasificacionRiesgo: clasificacion });
}
